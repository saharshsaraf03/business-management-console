// Precache manifest injected by VitePWA (injectManifest strategy)
// Assigned but not used — manual STATIC_ASSETS list handles caching below
const _precacheManifest = self.__WB_MANIFEST; // eslint-disable-line no-unused-vars

const CACHE_NAME = 'mango-bm-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
