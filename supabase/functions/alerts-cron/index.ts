// =====================================================================
// alerts-cron — Edge Function (Deno)
// Ejecuta generate_alerts() / close_stale_alerts() y envía email a vets/owners
// Disparable por:
//   - pg_cron (HTTP request a la function URL con SUPABASE_ANON_KEY)
//   - Supabase Scheduled Functions
//   - Manualmente con `supabase functions invoke alerts-cron`
// Variables requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ALERTS_FROM_EMAIL
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("ALERTS_FROM_EMAIL") ?? "alertas@finca-el-progreso.com";

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
  if (!RESEND_KEY || to.length === 0) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
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

  let sent = 0;
  for (const [farmId, alerts] of byFarm) {
    const { data: farm } = await supabase.from("farms").select("name").eq("id", farmId).single();
    const recipients = await recipientsForFarm(farmId);
    if (recipients.length > 0) {
      await sendEmail(
        recipients.map((r) => r.email),
        `[Finca El Progreso] ${alerts.length} alerta(s) sanitaria(s)`,
        renderHtml(farm?.name ?? "Finca", alerts),
      );
      sent += recipients.length;
    }
    await supabase
      .from("alerts")
      .update({ notified_at: new Date().toISOString() })
      .in("id", alerts.map((a) => a.id));
  }

  return Response.json({
    generated: genRes.data ?? 0,
    closed: closeRes.data ?? 0,
    farms_notified: byFarm.size,
    emails_sent: sent,
  });
});
