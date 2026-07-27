// POST /api/alerts/generate
// Manual trigger for generate_alerts() + close_stale_alerts() RPCs.
// Requires authenticated user with owner/admin/vet role on any farm.

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@supabase/supabase-js";
import { sendPushToProfiles } from "@/lib/push/send";

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

  // Enviar push de las alertas aún no notificadas. Se usa `notified_at` (no una
  // ventana de tiempo) para que cada alerta se notifique EXACTAMENTE una vez,
  // sin depender de relojes ni de cada cuánto corra esto. Nunca bloquea la
  // respuesta: un fallo de push no debe tumbar la generación de alertas.
  let pushed = 0;
  try {
    const { data: pending } = await sb
      .from("alerts")
      .select("id, farm_id")
      .eq("status", "open")
      .is("notified_at", null);

    const rows = pending ?? [];
    if (rows.length) {
      const byFarm = new Map<string, number>();
      for (const a of rows) byFarm.set(a.farm_id, (byFarm.get(a.farm_id) ?? 0) + 1);

      for (const [farmId, count] of byFarm) {
        const { data: members } = await sb
          .from("farm_members")
          .select("profile_id")
          .eq("farm_id", farmId);
        const profileIds = (members ?? []).map((m) => m.profile_id as string);
        pushed += await sendPushToProfiles(sb, profileIds, {
          title: "Alertas sanitarias",
          body:
            count === 1
              ? "Tienes 1 alerta nueva pendiente."
              : `Tienes ${count} alertas nuevas pendientes.`,
          url: "/dashboard/alertas",
          tag: "alerts",
        });
      }

      // Marcar como notificadas para no volver a empujarlas.
      await sb
        .from("alerts")
        .update({ notified_at: new Date().toISOString() })
        .in(
          "id",
          rows.map((a) => a.id as string)
        );
    }
  } catch (err) {
    console.error("[alerts/generate] push falló", err);
  }

  return NextResponse.json({
    generated: genRes.data ?? 0,
    closed: closeRes.data ?? 0,
    pushed,
  });
}
