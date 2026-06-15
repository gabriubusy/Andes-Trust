// POST /api/purchases/pay-crypto
// Body: { purchase_id, to_address, amount_usdc }
// Transfers USDC from relayer wallet to seller's crypto address and marks purchase as paid.

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { relayContractWrite } from "@/lib/blockchain/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
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
    purchase_id: string;
    to_address: string;
    amount_usdc: number; // in USD units (e.g. 1500.00)
  };

  if (!body.purchase_id || !body.to_address || !body.amount_usdc) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(body.to_address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: purchase, error: purchaseErr } = await sb
    .from("purchases")
    .select("id, farm_id, total_amount, status, payment_method")
    .eq("id", body.purchase_id)
    .single();

  if (!purchase)
    return NextResponse.json(
      { error: "purchase_not_found", detail: purchaseErr?.message, code: purchaseErr?.code },
      { status: 404 }
    );

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", purchase.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}` | undefined;
  if (!usdcAddress) {
    return NextResponse.json({ error: "usdc_not_configured" }, { status: 503 });
  }

  // USDC has 6 decimals
  const amountRaw = BigInt(Math.round(body.amount_usdc * 1_000_000));

  try {
    const tx = await relayContractWrite({
      to: usdcAddress,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [body.to_address as `0x${string}`, amountRaw],
    });

    await sb
      .from("purchases")
      .update({ status: "paid", payment_method: "crypto" })
      .eq("id", body.purchase_id);

    return NextResponse.json({ tx });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
