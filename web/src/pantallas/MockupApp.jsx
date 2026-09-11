/* ===================================================
   LA MAQUETA DE LOS PROGRAMAS DEL TELÉFONO

   Un teléfono dibujado adentro de la web, con sus cinco vistas: la de entrar,
   la de elegir con qué papel se registra, el tablero de la Familia, el chat y
   los reportes de cuidado. No es una pantalla más del sitio: es la muestra de
   cómo se ve el producto en un teléfono, y por eso viene sin barra de arriba y
   sin pie, encerrada en su propio marco.

   **Las cinco vistas siguen siendo cinco divisiones de una sola pantalla.**
   Antes eran `.app-screen` que se prendían y apagaban con una clase; acá el
   marcado es el mismo y lo que decide cuál se ve es un estado. Ninguna de las
   cinco es una dirección propia, igual que antes: quien recarga vuelve a la de
   entrar.

   **La hoja de estilos de la maqueta se pone al entrar y se saca al salir.**
   `css/mockup-app.css` es de esta pantalla y de ninguna otra —cuando era un
   archivo suelto, era la única página que la pedía—, y adentro pinta el
   `body` entero y vuelve a definir `.caregiver-card`, que otras vistas también
   usan. Dejarla puesta para siempre le cambiaría la cara a la web entera, así
   que se la trae tal cual está y se la cuelga mientras esta vista esté a la
   vista, con el mismo criterio con el que `usePestana` pone y saca el nombre de
   la pestaña. **La hoja no se tocó.**

   **Los avisos guardan la clave de la frase, no la frase.** Igual que en la
   pantalla de acceso: el cartel del fichado, el error del directorio y el de
   los reportes se guardan por su clave y se piden al dibujar, así que un cambio
   de idioma con el cartel en pantalla lo alcanza solo.

   **Lo que se ve y lo que se guarda son dos capas.** El fichado guarda
   `entrada` y `salida` en minúscula, que es como las compara la vista de
   alarmas, y el nombre que se lee sale del catálogo. El par se escribe literal,
   valor guardado contra clave de frase, para que los chequeos vean los dos.
=================================================== */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Catalogo, Texto } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';
import CampoDeClave from '../formularios/CampoDeClave.jsx';

/* La hoja de la maqueta, tal cual está en `css/`, traída como texto para poder
   colgarla y descolgarla. Ver el comentario de arriba. */
import hojaDeLaMaqueta from '../../../css/mockup-app.css?inline';

/* Lo guardado y lo visible, uno al lado del otro. Ver el comentario de arriba. */
const FRASE_DEL_FICHADO = { entrada: 'fichado.entrada', salida: 'fichado.salida' };

/* El Asistente de prueba con el que la maqueta ficha y firma sus reportes. Era
   el mismo número escrito dos veces adentro de la página. */
const ASISTENTE_DE_PRUEBA = '2197bc14-d545-4939-9a98-979e69a120dc';

/* Cuelga la hoja de la maqueta mientras esta vista esté dibujada. Va antes de
   pintar —y no después— para que el teléfono no aparezca un instante sin su
   marco. */
function useHojaDeLaMaqueta() {
  useLayoutEffect(() => {
    const etiqueta = document.createElement('style');
    etiqueta.setAttribute('data-hoja', 'maqueta');
    etiqueta.textContent = hojaDeLaMaqueta;
    document.head.appendChild(etiqueta);
    return () => { etiqueta.remove(); };
  }, []);
}

/* El cartel centrado con el que la lista de reportes dice las tres cosas que le
   pueden pasar. Es el mismo párrafo que armaba la página, con su mismo aire. */
function CartelDeReportes({ children, critico = false }) {
  return (
    <p style={{
      textAlign: 'center',
      fontSize: critico ? '12px' : '12px',
      color: critico ? 'var(--rojo-peligro-texto)' : 'var(--texto-secundario)',
      padding: '20px'
    }}>
      {children}
    </p>
  );
}

