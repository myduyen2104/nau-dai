const CACHE = "fresh-shell-v14";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon.svg",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/data/recipe-image-manifest.json",
  "/data/source-recipe-image-manifest.json",
  "/data/cooking-tips.json",
  "/data/knorr/home-recommendations.json",
  "/data/mnnm/recent.json"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("fresh-shell-") && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    return existing ? existing.focus() : self.clients.openWindow(event.notification.data?.url || "/");
  }));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // External images caching (Cache-First with network fallback, never caching error responses)
  if (requestUrl.origin !== self.location.origin) {
    if (
      requestUrl.hostname.includes("monngonmoingay.com") ||
      requestUrl.hostname.includes("unileversolutions.com")
    ) {
      event.respondWith(
        caches.open("external-recipe-images-v1").then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          try {
            const response = await fetch(event.request);
            if (response.ok && response.status === 200) {
              await cache.put(event.request, response.clone());
            }
            return response;
          } catch {
            return Response.error();
          }
        })
      );
    }
    return;
  }

  if (requestUrl.pathname === "/data/youtube/catalog.json") {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => Response.error()));
    return;
  }
  if (
    requestUrl.pathname === "/data/recipe-image-manifest.json" ||
    requestUrl.pathname === "/data/source-recipe-image-manifest.json"
  ) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        return (await cache.match(event.request)) || Response.error();
      }
    }));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put("/", response.clone()));
      return response;
    }).catch(async () => (await caches.match("/")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => Response.error())));
});
