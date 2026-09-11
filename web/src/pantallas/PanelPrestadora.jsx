/* ===================================================
   EL PANEL DE TRABAJO DE LA PRESTADORA

   La misma pantalla de siempre, con otro envase: lo que la página suelta hacía
   contra el documento —armar filas a mano, esconder y mostrar carteles, abrir y
   cerrar el modal— acá lo hace el estado. No se agregó ni se sacó nada de lo
   que la pantalla sabía hacer.

   **Es una pantalla de la sesión, no del directorio**, así que no lleva la
   barra de arriba ni el pie: trae su propio encabezado de Prestadora y su menú
   lateral, igual que las guías, con las que comparte el costado.

   **Lo que la Prestadora controla es quién entra**, y nada más: el legajo, las
   verificaciones y la validación del Aspirante. No mira la fichada ni el
   reporte de cuidado, y por eso acá no hay ni un número de presentismo ni una
   alarma: de las alarmas, lo único suyo es el tope de horas, que es un bloque
   de configuración de su espacio.

   **Por el tamaño, la pantalla está partida en varios archivos** adentro de
   `panel-prestadora/`. Se entra por acá, y lo que se ve no cambia: el modal de
   auditoría, las verificaciones, las resoluciones anteriores, el tope de la
   alarma, la moneda y las opciones propias del catálogo son cada uno su
   archivo, porque cada uno es un pedido propio con su cartel propio.

   **Los cuatro estados están en la tabla de legajos**: cargando mientras la
   consulta viaja, error cuando no se pudo traer, vacío cuando esta Prestadora
   todavía no tiene ninguno, y listo con las filas dibujadas. Cada bloque de
   abajo tiene los suyos, por lo mismo de siempre: son cargas que corren casi a
   la vez y con un cartel único se borran entre ellas.

   **Los dos números de arriba arrancan en raya y no en cero.** Cero es un dato
   —«no hay ningún legajo en revisión»— y no sirve para decir «no se sabe».
=================================================== */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Identidad, Texto } from '#comun/frases/lector.js';
import { useSesionRequerida } from '../datos/useSesionRequerida.js';
import Cartel from './panel-prestadora/Cartel.jsx';
import ModalAuditoria from './panel-prestadora/ModalAuditoria.jsx';
import TopeDeAlarma from './panel-prestadora/TopeDeAlarma.jsx';
import Moneda from './panel-prestadora/Moneda.jsx';
import OpcionesPropias from './panel-prestadora/OpcionesPropias.jsx';

/* El papel que audita los legajos de una Prestadora. Es el mismo valor que
   compara el acceso para decidir a dónde entra cada quien. */
const ROL_QUE_AUDITA = 'coordinador';

/* Sin cuenta va la raya y no el cero: cero es un dato y no se puede usar para
   decir «no se sabe». */
const SIN_CUENTA = '—';

/* La caja del cartel de la tabla no tiene clases: las medidas venían escritas
   en el marcado y se dejan tal cual estaban. */
const CAJA_DEL_CARTEL = {
  padding: '16px', borderRadius: '10px', fontSize: '13px',
  lineHeight: '1.5', marginBottom: '12px'
};

/* Los tres papeles del legajo, con el rótulo con el que se nombra cada enlace.
   Viven acá porque el orden en que se muestran es el de esta pantalla. */
const PAPELES = [
  ['dni', 'panel.ver_dni'],
  ['penales', 'panel.ver_penales'],
  ['titulo', 'panel.ver_titulo']
];

/* Cuánto vive el enlace a un papel. Los papeles viven en un depósito privado:
   en la base está el camino, y el enlace se firma con vencimiento. Un enlace
   eterno a un documento de identidad es el documento, y viaja igual de fácil. */
const DURA_EL_ENLACE = 900;

