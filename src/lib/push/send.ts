// =====================================================================
// Envío de notificaciones Web Push a los dispositivos suscritos.
//
// Usa VAPID (claves generadas localmente, sin proveedor de pago). El emisor
// firma cada petición con la clave privada; el navegador la entrega desde el
// servicio de push gratuito de su fabricante (Google/Mozilla/Apple).
//
// Las suscripciones muertas (410 Gone / 404) se borran de la tabla: un
// navegador que revocó el permiso o se desinstaló no debe reintentarse
// eternamente.
// =====================================================================

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

/** Configura VAPID una sola vez. Devuelve false si faltan las claves. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Ruta a abrir al tocar la notificación. */
  url?: string;
  /** Agrupa/colapsa notificaciones del mismo tema en el dispositivo. */
  tag?: string;
};

type SubRow = { endpoint: string; p256dh: string; auth: string };

/**
 * Envía `payload` a todas las suscripciones de los perfiles dados.
 * Nunca lanza: los fallos se registran y las suscripciones muertas se limpian.
 * Devuelve cuántos envíos tuvieron éxito.
 */
export async function sendPushToProfiles(
  sb: SupabaseClient,
  profileIds: string[],
  payload: PushPayload
): Promise<number> {
  if (!profileIds.length) return 0;
  if (!ensureConfigured()) {
    console.warn("[push] VAPID no configurado — se omite el envío");
    return 0;
  }

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("profile_id", profileIds);

  const rows = (subs ?? []) as SubRow[];
  if (!rows.length) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          body
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          dead.push(r.endpoint); // suscripción caducada: a borrar
        } else {
          console.error("[push] envío falló", status, (err as Error).message);
        }
      }
    })
  );

  if (dead.length) {
    await sb.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return sent;
}
