const CACHE_NAME = 'spiner-cache-v2'; // Increment version to force update
// Daftar file statis lokal
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache file statis utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Bersihkan cache lama jika ada update versi
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Strategi Caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const request = event.request;

  // 1. JANGAN Cache Request ke API (Supabase)
  if (url.hostname.includes('supabase.co')) {
    return; 
  }

  // 2. Handle Navigasi SPA (PENTING untuk PWA/Refresh)
  // Jika browser meminta navigasi halaman (HTML), kembalikan index.html dari cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 3. Cache Library Eksternal (Stale-While-Revalidate)
  if (url.hostname.includes('esm.sh') || 
      url.hostname.includes('tailwindcss.com') || 
      url.hostname.includes('googleapis.com') || 
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('googleusercontent.com')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // Swallow error if offline
          });
          return response || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Default Strategy: Network First, Fallback to Cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});