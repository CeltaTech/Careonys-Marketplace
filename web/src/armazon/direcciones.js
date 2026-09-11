/* ===================================================
   LAS DIRECCIONES QUE VIENEN ESCRITAS EN EL CATÁLOGO

   El catálogo guarda a dónde lleva cada servicio y con qué imagen se muestra, y
   los guarda como se escribían cuando cada pantalla era un archivo suelto:
   «solicitar-asistente.html#monitoreo» y «assets/images/algo.jpg». **Ese dato no
   se cambia**: está guardado, cada Prestadora tiene cargado el suyo, y lo que se
   guarda para siempre no se renombra.

   Así que se traduce al llegar, y se traduce en un solo lugar. Estaba escrito
   dos veces, una en cada pantalla que muestra la oferta, y las dos copias ya
   habían empezado a diferir: una sabía que «index» es la raíz y la otra no.
=================================================== */

/* Un destino del catálogo, dicho como ruta de acá adentro: se le saca el
   `.html` del final —sólo del final—, «index» es la raíz, y el ancla viaja
   pegada, que es lo que lleva a la sección correcta de la pantalla. */
export function aLaRuta(enlace) {
  const partes = String(enlace || '').split('#');
  const archivo = partes[0].replace(/\.html$/, '');
  const ruta = (!archivo || archivo === 'index') ? '/' : '/' + archivo;
  return partes[1] ? ruta + '#' + partes[1] : ruta;
}

/* Y una imagen del catálogo, igual: viene escrita relativa a la página que la
   pedía, y acá todas las vistas comparten una sola dirección, así que la única
   que sirve es la que empieza en la raíz. Lo que ya venga absoluto se deja
   como está, y lo que venga vacío sale vacío: una imagen sin dirección se dibuja
   sin el atributo, porque escribirlo en blanco hace que el navegador vuelva a
   pedir la página entera creyendo que ésa es la imagen. */
export function aLaImagen(camino) {
  const valor = String(camino || '');
  if (!valor) return undefined;
  if (/^(https?:)?\/\//.test(valor) || valor.charAt(0) === '/') return valor;
  return '/' + valor;
}
