/* ===================================================
   LAS PIEZAS VIEJAS, PEDIDAS UNA SOLA VEZ Y RECIÉN CUANDO HACEN FALTA

   La página suelta traía trece `<script>` en la cabecera y cada uno dejaba su
   nombre colgado del navegador: las zonas, la grilla de disponibilidad, las
   fichas del legajo, los documentos, las autorizaciones, los mensajes, la cola
   de fichadas y lo que decide qué contraseña vale. Esos archivos no se tocan
   —siguen siendo los mismos que usa la versión publicada— y siguen trabajando
   igual: se les pide un pedazo del documento y ellos lo llenan y lo leen.

   Lo que cambia es **cuándo llegan**. Pedidos arriba de todo viajarían siempre,
   incluso para quien sólo entra a mirar sus anuncios; pedidos acá adentro, la
   herramienta de armado los separa en paquetes aparte que viajan la primera vez
   que alguien abre la pantalla que los usa. Es la misma idea de la puerta a la
   base, aplicada a los archivos de antes.

   **Y se piden una sola vez.** La segunda pantalla que llame recibe lo que ya
   está cargado, no una segunda copia. Cada archivo deja su nombre en el
   navegador cuando termina de leerse, así que lo único que hay que hacer es
   esperarlo y devolver ese nombre: acá no se copia ni una línea de lo que
   hacen.

   **Las tres partes del producto piden las mismas piezas**, así que las puertas
   viven acá, una sola vez, y las abren el sitio, el programa del Asistente y el
   de la Familia. Pedirlas a mano dejaba el nombre del navegador a la vista de
   la pantalla, y una pieza que no llegó se veía igual que una que llegó vacía.

   **La dirección va escrita entera en cada función, y no es descuido.** La
   herramienta de armado necesita leer el nombre del archivo tal cual para
   reemplazar el atajo `#js` por la carpeta de verdad y armar el paquete; con
   una variable en el medio no puede, y el pedido llegaría al navegador con un
   nombre que él no sabe resolver. Lo único compartido es el recuerdo.
=================================================== */

/* Se recuerda el pedido, no el resultado, así dos pantallas que llamen a la vez
   comparten la misma espera en vez de disparar dos. Y se anota aparte lo que ya
   llegó, para poder preguntarlo sin pedirlo. */
const pedidos = {};
const llegados = {};

function unaSolaVez(cual, traer, nombre) {
  if (!pedidos[cual]) {
    pedidos[cual] = traer().then(() => {
      llegados[cual] = window[nombre];
      return llegados[cual];
    });
  }
  return pedidos[cual];
}

/** Las zonas donde el Asistente puede trabajar, con su pregunta y su lista. */
export function conLasZonas() {
  return unaSolaVez('zonas', () => import('#js/zonas.js'), 'Zonas');
}

/** La grilla de días y horas, y las preguntas que la acompañan. */
export function conLaDisponibilidad() {
  return unaSolaVez('disponibilidad', () => import('#js/disponibilidad.js'), 'Disponibilidad');
}

/** Las fichas que cada tipo de Asistente declara como propias. */
export function conLasFichas() {
  return unaSolaVez('fichas', () => import('#js/fichas-legajo.js'), 'FichasLegajo');
}

/** Los cuatro documentos que se adjuntan al legajo y adónde va cada uno. */
export function conLosDocumentos() {
  return unaSolaVez('documentos', () => import('#js/documentos-legajo.js'), 'DocumentosLegajo');
}

/** Los permisos que se piden al cerrar el legajo. */
export function conLasAutorizaciones() {
  return unaSolaVez('autorizaciones', () => import('#js/autorizaciones.js'), 'Autorizaciones');
}

/** La caja de mensajes entre la Familia y el Asistente. */
export function conLasConversaciones() {
  return unaSolaVez('conversaciones', () => import('#js/conversacion.js'), 'Conversaciones');
}

/** La caja de mensajes, pero solamente si ya llegó. Al salir de esa pantalla
    hay que pararle el reloj que pide mensajes nuevos, y eso no se le hace a una
    pieza que nunca se pidió: traerla para apagarla sería traerla justo cuando
    se la deja de usar. Devuelve nada mientras no se haya abierto nunca. */
export function lasConversacionesSiYaLlegaron() {
  return llegados.conversaciones || null;
}

/** La cola que guarda las fichadas en el teléfono cuando no hay señal. */
export function conLaCola() {
  return unaSolaVez('cola', () => import('#js/cola-fichadas.js'), 'ColaFichadas');
}

/** El largo mínimo de una contraseña y qué está mal, para las cuatro pantallas
    que piden una. */
export function conLaRevisionDeClaves() {
  return unaSolaVez('claves', () => import('#js/clave.js'), 'Clave');
}
