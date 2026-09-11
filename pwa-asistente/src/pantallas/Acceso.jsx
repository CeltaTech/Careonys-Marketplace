/* ===================================================
   LA PANTALLA DE ACCESO

   La primera que se ve. Trae el logotipo y el nombre de la Prestadora, los dos
   campos de siempre, el botón de entrar y el enlace para darse de alta.

   **Los dos campos no viven en el estado.** Se leen del documento cuando se
   aprieta el botón, igual que antes. No es descuido: lo que se escribe en una
   contraseña no tiene por qué pasar por ninguna variable del programa, y
   dibujar la pantalla entera con cada tecla no mejora nada acá.

   **La contraseña se pide con la pieza compartida**, que es la que sabe taparla
   y destaparla y la que dice cómo se llama ese botón en los tres idiomas. Antes
   era un campo pelado que no se podía destapar.

   **El cartel de abajo es el estado error del arranque**, y lo escribe el
   armazón: si algo falla al arrancar, esta pantalla queda igual a la de quien
   nunca inició sesión, y sin el cartel no habría forma de distinguir «no hay
   sesión» de «no se pudo preguntar». Mientras se averigua, el botón de entrar
   está apagado.
=================================================== */

import { useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';

import { conLaCola } from '../piezas/modulos.js';
import { nombreDeMenu } from '../Programa.jsx';

export default function Acceso({ activa, base, arrancando, avisoArranque, navegar, alEntrar }) {
  const { frase } = useFrases();
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    if (!email || !password) { window.alert(frase('acceso.faltan_datos')); return; }
    setEntrando(true);
    try {
      const user = await base.Sesion.login(email, password);
      alEntrar({ id: user.id, correo: user.email, nombre: nombreDeMenu(user) });
      navegar('dashboard');
      /* Recién ahora hay legajo con el que mandar lo que estuviera esperando
         desde antes de entrar. */
      const cola = await conLaCola();
      cola.sincronizar();
    } catch (err) {
      window.alert(Texto.mensajeDeError(err, 'iniciar sesión'));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-intro">
      <div className="intro-logo-container">
        <img
          src="../assets/images/logotipo.png"
          className="tenant-logo"
          alt={frase('asistente.logo_prestadora')}
          onError={(evento) => { evento.currentTarget.style.display = 'none'; }}
        />
        <h2 className="tenant-name">{frase('comun.organizacion')}</h2>
        <p>{frase('asistente.portal_bajada')}</p>
      </div>
      <div className="login-card">
        <div className="input-wrapper">
          <input type="email" id="login-email" placeholder={frase('acceso.correo')} required />
        </div>
        <div className="input-wrapper">
          <CampoDeClave id="login-pass" placeholder={frase('acceso.contrasena')} required />
        </div>
        <button
          type="button"
          className="btn-login"
          id="btn-action-login"
          disabled={arrancando || entrando || !base}
          onClick={entrar}
        >
          {entrando ? frase('acceso.entrando') : frase('asistente.entrar')}
        </button>
        <p
          className="warranque-aviso"
          id="arranque-aviso"
          style={{ display: avisoArranque ? 'block' : 'none' }}
        >{avisoArranque}</p>
        <div className="btn-register-link">
          <span>{frase('asistente.sin_cuenta')}</span>{' '}
          <a onClick={() => navegar('registro')}>{frase('asistente.registrarse')}</a>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '10px', color: 'var(--texto-secundario)', paddingTop: '20px' }}>
        <span>{frase('pie.sello_producto')}</span>{' '}
        <strong className="color-marca-acento">{frase('comun.producto')}</strong>
      </div>
    </div>
  );
}
