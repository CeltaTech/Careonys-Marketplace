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

   Abrir la sesión lo hace la pieza compartida, la misma que usan la puerta de
   la web y la del Asistente. Acá queda lo de esta pantalla: los dos campos, el
   cartel, y a dónde se va después de entrar.

   La contraseña se pide con el campo compartido, que es el que trae el botón de
   mostrarla: escribirla a ciegas y equivocarse es la causa más común de no poder
   entrar.
=================================================== */

import { useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { useElIngreso } from '#comun/acceso/useElIngreso.js';
import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';

export default function Intro({ activa, ocupada, avisoClave, destinoAlta, alEntrar }) {
  const { frase } = useFrases();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const { entrando, ingresar } = useElIngreso();

  async function entrar() {
    const { entro, usuario, aviso } = await ingresar(correo, clave);
    if (aviso) alert(frase(aviso));
    if (entro) alEntrar(usuario);
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
