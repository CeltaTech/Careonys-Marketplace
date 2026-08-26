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

   Marcadores disponibles: {{producto}}, {{productoCorto}}, {{dominio}},
   {{contacto}}, {{logotipo}} y {{organizacion}}.

   {{organizacion}} es distinto de los demás, y por eso está explicado aparte.
   Cada pantalla de este producto se muestra con el nombre y el logotipo de la
   Prestadora que se esté mirando. Cuál es se resuelve por la dirección —`?t=` o
   subdominio— y llega de la base, o sea después de que la pantalla ya se dibujó.
   Hasta que se sepa, lo que se ve es el producto, y eso no es un respaldo
   inventado: sin Prestadora resuelta, la pantalla es del producto. Por eso el
   marcador arranca valiendo el nombre del producto, y `resolverOrganizacion` lo
   vuelve a resolver cuando la Prestadora llega.

   Resolverlo dos veces obliga a acordarse de dónde estaba: una vez reemplazado,
   el marcador ya no está en la pantalla para volver a buscarlo. El paseo anota
   cada lugar junto con su texto original, y la segunda vuelta trabaja sobre esa
   anotación. Ésta es la razón por la que el nombre de una Prestadora no se
   escribe a mano en ninguna pantalla: escrito a mano, la única Prestadora que
   queda bien es la que se escribió.

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

// El nombre de la Organización que se está mostrando. Arranca valiendo el del
// producto, porque hasta que la Prestadora se resuelva la pantalla es del
// producto, y nunca queda vacío: un nombre vacío es un cartel en blanco.
let nombreOrganizacion = IDENTIDAD.nombre;

// Se resuelven por función y no por valor, porque uno de ellos cambia después de
// que la pantalla se dibujó.
const MARCADORES = {
  '{{producto}}': () => IDENTIDAD.nombre,
  '{{productoCorto}}': () => IDENTIDAD.nombreCorto,
  '{{dominio}}': () => IDENTIDAD.dominio,
  '{{contacto}}': () => IDENTIDAD.contacto,
  '{{logotipo}}': () => IDENTIDAD.logotipo,
  '{{organizacion}}': () => nombreOrganizacion
};

// Dónde había un {{organizacion}}, con el texto que tenía antes de resolverlo.
// Cada anotación es { nodo, atributo, original }: `atributo` en nulo quiere
// decir que era texto, y `nodo` en nulo, que era el título de la pantalla.
const anotados = [];

const VARIABLE = '{{organizacion}}';

const Identidad = {
  datos: IDENTIDAD,

  // Reemplaza los marcadores de un texto. Devuelve el texto tal cual si no
  // tiene ninguno, que es el caso más común.
  aplicar(texto) {
    if (typeof texto !== 'string' || texto.indexOf('{{') === -1) return texto;
    let salida = texto;
    for (const marcador in MARCADORES) {
      if (salida.indexOf(marcador) !== -1) {
        salida = salida.split(marcador).join(MARCADORES[marcador]());
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

    // El título se guarda antes de tocar nada. Escribir `document.title` cambia
    // el nodo de texto de <title> por otro, así que anotar ese nodo no sirve:
    // la anotación queda apuntando a un nodo que ya no está en la pantalla, y el
    // título se resuelve una sola vez. Por eso el título va aparte, y el paseo
    // por el texto lo saltea.
    const tituloOriginal = base === document ? document.title : null;

    const paseo = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, null);
    const pendientes = [];
    let nodo;
    while ((nodo = paseo.nextNode())) {
      if (nodo.parentNode && nodo.parentNode.nodeName === 'TITLE') continue;
      if (nodo.nodeValue && nodo.nodeValue.indexOf('{{') !== -1) pendientes.push(nodo);
    }
    pendientes.forEach((n) => {
      if (n.nodeValue.indexOf(VARIABLE) !== -1) {
        anotados.push({ nodo: n, atributo: null, original: n.nodeValue });
      }
      n.nodeValue = this.aplicar(n.nodeValue);
    });

    base.querySelectorAll('*').forEach((el) => {
      ATRIBUTOS.forEach((attr) => {
        const valor = el.getAttribute && el.getAttribute(attr);
        if (!valor || valor.indexOf('{{') === -1) return;
        if (valor.indexOf(VARIABLE) !== -1) {
          anotados.push({ nodo: el, atributo: attr, original: valor });
        }
        el.setAttribute(attr, this.aplicar(valor));
      });
    });

    if (tituloOriginal) {
      if (tituloOriginal.indexOf(VARIABLE) !== -1) {
        anotados.push({ nodo: null, atributo: null, original: tituloOriginal });
      }
      document.title = this.aplicar(tituloOriginal);
    }
  },

  // Vuelve a resolver {{organizacion}} en todo lo anotado. La llama el guion que
  // resuelve la Prestadora, con su nombre; sin nombre vuelve al del producto,
  // que es lo correcto cuando no hay ninguna Prestadora que mostrar.
  resolverOrganizacion(nombre) {
    const anterior = nombreOrganizacion;
    nombreOrganizacion = (typeof nombre === 'string' && nombre.trim()) || IDENTIDAD.nombre;
    if (nombreOrganizacion === anterior) return;

    anotados.forEach((a) => {
      const resuelto = this.aplicar(a.original);
      if (a.nodo === null) document.title = resuelto;
      else if (a.atributo === null) a.nodo.nodeValue = resuelto;
      else a.nodo.setAttribute(a.atributo, resuelto);
    });
  },

  // El nombre con el que hoy se está mostrando la pantalla.
  organizacion() {
    return nombreOrganizacion;
  },

  // Verdadero cuando la Organización que se está mostrando es el producto mismo
  // y no una Prestadora cliente.
  esProductoPropio(cual) {
    return !!cual && cual.slug === IDENTIDAD.codigo;
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
