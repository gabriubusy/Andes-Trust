// POST /api/team/accept  body: { token? }
//   Si pasa token: acepta esa invitación si el email coincide con el profile.
//   Si no pasa token: acepta TODAS las pendientes para el email del profile.

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
      { auth: { persistSession: false } },
    );
  }
  return _admin;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const tok = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!tok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let privyDid: string;
  try {
    privyDid = (await getPrivy().verifyAuthToken(tok)).userId;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const sb = getAdmin();
  const { data: profile } = await sb.from("profiles").select("id, email").eq("privy_did", privyDid).single();
  if (!profile?.email) return NextResponse.json({ error: "no_profile_email" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { token?: string };

  let q = sb
    .from("farm_invitations")
    .select("id, farm_id, role, email, status, expires_at, token")
    .eq("email", profile.email.toLowerCase())
    .eq("status", "pending");
  if (body.token) q = q.eq("token", body.token);
  const { data: invites } = await q;
  if (!invites || invites.length === 0) return NextResponse.json({ accepted: 0 });

  let accepted = 0;
  for (const inv of invites) {
    if (new Date(inv.expires_at) < new Date()) {
      await sb.from("farm_invitations").update({ status: "expired" }).eq("id", inv.id);
      continue;
    }
    await sb.from("farm_members").upsert(
      { farm_id: inv.farm_id, profile_id: profile.id, role: inv.role },
      { onConflict: "farm_id,profile_id" },
    );
    await sb
      .from("farm_invitations")
      .update({ status: "accepted", accepted_by: profile.id, accepted_at: new Date().toISOString() })
      .eq("id", inv.id);
    accepted++;
  }
  return NextResponse.json({ accepted });
}
