/* ===================================================
   CATÁLOGO — las listas de opciones, en un solo lugar

   «Los catálogos salen de la base»: ninguna lista de opciones se escribe adentro
   de una pantalla. Antes cada
   formulario traía su propia lista de géneros, de zonas, de perfiles; eran
   veintiuna listas repartidas en nueve archivos y no coincidían entre sí.
   Ahora hay una sola, y las pantallas la piden.

   Cómo se usa: la pantalla no dibuja opciones, las declara.

       <select id="genero" data-catalogo="genero" data-catalogo-vacio="— Seleccionar —"></select>

       <div data-catalogo="patologia" data-catalogo-como="casillas"
            data-catalogo-nombre="patologias"></div>

   `data-catalogo-como` dice de qué forma se dibuja: `casillas` y `radios` para
   los grupos sueltos. Sin `data-catalogo-como` se dibuja un desplegable.

   Al cargar la página se resuelven todas de una vez, igual que los marcadores
   de `identidad.js`.

   Y ACÁ TAMBIÉN VIVE EL TEXTO DE LAS PANTALLAS
   El mismo reparto —la pantalla nombra, el catálogo contesta— rige para las
   frases sueltas, que son las que se traducen a los tres idiomas:

       <button data-frase="acceso.entrar">Entrar</button>
       <input data-frase-placeholder="acceso.correo_hueco" placeholder="…" />

   Están en `data/catalogo-frases.json`, y `scripts/verificar_frases.mjs` falla
   antes de cada `commit` si una clave no existe, si a una frase le falta un
   idioma, o si una pantalla ya convertida volvió a tener texto escrito a mano.

   El idioma es uno solo para las tres cosas —opciones, oferta y frases— y se
   decide en `idiomaDelEntorno()`, abajo. Tenerlo en un solo lugar es lo que
   evita la pantalla mitad en un idioma y mitad en otro.

   DE DÓNDE SALE HOY Y DE DÓNDE VA A SALIR MAÑANA
   El contenido está en `data/catalogo-vocabularios.json`. Su destino son las
   tablas de Careonys, no unas propias de este proyecto (`docs/MODULOS.md`, el
   renglón «Catálogo»), y eso no se puede hacer hasta la fusión. Mientras tanto,
   el único lugar que sabe de dónde sale el catálogo es `_traer()`, acá abajo:
   cuando pase a la base se cambia esa función y ninguna pantalla se entera.

   POR QUÉ FALLA FUERTE Y NO EN SILENCIO
   Una pantalla portada contra un catálogo vacío no da error: queda vacía, y
   nadie se entera hasta que alguien no encuentra su opción. Por eso, si un
   vocabulario falta o viene sin ítems, el desplegable muestra un aviso legible
   y el detalle técnico va a la consola. Un cartel roto se ve; una lista corta,
   no.

   Hay una copia idéntica de este archivo y del JSON en cada PWA, porque el
   service worker de cada una solo alcanza su propia carpeta.
   `scripts/verificar_copias.mjs` comprueba que sigan siendo iguales.
=================================================== */

