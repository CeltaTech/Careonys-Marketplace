/* ===================================================
   LA CONVERSACIÓN — el canal entre la Familia y el Asistente

   Es la misma pantalla vista desde cada lado. Los dos ven una lista de con
   quién están hablando, entran a un hilo, leen y escriben. Lo único que cambia
   es la frase que se lee cuando todavía no hay ninguna conversación: de un lado
   «se abre una cuando usted contacta a un Asistente», del otro «se abre una
   cuando una Familia decide contactarlo». Por eso la dibuja este archivo y no
   dos, que es la regla del punto único de verdad aplicada a lo que más iba a
   repetirse: las dos aplicaciones tienen chat, y son el mismo chat.

   Cuál de los dos lados se dibuja se elige al montar:

       await Conversaciones.montar('conversacion-caja', { lado: 'familia' });
       await Conversaciones.montar('conversacion-caja', { lado: 'asistente' });

   La pantalla pone un contenedor vacío y nada más. Todo lo demás —los cuatro
   estados, la lista, el hilo, el formulario— lo arma este archivo. Después:

       await Conversaciones.recargar();          // vuelve a pedir la lista
       await Conversaciones.abrirPorId(id);      // entra derecho a un hilo
       Conversaciones.detener();                 // al salir de la pantalla

   QUÉ NO HACE, Y NO ES UN OLVIDO

   No guarda nada del trato. Lo que la Familia y el Asistente arreglen es de
   ellos: el software los pone en contacto y ahí termina (`CLAUDE.md` §1). Acá
   no hay «aceptar», no hay precio y no hay condiciones.

   No muestra ningún dato de contacto. Ni teléfono ni correo ni domicilio, de
   ninguno de los dos lados: `mis_conversaciones()` (migración 0055) no los
   devuelve, justamente para que esta pantalla no pueda mostrarlos aunque
   quisiera. Lo que sí queda es el aviso escrito, porque **hoy nada del lado del
   servidor impide que alguien escriba su teléfono adentro de un mensaje**. Eso
   es el pendiente 137, y este archivo no lo tapa: avisa, que es lo que se puede
   hacer desde el navegador.

   Los mensajes se dibujan con `textContent`, nunca con `innerHTML`. El
   contenido lo escribe la otra parte, así que es lo último a lo que se le puede
   dar de comer marcado.

   El hilo abierto se refresca solo cada pocos segundos, pidiendo únicamente lo
   posterior al último que ya tiene. Al salir de la pantalla hay que llamar a
   `detener()`, o el reloj sigue pidiendo contra una pantalla que nadie mira.
   =================================================== */

