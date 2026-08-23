/* ===================================================
   IDENTIDAD DEL PRODUCTO

   Este es el único archivo del proyecto donde el nombre comercial está escrito.
   En ninguna otra parte del código —ni en una función, ni en un parámetro, ni en
   una clave, ni en un texto de pantalla— vuelve a aparecer. Cambiar el nombre es
   cambiar estas líneas y nada más.

   Cómo se usa en el texto visible: se escriben marcadores, y se resuelven al
   cargar la página.

       <h2>{{producto}} le facilita el acceso al cuidado</h2>
       <a href="mailto:{{contacto}}">Escribinos</a>

   Marcadores disponibles: {{producto}}, {{productoCorto}}, {{dominio}}, {{contacto}}.

   Hay una copia idéntica de este archivo en cada PWA, porque el service worker de
   cada una solo alcanza su propia carpeta. `scripts/verificar_identidad.mjs`
   comprueba que las tres sean iguales byte a byte, y falla si alguna se separó.
=================================================== */

const IDENTIDAD = {
  // --- Lo que cambia si cambia la marca -----------------------------------
  nombre: 'Careonys',
  nombreCorto: 'Careonys',
  dominio: 'careonys.com',
  contacto: 'contacto@careonys.com',

  // --- Lo que no cambia nunca ---------------------------------------------
  // Identificador técnico del producto. Está nombrado por función y no por
  // marca, a propósito: en cuanto un código así queda guardado en una fila, en
  // una clave de configuración o en una licencia, renombrarlo deja de ser un
  // cambio de nombre y pasa a ser una migración de datos. Una vez que la base
  // guarde este valor, esta línea no se toca aunque la marca cambie entera.
  codigo: 'plataforma',

  // Ruta del logotipo. El archivo tampoco lleva la marca en el nombre, por lo
  // mismo: cambiar la marca no puede obligar a renombrar archivos.
  logotipo: 'assets/images/logotipo.png'
};

const MARCADORES = {
  '{{producto}}': IDENTIDAD.nombre,
  '{{productoCorto}}': IDENTIDAD.nombreCorto,
  '{{dominio}}': IDENTIDAD.dominio,
  '{{contacto}}': IDENTIDAD.contacto
};

const Identidad = {
  datos: IDENTIDAD,

  // Reemplaza los marcadores de un texto. Devuelve el texto tal cual si no
  // tiene ninguno, que es el caso más común.
  aplicar(texto) {
    if (typeof texto !== 'string' || texto.indexOf('{{') === -1) return texto;
    let salida = texto;
    for (const marcador in MARCADORES) {
      if (salida.indexOf(marcador) !== -1) {
        salida = salida.split(marcador).join(MARCADORES[marcador]);
      }
    }
    return salida;
  },

  // Recorre el documento resolviendo los marcadores que hayan quedado en el
  // texto visible y en los atributos donde pueden aparecer. Se llama una vez,
  // al cargar. Si este archivo no llegara a cargar, los marcadores quedan a la
  // vista: es a propósito, un cartel roto se ve y un texto silenciosamente
  // equivocado no.
  aplicarEnDocumento(raiz) {
    const base = raiz || document;
    const ATRIBUTOS = ['href', 'src', 'alt', 'title', 'content', 'placeholder', 'aria-label'];

    const paseo = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, null);
    const pendientes = [];
    let nodo;
    while ((nodo = paseo.nextNode())) {
      if (nodo.nodeValue && nodo.nodeValue.indexOf('{{') !== -1) pendientes.push(nodo);
    }
    pendientes.forEach((n) => { n.nodeValue = this.aplicar(n.nodeValue); });

    base.querySelectorAll('*').forEach((el) => {
      ATRIBUTOS.forEach((attr) => {
        const valor = el.getAttribute && el.getAttribute(attr);
        if (valor && valor.indexOf('{{') !== -1) el.setAttribute(attr, this.aplicar(valor));
      });
    });

    if (base === document && document.title) document.title = this.aplicar(document.title);
  },

  // Verdadero cuando la Organización que se está mostrando es el producto mismo
  // y no una Prestadora cliente.
  esProductoPropio(organizacion) {
    return !!organizacion && organizacion.slug === IDENTIDAD.codigo;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Identidad.aplicarEnDocumento());
  } else {
    Identidad.aplicarEnDocumento();
  }
}

if (typeof window !== 'undefined') window.Identidad = Identidad;
if (typeof module !== 'undefined' && module.exports) module.exports = { IDENTIDAD, Identidad };
