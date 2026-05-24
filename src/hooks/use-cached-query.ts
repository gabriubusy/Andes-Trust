import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { cacheStorage } from "@/lib/cache/storage";

/**
 * Hook que combina TanStack Query con localStorage para persistencia
 * Primero intenta usar el cache de localStorage, luego hace la query
 */
export function useCachedQuery<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError>, "queryFn"> & {
    queryFn: () => Promise<TData>;
    cacheKey?: string;
    cacheTTL?: number; // en milisegundos, default 1 hora
  }
): UseQueryResult<TData, TError> {
  const { queryFn, cacheKey, cacheTTL = 60 * 60 * 1000, ...queryOptions } = options;
  const key = cacheKey || (Array.isArray(options.queryKey) ? options.queryKey.join("_") : "");

  return useQuery<TData, TError>({
    ...queryOptions,
    queryFn: async () => {
      // Try localStorage first
      if (key) {
        const cached = cacheStorage.get<TData>(key);
        if (cached) return cached;
      }

      // Fallback to actual query
      const result = await queryFn();

      // Store result
      if (key) {
        cacheStorage.set(key, result, cacheTTL);
      }

      return result;
    },
  });
}
