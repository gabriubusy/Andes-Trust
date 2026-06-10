// PATCH /api/team/member  body: { farm_id, profile_id, role }
// DELETE /api/team/member?farm_id=&profile_id=

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const ALLOWED = new Set(["owner", "admin", "operator", "vet", "viewer"]);

async function actorAdmin(req: Request, farmId: string) {
  const auth = req.headers.get("authorization");
  const tok = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!tok) return null;
  try {
    const claims = await getPrivy().verifyAuthToken(tok);
    const sb = getAdmin();
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("privy_did", claims.userId)
      .single();
    if (!profile) return null;
    const { data: m } = await sb
      .from("farm_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("profile_id", profile.id)
      .maybeSingle();
    return m?.role === "owner" || m?.role === "admin" ? profile : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const farmId = url.searchParams.get("farm_id");
  if (!farmId) return NextResponse.json({ error: "missing_farm_id" }, { status: 400 });

  const auth = req.headers.get("authorization");
  const tok = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!tok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const claims = await getPrivy().verifyAuthToken(tok);
    const sb = getAdmin();
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("privy_did", claims.userId)
      .single();
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Verify requester belongs to this farm
    const { data: membership } = await sb
      .from("farm_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data, error } = await sb
      .from("farm_members")
      .select("profile_id, role, profiles(id, email, full_name, wallet_address)")
      .eq("farm_id", farmId);
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { farm_id: string; profile_id: string; role: string };
  if (!body.farm_id || !body.profile_id || !ALLOWED.has(body.role)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  if (!(await actorAdmin(req, body.farm_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sb = getAdmin();
  // No permitir cambiar el rol del único owner
  if (body.role !== "owner") {
    const { count } = await sb
      .from("farm_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("farm_id", body.farm_id)
      .eq("role", "owner");
    const { data: target } = await sb
      .from("farm_members")
      .select("role")
      .eq("farm_id", body.farm_id)
      .eq("profile_id", body.profile_id)
      .single();
    if (target?.role === "owner" && (count ?? 0) <= 1) {
      return NextResponse.json({ error: "cannot_demote_last_owner" }, { status: 400 });
    }
  }
  await sb
    .from("farm_members")
    .update({ role: body.role })
    .eq("farm_id", body.farm_id)
    .eq("profile_id", body.profile_id);
  return NextResponse.json({ updated: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const farmId = url.searchParams.get("farm_id");
  const profileId = url.searchParams.get("profile_id");
  if (!farmId || !profileId) return NextResponse.json({ error: "missing_params" }, { status: 400 });
  if (!(await actorAdmin(req, farmId)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sb = getAdmin();
  const { data: target } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", farmId)
    .eq("profile_id", profileId)
    .single();
  if (target?.role === "owner") {
    const { count } = await sb
      .from("farm_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("farm_id", farmId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "cannot_remove_last_owner" }, { status: 400 });
    }
  }
  await sb.from("farm_members").delete().eq("farm_id", farmId).eq("profile_id", profileId);
  return NextResponse.json({ removed: true });
}
