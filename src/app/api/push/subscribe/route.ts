// =====================================================================
// POST /api/push/subscribe   — registra una PushSubscription para el usuario
// DELETE /api/push/subscribe — elimina la suscripción del navegador actual
// GET    /api/push/subscribe — devuelve la VAPID public key para suscribirse
// =====================================================================

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

async function profileFromAuth(req: Request): Promise<{ id: string } | null> {
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

export async function GET() {
  return NextResponse.json({
    vapid_public_key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  });
}

export async function POST(req: Request) {
  const profile = await profileFromAuth(req);
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    user_agent?: string;
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const sb = getAdmin();
  await sb.from("push_subscriptions").upsert(
    {
      profile_id: profile.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: body.user_agent ?? null,
    },
    { onConflict: "profile_id,endpoint" }
  );
  return NextResponse.json({ subscribed: true });
}

export async function DELETE(req: Request) {
  const profile = await profileFromAuth(req);
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "missing_endpoint" }, { status: 400 });

  const sb = getAdmin();
  await sb
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", profile.id)
    .eq("endpoint", endpoint);
  return NextResponse.json({ unsubscribed: true });
}
