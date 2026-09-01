/* ===================================================
   PWA de la Familia — Service Worker v4
   Corregido: Solo cachea assets dentro del scope /pwa-familia/
   Los assets de directorios padre (../css, ../js) NO pueden ser
   interceptados por este SW según la política de seguridad del navegador.
=================================================== */
const CACHE_NAME = 'familia-v35';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/styles-pwa.css',
  './js/identidad.js',
  './js/texto.js',
  './js/clave.js',
  './js/apiClient.js',
  './js/auth.js',
  './js/catalogo.js',
  './js/disponibilidad.js',
  './js/conversacion.js',
  './data/catalogo-vocabularios.json',
  './data/catalogo-disponibilidad.json',
  './data/catalogo-frases.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  // No interceptar peticiones POST/PATCH (Supabase REST API writes)
  if (event.request.method !== 'GET') return;
  // No interceptar llamadas a Supabase REST (necesitan red)
  if (event.request.url.includes('/rest/v1/') || event.request.url.includes('supabase.co')) return;
  // No interceptar fonts de Google (CDN externo)
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) return;
  // No interceptar Font Awesome (CDN externo)
  if (event.request.url.includes('cdnjs.cloudflare.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Solo cachear respuestas exitosas de assets locales
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline: devolver el index.html para navegación SPA
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
