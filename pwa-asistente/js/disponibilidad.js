/* ===================================================
   DISPONIBILIDAD — cuándo puede trabajar el Asistente

   Regla 5.1: ningún catálogo se escribe adentro de una pantalla, y los
   formularios se declaran, no se dibujan. La grilla de días por turnos estaba
   escrita a mano en dos pantallas —veintiún casilleros en cada una, con el día
   y el turno puestos en el marcado— y las dos habían escrito «Lunes» y
   «Mañana», que son etiquetas y no claves. Acá los días y los turnos salen de
   los vocabularios `dia_semana` y `turno`, y lo que queda guardado son las
   claves: `lunes`, `manana`.

   Cómo se usa: la pantalla pone dos contenedores vacíos y los declara.

       <div id="grilla-disponibilidad"></div>
       <div id="preguntas-disponibilidad"></div>

       await Disponibilidad.montarGrilla('grilla-disponibilidad');
       await Disponibilidad.montarPreguntas('preguntas-disponibilidad');

   Y al enviar el formulario:

       const disponibilidad = Disponibilidad.recolectar(
         'grilla-disponibilidad', 'preguntas-disponibilidad');
       // → { franjas: [{ dia: 'lunes', turno: 'manana' }, …],
       //     reemplazos_urgentes: false }

   QUÉ DIBUJA Y QUÉ NO
   Dibuja la estructura y pone los nombres de clase; el aspecto es de cada
   pantalla, que las estila como quiera. Por eso el portal y la aplicación del
   Asistente comparten este archivo aunque se vean distinto: una es una página
   ancha y la otra un teléfono.

   Las clases son `grilla-disponibilidad` en el contenedor, y adentro
   `gd-encabezado` (los días), `gd-turno` (la fila) y `gd-casillero`, que suma
   `gd-marcado` cuando está marcado.

   POR QUÉ CADA CASILLERO ES UN BOTÓN DE VERDAD
   Porque se llega con el tabulador y se marca con la barra espaciadora, y
   porque un lector de pantalla dice si está marcado o no. Un `div` con un
   `click` encima no hace ninguna de las dos cosas.

   DE DÓNDE SALE HOY Y DE DÓNDE VA A SALIR MAÑANA
   Los textos del paso están en `data/catalogo-disponibilidad.json`; los días y
   los turnos, en `data/catalogo-vocabularios.json` a través de `catalogo.js`.
   El destino de los dos son las tablas de Careonys (`docs/MODULOS.md`), y hasta
   la fusión el único lugar que sabe de dónde salen es `_traer()`, acá abajo.

   DÓNDE TERMINA LO QUE SE MARCA
   En `franjas_asistente`, una fila por casillero, y en
   `disponibilidad_asistente`, una fila por persona con lo general —hoy, si
   acepta reemplazos urgentes—. Las dos nacieron en la migración 0012. Antes de
   esa migración lo que la persona marcaba no llegaba a ninguna parte:
   `apiClient.js` lo recibía y lo descartaba sin avisar, que era el pendiente 23.

   Hay una copia idéntica de este archivo y del JSON en la aplicación del
   Asistente, porque su guion de servicio sólo alcanza su propia carpeta.
   `scripts/verificar_copias.mjs` comprueba que sigan siendo iguales.
=================================================== */

