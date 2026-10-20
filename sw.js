const CACHE_NAME = 'calyor-app-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './banner.png',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Guarda todos los archivos base en la memoria local
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Elimina versiones antiguas de la caché
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

// Intercepción de peticiones:
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Datos de Google Sheets: SIEMPRE buscar en la red primero para actualizar precios/productos
  if (requestUrl.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. Archivos estáticos e imágenes: CACHE-FIRST (Usa la memoria del teléfono directamente)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Devuelve directamente el archivo guardado localmente
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
