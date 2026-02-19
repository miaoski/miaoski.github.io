// sw.js - Service Worker for offline support

const CACHE_NAME = 'lojban-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/css/style.css',
  '/manifest.json',
];

// Generate lesson URLs
const LESSON_URLS = [];
for (let week = 1; week <= 30; week++) {
  for (let day = 1; day <= 7; day++) {
    const id = `w${String(week).padStart(2, '0')}d${day}`;
    LESSON_URLS.push(`/lessons/${id}.json`);
  }
}

const ALL_ASSETS = [...STATIC_ASSETS, ...LESSON_URLS];

// Install - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching all assets...');
        return cache.addAll(ALL_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
            return response;
          });
      })
  );
});
