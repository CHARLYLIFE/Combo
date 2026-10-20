const CACHE_NAME = 'calyor-app-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './banner.png',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Carga recursos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de versiones antiguas
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
    })
  );
  self.clients.claim();
});

// Estrategia Stale-While-Revalidate & Fallback para Offline
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Manejo especial para las hojas de datos de Google Sheets
  if (requestUrl.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Si hay internet, guarda una copia limpia de los datos actualizados
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay internet (OFFLINE), lee los últimos datos guardados
          return caches.match(event.request);
        })
    );
    return;
  }

  // Manejo de archivos locales (HTML, imágenes, CSS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualiza la memoria en segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
