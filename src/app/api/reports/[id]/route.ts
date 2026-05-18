// GET /api/reports/[id]
// Retrieve metadata for a specific regulatory report.

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

  const sb = admin();

  const { data: report, error } = await sb
    .from("regulatory_reports")
    .select(
      "id, farm_id, kind, date_from, date_to, animal_ids, payload_hash, created_at, profiles:generated_by(full_name)"
    )
    .eq("id", id)
    .single();

  if (error || !report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Verify membership
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: member } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", report.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ data: report });
}
