/* ===================================================
   LA BARRA DE ARRIBA

   Estaba escrita entera adentro de cada una de las quince pantallas. Acá está
   una sola vez, y cambiarla es cambiarla en todas.

   El logotipo y el nombre que se ven son los de la Prestadora que se esté
   mirando, no los del producto: hasta que se sepa cuál es, se muestra el
   producto, y eso lo resuelve el archivo de identidad.

   **Cuál es la pantalla en la que uno está se marca sola.** Antes había que
   comparar a mano el enlace contra el nombre del archivo abierto; ahora la
   dirección la lleva el enrutador, así que el enlace se marca solo y la marca
   se corrige sola al cambiar de pantalla.

   **Y la barra cambia de aspecto al bajar**, que es el único movimiento propio
   que tiene: apenas se empieza a bajar se despega del contenido con una
   sombra.
=================================================== */

import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { marca } from '#comun/frases/lector.js';

const ENLACES = [
  { a: '/solicitar-asistente', clave: 'nav.solicitar_asistente' },
  { a: '/registrar-asistente', clave: 'nav.registrarme_asistente' },
  { a: '/directorio', clave: 'nav.red_asistentes' },
  { a: '/registrar-familia', clave: 'nav.publicar_aviso' }
];

const REDES = [
  { icono: 'fab fa-facebook-f', clave: 'nav.facebook' },
  { icono: 'fab fa-instagram', clave: 'nav.instagram' },
  { icono: 'fab fa-linkedin-in', clave: 'nav.linkedin' },
  { icono: 'fab fa-youtube', clave: 'nav.youtube' }
];

export default function Navegacion() {
  const { frase } = useFrases();
  const [abierto, setAbierto] = useState(false);
  const [bajada, setBajada] = useState(false);

  useEffect(() => {
    const mirar = () => setBajada(window.scrollY > 30);
    mirar();
    window.addEventListener('scroll', mirar, { passive: true });
    return () => window.removeEventListener('scroll', mirar);
  }, []);

  return (
    <nav className={bajada ? 'navbar scrolled' : 'navbar'}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <img className="tenant-logo" src={'/' + marca('{{logotipo}}')} alt={frase('nav.inicio')} />
        </Link>
        <div className="navbar-links">
          {ENLACES.map(({ a, clave }) => (
            <NavLink key={a} to={a}>{frase(clave)}</NavLink>
          ))}
        </div>
        <div className="navbar-social">
          {REDES.map(({ icono, clave }) => (
            <a key={clave} href="#" aria-label={frase(clave)}><i className={icono}></i></a>
          ))}
          <a href={marca('mailto:{{contacto}}')} aria-label={frase('nav.correo')}>
            <i className="fas fa-envelope"></i>
          </a>
        </div>
        <button
          className={abierto ? 'hamburger active' : 'hamburger'}
          aria-label={frase('nav.menu')}
          aria-expanded={abierto}
          onClick={() => setAbierto((estaba) => !estaba)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className={abierto ? 'mobile-menu open' : 'mobile-menu'}>
        {ENLACES.map(({ a, clave }) => (
          <Link key={a} to={a} onClick={() => setAbierto(false)}>{frase(clave)}</Link>
        ))}
      </div>
    </nav>
  );
}
