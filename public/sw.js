// =====================================================================
// Service Worker — Finca El Progreso
// Estrategia:
//   - Pre-cache de shell mínima (manifest + logo).
//   - Navegación: NetworkFirst con fallback a cache.
//   - Recursos estáticos /_next/static/*: CacheFirst (inmutables).
//   - APIs (POST/PATCH/DELETE) NO se cachean — la app las encola en
//     IndexedDB cuando está offline (ver src/lib/offline/db.ts).
// =====================================================================

const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;

const SHELL_URLS = ["/", "/dashboard", "/manifest.webmanifest", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

const PHOTOS_CACHE = `photos-${VERSION}`;
const PHOTO_HOST_RE = /\.supabase\.co$/;
const PHOTO_PATH_RE = /\/storage\/v1\/(?:object|render\/image)\/public\/animal-photos\//;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fotos de animales (Supabase Storage público) → CacheFirst, otro origen permitido
  if (PHOTO_HOST_RE.test(url.hostname) && PHOTO_PATH_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(PHOTOS_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Estáticos inmutables → CacheFirst
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navegación → NetworkFirst con fallback al shell cacheado
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/dashboard"))),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
