// POST /api/team/invite  body: { farm_id, email, role }
//   Crea (o actualiza) una invitación. Si el invitado ya tiene profile,
//   intenta sumarlo directamente a farm_members.
// DELETE /api/team/invite?id=  revoca invitación.

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { buildInviteEmail } from "@/lib/email/invite-template";

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

type Role = "owner" | "admin" | "operator" | "vet" | "viewer";
const ALLOWED_ROLES: Role[] = ["owner", "admin", "operator", "vet", "viewer"];

async function actor(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    const sb = getAdmin();
    const { data } = await sb.from("profiles").select("id").eq("privy_did", claims.userId).single();
    return data ?? null;
  } catch {
    return null;
  }
}

async function requireAdmin(profileId: string, farmId: string) {
  const sb = getAdmin();
  const { data } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", farmId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.role === "owner" || data?.role === "admin";
}

export async function POST(req: Request) {
  const me = await actor(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { farm_id: string; email: string; role: Role };
  if (!body.farm_id || !body.email || !ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  if (!(await requireAdmin(me.id, body.farm_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = getAdmin();
  const email = body.email.trim().toLowerCase();

  // ¿Ya existe profile con ese email? Súmalo directo.
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    await sb
      .from("farm_members")
      .upsert(
        { farm_id: body.farm_id, profile_id: existing.id, role: body.role },
        { onConflict: "farm_id,profile_id" }
      );
    return NextResponse.json({ added_directly: true, profile_id: existing.id });
  }

  // Crear / refrescar invitación pendiente
  const { data: invite, error } = await sb
    .from("farm_invitations")
    .upsert(
      {
        farm_id: body.farm_id,
        email,
        role: body.role,
        status: "pending",
        created_by: me.id,
        expires_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
      },
      { onConflict: "farm_id,email" }
    )
    .select("id, token")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Obtener datos para el email
  const { data: farm } = await sb.from("farms").select("name").eq("id", body.farm_id).single();
  const { data: inviterProfile } = await sb
    .from("profiles")
    .select("email")
    .eq("id", me.id)
    .single();

  const farmName = farm?.name ?? "la finca";
  const invitedByEmail = inviterProfile?.email ?? "El administrador";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { html, text } = buildInviteEmail({ farmName, role: body.role, invitedByEmail, appUrl });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Finca El Progreso" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Te invitaron a unirte a ${farmName}`,
      html,
      text,
    });
    console.log("[invite] email_sent", info.messageId, "→", email);
  } catch (emailError) {
    console.error("[invite] smtp_error", emailError);
    return NextResponse.json({ invitation: invite, email_error: String(emailError) });
  }
  return NextResponse.json({ invitation: invite, email_sent: true });
}

// PATCH /api/team/invite  body: { id }
//   Verifica manualmente si el invitado ya tiene cuenta y, de ser así,
//   lo suma a farm_members y marca la invitación como aceptada.
export async function PATCH(req: Request) {
  const me = await actor(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getAdmin();
  const { data: inv } = await sb
    .from("farm_invitations")
    .select("id, farm_id, email, role, status")
    .eq("id", body.id)
    .single();
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await requireAdmin(me.id, inv.farm_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (inv.status !== "pending") {
    return NextResponse.json({ verified: false, reason: "not_pending" });
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("email", inv.email)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ verified: false, reason: "no_account" });
  }

  await sb
    .from("farm_members")
    .upsert(
      { farm_id: inv.farm_id, profile_id: profile.id, role: inv.role },
      { onConflict: "farm_id,profile_id" }
    );
  await sb
    .from("farm_invitations")
    .update({ status: "accepted", accepted_by: profile.id, accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  return NextResponse.json({ verified: true });
}

export async function DELETE(req: Request) {
  const me = await actor(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getAdmin();
  const { data: inv } = await sb.from("farm_invitations").select("farm_id").eq("id", id).single();
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await requireAdmin(me.id, inv.farm_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await sb.from("farm_invitations").update({ status: "revoked" }).eq("id", id);
  return NextResponse.json({ revoked: true });
}
