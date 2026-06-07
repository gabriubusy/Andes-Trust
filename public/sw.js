// =====================================================================
// Service Worker — Finca El Progreso
// Estrategia:
//   - Pre-cache shell mínima (manifest + logo + dashboard).
//   - Estáticos /_next/static/*: CacheFirst (hashes inmutables).
//   - Fotos animales (Supabase Storage): CacheFirst.
//   - API Supabase GET (animales, eventos, etc.): NetworkFirst con
//     fallback a cache para lectura offline.
//   - API propia (/api/*) GET: NetworkFirst con fallback.
//   - POST/PATCH/DELETE: nunca se cachean (la app los encola en IDB).
// =====================================================================

const VERSION = "v3";
const SHELL_CACHE   = `shell-${VERSION}`;
const STATIC_CACHE  = `static-${VERSION}`;
const PHOTOS_CACHE  = `photos-${VERSION}`;
const API_CACHE     = `api-${VERSION}`;

const SHELL_URLS = ["/", "/dashboard", "/login", "/manifest.webmanifest", "/logo.png"];

// ── Install: pre-cache shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => null)
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejas ──────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Helpers ───────────────────────────────────────────────────────────
async function networkFirst(req, cacheName, ttlSeconds = 300) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const body = await res.arrayBuffer();
      const tagged = new Response(body, { status: res.status, headers });
      cache.put(req, tagged.clone());
      return new Response(body, { status: res.status, headers: res.headers });
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("sw-cached-at") || "0", 10);
      if (Date.now() - cachedAt < ttlSeconds * 1000) return cached;
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// ── Fetch ─────────────────────────────────────────────────────────────
const PHOTO_HOST_RE = /\.supabase\.co$/;
const PHOTO_PATH_RE = /\/storage\/v1\/(?:object|render\/image)\/public\/animal-photos\//;
const SUPABASE_API_RE = /\.supabase\.co\/rest\/v1\//;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Fotos animales → CacheFirst (sin expiración, inmutables por URL)
  if (PHOTO_HOST_RE.test(url.hostname) && PHOTO_PATH_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(req, PHOTOS_CACHE));
    return;
  }

  // API Supabase GET (lectura de tablas) → NetworkFirst 5 min TTL
  if (PHOTO_HOST_RE.test(url.hostname) && SUPABASE_API_RE.test(url.pathname)) {
    event.respondWith(networkFirst(req, API_CACHE, 300));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Estáticos Next.js → CacheFirst (hash en nombre = inmutable)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // API propia GET (/api/verify, /api/reports) → NetworkFirst 2 min
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req, API_CACHE, 120));
    return;
  }

  // Navegación → NetworkFirst con fallback al shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(SHELL_CACHE).then((c) => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/dashboard");
        })
    );
  }
});

// ── Mensajes desde la app ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();

  // Invalidar caché de API cuando la app hace una mutación
  if (event.data?.type === "INVALIDATE_API_CACHE") {
    caches.delete(API_CACHE);
  }
});
