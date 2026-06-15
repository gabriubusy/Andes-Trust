// =====================================================================
// POST /api/sales/[id]/escrow/action
//   Body: { action: 'create' | 'release' | 'refund', buyer?, seller?, amount?, deadline_seconds? }
//   - create: relayer llama PaymentEscrow.createEscrow().
//   - release: relayer llama anchor() + release() en orden.
//   - refund:  relayer llama refund() (tras deadline).
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashPayload } from "@/lib/crypto/sign";
import { relayContractWrite } from "@/lib/blockchain/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const ESCROW_ABI = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "saleId", type: "bytes32" },
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "conditionsHash", type: "bytes32" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [
      { name: "saleId", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "saleId", type: "bytes32" }],
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
  return ("0x" + uuid.replace(/-/g, "")) as `0x${string}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: saleId } = await params;
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
    action: "create" | "release" | "refund";
    buyer?: `0x${string}`;
    seller?: `0x${string}`;
    amount?: string;
    deadline_seconds?: number;
  };

  const sb = getAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: sale } = await sb.from("sales").select("*").eq("id", saleId).single();
  if (!sale) return NextResponse.json({ error: "sale_not_found" }, { status: 404 });

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", sale.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const escrowAddress = process.env.NEXT_PUBLIC_PAYMENT_ESCROW as `0x${string}` | undefined;
  const anchorAddress = process.env.NEXT_PUBLIC_ANCHOR_CONTRACT as `0x${string}` | undefined;
  const tokenAddress = process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}` | undefined;

  if (!escrowAddress || !process.env.PRIVY_RELAYER_WALLET_ID) {
    return NextResponse.json({ error: "contracts_not_deployed" }, { status: 503 });
  }

  const saleIdBytes32 = uuidToBytes32(saleId);

  try {
    if (body.action === "create") {
      if (!body.buyer || !body.seller || !body.amount || !body.deadline_seconds) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
      }
      if (!tokenAddress)
        return NextResponse.json({ error: "token_not_configured" }, { status: 503 });

      // Calcular hash de condiciones desde el historial sanitario
      const { data: items } = await sb.from("sale_items").select("animal_id").eq("sale_id", saleId);
      const animalIds = (items ?? []).map((i) => i.animal_id).filter((x): x is string => !!x);
      const [animals, vaccinations, treatments, certs] = await Promise.all([
        sb
          .from("animals")
          .select("id, tag, name, sex, breed_id, birth_date, current_weight_kg")
          .in("id", animalIds),
        sb
          .from("vaccinations")
          .select("id, animal_id, vaccine_id, applied_at, batch_number, next_due_at")
          .in("animal_id", animalIds),
        sb
          .from("treatments")
          .select(
            "id, animal_id, treatment_id, started_at, ended_at, withdrawal_until_meat, withdrawal_until_milk"
          )
          .in("animal_id", animalIds),
        sb
          .from("certifications")
          .select("id, animal_id, type, issuer, issued_at, valid_until")
          .in("animal_id", animalIds),
      ]);
      const conditionsHash = hashPayload({
        saleId,
        animals: (animals.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
        vaccinations: (vaccinations.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
        treatments: (treatments.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
        certifications: (certs.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
      });

      const deadline = BigInt(Math.floor(Date.now() / 1000) + body.deadline_seconds);
      const tx = await relayContractWrite({
        to: escrowAddress,
        abi: ESCROW_ABI,
        functionName: "createEscrow",
        args: [
          saleIdBytes32,
          body.buyer,
          body.seller,
          tokenAddress,
          BigInt(body.amount),
          conditionsHash,
          deadline,
        ],
      });

      await sb
        .from("sales")
        .update({
          escrow_status: "created",
          status: "confirmed",
          escrow_token: tokenAddress,
          escrow_amount: body.amount,
          escrow_buyer: body.buyer,
          escrow_seller: body.seller,
          conditions_hash: conditionsHash,
          escrow_deadline: new Date(Number(deadline) * 1000).toISOString(),
          escrow_create_tx: tx,
        })
        .eq("id", saleId);

      return NextResponse.json({ tx, conditions_hash: conditionsHash, deadline: Number(deadline) });
    }

    if (body.action === "release") {
      if (!anchorAddress)
        return NextResponse.json({ error: "anchor_not_deployed" }, { status: 503 });
      if (!sale.conditions_hash)
        return NextResponse.json({ error: "no_conditions_hash" }, { status: 400 });

      // 1. Anchor el conditions_hash en TraceabilityAnchor
      const anchorTx = await relayContractWrite({
        to: anchorAddress,
        abi: ANCHOR_ABI,
        functionName: "anchor",
        args: [saleIdBytes32, sale.conditions_hash as `0x${string}`, 4],
      }).catch((e) => {
        if (String(e).includes("AlreadyAnchored")) return null;
        throw e;
      });

      // 2. Liberar el pago
      const releaseTx = await relayContractWrite({
        to: escrowAddress,
        abi: ESCROW_ABI,
        functionName: "release",
        args: [saleIdBytes32, sale.conditions_hash as `0x${string}`],
      });

      await sb
        .from("sales")
        .update({
          escrow_status: "released",
          escrow_release_tx: releaseTx,
          payload_hash: sale.conditions_hash,
          status: "paid",
        })
        .eq("id", saleId);

      return NextResponse.json({ anchor_tx: anchorTx, release_tx: releaseTx });
    }

    if (body.action === "refund") {
      const tx = await relayContractWrite({
        to: escrowAddress,
        abi: ESCROW_ABI,
        functionName: "refund",
        args: [saleIdBytes32],
      });

      await sb
        .from("sales")
        .update({
          escrow_status: "refunded",
          escrow_refund_tx: tx,
          status: "cancelled",
        })
        .eq("id", saleId);

      return NextResponse.json({ tx });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