(function () {
  'use strict';

  // ── EL IDIOMA ────────────────────────────────────────────────────────────
  // Uno solo para todo lo que se ve: las opciones de los vocabularios, las
  // fichas de la oferta y las frases de las pantallas. Tenerlo en un solo lugar
  // es lo que evita que la mitad de una pantalla quede en un idioma y la otra
  // mitad en otro.
  const IDIOMA_POR_DEFECTO = 'es-AR';
  const IDIOMAS = ['es-AR', 'en', 'pt-BR'];
  const DONDE_SE_GUARDA = 'idioma';

  // De qué idioma habla una etiqueta como `pt`, `pt-PT`, `en-GB` o `es-419`. Se
  // mira sólo la primera parte a propósito: quien tiene el navegador en
  // portugués de Portugal entiende el de Brasil mucho mejor que el castellano,
  // y quedarse con la coincidencia exacta lo mandaría al idioma por omisión.
  function cual(etiqueta) {
    const base = String(etiqueta || '').toLowerCase().split('-')[0];
    return IDIOMAS.filter((i) => i.toLowerCase().split('-')[0] === base)[0] || null;
  }

  // El orden es el de quién manda sobre quién: lo que la persona eligió a mano
  // pisa lo que declara el navegador, y el navegador pisa al valor por omisión.
  // La dirección (`?idioma=en`) va primera porque es la que sirve para mandarle
  // a alguien un enlace ya en su idioma, y para probar esto sin tocar nada.
  function idiomaDelEntorno() {
    try {
      const dela = cual(new URLSearchParams(window.location.search).get('idioma'));
      if (dela) return dela;
    } catch (e) { /* sin dirección legible, se sigue */ }
    try {
      const guardado = cual(window.localStorage.getItem(DONDE_SE_GUARDA));
      if (guardado) return guardado;
    } catch (e) { /* el navegador puede tener el depósito cerrado */ }
    const declarados = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language];
    for (let i = 0; i < declarados.length; i++) {
      const encontrado = cual(declarados[i]);
      if (encontrado) return encontrado;
    }
    return IDIOMA_POR_DEFECTO;
  }

  // LAS FRASES DE ARRANQUE, Y POR QUÉ ÉSTAS SÍ ESTÁN ESCRITAS ACÁ.
  // «Nunca hardcodear» manda, y estas cinco son la excepción que la regla
  // necesita para poder cumplirse: son exactamente las que hay que mostrar
  // **cuando el catálogo no llegó**. Sacarlas al archivo las dejaría adentro de
  // lo que se está avisando que falta, y la pantalla quedaría muda justo en el
  // único momento en que el aviso importa. Por eso son cinco y no seis, llevan
  // sus tres idiomas acá mismo, y `scripts/verificar_frases.mjs` comprueba que
  // ninguna de ellas esté además en `data/catalogo-frases.json`: una frase con
  // dos dueños se corrige en uno solo y nadie se entera.
  const ARRANQUE = {
    'catalogo.cargando': {
      'es-AR': 'Cargando opciones…',
      'en': 'Loading options…',
      'pt-BR': 'Carregando opções…'
    },
    'catalogo.error': {
      'es-AR': 'No se pudieron cargar las opciones',
      'en': 'The options could not be loaded',
      'pt-BR': 'Não foi possível carregar as opções'
    },
    'catalogo.vacio': {
      'es-AR': 'No hay opciones disponibles',
      'en': 'There are no options available',
      'pt-BR': 'Não há opções disponíveis'
    },
    'catalogo.sin_contenido': {
      'es-AR': 'Por ahora no hay nada para mostrar acá',
      'en': 'There is nothing to show here yet',
      'pt-BR': 'Por enquanto não há nada para mostrar aqui'
    },
    'error.generico': {
      'es-AR': 'No se pudo completar la operación. Si vuelve a pasar, conviene avisar al soporte.',
      'en': 'The operation could not be completed. If it happens again, it is worth telling support.',
      'pt-BR': 'Não foi possível concluir a operação. Se acontecer de novo, convém avisar o suporte.'
    }
  };

  let promesa = null;   // La carga en curso o ya hecha. Se pide una sola vez.
  let catalogo = null;  // Los vocabularios, una vez traídos.
  let promesaOferta = null;
  let oferta = null;    // Servicios y cursos.
  let promesaFrases = null;
  let frases = null;    // El texto visible de las pantallas.
  let promesaGuias = null;
  let guias = null;     // Las guías de cuidado, una vez traídas.

  // ── CUANDO UNA FRASE NO ESTÁ ───────────────────────────────────────
  // Falta una frase y hay que arreglarlo, así que se avisa. Pero el aviso dice
  // además **desde dónde se la pidió**, y no se repite.
  //
  // Las dos cosas salen de un caso real. La pantalla de alta del Asistente
  // escribía ocho veces al cargar «no existe la frase «null»», y con el mensaje
  // suelto no hubo manera de saber quién la pedía: el pendiente 101 estuvo
  // abierto por eso. Ocho renglones rojos iguales tampoco se leen —enseñan a no
  // mirar la consola, que es lo peor que puede hacer un aviso—.
  //
  // Y una clave nula o vacía no es lo mismo que una escrita mal. La primera es
  // de quien llama, que no le pasó ninguna; la segunda es una frase que falta
  // en el catálogo. Se arreglan en lugares distintos, así que el mensaje las
  // separa.
  //
  // Se avisa una vez por clave, no una por llamada: la misma clave pedida
  // veinte veces mientras se dibuja una lista es un solo problema. La pila que
  // se muestra es la del primer pedido.
  const yaAvisadas = {};

  function avisarFraseQueFalta(clave) {
    const cual = String(clave);
    if (yaAvisadas[cual]) return;
    yaAvisadas[cual] = true;
    const sinClave = clave === null || clave === undefined || clave === '';
    console.error(
      (sinClave
        ? 'Catálogo: se pidió una frase sin clave (' + cual + '). No falta la frase: falta que quien llama le pase una.'
        : 'Catálogo: no existe la frase «' + cual + '».') +
      '\nSe pidió desde:\n' + (new Error().stack || '(el navegador no dio la pila)'));
  }


  // La dirección del archivo se calcula desde la de este mismo guion. Así la
  // copia de cada PWA lee el JSON de su propia carpeta sin que nadie configure
  // nada, y una pantalla que viva en un subdirectorio tampoco se rompe.
  function direccionDelArchivo() {
    const guion = document.currentScript
      || Array.prototype.slice.call(document.querySelectorAll('script[src]'))
          .filter((s) => /(^|\/)catalogo\.js(\?|$)/.test(s.getAttribute('src') || ''))[0];
    const src = guion ? guion.src : 'js/catalogo.js';
    return function (nombre) {
      return src.replace(/js\/catalogo\.js(\?.*)?$/, 'data/' + nombre + '.json');
    };
  }

  const ARCHIVO = direccionDelArchivo();

  // ── DE DÓNDE SALE EL CATÁLOGO ────────────────────────────────────────
  // Desde la migración 0038 los vocabularios viven en tablas, y la verdad es la
  // base: `vocabularios_de` devuelve el catálogo general del producto más las
  // opciones que agregó esta Prestadora. Antes vivían en un archivo servido al
  // navegador, y eso significaba que agregar una opción exigía publicar una
  // versión nueva del sitio.
  //
  // **El archivo no desaparece: pasa a ser una copia generada.** Los dos
  // programas para el teléfono lo guardan para funcionar sin conexión
  // (`service-worker.js`), así que sigue estando y sigue haciendo falta. Lo
  // genera `scripts/generar_vocabularios.mjs` desde la base, y una comprobación
  // rompe la construcción si los dos se despegaron. Es el mismo trato que le da
  // Careonys a su código repetido.
  //
  // Así que acá hay un orden y no dos fuentes: primero la base, y el archivo
  // sólo cuando la base no contesta —sin conexión, o en las tres pantallas que
  // ni siquiera cargan `apiClient.js`—. Al revés sería peor de lo que parece:
  // la pantalla mostraría opciones viejas sin que nadie se entere.
  async function _traer() {
    const desdeLaBase = await _traerDeLaBase();
    if (desdeLaBase) return desdeLaBase;
    return await _traerDelArchivo();
  }

  // Devuelve `null` —no tira— cuando la base no está al alcance, porque eso no
  // es un error: es el caso sin conexión, y para eso está el archivo.
  async function _traerDeLaBase() {
    const cliente = window.ClienteDatos;
    if (!cliente || typeof cliente.vocabulariosDePrestadora !== 'function') return null;
    try {
      const vocabularios = await cliente.vocabulariosDePrestadora();
      if (!vocabularios || typeof vocabularios !== 'object') return null;
      if (Object.keys(vocabularios).length === 0) return null;
      return vocabularios;
    } catch (e) {
      return null;
    }
  }

  async function _traerDelArchivo() {
    const respuesta = await fetch(ARCHIVO('catalogo-vocabularios'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('El catálogo respondió ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.vocabularios) throw new Error('El catálogo no tiene vocabularios');
    return datos.vocabularios;
  }

  // La oferta llega de dos lugares, y eso no es una etapa a medias: es el
  // estado real de cada mitad. Los cursos ya tienen tabla —migración 0008,
  // vista desde la 0051— y los nueve ítems de `data-oferta="servicios"`
  // —Busco Asistente, Cursos, Monitoreo, etc.— tienen la suya desde la 0072
  // (tabla `oferta_comercial`, vista `oferta_comercial_publica`). El archivo
  // sigue siendo el respaldo: si la base no está al alcance, lo que trae él
  // es lo que se ve.
  async function _traerOferta() {
    const respuesta = await fetch(ARCHIVO('catalogo-oferta'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('La oferta respondió ' + respuesta.status);
    const datos = await respuesta.json();
    const cursos = await _traerCursosDeLaBase();
    if (cursos) datos.cursos = cursos;
    const servicios = await _traerOfertaComercialDeLaBase();
    if (servicios) datos.servicios = servicios;
    return datos;
  }

  // Devuelve `null` —no tira— cuando la base no está al alcance, con el mismo
  // criterio que `_traerDeLaBase()`: sin conexión, o en una pantalla que ni
  // siquiera carga `apiClient.js`, la copia del archivo sigue sirviendo. Y lo
  // que nunca sale de acá es el contenido de los cursos: la vista
  // `oferta_de_cursos` publica la oferta y nada más.
  async function _traerCursosDeLaBase() {
    const cliente = window.ClienteDatos;
    if (!cliente || typeof cliente.ofertaDeCursos !== 'function') return null;
    try {
      const cursos = await cliente.ofertaDeCursos();
      if (!Array.isArray(cursos) || cursos.length === 0) return null;
      return cursos;
    } catch (e) {
      return null;
    }
  }

  // Igual que `_traerCursosDeLaBase()`, para la vista `oferta_comercial_publica`.
  // La clave que se sobreescribe (`servicios`) es la que ya lee
  // `data-oferta="servicios"` en las pantallas; adentro de la base la tabla se
  // llama `oferta_comercial` para no chocar con «Servicio» del glosario
  // compartido, que es prestación directa y esto no lo es.
  async function _traerOfertaComercialDeLaBase() {
    const cliente = window.ClienteDatos;
    if (!cliente || typeof cliente.ofertaComercial !== 'function') return null;
    try {
      const servicios = await cliente.ofertaComercial();
      if (!Array.isArray(servicios) || servicios.length === 0) return null;
      return servicios;
    } catch (e) {
      return null;
    }
  }

  async function _traerFrases() {
    const respuesta = await fetch(ARCHIVO('catalogo-frases'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('Las frases respondieron ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.frases) throw new Error('El catálogo de frases no tiene frases');
    return datos.frases;
  }

  // ── LAS GUÍAS DE CUIDADO ─────────────────────────────────────────────
  // Mismo orden que los vocabularios —primero la base, el archivo sólo cuando
  // no contesta— y mismo archivo generado (`scripts/generar_guias.mjs`,
  // migración 0041). Con una diferencia a propósito: acá **un objeto vacío no
  // es una falla de la base**, es la guía general esperando que el
  // Desarrollador revise cada una antes de publicarla (pendiente 104). Tratar
  // ese vacío como si la base no hubiera contestado escondería el archivo sin
  // conexión aun con la base arriba y respondiendo bien.
  async function _traerGuias() {
    const desdeLaBase = await _traerGuiasDeLaBase();
    if (desdeLaBase) return desdeLaBase;
    return await _traerGuiasDelArchivo();
  }

  async function _traerGuiasDeLaBase() {
    const cliente = window.ClienteDatos;
    if (!cliente || typeof cliente.guiasDePrestadora !== 'function') return null;
    try {
      const guias = await cliente.guiasDePrestadora();
      if (!guias || typeof guias !== 'object') return null;
      return guias;
    } catch (e) {
      return null;
    }
  }

  async function _traerGuiasDelArchivo() {
    const respuesta = await fetch(ARCHIVO('catalogo-guias'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('Las guías respondieron ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.guias) throw new Error('El catálogo no tiene guías');
    return datos.guias;
  }

  const Catalogo = {

    idioma: idiomaDelEntorno(),
    idiomas: IDIOMAS.slice(),

    // Trae el catálogo una sola vez por página, aunque lo pidan diez veces.
    cargar() {
      if (!promesa) {
        promesa = _traer().then((v) => { catalogo = v; return v; });
      }
      return promesa;
    },

    // ── LAS FRASES DE LAS PANTALLAS ──────────────────────────────────────
    // «i18n desde el día uno». Ninguna frase que una persona lea está
    // escrita adentro de una pantalla: la pantalla nombra una clave y el texto
    // sale de `data/catalogo-frases.json`, que es el mismo reparto que ya rige
    // para las opciones de los vocabularios.
    //
    //     <button data-frase="acceso.entrar">Entrar</button>
    //     <input data-frase-placeholder="acceso.correo_hueco" placeholder="…" />
    //     <title data-frase="acceso.titulo">Acceso</title>
    //
    // Lo escrito adentro queda y es lo que se ve mientras el archivo viaja,
    // igual que hoy con la marca. Y si el archivo no llegara, **eso es lo que
    // queda**: la pantalla se ve en castellano, que es peor que en el idioma
    // que se pidió y muchísimo mejor que en blanco.

    cargarFrases() {
      if (!promesaFrases) {
        promesaFrases = _traerFrases().then((f) => { frases = f; return f; });
      }
      return promesaFrases;
    },

    // Las guías de cuidado, general más la propia de la Prestadora si hay
    // conexión; sólo la general si no la hay (pendiente 102).
    cargarGuias() {
      if (!promesaGuias) {
        promesaGuias = _traerGuias().then((g) => { guias = g; return g; });
      }
      return promesaGuias;
    },

    // El texto de una clave, ya listo para mostrar. Los huecos se escriben
    // entre llaves simples en el catálogo y se pasan acá:
    //
    //     Catalogo.frase('examen.intentos', { cuantos: 3 })
    //
    // Se rellena la frase entera y no se la parte en pedazos: cada idioma
    // ordena distinto, y «Quedan 3 intentos» armado con tres cachos sale mal en
    // cuanto el verbo cambia de lugar.
    //
    // No espera nada, porque se la llama mientras se dibuja. Si la clave no
    // está —el archivo no llegó, o alguien la escribió mal— devuelve la cadena
    // vacía y avisa por consola; quien la llamó decide qué hacer con el hueco. El
    // aviso nombra a quien pidió la frase, y no se repite: `avisarFraseQueFalta`,
    // más arriba, cuenta por qué.
    frase(clave, huecos) {
      const traducciones = (frases && frases[clave]) || ARRANQUE[clave];
      if (!traducciones) {
        avisarFraseQueFalta(clave);
        return '';
      }
      let texto = traducciones[this.idioma] || traducciones[IDIOMA_POR_DEFECTO] || '';
      if (huecos) {
        for (const nombre in huecos) {
          texto = texto.split('{' + nombre + '}').join(String(huecos[nombre]));
        }
      }
      return window.Identidad ? window.Identidad.aplicar(texto) : texto;
    },

    // Cambia el idioma y vuelve a escribir la pantalla, sin recargarla. Se
    // guarda la elección para las próximas visitas; si el navegador tiene el
    // depósito cerrado, el cambio vale igual para esta pantalla.
    async cambiarIdioma(nuevo) {
      const elegido = cual(nuevo);
      if (!elegido || elegido === this.idioma) return;
      this.idioma = elegido;
      try { window.localStorage.setItem(DONDE_SE_GUARDA, elegido); } catch (e) { /* depósito cerrado */ }
      await this.aplicarEnDocumento();
    },

    // El texto de un ítem en el idioma que corresponde. Si falta la traducción
    // se cae al es-AR: mejor la frase en otro idioma que un desplegable en
    // blanco.
    texto(item) {
      if (!item) return '';
      return this.textoDe(item) || item.clave || '';
    },

    // El mismo criterio de idioma, para un texto que cuelga del ítem en vez de
    // estar en su raíz: `"bajada": { "es-AR": "Baño, cambio de pañales" }`. Lo
    // usan las guías y los cursos, que traen así su nombre y su descripción.
    textoDe(traducciones) {
      if (!traducciones) return '';
      return traducciones[this.idioma] || traducciones[IDIOMA_POR_DEFECTO] || '';
    },

    // Los ítems de un vocabulario. Requiere haber llamado a `cargar()`.
    items(clave) {
      if (!catalogo) throw new Error('El catálogo todavía no se cargó');
      const vocabulario = catalogo[clave];
      if (!vocabulario) throw new Error('No existe el vocabulario «' + clave + '»');
      return vocabulario.items || [];
    },

    // Traduce un valor guardado a su texto, sin quejarse si la clave no está en
    // ese vocabulario: devuelve la cadena vacía. Sirve para mostrar lo que se
    // leyó de la base —en la fila está `monotributo_social` y la persona tiene
    // que leer «Monotributo social»—, y no hace esperar a quien está dibujando
    // una tarjeta. Devolver vacío es lo que necesita quien busca la misma clave
    // en varias listas, que es el caso de abajo.
    etiquetaSiExiste(vocabulario, clave) {
      if (!catalogo || !catalogo[vocabulario] || !clave) return '';
      const item = (catalogo[vocabulario].items || []).filter((i) => i.clave === clave)[0];
      return item ? this.texto(item) : '';
    },

    // Una fila de la base trae las tareas en una sola lista, pero el catálogo
    // las tiene repartidas en tres vocabularios —cuidado, hogar y
    // acompañamiento—, así que se busca en los tres, en orden. Si no aparece en
    // ninguno se devuelve la clave tal cual: es preferible a dejar el hueco.
    //
    // Vivía escrita adentro de `directorio.html`. Subió acá cuando `perfil.html`
    // necesitó lo mismo, para no tener la traducción dos veces («ningún patrón repetido sin punto único de verdad»).
    etiquetaDeTarea(clave) {
      const donde = ['tarea_cuidado', 'tarea_hogar', 'tarea_acompanamiento'];
      for (let i = 0; i < donde.length; i++) {
        const texto = this.etiquetaSiExiste(donde[i], clave);
        if (texto) return texto;
      }
      return clave || '';
    },

    // ── La oferta: servicios y cursos ────────────────────────────────────
    // No son listas de opciones sino tarjetas, así que la pantalla declara el
    // molde —un `<template>`— y acá se rellena uno por cada cosa del catálogo.
    // El diseño sigue viviendo en el HTML y el contenido en el catálogo, que es
    // el reparto que pide «los catálogos salen de la base».

    cargarOferta() {
      if (!promesaOferta) {
        promesaOferta = _traerOferta().then((o) => { oferta = o; return o; });
      }
      return promesaOferta;
    },

    _rellenar(nodo, item) {
      // El texto del catálogo puede traer marcadores de marca ({{producto}}).
      // `identidad.js` ya pasó por el documento antes de que llegara este
      // archivo, así que acá se resuelven de nuevo sobre lo recién dibujado.
      const marca = (t) => (window.Identidad ? window.Identidad.aplicar(t) : t);
      // Lo que depende de un dato que este ítem no tiene, no se dibuja: un curso
      // sin certificado no muestra el sello vacío, lo muestra ninguno.
      nodo.querySelectorAll('[data-si]').forEach((el) => {
        if (!this.campo(item, el.getAttribute('data-si'))) el.remove();
      });
      nodo.querySelectorAll('[data-campo]').forEach((el) => {
        el.textContent = marca(this.campo(item, el.getAttribute('data-campo')));
      });
      nodo.querySelectorAll('*').forEach((el) => {
        Array.prototype.slice.call(el.attributes).forEach((a) => {
          if (a.name.indexOf('data-attr-') !== 0) return;
          const valor = this.campo(item, a.value);
          if (valor) el.setAttribute(a.name.slice(10), marca(valor));
        });
      });
    },

    // El valor de un campo. `nombre` es el texto visible y pasa por el idioma,
    // igual que en `texto()`; los demás se toman tal cual.
    campo(item, nombre) {
      if (nombre === 'nombre') return this.texto(item);
      // `modalidad@modalidad_curso` guarda «online» y muestra «Online»: el
      // valor sale del ítem y el texto, del vocabulario que se nombra después
      // de la arroba. Sin él habría que escribir la traducción en la pantalla,
      // que es justo lo que «los catálogos salen de la base» no quiere.
      const arroba = nombre.indexOf('@');
      const clave = arroba === -1 ? nombre : nombre.slice(0, arroba);
      const valor = clave === 'nombre' ? this.texto(item) : item[clave];
      if (valor === undefined || valor === null || valor === false) return '';
      // Un campo que trae sus tres idiomas colgando —`{ "es-AR": …, "en": … }`—
      // pasa por el mismo criterio que el nombre. Sin esto, `descripcion` y
      // `etiqueta` se dibujaban con `String(objeto)`, o sea «[object Object]»,
      // el día que dejaran de ser una cadena suelta. Hoy todavía lo son.
      if (typeof valor === 'object') {
        const traducido = this.textoDe(valor);
        return arroba === -1 ? traducido : this._etiquetaYaCargada(nombre.slice(arroba + 1), traducido);
      }
      if (arroba === -1) return String(valor);
      return this._etiquetaYaCargada(nombre.slice(arroba + 1), String(valor));
    },

    // La versión de `etiqueta()` que no espera. Se usa mientras se dibuja una
    // tarjeta, donde ya no se puede esperar a nada; si el vocabulario no está
    // cargado devuelve el valor crudo y avisa, en vez de dejar el hueco.
    _etiquetaYaCargada(vocabulario, valor) {
      if (!catalogo || !catalogo[vocabulario]) {
        console.error('Catálogo: se pidió el texto de «' + valor + '» en el vocabulario «'
          + vocabulario + '», que no está cargado.');
        return valor;
      }
      const item = (catalogo[vocabulario].items || []).filter((i) => i.clave === valor)[0];
      return item ? this.texto(item) : valor;
    },

    _llenarOferta(contenedor) {
      const cual = contenedor.getAttribute('data-oferta');
      const lista = (oferta && oferta[cual]) || [];
      if (!lista.length) {
        console.error('Catálogo: la oferta «' + cual + '» está vacía.');
        this._avisarEnOferta(contenedor, this.frase('catalogo.sin_contenido'));
        return;
      }
      const solo = (contenedor.getAttribute('data-oferta-solo') || '')
        .split(',').map((c) => c.trim()).filter(Boolean);

      const elegidos = solo.length
        ? solo.map((c) => lista.filter((i) => i.clave === c)[0]).filter(Boolean)
        : lista;
      // Sólo se reclama cuando se pidieron claves. Sin este `solo.length` la
      // comparación daba distinto siempre que la pantalla no pidiera ninguna
      // —cero contra los cinco que trae la lista— y avisaba de claves faltantes
      // con la lista de faltantes vacía: un error rojo en la consola que no
      // señalaba nada, en toda pantalla que dibuja la oferta entera.
      if (solo.length && solo.length !== elegidos.length) {
        console.error('Catálogo: «' + cual + '» no tiene todas las claves pedidas: '
          + solo.filter((c) => !lista.some((i) => i.clave === c)).join(', '));
      }

      /* Un desplegable no se arma con moldes, y además no puede: el navegador
         descarta todo lo que no sea `<option>` adentro de un `<select>` al leer
         la página, así que el `<template>` escrito ahí no llega nunca al
         documento. Eso dejaba el desplegable de cursos clavado en «Cargando las
         opciones…» y, como es obligatorio, el formulario de `cursos.html` no se
         podía enviar. Una opción es una clave y una etiqueta, que es justo lo
         que ya sabe armar el mismo desplegable de los vocabularios. */
      if (contenedor.tagName === 'SELECT') {
        this._llenarSelect(contenedor, elegidos);
        return;
      }

      const moldes = Array.prototype.slice.call(contenedor.querySelectorAll(':scope > template'));
      if (!moldes.length) {
        console.error('Catálogo: «' + cual + '» no declara ningún <template>.');
        return;
      }
      // Ninguna de las claves pedidas existe. Sin esto la grilla queda vacía y
      // muda: el molde ya se sacó y no entra nada en su lugar.
      if (!elegidos.length) {
        this._avisarEnOferta(contenedor, this.frase('catalogo.sin_contenido'));
        return;
      }

      moldes.forEach((m) => m.remove());
      elegidos.forEach((item) => {
        // Un molde por estado cuando la pantalla declara más de uno: lo que
        // todavía no salió no se dibuja igual que lo que ya está disponible.
        const molde = moldes.filter((m) => m.getAttribute('data-para') === item.estado)[0]
          || moldes.filter((m) => !m.hasAttribute('data-para'))[0]
          || moldes[0];
        const copia = document.importNode(molde.content, true);
        this._rellenar(copia, item);
        contenedor.appendChild(copia);
      });
      if (window.Identidad) window.Identidad.aplicarEnDocumento(contenedor);
      /* Lo que cuelga de un `<template>` no está en el documento, así que la
         traducción de arranque no lo alcanza: las copias recién puestas
         llegan acá con el castellano que trae el molde. Se traducen una vez,
         cuando ya están todas puestas. No se espera el resultado a propósito
         —`_llenarOferta` no es asíncrona—, y no hace falta: para cuando se
         llega hasta acá, `traducir()` ya corrió sobre la pantalla entera y el
         catálogo de frases está en memoria.
         Un elemento del molde lleva `data-frase` (un rótulo fijo) o
         `data-campo` (un dato del ítem), nunca los dos: si alguna vez
         llevara ambos, ganaría el rótulo, que no es lo que se querría.
         Apareció el 26 de agosto de 2026, al convertir `cursos.html`: sus
         moldes tienen 21 `data-frase` que se veían siempre en castellano. */
      this.traducir(contenedor);
    },

    // Un aviso puesto como texto adentro de un <select> no se ve: el navegador
    // solo dibuja sus <option>. Ahí va como opción deshabilitada.
    // `conservarMoldes` es para el estado «cargando», que se muestra **antes** de
    // saber si va a hacer falta dibujar: sin eso el aviso se llevaría puestos
    // los `<template>` que todavía no se usaron, y después no habría con qué
    // armar las tarjetas. El aviso queda marcado para poder sacarlo después.
    _avisarEnOferta(contenedor, texto, conservarMoldes) {
      if (contenedor.tagName === 'SELECT') { this._avisar(contenedor, texto); return; }
      if (conservarMoldes) {
        this._sacarAvisoDeOferta(contenedor);
        const aviso = document.createElement('p');
        aviso.setAttribute('data-aviso-oferta', '');
        aviso.textContent = texto;
        contenedor.appendChild(aviso);
        return;
      }
      Array.prototype.slice.call(contenedor.querySelectorAll(':scope > template'))
        .forEach((m) => m.remove());
      contenedor.textContent = texto;
    },

    _sacarAvisoDeOferta(contenedor) {
      Array.prototype.slice.call(contenedor.querySelectorAll(':scope > [data-aviso-oferta]'))
        .forEach((a) => a.remove());
    },

    // ── Cómo se dibuja cada cosa ─────────────────────────────────────────
    // Nada de innerHTML: los textos del catálogo se ponen con textContent, así
    // un nombre con un signo raro no puede convertirse en etiquetas.

    _opcion(valor, texto, deshabilitada) {
      const op = document.createElement('option');
      op.value = valor;
      op.textContent = texto;
      if (deshabilitada) op.disabled = true;
      return op;
    },

    // Un desplegable. Si los ítems traen `region`, se agrupan: los de región
    // vacía son los encabezados y los demás cuelgan del suyo.
    _llenarSelect(elemento, items) {
      const vacio = elemento.getAttribute('data-catalogo-vacio');
      elemento.innerHTML = '';
      if (vacio) {
        const primera = this._opcion('', vacio);
        primera.selected = true;
        elemento.appendChild(primera);
      }

      const agrupado = items.some((i) => 'region' in i);
      if (!agrupado) {
        items.forEach((i) => elemento.appendChild(this._opcion(i.clave, this.texto(i))));
        return;
      }

      const grupos = {};
      items.filter((i) => !i.region).forEach((i) => {
        const g = document.createElement('optgroup');
        g.label = this.texto(i);
        grupos[i.clave] = g;
        elemento.appendChild(g);
      });
      items.forEach((i) => {
        if (!i.region) {
          // La región también se puede elegir entera, no solo sus barrios.
          grupos[i.clave].appendChild(this._opcion(i.clave, this.texto(i)));
          return;
        }
        const destino = grupos[i.region] || elemento;
        destino.appendChild(this._opcion(i.clave, this.texto(i)));
      });
    },

    // Un grupo de casillas o de opciones redondas, para los vocabularios donde
    // se elige más de una cosa (patologías, tareas, certificaciones).
    // Los tres ajustes que comparten los grupos de opciones —casillas y
    // redondas—: cómo se llama el campo, qué clase lleva cada opción, y
    // cuáles vienen marcadas de entrada. Se leen en un solo lugar
    // porque son los mismos tres («ningún patrón repetido sin punto único de verdad»).
    _ajustesDeGrupo(elemento) {
      return {
        nombre: elemento.getAttribute('data-catalogo-nombre')
          || elemento.getAttribute('data-catalogo'),
        clase: elemento.getAttribute('data-catalogo-clase') || '',
        // Lo que viene tildado de entrada, si la pantalla lo declara.
        marcados: (elemento.getAttribute('data-catalogo-marcados') || '')
          .split(',').map((c) => c.trim()).filter(Boolean)
      };
    },

    _llenarGrupo(elemento, items, tipo) {
      const ajustes = this._ajustesDeGrupo(elemento);
      elemento.innerHTML = '';
      items.forEach((i) => {
        const etiqueta = document.createElement('label');
        if (ajustes.clase) etiqueta.className = ajustes.clase;
        const control = document.createElement('input');
        control.type = tipo === 'radios' ? 'radio' : 'checkbox';
        control.name = ajustes.nombre;
        control.value = i.clave;
        if (ajustes.marcados.indexOf(i.clave) !== -1) control.checked = true;
        etiqueta.appendChild(control);
        etiqueta.appendChild(document.createTextNode(' ' + this.texto(i)));
        elemento.appendChild(etiqueta);
      });
    },

    // El aviso que ocupa el lugar de la lista cuando no hay lista. Se ve en la
    // pantalla, no solo en la consola.
    _avisar(elemento, texto) {
      if (elemento.tagName === 'SELECT') {
        elemento.innerHTML = '';
        elemento.appendChild(this._opcion('', texto, true));
        elemento.selectedIndex = 0;
      } else {
        elemento.textContent = texto;
      }
    },

    // Resuelve un solo elemento. Devuelve `true` si quedó con opciones.
    _resolver(elemento) {
      const clave = elemento.getAttribute('data-catalogo');
      let items;
      try {
        items = this.items(clave);
      } catch (err) {
        console.error('Catálogo:', err.message);
        this._avisar(elemento, this.frase('catalogo.error'));
        return false;
      }
      if (!items.length) {
        console.error('Catálogo: el vocabulario «' + clave + '» no tiene ítems.');
        this._avisar(elemento, this.frase('catalogo.vacio'));
        return false;
      }
      const como = elemento.getAttribute('data-catalogo-como');
      if (como === 'casillas' || como === 'radios') this._llenarGrupo(elemento, items, como);
      else this._llenarSelect(elemento, items);

      // Lo que la pantalla quiera dejar elegido de entrada, por ejemplo al
      // editar algo ya guardado.
      const elegido = elemento.getAttribute('data-catalogo-valor');
      if (elegido && elemento.tagName === 'SELECT') elemento.value = elegido;
      return true;
    },

    // Recorre el documento y resuelve todo lo que declare `data-catalogo`.
    // Mientras llega el archivo, cada desplegable dice «Cargando opciones…» y
    // queda deshabilitado: es el estado «cargando», y además
    // evita que alguien mande el formulario con la lista a medio llenar.
    async aplicarEnDocumento(raiz) {
      const base = raiz || document;
      // Las frases van primero y solas: son el texto de toda la pantalla, y las
      // otras dos esperas dependen de la red igual que ésta pero pueden tardar
      // más. Encadenarlas dejaría los rótulos esperando a las opciones.
      await this.traducir(base);
      // Y la Identidad escribe siempre despues. Traducir reemplaza el nodo de
      // texto, asi que se lleva por delante lo que Identidad habia resuelto y
      // anotado: el resultado era un boton que decia el nombre del producto
      // donde va el de la Prestadora, y un titulo que volvia al castellano. Es
      // el mismo orden que ya usa la lista que se arma sola mas abajo.
      if (window.Identidad) window.Identidad.aplicarEnDocumento(base);
      await Promise.all([this._aplicarVocabularios(base), this._aplicarOferta(base)]);
    },

    async traducir(base) {
      // El propio elemento entra, no sólo lo que cuelga de él: quien arma un
      // botón a mano y pide que se lo traduzcan le pasa **ese** botón, y
      // `querySelectorAll` nunca devuelve la raíz desde la que se busca.
      const todos = Array.prototype.slice.call(base.querySelectorAll('*'));
      if (base.attributes) todos.unshift(base);

      const conTexto = todos.filter((el) => el.hasAttribute('data-frase'));
      const conAtributo = todos.filter((el) => Array.prototype.slice.call(el.attributes)
        .some((a) => a.name.indexOf('data-frase-') === 0));
      if (!conTexto.length && !conAtributo.length) return;

      try {
        await this.cargarFrases();
      } catch (err) {
        // Lo que quedó escrito adentro de la pantalla es lo que se ve. No se
        // borra nada y no se pone ningún cartel: media pantalla en castellano
        // se entiende, media pantalla vacía no.
        console.error('Catálogo:', err.message);
        return;
      }

      // `lang` no es decorativo: de ahí sacan el idioma el lector de pantalla,
      // el corrector del navegador y el partido de palabras al final del
      // renglón. Va **después** de que el texto llegó, no antes: si el archivo
      // no llega, lo que se ve sigue siendo el castellano que la pantalla trae
      // adentro, y declararlo inglés haría que un lector de pantalla lea
      // castellano con pronunciación inglesa. `lang` describe lo que está
      // escrito, no lo que se pidió. Se comprobó escondiendo el archivo.
      if (base === document) document.documentElement.setAttribute('lang', this.idioma);

      // Lo que va adentro de los huecos de una frase, escrito en el elemento:
      //     <p data-frase="clave.minimo" data-huecos='{"cuantos":8}'></p>
      // Se llama `data-huecos` y no `data-frase-huecos` a propósito: cualquier
      // cosa que empiece con `data-frase-` es el nombre de un atributo que hay
      // que traducir, así que esto último terminaría escribiendo un atributo
      // `huecos` en la pantalla.
      const huecosDe = (el) => {
        const escrito = el.getAttribute('data-huecos');
        if (!escrito) return null;
        try {
          return JSON.parse(escrito);
        } catch (err) {
          console.error('Catálogo: `data-huecos` no es un JSON válido:', escrito);
          return null;
        }
      };

      conTexto.forEach((el) => {
        const texto = this.frase(el.getAttribute('data-frase'), huecosDe(el));
        if (!texto) return;
        // `textContent` y nunca `innerHTML`: una frase con un signo raro tiene
        // que verse, no ejecutarse. Lo que necesita un enlace adentro se parte
        // en dos claves, una por elemento.
        el.textContent = texto;
      });

      conAtributo.forEach((el) => {
        Array.prototype.slice.call(el.attributes).forEach((a) => {
          if (a.name.indexOf('data-frase-') !== 0) return;
          const texto = this.frase(a.value, huecosDe(el));
          if (texto) el.setAttribute(a.name.slice(11), texto);
        });
      });
    },

    async _aplicarOferta(base) {
      const contenedores = Array.prototype.slice.call(base.querySelectorAll('[data-oferta]'));
      if (!contenedores.length) return;
      // Si algún molde traduce un campo por vocabulario (`campo@vocabulario`),
      // hace falta también el otro archivo. Se piden juntos para no encadenar
      // dos esperas.
      // Se busca en el texto y no con un selector: lo que hay adentro de un
      // <template> no está en el documento y `querySelector` no lo encuentra.
      const traduce = contenedores.some((c) => /data-(campo|attr-[a-z-]+)="[^"]*@/.test(c.innerHTML));
      // El estado «cargando», con el mismo motivo que en `_aplicarVocabularios`:
      // una grilla de tarjetas que todavía no llegó se ve igual que una que vino
      // vacía. Los moldes se conservan porque recién después se sabe si hacen
      // falta. La frase es una de las de arranque: es la única que contesta
      // mientras el archivo que la traería todavía viaja.
      contenedores.forEach((c) => this._avisarEnOferta(c, this.frase('catalogo.cargando'), true));
      try {
        await Promise.all(traduce ? [this.cargarOferta(), this.cargar()] : [this.cargarOferta()]);
      } catch (err) {
        console.error('Catálogo:', err.message);
        // El molde queda como está: una tarjeta menos se nota, una grilla vacía
        // sin explicación, no.
        contenedores.forEach((c) => this._avisarEnOferta(c, this.frase('catalogo.error')));
        return;
      }
      contenedores.forEach((c) => {
        this._sacarAvisoDeOferta(c);
        this._llenarOferta(c);
      });
    },

    async _aplicarVocabularios(base) {
      const elementos = Array.prototype.slice.call(base.querySelectorAll('[data-catalogo]'));
      if (!elementos.length) return;

      // El estado «cargando», para todos y no sólo para los desplegables. Un
      // grupo de casillas que todavía no llegó se ve igual que uno que vino
      // vacío, y ésa es exactamente la falla que este archivo existe para no
      // tener. El desplegable además queda deshabilitado, así nadie manda el
      // formulario a medio llenar.
      elementos.forEach((el) => {
        this._avisar(el, this.frase('catalogo.cargando'));
        if (el.tagName === 'SELECT') el.disabled = true;
      });

      try {
        await this.cargar();
      } catch (err) {
        console.error('Catálogo:', err.message);
        elementos.forEach((el) => {
          this._avisar(el, this.frase('catalogo.error'));
          if (el.tagName === 'SELECT') el.disabled = false;
        });
        return;
      }

      elementos.forEach((el) => {
        this._resolver(el);
        if (el.tagName === 'SELECT') el.disabled = false;
      });
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Catalogo.aplicarEnDocumento());
    } else {
      Catalogo.aplicarEnDocumento();
    }
  }

  if (typeof window !== 'undefined') window.Catalogo = Catalogo;
})();
