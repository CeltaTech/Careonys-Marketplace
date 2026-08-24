/* ===================================================
   TEXTO QUE ENTRA EN UNA PANTALLA SIN CONVERTIRSE EN CÓDIGO

   Cuando un dato se mete adentro de HTML —un nombre, una nota de la bitácora, un
   mensaje de chat— deja de ser texto y pasa a ser marcado. Un nombre escrito así:

       <img src=x onerror=alert(document.cookie)>

   no se ve como un nombre: se ejecuta. Y se ejecuta en la pantalla de quien lo
   está leyendo, que en este proyecto suele ser el personal de la Prestadora —o
   sea, justo quien tiene los permisos— o una familia mirando el cuaderno de
   cuidado. El que escribe el dato elige qué corre en la máquina del que lo lee.

   `Texto.escapar` corta eso: convierte los cinco caracteres con los que se abre
   una etiqueta o se cierra un atributo en sus equivalentes inertes. Después de
   pasar por acá, el nombre de arriba se ve en la pantalla tal como se escribió,
   que es exactamente lo que se quería.

       elemento.innerHTML = `<h5>${Texto.escapar(persona.nombre)}</h5>`;
       elemento.innerHTML = `<img src="${Texto.escapar(persona.foto)}" />`;

   Sirve igual adentro de una etiqueta y adentro de un atributo, porque también
   escapa las comillas: sin eso, un dato que empiece con `" onerror="` se sale
   del atributo y agrega el suyo.

   **Cuándo no hace falta:** cuando el texto va a `textContent` en vez de a
   `innerHTML`. Esa vía nunca interpreta marcado, así que es la preferida y no
   necesita ninguna función. Escapar es para cuando hay que armar HTML de verdad.

   `Texto.mensajeDeError` existe por la otra mitad del problema. La regla 5.1 de
   `CLAUDE.md` dice que un mensaje de error es texto visible: lo que devuelven el
   navegador o la base nombra tablas, columnas y restricciones, y eso no se le
   muestra a nadie. Se clasifica el error, se muestra la frase que corresponde, y
   el texto técnico queda en la consola.

   Hay una copia idéntica de este archivo en cada PWA, porque el service worker
   de cada una solo alcanza su propia carpeta. `scripts/verificar_copias.mjs`
   comprueba que las tres sean iguales byte a byte.
=================================================== */

const Texto = {
  /** Devuelve el valor listo para entrar en HTML sin correr como HTML. */
  escapar(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Traduce una falla a una frase que se puede mostrar. El detalle técnico va a
   * la consola y nunca a la pantalla.
   */
  mensajeDeError(error, queSeIntentaba = '') {
    if (error) console.error(queSeIntentaba || 'Falla:', error);

    const crudo = String((error && (error.message || error.error_description)) || '');
    const sinRed = /Failed to fetch|NetworkError|ERR_INTERNET|ERR_NAME_NOT_RESOLVED/i;
    const sinPermiso = /\b401\b|\b403\b|JWT|permission denied|row-level security|not authorized/i;
    const noEsta = /\b404\b|does not exist|not found/i;
    const repetido = /duplicate key|already registered|already exists|\b409\b/i;
    const invalido = /\b400\b|\b422\b|invalid input|violates check constraint/i;

    if (sinRed.test(crudo)) return 'No hay conexión con el servidor. Conviene reintentar en un momento.';
    if (sinPermiso.test(crudo)) return 'La sesión no tiene permiso para esta operación, o venció. Conviene volver a ingresar.';
    if (repetido.test(crudo)) return 'Ese dato ya estaba registrado.';
    if (noEsta.test(crudo)) return 'No se encontró lo que se estaba buscando.';
    if (invalido.test(crudo)) return 'Alguno de los datos enviados no es válido. Conviene revisar el formulario.';
    return 'No se pudo completar la operación. Si vuelve a pasar, conviene avisar al soporte.';
  }
};

if (typeof window !== 'undefined') window.Texto = Texto;
if (typeof module !== 'undefined' && module.exports) module.exports = { Texto };
