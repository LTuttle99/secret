const CACHE = "datahub-platform-v11";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./datahub-icon.svg",
  "./hub-neon.css",
  "./tools/shared/platform.css",
  "./tools/shared/platform.js",
  "./tools/shared/theme.js",
  "./tools/studio/index.html",
  "./tools/studio/studio.css",
  "./tools/studio/source-guide.css",
  "./tools/studio/studio.js",
  "./tools/studio/intelligence.css",
  "./tools/studio/intelligence.js",
  "./tools/studio/analyst.css",
  "./tools/studio/analyst.js",
  "./tools/studio/collaboration.css",
  "./tools/studio/collaboration.js",
  "./tools/studio/operations.css",
  "./tools/studio/operations.js",
  "./tools/studio/experience.css",
  "./tools/studio/experience.js",
  "./tools/studio/neon.css",
  "./tools/studio/evidence.css",
  "./tools/studio/evidence.js"
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
