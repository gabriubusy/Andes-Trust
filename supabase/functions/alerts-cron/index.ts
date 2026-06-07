// =====================================================================
// alerts-cron — Edge Function (Deno)
// Ejecuta generate_alerts() / close_stale_alerts() y envía email a vets/owners
// Disparable por:
//   - pg_cron (HTTP request a la function URL con SUPABASE_ANON_KEY)
//   - Supabase Scheduled Functions
//   - Manualmente con `supabase functions invoke alerts-cron`
// Variables requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_USER, SMTP_PASS
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore — web-push types not available in Deno, using fetch-based VAPID manually
import webPush from "https://esm.sh/web-push@3.6.7";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

type AlertRow = {
  id: string;
  farm_id: string;
  animal_id: string | null;
  type: string;
  due_at: string;
  payload: Record<string, unknown>;
  notified_at: string | null;
};

type Recipient = { email: string; full_name: string | null };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@finca-el-progreso.com";

const TYPE_LABEL: Record<string, string> = {
  vaccination_due: "Vacunación próxima",
  treatment_withdrawal: "Período de retiro vigente",
  weighing_due: "Pesaje pendiente",
  custom: "Alerta",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function sendEmail(to: string[], subject: string, html: string) {
  if (!SMTP_USER || !SMTP_PASS || to.length === 0) return;
  const client = new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: SMTP_USER, password: SMTP_PASS } },
  });
  for (const recipient of to) {
    await client.send({ from: SMTP_USER, to: recipient, subject, html });
  }
  await client.close();
}

function renderHtml(farmName: string, alerts: AlertRow[]): string {
  const rows = alerts
    .map((a) => {
      const tag = (a.payload as { animal_tag?: string }).animal_tag ?? "—";
      const due = new Date(a.due_at).toLocaleDateString("es-VE");
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${TYPE_LABEL[a.type] ?? a.type}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${tag}</strong></td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${due}</td>
      </tr>`;
    })
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:560px">
    <h2 style="margin:0 0 12px">Alertas pendientes — ${farmName}</h2>
    <p style="color:#555;margin:0 0 16px">Hay ${alerts.length} eventos sanitarios que requieren atención.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead><tr style="background:#f5f5f5">
        <th align="left" style="padding:8px 10px">Tipo</th>
        <th align="left" style="padding:8px 10px">Animal</th>
        <th align="left" style="padding:8px 10px">Vence</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

type PushSub = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function sendPushNotifications(farmId: string, alerts: AlertRow[]) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return 0;

  // Get profile IDs for this farm's owners/admins/vets
  const { data: members } = await supabase
    .from("farm_members")
    .select("profile_id")
    .eq("farm_id", farmId)
    .in("role", ["owner", "admin", "vet"]);
  if (!members || members.length === 0) return 0;

  const profileIds = members.map((m) => m.profile_id);
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth")
    .in("profile_id", profileIds);
  if (!subs || subs.length === 0) return 0;

  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const payload = JSON.stringify({
    title: `${alerts.length} alerta(s) sanitaria(s)`,
    body: alerts.slice(0, 3).map((a) => TYPE_LABEL[a.type] ?? a.type).join(", "),
    url: "/dashboard/alertas",
  });

  const expiredIds: string[] = [];
  let sent = 0;
  for (const sub of subs as PushSub[]) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: unknown) {
      // 410 Gone = subscription expired, remove it
      if ((err as { statusCode?: number }).statusCode === 410) {
        expiredIds.push(sub.id);
      }
    }
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return sent;
}

async function recipientsForFarm(farmId: string): Promise<Recipient[]> {
  const { data, error } = await supabase
    .from("farm_members")
    .select("profiles:profile_id(email, full_name), role")
    .eq("farm_id", farmId)
    .in("role", ["owner", "admin", "vet"]);
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.profiles as unknown as Recipient | null)
    .filter((p): p is Recipient => !!p?.email);
}

Deno.serve(async () => {
  // 1. Generar / cerrar alertas
  const [genRes, closeRes] = await Promise.all([
    supabase.rpc("generate_alerts"),
    supabase.rpc("close_stale_alerts"),
  ]);
  if (genRes.error) {
    return new Response(JSON.stringify({ error: genRes.error.message }), { status: 500 });
  }

  // 2. Tomar alertas abiertas no notificadas
  const { data: openAlerts, error: alertsErr } = await supabase
    .from("alerts")
    .select("id, farm_id, animal_id, type, due_at, payload, notified_at")
    .eq("status", "open")
    .is("notified_at", null);
  if (alertsErr) {
    return new Response(JSON.stringify({ error: alertsErr.message }), { status: 500 });
  }

  // 3. Agrupar por finca y notificar
  const byFarm = new Map<string, AlertRow[]>();
  for (const a of (openAlerts ?? []) as AlertRow[]) {
    if (!byFarm.has(a.farm_id)) byFarm.set(a.farm_id, []);
    byFarm.get(a.farm_id)!.push(a);
  }

  let emailsSent = 0;
  let pushSent = 0;
  for (const [farmId, alerts] of byFarm) {
    const { data: farm } = await supabase.from("farms").select("name").eq("id", farmId).single();
    const recipients = await recipientsForFarm(farmId);
    if (recipients.length > 0) {
      await sendEmail(
        recipients.map((r) => r.email),
        `[Finca El Progreso] ${alerts.length} alerta(s) sanitaria(s)`,
        renderHtml(farm?.name ?? "Finca", alerts),
      );
      emailsSent += recipients.length;
    }
    pushSent += await sendPushNotifications(farmId, alerts);
    await supabase
      .from("alerts")
      .update({ notified_at: new Date().toISOString() })
      .in("id", alerts.map((a) => a.id));
  }

  return Response.json({
    generated: genRes.data ?? 0,
    closed: closeRes.data ?? 0,
    farms_notified: byFarm.size,
    emails_sent: emailsSent,
    push_sent: pushSent,
  });
});
