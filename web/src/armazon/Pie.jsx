/* ===================================================
   EL PIE

   Estaba escrito entero adentro de cada una de las quince pantallas. Acá está
   una sola vez.

   Los documentos legales se abren en una pestaña aparte y se piden al sitio tal
   como están guardados: no son pantallas del producto, son textos que la
   Prestadora adopta.

   La columna de asistentes lleva dos enlaces a la misma pantalla y es a
   propósito: uno la abre por arriba y el otro cae directo en el formulario.
   Estaba así en las páginas de antes, y se conserva.
=================================================== */

import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { marca } from '#comun/frases/lector.js';

const REDES = [
  { icono: 'fab fa-facebook-f', clave: 'nav.facebook' },
  { icono: 'fab fa-instagram', clave: 'nav.instagram' },
  { icono: 'fab fa-linkedin-in', clave: 'nav.linkedin' },
  { icono: 'fab fa-youtube', clave: 'nav.youtube' }
];

const PARA_FAMILIAS = [
  { a: '/solicitar-asistente', clave: 'nav.solicitar_asistente' },
  { a: '/directorio', clave: 'pie.directorio' },
  { a: '/soporte-remoto', clave: 'pie.acompanamiento' },
  { a: '/cursos', clave: 'pie.cursos' }
];

const PARA_ASISTENTES = [
  { a: '/registrar-asistente', clave: 'nav.registrarme_asistente' },
  { a: '/registrar-asistente#registro', clave: 'pie.registrarme' },
  { a: '/cursos', clave: 'pie.capacitacion' }
];

export default function Pie() {
  const { frase } = useFrases();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo">
            <img className="tenant-logo" src={'/' + marca('{{logotipo}}')} alt="" />
            <span className="tenant-name">{marca('{{organizacion}}')}</span>
          </div>
          <p>{frase('pie.lema')}</p>
          <div className="footer-social">
            {REDES.map(({ icono, clave }) => (
              <a key={clave} href="#" aria-label={frase(clave)}><i className={icono}></i></a>
            ))}
            <a href={marca('mailto:{{contacto}}')} aria-label={frase('nav.correo')}>
              <i className="fas fa-envelope"></i>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>{frase('pie.para_familias')}</h4>
          {PARA_FAMILIAS.map(({ a, clave }) => (
            <Link key={a} to={a}>{frase(clave)}</Link>
          ))}
        </div>

        <div className="footer-col">
          <h4>{frase('pie.para_asistentes')}</h4>
          {PARA_ASISTENTES.map(({ a, clave }) => (
            <Link key={clave} to={a}>{frase(clave)}</Link>
          ))}
        </div>

        <div className="footer-col">
          <h4>{frase('pie.empresa')}</h4>
          <a href="#">{frase('pie.sobre_producto')}</a>
          <a href="#contacto">{frase('pie.contacto')}</a>
          <a href="/docs/terminos_y_condiciones_familias.md" target="_blank" rel="noreferrer">
            {frase('pie.terminos')}
          </a>
          <a href="/docs/politica_de_datos.md" target="_blank" rel="noreferrer">
            {frase('pie.privacidad')}
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} <span className="tenant-name">{marca('{{organizacion}}')}</span>{' '}
          {frase('pie.derechos')}
        </p>
      </div>
    </footer>
  );
}
