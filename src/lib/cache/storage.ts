// Simple localStorage cache with TTL support

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const PREFIX = "finca_cache_";

export const cacheStorage = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(PREFIX + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if expired
      if (age > entry.ttl) {
        localStorage.removeItem(PREFIX + key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, ttl = 60 * 60 * 1000): void {
    if (typeof window === "undefined") return;
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Silently fail if localStorage is full
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // Silently fail
    }
  },

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Silently fail
    }
  },
};
