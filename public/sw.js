const CACHE = "fresh-shell-v11";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon.svg", "/favicon.ico", "/favicon-32x32.png", "/apple-touch-icon.png", "/pwa-192x192.png", "/pwa-512x512.png", "/pwa-maskable-512x512.png", "/data/recipe-image-manifest.json", "/data/canonical-recipe-id-aliases.json"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
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
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (new URL(event.request.url).pathname === "/data/youtube/catalog.json") {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => Response.error()));
    return;
  }
  if (new URL(event.request.url).pathname === "/data/recipe-image-manifest.json") {
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
  }).catch(() => caches.match("/"))));
});
