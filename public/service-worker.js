// Enreach Unisex Salon PWA Service Worker - High Reliability & Safe Caching
const CACHE_NAME = 'enreach-salon-pos-v3';

const STATIC_ASSETS = [
  '/',
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
  '/salon-logo.jpg',
  '/salon-logo.png'
];

// Install: cache essential static assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache asset notice:', err);
      });
    })
  );
});

// Activate: clean up older caches and claim clients immediately
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

// Fetch: Strictly bypass Vite dev assets, modules, and API calls to prevent stale React chunk mismatches
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET, cloud APIs, and any internal Vite / dynamic module files
  if (
    request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/api/') ||
    url.search.includes('v=') ||
    url.search.includes('t=')
  ) {
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
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // For static branding assets: Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const contentType = response.headers.get('content-type') || '';
          if (
            contentType.includes('image') ||
            url.pathname.endsWith('.json') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
        }
        return response;
      });
    })
  );
});
