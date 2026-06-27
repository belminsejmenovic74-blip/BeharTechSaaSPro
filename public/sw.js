/* Behar Tech Pro — Service Worker
 * Stratégie : network-first avec fallback cache pour la navigation,
 * cache-first pour les assets statiques (icônes, manifest).
 * Cache versionné pour pouvoir invalider proprement.
 */

const VERSION = "behar-tech-pro-v7";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/assets/logos/app-icon-192.png",
  "/assets/logos/app-icon-512.png",
  "/assets/logos/logo-horizontal.jpg",
];

const DOCUMENT_ROUTE_PREFIXES = [
  "/api/documents/",
  "/api/public/documents/",
  "/api/repair-documents",
  "/documents/",
  "/document/",
  "/print/",
  "/download/",
  "/downloads/",
  "/telecharger/",
  "/qr-print/",
];

const FILE_ROUTE_PATTERN = /\.(?:pdf|csv|xlsx?|zip|png|jpe?g|webp|avif|svg)$/i;
const PUBLIC_TRACKING_DOCUMENT_PATTERN = /^\/suivi\/[^/]+\/documents(?:\/|$)/;

function isDocumentOrPrintRoute(url, request) {
  const pathname = url.pathname;
  if (DOCUMENT_ROUTE_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix))) {
    return true;
  }
  if (PUBLIC_TRACKING_DOCUMENT_PATTERN.test(pathname)) return true;
  if (FILE_ROUTE_PATTERN.test(pathname)) return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/pdf");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Ne pas intercepter les requêtes non-GET (POST, etc.) ni les schémas autres que http(s)
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Les documents, PDF, téléchargements et pages d'impression ne doivent jamais
  // passer dans le fallback PWA. Sinon le navigateur peut recevoir l'app HTML
  // (ou un JSON d'erreur) à la place du fichier imprimable.
  if (isDocumentOrPrintRoute(url, request)) return;

  // Next.js gère déjà ses chunks versionnés via HTTP. Les cacher ici peut
  // mélanger un ancien runtime avec de nouveaux modules après un rebuild.
  if (url.pathname.startsWith("/_next/")) return;

  // Navigation (HTML) : network-first, fallback cache, puis index minimal offline.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/dashboard/");
          if (fallback) return fallback;
          return new Response(
            "<!doctype html><meta charset='utf-8'><title>Hors ligne</title>" +
              "<body style='font-family:system-ui;padding:40px;background:#FFFFFF;color:#1A1916'>" +
              "<h1 style='color:#2A9D8F'>Behar Tech Pro</h1>" +
              "<p>Vous êtes hors ligne. Reconnectez-vous pour synchroniser.</p>",
            { headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Assets statiques applicatifs : cache-first
  if (request.destination === "image" || request.destination === "font" || url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone()).catch(() => undefined);
          }
          return fresh;
        } catch {
          return cached || new Response("", { status: 504 });
        }
      })(),
    );
    return;
  }

  // Default : network avec fallback cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r || new Response("", { status: 504 }))),
  );
});

// Permet à l'app de demander un skipWaiting (utile pour updates manuelles)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
