const CACHE = "datahub-platform-v16";
const TOOL_IDS = ["chart-builder","color-tools","column-stats","converter","dashboard-builder","data-analyzer","data-cleaner","data-generator","encode-decode","file-diff","fuzzy-dupes","instant-dashboard","json-formatter","jwt-decoder","lookup-merge","markdown-preview","pivot-explorer","qr-generator","regex-tester","sql-workbench","stat-tests","text-analyzer","text-diff","timestamp-converter","unit-converter"];
const SHARED_ASSETS = ["dashboard-data.js","dashboard-parse.js","dashboard-render.js","dashboard-spec.js","definitions-data.js","definitions.js","flatten.js","match.js","parse.js","profile.js","sanitize.js","sheet-connect.js","sheet-input.js","sql.js","stats.js","vanessa-knowledge.js","vanessa.js","workspace.js"];
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
  ,"./tools/studio/pulse.css"
  ,"./tools/studio/pulse.js"
  ,"./tools/code-helper/index.html"
  ,"./tools/code-helper/code-helper.css"
  ,"./tools/studio/command-center.css"
  ,"./tools/studio/command-center.js"
  ,"./tools/studio/portfolio.css"
  ,"./tools/studio/portfolio.js"
];
CORE.push(...TOOL_IDS.map(id => `./tools/${id}/index.html`), ...SHARED_ASSETS.map(name => `./tools/shared/${name}`));

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
