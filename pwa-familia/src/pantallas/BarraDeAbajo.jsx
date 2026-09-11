/* ===================================================
   LA BARRA DE ABAJO

   Los mismos cuatro destinos de siempre, con el que se está mirando marcado.
   Está escrita una vez porque las tres pantallas que la llevan —el tablero, los
   reportes y el aviso nuevo— la llevaban idéntica salvo cuál iba marcado: tres
   copias del mismo renglón son tres lugares donde corregir el día que cambie un
   rótulo.

   «Asistentes» sale de esta aplicación y abre el directorio, que es una página
   de la web y no una pantalla de acá. Por eso es un enlace de verdad y no una
   llamada a la navegación interna.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

export default function BarraDeAbajo({ actual, navegar }) {
  const { frase } = useFrases();
  const clase = (cual) => 'tab-item' + (actual === cual ? ' active' : '');

  return (
    <div className="bottom-tab-bar">
      <a className={clase('dashboard')} onClick={() => navegar('dashboard')}>
        <i className="fas fa-home"></i><span>{frase('nav.inicio')}</span>
      </a>
      <a className={clase('publicar')} onClick={() => navegar('publicar')}>
        <i className="fas fa-plus-circle"></i><span>{frase('familia.tab_publicar')}</span>
      </a>
      <a className="tab-item" href="../directorio.html">
        <i className="fas fa-users"></i><span>{frase('familia.asistentes')}</span>
      </a>
      <a className={clase('reportes')} onClick={() => navegar('reportes')}>
        <i className="fas fa-book-medical"></i><span>{frase('familia.tab_reportes')}</span>
      </a>
    </div>
  );
}
