// GET /api/farm/[id]/audit?limit=100&offset=0&table=<name>&action=<INSERT|UPDATE|DELETE>
// Expose audit_log for a farm. Requires owner or admin role.

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: farmId } = await params;

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

  const sb = admin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: member } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", farmId)
    .eq("profile_id", profile.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const offset = Number(searchParams.get("offset") ?? "0");
  const table = searchParams.get("table");
  const action = searchParams.get("action");

  let q = sb
    .from("audit_log")
    .select("id, table_name, record_id, action, changed_by, old_data, new_data, changed_at", {
      count: "exact",
    })
    .eq("farm_id", farmId)
    .order("changed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (table) q = q.eq("table_name", table);
  if (action) q = q.eq("action", action);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
}
