// =====================================================================
// Camino único de escritura para los formularios de captura.
//
// Decide entre enviar a Supabase o encolar, y —lo importante— encola
// también cuando el envío falla por red. `navigator.onLine` sólo sabe si
// hay interfaz de red levantada, no si hay internet: en el campo devuelve
// `true` con una barra de señal que no llega a ningún sitio, y sin esto
// el registro se perdía con un error rojo.
// =====================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueMutation, newClientUuid, supportsIdempotentUpsert, type OfflineTable } from "./db";

export type SubmitResult = { queued: boolean };

const NETWORK_HINTS = [
  "failed to fetch",
  "networkerror",
  "load failed",
  "network request failed",
  "err_internet_disconnected",
  "fetch failed",
];

/**
 * ¿El fallo es de red y no de negocio? Exportado porque los formularios con
 * adjuntos (vacunación, tratamiento) no pueden usar `submitOrQueue` —la cola
 * no guarda binarios— pero deben tomar la misma decisión de encolar.
 */
export function isNetworkError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
  if (NETWORK_HINTS.some((h) => msg.includes(h))) return true;
  // PostgrestError de red llega sin código SQL.
  const code = (err as { code?: string })?.code;
  return code === "" || code === undefined ? err instanceof TypeError : false;
}

export async function submitOrQueue(
  supabase: SupabaseClient | null,
  table: OfflineTable,
  payload: Record<string, unknown>,
  ownerProfileId?: string | null
): Promise<SubmitResult> {
  // El uuid se genera ANTES del primer intento para que el reintento
  // reconozca la fila si el insert llegó pero la respuesta se perdió.
  const body = supportsIdempotentUpsert(table)
    ? { ...payload, client_uuid: newClientUuid() }
    : payload;

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (!supabase || offline) {
    await enqueueMutation(table, body, ownerProfileId ?? undefined);
    return { queued: true };
  }

  try {
    const { error } = await supabase.from(table).insert(body);
    if (error) throw error;
    return { queued: false };
  } catch (err) {
    if (isNetworkError(err)) {
      // Con `ownerProfileId`, igual que la rama de arriba. Sin él la fila queda
      // sin dueño y `sync.ts` sólo salta las que tienen uno distinto, así que
      // se acabaría enviando con las credenciales de quien esté logueado —
      // justo lo que `owner_profile_id` existe para impedir.
      await enqueueMutation(table, body, ownerProfileId ?? undefined);
      return { queued: true };
    }
    throw err; // error real de validación/RLS: debe verlo el usuario
  }
}

/** Mensaje de éxito honesto según dónde acabó el registro. */
export function submitToastMessage(r: SubmitResult): string {
  return r.queued
    ? "Guardado en este dispositivo · se enviará al recuperar señal"
    : "Guardado correctamente";
}
