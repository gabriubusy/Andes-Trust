import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { SignJWT } from "jose";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_TTL_SECONDS = 60 * 60;

let _privy: PrivyClient | null = null;
function getPrivy() {
  if (!_privy) {
    _privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  }
  return _privy;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const privyToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!privyToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const privy = getPrivy();
  let claims;
  try {
    claims = await privy.verifyAuthToken(privyToken);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const privyDid = claims.userId;
  const user = await privy.getUserById(privyDid).catch(() => null);
  const email = user?.email?.address ?? user?.google?.email ?? null;
  const wallet = user?.wallet?.address ?? null;

  const adminDids = (process.env.PLATFORM_ADMIN_DIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isPlatformAdmin = adminDids.includes(privyDid);

  const supabaseAdmin = getSupabaseAdmin();

  // Buscar perfil existente por privy_did
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .maybeSingle();

  let profile: { id: string } | null = null;

  if (existing) {
    // Actualizar perfil existente
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({
        wallet_address: wallet,
        ...(email ? { email } : {}),
      })
      .eq("privy_did", privyDid)
      .select("id")
      .single();
    if (error) {
      console.error("[supabase-token] update_failed", error);
      return NextResponse.json(
        { error: "profile_upsert_failed", detail: error.message, code: error.code },
        { status: 500 }
      );
    }
    profile = data;
  } else {
    // Crear nuevo perfil
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        privy_did: privyDid,
        email,
        wallet_address: wallet,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[supabase-token] insert_failed", error);
      return NextResponse.json(
        { error: "profile_upsert_failed", detail: error.message, code: error.code },
        { status: 500 }
      );
    }
    profile = data;
  }

  if (!profile) {
    return NextResponse.json({ error: "profile_upsert_failed" }, { status: 500 });
  }

  await ensureDefaultFarm(profile.id);
  await acceptPendingInvitations(profile.id, email);

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    privy_did: privyDid,
    role: "authenticated",
    email: email ?? undefined,
    is_platform_admin: isPlatformAdmin,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("supabase")
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_TTL_SECONDS)
    .setSubject(profile.id)
    .setAudience("authenticated")
    .sign(secret);

  return NextResponse.json({
    token,
    expiresAt: (now + JWT_TTL_SECONDS) * 1000,
    profileId: profile.id,
    isPlatformAdmin,
  });
}

async function acceptPendingInvitations(profileId: string, email: string | null) {
  if (!email) return;
  const sb = getSupabaseAdmin();
  const { data: invites } = await sb
    .from("farm_invitations")
    .select("id, farm_id, role, expires_at")
    .eq("email", email.toLowerCase())
    .eq("status", "pending");
  if (!invites || invites.length === 0) return;
  const now = Date.now();
  for (const inv of invites) {
    if (new Date(inv.expires_at).getTime() < now) {
      await sb.from("farm_invitations").update({ status: "expired" }).eq("id", inv.id);
      continue;
    }
    await sb
      .from("farm_members")
      .upsert(
        { farm_id: inv.farm_id, profile_id: profileId, role: inv.role },
        { onConflict: "farm_id,profile_id" }
      );
    await sb
      .from("farm_invitations")
      .update({ status: "accepted", accepted_by: profileId, accepted_at: new Date().toISOString() })
      .eq("id", inv.id);
  }
}

const DEFAULT_FARM_NAME = "Finca El Progreso";

async function ensureDefaultFarm(profileId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // Check if this profile already owns a farm
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("farms")
    .select("id")
    .eq("owner_profile_id", profileId)
    .limit(1)
    .maybeSingle();

  if (selectError) return;

  let farmId = existing?.id;

  if (!farmId) {
    const { data: created, error: insertError } = await supabaseAdmin
      .from("farms")
      .insert({ name: DEFAULT_FARM_NAME, owner_profile_id: profileId, country: "Venezuela" })
      .select("id")
      .single();
    if (insertError || !created) return;
    farmId = created.id;
  }

  await supabaseAdmin
    .from("farm_members")
    .upsert(
      { farm_id: farmId, profile_id: profileId, role: "owner" },
      { onConflict: "farm_id,profile_id", ignoreDuplicates: true }
    );
}
