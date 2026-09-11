/* ===================================================
   ELEGIR UNA CONTRASEÑA NUEVA

   La última de la familia del acceso: la misma tarjeta, sin barra de arriba ni
   pie, porque nunca los tuvo. El marco lo pone el enrutador, y a esta vista no
   le pone ninguno.

   **Acá el permiso viene en la dirección**, y eso manda sobre todo lo demás. Se
   llega desde el enlace que llegó por correo, así que la pantalla no pregunta
   quién es nadie: comprueba que ese enlace dejó una sesión de recuperación
   abierta y, si no la dejó, no deja cambiar nada. **Falla cerrado**, que es lo
   único razonable cuando el permiso viaja en una dirección que cualquiera puede
   escribir a mano.

   Los cuatro estados son los que la página ya tenía, con dos de ellos
   compartiendo panel a propósito: **cargando** mientras se comprueba el enlace,
   **listo** con el formulario, **hecho** cuando la contraseña quedó cambiada, y
   el panel de «el enlace no sirve», que es a la vez el **vacío** —no se llegó
   por el correo, o el enlace ya se usó— y el **error** —no se pudo comprobar—.
   Se distinguen porque el título cambia: decir «el enlace ya no sirve» cuando
   nadie llegó a comprobarlo sería afirmar algo que no se sabe.

   Dos cosas que la página resolvía a mano y acá salen solas. **Los avisos
   guardan la clave de la frase y sus huecos, no el texto**, así que un cambio de
   idioma con el cartel en pantalla lo alcanza sin que nadie lo vaya a buscar; y
   **el texto ya llegó antes de dibujarse**, porque el proveedor de frases lo
   espera, así que acá no hace falta volver a pedirlo ni sostener a mano el
   rótulo del botón mientras la operación corre.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Texto } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';
import { conLaRevisionDeClaves } from '../datos/claves.js';
import CampoDeClave from '../formularios/CampoDeClave.jsx';

/* Lo primero de todo, y por eso vive afuera del componente: se guarda la
   dirección con la que se llegó, apenas este archivo se lee y mucho antes de
   que nadie abra la puerta a la base. La biblioteca de la base, cuando
   encuentra ahí una sesión, la borra para que no quede dando vueltas en el
   historial, y si el enlace traía el motivo del rechazo se lo lleva junto con el
   resto. Leerla acá arriba es la única forma de tenerla segura. */
const direccionAlLlegar = window.location.hash + window.location.search;

/* Qué dijo el servidor al rechazar el enlace. Viene en la dirección, a veces
   detrás del numeral y a veces como parámetro, según cómo se haya emitido.
   Devuelve la clave de la frase, no la frase: el motivo es texto visible. */
