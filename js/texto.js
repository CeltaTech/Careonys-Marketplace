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

   `Texto.mensajeDeError` existe por la otra mitad del problema. La regla «un mensaje de error es texto visible»
   dice que lo que devuelven el
   navegador o la base nombra tablas, columnas y restricciones, y eso no se le
   muestra a nadie. Se clasifica el error, se muestra la frase que corresponde, y
   el texto técnico queda en la consola.

   Y son dos cosas separadas a propósito, porque son de dos clases distintas:
   `claveDeError` mira la falla y decide **de qué se trata**, que es lógica y
   vive acá; la frase que se lee sale de `data/catalogo-frases.json`, porque un
   mensaje de error es texto visible y se traduce a los tres idiomas como
   cualquier otro. Antes las frases estaban escritas en este archivo, en un solo
   idioma.

   Es el único clasificador del proyecto, como pide «ningún patrón repetido sin punto único de verdad». Vivió un tiempo
   en `js/auth.js` con el nombre `Sesion.mensajeDeError` y se mudó acá porque un
   mensaje de error es texto y no es sesión, y porque `js/texto.js` lo cargan
   las catorce pantallas y `js/auth.js` no.

   Hay una copia idéntica de este archivo en cada PWA, porque el service worker
   de cada una solo alcanza su propia carpeta. `scripts/verificar_copias.mjs`
   comprueba que las tres sean iguales byte a byte.
=================================================== */

/* De dónde sale el idioma con el que se le da forma a una fecha, a una hora o a
   un importe.

   Sale de `Catalogo`, que es donde se decide el idioma de todo lo demás: dos
   lugares que lo resuelvan por separado son una pantalla mitad en un idioma y
   mitad en otro. `js/catalogo.js` se carga después que este archivo, así que se
   pregunta al llamar y no al definir; si todavía no está —o si esto corre fuera
   del navegador, en una prueba— cae en el mismo idioma por omisión que usa
   `Catalogo`.

   Antes las tres funciones pedían `'es-AR'` escrito adentro, y con la pantalla
   en inglés eso decía cosas que no eran: «12/08/2026» es el 8 de diciembre en
   los Estados Unidos. */
const IDIOMA_DE_FORMA_POR_OMISION = 'es-AR';

function idiomaDeForma() {
  if (typeof window === 'undefined' || !window.Catalogo) return IDIOMA_DE_FORMA_POR_OMISION;
  return window.Catalogo.idioma || IDIOMA_DE_FORMA_POR_OMISION;
}

/* Con qué moneda se muestra un importe que no trae la suya.

   Desde la migración 0074 los importes guardados sí traen la suya:
   `caregivers.hourly_rate` viaja con `caregivers.moneda_valor_hora`, que nace
   con la moneda de la Prestadora y se queda quieta después. Así que este valor
   dejó de ser la fuente y pasó a ser el último recurso: lo usa lo que todavía
   no tiene un importe atrás —una maqueta, un número suelto— y lo usaría una
   fila vieja a la que le faltara la columna, que hoy no hay ninguna.

   Y no se lee de la Prestadora que está mirando, que sería lo cómodo y está
   mal: un importe se muestra con la moneda con la que se escribió. Si una
   Prestadora pasa de peso a dólar, los valores por hora ya cargados no cambian
   de número ni de unidad.

   No es el signo `$` escrito a mano, que era lo que había antes: es el código
   de la moneda, y cómo se escribe en cada idioma lo decide `Intl`. En castellano
   de acá sigue leyéndose «$ 4.500»; en inglés pasa a «ARS 4,500», que es lo que
   evita que un precio por hora se lea como cuatro dólares y medio. */
const MONEDA_POR_OMISION = 'ARS';

