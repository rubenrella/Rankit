/* RANK IT! — service worker. Generado en la compilación (no editar dist/sw.js a mano).
 *
 * Estrategia:
 *  - Instalación: descarga TODOS los archivos de la app (lista `PRECACHE`) saltándose la caché HTTP.
 *    Si alguno no llega como una respuesta 200 normal (p. ej. Cloudflare Access devolvió una redirección al
 *    login porque la sesión caducó) la instalación FALLA y se conserva la versión anterior: nunca se instala
 *    una app con la caché «envenenada» por una página de login.
 *  - Navegación: se sirve el shell desde la caché (la app abre sin conexión). `/?auth=1` va siempre a la red,
 *    para poder volver a pasar por el login de Access.
 *  - Archivos estáticos: caché primero (están todos precacheados; los nombres llevan hash del contenido).
 *  - NUNCA se guarda nada en caché en tiempo de ejecución, y no se toca: peticiones que no son GET, otros
 *    orígenes (página de login de Access), `/cdn-cgi/*` (endpoints de Access), `/version.json` y `/sw.js`.
 *  - Actualización: cada versión nueva cambia `sw.js` (por el hash), se instala en segundo plano, hace
 *    `skipWaiting` y `clients.claim`; la página avisa y recarga. Las cachés antiguas se borran al activar.
 */
const BUILD_ID = "119906e95b08";
const CACHE = "rankit-" + BUILD_ID;
const PRECACHE = [
  "/",
  "/assets/index-CPfKK0OB.js",
  "/assets/style-CPtPGtBx.css",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/manifest.webmanifest"
];

const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>RANK IT!</title><body style=\"font-family:-apple-system,system-ui,sans-serif;background:#0b0b12;color:#f5f5fa;" +
  'display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">' +
  "<div><h1>RANK IT!</h1><p>No se pudo cargar la app. Conéctate a internet y vuelve a abrirla.</p></div>";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await Promise.all(
          PRECACHE.map(async (url) => {
            const response = await fetch(new Request(url, { cache: "reload", credentials: "same-origin", redirect: "manual" }));
            if (response.type === "opaqueredirect" || response.redirected || !response.ok || response.status !== 200) {
              throw new Error("Precaché rechazado: " + url + " (" + response.status + ")");
            }
            if (url === "/" && !(response.headers.get("content-type") || "").includes("text/html")) {
              throw new Error("Precaché rechazado: el shell no es HTML");
            }
            await cache.put(url, response);
          }),
        );
      } catch (error) {
        // Instalación fallida: no se deja una caché a medias. La versión anterior sigue activa.
        await caches.delete(CACHE);
        throw error;
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("rankit-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/cdn-cgi/")) return;
  if (url.pathname === "/version.json" || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    if (url.searchParams.has("auth")) return;
    event.respondWith(shell(request));
    return;
  }
  if (PRECACHE.includes(url.pathname)) event.respondWith(fromCache(request, url.pathname));
});

async function shell(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match("/");
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch (e) {
    return new Response(OFFLINE_HTML, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
}

async function fromCache(request, pathname) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(pathname);
  if (cached) return cached;
  return fetch(request);
}
