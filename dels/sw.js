// DELS : service worker (fonctionnement hors ligne). Généré par tools/build-dels.mjs
const VERSION = "dels-20261123-2877b163";
const ASSETS = ["./","./vendor/jspdf.umd.min.js","./fonts/inter-latin.woff2","./fonts/inter-latin-ext.woff2","./icons/icon.svg","./icons/icon-32.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-180.png","./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dels-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Hors ligne d'abord : l'appli s'ouvre instantanément, avec ou sans réseau.
// Les nouvelles versions arrivent par la mise à jour du service worker.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./", { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((res) => {
    if (res.ok && url.pathname.includes("/dels/")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
