// =====================================================================
// POST /api/milk-quality/[id]/anchor
//   Reintenta el anclaje on-chain de una certificación de calidad láctea
//   ya existente (que quedó "Pendiente" porque el contrato no estaba
//   configurado o la llamada falló). Reutiliza los datos ya guardados en
//   milk_quality_certs — no recalcula promedios.
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: certId } = await params;

  const auth = _req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  let privyDid: string;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    privyDid = claims.userId;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: cert } = await sb
    .from("milk_quality_certs")
    .select(
      "id, farm_id, payload_hash, fat_pct, protein_pct, scc_thousands, total_liters, period_start, period_end, tx_hash"
    )
    .eq("id", certId)
    .single();
  if (!cert) return NextResponse.json({ error: "cert_not_found" }, { status: 404 });

  // Solo owner/admin de la finca puede anclar
  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", cert.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (cert.tx_hash) {
    return NextResponse.json({ alreadyAnchored: true, txHash: cert.tx_hash });
  }

  const certifierAddress = process.env.NEXT_PUBLIC_MILK_CERTIFIER as `0x${string}` | undefined;
  if (!certifierAddress || !process.env.PRIVY_RELAYER_WALLET_ID) {
    return NextResponse.json({ error: "relayer_not_configured" }, { status: 503 });
  }

  try {
    const certIdBytes32 = uuidToBytes32(cert.id);
    const farmIdBytes32 = uuidToBytes32(cert.farm_id);
    const fatPct100 = cert.fat_pct !== null ? Math.round(Number(cert.fat_pct) * 100) : 0;
    const proteinPct100 =
      cert.protein_pct !== null ? Math.round(Number(cert.protein_pct) * 100) : 0;
    const sccThousands = cert.scc_thousands !== null ? Math.round(Number(cert.scc_thousands)) : 0;
    const litersInt = Math.round(Number(cert.total_liters ?? 0));
    const tsStart = BigInt(Math.floor(new Date(cert.period_start).getTime() / 1000));
    const tsEnd = BigInt(Math.floor(new Date(cert.period_end + "T23:59:59Z").getTime() / 1000));

    const txHash = await relayContractWrite({
      to: certifierAddress,
      abi: CERTIFIER_ABI,
      functionName: "certify",
      args: [
        certIdBytes32,
        farmIdBytes32,
        cert.payload_hash as `0x${string}`,
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
      .update({ tx_hash: txHash, block_timestamp: new Date().toISOString() })
      .eq("id", cert.id);

    return NextResponse.json({ txHash });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
