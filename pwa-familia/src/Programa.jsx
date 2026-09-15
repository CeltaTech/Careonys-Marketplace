/* ===================================================
   EL PROGRAMA DEL TELÉFONO DE LA FAMILIA

   Es la página entera: el marco del teléfono, el menú lateral, y las siete
   pantallas adentro. Todas están puestas desde el arranque y ninguna se saca:
   lo que cambia es cuál lleva la marca de activa, exactamente como antes. De
   eso depende que el formulario del aviso conserve lo escrito, que la grilla de
   las franjas no se vuelva a dibujar, y que el hilo de mensajes no se vacíe al
   ir y volver.

   **Navegar no es sólo cambiar de pantalla.** Cuatro de las siete piden datos
   al entrar, y eso acá se avisa con un número que sube: cada pantalla mira el
   suyo y, cuando cambia, vuelve a pedir. Un número en cero quiere decir que
   todavía no se entró nunca, y entonces no se pide nada. Así el tablero, que
   pide una sola vez al arrancar, no vuelve a pedir cada vez que se vuelve a él.

   **Y salir de los mensajes para el reloj.** El hilo abierto se refresca solo
   cada pocos segundos; al irse a otra pantalla se lo para, o el reloj sigue
   pidiendo contra algo que nadie mira.

   **El arranque tiene sus cuatro estados.** Mientras se averigua si ya hay
   sesión, la pantalla de entrar lo dice y su botón está apagado —que además
   evita mandar el formulario con la Prestadora a medio resolver—. Si algo
   falla, lo dice también: antes el fallo sólo iba a la consola y quedaba a la
   vista la pantalla de acceso, idéntica a la de un arranque bueno.

   **La única puerta que se abre desde afuera** es `#conversacion/<id>`, con la
   que `perfil.html` manda acá después de apretar «Contactar». Se acepta esa
   forma y ninguna otra, y el fragmento se borra apenas se usó.
=================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { nombreDeQuienEntro } from '#comun/acceso/nombreDeQuienEntro.js';
import { useElArranque } from '#comun/acceso/useElArranque.js';
import { useLaSalida } from '#comun/acceso/useLaSalida.js';
import { SalidaDeLaSesion } from '#comun/acceso/SalidaDeLaSesion.jsx';
import { SelloDelProducto } from '#comun/marca/SelloDelProducto.jsx';
import { conPrestadora } from '#comun/direcciones.js';
import { lasConversacionesSiYaLlegaron } from '#comun/datos/modulos.js';

import Intro from './pantallas/Intro.jsx';
import Tablero from './pantallas/Tablero.jsx';
import Reportes from './pantallas/Reportes.jsx';
import Publicar from './pantallas/Publicar.jsx';
import Postulaciones from './pantallas/Postulaciones.jsx';
import Conversacion from './pantallas/Conversacion.jsx';
import Asistencia from './pantallas/Asistencia.jsx';

/* Las pantallas que piden datos al entrar. El tablero no está: pide una sola
   vez, al arrancar, y eso lo dispara el arranque y no la navegación. */
const CON_CARGA = ['reportes', 'postulaciones', 'conversacion', 'asistencia'];

/* El destino del alta, tal como lo trae la página. El nombre corto de la
   Prestadora se le agrega en el arranque, cuando se sabe cuál es. */
const ALTA = '../registrar-familia';

/* El identificador que puede venir en la dirección tiene que parecer un `uuid`:
   lo que viene ahí lo escribe cualquiera. */
