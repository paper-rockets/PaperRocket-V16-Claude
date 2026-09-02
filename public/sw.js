// Remix 3D Studio - Service Worker for PWA & Fast Updates
const CACHE_NAME = `remix3d-v14-${Date.now()}`;

const STATIC_PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/gh/google/draco@1.5.7/javascript/draco_encoder.js',
  'https://cdn.jsdelivr.net/gh/google/draco@1.5.7/javascript/draco_decoder.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Pre-caching notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests and skip chrome-extension / non-http schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Handle Vite HMR / live reload websocket or internal requests cleanly
  if (request.url.includes('/@vite/') || request.url.includes('/@react-refresh') || request.url.includes('hot-update')) {
    return;
  }

  // Network-First for HTML, Scripts, and Styles (Ensures tablet gets latest code immediately)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