/* Una fecha sin hora —«2026-08-30», que es lo que devuelve una columna `date`—
   no tiene huso horario: es ese día acá y en cualquier parte. Pero
   `new Date('2026-08-30')` la lee como medianoche en Greenwich, y al escribirla
   con la hora de acá —tres horas atrás— queda el día anterior.

   Pasó el 30 de agosto de 2026, cargando desde la pantalla la fecha de revisión
   de una guía de cuidado: se guardó el 30 y la lista mostró «29/08/2026». Es de
   los errores que no se ven hasta que alguien tiene que responder por esa fecha,
   porque el número que sale es una fecha creíble.

   Por eso una fecha sin hora se arma a mano, con la hora de esta máquina, y sólo
   ésa: lo que trae hora es una marca de tiempo de la base, y ésa sí se convierte,
   que para eso trae el huso. */
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/* Hasta dónde se corta una clave calculada desde lo que escribió una persona.
   La columna no tiene tope —es `text`—, así que esto no es un límite de la base:
   es que una clave se lee en consultas, en registros y en avisos de error, y un
   renglón de doscientos caracteres ahí no lo lee nadie. Cuarenta alcanzan para
   `insuficiencia_renal_en_dialisis` y sobran. Lo que se ve en pantalla no se
   corta: eso es el texto, y va entero. */
const LARGO_DE_CLAVE = 40;

