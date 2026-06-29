// =====================================================================
// POST /api/sign
//   Body: { entity_type, entity_id, anchor? }
//   1. Verifica el JWT Privy del usuario (solo autenticación).
//   2. Lee la fila desde Supabase y calcula el hash keccak256 canónico.
//   3. El relayer ancla directamente en TraceabilityAnchor on-chain.
//   4. Persiste en blockchain_records.
//
//   No se requiere wallet del usuario — toda la firma la hace el relayer
//   del servidor (única wallet de la plataforma).
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";
import { hashPayload } from "@/lib/crypto/sign";
import { relayContractWrite } from "@/lib/blockchain/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ENTITIES = new Set([
  "animals",
  "vaccinations",
  "treatments",
  "weighings",
  "certifications",
  "sales",
]);

const ENTITY_TYPE_INDEX: Record<string, number> = {
  animals: 0,
  vaccinations: 1,
  weighings: 2,
  certifications: 3,
  sales: 4,
  treatments: 5,
};

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

// GET — devuelve el hash del payload para mostrar en UI
export async function GET(req: Request) {
  const url = new URL(req.url);
  const entity_type = url.searchParams.get("entity_type") ?? "";
  const entity_id = url.searchParams.get("entity_id") ?? "";
  if (!ALLOWED_ENTITIES.has(entity_type)) {
    return NextResponse.json({ error: "entity_not_supported" }, { status: 400 });
  }
  const sb = getAdmin();
  const { data: row } = await sb.from(entity_type).select("*").eq("id", entity_id).single();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const rawHash = hashPayload(row);
  const paddedHash = ("0x" + rawHash.slice(2).padStart(64, "0")) as `0x${string}`;
  return NextResponse.json({ payload_hash: paddedHash });
}

// POST — ancla el registro en blockchain usando el relayer de la plataforma
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
    entity_type: string;
    entity_id: string;
    anchor?: boolean;
  };

  if (!ALLOWED_ENTITIES.has(body.entity_type)) {
    return NextResponse.json({ error: "entity_not_supported" }, { status: 400 });
  }

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: row } = await sb
    .from(body.entity_type)
    .select("*")
    .eq("id", body.entity_id)
    .single();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!row.farm_id) return NextResponse.json({ error: "no_farm_id" }, { status: 400 });

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", row.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "admin", "vet", "operator"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rawHash = hashPayload(row);
  const payloadHash = ("0x" + rawHash.slice(2).padStart(64, "0")) as `0x${string}`;

  // Anclar en blockchain via relayer (sin wallet del usuario)
  let anchorTx: `0x${string}` | null = null;
  if (body.anchor !== false) {
    const anchorAddress = process.env.NEXT_PUBLIC_ANCHOR_CONTRACT as `0x${string}` | undefined;

    if (!anchorAddress || !process.env.RELAYER_PRIVATE_KEY) {
      return NextResponse.json(
        { anchored: false, error: "relayer_not_configured", payload_hash: payloadHash },
        { status: 200 }
      );
    }

    // Return existing anchor if already on-chain
    const { data: existingRecord } = await sb
      .from("blockchain_records")
      .select("tx_hash")
      .eq("entity_type", body.entity_type)
      .eq("entity_id", body.entity_id)
      .maybeSingle();
    if (existingRecord?.tx_hash) {
      return NextResponse.json({
        signed: true,
        anchored: true,
        anchor_tx: existingRecord.tx_hash,
        payload_hash: payloadHash,
      });
    }

    const entityIdBytes32 = uuidToBytes32(body.entity_id);
    const entityTypeIdx = ENTITY_TYPE_INDEX[body.entity_type] ?? 0;

    try {
      anchorTx = await relayContractWrite({
        to: anchorAddress,
        abi: ANCHOR_ABI,
        functionName: "anchor",
        args: [entityIdBytes32, payloadHash, entityTypeIdx],
      });
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-amoy.polygon.technology"),
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: anchorTx });
      await sb.from("blockchain_records").insert({
        farm_id: row.farm_id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        network: "polygon",
        contract_address: anchorAddress,
        tx_hash: anchorTx,
        block_number: Number(receipt.blockNumber),
        payload_hash: payloadHash,
        created_by: profile.id,
      });
    } catch (err) {
      return NextResponse.json(
        { anchored: false, error: (err as Error).message, payload_hash: payloadHash },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    anchored: !!anchorTx,
    anchor_tx: anchorTx,
    payload_hash: payloadHash,
  });
}
