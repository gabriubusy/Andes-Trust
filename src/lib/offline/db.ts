// =====================================================================
// IndexedDB (Dexie) — cola de mutaciones offline.
// Cada entrada describe un upsert a Supabase que se ejecutará al volver
// la conectividad. La forma del payload es la misma que se pasaría a
// `supabase.from(table).insert(payload)`.
//
// `client_uuid` va DENTRO del payload y se genera antes del primer
// intento, así el reintento hace upsert sobre la misma fila en vez de
// duplicarla (ver migración 0039_offline_idempotency.sql).
// =====================================================================

import Dexie, { type Table } from "dexie";

export type OfflineTable =
  | "weighings"
  | "vaccinations"
  | "treatments"
  | "animal_events"
  | "milk_records";

export type PendingMutation = {
  id?: number;
  table: OfflineTable;
  payload: Record<string, unknown>;
  created_at: number;
  attempts: number;
  last_error?: string;
  /** Marca de tiempo del último intento; null si nunca se intentó. */
  last_attempt_at?: number;
  /**
   * Perfil que creó la mutación. El drenado sólo procesa filas del usuario
   * activo: si A encola sin red y luego B inicia sesión en el mismo
   * dispositivo, las filas de A no deben irse con las credenciales de B.
   * Las filas se conservan (no se borran en logout) hasta que A vuelva.
   */
  owner_profile_id?: string;
};

/** Tablas con índice UNIQUE sobre client_uuid — pueden hacer upsert idempotente. */
const IDEMPOTENT_TABLES: ReadonlySet<string> = new Set([
  "weighings",
  "vaccinations",
  "treatments",
  "milk_records",
]);

export function supportsIdempotentUpsert(table: OfflineTable): boolean {
  return IDEMPOTENT_TABLES.has(table);
}

/** UUID v4 con fallback para navegadores sin crypto.randomUUID (contextos no seguros). */
export function newClientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Motivo por el que la base local no está operativa, o null si está sana.
 * Se expone para que la UI lo diga en vez de mostrar una cola vacía: un
 * "0 pendientes" falso es peor que un error, porque el usuario cree que
 * sus registros se enviaron.
 */
let openFailure: string | null = null;

export function queueFailure(): string | null {
  return openFailure;
}

class OfflineDB extends Dexie {
  pending!: Table<PendingMutation, number>;

  constructor() {
    super("andes-trust-offline");
    this.version(1).stores({
      pending: "++id, table, created_at",
    });
    // v2: añade last_attempt_at y owner_profile_id. Dexie migra en sitio; las
    // filas existentes quedan con los campos undefined —"nunca intentada" y
    // "sin dueño conocido"— que es el comportamiento heredado correcto.
    this.version(2).stores({
      pending: "++id, table, created_at, attempts, owner_profile_id",
    });

    // IndexedDB no puede migrar el esquema mientras otra pestaña mantenga
    // abierta una versión anterior: se queda esperando PARA SIEMPRE, y con
    // ella cualquier add()/count(). Sin este handler el síntoma era un modal
    // que no se cerraba y una cola que parecía vacía.
    this.on("blocked", () => {
      openFailure =
        "Hay otra pestaña de la app abierta con una versión anterior. " +
        "Ciérrala y recarga esta página para poder guardar sin conexión.";
    });

    // La otra mitad del bloqueo entre pestañas: cuando OTRA pestaña quiere
    // migrar a una versión nueva, ESTA debe soltar su conexión para no
    // bloquearla. Sin este handler, una pestaña vieja dejada abierta congela
    // el guardado sin conexión de la nueva. Al cerrar aquí, la nueva migra.
    this.on("versionchange", () => {
      this.close();
    });
  }
}