function fechaDeValor(valor) {
  const partes = typeof valor === 'string' ? valor.match(SOLO_FECHA) : null;
  const fecha = partes
    ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
    : new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

const Texto = {
  /**
   * Una fecha, escrita como se escribe en el idioma de la pantalla: «12/08/2026»
   * en castellano de acá, «08/12/2026» en inglés de los Estados Unidos. Entra lo
   * que devuelve la base —con hora o sin ella— y sale sólo el día. Sin fecha, o
   * con algo que no lo sea, devuelve la cadena vacía, para que la pantalla pueda
   * no mostrar nada en vez de mostrar «Invalid Date».
   */
  fechaCorta(valor) {
    if (!valor) return '';
    const fecha = fechaDeValor(valor);
    if (!fecha) return '';
    return new Intl.DateTimeFormat(idiomaDeForma(), {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(fecha);
  },

  /**
   * La hora, escrita como la escribe el idioma de la pantalla. Qué forma le toca
   * a cada uno lo decide `Intl`, no este archivo: al 26 de agosto de 2026 sale
   * «02:05 p. m.» en castellano de acá, «02:05 PM» en inglés y «14:05» en
   * portugués de Brasil. Entra lo que devuelve la base, o un
   * `Date` hecho recién. Sin hora, o con algo que no lo sea, devuelve la cadena
   * vacía, por la misma razón que `fechaCorta`.
   */
  horaCorta(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat(idiomaDeForma(), {
      hour: '2-digit', minute: '2-digit'
    }).format(fecha);
  },

  /**
   * Un importe con su moneda, escrito como lo escribe el idioma de la pantalla:
   * 3500 → «$ 3.500» en castellano de acá, «ARS 3,500» en inglés. La moneda
   * entra por parámetro y es la que el importe trae guardada al lado; cuando no
   * viene ninguna —o viene vacía, que es lo mismo— cae en `MONEDA_POR_OMISION`,
   * acá arriba. Sin el número —o con algo que no lo sea— devuelve la cadena
   * vacía, para que la pantalla pueda decidir no mostrar nada en vez de mostrar
   * «$NaN».
   */
  importe(valor, moneda) {
    if (valor === null || valor === undefined || valor === '') return '';
    // `moneda || …` y no un valor por omisión del parámetro: de la base la
    // columna llega como cadena vacía cuando no hay nada, y una cadena vacía no
    // es `undefined`, así que el valor por omisión no la agarraba e `Intl`
    // reventaba con «Invalid currency code».
    moneda = moneda || MONEDA_POR_OMISION;
    const numero = Number(valor);
    if (!isFinite(numero)) return '';
    // Sin decimales, que es como se venían mostrando estos precios: `Intl` les
    // pondría dos por ser una moneda, y «$ 4.500,00» dice lo mismo con más ruido.
    return new Intl.NumberFormat(idiomaDeForma(), {
      style: 'currency', currency: moneda, maximumFractionDigits: 0
    }).format(numero);
  },

  /**
   * De lo que se escribe a lo que se guarda. Entra el nombre que una persona
   * tecleó —«Esclerosis múltiple»— y sale la clave con la que esa opción va a
   * quedar guardada para siempre —`esclerosis_multiple`—, que es exactamente la
   * forma que ya usan las opciones cargadas por la migración 0040.
   *
   * Son dos capas distintas y por eso hay dos valores: **lo visible** puede
   * corregirse el día que la Prestadora quiera escribirlo mejor, y **lo
   * guardado** no cambia nunca, porque es lo que quedó escrito en cada legajo,
   * en cada aviso y en cada perfil que eligió esa opción. Renombrarlo sería una
   * migración de datos disfrazada de corrección de texto.
   *
   * Por eso también la clave se calcula una sola vez, al dar de alta: quien
   * llama no la vuelve a pedir cuando corrige el texto.
   *
   * Se le sacan las tildes antes de tirar lo que no sirve, para que «múltiple»
   * dé `multiple` y no `m_ltiple`. Y si de lo escrito no queda ninguna letra ni
   * ningún número —alguien escribió sólo signos— devuelve la cadena vacía, que
   * es la señal de que no hay clave posible: la base rechazaría la fila con un
   * error suyo, y quien llama puede decirlo antes y en el idioma de la pantalla.
   */
  claveDesde(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, LARGO_DE_CLAVE)
      .replace(/_+$/g, '');
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
    return this.frase(this.claveDeError(error, queSeIntentaba));
  },

  /**
   * Qué clase de falla fue. Devuelve una clave del catálogo de frases y no una
   * frase: **clasificar es lógica y la frase es texto visible**, y el texto
   * visible se traduce a los tres idiomas, así que no puede vivir acá.
   *
   * Está separado de `mensajeDeError` para poder probarlo: una prueba que le
   * pasa un error y espera una clave no se rompe el día que alguien mejora la
   * redacción, y así puede decir algo sobre la clasificación, que es lo que
   * esta función hace.
   *
   * El orden importa: lo específico primero, porque «password» aparece también
   * adentro de «invalid login credentials».
   */
  claveDeError(error, queSeIntentaba = '') {
    if (error) console.error(queSeIntentaba || 'Falla:', error);

    /* Si el error ya trae su clave puesta, se le cree y no se clasifica nada.
       Lo que sigue existe para adivinar de qué habla un texto crudo que escribió
       el servidor; un error que tira el propio producto no tiene que hacerse
       pasar por uno del servidor para que se lo entienda. Lo usa
       `Sesion.uploadFile`, que rechaza el archivo antes de subirlo. */
    if (error && typeof error.clave === 'string' && error.clave.indexOf('error.') === 0) {
      return error.clave;
    }

    const crudo = String(
      (error && (error.message || error.error_description)) || ''
    ).toLowerCase();
    const dice = (...trozos) => trozos.some((trozo) => crudo.includes(trozo));

    // Ingreso y alta de cuenta.
    if (dice('invalid login credentials')) return 'error.credenciales';
    if (dice('email not confirmed')) return 'error.correo_sin_confirmar';
    if (dice('already registered', 'already been registered')) return 'error.ya_registrado';
    // El servidor tiene su propia idea de qué dirección es válida y rechaza
    // varias que parecen bien escritas —las terminadas en `.test`, por
    // ejemplo—. Va después del caso anterior a propósito: «ya registrada»
    // también nombra la dirección, y ahí lo que hay que decir es otra cosa.
    if (dice('email_address_invalid')
        || (crudo.includes('email address') && crudo.includes('is invalid'))) {
      return 'error.correo_rechazado';
    }
    if (dice('rate limit', 'too many')) return 'error.demasiados_intentos';
    // Los enlaces que llegan por correo —confirmar el alta, elegir una
    // contraseña nueva— sirven una sola vez y vencen.
    if (dice('otp_expired', 'link is invalid', 'token has expired', 'token not found')) return 'error.enlace_vencido';
    // Al elegir una contraseña nueva, el servidor rechaza la que ya se tenía.
    // Va antes que el caso general, que si no contestaría «elegir una más larga».
    if (dice('should be different')) return 'error.clave_repetida';
    if (dice('password')) return 'error.clave_debil';

    // Archivos del legajo.
    if (dice('maximum allowed size', 'payload too large')) return 'error.archivo_pesado';
    if (dice('mime type', 'invalid_mime')) return 'error.archivo_tipo';

    // Los cuatro avisos que puede devolver rendir_evaluacion (migración 0008).
    if (dice('sin_legajo')) return 'error.sin_legajo';
    if (dice('sin_intentos')) return 'error.sin_intentos';
    if (dice('evaluacion_vacia', 'evaluacion_inexistente')) return 'error.evaluacion_no_disponible';

    // La tercera puerta, del lado del servidor (migración 0063). El
    // disparador contesta `contacto_bloqueado:<clave de la regla>`, y la clave
    // no se mira acá: el texto es uno solo para las cinco reglas. Decir cuál
    // fue sería enseñar a esquivarla —«probá sin los puntos»—, que es
    // exactamente lo contrario de para qué está la puerta.
    if (dice('contacto_bloqueado')) return 'error.contacto_bloqueado';

    // La puerta del alta (migración 0073). El disparador contesta
    // `alta_sin_papel:<clave>`, y la clave tampoco se mira acá: hoy es
    // siempre «dni», pero el mensaje no depende de cuál sea para no tener
    // que tocar este archivo el día que el catálogo agregue otro papel con
    // esta misma puerta.
    if (dice('alta_sin_papel')) return 'error.alta_sin_papel';

    // Publicar un aviso son dos pedidos: el aviso y sus franjas. Si el
    // segundo falla, el primero ya está hecho, y decir «no se pudo publicar»
    // llevaría a publicarla dos veces.
    if (dice('aviso_sin_franjas')) return 'error.aviso_sin_franjas';

    // El directorio sin saber de qué Prestadora es. No se pide nada y se dice
    // por qué: mostrar «todas» sería mostrarle a una Familia el personal de una
    // Prestadora que no es la suya.
    if (dice('sin_prestadora')) return 'error.sin_prestadora';

    // Lo mismo, pero en el alta (migración 0006). Ahí el disparador contesta
    // `prestadora_desconocida:alta` cuando el enlace no resuelve una Prestadora
    // activa, y va **antes** que el caso de abajo a propósito: la frase de aquél
    // habla del directorio, y acá no hay ningún directorio que mostrar sino una
    // cuenta que no se creó. Se reusa la frase que la pantalla del alta ya
    // escribe cuando no sabe de qué Prestadora es, en vez de escribir otra
    // igual: dice exactamente eso, y no distingue «no existe» de «está
    // suspendida», que es lo que no hay que contar.
    if (dice('prestadora_desconocida:alta')) return 'alta.sin_prestadora';

    // La dirección nombró una Prestadora que no existe. Se dice que no se
    // encontró y no se muestra otra.
    if (dice('prestadora_desconocida')) return 'error.prestadora_desconocida';

    // Lo genérico, que cubre cualquier tabla y cualquier pantalla.
    if (dice('failed to fetch', 'networkerror', 'err_internet', 'err_name_not_resolved')) return 'error.sin_conexion';
    if (dice('session missing', 'session not found', 'session_not_found')) return 'error.sesion_cerrada';
    if (dice('row-level security', 'violates row', 'permission denied', 'unauthorized', 'not authorized', 'jwt') || /\b40[13]\b/.test(crudo)) return 'error.sin_permiso';
    if (dice('duplicate key', 'already exists') || /\b409\b/.test(crudo)) return 'error.duplicado';
    if (dice('does not exist', 'not found') || /\b404\b/.test(crudo)) return 'error.no_encontrado';
    if (dice('invalid input', 'violates check constraint') || /\b4(00|22)\b/.test(crudo)) return 'error.datos_invalidos';

    return 'error.generico';
  },

  /**
   * El texto de una clave, en el idioma que corresponda. Es un atajo a
   * `Catalogo.frase` con una red abajo: **un mensaje de error no se puede
   * quedar sin decir nada**, así que cuando la clave no se resuelve —el
   * catálogo no llegó, o la pantalla no lo carga— cae en `error.generico`, que
   * está escrita adentro de `js/catalogo.js` con sus tres idiomas justamente
   * para este caso.
   *
   * Corriendo fuera del navegador no hay catálogo ni pantalla: ahí devuelve la
   * clave, que es lo que una prueba necesita ver.
   */
  frase(clave, huecos) {
    if (typeof window === 'undefined' || !window.Catalogo) return clave;
    return window.Catalogo.frase(clave, huecos)
      || window.Catalogo.frase('error.generico');
  }
};

if (typeof window !== 'undefined') window.Texto = Texto;
if (typeof module !== 'undefined' && module.exports) module.exports = { Texto };
