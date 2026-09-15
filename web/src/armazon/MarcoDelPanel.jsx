/* ===================================================
   EL MARCO DEL PANEL DE LA PRESTADORA

   Qué es. La barra de arriba y el menú de la izquierda que rodean a las dos
   pantallas que usa quien administra una Prestadora: la de los legajos y la de
   las guías. Adentro de ese marco cada una dibuja lo suyo.

   Estaba escrito dos veces, uno en cada pantalla, y las dos copias ya se habían
   despegado en dos cosas. El enlace que vuelve al portal se pintaba con la
   clase de siempre en una y a mano en la otra, que además lo subrayaba; y cuál
   de las dos entradas del menú queda marcada como la actual se escribía a mano,
   así que una pantalla nueva o un enlace movido dejan las dos marcadas o
   ninguna. Acá el subrayado queda para las dos —en una barra de color, un
   enlace del mismo color que el texto de al lado no se distingue sin él— y la
   entrada marcada sale de la dirección que se está mirando.

   **El menú nombra sólo pantallas que existen.** Eran seis entradas y cuatro no
   llevaban a ningún lado. «Presentismo GPS Vivo» no va a tener pantalla nunca:
   la fichada es de la Familia y del Asistente, y la Prestadora no la mira. Las
   otras esperan una decisión que no está tomada, y están anotadas en la lista
   de pendientes.

   **El dibujito de la barra lo elige cada pantalla**, porque es lo único que
   dice cuál de las dos se está mirando antes de leer nada.
=================================================== */

import { Link, useLocation } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

const MENU = [
  { a: '/panel-prestadora', icono: 'fas fa-users-cog', clave: 'panel.guia_menu_legajos' },
  { a: '/guias-prestadora', icono: 'fas fa-book-medical', clave: 'panel.guia_menu_guias' }
];

/**
 * @param icono    Clases del dibujito de la barra de arriba.
 * @param children Lo que dibuja la pantalla adentro del marco.
 */
export function MarcoDelPanel({ icono, children }) {
  const { frase } = useFrases();
  const { pathname } = useLocation();
  return (
    <>
      <header className="tenant-header">
        <div className="tenant-brand">
          <i className={icono}></i>{' '}
          <span>{frase('comun.organizacion')}</span>{' '}
          <span className="tenant-badge">{frase('panel.guia_organizacion')}</span>
        </div>
        <div className="texto-13">
          <i className="fas fa-user-shield"></i>{' '}
          <span>{frase('panel.guia_operador')}</span>{' '}
          <Link
            to="/"
            className="color-sobre-color ml-8"
            style={{ textDecoration: 'underline' }}
          >
            {frase('panel.guia_volver_portal')}
          </Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <ul className="sidebar-menu">
            {MENU.map((entrada) => (
              <li key={entrada.a}>
                <Link to={entrada.a} className={pathname === entrada.a ? 'active' : undefined}>
                  <i className={entrada.icono}></i>{' '}
                  <span>{frase(entrada.clave)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </>
  );
}