export default function MockupApp() {
  const { frase } = useFrases();
  const navegar = useNavigate();
  usePestana('maqueta.titulo_pagina');
  useHojaDeLaMaqueta();

  /* ── Cuál de las cinco vistas se ve, y el menú lateral ─────────────── */
  const [pantalla, setPantalla] = useState('intro');
  const [menuAbierto, setMenuAbierto] = useState(false);

  /* ── Quién entró, para el encabezado del menú ──────────────────────── */
  const [nombreDeQuienEntro, setNombreDeQuienEntro] = useState('');
  const [correoDeQuienEntro, setCorreoDeQuienEntro] = useState('');

  /* ── La vista de entrar ────────────────────────────────────────────── */
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  /* ── La vista de elegir papel ──────────────────────────────────────── */
  const [papelElegido, setPapelElegido] = useState(null);

  /* ── Los Asistentes publicados, con sus cuatro estados ─────────────── */
  const [recEstado, setRecEstado] = useState('cargando');
  const [recClaveDelError, setRecClaveDelError] = useState('');
  const [recFilas, setRecFilas] = useState([]);
  const [recIntento, setRecIntento] = useState(0);
  const [clienteDatos, setClienteDatos] = useState(null);

  /* ── El fichado ────────────────────────────────────────────────────── */
  const [cartelDelFichado, setCartelDelFichado] = useState({ clave: 'asistente.fichador_bajada' });
  const [fichando, setFichando] = useState(false);

  /* ── Los reportes, con sus cuatro estados ──────────────────────────── */
  const [repEstado, setRepEstado] = useState('cargando');
  const [repClaveDelError, setRepClaveDelError] = useState('');
  const [reportes, setReportes] = useState([]);

  /* ── El reporte nuevo ──────────────────────────────────────────────── */
  const [modalAbierto, setModalAbierto] = useState(false);
  const [presion, setPresion] = useState('');
  const [glucemia, setGlucemia] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [notas, setNotas] = useState('');
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  /* ── El chat ───────────────────────────────────────────────────────── */
  const [mensajes, setMensajes] = useState([]);
  const [textoDelMensaje, setTextoDelMensaje] = useState('');
  const [avisoDelChat, setAvisoDelChat] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hayMensajeNuevo, setHayMensajeNuevo] = useState(false);
  const areaDeMensajes = useRef(null);
  const canalDelChat = useRef(null);
  const proximoMensaje = useRef(0);

  /* ── Arranque: la puerta, la Prestadora, el directorio y la sesión ─── */
  useEffect(() => {
    let vigente = true;

    (async () => {
      let ClienteDatos;
      let Sesion;
      try {
        ({ ClienteDatos, Sesion } = await conLaBase());
      } catch (err) {
        console.error('Arranque de la pantalla:', err);
        return;
      }
      if (!vigente) return;
      setClienteDatos(ClienteDatos);

      try {
        await ClienteDatos.initTenant();
      } catch (err) {
        console.error('Arranque de la pantalla:', err);
      }

      /* Si la sesión guardada no se puede rescatar —el servidor no contesta, el
         permiso venció— queda a la vista la pantalla de acceso, que es la
         verdad: no hay sesión. Lo que no puede pasar es que el fallo se pierda
         sin dejar rastro. */
      try {
        const sesion = await Sesion.getSession();
        if (!vigente) return;
        if (sesion) {
          setCorreoDeQuienEntro(sesion.user.email);
          setNombreDeQuienEntro(
            (sesion.user.user_metadata?.full_name || sesion.user.email.split('@')[0]).toUpperCase());
          irA('dashboard');
        }
      } catch (err) {
        console.error('Rescate de la sesión guardada:', err);
      }
    })();

    return () => { vigente = false; };
    // Corre una sola vez, como el arranque de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Los Asistentes que se pueden mostrar salen de `directorio`: gente con el
     legajo validado por la Prestadora, con la publicación autorizada y con los
     papeles que frenan la publicación comprobados (migración 0061). */
  useEffect(() => {
    let vigente = true;
    setRecEstado('cargando');

    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const filas = await ClienteDatos.listarDirectorio();
        await Catalogo.cargar();
        if (!vigente) return;
        setRecFilas(filas || []);
        setRecEstado(filas && filas.length ? 'listo' : 'vacio');
      } catch (err) {
        if (!vigente) return;
        setRecClaveDelError(Texto.claveDeError(err, 'traer los Asistentes'));
        setRecEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [recIntento]);

  /* Un mensaje nuevo baja la conversación hasta el final, que es donde estaba
     mirando quien escribe. */
  useEffect(() => {
    const area = areaDeMensajes.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [mensajes]);

  /* Y al irse de la pantalla se corta la escucha. Cuando esto era una página
     suelta lo hacía el navegador al cerrarla; acá la vista se va y el programa
     sigue, así que hay que cortarla. */
  useEffect(() => () => {
    if (canalDelChat.current) canalDelChat.current.unsubscribe();
  }, []);

  /* ── NAVEGACIÓN ENTRE PANTALLAS DE LA APP ─────────────────────────── */
  function irA(cual) {
    setPantalla(cual);
    setMenuAbierto(false);
    if (cual === 'reportes') cargarReportes();
    if (cual === 'chat') {
      setHayMensajeNuevo(false);
      initChat();
    }
  }

  /* ── LOS REPORTES, DESDE LA BASE ──────────────────────────────────── */
  async function cargarReportes() {
    setRepEstado('cargando');
    try {
      const { ClienteDatos } = await conLaBase();
      const logs = await ClienteDatos.getReportes();
      setReportes(logs || []);
      setRepEstado(logs && logs.length ? 'listo' : 'vacio');
    } catch (err) {
      setRepClaveDelError(Texto.claveDeError(err, 'cargar los reportes'));
      setRepEstado('error');
    }
  }

  /* ── REGISTRAR UN REPORTE NUEVO ───────────────────────────────────── */
  /* «todo botón que dispara una operación se apaga»: guardar apaga el botón
     mientras la novedad viaja. Dos clics eran dos renglones idénticos en los
     reportes, y ninguno de los dos se puede borrar desde la pantalla. */
  async function guardarReporte() {
    if (!notas.trim()) {
      alert(frase('reporte.falta_texto'));
      return;
    }

    setGuardandoReporte(true);
    try {
      const { ClienteDatos } = await conLaBase();
      await ClienteDatos.registrarReporte({
        presion,
        glucemia,
        medicamentos,
        notas,
        // Usamos el ID del Asistente de prueba registrado en la base
        caregiverId: ASISTENTE_DE_PRUEBA
      });
      alert(frase('reporte.guardado'));
      setModalAbierto(false);

      // Limpiar formulario
      setPresion('');
      setGlucemia('');
      setMedicamentos('');
      setNotas('');

      cargarReportes();
    } catch (err) {
      alert(frase(Texto.claveDeError(err, 'guardar la novedad')));
    } finally {
      setGuardandoReporte(false);
    }
  }

  /* ── FICHADO GPS DE ASISTENCIA ────────────────────────────────────── */
  /* «todo botón que dispara una operación se apaga»: mientras un fichado está
     en el aire, los dos botones se apagan. No es un detalle: esperar al GPS
     puede tardar varios segundos, en ese rato el botón no da ninguna señal de
     estar haciendo algo, y dos toques eran dos fichados en la misma hora. Un
     fichado repetido no se borra desde ninguna pantalla. */
  async function ficharGPS(tipo) {
    const claveDelTipo = FRASE_DEL_FICHADO[tipo];
    setCartelDelFichado({ clave: 'fichado.buscando' });

    if (!navigator.geolocation) {
      alert(frase('fichado.sin_soporte'));
      setCartelDelFichado({ clave: 'fichado.sin_soporte_estado' });
      return;
    }

    setFichando(true);
    navigator.geolocation.getCurrentPosition(async (posicion) => {
      const lat = posicion.coords.latitude;
      const lng = posicion.coords.longitude;

      setCartelDelFichado({ clave: 'fichado.registrando', tipo: claveDelTipo });

      try {
        const { ClienteDatos } = await conLaBase();
        await ClienteDatos.registrarFichadoGPS({
          caregiverId: ASISTENTE_DE_PRUEBA,
          lat: lat,
          lng: lng,
          event_type: tipo
        });
        alert(frase('fichado.registrado', {
          tipo: frase(claveDelTipo), lat: lat.toFixed(5), lng: lng.toFixed(5)
        }));
        setCartelDelFichado({
          clave: 'fichado.ultimo', tipo: claveDelTipo, hora: Texto.horaCorta(new Date())
        });
      } catch (err) {
        alert(frase(Texto.claveDeError(err, 'registrar el fichado')));
        setCartelDelFichado({ clave: 'fichado.error_estado' });
      } finally {
        setFichando(false);
      }
    }, () => {
      alert(frase('fichado.permiso_denegado'));
      setCartelDelFichado({ clave: 'fichado.permiso_denegado_estado' });
      setFichando(false);
    });
  }

  /* ── ENTRAR ───────────────────────────────────────────────────────── */
  async function entrar() {
    const elCorreo = correo.trim();
    if (!elCorreo || !clave) { alert(frase('acceso.faltan_datos')); return; }

    setEntrando(true);
    try {
      const { Sesion } = await conLaBase();
      const usuario = await Sesion.login(elCorreo, clave);
      setCorreoDeQuienEntro(usuario.email);
      setNombreDeQuienEntro(
        (usuario.user_metadata?.full_name || usuario.email.split('@')[0]).toUpperCase());

      /* A dónde va cada quien después de entrar. El papel sale de `profiles`,
         por `Sesion.perfil()`, y nunca de los metadatos de la cuenta: esos los
         escribe quien se registra, así que un papel leído de ahí sería un papel
         que la persona se dio a sí misma. La base ya lo dice de su lado
         —`supabase/migrations/0005_acceso_por_sesion.sql:66`, donde
         `coordinador` no está entre los papeles que se pueden pedir al
         registrarse—; acá se dice del lado de la pantalla. */
      const perfil = await Sesion.perfil();
      if (perfil && perfil.role === 'coordinador') navegar('/panel-prestadora');
      else irA('dashboard');
    } catch (err) {
      alert(frase(Texto.claveDeError(err, 'iniciar sesión')));
    } finally {
      setEntrando(false);
    }
  }

  /* ── SALIR ────────────────────────────────────────────────────────── */
  /* El botón se apaga mientras se cierra la sesión. Y los cuatro estados: si no
     se pudo cerrar, se dice —antes el error no llegaba a ninguna parte y la
     persona se quedaba mirando el menú, creyendo que había salido—. */
  async function salir() {
    if (!window.confirm(frase('comun.confirmar_salir'))) return;
    setCerrandoSesion(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.logout();
      irA('intro');
    } catch (err) {
      alert(frase(Texto.claveDeError(err, 'cerrar la sesión')));
    } finally {
      setCerrandoSesion(false);
    }
  }

  /* ── EL CHAT ──────────────────────────────────────────────────────── */
  function sumarMensaje(msg, esPropio) {
    const cual = proximoMensaje.current++;
    setMensajes((antes) => antes.concat({ cual, msg, esPropio, noEnviado: false }));
    return cual;
  }

  // Un mensaje que no llegó no puede quedar igual que uno que llegó.
  function marcarNoEnviado(cual) {
    setMensajes((antes) => antes.map(
      (uno) => (uno.cual === cual ? { ...uno, noEnviado: true } : uno)));
  }

  async function initChat() {
    const { ClienteDatos, Sesion } = await conLaBase();
    const sesion = await Sesion.getSession();
    const quienSoy = sesion ? sesion.user.id : 'demo-user';

    // Crear o recuperar conversacion para demo
    // Se usa aviso_id del primer aviso activo, o null en modo demo
    let conversaciones = [];
    try {
      conversaciones = await ClienteDatos.getMensajes();
    } catch { /* sin mensajes previos, ok */ }

    conversaciones.forEach((msg) => sumarMensaje(msg, msg.author_id === quienSoy));

    // Subscripción Realtime a nuevos mensajes
    if (canalDelChat.current) canalDelChat.current.unsubscribe();
    canalDelChat.current = Sesion.subscribeToTable('messages', undefined, (nuevo) => {
      sumarMensaje(nuevo, nuevo.author_id === quienSoy);
      setHayMensajeNuevo(true);
    });
  }

  async function enviarMensaje() {
    const texto = textoDelMensaje.trim();
    if (!texto) return;

    /* LA TERCERA PUERTA. El chat es para conocerse antes de contratar; si por
       acá pasa un teléfono, un correo o un domicilio, la conversación se sigue
       por afuera y las otras dos reglas de `docs/CATALOGO.md` no sirven de
       nada. Se revisa antes de vaciar el campo, para que el mensaje no se
       pierda y se pueda corregir; y antes de dibujar la burbuja, porque una
       burbuja que aparece y desaparece parece un error del programa. */
    await import('../../../js/contacto.js');
    const revision = await window.Contacto.revisar(texto);
    if (!revision.pasa) {
      const porQue = revision.motivos.map((m) => m.motivo).filter(Boolean).join(' ');
      setAvisoDelChat(porQue ? revision.aviso + ' ' + porQue : revision.aviso);
      const campo = document.getElementById('chat-input');
      if (campo) campo.focus();
      return;
    }
    setAvisoDelChat('');

    setTextoDelMensaje('');
    const { ClienteDatos, Sesion } = await conLaBase();
    const sesion = await Sesion.getSession();
    const quienSoy = sesion ? sesion.user.id : 'demo-user-' + Date.now();
    const msg = { contenido: texto, author_id: quienSoy, created_at: new Date().toISOString() };
    /* Se muestra en el acto, sin esperar al servidor: escribir y quedarse
       mirando es lo que hace sentir lento un chat. Pero entonces hay que decir
       después si no se pudo guardar, porque en pantalla ya parece enviado. */
    const cual = sumarMensaje(msg, true);
    // «todo botón que dispara una operación se apaga»: mientras el mensaje
    // viaja, el botón se apaga.
    setEnviando(true);
    try {
      /* Un pedido que vuelve con 401 no lanza ningún error por su cuenta: la
         promesa se cumple igual, con `ok` en falso, y un mensaje rechazado se
         quedaría en pantalla como si hubiera salido —hoy `messages` contesta
         401 a quien no inició sesión, así que sale mal siempre—. Quien mira el
         `ok` es `_supabaseRequest`, que convierte eso en un error; por eso acá
         alcanza con dejar que el `catch` lo agarre. */
      await ClienteDatos.enviarMensaje(texto, quienSoy);
    } catch (e) {
      console.warn('Chat, envío del mensaje:', e);
      marcarNoEnviado(cual);
    } finally {
      setEnviando(false);
    }
  }

  /* ── LO QUE MUESTRA UNA TARJETA DE ASISTENTE ──────────────────────── */
  function loQueMuestra(fila) {
    const tipo = Catalogo.etiquetaSiExiste('tipo_asistente', fila.profession);
    const zona = Catalogo.etiquetaSiExiste('zona', fila.zone);
    const foto = clienteDatos ? clienteDatos.urlDeFotoPublica(fila.foto) : null;
    return {
      nombre: fila.full_name || '',
      linea: [tipo, zona].filter(Boolean).join(' · '),
      foto,
      inicial: (fila.full_name || '?').trim().charAt(0).toUpperCase(),
      precio: fila.hourly_rate
        ? Texto.importe(fila.hourly_rate, fila.moneda_valor_hora) + ' ' + frase('directorio.por_hora')
        : ''
    };
  }

  /* El cartel del fichado sale de su clave, y sus huecos también: así el texto
     acompaña al idioma aunque ya esté escrito en pantalla. */
  const textoDelFichado = frase(cartelDelFichado.clave, {
    ...(cartelDelFichado.tipo ? { tipo: frase(cartelDelFichado.tipo) } : null),
    ...(cartelDelFichado.hora ? { hora: cartelDelFichado.hora } : null)
  });

  const claseDePantalla = (cual, extra = '') =>
    'app-screen' + (extra ? ' ' + extra : '') + (pantalla === cual ? ' active' : '');

  /* La barra de abajo la llevan tres vistas, y no son iguales: la de los
     reportes viene sin la pestaña de mensajes —cuatro botones, no cinco—, y
     sólo la del tablero trae el punto rojo del mensaje sin leer. Se repite acá
     tal cual estaba en cada una. */
  function BarraDeAbajo({ activa, conSenal = false, conMensajes = true }) {
    return (
      <div className="bottom-tab-bar">
        <a className={'tab-item' + (activa === 'dashboard' ? ' active' : '')}
          onClick={() => irA('dashboard')}>
          <i className="fas fa-home"></i>
          <span>{frase('nav.inicio')}</span>
        </a>
        <Link className="tab-item" to="/registrar-familia">
          <i className="fas fa-plus-circle"></i>
          <span>{frase('familia.tab_publicar')}</span>
        </Link>
        <Link className="tab-item" to="/directorio">
          <i className="fas fa-users"></i>
          <span>{frase('familia.asistentes')}</span>
        </Link>
        {conMensajes && (
        <a className={'tab-item' + (activa === 'chat' ? ' active' : '')}
          id={conSenal ? 'tab-chat' : undefined}
          onClick={() => irA('chat')}>
          <i className="fas fa-comments"></i>
          <span>{frase('nav.mensajes')}</span>
          {conSenal && (
            <span className="oculto" id="chat-badge"
              style={{
                position: 'absolute', top: '-2px', right: '18px',
                background: 'var(--rojo-peligro)', width: '8px', height: '8px',
                borderRadius: '50%',
                display: hayMensajeNuevo ? 'block' : undefined
              }}></span>
          )}
        </a>
        )}
        <a className={'tab-item' + (activa === 'reportes' ? ' active' : '')}
          onClick={() => irA('reportes')}>
          <i className="fas fa-book-medical"></i>
          <span>{frase('familia.tab_reportes')}</span>
        </a>
      </div>
    );
  }

  return (
    <div id="phone-container">

      {/* DRAWER OVERLAY */}
      <div className={'drawer-overlay' + (menuAbierto ? ' open' : '')} id="overlay"
        onClick={() => setMenuAbierto(false)}></div>

      {/* DRAWER SIDEBAR */}
      <div className={'sidebar-drawer' + (menuAbierto ? ' open' : '')} id="drawer">
        <div className="drawer-header">
          <img src="/assets/images/retrato_generico.svg" alt={frase('asistente.sin_foto')} />
          {/* Nacen vacíos: el nombre y el correo son los de la sesión. Antes
              traían un nombre y un correo inventados, que hasta que la sesión
              llegara se leían como si fueran los de quien mira. */}
          <h4 id="menu-user-name">{nombreDeQuienEntro}</h4>
          <p id="menu-user-email">{correoDeQuienEntro}</p>
        </div>
        <div className="drawer-menu">
          <a className="drawer-menu-item" onClick={() => irA('dashboard')}>
            <i className="fas fa-home"></i> <span>{frase('nav.inicio')}</span>
          </a>
          <Link className="drawer-menu-item" to="/directorio">
            <i className="fas fa-search"></i> <span>{frase('familia.buscar_asistente')}</span>
          </Link>
          <a className="drawer-menu-item" onClick={() => irA('reportes')}>
            <i className="fas fa-book-medical"></i> <span>{frase('familia.reportes_titulo')}</span>
          </a>
          <Link className="drawer-menu-item" to="/cursos">
            <i className="fas fa-graduation-cap"></i> <span>{frase('pie.cursos')}</span>
          </Link>
          <Link className="drawer-menu-item" to="/soporte-remoto">
            <i className="fas fa-headset"></i> <span>{frase('acompanamiento.titulo')}</span>
          </Link>
          <div style={{ borderTop: '1px solid var(--borde-card)', margin: '8px 0' }}></div>
          <button type="button" className="drawer-menu-item color-peligro" id="btn-logout"
            disabled={cerrandoSesion} onClick={salir}>
            {cerrandoSesion
              ? frase('familia.cerrando_sesion')
              : (<><i className="fas fa-sign-out-alt color-peligro"></i>{' '}
                <span>{frase('asistente.menu_cerrar_sesion')}</span></>)}
          </button>
        </div>
        <div className="p-16 centrar-texto texto-10 color-secundario borde-arriba">
          <span>{frase('pie.sello_producto')}</span>{' '}
          <strong className="color-marca-acento">{frase('comun.producto')}</strong>
        </div>
      </div>

      {/* 1. VISTA: INTRO / LOGIN */}
      <div className={claseDePantalla('intro')} id="screen-intro">
        <div className="intro-logo-container">
          <img src="/assets/images/logotipo.png" className="tenant-logo"
            alt={frase('asistente.logo_prestadora')} />
          <h2 className="tenant-name">{frase('comun.organizacion')}</h2>
        </div>

        <div className="login-card">
          <div className="input-wrapper">
            <input type="email" id="login-email" placeholder={frase('acceso.correo')} required
              value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="input-wrapper">
            <i className="fas fa-lock"></i>
            {/* El botón de mostrar y ocultar viene con el campo: toda
                contraseña de esta web se pide con él. */}
            <CampoDeClave id="login-pass" autoComplete="current-password" required
              value={clave} onChange={(e) => setClave(e.target.value)} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            {/* Nunca llevó a ninguna parte: en la maqueta el enlace está
                dibujado y no va a la recuperación de la clave. Queda igual. */}
            <a href="#" style={{
              fontSize: '11px', color: 'var(--texto-secundario)',
              textDecoration: 'none', fontWeight: 700
            }}>{frase('acceso.olvide')}</a>
          </div>

          <button type="button" className="btn-login" id="btn-action-login"
            disabled={entrando} onClick={entrar}>
            {frase(entrando ? 'acceso.entrando' : 'acceso.entrar')}
          </button>

          <div style={{
            textAlign: 'center', marginTop: '20px', fontSize: '12px',
            color: 'var(--texto-secundario)'
          }}>
            <span>{frase('asistente.sin_cuenta')}</span>{' '}
            <a href="#" id="link-go-signup"
              onClick={(e) => { e.preventDefault(); irA('signup'); }}
              style={{
                color: 'var(--marca-prestadora-acento)', fontWeight: 700,
                textDecoration: 'none'
              }}>{frase('maqueta.registrarse')}</a>
          </div>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 'auto', fontSize: '10px',
          color: 'var(--texto-secundario)', paddingTop: '20px'
        }}>
          <span>{frase('pie.sello_producto')}</span>{' '}
          <strong className="color-marca-acento">{frase('comun.producto')}</strong>
        </div>
      </div>

      {/* 2. VISTA: SELECCIÓN DE ROL / SIGNUP */}
      <div className={claseDePantalla('signup')} id="screen-signup">
        <div className="app-header">
          <button className="btn-back" id="btn-signup-back" onClick={() => irA('intro')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1>{frase('maqueta.registrarse')}</h1>
          <div className="ancho-24"></div>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <h3 style={{
            fontSize: '18px', fontWeight: 800,
            color: 'var(--marca-prestadora)', margin: '0 0 6px 0'
          }}>{frase('maqueta.como_ingresar')}</h3>
          <p className="texto-12 color-secundario m-0">{frase('maqueta.elija_cuenta')}</p>
        </div>

        <div className={'role-card' + (papelElegido === 'familiar' ? ' active' : '')}
          data-role="familiar" onClick={() => setPapelElegido('familiar')}>
          <h4><i className="fas fa-users color-marca-acento"></i>{' '}
            <span>{frase('maqueta.rol_familiar')}</span></h4>
          <p>{frase('maqueta.rol_familiar_texto')}</p>
          <div className="circle-select"></div>
        </div>

        <div className={'role-card' + (papelElegido === 'asistente' ? ' active' : '')}
          data-role="asistente" onClick={() => setPapelElegido('asistente')}>
          <h4><i className="fas fa-user-md color-marca"></i>{' '}
            <span>{frase('maqueta.rol_asistente')}</span></h4>
          <p>{frase('maqueta.rol_asistente_texto')}</p>
          <div className="circle-select"></div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
          <button type="button" className="btn-login oculto" id="btn-signup-confirm"
            style={{
              background: 'var(--marca-prestadora)', boxShadow: 'none',
              display: papelElegido ? 'block' : undefined
            }}
            onClick={() => navegar(
              papelElegido === 'asistente' ? '/registrar-asistente' : '/registrar-familia')}>
            {frase('maqueta.confirmar_rol')}
          </button>
        </div>
      </div>

      {/* 3. VISTA: DASHBOARD PRINCIPAL DE LA FAMILIA */}
      <div className={claseDePantalla('dashboard', 'pb-64')} id="screen-dashboard">

        {/* CABECERA */}
        <div className="dashboard-header">
          <button className="btn-back texto-20" id="btn-open-menu"
            onClick={() => setMenuAbierto(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/assets/images/logotipo.png" className="tenant-logo"
              style={{ height: '24px' }} alt={frase('asistente.logo_prestadora')} />
            <span className="tenant-name texto-14 peso-800 color-marca">
              {frase('comun.organizacion')}
            </span>
          </div>
          <div className="relativo mano">
            <i className="fas fa-bell texto-18 color-secundario"></i>
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--rojo-peligro)', width: '8px', height: '8px',
              borderRadius: '50%'
            }}></span>
          </div>
        </div>

        {/* METRICAS / VERIFICACIONES */}
        <div className="verification-widget mt-16">
          <i className="fas fa-exclamation-triangle"></i>
          <div className="flex-1">
            <h5>{frase('maqueta.verificaciones_titulo')}</h5>
            <p>{frase('maqueta.verificaciones_estado')}</p>
          </div>
          <i className="fas fa-chevron-right"
            style={{ fontSize: '12px', color: 'var(--tono-atencion-texto)' }}></i>
        </div>

        {/* WIDGET FICHADO GPS */}
        <div style={{
          background: 'var(--tono-info-fondo)', border: '1px solid var(--tono-info-borde)',
          borderRadius: '16px', padding: '14px 16px', margin: '0 16px 16px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="flex alinear-centro gap-12">
            <i className="fas fa-map-marker-alt color-info texto-20"></i>
            <div>
              <h5 className="m-0 texto-13 peso-700 color-info">{frase('asistente.fichador')}</h5>
              <p id="gps-status" className="m-solo-arriba-2 texto-11 color-info">
                {textoDelFichado}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button id="btn-gps-in" disabled={fichando} onClick={() => ficharGPS('entrada')}
              style={{
                background: 'var(--azul-medio)', color: 'var(--texto-sobre-color)',
                border: 'none', padding: '6px 10px', borderRadius: '8px',
                fontSize: '10px', fontWeight: 700, cursor: 'pointer'
              }}>{frase('fichado.entrada')}</button>
            <button id="btn-gps-out" disabled={fichando} onClick={() => ficharGPS('salida')}
              style={{
                background: 'var(--rojo-peligro)', color: 'var(--texto-sobre-color)',
                border: 'none', padding: '6px 10px', borderRadius: '8px',
                fontSize: '10px', fontWeight: 700, cursor: 'pointer'
              }}>{frase('fichado.salida')}</button>
          </div>
        </div>

        {/* GRID DE SERVICIOS (7 BOTONES) */}
        <div className="grid-services">
          <Link className="service-btn" to="/directorio">
            <div className="icon-box fondo-azul-oscuro"><i className="fas fa-user-search"></i></div>
            <span>{frase('familia.buscar_asistente')}</span>
          </Link>
          <Link className="service-btn" to="/soporte-remoto">
            <div className="icon-box fondo-azul-medio"><i className="fas fa-headset"></i></div>
            <span>{frase('acompanamiento.titulo')}</span>
          </Link>
          <div className="service-btn" onClick={() => irA('reportes')}>
            <div className="icon-box" style={{ background: 'var(--verde-exito)' }}>
              <i className="fas fa-book-medical"></i>
            </div>
            <span>{frase('familia.tab_reportes')}</span>
          </div>
          <Link className="service-btn" to="/cursos">
            <div className="icon-box" style={{ background: 'var(--naranja-alerta)' }}>
              <i className="fas fa-graduation-cap"></i>
            </div>
            <span>{frase('pie.cursos')}</span>
          </Link>
          <div className="service-btn" onClick={() => alert(frase('maqueta.vida_activa_en_obra'))}>
            <div className="icon-box fondo-azul-medio"><i className="fas fa-running"></i></div>
            <span>{frase('maqueta.servicio_vida_activa')}</span>
          </div>
          <div className="service-btn" onClick={() => alert(frase('maqueta.gestor_contactando'))}>
            <div className="icon-box fondo-azul-medio"><i className="fas fa-user-tie"></i></div>
            <span>{frase('maqueta.servicio_gestor')}</span>
          </div>
          <div className="service-btn" onClick={() => alert(frase('maqueta.productos_catalogo'))}>
            <div className="icon-box fondo-azul-medio"><i className="fas fa-shopping-cart"></i></div>
            <span>{frase('maqueta.servicio_productos')}</span>
          </div>
        </div>

        {/* ASISTENTES PUBLICADOS */}
        {/* Se llamaba «Cuidadores recomendados» y no había ninguna recomendación
            detrás: las dos tarjetas de ejemplo eran nombres escritos a mano con
            un porcentaje de afinidad que no calculaba nadie. Ahora salen de
            `directorio`, la misma vista que el directorio. */}
        <div className="section-title">
          <span>{frase('familia.asistentes')}</span>
          <Link to="/directorio">{frase('familia.ver_todos')}</Link>
        </div>

        {recEstado === 'cargando' && (
          <div className="pwa-estado" id="rec-cargando">{frase('directorio.cargando')}</div>
        )}

        {recEstado === 'error' && (
          <div className="pwa-estado" id="rec-error">
            <p id="rec-error-texto">{frase(recClaveDelError)}</p>
            <button type="button" className="btn btn-primario" id="rec-reintentar"
              onClick={() => setRecIntento((cuantos) => cuantos + 1)}>
              {frase('acceso.reintentar')}
            </button>
          </div>
        )}

        {recEstado === 'vacio' && (
          <div className="pwa-estado" id="rec-vacio">
            <p>{frase('directorio.vacio')}</p>
            <p className="pwa-estado-bajada">{frase('directorio.vacio_bajada')}</p>
          </div>
        )}

        {recEstado === 'listo' && (
          <div className="horizontal-slider" id="recommended-caregivers-list">
            {recFilas.map((fila) => {
              const muestra = loQueMuestra(fila);
              return (
                <Link className="caregiver-card" key={fila.id}
                  to={'/perfil?id=' + encodeURIComponent(fila.id)}>
                  {muestra.foto
                    ? <img src={muestra.foto} alt="" />
                    : <div className="card-inicial">{muestra.inicial}</div>}
                  <h5>{muestra.nombre}</h5>
                  {muestra.linea && <p>{muestra.linea}</p>}
                  {muestra.precio && <span className="card-precio">{muestra.precio}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* CURSOS RECOMENDADOS */}
        <div className="section-title">
          <span>{frase('maqueta.cursos_titulo')}</span>
          <Link to="/cursos">{frase('maqueta.cursos_explorar')}</Link>
        </div>

        <div className="horizontal-slider">
          <Link to="/cursos" className="caregiver-card"
            style={{ width: '160px', minWidth: '160px', textAlign: 'left' }}>
            <h6 className="m-0 texto-11 color-marca-acento mayusculas">
              {frase('maqueta.curso_gratuito')}
            </h6>
            <h5 style={{
              margin: '4px 0 0 0', fontSize: '12px', whiteSpace: 'normal',
              height: '32px', overflow: 'hidden'
            }}>{frase('maqueta.curso_alzheimer')}</h5>
            <span className="texto-9 color-secundario peso-700">
              <i className="far fa-clock"></i>{' '}
              <span>{frase('maqueta.curso_horas', { cuantas: 4 })}</span>
            </span>
          </Link>
          <Link to="/cursos" className="caregiver-card"
            style={{ width: '160px', minWidth: '160px', textAlign: 'left' }}>
            <h6 className="m-0 texto-11 color-marca-acento mayusculas">
              {frase('cursos.academia')}
            </h6>
            <h5 style={{
              margin: '4px 0 0 0', fontSize: '12px', whiteSpace: 'normal',
              height: '32px', overflow: 'hidden'
            }}>{frase('maqueta.curso_rcp')}</h5>
            <span className="texto-9 color-secundario peso-700">
              <i className="far fa-clock"></i>{' '}
              <span>{frase('maqueta.curso_horas', { cuantas: 8 })}</span>
            </span>
          </Link>
        </div>

        {/* FOOTER DISCRETO */}
        <div style={{
          textAlign: 'center', padding: '24px 0', fontSize: '10px',
          color: 'var(--texto-secundario)'
        }}>
          <span>{frase('pie.sello_producto')}</span>{' '}
          <strong className="color-marca-acento">{frase('comun.producto')}</strong>
        </div>

        <BarraDeAbajo activa="dashboard" conSenal />
      </div>

      {/* 5. VISTA: CHAT EN TIEMPO REAL */}
      <div className={claseDePantalla('chat', 'oculto')} id="screen-chat"
        style={{ paddingBottom: '64px', flexDirection: 'column' }}>
        <div className="app-header">
          <button className="btn-back" onClick={() => irA('dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1><i className="fas fa-comments color-marca-acento"></i>{' '}
            <span>{frase('maqueta.chat_titulo')}</span></h1>
          <div className="ancho-24"></div>
        </div>

        {/* Burbuja de info de la asistente activa */}
        <div style={{
          background: 'var(--superficie-hover)', padding: '12px 16px', display: 'flex',
          alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--borde-card)'
        }}>
          <img src="/assets/images/perfil_maria.png" alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/assets/images/retrato_generico.svg';
            }}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <p id="chat-contact-name" className="m-0 texto-13 peso-800 color-titulo">
              {frase('maqueta.chat_contacto')}
            </p>
            <p id="chat-contact-status" className="m-0 texto-11 color-exito">
              {frase('maqueta.chat_en_linea')}
            </p>
          </div>
        </div>

        {/* Área de mensajes */}
        <div id="chat-messages-area" ref={areaDeMensajes}
          style={{
            flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
            flexDirection: 'column', gap: '10px', background: 'var(--fondo-app)'
          }}>
          <div style={{
            textAlign: 'center', fontSize: '11px',
            color: 'var(--texto-secundario)', padding: '8px 0'
          }}>{frase('maqueta.chat_inicio')}</div>

          {mensajes.map(({ cual, msg, esPropio, noEnviado }) => (
            <div key={cual}
              style={{ display: 'flex', justifyContent: esPropio ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '70%', padding: '10px 13px',
                borderRadius: esPropio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: esPropio ? 'var(--marca-prestadora)' : 'var(--superficie)',
                color: esPropio ? 'var(--texto-sobre-color)' : 'var(--texto-titulo)',
                fontSize: '13px', lineHeight: 1.4, boxShadow: 'var(--sombra-suave)',
                opacity: noEnviado ? 0.6 : undefined
              }}>
                {msg.contenido || msg.content || ''}
                <div style={{
                  fontSize: '9px', opacity: 0.6, marginTop: '4px', textAlign: 'right'
                }}>{Texto.horaCorta(msg.created_at)}</div>
                {noEnviado && (
                  <div style={{
                    fontSize: '10px', color: 'var(--rojo-peligro-texto)',
                    textAlign: 'right', marginTop: '4px'
                  }}>{frase('conversacion.error_enviar')}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Por qué no salió el mensaje. Vive fuera del área de mensajes a
            propósito: el mensaje no se envió, así que no puede aparecer como
            una burbuja más. */}
        <div className="oculto" id="chat-aviso" role="status"
          style={{
            padding: '10px 14px', background: 'var(--tono-atencion-fondo)',
            color: 'var(--tono-atencion-texto)',
            borderTop: '1px solid var(--tono-atencion-borde)',
            fontSize: '12px', lineHeight: 1.45,
            display: avisoDelChat ? 'block' : 'none'
          }}>{avisoDelChat}</div>

        {/* Input de mensaje */}
        <div style={{
          padding: '10px 12px', background: 'var(--superficie)',
          borderTop: '1px solid var(--borde-card)', display: 'flex',
          alignItems: 'center', gap: '8px'
        }}>
          <input type="text" id="chat-input" placeholder={frase('conversacion.escribir_lugar')}
            value={textoDelMensaje}
            onChange={(e) => setTextoDelMensaje(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') enviarMensaje(); }}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: '20px',
              border: '1.5px solid var(--borde-card)', fontSize: '13px', outline: 'none'
            }} />
          <button id="chat-send-btn" disabled={enviando} onClick={enviarMensaje}
            style={{
              background: 'var(--marca-prestadora)', color: 'var(--texto-sobre-color)',
              border: 'none', width: '36px', height: '36px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
            <i className="fas fa-paper-plane texto-14"></i>
          </button>
        </div>

        <BarraDeAbajo activa="chat" />
      </div>

      {/* 4. VISTA: REPORTES DE CUIDADO */}
      <div className={claseDePantalla('reportes', 'pb-64')} id="screen-reportes">
        <div className="app-header">
          <button className="btn-back" onClick={() => irA('dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1>{frase('familia.reportes_titulo')}</h1>
          <button className="btn-back" onClick={() => setModalAbierto(true)}>
            <i className="fas fa-plus"></i>
          </button>
        </div>

        <div className="reportes-header">
          <h3 className="m-0 texto-16">{frase('maqueta.demo_paciente')}</h3>
          <div className="reportes-paciente">
            <img src="/assets/images/retrato_generico.svg" alt={frase('asistente.sin_foto')} />
            <div>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                {frase('maqueta.demo_diagnostico')}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
                {frase('maqueta.demo_asistente')}
              </p>
            </div>
          </div>
        </div>

        {/* HISTORIAL DIARIO DINÁMICO */}
        <div className="timeline-log" id="timeline-log-list">
          {repEstado === 'cargando' && (
            <CartelDeReportes>{frase('reporte.cargando')}</CartelDeReportes>
          )}

          {repEstado === 'vacio' && (
            <CartelDeReportes>{frase('familia.reportes_vacio')}</CartelDeReportes>
          )}

          {repEstado === 'error' && (
            <CartelDeReportes critico>{frase(repClaveDelError)}</CartelDeReportes>
          )}

          {repEstado === 'listo' && reportes.map((log, cual) => {
            let iconClass = 'fa-check';
            if (log.blood_pressure) iconClass = 'fa-heartbeat';
            else if (log.glycemia) iconClass = 'fa-stethoscope';

            const hora = log.created_at
              ? Texto.horaCorta(log.created_at)
              : frase('reporte.recien');
            const titulo = log.blood_pressure
              ? frase('reporte.tipo_signos')
              : frase('reporte.tipo_nota');

            return (
              <div className="log-item" key={log.id || cual}>
                <div className="log-dot">
                  <i className={'fas ' + iconClass}
                    style={{ fontSize: '8px', color: 'var(--marca-prestadora-acento)' }}></i>
                </div>
                <div className="log-content">
                  <span className="time">{hora}</span>
                  <h5>{titulo}</h5>
                  <p>{log.daily_notes}</p>
                  {log.blood_pressure && (
                    <p style={{
                      marginTop: '4px', fontSize: '11px', color: 'var(--azul-medio-texto)'
                    }}>
                      {'🩺 ' + frase('reporte.presion') + ': ' + log.blood_pressure
                        + ' | ' + frase('reporte.glucemia') + ': '
                        + (log.glycemia || frase('reporte.sin_dato'))}
                    </p>
                  )}
                  {log.medications_administered && (
                    <p style={{
                      marginTop: '2px', fontSize: '10px', color: 'var(--verde-exito-texto)'
                    }}>
                      {'💊 ' + frase('reporte.medicamentos') + ': '
                        + log.medications_administered}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <BarraDeAbajo activa="reportes" conMensajes={false} />
      </div>

      {/* MODAL: UN REPORTE NUEVO */}
      <div className="oculto" id="modal-reporte"
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'var(--velo-modal)', zIndex: 300, justifyContent: 'center',
          alignItems: 'center', display: modalAbierto ? 'flex' : 'none'
        }}>
        <div style={{
          background: 'var(--superficie)', width: '90%', maxWidth: '360px', padding: '20px',
          borderRadius: '20px', boxShadow: 'var(--sombra-media)', boxSizing: 'border-box'
        }}>
          <h4 style={{
            margin: '0 0 16px 0', color: 'var(--marca-prestadora)', fontSize: '16px',
            fontWeight: 800, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{frase('reporte.titulo')}</span>
            <button type="button" onClick={() => setModalAbierto(false)}
              aria-label={frase('reporte.cerrar')}
              className="sin-fondo sin-borde texto-20 mano">
              <span aria-hidden="true">&times;</span>
            </button>
          </h4>
          <div className="form-group mb-12">
            <label className="texto-11 peso-700">
              {frase('reporte.presion')}
            </label>
            <input type="text" id="bit-presion" placeholder={frase('reporte.presion_ejemplo')}
              className="ancho-total p-8 redondeo-8 borde-tarjeta texto-12 caja-borde"
              value={presion} onChange={(e) => setPresion(e.target.value)} />
          </div>
          <div className="form-group mb-12">
            <label className="texto-11 peso-700">
              {frase('reporte.glucemia')}
            </label>
            <input type="text" id="bit-glucemia" placeholder={frase('reporte.glucemia_ejemplo')}
              className="ancho-total p-8 redondeo-8 borde-tarjeta texto-12 caja-borde"
              value={glucemia} onChange={(e) => setGlucemia(e.target.value)} />
          </div>
          <div className="form-group mb-12">
            <label className="texto-11 peso-700">
              {frase('reporte.medicamentos')}
            </label>
            <input type="text" id="bit-medicamentos"
              placeholder={frase('reporte.medicamentos_ejemplo')}
              className="ancho-total p-8 redondeo-8 borde-tarjeta texto-12 caja-borde"
              value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} />
          </div>
          <div className="form-group mb-16">
            <label className="texto-11 peso-700">
              {frase('reporte.notas')}
            </label>
            <textarea id="bit-notas" placeholder={frase('reporte.notas_ejemplo')}
              className="ancho-total p-8 redondeo-8 borde-tarjeta texto-12 caja-borde alto-60"
              required value={notas} onChange={(e) => setNotas(e.target.value)}></textarea>
          </div>
          <button id="btn-guardar-reporte" className="btn-login ancho-total"
            disabled={guardandoReporte} onClick={guardarReporte}>
            {frase(guardandoReporte ? 'reporte.guardando' : 'reporte.guardar')}
          </button>
        </div>
      </div>

    </div>
  );
}
