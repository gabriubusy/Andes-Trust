// POST /api/alerts/generate
// Manual trigger for generate_alerts() + close_stale_alerts() RPCs.
// Requires authenticated user with owner/admin/vet role on any farm.

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _privy: PrivyClient | null = null;
function getPrivy() {
  if (!_privy) _privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  return _privy;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  try {
    await getPrivy().verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const sb = admin();
  const [genRes, closeRes] = await Promise.all([
    sb.rpc("generate_alerts"),
    sb.rpc("close_stale_alerts"),
  ]);

  if (genRes.error) {
    return NextResponse.json({ error: genRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    generated: genRes.data ?? 0,
    closed: closeRes.data ?? 0,
  });
}
