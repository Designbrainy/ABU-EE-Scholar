const CACHE_NAME = "ee-scholar-ai-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.webmanifest",
  "/assets/profile.jpg",
  "/assets/icon-192.png",
  "/assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache API calls or non-GET requests — always go to network.
  if (request.method !== "GET" || request.url.includes("/api/") || request.url.includes("/.netlify/functions/")) {
    return;
  }

  // Network-first strategy for app shell to prevent stale JS/CSS code in production
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
