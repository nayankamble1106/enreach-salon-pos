// Enreach Unisex Salon PWA Service Worker
const CACHE_NAME = 'enreach-salon-pos-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon.ico',
  '/salon-logo.png'
];

// Install: cache essential assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API/Supabase calls, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests and Supabase API calls
  if (request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // Navigation requests: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Static assets: Cache-first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached and update cache in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok && (url.origin === self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
