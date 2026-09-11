/* ===================================================
   LA PUERTA A LA BASE Y A LA SESIÓN

   Es la hermana de `web/src/frases/lector.js`: el mismo «una sola puerta, sin
   copias», pero **diferida**, y la diferencia importa.

   **Por qué diferida.** Antes cada pantalla era un archivo suelto y decidía qué
   cargaba: de las quince, cuatro no cargaban nunca ni el acceso a datos ni la
   sesión, a propósito —son públicas y demostrativas, y no tienen por qué abrir
   una conexión contra la base ni tocar lo que quedó guardado de una sesión
   anterior—. Ahora las quince viven adentro de un solo programa, así que si
   esto se pidiera arriba de todo, con un `import` común, se cargaría **en las
   quince**, incluidas esas cuatro. Pedido acá adentro, en cambio, la
   herramienta de armado lo separa en un paquete aparte que sólo viaja cuando
   alguien abre la puerta. Las que no la abren siguen sin abrirla, igual que
   antes.

   **Qué hay del otro lado.** Los dos archivos de siempre, sin una línea
   copiada: el acceso a datos y la sesión. Se piden en ese orden porque el
   segundo se planta si el primero no está —de ahí sale la dirección de la
   base—, y esperar a cada uno garantiza el orden que antes garantizaban los
   dos `<script>` en la página.

   **Las dos cosas que antes ponía el navegador y ahora hay que poner acá.**

   1. **La biblioteca de la base.** Venía de una dirección de afuera, en un
      `<script>` por pantalla, y dejaba su nombre disponible para todos. Ahora
      viene declarada como dependencia del paquete, así que se la trae y se deja
      con **el mismo nombre**, que es lo que el archivo de sesión busca. Ganamos
      que ya no dependemos de que un servidor ajeno esté en pie para que alguien
      pueda entrar.
   2. **El arranque.** El acceso a datos resuelve la Prestadora «cuando la
      página terminó de cargar». En un programa de una sola página ese momento
      ya pasó hace rato cuando alguien abre la puerta, así que ese aviso no
      llega nunca más y hay que dispararlo acá. Se dispara igual que allá: sin
      esperarlo y sin avisar en pantalla, porque lo único que hace de visible es
      pintar los colores y el logotipo de la Prestadora, y quien de verdad la
      necesite la vuelve a pedir y ahí sí atrapa el fallo y lo dice.

   **Se abre una sola vez.** La segunda pantalla que la pida recibe la misma
   puerta ya abierta, no una segunda conexión.
=================================================== */

let abriendose = null;

async function abrir() {
  /* Con el mismo nombre que le daba el `<script>`: el archivo de sesión la
     busca así y no se lo toca. */
  window.supabase = await import('@supabase/supabase-js');

  await import('../../../js/apiClient.js');
  await import('../../../js/auth.js');

  /* Lo que antes disparaba «la página terminó de cargar». Ver arriba. */
  window.ClienteDatos.initTenant().catch((err) => {
    console.error('No se pudo resolver la Prestadora al arrancar:', err);
  });

  return {
    ClienteDatos: window.ClienteDatos,
    Sesion: window.Sesion,
    sb: window._sb
  };
}

/** Abre la puerta —o devuelve la que ya estaba abierta— y entrega las tres
    piezas de siempre: el acceso a datos, la sesión y la conexión directa. */
export function conLaBase() {
  if (!abriendose) abriendose = abrir();
  return abriendose;
}
