// =====================================================================
// POST /api/push/test — envía una notificación de prueba a los dispositivos
// del propio usuario. Sirve para verificar la cadena de push completa sin
// tener que esperar a que se genere una alerta real.
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendPushToProfiles } from "@/lib/push/send";

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

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let privyDid: string;
  try {
    privyDid = (await getPrivy().verifyAuthToken(token)).userId;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const sb = getAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const sent = await sendPushToProfiles(sb, [profile.id], {
    title: "Notificación de prueba",
    body: "Si ves esto, las notificaciones push funcionan correctamente. 🎉",
    url: "/dashboard/alertas",
    tag: "test",
  });

  // sent = 0 puede significar que no hay suscripción activa en este dispositivo
  // o que faltan las claves VAPID en el servidor.
  return NextResponse.json({ sent });
}
