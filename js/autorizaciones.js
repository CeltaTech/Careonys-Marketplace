/* ===================================================
   AUTORIZACIONES — qué se muestra de la persona, y a quién

   El último paso del alta. La persona ya cargó todo su legajo, y recién
   entonces se le pregunta qué de eso se hace visible. Antes de cargarlo no
   sabría qué está autorizando.

   «todo botón que dispara una operación se apaga».1: ningún catálogo se escribe adentro de una pantalla. El texto de
   cada pregunta, su orden, su valor inicial y los tres idiomas salen de
   `data/catalogo-autorizaciones.json`. Este archivo nació porque ese paso
   estaba escrito adentro de `registrar-asistente.html` y la pantalla del
   teléfono no lo tenía: copiarlo habría sido tener el mismo paso dos veces,
   que es lo que la «ningún patrón repetido sin punto único de verdad» prohíbe.

   Cómo se usa: la pantalla pone un contenedor vacío y lo declara.

       <h3 id="cierre-titulo"></h3>
       <p id="cierre-bajada"></p>
       <p id="cierre-recordatorio"></p>
       <div id="autorizaciones"></div>

       const paso = await Autorizaciones.textosDelPaso();
       document.getElementById('cierre-titulo').textContent = paso.titulo;
       …
       await Autorizaciones.montar('autorizaciones');

   Y al enviar el formulario:

       const autorizaciones = Autorizaciones.recolectar('autorizaciones');
       // → { perfil_publicado: false }

   POR QUÉ ESTO NO ES UN DETALLE
   Sin una fila en `autorizaciones_asistente` la persona no aparece nunca en el
   directorio, aunque su Prestadora le valide el legajo: la vista
   `directorio` la exige con un `join` y no con un `left join`
   (`supabase/migrations/0012_autorizaciones_y_disponibilidad.sql:186`). Una
   pantalla de alta sin este paso da de alta a alguien que no se va a ver, y no
   avisa. Era el pendiente 36.

   EL VALOR INICIAL ES «NO»
   Toda autorización de publicación arranca sin marcar, y así se guarda si la
   persona no la toca. Una casilla marcada de fábrica no es un permiso: es un
   permiso que alguien no llegó a sacar.

   QUÉ DIBUJA Y QUÉ NO
   Dibuja la estructura y pone los nombres de clase; el aspecto es de cada
   pantalla. Comparte las clases con el paso de disponibilidad —`gd-pregunta`,
   `gd-pregunta-etiqueta`, `gd-pregunta-detalle`, `gd-pregunta-ayuda`— porque
   son la misma clase de pregunta: una casilla con una explicación que cambia
   según cómo quede.

   Hay una copia idéntica de este archivo y del JSON en la aplicación del
   Asistente, porque su guion de servicio sólo alcanza su propia carpeta.
   `scripts/verificar_copias.mjs` comprueba que sigan siendo iguales.
=================================================== */

(function () {
  'use strict';

  const IDIOMA_POR_DEFECTO = 'es-AR';

  // Los cuatro estados que este paso puede tener, dichos una sola vez.
  const MENSAJES = {
    error: 'No se pudo cargar el paso de cierre'
  };

  // La dirección del archivo se calcula desde la de este mismo guion, igual que
  // en `disponibilidad.js`: así la copia de la aplicación lee el JSON de su
  // propia carpeta sin que nadie configure nada.
  function direccionDelArchivo() {
    const guion = document.currentScript
      || Array.prototype.slice.call(document.querySelectorAll('script[src]'))
          .filter((s) => /(^|\/)autorizaciones\.js(\?|$)/.test(s.getAttribute('src') || ''))[0];
    const src = guion ? guion.src : 'js/autorizaciones.js';
    return src.replace(/js\/autorizaciones\.js(\?.*)?$/, 'data/catalogo-autorizaciones.json');
  }

  const ARCHIVO = direccionDelArchivo();

  let promesa = null;
  let declaracion = null;

  // El único punto que sabe de dónde sale la declaración del paso.
  async function _traer() {
    const respuesta = await fetch(ARCHIVO, { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('Las autorizaciones respondieron ' + respuesta.status);
    const datos = await respuesta.json();
    if (!datos || !datos.paso_de_cierre) throw new Error('Las autorizaciones no traen el paso de cierre');
    return datos;
  }

  // Un cartel legible en el lugar donde iba el paso. Una pantalla que se queda
  // vacía no avisa de nada, y la persona cree que el paso no existe.
  function _avisar(contenedor, texto, err) {
    if (err) console.error('Autorizaciones:', err);
    contenedor.textContent = '';
    const p = document.createElement('p');
    p.className = 'gd-aviso';
    p.style.cssText = 'font-size:12.5px;color:var(--texto-secundario);margin:0;';
    p.textContent = texto;
    contenedor.appendChild(p);
  }

  const Autorizaciones = {

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

    // El título, la bajada, el recordatorio y el texto del botón del paso. La
    // pantalla los pone donde quiera; acá no se decide dónde van.
    async textosDelPaso() {
      await this.cargar();
      return this.texto(declaracion.paso_de_cierre);
    },

    // ── Las preguntas ────────────────────────────────────────────────────
    async montar(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;

      try {
        await this.cargar();
      } catch (err) {
        _avisar(contenedor, MENSAJES.error, err);
        return;
      }

      const claves = (declaracion.paso_de_cierre || {}).autorizaciones || [];
      contenedor.textContent = '';

      claves.forEach((clave) => {
        const declarada = declaracion.autorizaciones[clave];
        if (!declarada) return;
        const pregunta = this.texto(declarada);
        if (!pregunta.etiqueta) return;

        const bloque = document.createElement('div');
        bloque.className = 'gd-pregunta';

        const etiqueta = document.createElement('label');
        etiqueta.className = 'gd-pregunta-etiqueta';

        const casilla = document.createElement('input');
        casilla.type = 'checkbox';
        casilla.id = 'autorizacion-' + clave;
        casilla.setAttribute('data-autorizacion', clave);
        casilla.checked = !!declarada.valor_inicial;

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
    // Devuelve un objeto con una clave por autorización, que es exactamente lo
    // que `guardarLegajoAsistente` espera en `legajo.autorizaciones`.
    //
    // Si el contenedor no existe o quedó vacío devuelve `{}`, y eso es
    // deliberado: quien llama guarda igual, y la fila de `autorizaciones_
    // asistente` queda con todo en «no». Un alta sin fila no se muestra nunca
    // y nadie se entera de por qué; una con todo en «no» tampoco se muestra,
    // pero la persona la puede cambiar desde su legajo.
    recolectar(idContenedor) {
      const resultado = {};
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return resultado;

      contenedor.querySelectorAll('[data-autorizacion]').forEach((casilla) => {
        resultado[casilla.getAttribute('data-autorizacion')] = casilla.checked;
      });
      return resultado;
    },

    // Deja el paso como recién abierto. Lo usa la aplicación del Asistente
    // después de enviar, que reutiliza el mismo formulario.
    limpiar(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;

      contenedor.querySelectorAll('[data-autorizacion]').forEach((casilla) => {
        const declarada = (declaracion || {}).autorizaciones
          ? declaracion.autorizaciones[casilla.getAttribute('data-autorizacion')]
          : null;
        casilla.checked = !!(declarada && declarada.valor_inicial);
        casilla.dispatchEvent(new Event('change'));
      });
    }
  };

  if (typeof window !== 'undefined') window.Autorizaciones = Autorizaciones;
})();
