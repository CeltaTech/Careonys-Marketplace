/* ===================================================
   LA PANTALLA DE ENTRAR

   Es la primera que se ve y la única que se ve sin sesión. Tiene tres partes:
   la marca de la Prestadora, la caja para entrar, y la puerta de quien todavía
   no tiene cuenta.

   El alta vive afuera de esta aplicación, en `registrar-familia.html`, que es la
   misma pantalla a la que manda `acceso.html`: una sola alta para las dos
   puertas. El destino con el nombre corto de la Prestadora adentro lo arma el
   programa y llega acá ya resuelto, porque a esta pantalla se llega tanto por
   `?t=` como por subdominio y allá la Prestadora sólo puede salir de la
   dirección.

   El cartel de más abajo es el estado del arranque: mientras se averigua si ya
   hay sesión dice que está averiguando, y si algo falla dice qué. Llega como
   clave del catálogo y no como texto ya escrito, así que cambiar de idioma con
   el cartel a la vista lo cambia también a él.

   La contraseña se pide con el campo compartido, que es el que trae el botón de
   mostrarla: escribirla a ciegas y equivocarse es la causa más común de no poder
   entrar.
=================================================== */

import { useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';

export default function Intro({ activa, ocupada, avisoClave, destinoAlta, alEntrar }) {
  const { frase } = useFrases();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [entrando, setEntrando] = useState(false);
  const enCurso = useRef(false);

  async function entrar() {
    if (enCurso.current) return;
    /* La misma falta que avisa `acceso.html`, con la misma frase: una sola clave
       para las dos pantallas, no dos textos que se corrigen por separado. */
    const email = correo.trim();
    if (!email || !clave) { alert(frase('acceso.faltan_datos')); return; }
    enCurso.current = true;
    setEntrando(true);
    try {
      const { Sesion } = await conLaBase();
      const user = await Sesion.login(email, clave);
      alEntrar(user);
    } catch (err) {
      alert(frase(Texto.claveDeError(err, 'iniciar sesión')));
    } finally {
      enCurso.current = false;
      setEntrando(false);
    }
  }

  return (
    <div className={'app-screen' + (activa ? ' active' : '')} id="screen-intro">
      <div className="intro-logo-container">
        <img src="../assets/images/logotipo.png" className="tenant-logo"
          alt={frase('asistente.logo_prestadora')} />
        <h2 className="tenant-name">{frase('comun.organizacion')}</h2>
      </div>

      <div className="login-card" aria-busy={ocupada ? 'true' : undefined}>
        <div className="input-wrapper">
          <input type="email" id="login-email" placeholder={frase('acceso.correo')} required
            value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <CampoDeClave id="login-pass" placeholder={frase('acceso.contrasena')} required
            value={clave} onChange={(e) => setClave(e.target.value)} />
        </div>
        <button type="button" className="btn-login ancho-total" id="btn-action-login"
          disabled={ocupada || entrando} onClick={entrar}>
          {entrando ? frase('acceso.entrando') : frase('familia.entrar')}
        </button>
      </div>

      <div className="btn-register-link">
        <span id="alta-familia-pregunta">{frase('acceso.sin_cuenta')}</span>
        {' '}
        <a href={destinoAlta} id="link-alta-familia">{frase('acceso.darse_de_alta_familia')}</a>
      </div>

      {/* Los estados del arranque. Sin aviso el renglón no está: antes el fallo
          del arranque sólo iba a la consola, así que una Prestadora que no se
          pudo resolver se veía exactamente igual que un arranque bueno. */}
      {avisoClave ? <p className="pwa-estado" id="arranque-aviso">{frase(avisoClave)}</p> : null}

      <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '10px', color: 'var(--texto-secundario)', paddingTop: '20px' }}>
        <span>{frase('pie.sello_producto')}</span>{' '}
        <strong className="color-marca-acento">{frase('comun.producto')}</strong>
      </div>
    </div>
  );
}