let _db: OfflineDB | null = null;
export function getOfflineDb(): OfflineDB {
  if (typeof window === "undefined") {
    throw new Error("Offline DB solo disponible en cliente");
  }
  if (!_db) {
    _db = new OfflineDB();
    // Calentar la apertura cuanto antes: así el coste único de abrir y migrar
    // la base no lo paga la PRIMERA escritura bajo el timeout de 5 s (el caso
    // en que el guardado sí completaba pero el modal no se cerraba). Los
    // errores de apertura no se tragan: reaparecen al escribir.
    _db.open().catch(() => {});
  }
  return _db;
}

export class EnqueueError extends Error {
  constructor(cause: unknown) {
    super(
      queueFailure() ??
        "No se pudo guardar el registro en el dispositivo. " +
          "Puede que el almacenamiento esté lleno o que el navegador esté en modo privado."
    );
    this.name = "EnqueueError";
    this.cause = cause;
  }
}

/**
 * Tope de espera para una escritura en IndexedDB. Estas filas son diminutas:
 * si en 5 s no se ha escrito, es que la base está bloqueada, no lenta.
 *
 * Se prefiere fallar visiblemente a esperar sin fin. Contrapartida asumida:
 * si la escritura acaba completándose después del timeout, el usuario habrá
 * visto un error para un registro que sí quedó encolado — molesto, pero
 * mucho menos grave que un formulario congelado sin explicación.
 */
const ENQUEUE_TIMEOUT_MS = 5_000;

// Abrir y migrar la base es un coste ÚNICO por sesión y puede tardar más que
// una escritura (sobre todo en móviles de campo). Se le da su propio margen,
// aparte del de escritura, para no fallar un guardado que sí iba a completar.
const OPEN_TIMEOUT_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout al escribir en IndexedDB")), ms)
    ),
  ]);
}

/**
 * Encola una mutación. LANZA si no se pudo persistir: cuando estamos offline
 * este es el único camino de escritura, así que un fallo silencioso equivale
 * a perder el dato sin avisar al usuario.
 */
export async function enqueueMutation(
  table: OfflineTable,
  payload: Record<string, unknown>,
  ownerProfileId?: string
): Promise<number> {
  try {
    const db = getOfflineDb();
    // Primero asegurar que la base está abierta, con su propio margen amplio.
    // Así el timeout de escritura (corto) sólo mide la escritura, no el coste
    // único de abrir/migrar: antes ese coste tiraba el timeout y el modal se
    // quedaba abierto aunque el registro sí quedaba encolado.
    if (!db.isOpen()) {
      await withTimeout(db.open(), OPEN_TIMEOUT_MS);
    }
    return await withTimeout(
      db.pending.add({
        table,
        payload,
        created_at: Date.now(),
        attempts: 0,
        owner_profile_id: ownerProfileId,
      }),
      ENQUEUE_TIMEOUT_MS
    );
  } catch (err) {
    throw new EnqueueError(err);
  }
}

export async function removeMutation(id: number) {
  const db = getOfflineDb();
  await db.pending.delete(id);
}

export async function clearAllMutations() {
  const db = getOfflineDb();
  await db.pending.clear();
}

/**
 * Devuelve -1 si la cola no se pudo leer. Antes devolvía 0, indistinguible de
 * "no hay nada pendiente": el banner afirmaba que todo estaba sincronizado
 * justo cuando la base local estaba rota.
 */
export async function pendingCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    return await withTimeout(getOfflineDb().pending.count(), ENQUEUE_TIMEOUT_MS);
  } catch (err) {
    if (!openFailure) {
      openFailure = "No se pudo leer la cola local de este dispositivo.";
    }
    console.error("[offline] pendingCount falló", err);
    return -1;
  }
}

/** Cierra la conexión y borra la base entera. Usado al cerrar sesión. */
export async function destroyOfflineDb() {
  if (typeof window === "undefined") return;
  try {
    if (_db) {
      _db.close();
      _db = null;
    }
    await Dexie.delete("andes-trust-offline");
  } catch {
    // ignorar: no debe bloquear el logout
  }
}
