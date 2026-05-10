// =====================================================================
// IndexedDB (Dexie) — cola de mutaciones offline.
// Cada entrada describe un upsert a Supabase que se ejecutará al volver
// la conectividad. La forma del payload es la misma que se pasaría a
// `supabase.from(table).insert(payload)`.
// =====================================================================

import Dexie, { type Table } from "dexie";

export type PendingMutation = {
  id?: number;
  table: "weighings" | "vaccinations" | "treatments" | "animal_events" | "milk_records";
  payload: Record<string, unknown>;
  created_at: number;
  attempts: number;
  last_error?: string;
};

class OfflineDB extends Dexie {
  pending!: Table<PendingMutation, number>;

  constructor() {
    super("andes-trust-offline");
    this.version(1).stores({
      pending: "++id, table, created_at",
    });
  }
}

let _db: OfflineDB | null = null;
export function getOfflineDb(): OfflineDB {
  if (typeof window === "undefined") {
    throw new Error("Offline DB solo disponible en cliente");
  }
  if (!_db) _db = new OfflineDB();
  return _db;
}

export async function enqueueMutation(
  table: PendingMutation["table"],
  payload: Record<string, unknown>
) {
  const db = getOfflineDb();
  return db.pending.add({
    table,
    payload,
    created_at: Date.now(),
    attempts: 0,
  });
}

export async function pendingCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  return getOfflineDb().pending.count();
}
