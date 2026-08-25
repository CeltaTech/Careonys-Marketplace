/* ===================================================
   TEXTO QUE ENTRA EN UNA PANTALLA SIN CONVERTIRSE EN CÓDIGO

   Cuando un dato se mete adentro de HTML —un nombre, una nota de un reporte, un
   mensaje de chat— deja de ser texto y pasa a ser marcado. Un nombre escrito así:

       <img src=x onerror=alert(document.cookie)>

   no se ve como un nombre: se ejecuta. Y se ejecuta en la pantalla de quien lo
   está leyendo, que en este proyecto suele ser el personal de la Prestadora —o
   sea, justo quien tiene los permisos— o una familia mirando los reportes de
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

   Es el único clasificador del proyecto, como pide la regla 7. Vivió un tiempo
   en `js/auth.js` con el nombre `Sesion.mensajeDeError` y se mudó acá porque un
   mensaje de error es texto y no es sesión, y porque `js/texto.js` lo cargan
   las catorce pantallas y `js/auth.js` no.

   Hay una copia idéntica de este archivo en cada PWA, porque el service worker
   de cada una solo alcanza su propia carpeta. `scripts/verificar_copias.mjs`
   comprueba que las tres sean iguales byte a byte.
=================================================== */

const Texto = {
  /**
   * Una fecha como se escribe acá: «12/08/2026». Entra lo que devuelve la base
   * —un texto con fecha y hora— y sale sólo el día. Sin fecha, o con algo que
   * no lo sea, devuelve la cadena vacía, para que la pantalla pueda no mostrar
   * nada en vez de mostrar «Invalid Date».
   */
  fechaCorta(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(fecha);
  },

  /**
   * La hora del reloj de acá: «14:05». Entra lo que devuelve la base, o un
   * `Date` hecho recién. Sin hora, o con algo que no lo sea, devuelve la cadena
   * vacía, por la misma razón que `fechaCorta`.
   */
  horaCorta(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit', minute: '2-digit'
    }).format(fecha);
  },

  /**
   * Un importe en pesos, con el punto de mil que se usa acá: 3500 → «$3.500».
   * Sin el número —o con algo que no lo sea— devuelve la cadena vacía, para que
   * la pantalla pueda decidir no mostrar nada en vez de mostrar «$NaN».
   */
  importe(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    const numero = Number(valor);
    if (!isFinite(numero)) return '';
    return '$' + new Intl.NumberFormat('es-AR').format(numero);
  },

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
   * la consola y nunca a la pantalla. El orden importa: lo específico primero,
   * porque «password» aparece también adentro de «invalid login credentials».
   */
  mensajeDeError(error, queSeIntentaba = '') {
    if (error) console.error(queSeIntentaba || 'Falla:', error);

    const crudo = String(
      (error && (error.message || error.error_description)) || ''
    ).toLowerCase();
    const dice = (...trozos) => trozos.some((trozo) => crudo.includes(trozo));

    // Ingreso y alta de cuenta.
    if (dice('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
    if (dice('email not confirmed')) return 'La cuenta existe, pero falta confirmar el correo. El enlace está en la casilla.';
    if (dice('already registered', 'already been registered')) return 'Ya hay una cuenta con ese correo. Se puede entrar desde la pantalla de acceso.';
    // El servidor tiene su propia idea de qué dirección es válida y rechaza
    // varias que parecen bien escritas —las terminadas en `.test`, por
    // ejemplo—. Va después del caso anterior a propósito: «ya registrada»
    // también nombra la dirección, y ahí lo que hay que decir es otra cosa.
    if (dice('email_address_invalid')
        || (crudo.includes('email address') && crudo.includes('is invalid'))) {
      return 'El servidor no acepta esa dirección de correo. Conviene revisar que esté bien escrita, o usar otra.';
    }
    if (dice('rate limit', 'too many')) return 'Hubo demasiados intentos seguidos. Conviene esperar unos minutos.';
    // Los enlaces que llegan por correo —confirmar el alta, elegir una
    // contraseña nueva— sirven una sola vez y vencen.
    if (dice('otp_expired', 'link is invalid', 'token has expired', 'token not found')) return 'El enlace del correo ya no sirve. Se puede pedir uno nuevo.';
    // Al elegir una contraseña nueva, el servidor rechaza la que ya se tenía.
    // Va antes que el caso general, que si no contestaría «elegir una más larga».
    if (dice('should be different')) return 'La contraseña nueva tiene que ser distinta de la anterior.';
    if (dice('password')) return 'La contraseña no cumple con lo que pide el servidor. Conviene elegir una más larga.';

    // Archivos del legajo.
    if (dice('maximum allowed size', 'payload too large')) return 'El archivo pesa demasiado. El límite es 10 MB para documentos y 5 MB para la foto.';
    if (dice('mime type', 'invalid_mime')) return 'Ese tipo de archivo no se acepta. Se admiten imágenes (JPG, PNG, WEBP) y PDF.';

    // Los cuatro avisos que puede devolver rendir_evaluacion (migración 0008).
    if (dice('sin_legajo')) return 'Para rendir hace falta tener el legajo cargado. Se completa desde «Mi Legajo».';
    if (dice('sin_intentos')) return 'Ya se usaron todos los intentos de esta evaluación.';
    if (dice('evaluacion_vacia', 'evaluacion_inexistente')) return 'Esta evaluación no está disponible en este momento.';

    // Publicar un aviso son dos pedidos: el aviso y sus franjas. Si el
    // segundo falla, el primero ya está hecho, y decir «no se pudo publicar»
    // llevaría a publicarla dos veces.
    if (dice('aviso_sin_franjas')) return 'El aviso quedó publicado, pero no se pudieron guardar los días y turnos en los que se necesita el cuidado. No hace falta publicarlo de nuevo.';

    // El directorio sin saber de qué Prestadora es. No se pide nada y se dice
    // por qué: mostrar «todas» sería mostrarle a una Familia el personal de una
    // Prestadora que no es la suya.
    if (dice('sin_prestadora')) return 'No se pudo saber de qué Prestadora es este directorio, así que no se muestra ninguno. Conviene entrar por el enlace de la Prestadora.';

    // La dirección nombró una Prestadora que no existe. Se dice que no se
    // encontró y no se muestra otra.
    if (dice('prestadora_desconocida')) return 'No se encontró ninguna Prestadora con ese nombre en la dirección, así que no hay directorio para mostrar. Conviene revisar el enlace.';

    // Lo genérico, que cubre cualquier tabla y cualquier pantalla.
    if (dice('failed to fetch', 'networkerror', 'err_internet', 'err_name_not_resolved')) return 'No hay conexión con el servidor. Conviene reintentar en un momento.';
    if (dice('session missing', 'session not found', 'session_not_found')) return 'La sesión ya no está abierta. Conviene volver a ingresar.';
    if (dice('row-level security', 'violates row', 'permission denied', 'unauthorized', 'not authorized', 'jwt') || /\b40[13]\b/.test(crudo)) return 'La sesión no tiene permiso para esta operación, o venció. Conviene volver a ingresar.';
    if (dice('duplicate key', 'already exists') || /\b409\b/.test(crudo)) return 'Ese dato ya estaba registrado.';
    if (dice('does not exist', 'not found') || /\b404\b/.test(crudo)) return 'No se encontró lo que se estaba buscando.';
    if (dice('invalid input', 'violates check constraint') || /\b4(00|22)\b/.test(crudo)) return 'Alguno de los datos enviados no es válido. Conviene revisar el formulario.';

    return 'No se pudo completar la operación. Si vuelve a pasar, conviene avisar al soporte.';
  }
};

if (typeof window !== 'undefined') window.Texto = Texto;
if (typeof module !== 'undefined' && module.exports) module.exports = { Texto };
