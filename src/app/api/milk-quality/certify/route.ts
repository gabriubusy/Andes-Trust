// =====================================================================
// POST /api/milk-quality/certify
// Body: { farm_id, period_start, period_end, notes? }
//
// Flujo:
//  1. Agrega milk_records del período con fat_pct, protein_pct, scc
//  2. Calcula hash keccak256 del payload canónico
//  3. Llama MilkQualityCertifier.certify() on-chain vía relayer
//  4. Guarda la cert en milk_quality_certs con tx_hash y grado
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashPayload } from "@/lib/crypto/sign";
import { relayContractWrite } from "@/lib/blockchain/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CERTIFIER_ABI = [
  {
    type: "function",
    name: "certify",
    stateMutability: "nonpayable",
    inputs: [
      { name: "certId", type: "bytes32" },
      { name: "farmId", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" },
      { name: "fatPct100", type: "uint32" },
      { name: "proteinPct100", type: "uint32" },
      { name: "sccThousands", type: "uint32" },
      { name: "totalLiters", type: "uint32" },
      { name: "periodStart", type: "uint64" },
      { name: "periodEnd", type: "uint64" },
    ],
    outputs: [],
  },
] as const;

let _privy: PrivyClient | null = null;
function getPrivy() {
  if (!_privy) _privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  return _privy;
}

let _admin: SupabaseClient | null = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _admin;
}

function uuidToBytes32(uuid: string): `0x${string}` {
  return ("0x" + uuid.replace(/-/g, "").padEnd(64, "0")) as `0x${string}`;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Replica la lógica COVENIN 903 para guardar en DB (el contrato la evalúa on-chain también)
function classifyGrade(
  fat: number | null,
  protein: number | null,
  scc: number | null
): "A" | "B" | "C" {
  const fatOk = fat === null || fat >= 3.2;
  const proteinOk = protein === null || protein >= 2.8;
  const sccOk = scc === null || scc <= 400;
  if (fatOk && proteinOk && sccOk) return "A";
  if (sccOk) return "B";
  return "C";
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  let privyDid: string;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    privyDid = claims.userId;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = (await req.json()) as {
    farm_id: string;
    period_start: string; // YYYY-MM-DD
    period_end: string;
    notes?: string;
  };

  if (!body.farm_id || !body.period_start || !body.period_end) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const sb = getAdmin();

  // Verificar que el usuario es admin/owner de la finca
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", body.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Obtener registros de leche del período con parámetros de calidad
  const { data: records, error: recErr } = await sb
    .from("milk_records")
    .select("id, recorded_on, shift, liters, fat_pct, protein_pct, scc, animal_id")
    .eq("farm_id", body.farm_id)
    .gte("recorded_on", body.period_start)
    .lte("recorded_on", body.period_end)
    .order("recorded_on", { ascending: true });

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (!records || records.length === 0) {
    return NextResponse.json({ error: "no_records_in_period" }, { status: 422 });
  }

  // Calcular promedios
  const fats = records.map((r) => r.fat_pct).filter((v): v is number => v !== null);
  const proteins = records.map((r) => r.protein_pct).filter((v): v is number => v !== null);
  const sccs = records.map((r) => r.scc).filter((v): v is number => v !== null);
  const totalLiters = records.reduce((s, r) => s + Number(r.liters ?? 0), 0);

  const avgFat = fats.length ? avg(fats) : null;
  const avgProtein = proteins.length ? avg(proteins) : null;
  const avgScc = sccs.length ? avg(sccs) : null;

  // Construir payload canónico y calcular hash
  const payload = {
    farm_id: body.farm_id,
    period_start: body.period_start,
    period_end: body.period_end,
    records: records
      .map((r) => ({
        id: r.id,
        recorded_on: r.recorded_on,
        shift: r.shift,
        liters: r.liters,
        fat_pct: r.fat_pct,
        protein_pct: r.protein_pct,
        scc: r.scc,
        animal_id: r.animal_id,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };

  const payloadHash = hashPayload(payload);
  const grade = classifyGrade(avgFat, avgProtein, avgScc ? avgScc / 1000 : null);

  // Crear registro en DB primero para obtener el UUID de la cert
  const { data: cert, error: insertErr } = await sb
    .from("milk_quality_certs")
    .insert({
      farm_id: body.farm_id,
      period_start: body.period_start,
      period_end: body.period_end,
      fat_pct: avgFat !== null ? Number(avgFat.toFixed(2)) : null,
      protein_pct: avgProtein !== null ? Number(avgProtein.toFixed(2)) : null,
      scc_thousands: avgScc !== null ? Math.round(avgScc / 1000) : null,
      total_liters: Number(totalLiters.toFixed(2)),
      grade,
      payload_hash: payloadHash,
      chain_id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 80002),
      contract_address: process.env.NEXT_PUBLIC_MILK_CERTIFIER,
      certified_by: profile.id,
      notes: body.notes ?? null,
    })
    .select("id")
    .single();

  if (insertErr || !cert) {
    return NextResponse.json({ error: insertErr?.message ?? "insert_failed" }, { status: 500 });
  }

  // Llamar contrato on-chain si está configurado
  const certifierAddress = process.env.NEXT_PUBLIC_MILK_CERTIFIER as `0x${string}` | undefined;
  let txHash: string | null = null;

  if (certifierAddress && process.env.PRIVY_RELAYER_WALLET_ID) {
    try {
      const certIdBytes32 = uuidToBytes32(cert.id);
      const farmIdBytes32 = uuidToBytes32(body.farm_id);
      const fatPct100 = avgFat !== null ? Math.round(avgFat * 100) : 0;
      const proteinPct100 = avgProtein !== null ? Math.round(avgProtein * 100) : 0;
      const sccThousands = avgScc !== null ? Math.round(avgScc / 1000) : 0;
      const litersInt = Math.round(totalLiters);
      const tsStart = BigInt(Math.floor(new Date(body.period_start).getTime() / 1000));
      const tsEnd = BigInt(Math.floor(new Date(body.period_end + "T23:59:59Z").getTime() / 1000));

      txHash = await relayContractWrite({
        to: certifierAddress,
        abi: CERTIFIER_ABI,
        functionName: "certify",
        args: [
          certIdBytes32,
          farmIdBytes32,
          payloadHash as `0x${string}`,
          fatPct100,
          proteinPct100,
          sccThousands,
          litersInt,
          tsStart,
          tsEnd,
        ],
      });

      await sb
        .from("milk_quality_certs")
        .update({
          tx_hash: txHash,
          block_timestamp: new Date().toISOString(),
        })
        .eq("id", cert.id);
    } catch (err) {
      // Cert queda en DB sin tx_hash — se puede reintentar
      console.error("[milk-quality/certify] contract call failed:", err);
    }
  }

  return NextResponse.json({
    certId: cert.id,
    grade,
    payloadHash,
    txHash,
    avgFat,
    avgProtein,
    avgSccThousands: avgScc !== null ? Math.round(avgScc / 1000) : null,
    totalLiters,
    recordCount: records.length,
  });
}