function motivoDelRechazo() {
  const partes = new URLSearchParams(direccionAlLlegar.replace(/^[#?]+/, ''));
  const codigo = partes.get('error_code') || partes.get('error');
  if (!codigo) return null;
  if (/expired/.test(codigo)) return 'nueva.enlace_vencio';
  if (/used|already/.test(codigo)) return 'nueva.enlace_ya_usado';
  return 'nueva.enlace_rechazado';
}

export default function NuevaClave() {
  const { frase } = useFrases();
  usePestana('nueva.titulo', { fueraDeBuscadores: true });

  const [estado, setEstado] = useState('cargando');
  const [tituloSinEnlace, setTituloSinEnlace] = useState('nueva.enlace_no_sirve');
  const [avisoSinEnlace, setAvisoSinEnlace] = useState(null);
  const [avisoErrorCambio, setAvisoErrorCambio] = useState(null);
  const [correoEnCurso, setCorreoEnCurso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [clave, setClave] = useState('');
  const [claveRepetida, setClaveRepetida] = useState('');

  const campoClave = useRef(null);
  const campoClaveRepetida = useRef(null);
  const revisarClave = useRef(null);

  /* Una caja de aviso que se abre es porque hay algo que decir, así que nunca
     queda en blanco: si la frase no se resolvió se dice lo genérico, que vive en
     el lector de frases en los tres idiomas. */
  const decir = (aviso) =>
    aviso ? (frase(aviso.clave, aviso.huecos) || frase('error.generico')) : '';

  useEffect(() => {
    let vigente = true;

    (async () => {
      const { ClienteDatos, Sesion } = await conLaBase();
      revisarClave.current = await conLaRevisionDeClaves();
      if (!vigente) return;

      /* La Prestadora se usa sólo para la marca de la tarjeta. Que no se
         reconozca no impide cambiar nada, así que no se avisa. */
      try {
        await ClienteDatos.initTenant();
      } catch (err) {
        console.warn('Nueva contraseña, marca de la Prestadora:', err);
      }
      if (!vigente) return;

      const motivo = motivoDelRechazo();
      if (motivo) {
        setAvisoSinEnlace({ clave: motivo });
        setEstado('sin-enlace');
        return;
      }

      /* Al abrir el enlace del correo, la biblioteca de la base deja abierta una
         sesión de recuperación. Si no hay ninguna, o se entró a esta dirección
         de frente o el enlace ya no valía. */
      let sesion = null;
      try {
        sesion = await Sesion.getSession();
      } catch (err) {
        /* Que la comprobación **falle** no es lo mismo que no haber llegado por
           el correo, y hasta acá se contaban igual: a quien se quedó sin red la
           pantalla le decía «esta pantalla se abre desde el enlace que llega por
           correo» y lo mandaba a pedir un enlace nuevo que tampoco iba a poder
           abrir. Es el estado error, y sin él se veía igual que el vacío.

           El título cambia junto con el aviso: dejarlo en «el enlace ya no
           sirve» sería afirmar algo que nadie llegó a comprobar. Lo demás del
           panel —que cada enlace vence, y el botón para pedir otro— sigue
           valiendo, así que queda como está.

           El detalle técnico lo registra `claveDeError` y no sale de la consola;
           a la pantalla va la frase que corresponde a esa clase de falla. */
        if (!vigente) return;
        setTituloSinEnlace('nueva.no_se_pudo_comprobar');
        setAvisoSinEnlace({ clave: Texto.claveDeError(err, 'Nueva contraseña, arranque:') });
        setEstado('sin-enlace');
        return;
      }
      if (!vigente) return;

      if (!sesion) {
        setAvisoSinEnlace({ clave: 'nueva.se_abre_desde_el_correo' });
        setEstado('sin-enlace');
        return;
      }

      /* Si la sesión no trae el correo, se nombra la cuenta sin decir cuál. Va
         por el catálogo como todo lo demás: es texto que se lee. */
      setCorreoEnCurso((sesion.user && sesion.user.email) || '');
      setEstado('listo');
    })();

    return () => { vigente = false; };
  }, []);

  async function guardarLaClave(evento) {
    evento.preventDefault();
    setAvisoErrorCambio(null);

    /* Quién decide qué contraseña vale es `js/clave.js`, el mismo que revisa en
       el acceso y en las altas. Devuelve la clave de la frase y sus huecos, que
       es justo lo que el cartel espera. */
    const problema = revisarClave.current.revisar(clave, claveRepetida);
    if (problema) {
      setAvisoErrorCambio({ clave: problema.clave, huecos: problema.huecos });
      const campo = clave === claveRepetida ? campoClave : campoClaveRepetida;
      if (campo.current) campo.current.focus();
      return;
    }

    setGuardando(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.cambiarClave(clave);
      setEstado('hecho');
    } catch (err) {
      // El detalle técnico lo registra `claveDeError` y no sale de la consola;
      // a la pantalla va la frase que corresponde a esa clase de falla.
      setAvisoErrorCambio({ clave: Texto.claveDeError(err, 'Nueva contraseña, guardado:') });
      setGuardando(false);
    }
  }

  return (
    <main className="acceso-pantalla">
      <div className="acceso-tarjeta">

        <div className="acceso-marca">
          <img className="tenant-logo" src="/assets/images/logotipo.png" alt="" />
          <span className="tenant-name"></span>
        </div>

        {estado === 'cargando' && (
          <div className="acceso-cargando">
            <i className="fas fa-circle-notch fa-spin"></i>{' '}
            <span>{frase('nueva.comprobando')}</span>
          </div>
        )}

        {estado === 'sin-enlace' && (
          <div>
            <h2 className="texto-20 peso-800 color-titulo mb-8">{frase(tituloSinEnlace)}</h2>
            <div className="acceso-aviso critico">{decir(avisoSinEnlace)}</div>
            <p className="texto-14 color-secundario interlineado-16 mb-20">
              {frase('nueva.cada_enlace')}
            </p>
            <Link to="/recuperar-clave" className="btn btn-primario ancho-total">
              {frase('nueva.pedir_otro')}
            </Link>
            <p className="acceso-pie">
              <Link to="/acceso">{frase('recuperar.volver')}</Link>
            </p>
          </div>
        )}

        {estado === 'listo' && (
          <form onSubmit={guardarLaClave} noValidate>
            <h2 className="texto-20 peso-800 color-titulo mb-8">{frase('nueva.titulo')}</h2>

            {/* El largo mínimo no se dice acá: lo dice la indicación que lleva
                adentro el campo de contraseña, que lo va a buscar al único lugar
                donde ese número existe. Repetirlo era tener dos. */}
            <p className="texto-15 peso-700 color-titulo interlineado-16">
              <strong>{correoEnCurso || frase('nueva.esta_cuenta')}</strong>
            </p>
            <p className="texto-14 color-secundario interlineado-16 mb-20">
              {frase('nueva.explicacion')}
            </p>

            {avisoErrorCambio && (
              <div className="acceso-aviso critico">{decir(avisoErrorCambio)}</div>
            )}

            <div className="form-group">
              <label htmlFor="nueva-clave">{frase('nueva.clave_nueva')}</label>
              <CampoDeClave
                id="nueva-clave" autoComplete="new-password" required
                ref={campoClave}
                value={clave} onChange={(e) => setClave(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nueva-clave-repetida">{frase('nueva.repetir')}</label>
              <CampoDeClave
                id="nueva-clave-repetida" autoComplete="new-password" required
                ref={campoClaveRepetida}
                value={claveRepetida} onChange={(e) => setClaveRepetida(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primario ancho-total mt-8" disabled={guardando}>
              {frase(guardando ? 'nueva.guardando' : 'nueva.guardar')}
            </button>
          </form>
        )}

        {estado === 'hecho' && (
          <div>
            <h2 className="texto-20 peso-800 color-titulo mb-8">{frase('nueva.cambiada')}</h2>
            <p className="texto-14 color-secundario interlineado-16 mb-20">
              {frase('nueva.ya_se_puede')}
            </p>
            <Link to="/acceso" className="btn btn-primario ancho-total">
              {frase('nueva.ir_al_acceso')}
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
