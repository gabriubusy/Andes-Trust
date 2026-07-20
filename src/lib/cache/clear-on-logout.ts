import { cacheStorage } from "@/lib/cache/storage";
import { clearSession } from "@/lib/offline/session";

/**
 * Limpia el estado local cuando el usuario se desautentica.
 *
 * Deliberadamente NO borra la cola offline (IndexedDB): puede contener
 * registros de campo que aún no llegaron a Supabase, y perderlos en un
 * logout sería destructivo. Cada fila lleva `owner_profile_id` y el
 * drenado sólo procesa las del usuario activo, así que la cola de A no se
 * envía con la sesión de B — se queda esperando a que A vuelva.
 */
export async function clearCacheOnLogout() {
  cacheStorage.clear();
  clearSession();

  // Las cachés del SW guardan respuestas de la API con datos de la finca
  // anterior; sin esto el siguiente usuario podía ver lecturas ajenas.
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("api-")).map((k) => caches.delete(k)));
    } catch {
      // ignorar: no debe bloquear el logout
    }
  }
}
