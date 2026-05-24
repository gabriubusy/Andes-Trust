import { cacheStorage } from "@/lib/cache/storage";

/**
 * Limpia todo el cache cuando el usuario se desautentica
 */
export function clearCacheOnLogout() {
  cacheStorage.clear();
}
