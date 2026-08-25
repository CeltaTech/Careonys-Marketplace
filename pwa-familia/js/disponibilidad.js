/* ===================================================
   FRANJAS — cuándo puede trabajar el Asistente, y cuándo se necesita el cuidado

   Son la misma grilla vista desde cada lado: los mismos días, los mismos
   turnos, el mismo dibujo. Por eso las dibuja este archivo y no dos. Lo que
   cambia es el título del paso, lo que se lee al marcar un casillero
   —«Disponible» de un lado, «Se necesita» del otro— y en qué tabla termina cada
   marca: `franjas_asistente` (migración 0012) o `franjas_busqueda`
   (migración 0015).

   Cuál de las dos se dibuja se elige con el segundo argumento, que es el nombre
   del bloque en `data/catalogo-disponibilidad.json`:

       await Franjas.montarGrilla('grilla-disponibilidad');                    // el Asistente
       await Franjas.montarGrilla('grilla-cuidado', 'grilla_busqueda');        // la Familia

   El objeto sigue llamándose `Disponibilidad` además de `Franjas`, porque así
   lo nombran las pantallas del Asistente desde antes; los dos nombres apuntan
   al mismo objeto.

   Regla 5.1: ningún catálogo se escribe adentro de una pantalla, y los
   formularios se declaran, no se dibujan. La grilla de días por turnos estaba
   escrita a mano en dos pantallas —veintiún casilleros en cada una, con el día
   y el turno puestos en el marcado— y las dos habían escrito «Lunes» y
   «Mañana», que son etiquetas y no claves. Acá los días y los turnos salen de
   los vocabularios `dia_semana` y `turno`, y lo que queda guardado son las
   claves: `lunes`, `manana`.

   Cómo se usa: la pantalla pone los párrafos y los contenedores vacíos, y los
   declara. Del lado del Asistente, con las preguntas sueltas del paso:

       <p id="disponibilidad-titulo"></p>
       <p id="disponibilidad-bajada"></p>
       <div id="grilla-disponibilidad"></div>
       <p id="disponibilidad-ayuda"></p>
       <div id="preguntas-disponibilidad"></div>

       await Franjas.montarTextos('disponibilidad', 'paso_de_disponibilidad');
       await Franjas.montarGrilla('grilla-disponibilidad');
       await Franjas.montarPreguntas('preguntas-disponibilidad');

       const disponibilidad = Franjas.recolectar(
         'grilla-disponibilidad', 'preguntas-disponibilidad');
       // → { franjas: [{ dia: 'lunes', turno: 'manana' }, …],
       //     reemplazos_urgentes: false }

   Del lado de la Familia, sin preguntas sueltas: sólo la grilla.

       <p id="franjas-cuidado-titulo"></p>
       <p id="franjas-cuidado-bajada"></p>
       <div id="grilla-cuidado"></div>
       <p id="franjas-cuidado-ayuda"></p>

       await Franjas.montarTextos('franjas-cuidado', 'paso_de_franjas_busqueda');
       await Franjas.montarGrilla('grilla-cuidado', 'grilla_busqueda');

       const { franjas } = Franjas.recolectar('grilla-cuidado');
       // → [{ dia: 'lunes', turno: 'manana' }, …]

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
   La grilla del Asistente, en `franjas_asistente`, una fila por casillero; y
   las preguntas sueltas en `disponibilidad_asistente`, una fila por persona con
   lo general —hoy, si acepta reemplazos urgentes—. Las dos nacieron en la
   migración 0012. Antes de esa migración lo que la persona marcaba no llegaba a
   ninguna parte: `apiClient.js` lo recibía y lo descartaba sin avisar, que era
   el pendiente 23.

   La grilla de la Familia, en `franjas_busqueda`, también una fila por
   casillero. Nació en la migración 0015 y viene del mismo defecto: lo que la
   Familia marcaba iba a una columna `jsonb` a la que cada pantalla le escribía
   una forma distinta, y nadie la leía. Era el pendiente 40.

   Hay una copia idéntica de este archivo y del JSON en cada una de las dos
   aplicaciones, porque el guion de servicio de cada una sólo alcanza su propia
   carpeta. `scripts/verificar_copias.mjs` comprueba que las tres sigan siendo
   iguales.
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

    // ── Los tres textos del paso ─────────────────────────────────────────
    // Estaban escritos renglón por renglón adentro de cada pantalla. Con dos
    // pantallas eran seis renglones repetidos; con cuatro serían doce. Acá se
    // dicen una vez. La pantalla sólo pone tres párrafos vacíos con los nombres
    // `<prefijo>-titulo`, `<prefijo>-bajada` y `<prefijo>-ayuda`; el que no
    // ponga, no se llena.
    async montarTextos(prefijo, nombreBloque) {
      try {
        await this.cargar();
      } catch (err) {
        console.error('Franjas:', err);
        return;
      }
      const paso = this.texto(declaracion[nombreBloque || 'paso_de_disponibilidad']);
      const poner = (parte, texto) => {
        const nodo = document.getElementById(prefijo + '-' + parte);
        if (nodo) nodo.textContent = texto || '';
      };
      poner('titulo', paso.titulo);
      poner('bajada', paso.bajada);
      poner('ayuda', paso.ayuda_grilla);
    },

    // ── La grilla ────────────────────────────────────────────────────────
    // `nombreBloque` elige cuál de las dos grillas declaradas se dibuja.
    async montarGrilla(idContenedor, nombreBloque) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;
      _avisar(contenedor, AVISOS.cargando);

      let grilla;
      let dias;
      let turnos;
      let rotulos;
      try {
        await this.cargar();
        await Catalogo.cargar();
        Catalogo.idioma = this.idioma;
        grilla = declaracion[nombreBloque || 'grilla'];
        if (!grilla) throw new Error('No hay una grilla llamada «' + nombreBloque + '»');
        dias = Catalogo.items(grilla.columnas);
        turnos = Catalogo.items(grilla.filas);
        rotulos = this.texto(grilla);
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
      (grilla.marcados_al_abrir || []).forEach((par) => {
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

  // Dos nombres para el mismo objeto: `Franjas` es lo que hace, y
  // `Disponibilidad` es como lo llaman las pantallas del Asistente desde antes
  // de que existiera la grilla de la Familia.
  if (typeof window !== 'undefined') {
    window.Disponibilidad = Disponibilidad;
    window.Franjas = Disponibilidad;
  }
})();
