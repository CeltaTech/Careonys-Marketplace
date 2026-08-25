/* ===================================================
   CATÁLOGO — las listas de opciones, en un solo lugar

   Regla 5.1: ningún catálogo se escribe adentro de una pantalla. Antes cada
   formulario traía su propia lista de géneros, de zonas, de perfiles; eran
   veintiuna listas repartidas en nueve archivos y no coincidían entre sí.
   Ahora hay una sola, y las pantallas la piden.

   Cómo se usa: la pantalla no dibuja opciones, las declara.

       <select id="genero" data-catalogo="genero" data-catalogo-vacio="— Seleccionar —"></select>

       <div data-catalogo="patologia" data-catalogo-como="casillas"
            data-catalogo-nombre="patologias"></div>

       <div class="card-select-grid" data-catalogo="tarea_cuidado"
            data-catalogo-como="tarjetas" data-catalogo-nombre="tarea"></div>

   `data-catalogo-como` dice de qué forma se dibuja: `casillas` y `radios` para
   los grupos sueltos, `tarjetas` y `tarjetas-una` para las grillas con ícono y
   bajada. La diferencia entre las dos últimas es cuántas se pueden marcar, y la
   hace el navegador: `tarjetas` son casillas y `tarjetas-una` son redondas. Sin
   `data-catalogo-como` se dibuja un desplegable.

   Al cargar la página se resuelven todas de una vez, igual que los marcadores
   de `identidad.js`.

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

  // El idioma del texto visible. Hoy las listas están escritas solo en es-AR;
  // cuando tengan `en` y `pt-BR` (regla 5.2) esto ya las lee sin tocar nada,
  // porque cada ítem es un objeto con un texto por idioma.
  const IDIOMA_POR_DEFECTO = 'es-AR';

  // Los cuatro estados de la regla 5.3, dichos una sola vez.
  const MENSAJES = {
    cargando: 'Cargando opciones…',
    error: 'No se pudieron cargar las opciones',
    vacio: 'No hay opciones disponibles',
  sinContenido: 'Por ahora no hay nada para mostrar acá'
  };

  // Una tarjeta puede traer `icono` y `bajada`; los dos son optativos. El ítem
  // que no trae ícono se dibuja con una forma neutra: lo que la opción
  // significa lo dice su etiqueta, y el ícono bueno se agrega en el catálogo el
  // día que alguien lo elija. Lo que no se hace es dejar el hueco, porque una
  // grilla con seis íconos y dos agujeros parece rota.
  const ICONO_NEUTRO = 'fa-circle-dot';

  // El nombre del ícono termina adentro de un `class`, así que se comprueba que
  // sea un nombre de ícono y no otra cosa. Viene de un archivo propio, pero el
  // día que venga de una tabla que alguien edita, esto ya está.
  const ICONO_VALIDO = /^fa-[a-z0-9-]+$/;

  let promesa = null;   // La carga en curso o ya hecha. Se pide una sola vez.
  let catalogo = null;  // Los vocabularios, una vez traídos.
  let promesaOferta = null;
  let oferta = null;    // Servicios y cursos.

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

  // Los dos únicos puntos que saben de dónde sale el catálogo. Acá se cambia el
  // día que viva en tablas.
  async function _traer() {
    const respuesta = await fetch(ARCHIVO('catalogo-vocabularios'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('El catálogo respondió ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.vocabularios) throw new Error('El catálogo no tiene vocabularios');
    return datos.vocabularios;
  }

  async function _traerOferta() {
    const respuesta = await fetch(ARCHIVO('catalogo-oferta'), { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('La oferta respondió ' + respuesta.status);
    return await respuesta.json();
  }

  const Catalogo = {

    idioma: IDIOMA_POR_DEFECTO,

    // Trae el catálogo una sola vez por página, aunque lo pidan diez veces.
    cargar() {
      if (!promesa) {
        promesa = _traer().then((v) => { catalogo = v; return v; });
      }
      return promesa;
    },

    // El texto de un ítem en el idioma que corresponde. Si falta la traducción
    // se cae al es-AR: mejor la frase en otro idioma que un desplegable en
    // blanco.
    texto(item) {
      if (!item) return '';
      return this.textoDe(item) || item.clave || '';
    },

    // El mismo criterio de idioma, para un texto que cuelga del ítem en vez de
    // estar en su raíz: `"bajada": { "es-AR": "Baño, cambio de pañales" }`. La
    // bajada de una tarjeta es la primera que lo usa.
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

    // Traduce un valor guardado a su texto. Sirve para mostrar lo que se leyó
    // de la base: en la fila está `monotributo_social` y la persona tiene que
    // leer «Monotributo social».
    async etiqueta(clave, valor) {
      await this.cargar();
      const item = this.items(clave).filter((i) => i.clave === valor)[0];
      return item ? this.texto(item) : (valor || '');
    },

    // La misma traducción para cuando ya no se puede esperar —se está dibujando
    // una tarjeta— y además sin quejarse si la clave no está en ese vocabulario:
    // devuelve la cadena vacía. Eso último es lo que necesita quien busca la
    // misma clave en varias listas, que es el caso de abajo.
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
    // necesitó lo mismo, para no tener la traducción dos veces (regla 7).
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
    // el reparto que pide la regla 5.1.

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
      // que es justo lo que la regla 5.1 no quiere.
      const arroba = nombre.indexOf('@');
      const clave = arroba === -1 ? nombre : nombre.slice(0, arroba);
      const valor = clave === 'nombre' ? this.texto(item) : item[clave];
      if (valor === undefined || valor === null || valor === false) return '';
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
        this._avisarEnOferta(contenedor, MENSAJES.sinContenido);
        return;
      }
      const solo = (contenedor.getAttribute('data-oferta-solo') || '')
        .split(',').map((c) => c.trim()).filter(Boolean);

      const moldes = Array.prototype.slice.call(contenedor.querySelectorAll(':scope > template'));
      if (!moldes.length) {
        console.error('Catálogo: «' + cual + '» no declara ningún <template>.');
        return;
      }
      const elegidos = solo.length
        ? solo.map((c) => lista.filter((i) => i.clave === c)[0]).filter(Boolean)
        : lista;
      if (solo.length !== elegidos.length) {
        console.error('Catálogo: «' + cual + '» no tiene todas las claves pedidas: '
          + solo.filter((c) => !lista.some((i) => i.clave === c)).join(', '));
      }
      // Ninguna de las claves pedidas existe. Sin esto la grilla queda vacía y
      // muda: el molde ya se sacó y no entra nada en su lugar.
      if (!elegidos.length) {
        this._avisarEnOferta(contenedor, MENSAJES.sinContenido);
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
    },

    // Un aviso puesto como texto adentro de un <select> no se ve: el navegador
    // solo dibuja sus <option>. Ahí va como opción deshabilitada.
    _avisarEnOferta(contenedor, texto) {
      if (contenedor.tagName === 'SELECT') { this._avisar(contenedor, texto); return; }
      Array.prototype.slice.call(contenedor.querySelectorAll(':scope > template'))
        .forEach((m) => m.remove());
      contenedor.textContent = texto;
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
    // Los tres ajustes que comparten todos los grupos de opciones —casillas,
    // redondas y tarjetas—: cómo se llama el campo, qué clase lleva cada
    // opción, y cuáles vienen marcadas de entrada. Se leen en un solo lugar
    // porque son los mismos tres (regla 7).
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

    // Una grilla de tarjetas: el mismo grupo de opciones de arriba, pero cada
    // una con su ícono y su bajada.
    //
    // La tarjeta es una etiqueta con el control adentro, y no un recuadro que
    // se pinta con una clase. De ahí salen tres cosas que antes había que
    // escribir a mano y ya no: que de un grupo de redondas se marque una sola
    // lo resuelve el navegador; lo elegido se lee del formulario y no de una
    // clase de CSS; y la grilla se puede recorrer con el teclado. El control se
    // esconde con CSS —no con `type="hidden"`, que no se puede marcar—, así que
    // lo que se ve es la tarjeta y lo que se lee es el control.
    _llenarTarjetas(elemento, items, unaSola) {
      const ajustes = this._ajustesDeGrupo(elemento);
      elemento.innerHTML = '';
      items.forEach((i) => {
        const tarjeta = document.createElement('label');
        tarjeta.className = ajustes.clase || 'select-card';

        const control = document.createElement('input');
        control.type = unaSola ? 'radio' : 'checkbox';
        control.name = ajustes.nombre;
        control.value = i.clave;
        if (ajustes.marcados.indexOf(i.clave) !== -1) control.checked = true;
        tarjeta.appendChild(control);

        const icono = document.createElement('i');
        icono.className = 'fas ' + (ICONO_VALIDO.test(i.icono || '') ? i.icono : ICONO_NEUTRO);
        // El ícono no dice nada que la etiqueta no diga: quien escucha la
        // pantalla en vez de mirarla no tiene por qué oírlo.
        icono.setAttribute('aria-hidden', 'true');
        tarjeta.appendChild(icono);

        const titulo = document.createElement('h4');
        titulo.textContent = this.texto(i);
        tarjeta.appendChild(titulo);

        const bajada = this.textoDe(i.bajada);
        if (bajada) {
          const parrafo = document.createElement('p');
          parrafo.textContent = bajada;
          tarjeta.appendChild(parrafo);
        }

        elemento.appendChild(tarjeta);
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
        this._avisar(elemento, MENSAJES.error);
        return false;
      }
      if (!items.length) {
        console.error('Catálogo: el vocabulario «' + clave + '» no tiene ítems.');
        this._avisar(elemento, MENSAJES.vacio);
        return false;
      }
      const como = elemento.getAttribute('data-catalogo-como');
      if (como === 'casillas' || como === 'radios') this._llenarGrupo(elemento, items, como);
      else if (como === 'tarjetas' || como === 'tarjetas-una') {
        this._llenarTarjetas(elemento, items, como === 'tarjetas-una');
      } else this._llenarSelect(elemento, items);

      // Lo que la pantalla quiera dejar elegido de entrada, por ejemplo al
      // editar algo ya guardado.
      const elegido = elemento.getAttribute('data-catalogo-valor');
      if (elegido && elemento.tagName === 'SELECT') elemento.value = elegido;
      return true;
    },

    // Recorre el documento y resuelve todo lo que declare `data-catalogo`.
    // Mientras llega el archivo, cada desplegable dice «Cargando opciones…» y
    // queda deshabilitado: es el estado «cargando» de la regla 5.3, y además
    // evita que alguien mande el formulario con la lista a medio llenar.
    async aplicarEnDocumento(raiz) {
      const base = raiz || document;
      await Promise.all([this._aplicarVocabularios(base), this._aplicarOferta(base)]);
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
      try {
        await Promise.all(traduce ? [this.cargarOferta(), this.cargar()] : [this.cargarOferta()]);
      } catch (err) {
        console.error('Catálogo:', err.message);
        // El molde queda como está: una tarjeta menos se nota, una grilla vacía
        // sin explicación, no.
        contenedores.forEach((c) => this._avisarEnOferta(c, MENSAJES.error));
        return;
      }
      contenedores.forEach((c) => this._llenarOferta(c));
    },

    async _aplicarVocabularios(base) {
      const elementos = Array.prototype.slice.call(base.querySelectorAll('[data-catalogo]'));
      if (!elementos.length) return;

      // El estado «cargando» de la regla 5.3, para todos y no sólo para los
      // desplegables. Un grupo de casillas o una grilla de tarjetas que todavía
      // no llegó se ve igual que una que vino vacía, y ésa es exactamente la
      // falla que este archivo existe para no tener. El desplegable además
      // queda deshabilitado, así nadie manda el formulario a medio llenar.
      elementos.forEach((el) => {
        this._avisar(el, MENSAJES.cargando);
        if (el.tagName === 'SELECT') el.disabled = true;
      });

      try {
        await this.cargar();
      } catch (err) {
        console.error('Catálogo:', err.message);
        elementos.forEach((el) => {
          this._avisar(el, MENSAJES.error);
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
