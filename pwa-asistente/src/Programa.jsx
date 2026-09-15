/* ===================================================
   EL PROGRAMA DEL ASISTENTE

   Es la misma página suelta de al lado, cambiada de envase. Lo que antes era un
   archivo con siete bloques `.app-screen` y un guion abajo, acá es este armazón
   más una pantalla por bloque. Lo que se ve, en qué orden y con qué texto no
   cambió en nada.

   **Las siete pantallas están todas montadas a la vez**, igual que antes, y lo
   único que las prende y las apaga es la clase `active`. No es una comodidad:
   el legajo es un formulario de cinco pasos que la persona llena de a ratos, y
   si la pantalla se desmontara al ir a Capacitaciones y volver, lo escrito se
   perdería. Antes no se perdía porque el bloque seguía ahí, apagado; acá
   tampoco, por lo mismo.

   **Ir a una pantalla es una visita, no un destino.** Entrar al inicio vuelve a
   pedir las alarmas aunque ya se estuviera en el inicio: eso hacía el ir de
   antes. Así que además de a dónde se va se lleva la cuenta de cuántas veces se
   fue. Cada pantalla mira ese número y, cuando cambia, vuelve a pedir lo suyo.
   Sin la cuenta, tocar «Inicio» estando en el inicio no haría nada.

   **La puerta a la base se abre una vez, acá, y se reparte.** Las pantallas no
   la abren cada una por su lado: reciben lo de adentro ya abierto, y mientras
   no lo tengan no piden nada. Es el mismo orden que tenía el arranque de la
   página: primero la Prestadora, después la sesión, después la cola de
   fichadas.

   **El nombre de la Prestadora se vuelve a preguntar cuando llega.** Las frases
   lo llevan adentro y el lector lo reemplaza por lo que sepa en ese momento; al
   arrancar no sabe nada todavía, y lo que sabe recién llega con la Prestadora.
   En la página suelta eso se resolvía solo, porque el reemplazo se hacía sobre
   el texto ya escrito. Acá el texto se escribe al dibujar, así que se guarda el
   nombre en el estado y se lo vuelve a leer apenas la Prestadora contesta: eso
   obliga a dibujar de nuevo, y ahí el nombre aparece.

   **El título de la pestaña y la descripción también salen del catálogo.** Los
   escribía el mismo recorrido que traducía la pantalla entera, que acá no
   existe; se ponen a mano, con las mismas dos claves de siempre.
=================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { nombreDeQuienEntro } from '#comun/acceso/nombreDeQuienEntro.js';
import { useElArranque } from '#comun/acceso/useElArranque.js';
import { useLaSalida } from '#comun/acceso/useLaSalida.js';

import { conLaCola, lasConversacionesSiYaLlegaron } from '#comun/datos/modulos.js';
import Acceso from './pantallas/Acceso.jsx';
import Inicio from './pantallas/Inicio.jsx';
import Legajo from './pantallas/Legajo.jsx';
import Capacitaciones from './pantallas/Capacitaciones.jsx';
import Guias from './pantallas/Guias.jsx';
import Avisos from './pantallas/Avisos.jsx';
import Conversacion from './pantallas/Conversacion.jsx';

export default function Programa() {
  const { frase } = useFrases();

  const [base, setBase] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cajon, setCajon] = useState(false);
  const [pendientes, setPendientes] = useState({ cuantas: 0, motivo: null, trabada: false });
  const [destino, setDestino] = useState({ pantalla: 'intro', visita: 0 });
  const { saliendo, salir } = useLaSalida();

  /* La conversación que otra pantalla pidió abrir. Se olvida apenas se usó,
     para que volver a Mensajes no lleve siempre al mismo lado. */
  const convPedida = useRef(null);

  /* Ir a una pantalla: la prende, cierra el menú y, si no es Mensajes, le para
     el reloj a Mensajes. Pedir los datos lo hace cada pantalla al ver que el
     número de visita cambió. */
  const navegar = useCallback((cual) => {
    setDestino((antes) => ({ pantalla: cual, visita: antes.visita + 1 }));
    setCajon(false);
    const Conversaciones = lasConversacionesSiYaLlegaron();
    if (cual !== 'conversacion' && Conversaciones) Conversaciones.detener();
  }, []);

  const irAMensajes = useCallback((conversacionId) => {
    convPedida.current = conversacionId || null;
    navegar('conversacion');
  }, [navegar]);

  /* El arranque. El orden y el aviso los lleva la pieza compartida; acá queda
     lo propio del Asistente: la puerta que reciben las pantallas, a dónde va
     quien ya tenía sesión, y la cola de fichadas, que se engancha haya sesión
     o no. Mientras esto corre se está viendo la pantalla de acceso, que es la
     que muestra los cuatro estados: el botón de entrar apagado mientras se
     averigua, el cartel de abajo si algo falla, y la propia pantalla de acceso
     cuando no hay sesión, que es la verdad. */
  const { arrancando, aviso: avisoArranque, organizacion } = useElArranque(
    'arrancar el portal del Asistente',
    {
      apenasSeSabeLaPrestadora: (puerta) => setBase(puerta),

      conLaSesionQueHubiera: async (puerta, sesion) => {
        if (sesion) {
          setUsuario({
            id: sesion.user.id,
            correo: sesion.user.email,
            nombre: nombreDeQuienEntro(sesion.user)
          });
          navegar('dashboard');
        }

        const cola = await conLaCola();
        cola.alCambiar((cuantas, motivo, trabada) => setPendientes({ cuantas, motivo, trabada }));
        cola.arrancar();
      }
    }
  );

  /* Lo que la cabeza del documento decía con estas mismas dos claves. Se vuelve
     a escribir cuando llega el nombre de la Prestadora, porque las dos frases lo
     llevan adentro. */
  useEffect(() => {
    document.title = frase('asistente.titulo_pagina');
    const descripcion = document.querySelector('meta[name="description"]');
    if (descripcion) descripcion.setAttribute('content', frase('asistente.descripcion_pagina'));
  }, [frase, organizacion]);

  /* El nombre y el correo siguen en el menú después de salir. */
  async function cerrarSesion() {
    const { salio, aviso } = await salir();
    if (aviso) window.alert(frase(aviso));
    if (salio) navegar('intro');
  }

  /* Cuántas veces se entró a cada pantalla. Vale `null` para las que no son la
     de ahora: así la pantalla sabe que no le toca pedir nada. */
  const visitaDe = (cual) => (destino.pantalla === cual ? destino.visita : null);

  const irA = (cual) => () => navegar(cual);

  return (
    <div id="phone-container">

      <div
        className={cajon ? 'drawer-overlay open' : 'drawer-overlay'}
        id="overlay"
        onClick={() => setCajon(false)}
      ></div>

      <div className={cajon ? 'sidebar-drawer open' : 'sidebar-drawer'} id="drawer">
        <div className="drawer-header">
          <img src="../assets/images/retrato_generico.svg" alt={frase('asistente.sin_foto')} />
          <h4 id="menu-user-name">{usuario ? usuario.nombre : ''}</h4>
          <p id="menu-user-email" style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.8 }}>
            {usuario ? usuario.correo : ''}
          </p>
        </div>
        <div style={{ flex: 1, padding: '16px 0' }}>
          <a className="drawer-menu-item" onClick={irA('dashboard')}>
            <i className="fas fa-home ancho-20 color-secundario"></i> <span>{frase('nav.inicio')}</span>
          </a>
          <a className="drawer-menu-item" onClick={irA('registro')}>
            <i className="fas fa-user-plus ancho-20 color-secundario"></i> <span>{frase('asistente.menu_legajo')}</span>
          </a>
          <a className="drawer-menu-item" onClick={irA('capacitaciones')}>
            <i className="fas fa-graduation-cap ancho-20 color-secundario"></i> <span>{frase('capacitacion.titulo')}</span>
          </a>
          <a className="drawer-menu-item" onClick={irA('guias')}>
            <i className="fas fa-book-medical ancho-20 color-secundario"></i> <span>{frase('guia.titulo')}</span>
          </a>
          <a className="drawer-menu-item" onClick={irA('avisos')}>
            <i className="fas fa-bullhorn ancho-20 color-secundario"></i> <span>{frase('nav.avisos')}</span>
          </a>
          <a className="drawer-menu-item" onClick={irA('conversacion')}>
            <i className="fas fa-comments ancho-20 color-secundario"></i> <span>{frase('nav.mensajes')}</span>
          </a>
          <div style={{ borderTop: '1px solid var(--borde-card)', margin: '8px 0' }}></div>
          <button
            type="button"
            className="drawer-menu-item color-peligro"
            id="btn-logout"
            disabled={saliendo}
            onClick={cerrarSesion}
          >
            {saliendo ? frase('asistente.cerrando_sesion') : (
              <>
                <i className="fas fa-sign-out-alt ancho-20 color-peligro"></i>{' '}
                <span>{frase('asistente.menu_cerrar_sesion')}</span>
              </>
            )}
          </button>
        </div>
        <div className="p-16 centrar-texto texto-10 color-secundario borde-arriba">
          <span>{frase('pie.sello_producto')}</span>{' '}
          <strong className="color-marca-acento">{frase('comun.producto')}</strong>
        </div>
      </div>

      <Acceso
        activa={destino.pantalla === 'intro'}
        base={base}
        arrancando={arrancando}
        avisoArranque={avisoArranque}
        navegar={navegar}
        alEntrar={setUsuario}
      />

      <Inicio
        activa={destino.pantalla === 'dashboard'}
        visita={visitaDe('dashboard')}
        base={base}
        usuario={usuario}
        pendientes={pendientes}
        navegar={navegar}
        irAMensajes={irAMensajes}
        abrirCajon={() => setCajon(true)}
      />

      <Legajo
        activa={destino.pantalla === 'registro'}
        base={base}
        navegar={navegar}
      />

      <Capacitaciones
        activa={destino.pantalla === 'capacitaciones'}
        visita={visitaDe('capacitaciones')}
        base={base}
        navegar={navegar}
      />

      <Guias
        activa={destino.pantalla === 'guias'}
        visita={visitaDe('guias')}
        base={base}
        navegar={navegar}
      />

      <Avisos
        activa={destino.pantalla === 'avisos'}
        visita={visitaDe('avisos')}
        base={base}
        navegar={navegar}
      />

      <Conversacion
        activa={destino.pantalla === 'conversacion'}
        visita={visitaDe('conversacion')}
        pedida={convPedida}
        navegar={navegar}
      />

    </div>
  );
}