(function () {
  'use strict';

  /* Cada cuánto se vuelve a pedir el hilo abierto. No es una decisión de
     negocio: es lo que hace que el otro vea la respuesta sin recargar. */
  const CADA_CUANTO_MS = 6000;

  let contenedor = null;
  let lado = 'familia';
  let conversaciones = [];
  let abierta = null;
  let mensajes = [];
  let miId = null;
  let reloj = null;
  let enviando = false;

  function frase(clave, huecos) {
    return window.Catalogo ? window.Catalogo.frase(clave, huecos) : '';
  }

  function textoDeError(error, queSeIntentaba) {
    if (window.Texto && typeof window.Texto.mensajeDeError === 'function') {
      return window.Texto.mensajeDeError(error, queSeIntentaba);
    }
    return queSeIntentaba;
  }

  function nodo(etiqueta, clases, texto) {
    const elemento = document.createElement(etiqueta);
    if (clases) elemento.className = clases;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
  }

  /* La fecha, en el idioma que la persona está leyendo. `toLocaleString` con el
     idioma del catálogo y no con el del navegador: son dos cosas distintas y la
     que vale es la que eligió. */
  function cuando(fechaIso, conHora) {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return '';
    const idioma = (window.Catalogo && window.Catalogo.idioma) || 'es-AR';
    const formato = conHora
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' };
    try { return fecha.toLocaleString(idioma, formato); } catch (e) { return fechaIso; }
  }

  // ── Los cuatro estados ────────────────────────────────────────────────────
  function mostrar(cual) {
    if (!contenedor) return;
    for (const estado of ['cargando', 'error', 'vacio', 'listo']) {
      const caja = contenedor.querySelector('[data-estado="' + estado + '"]');
      if (caja) caja.hidden = estado !== cual;
    }
  }

  function verHilo(siOno) {
    const lista = contenedor.querySelector('[data-parte="lista"]');
    const hilo = contenedor.querySelector('[data-parte="hilo"]');
    if (lista) lista.hidden = siOno;
    if (hilo) hilo.hidden = !siOno;
  }

  // ── El armado, una sola vez ───────────────────────────────────────────────
  function armar() {
    contenedor.textContent = '';

    const lista = nodo('div');
    lista.setAttribute('data-parte', 'lista');

    const cargando = nodo('p', 'pwa-estado', frase('conversacion.cargando'));
    cargando.setAttribute('data-estado', 'cargando');
    lista.appendChild(cargando);

    const error = nodo('div', 'pwa-estado');
    error.setAttribute('data-estado', 'error');
    error.hidden = true;
    const errorTexto = nodo('p', 'pwa-estado-bajada', '');
    errorTexto.setAttribute('data-parte', 'error-texto');
    const reintentar = nodo('button', 'btn btn-secundario', frase('conversacion.reintentar'));
    reintentar.type = 'button';
    reintentar.addEventListener('click', () => { recargar(); });
    error.appendChild(errorTexto);
    error.appendChild(reintentar);
    lista.appendChild(error);

    const vacio = nodo('div', 'pwa-estado');
    vacio.setAttribute('data-estado', 'vacio');
    vacio.hidden = true;
    vacio.appendChild(nodo('p', '', frase('conversacion.vacio_titulo')));
    vacio.appendChild(nodo('p', 'pwa-estado-bajada', frase(
      lado === 'asistente'
        ? 'conversacion.vacio_bajada_asistente'
        : 'conversacion.vacio_bajada_familia')));
    lista.appendChild(vacio);

    const listo = nodo('div');
    listo.setAttribute('data-estado', 'listo');
    listo.hidden = true;
    listo.setAttribute('data-parte', 'renglones');
    lista.appendChild(listo);

    contenedor.appendChild(lista);
    contenedor.appendChild(armarHilo());
  }

  function armarHilo() {
    const hilo = nodo('div', 'conv-hilo');
    hilo.setAttribute('data-parte', 'hilo');
    hilo.hidden = true;

    const volver = nodo('button', 'btn btn-secundario conv-volver', frase('conversacion.volver'));
    volver.type = 'button';
    volver.addEventListener('click', () => cerrarHilo());
    hilo.appendChild(volver);

    const cabecera = nodo('p', 'conv-otra-parte', '');
    cabecera.setAttribute('data-parte', 'otra-parte');
    hilo.appendChild(cabecera);

    const avisoContacto = nodo('p', 'conv-aviso', frase('conversacion.aviso_contacto'));
    hilo.appendChild(avisoContacto);
    const avisoTrato = nodo('p', 'conv-aviso', frase('conversacion.aviso_sin_trato'));
    hilo.appendChild(avisoTrato);

    const globos = nodo('div', 'conv-globos');
    globos.setAttribute('data-parte', 'globos');
    hilo.appendChild(globos);

    const formulario = document.createElement('form');
    formulario.className = 'conv-escribir';
    const campo = document.createElement('textarea');
    campo.className = 'conv-campo';
    campo.rows = 2;
    campo.setAttribute('data-parte', 'campo');
    campo.placeholder = frase('conversacion.escribir_lugar');
    campo.setAttribute('aria-label', frase('conversacion.escribir_lugar'));
    const enviar = nodo('button', 'btn btn-primario', frase('conversacion.enviar'));
    enviar.type = 'submit';
    enviar.setAttribute('data-parte', 'enviar');
    formulario.appendChild(campo);
    formulario.appendChild(enviar);
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      escribir();
    });
    hilo.appendChild(formulario);

    const errorEnvio = nodo('p', 'conv-error', '');
    errorEnvio.setAttribute('data-parte', 'error-envio');
    errorEnvio.hidden = true;
    hilo.appendChild(errorEnvio);

    return hilo;
  }

  // ── La lista ──────────────────────────────────────────────────────────────
  function dibujarLista() {
    const renglones = contenedor.querySelector('[data-parte="renglones"]');
    renglones.textContent = '';
    for (const conversacion of conversaciones) {
      const renglon = nodo('button', 'conv-item');
      renglon.type = 'button';
      renglon.appendChild(nodo('span', 'conv-item-nombre', conversacion.otra_parte || ''));
      renglon.appendChild(nodo('span', 'conv-item-ultimo',
        conversacion.ultimo_texto || frase('conversacion.sin_mensajes')));
      renglon.appendChild(nodo('span', 'conv-item-fecha',
        cuando(conversacion.ultimo_el || conversacion.created_at, true)));
      renglon.addEventListener('click', () => abrir(conversacion));
      renglones.appendChild(renglon);
    }
    mostrar(conversaciones.length ? 'listo' : 'vacio');
  }

  // ── El hilo ───────────────────────────────────────────────────────────────
  function dibujarMensajes() {
    const globos = contenedor.querySelector('[data-parte="globos"]');
    globos.textContent = '';
    if (!mensajes.length) {
      globos.appendChild(nodo('p', 'pwa-estado-bajada', frase('conversacion.sin_mensajes')));
      return;
    }
    for (const mensaje of mensajes) {
      const mio = miId && mensaje.autor_id === miId;
      const globo = nodo('div', 'conv-globo' + (mio ? ' conv-globo-mio' : ''));
      globo.appendChild(nodo('p', 'conv-globo-texto', mensaje.contenido || ''));
      globo.appendChild(nodo('span', 'conv-globo-fecha', cuando(mensaje.created_at, true)));
      globos.appendChild(globo);
    }
    globos.scrollTop = globos.scrollHeight;
  }

  /* Los cuatro estados del hilo viven acá adentro, no en quien llama. Y el
     fallo se trata distinto según de qué pedido venga, porque son dos cosas
     distintas: si falla la carga entera, la persona se quedó sin nada y hay
     que decírselo; si falla uno de los refrescos del reloj —que corre cada pocos
     segundos y suele ser una conexión que fue y vino—, borrar la conversación
     que ya se estaba leyendo para poner un cartel rojo sería peor que callarse.
     Ese queda en la consola y se reintenta solo al próximo golpe de reloj. */
  async function traerMensajes(soloNuevos) {
    if (!abierta) return;
    const globos = contenedor.querySelector('[data-parte="globos"]');
    const desde = soloNuevos && mensajes.length
      ? mensajes[mensajes.length - 1].created_at
      : null;
    if (!desde) {
      globos.textContent = '';
      globos.appendChild(nodo('p', 'pwa-estado-bajada', frase('conversacion.cargando')));
    }
    let traidos;
    try {
      traidos = await window.ClienteDatos.mensajesDe(abierta.id, desde);
    } catch (error) {
      if (desde) { console.error('Refresco de la conversación:', error); return; }
      if (!abierta) return;
      globos.textContent = '';
      globos.appendChild(nodo('p', 'conv-error',
        textoDeError(error, frase('conversacion.error'))));
      return;
    }
    if (!abierta) return;
    if (desde) {
      if (!traidos || !traidos.length) return;
      const vistos = {};
      for (const m of mensajes) vistos[m.id] = true;
      for (const m of traidos) if (!vistos[m.id]) mensajes.push(m);
    } else {
      mensajes = traidos || [];
    }
    dibujarMensajes();
  }

  async function abrir(conversacion) {
    abierta = conversacion;
    mensajes = [];
    verHilo(true);
    contenedor.querySelector('[data-parte="otra-parte"]').textContent =
      conversacion.otra_parte || '';
    const errorEnvio = contenedor.querySelector('[data-parte="error-envio"]');
    errorEnvio.hidden = true;
    errorEnvio.textContent = '';
    // El cargando, el error y el vacío del hilo los pinta `traerMensajes`, que
    // es la que sabe si el pedido fue la carga entera o un refresco del reloj.
    await traerMensajes(false);
    arrancarReloj();
  }

  function cerrarHilo() {
    pararReloj();
    abierta = null;
    mensajes = [];
    verHilo(false);
    recargar();
  }

  function arrancarReloj() {
    pararReloj();
    reloj = window.setInterval(() => {
      traerMensajes(true).catch(() => { /* Un tropiezo del reloj no rompe la pantalla. */ });
    }, CADA_CUANTO_MS);
  }

  function pararReloj() {
    if (reloj) { window.clearInterval(reloj); reloj = null; }
  }

  async function escribir() {
    if (enviando || !abierta) return;
    const campo = contenedor.querySelector('[data-parte="campo"]');
    const boton = contenedor.querySelector('[data-parte="enviar"]');
    const errorEnvio = contenedor.querySelector('[data-parte="error-envio"]');
    const texto = (campo.value || '').trim();
    errorEnvio.hidden = true;
    if (!texto) {
      errorEnvio.textContent = frase('conversacion.mensaje_vacio');
      errorEnvio.hidden = false;
      return;
    }
    enviando = true;
    boton.disabled = true;
    boton.textContent = frase('conversacion.enviando');
    try {
      const guardado = await window.ClienteDatos.escribirMensaje(abierta.id, texto);
      campo.value = '';
      if (guardado) mensajes.push(guardado);
      dibujarMensajes();
    } catch (error) {
      errorEnvio.textContent = textoDeError(error, frase('conversacion.error_enviar'));
      errorEnvio.hidden = false;
    } finally {
      enviando = false;
      boton.disabled = false;
      boton.textContent = frase('conversacion.enviar');
    }
  }

  // ── Lo que la pantalla llama ──────────────────────────────────────────────
  async function recargar() {
    if (!contenedor) return [];
    mostrar('cargando');
    try {
      conversaciones = (await window.ClienteDatos.misConversaciones()) || [];
      dibujarLista();
    } catch (error) {
      contenedor.querySelector('[data-parte="error-texto"]').textContent =
        textoDeError(error, frase('conversacion.error'));
      mostrar('error');
    }
    return conversaciones;
  }

  const Conversaciones = {
    async montar(idContenedor, opciones) {
      contenedor = document.getElementById(idContenedor);
      if (!contenedor) throw new Error('No existe el contenedor «' + idContenedor + '»');
      lado = (opciones && opciones.lado) === 'asistente' ? 'asistente' : 'familia';
      /* Quién es el que mira, para saber de qué lado va cada globo. Si la
         sesión no se puede resolver los mensajes se dibujan todos iguales, que
         es peor pero se lee: nunca se adivina el autor por otro camino. */
      try {
        const usuario = window.Sesion ? await window.Sesion.getUser() : null;
        miId = (usuario && usuario.id) || null;
      } catch (e) { miId = null; }
      armar();
      verHilo(false);
      await recargar();
    },

    recargar,

    /* Entrar derecho a un hilo, que es lo que hace falta después de contactar a
       alguien desde un perfil o desde una postulación. Si la conversación
       todavía no está en la lista se vuelve a pedir una vez: la acaban de
       crear. */
    async abrirPorId(id) {
      if (!id || !contenedor) return false;
      let cual = conversaciones.filter((c) => c.id === id)[0];
      if (!cual) {
        await recargar();
        cual = conversaciones.filter((c) => c.id === id)[0];
      }
      if (!cual) return false;
      await abrir(cual);
      return true;
    },

    detener: pararReloj,

    /* Para las pruebas: el estado que la pantalla no debería mirar. */
    _estado() {
      return { lado, cuantas: conversaciones.length, abierta: abierta && abierta.id };
    }
  };

  if (typeof window !== 'undefined') window.Conversaciones = Conversaciones;
})();