const FORMA_DE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Programa() {
  const { frase } = useFrases();
  const [pantalla, setPantalla] = useState('intro');
  const [pedidos, setPedidos] = useState({
    dashboard: 0, reportes: 0, postulaciones: 0, conversacion: 0, asistencia: 0
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [destinoAlta, setDestinoAlta] = useState(ALTA);
  const [usuario, setUsuario] = useState({ nombre: '', correo: '' });
  const { saliendo, salir } = useLaSalida();

  /* La conversación que hay que abrir apenas se llegue a la pantalla de los
     mensajes. Vive en una caja y no en el estado: cambiarla no tiene que
     redibujar nada, y quien la consume la vacía en cuanto la usó. */
  const convPedida = useRef(null);

  const navegar = useCallback((cual) => {
    setPantalla(cual);
    if (CON_CARGA.indexOf(cual) !== -1) {
      setPedidos((antes) => ({ ...antes, [cual]: antes[cual] + 1 }));
    }
    /* El menú se cierra con cualquier navegación, venga de donde venga. */
    setMenuAbierto(false);
    /* El hilo abierto se refresca solo cada pocos segundos. Al salir de la
       pantalla se para, o el reloj sigue pidiendo contra algo que nadie mira. */
    const Conversaciones = lasConversacionesSiYaLlegaron();
    if (cual !== 'conversacion' && Conversaciones) {
      Conversaciones.detener();
    }
  }, []);

  const irAMensajes = useCallback((conversacionId) => {
    convPedida.current = conversacionId || null;
    navegar('conversacion');
  }, [navegar]);

  /* `perfil.html` manda acá con `#conversacion/<id>` cuando la Familia aprieta
     «Contactar»: la conversación ya quedó abierta del otro lado y lo único que
     falta es mostrarla. Si la dirección no se reconoce, la aplicación arranca
     donde arranca siempre. Devuelve `true` si se hizo cargo de la navegación,
     para que quien la llama sepa si todavía tiene que ir al tablero. */
  const irADondePideLaDireccion = useCallback(() => {
    const fragmento = (window.location.hash || '').replace(/^#/, '');
    if (!fragmento) return false;
    const partes = fragmento.split('/');
    if (partes[0] !== 'conversacion') return false;
    const id = partes[1] ? decodeURIComponent(partes[1]) : '';
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    irAMensajes(FORMA_DE_UUID.test(id) ? id : null);
    return true;
  }, [irAMensajes]);

  /* El arranque. El orden y el aviso los lleva la pieza compartida; acá queda
     lo propio de la Familia. */
  const { arrancando, aviso: avisoArranque, organizacion } = useElArranque(
    'arrancar la aplicación de la Familia',
    {
      apenasSeSabeLaPrestadora: ({ ClienteDatos }) => {
        /* El alta abre en una pantalla de afuera de esta aplicación, y allá la
           Prestadora sólo puede salir de la dirección: quien se va a dar de
           alta todavía no tiene perfil de dónde sacarla. Si acá se llegó por
           `?t=`, el nombre corto viaja en el enlace; sin él, la pantalla de
           alta abre sin Prestadora y no da de alta a nadie —falla cerrado,
           antes que dejar nacer una cuenta huérfana—. Por subdominio se
           conserva solo. */
        setDestinoAlta(conPrestadora(ALTA, ClienteDatos.slugPedido));

        /* El directorio del tablero, que se pide una vez y sólo si la
           Prestadora quedó resuelta. */
        setPedidos((antes) => ({ ...antes, dashboard: antes.dashboard + 1 }));
      },

      conLaSesionQueHubiera: (puerta, sesion) => {
        if (!sesion) return;
        recordarAQuienEntro(sesion.user);
        if (!irADondePideLaDireccion()) navegar('dashboard');
      }
    }
  );

  /* El nombre de la pestaña, que la cabeza del documento no puede escribir:
     lleva adentro el nombre de la Prestadora, y ése recién se sabe cuando
     contesta la base. Por eso se vuelve a escribir cuando llega. */
  useEffect(() => {
    document.title = frase('familia.titulo_pagina');
  }, [frase, organizacion]);

  /* El nombre y el correo del menú salen de la sesión y nacen vacíos: antes
     traían un nombre y un correo inventados, que hasta que la sesión llegara se
     leían como si fueran los de quien mira. */
  function recordarAQuienEntro(user) {
    setUsuario({
      correo: user.email,
      nombre: nombreDeQuienEntro(user)
    });
  }

  function alEntrar(user) {
    recordarAQuienEntro(user);
    if (!irADondePideLaDireccion()) navegar('dashboard');
  }

  async function cerrarSesion() {
    const { salio, aviso } = await salir();
    if (aviso) alert(frase(aviso));
    if (salio) navegar('intro');
  }

  return (
    <div id="phone-container">

      <div className={'drawer-overlay' + (menuAbierto ? ' open' : '')} id="overlay"
        onClick={() => setMenuAbierto(false)}></div>

      {/* EL MENÚ LATERAL */}
      <div className={'sidebar-drawer' + (menuAbierto ? ' open' : '')} id="drawer">
        <div className="drawer-header">
          <img src="../assets/images/retrato_generico.svg" alt={frase('asistente.sin_foto')} />
          <h4 id="menu-user-name">{usuario.nombre}</h4>
          <p id="menu-user-email" style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.8 }}>
            {usuario.correo}
          </p>
        </div>
        <div style={{ flex: 1, padding: '16px 0' }}>
          <a className="drawer-menu-item" onClick={() => navegar('dashboard')}>
            <i className="fas fa-home ancho-20 color-secundario"></i>{' '}
            <span>{frase('nav.inicio')}</span>
          </a>
          <a className="drawer-menu-item" href="../directorio">
            <i className="fas fa-search ancho-20 color-secundario"></i>{' '}
            <span>{frase('familia.buscar_asistente')}</span>
          </a>
          <a className="drawer-menu-item" onClick={() => navegar('postulaciones')}>
            <i className="fas fa-inbox ancho-20 color-secundario"></i>{' '}
            <span id="menu-postulaciones">{frase('nav.postulaciones')}</span>
          </a>
          <a className="drawer-menu-item" onClick={() => navegar('conversacion')}>
            <i className="fas fa-comments ancho-20 color-secundario"></i>{' '}
            <span id="menu-mensajes">{frase('nav.mensajes')}</span>
          </a>
          {/* La Asistencia no tiene clave propia en el menú: el destino se llama
              igual que la pantalla, así que se pide la misma frase en vez de
              inventar una segunda que después haya que corregir en dos lados. */}
          <a className="drawer-menu-item" onClick={() => navegar('asistencia')}>
            <i className="fas fa-clock ancho-20 color-secundario"></i>{' '}
            <span id="menu-asistencia">{frase('asistencia.titulo')}</span>
          </a>
          <a className="drawer-menu-item" onClick={() => navegar('reportes')}>
            <i className="fas fa-book-medical ancho-20 color-secundario"></i>{' '}
            <span>{frase('familia.reportes_titulo')}</span>
          </a>
          <a className="drawer-menu-item" href="../cursos">
            <i className="fas fa-graduation-cap ancho-20 color-secundario"></i>{' '}
            <span>{frase('pie.cursos')}</span>
          </a>
          <a className="drawer-menu-item" href="../soporte-remoto">
            <i className="fas fa-headset ancho-20 color-secundario"></i>{' '}
            <span>{frase('acompanamiento.titulo')}</span>
          </a>
          <SalidaDeLaSesion saliendo={saliendo} alSalir={cerrarSesion} />
        </div>
        <SelloDelProducto className="p-16 borde-arriba" />
      </div>

      {/* Las siete pantallas. Están todas puestas y sólo una lleva la marca de
          activa: sacarlas y volverlas a poner perdería lo escrito en el
          formulario del aviso y vaciaría el hilo de mensajes. */}
      <Intro activa={pantalla === 'intro'} ocupada={arrancando}
        avisoClave={avisoArranque}
        destinoAlta={destinoAlta} alEntrar={alEntrar} />

      <Tablero activa={pantalla === 'dashboard'} pedido={pedidos.dashboard}
        navegar={navegar} alAbrirMenu={() => setMenuAbierto(true)} />

      <Reportes activa={pantalla === 'reportes'} pedido={pedidos.reportes} navegar={navegar} />

      <Publicar activa={pantalla === 'publicar'} navegar={navegar} />

      <Postulaciones activa={pantalla === 'postulaciones'} pedido={pedidos.postulaciones}
        navegar={navegar} irAMensajes={irAMensajes} />

      <Conversacion activa={pantalla === 'conversacion'} pedido={pedidos.conversacion}
        navegar={navegar} pedidaRef={convPedida} />

      <Asistencia activa={pantalla === 'asistencia'} pedido={pedidos.asistencia}
        navegar={navegar} irAMensajes={irAMensajes} />
    </div>
  );
}
