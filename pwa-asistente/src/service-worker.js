/* ===================================================
   EL QUE HACE QUE ESTO FUNCIONE SIN SEÑAL

   Es el mismo de siempre y hace lo mismo que hacía. Lo único que cambió es de
   dónde sale la lista de lo que guarda: antes estaba escrita a mano, archivo
   por archivo, y cada archivo nuevo había que acordarse de agregarlo —y si uno
   se olvidaba, el programa andaba perfecto hasta que alguien se quedaba sin
   señal—. Ahora la lista la escribe la herramienta de armado con lo que
   realmente armó, así que no puede faltar nada.

   Lo que sigue escrito a mano es lo que la herramienta no puede saber: **los
   catálogos**, que viven afuera de este programa porque los comparten los tres.

   **Lo que nunca se guarda, y es a propósito:** los pedidos que no son de
   lectura, todo lo que va contra la base, y las dos bibliotecas de afuera. Un
   pedido a la base contestado desde lo guardado sería un dato viejo mostrado
   como si fuera de ahora.

   **Y el número de versión se sube a mano cuando cambian los catálogos.** Es lo
   que hace que los teléfonos que ya tienen el programa instalado tiren lo
   guardado y lo vuelvan a pedir. Mientras el número no cambie, el teléfono se
   queda con lo que tenía, que es justamente lo que se busca el resto del tiempo.
=================================================== */

const CACHE_NAME = 'asistente-v83';

/* Lo que armó la herramienta, más lo que vive afuera de este programa. */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './data/catalogo-vocabularios.json',
  './data/catalogo-guias.json',
  './data/catalogo-disponibilidad.json',
  './data/catalogo-fichas.json',
  './data/catalogo-autorizaciones.json',
  './data/catalogo-frases.json',
  ...self.__WB_MANIFEST.map((entrada) => entrada.url)
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
