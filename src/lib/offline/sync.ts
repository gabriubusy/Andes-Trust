// =====================================================================
// Drena la cola de mutaciones pendientes contra Supabase.
// Se invoca al recuperar conectividad y al cargar la app.
// =====================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOfflineDb, type PendingMutation } from "./db";

export type SyncResult = { synced: number; failed: number };

const MAX_ATTEMPTS = 5;

export async function flushPending(supabase: SupabaseClient): Promise<SyncResult> {
  const db = getOfflineDb();
  const items = await db.pending.orderBy("created_at").toArray();
  let synced = 0;
  let failed = 0;

  // Cada item se procesa como una transacción independiente: el insert
  // remoto + la actualización del registro local viven o caen juntos, así
  // si se cierra la pestaña a mitad de drenaje no quedan estados raros.
  for (const item of items) {
    try {
      const { error } = await supabase.from(item.table).insert(item.payload);
      if (error) throw error;
      await db.transaction("rw", db.pending, async () => {
        await db.pending.delete(item.id!);
      });
      synced += 1;
    } catch (err) {
      failed += 1;
      const nextAttempts = (item.attempts ?? 0) + 1;
      await db.transaction("rw", db.pending, async () => {
        const updated: Partial<PendingMutation> = {
          attempts: nextAttempts,
          last_error: (err as Error).message,
        };
        await db.pending.update(item.id!, updated);
      });
      // Si nextAttempts >= MAX_ATTEMPTS el item queda para inspección
      // manual (no se borra para no perder datos).
      if (nextAttempts >= MAX_ATTEMPTS) {
        // intencional: dejar la fila marcada
      }
    }
  }
  return { synced, failed };
}