export default function PanelPrestadora() {
  const { frase } = useFrases();
  const guardia = useSesionRequerida();

  usePestana('panel.titulo', { fueraDeBuscadores: true });

  /* El nombre de la Prestadora resuelta. No se muestra directamente: se guarda
     para que la pantalla se vuelva a dibujar cuando llega, porque varias frases
     del encabezado lo llevan adentro. */
  const [organizacion, setOrganizacion] = useState(Identidad.organizacion());

  /* El arranque, que es el que decide si la pantalla queda operativa. Mientras
     no lo esté, los bloques de configuración no se dibujan, que es exactamente
     lo que pasaba cuando esta pantalla era un archivo suelto: arrancaban
     ocultos y los destapaba la carga, detrás de la comprobación del permiso. */
  const [operativa, setOperativa] = useState(false);

  const [filas, setFilas] = useState([]);
  const [numeros, setNumeros] = useState({ revision: null, validados: null });
  const [cartel, setCartel] = useState({ tono: 'info', clave: 'catalogo.cargando' });
  const [actualizando, setActualizando] = useState(false);
  const [abriendo, setAbriendo] = useState(null);

  /* El legajo que se está auditando. `abierto` decide si el modal se ve, y
     `token` sube en cada apertura para que las verificaciones y las
     resoluciones anteriores se vuelvan a pedir, igual que allá se volvían a
     dibujar cada vez. */
  const [legajo, setLegajo] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [token, setToken] = useState(0);

  const base = guardia.base;

  const ponerNumeros = (revision, validados) => setNumeros({ revision, validados });

  /* «Todo botón que dispara una operación se apaga»: Actualizar se apaga
     mientras trae los legajos. Tres clics seguidos eran tres consultas y tres
     dibujados de la misma tabla, pisándose entre sí. */
  const cargarAspirantes = useCallback(async (conQue) => {
    const ClienteDatos = (conQue || base) && (conQue || base).ClienteDatos;
    if (!ClienteDatos) return;

    setActualizando(true);
    setCartel({ tono: 'info', clave: 'panel.legajos_cargando' });

    let data;
    try {
      data = await ClienteDatos.getAspirantes();
    } catch (err) {
      console.error('Panel de la Prestadora, legajos:', err);
      setFilas([]);
      /* El número que quedó de una carga anterior no se corrige solo: una
         actualización que falla dejaba en pantalla la cuenta vieja, que se lee
         como la de ahora. */
      ponerNumeros(null, null);
      setCartel({ tono: 'critico', clave: 'panel.legajos_error' });
      return;
    } finally {
      setActualizando(false);
    }

    if (!data.length) {
      setFilas([]);
      ponerNumeros(0, 0);
      setCartel({ tono: 'neutro', clave: 'panel.legajos_vacio' });
      return;
    }

    let rev = 0, val = 0;
    data.forEach((a) => {
      if (a.estado === 'en_revision') rev++;
      if (a.estado === 'validado_prestadora') val++;
    });

    setCartel(null);
    setFilas(data);
    ponerNumeros(rev, val);
  }, [base]);

  /* El arranque. El orden no es casual: sin sesión no hay Prestadora, y sin
     Prestadora la consulta de legajos no tiene por qué filtrar.

     El texto de la pantalla no se pide acá: lo pide el proveedor de frases
     antes de dibujar nada, que es el mismo «pedirlo por su propia red» de
     antes, dicho una sola vez para las quince pantallas. */
  useEffect(() => {
    if (guardia.estado === 'error') {
      setCartel({ tono: 'critico', clave: 'panel.arranque_error' });
      return;
    }
    if (guardia.estado !== 'listo' || !base) return;

    let vigente = true;

    (async () => {
      const { ClienteDatos, Sesion } = base;
      try {
        await ClienteDatos.initTenant();
        if (!vigente) return;
        setOrganizacion(Identidad.organizacion());

        const perfil = await Sesion.perfil();
        if (!vigente) return;

        if (!perfil || perfil.role !== ROL_QUE_AUDITA) {
          setCartel({ tono: 'atencion', clave: 'panel.sin_permiso' });
          return;
        }

        /* Los bloques de configuración van detrás de la comprobación del
           permiso, igual que los legajos: son el espacio de la Prestadora y no
           lo alcanza nadie más. */
        setOperativa(true);
        cargarAspirantes(base);
      } catch (err) {
        console.error('Panel de la Prestadora, arranque:', err);
        if (vigente) setCartel({ tono: 'critico', clave: 'panel.arranque_error' });
      }
    })();

    return () => { vigente = false; };
    // Corre una vez por pantalla, cuando la guardia terminó de resolver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardia.estado, base]);

  /* Un papel del legajo, resuelto en una de las tres formas que tenía: el
     enlace firmado, el papel que todavía no se cargó, y el papel que no se pudo
     firmar.

     Un papel que no se pudo firmar es un enlace menos; una excepción suelta es
     el legajo entero que no se abre. Se anota el detalle en la consola y se
     sigue por la misma rama que ya existía para cuando el depósito contesta sin
     dar enlace. */
  async function enlaceDocumento(camino, rotulo) {
    if (!camino || camino === 'pendiente') return { url: null, falta: 'pendiente' };

    let url = null;
    try {
      url = await base.Sesion.urlFirmada('documentos-cuidadores', camino, DURA_EL_ENLACE);
    } catch (err) {
      console.error('Panel de la Prestadora, enlace del documento:', err);
    }
    if (!url) return { url: null, falta: 'sin_enlace' };
    return { url: url, rotulo: rotulo };
  }

  /* «Los cuatro estados»: acá el pedido moría sin red. Si la base no contestaba,
     el fallo salía disparado y la pantalla se quedaba igual que estaba: el botón
     se encendía y se apagaba sin que se abriera nada ni se dijera por qué. El
     estado error se dice en el mismo cartel que usan los otros tres, y no se
     vuelve a lanzar: lanzar además dejaría dos avisos —el cartel y una ventana—
     contando la misma falla. */
  async function armarAuditoria(id) {
    setCartel({ tono: 'info', clave: 'panel.legajo_cargando' });

    let a;
    let papeles;

    try {
      const data = await base.ClienteDatos.getAspirantes();
      a = data.find((item) => item.id === id);

      /* El legajo estaba en la tabla cuando se dibujó y ya no está: se movió, o
         dejó de pertenecer a esta Prestadora. Es una falla distinta de «no se
         pudo traer» y se dice distinto, porque lo que hay que hacer también es
         otro: actualizar la lista, no reintentar. */
      if (!a) {
        setCartel({ tono: 'atencion', clave: 'panel.legajo_no_esta' });
        return;
      }

      const docs = a.documentos || {};
      const resueltos = await Promise.all(
        PAPELES.map(([cual, rotulo]) => enlaceDocumento(docs[cual], rotulo))
      );
      papeles = {};
      PAPELES.forEach(([cual], donde) => { papeles[cual] = resueltos[donde]; });
    } catch (err) {
      console.error('Panel de la Prestadora, legajo para auditar:', err);
      setCartel({ tono: 'critico', clave: 'panel.legajo_error' });
      return;
    }

    setCartel(null);
    setLegajo({ ...a, documentos: papeles });
    setToken((cuantas) => cuantas + 1);
    setAbierto(true);
  }

  /* «Todo botón que dispara una operación se apaga»: el botón de la fila se
     apaga mientras se traen los papeles. El aviso de lo que salga mal lo pone
     `armarAuditoria`, que es la que sabe qué falló; este `catch` es la red de lo
     imprevisto, no el estado error. */
  async function abrirAuditoria(id) {
    setAbriendo(id);
    try {
      await armarAuditoria(id);
    } catch (err) {
      console.error('Panel de la Prestadora, auditoría del legajo:', err);
      alert(Texto.mensajeDeError(err, 'abrir el legajo para auditarlo'));
    } finally {
      setAbriendo(null);
    }
  }

  // ── LA PANTALLA ─────────────────────────────────────────────────────────

  return (
    <>
      <header className="tenant-header">
        <div className="tenant-brand">
          <i className="fas fa-hospital-user color-azul-medio"></i>{' '}
          <span>{frase('comun.organizacion')}</span>{' '}
          <span className="tenant-badge">{frase('panel.guia_organizacion')}</span>
        </div>
        <div className="texto-13">
          <i className="fas fa-user-shield"></i>{' '}
          <span>{frase('panel.guia_operador')}</span>{' '}
          <Link to="/" className="ml-8"
            style={{ color: 'var(--texto-sobre-color)', textDecoration: 'underline' }}>
            {frase('panel.guia_volver_portal')}
          </Link>
        </div>
      </header>

      <div className="admin-layout">
        {/* EL MENÚ NOMBRA SÓLO PANTALLAS QUE EXISTEN. Eran seis entradas y
            cuatro no llevaban a ningún lado. «Presentismo GPS Vivo» no va a
            tener pantalla nunca: la fichada es de la Familia y del Asistente, y
            la Prestadora no la mira. Las otras esperan una decisión que no está
            tomada, y están anotadas en la lista de pendientes. */}
        <aside className="admin-sidebar">
          <ul className="sidebar-menu">
            <li>
              <Link to="/panel-prestadora" className="active">
                <i className="fas fa-users-cog"></i>{' '}
                <span>{frase('panel.guia_menu_legajos')}</span>
              </Link>
            </li>
            <li>
              <Link to="/guias-prestadora">
                <i className="fas fa-book-medical"></i>{' '}
                <span>{frase('panel.guia_menu_guias')}</span>
              </Link>
            </li>
          </ul>
        </aside>

        <main className="admin-content">
          {/* LOS NÚMEROS SALEN DE LA BASE, Y POR ESO SON DOS. Los otros dos que
              había estaban escritos a mano y decían siempre lo mismo pasara lo
              que pasara. Y arrancan en raya: mientras la consulta viaja, un
              número sería un número que nadie contó. */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-val">
                {numeros.revision === null ? SIN_CUENTA : numeros.revision}
              </div>
              <div className="kpi-label">{frase('panel.kpi_revision')}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-val">
                {numeros.validados === null ? SIN_CUENTA : numeros.validados}
              </div>
              <div className="kpi-label">{frase('panel.kpi_validados')}</div>
            </div>
          </div>

          <div className="card-dashboard">
            <div className="flex justificar-entre alinear-centro mb-16">
              <div>
                <h3 className="m-0 texto-18 color-titulo">
                  <i className="fas fa-clipboard-check"></i>{' '}
                  <span>{frase('panel.legajos_encabezado')}</span>
                </h3>
                <p className="m-solo-arriba-4 texto-13 color-secundario">
                  {frase('panel.legajos_bajada')}
                </p>
              </div>
              <button className="btn btn-secundario"
                style={{ fontSize: '12px', padding: '8px 16px' }}
                disabled={actualizando}
                onClick={() => cargarAspirantes()}>
                <i className="fas fa-sync-alt"></i>{' '}
                <span>{frase('panel.guia_actualizar')}</span>
              </button>
            </div>

            <Cartel tono={cartel && cartel.tono} clave={cartel && cartel.clave}
              huecos={cartel && cartel.huecos} clase="" estilo={CAJA_DEL_CARTEL} />

            <table className="aspirantes-table">
              <thead>
                <tr>
                  <th>{frase('panel.col_aspirante')}</th>
                  <th>{frase('panel.col_tipo')}</th>
                  <th>{frase('avisos.rotulo_zona')}</th>
                  <th>{frase('panel.col_documentacion')}</th>
                  <th>{frase('panel.col_auditoria')}</th>
                  <th>{frase('panel.opciones_col_acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.nombre}</strong><br />
                      <span style={{ fontSize: '11px', color: 'var(--texto-secundario)' }}>
                        {frase('panel.detalle_dni')} {a.dni} |{' '}
                        {frase('panel.fila_telefono')} {a.telefono}
                      </span>
                    </td>
                    <td>{a.profesion}</td>
                    <td>{a.zona}</td>
                    <td>
                      <span style={{
                        color: 'var(--azul-medio-texto)', fontSize: '11px', fontWeight: 700
                      }}>
                        <i className="fas fa-file-pdf"></i>{' '}
                        {frase('panel.documentos_cargados')}
                      </span>
                    </td>
                    <td>
                      {a.estado === 'en_revision' ? (
                        <span className="status-pill status-revision">
                          {frase('panel.estado_en_revision')}
                        </span>
                      ) : (
                        <span className="status-pill status-validado">
                          {frase('panel.estado_validado')}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secundario"
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                        disabled={abriendo === a.id}
                        onClick={() => abrirAuditoria(a.id)}>
                        {abriendo === a.id ? frase('panel.abriendo') : (
                          <>
                            <i className="fas fa-search-plus"></i>{' '}
                            {frase('panel.auditar')}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {operativa && <TopeDeAlarma base={base} />}
          {operativa && <Moneda base={base} />}
          {operativa && <OpcionesPropias base={base} />}
        </main>
      </div>

      <ModalAuditoria
        base={base}
        abierto={abierto}
        legajo={legajo}
        caregiverId={legajo && legajo.id}
        token={token}
        alCerrar={() => setAbierto(false)}
        alResolver={() => cargarAspirantes()}
      />
    </>
  );
}
