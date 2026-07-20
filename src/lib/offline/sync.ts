// =====================================================================
// Drena la cola de mutaciones pendientes contra Supabase.
// Se invoca al recuperar conectividad y al cargar la app.
// =====================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOfflineDb, supportsIdempotentUpsert, type PendingMutation } from "./db";

export type SyncResult = { synced: number; failed: number; skipped: number };

export const MAX_ATTEMPTS = 5;

/** Backoff exponencial entre reintentos: 5s, 20s, 80s, 320s. */
function backoffMs(attempts: number): number {
  return Math.min(5_000 * 4 ** Math.max(0, attempts - 1), 320_000);
}

/** Una fila está lista si no agotó intentos y ya cumplió su backoff. */
export function isReady(item: PendingMutation, now: number): boolean {
  if ((item.attempts ?? 0) >= MAX_ATTEMPTS) return false;
  if (!item.last_attempt_at) return true;
  return now - item.last_attempt_at >= backoffMs(item.attempts ?? 0);
}

/** Una fila está atascada: agotó los reintentos y espera decisión del usuario. */
export function isStuck(item: PendingMutation): boolean {
  return (item.attempts ?? 0) >= MAX_ATTEMPTS;
}

function invalidateSWApiCache() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: "INVALIDATE_API_CACHE" });
  }
}

// Guard de concurrencia: el poll de 5s del banner y el evento `online`
// pueden disparar flush a la vez; sin esto los dos drenan la misma fila.
let flushing = false;

/**
 * @param opts.force ignora el backoff y el cap de intentos (reintento manual
 *        desde la página de sincronización).
 */
export async function flushPending(
  supabase: SupabaseClient,
  opts: { force?: boolean; ids?: number[]; profileId?: string | null } = {}
): Promise<SyncResult> {
  if (flushing && !opts.force) return { synced: 0, failed: 0, skipped: 0 };
  flushing = true;
  try {
    const db = getOfflineDb();
    const all = await db.pending.orderBy("created_at").toArray();
    const now = Date.now();
    const items = all.filter((i) => {
      if (opts.ids && !opts.ids.includes(i.id!)) return false;
      // Nunca enviar filas de otro usuario con la sesión actual. Las filas
      // heredadas (sin dueño) sí se procesan: son anteriores a este campo.
      if (opts.profileId && i.owner_profile_id && i.owner_profile_id !== opts.profileId) {
        return false;
      }
      return opts.force || isReady(i, now);
    });

    let synced = 0;
    let failed = 0;
    const skipped = all.length - items.length;
    let didSync = false;

    for (const item of items) {
      try {
        // Upsert sobre client_uuid: si el intento anterior llegó a Supabase
        // pero perdimos la respuesta, esto actualiza la fila existente en
        // lugar de crear un duplicado.
        const hasUuid = typeof item.payload.client_uuid === "string";
        const q =
          supportsIdempotentUpsert(item.table) && hasUuid
            ? supabase.from(item.table).upsert(item.payload, { onConflict: "client_uuid" })
            : supabase.from(item.table).insert(item.payload);

        const { error } = await q;
        if (error) throw error;

        await db.pending.delete(item.id!);
        synced += 1;
        didSync = true;
      } catch (err) {
        failed += 1;
        await db.pending.update(item.id!, {
          attempts: (item.attempts ?? 0) + 1,
          last_error: (err as Error).message,
          last_attempt_at: Date.now(),
        } satisfies Partial<PendingMutation>);
      }
    }

    // Una sola invalidación al final en vez de una por fila.
    if (didSync) invalidateSWApiCache();

    return { synced, failed, skipped };
  } finally {
    flushing = false;
  }
}

/** Cuenta filas que el drenado automático ya no tocará. */
export async function stuckCount(): Promise<number> {
  const db = getOfflineDb();
  return db.pending.where("attempts").aboveOrEqual(MAX_ATTEMPTS).count();
}
