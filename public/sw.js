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
//
// Sobre la caducidad del fallback: al ser NetworkFirst, con conexión SIEMPRE
// se sirve dato fresco —el TTL sólo decide cuánto vale la copia cuando no hay
// red—. Por eso las ventanas son largas: en campo, una jornada entera sin
// señal debe seguir mostrando el hato. Pasado el TTL tampoco devolvemos error:
// servimos la copia marcada con `sw-stale: 1`, porque un dato viejo es mejor
// que una pantalla vacía. Sólo se responde 503 si nunca se cacheó nada.
// =====================================================================

const VERSION = "v5";

// Ventanas de validez del fallback offline.
const TTL_SUPABASE = 60 * 60 * 24 * 7; // 7 días — datos del hato, cambian poco
const TTL_OWN_API = 60 * 60 * 24; // 24 h — endpoints propios
const SHELL_CACHE   = `shell-${VERSION}`;
const STATIC_CACHE  = `static-${VERSION}`;
const PHOTOS_CACHE  = `photos-${VERSION}`;
const API_CACHE     = `api-${VERSION}`;
const RSC_CACHE     = `rsc-${VERSION}`;

// Secciones que deben poder abrirse (y recargarse) sin señal.
const SHELL_URLS = [
  "/",
  "/dashboard",
  "/dashboard/animales",
  "/dashboard/produccion",
  "/dashboard/alertas",
  "/dashboard/tratamientos",
  "/dashboard/sincronizacion",
  "/login",
  "/manifest.webmanifest",
  "/logo.png",
];

// ── Install: pre-cache shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (c) => {
      // Uno a uno, NO con addAll(): addAll es atómico, así que una sola URL
      // que falle (p. ej. /dashboard redirige por sesión) tiraba abajo TODO
      // el precacheo en silencio y dejaba la app sin shell offline.
      await Promise.all(
        SHELL_URLS.map((u) =>
          fetch(u)
            .then((res) => (res.ok ? c.put(u, res) : null))
            .catch(() => null)
        )
      );
    })
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
      const ageMs = Date.now() - cachedAt;
      if (ageMs < ttlSeconds * 1000) return cached;

      // Fuera de ventana: se sirve igualmente, pero marcado para que la UI
      // pueda advertir que son datos antiguos. Mejor eso que un 503.
      const headers = new Headers(cached.headers);
      headers.set("sw-stale", "1");
      headers.set("sw-age-seconds", Math.floor(ageMs / 1000).toString());
      const body = await cached.arrayBuffer();
      return new Response(body, { status: cached.status, headers });
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

  // API Supabase GET (lectura de tablas) → NetworkFirst, fallback 7 días
  if (PHOTO_HOST_RE.test(url.hostname) && SUPABASE_API_RE.test(url.pathname)) {
    event.respondWith(networkFirst(req, API_CACHE, TTL_SUPABASE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navegación cliente del App Router. Next.js NO hace peticiones con
  // `mode: "navigate"` al moverse entre secciones: pide el payload RSC con
  // `?_rsc=…` (o cabecera `RSC: 1`) mediante fetch normal. Sin cachear esto,
  // offline la shell existe pero cambiar de sección falla — que es justo el
  // síntoma de "no puedo navegar".
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(req, RSC_CACHE, TTL_SUPABASE));
    return;
  }

  // Imágenes optimizadas por Next (/_next/image?url=…) → CacheFirst.
  // No caen en /_next/static/, así que sin esto quedan rotas offline.
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Estáticos Next.js → CacheFirst (hash en nombre = inmutable)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // API propia GET (/api/verify, /api/reports) → NetworkFirst, fallback 24 h
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req, API_CACHE, TTL_OWN_API));
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
          // Cadena de respaldo: la propia ruta → la shell del panel → la raíz.
          // `caches.match` puede resolver a undefined, y devolver undefined
          // desde respondWith provoca un error de red: de ahí el último
          // recurso con una respuesta propia.
          const cached =
            (await caches.match(req)) ||
            (await caches.match("/dashboard")) ||
            (await caches.match("/"));
          if (cached) return cached;
          return new Response(
            "<!doctype html><meta charset='utf-8'><title>Sin conexión</title>" +
              "<body style=\"font-family:system-ui;background:#0b1220;color:#e6edf7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center\">" +
              "<div><h1 style='font-size:1.1rem;margin:0 0 .5rem'>Sin conexión</h1>" +
              "<p style='opacity:.7;font-size:.875rem;margin:0'>Esta sección aún no se había abierto con señal, así que no está guardada en el dispositivo.</p></div>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
  }
});

// ── Mensajes desde la app ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();

  // Tras sincronizar, la copia cacheada quedó desfasada. NO la borramos:
  // al ser NetworkFirst, estando online la siguiente lectura ya pide red y
  // sobrescribe la entrada sola. Borrarla dejaría al usuario sin respaldo si
  // pierde la señal justo después de sincronizar —que es lo normal en campo—
  // y tiraría por tierra la ventana offline de 7 días.
  if (event.data?.type === "INVALIDATE_API_CACHE") {
    // no-op intencionado (ver arriba)
  }
});

// ── Notificaciones push ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Si el payload no es JSON, se muestra un aviso genérico.
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Finca El Progreso";
  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: data.tag,
    data: { url: data.url || "/dashboard/alertas" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/alertas";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // Si ya hay una pestaña de la app, la enfoca (y navega si puede) en vez
      // de abrir una nueva.
      for (const w of wins) {
        if (w.url.includes(url) && "focus" in w) return w.focus();
      }
      const anyWin = wins.find((w) => "focus" in w);
      if (anyWin) {
        if ("navigate" in anyWin) anyWin.navigate(url).catch(() => {});
        return anyWin.focus();
      }
      return clients.openWindow(url);
    })
  );
});
