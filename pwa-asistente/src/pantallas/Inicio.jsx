/* ===================================================
   LA PANTALLA DE INICIO

   Lo que se ve al entrar: la cabecera con el logotipo de la Prestadora, la
   franja de alarmas, el renglón del legajo, el fichador, el reporte del servicio
   y la barra de abajo.

   Acá no hay lógica propia: cada una de las cuatro zonas pide lo suyo y falla
   por su lado. Es a propósito —son consultas distintas, y que una falle no tiene
   por qué dejar sin la otra a quien mira—, y es lo que hacía la pantalla de
   antes.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

import FranjaDeAlarmas from './Inicio/FranjaDeAlarmas.jsx';
import EstadoDelLegajo from './Inicio/EstadoDelLegajo.jsx';
import Fichador from './Inicio/Fichador.jsx';
import FormularioDeReporte from './Inicio/FormularioDeReporte.jsx';

export default function Inicio({ activa, visita, base, usuario, pendientes, navegar, irAMensajes, abrirCajon }) {
  const { frase } = useFrases();

  return (
    <div className={activa ? 'app-screen pb-64 active' : 'app-screen pb-64'} id="screen-dashboard">
      <div className="dashboard-header">
        <button type="button" className="btn-back texto-20" id="btn-open-menu" onClick={abrirCajon}>
          <i className="fas fa-bars"></i>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src="../assets/images/logotipo.png"
            className="tenant-logo"
            style={{ height: '24px' }}
            alt={frase('asistente.logo_prestadora')}
            onError={(evento) => { evento.currentTarget.style.display = 'none'; }}
          />
          <span className="tenant-name texto-14 peso-800 color-marca">{frase('comun.organizacion')}</span>
        </div>
        <div className="ancho-24"></div>
      </div>

      <FranjaDeAlarmas visita={visita} base={base} irAMensajes={irAMensajes} />

      <EstadoDelLegajo base={base} usuario={usuario} navegar={navegar} />

      <Fichador visita={visita} base={base} pendientes={pendientes} />

      <FormularioDeReporte base={base} />

      <div style={{ textAlign: 'center', padding: '12px 0 24px 0', fontSize: '10px', color: 'var(--texto-secundario)' }}>
        <span>{frase('pie.sello_producto')}</span>{' '}
        <strong className="color-marca-acento">{frase('comun.producto')}</strong>
      </div>

      <div className="bottom-tab-bar">
        <a className="tab-item active" onClick={() => navegar('dashboard')}>
          <i className="fas fa-home"></i><span>{frase('nav.inicio')}</span>
        </a>
        <a className="tab-item" onClick={() => navegar('registro')}>
          <i className="fas fa-user-plus"></i><span>{frase('asistente.tab_legajo')}</span>
        </a>
        <a className="tab-item" onClick={() => navegar('capacitaciones')}>
          <i className="fas fa-graduation-cap"></i><span>{frase('asistente.tab_cursos')}</span>
        </a>
        <a className="tab-item" onClick={() => navegar('avisos')}>
          <i className="fas fa-bullhorn"></i><span>{frase('nav.avisos')}</span>
        </a>
      </div>
    </div>
  );
}
