// =====================================================================
// POST /api/reports/[id]/anchor
//   Ancla en blockchain el hash de integridad de un reporte regulatorio
//   (INSAI / calidad láctea) ya generado.
//
//   1. Verifica el JWT Privy del usuario.
//   2. Carga el reporte y valida que el usuario sea miembro autorizado.
//   3. El relayer de la plataforma ancla el payload_hash en TraceabilityAnchor.
//   4. Persiste el registro en blockchain_records (entity_type = "regulatory_report").
//
//   El hash ya fue calculado al generar el reporte (mismo keccak256 canónico
//   impreso en el PDF), por lo que aquí solo se compromete on-chain.
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";
import { relayContractWrite } from "@/lib/blockchain/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// entity_type libre almacenado en blockchain_records (aquí sí distinguimos el reporte)
const REPORT_RECORD_TYPE = "regulatory_report";
// Índice del enum EntityType en TraceabilityAnchor.sol. Reutilizamos Certification(3)
// —el valor más cercano a un documento regulatorio— para no tener que redesplegar el
// contrato con un miembro nuevo. La distinción real vive en blockchain_records.entity_type.
const REPORT_ENTITY_TYPE_INDEX = 3;
// Roles autorizados a anclar reportes (mismos que pueden generarlos)
const ALLOWED_ROLES = ["owner", "admin", "vet"];

const ANCHOR_ABI = [
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "entityId", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" },
      { name: "entityType", type: "uint8" },
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: report } = await sb
    .from("regulatory_reports")
    .select("id, farm_id, payload_hash")
    .eq("id", id)
    .single();
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!report.payload_hash) {
    return NextResponse.json({ error: "report_without_hash" }, { status: 400 });
  }

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", report.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payloadHash = ("0x" +
    report.payload_hash.replace(/^0x/, "").padStart(64, "0")) as `0x${string}`;

  const anchorAddress = process.env.NEXT_PUBLIC_ANCHOR_CONTRACT as `0x${string}` | undefined;
  if (!anchorAddress || !process.env.RELAYER_PRIVATE_KEY) {
    return NextResponse.json(
      { anchored: false, error: "relayer_not_configured", payload_hash: payloadHash },
      { status: 200 }
    );
  }

  // Idempotencia: si ya está anclado, devolver la tx existente
  const { data: existing } = await sb
    .from("blockchain_records")
    .select("tx_hash")
    .eq("entity_type", REPORT_RECORD_TYPE)
    .eq("entity_id", report.id)
    .maybeSingle();
  if (existing?.tx_hash) {
    return NextResponse.json({
      anchored: true,
      anchor_tx: existing.tx_hash,
      payload_hash: payloadHash,
    });
  }

  try {
    const anchorTx = await relayContractWrite({
      to: anchorAddress,
      abi: ANCHOR_ABI,
      functionName: "anchor",
      args: [uuidToBytes32(report.id), payloadHash, REPORT_ENTITY_TYPE_INDEX],
    });

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-amoy.polygon.technology"),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: anchorTx });

    await sb.from("blockchain_records").insert({
      farm_id: report.farm_id,
      entity_type: REPORT_RECORD_TYPE,
      entity_id: report.id,
      network: "polygon",
      contract_address: anchorAddress,
      tx_hash: anchorTx,
      block_number: Number(receipt.blockNumber),
      payload_hash: payloadHash,
      created_by: profile.id,
    });

    return NextResponse.json({
      anchored: true,
      anchor_tx: anchorTx,
      payload_hash: payloadHash,
    });
  } catch (err) {
    return NextResponse.json(
      { anchored: false, error: (err as Error).message, payload_hash: payloadHash },
      { status: 502 }
    );
  }
}