(function () {
  'use strict';

  const IDIOMA_POR_DEFECTO = 'es-AR';

  // Los cuatro estados de la regla 5.3, dichos una sola vez.
  const AVISOS = {
    cargando: 'Cargando la disponibilidad…',
    error: 'No se pudo cargar el paso de disponibilidad',
    vacio: 'No hay días ni turnos para mostrar'
  };

  // La dirección del archivo se calcula desde la de este mismo guion, igual que
  // en `catalogo.js`: así la copia de la aplicación lee el JSON de su propia
  // carpeta sin que nadie configure nada.
  function direccionDelArchivo() {
    const guion = document.currentScript
      || Array.prototype.slice.call(document.querySelectorAll('script[src]'))
          .filter((s) => /(^|\/)disponibilidad\.js(\?|$)/.test(s.getAttribute('src') || ''))[0];
    const src = guion ? guion.src : 'js/disponibilidad.js';
    return src.replace(/js\/disponibilidad\.js(\?.*)?$/, 'data/catalogo-disponibilidad.json');
  }

  const ARCHIVO = direccionDelArchivo();

  let promesa = null;
  let declaracion = null;

  // El único punto que sabe de dónde sale la declaración del paso.
  async function _traer() {
    const respuesta = await fetch(ARCHIVO, { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('La disponibilidad respondió ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.grilla) throw new Error('La disponibilidad no trae la grilla');
    return datos;
  }

  // Un cartel legible en el lugar donde iba el paso. Una pantalla que se queda
  // vacía no avisa de nada, y la persona cree que el paso no existe.
  function _avisar(contenedor, texto, err) {
    if (err) console.error('Disponibilidad:', err);
    contenedor.textContent = '';
    const p = document.createElement('p');
    p.className = 'gd-aviso';
    p.style.cssText = 'font-size:12.5px;color:var(--texto-secundario);margin:0;';
    p.textContent = texto;
    contenedor.appendChild(p);
  }

  const Disponibilidad = {

    idioma: IDIOMA_POR_DEFECTO,

    // Trae la declaración una sola vez por página, aunque la pidan diez veces.
    cargar() {
      if (!promesa) {
        promesa = _traer().then((d) => { declaracion = d; return d; });
      }
      return promesa;
    },

    // El bloque de textos en el idioma que corresponde. Si falta la traducción
    // se cae al es-AR: mejor la frase en otro idioma que un formulario mudo.
    texto(bloque) {
      if (!bloque) return {};
      return bloque[this.idioma] || bloque[IDIOMA_POR_DEFECTO] || {};
    },

    // ── La grilla ────────────────────────────────────────────────────────
    async montarGrilla(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;
      _avisar(contenedor, AVISOS.cargando);

      let dias;
      let turnos;
      let rotulos;
      try {
        await this.cargar();
        await Catalogo.cargar();
        Catalogo.idioma = this.idioma;
        dias = Catalogo.items(declaracion.grilla.columnas);
        turnos = Catalogo.items(declaracion.grilla.filas);
        rotulos = this.texto(declaracion.grilla);
      } catch (err) {
        _avisar(contenedor, AVISOS.error, err);
        return;
      }

      if (dias.length === 0 || turnos.length === 0) {
        _avisar(contenedor, AVISOS.vacio);
        return;
      }

      // Los pares que vienen marcados de fábrica. Hoy la lista está vacía a
      // propósito y el archivo explica por qué; se llena ahí, no acá.
      const marcados = {};
      (declaracion.grilla.marcados_al_abrir || []).forEach((par) => {
        marcados[par.dia + '|' + par.turno] = true;
      });

      contenedor.textContent = '';
      contenedor.classList.add('grilla-disponibilidad');
      contenedor.style.gridTemplateColumns = 'repeat(' + (dias.length + 1) + ', 1fr)';

      const celda = (clase, texto) => {
        const div = document.createElement('div');
        div.className = clase;
        div.textContent = texto;
        return div;
      };

      contenedor.appendChild(celda('gd-encabezado', rotulos.encabezado_filas || ''));
      dias.forEach((dia) => {
        contenedor.appendChild(celda('gd-encabezado', Catalogo.texto(dia)));
      });

      turnos.forEach((turno) => {
        // El rango horario es del turno y vive en el vocabulario, no acá: si un
        // día la mañana empieza a las 7, se cambia en un solo lugar.
        const nombreTurno = Catalogo.texto(turno)
          + (turno.horario ? ' (' + turno.horario + ')' : '');
        contenedor.appendChild(celda('gd-turno', nombreTurno));

        dias.forEach((dia) => {
          const boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'gd-casillero';
          boton.setAttribute('data-dia', dia.clave);
          boton.setAttribute('data-turno', turno.clave);

          const marcar = (encendido) => {
            boton.classList.toggle('gd-marcado', encendido);
            boton.setAttribute('aria-pressed', encendido ? 'true' : 'false');
            boton.textContent = encendido ? '✓' : '—';
            boton.setAttribute('aria-label', Catalogo.texto(dia) + ', ' + Catalogo.texto(turno)
              + ', ' + (encendido ? (rotulos.marcado || '') : (rotulos.sin_marcar || '')));
          };

          marcar(!!marcados[dia.clave + '|' + turno.clave]);
          boton.addEventListener('click', () => {
            marcar(!boton.classList.contains('gd-marcado'));
          });
          contenedor.appendChild(boton);
        });
      });
    },

    // ── Las preguntas sueltas del paso ───────────────────────────────────
    // Hoy es una sola —los reemplazos urgentes— y por eso la lista se recorre
    // igual: la segunda no obliga a reescribir nada.
    async montarPreguntas(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;
      _avisar(contenedor, AVISOS.cargando);

      try {
        await this.cargar();
      } catch (err) {
        _avisar(contenedor, AVISOS.error, err);
        return;
      }

      const claves = declaracion.preguntas || [];
      if (claves.length === 0) {
        contenedor.textContent = '';
        return;
      }

      contenedor.textContent = '';
      claves.forEach((clave) => {
        const pregunta = this.texto(declaracion[clave]);
        if (!pregunta.etiqueta) return;

        const bloque = document.createElement('div');
        bloque.className = 'gd-pregunta';

        const etiqueta = document.createElement('label');
        etiqueta.className = 'gd-pregunta-etiqueta';

        const casilla = document.createElement('input');
        casilla.type = 'checkbox';
        casilla.id = 'disponibilidad-' + clave;
        casilla.setAttribute('data-disponibilidad', clave);
        casilla.checked = !!(declaracion[clave] || {}).valor_inicial;

        etiqueta.setAttribute('for', casilla.id);
        etiqueta.appendChild(casilla);
        etiqueta.appendChild(document.createTextNode(' ' + pregunta.etiqueta));

        const detalle = document.createElement('p');
        detalle.className = 'gd-pregunta-detalle';
        detalle.textContent = pregunta.pregunta || '';

        const ayuda = document.createElement('p');
        ayuda.className = 'gd-pregunta-ayuda';
        const refrescarAyuda = () => {
          ayuda.textContent = casilla.checked ? (pregunta.ayuda_si || '') : (pregunta.ayuda_no || '');
        };
        refrescarAyuda();
        casilla.addEventListener('change', refrescarAyuda);

        bloque.appendChild(etiqueta);
        bloque.appendChild(detalle);
        bloque.appendChild(ayuda);
        contenedor.appendChild(bloque);
      });
    },

    // ── Lo que la persona dejó marcado ───────────────────────────────────
    // Devuelve claves, nunca etiquetas, que es lo que esperan las columnas
    // `dia` y `turno` de `franjas_asistente`.
    recolectar(idGrilla, idPreguntas) {
      const resultado = { franjas: [] };

      const grilla = document.getElementById(idGrilla);
      if (grilla) {
        grilla.querySelectorAll('.gd-casillero.gd-marcado').forEach((casillero) => {
          resultado.franjas.push({
            dia: casillero.getAttribute('data-dia'),
            turno: casillero.getAttribute('data-turno')
          });
        });
      }

      const preguntas = document.getElementById(idPreguntas);
      if (preguntas) {
        preguntas.querySelectorAll('[data-disponibilidad]').forEach((casilla) => {
          resultado[casilla.getAttribute('data-disponibilidad')] = casilla.checked;
        });
      }

      return resultado;
    },

    // Deja el paso como recién abierto. Lo usa la aplicación del Asistente
    // después de enviar, que reutiliza el mismo formulario.
    limpiar(idGrilla, idPreguntas) {
      const grilla = document.getElementById(idGrilla);
      if (grilla) {
        grilla.querySelectorAll('.gd-casillero').forEach((casillero) => {
          casillero.classList.remove('gd-marcado');
          casillero.setAttribute('aria-pressed', 'false');
          casillero.textContent = '—';
        });
      }
      const preguntas = document.getElementById(idPreguntas);
      if (preguntas) {
        preguntas.querySelectorAll('[data-disponibilidad]').forEach((casilla) => {
          casilla.checked = false;
          casilla.dispatchEvent(new Event('change'));
        });
      }
    }
  };

  if (typeof window !== 'undefined') window.Disponibilidad = Disponibilidad;
})();
