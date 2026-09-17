const CACHE = "datahub-platform-v6";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./datahub-icon.svg",
  "./tools/shared/platform.css",
  "./tools/shared/platform.js",
  "./tools/shared/theme.js",
  "./tools/studio/index.html",
  "./tools/studio/studio.css",
  "./tools/studio/source-guide.css",
  "./tools/studio/studio.js",
  "./tools/studio/intelligence.css",
  "./tools/studio/intelligence.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match("./index.html"))));
});
