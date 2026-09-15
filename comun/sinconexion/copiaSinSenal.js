/* ===================================================
   LA COPIA QUE HACE QUE EL TELÉFONO FUNCIONE SIN SEÑAL

   Qué es. Lo que guarda el programa en el teléfono para que abra igual cuando
   no hay señal, y lo que decide qué se contesta desde lo guardado y qué se va a
   buscar. Estaba escrito dos veces, una en cada programa del teléfono, con las
   mismas tres reglas y hasta las mismas comas; lo único distinto entre las dos
   copias era el nombre con que cada una guarda y la lista de catálogos que
   nombra, y las dos cosas siguen viviendo en su programa.

   **Guardar es todo o nada.** Si uno solo de los archivos de la lista no está
   publicado, la copia entera no se hace, y eso se descubre recién cuando
   alguien se queda sin señal.

   **Lo que nunca se guarda, y es a propósito:** los pedidos que no son de
   lectura, todo lo que va contra la base, y las dos bibliotecas de afuera. Un
   pedido a la base contestado desde lo guardado sería un dato viejo mostrado
   como si fuera de ahora.

   **Primero lo guardado y después la red.** Lo que ya está guardado se contesta
   sin preguntar; lo que no, se va a buscar y se guarda si vino bien. Y si la
   red no contesta y lo que se pedía era la página, se devuelve la que está
   guardada, que es lo que hace que el programa abra sin señal.

   **Una sola copia por vez.** Al activarse se borra toda copia con otro nombre:
   el nombre es lo único que hace caducar lo guardado, y dejar la anterior al
   lado sería quedarse con las dos.
=================================================== */

/* Lo que no pasa por acá nunca. Se mira la dirección entera, que es lo que el
   navegador trae; alcanza con que nombre a alguno de estos. */
const NO_SE_GUARDA = [
  '/rest/v1/',            // lo que va contra la base
  'supabase.co',          // y todo lo demás que va al mismo lugar
  'fonts.googleapis.com', // las letras, que vienen de afuera
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com'  // los íconos, también de afuera
];

/**
 * @param nombreDeLaCopia Con qué nombre guarda este programa. Cambiarlo es lo
 *                        único que hace tirar lo guardado y volver a pedirlo.
 * @param guardados       Las direcciones que se guardan al instalar.
 */
export function copiaSinSenal(nombreDeLaCopia, guardados) {
  self.addEventListener('install', (evento) => {
    evento.waitUntil(
      caches.open(nombreDeLaCopia).then((copia) => copia.addAll(guardados))
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (evento) => {
    evento.waitUntil(
      caches.keys().then((nombres) => Promise.all(
        nombres.map((cual) => (cual === nombreDeLaCopia ? undefined : caches.delete(cual)))
      ))
    );
    self.clients.claim();
  });

  self.addEventListener('fetch', (evento) => {
    if (evento.request.method !== 'GET') return;
    if (NO_SE_GUARDA.some((cual) => evento.request.url.includes(cual))) return;

    evento.respondWith(
      caches.match(evento.request).then((guardado) => {
        if (guardado) return guardado;
        return fetch(evento.request).then((respuesta) => {
          /* Sólo lo que vino bien y se puede leer. Una respuesta opaca no deja
             saber si trae el archivo o el error de quien lo sirve. */
          if (respuesta && respuesta.status === 200 && respuesta.type !== 'opaque') {
            const copiaDeLaRespuesta = respuesta.clone();
            caches.open(nombreDeLaCopia)
              .then((copia) => copia.put(evento.request, copiaDeLaRespuesta));
          }
          return respuesta;
        }).catch(() => {
          /* Sin red: si lo que se pedía era la página, se devuelve la guardada.
             Cualquier otra cosa se deja fallar, que es lo que el navegador ya
             sabe mostrar. */
          if (evento.request.destination === 'document') return caches.match('./index.html');
          return undefined;
        });
      })
    );
  });
}
