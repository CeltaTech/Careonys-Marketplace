/* ===================================================
   ACCESO

   La primera pantalla que abre la puerta a la base, y por eso vale como
   modelo de las que vienen: pide la puerta, espera, y recién entonces pregunta.

   Los tres estados que ya tenía, tal cual: **cargando** mientras se comprueba
   si ya había sesión, **error** cuando no se pudo llegar al servidor —con el
   botón de reintentar, que es lo único que la persona puede hacer—, y
   **listo** con el formulario. El cuarto, «vacío», acá no existe: no hay lista
   que pueda venir sin elementos.

   Dos cosas de las que estaban escritas adentro de la página se resolvieron
   mejor y conviene decir por qué:

   **Los avisos guardan la clave de la frase, no la frase.** Ya era así antes,
   con el texto colgado del cartel para poder retraducirlo. Acá se guarda la
   clave y se pide la frase al dibujar, así que un cambio de idioma con el
   cartel en pantalla lo alcanza solo, sin que nadie lo vaya a buscar.

   **A dónde va cada quien después de entrar** son dos destinos distintos y no
   uno: las vistas de esta web las abre el enrutador sin recargar, y los dos
   programas del teléfono son otros programas, así que a ésos se va de verdad.
=================================================== */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Texto } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';

/* Dónde le toca entrar a cada papel. Los dos primeros son vistas de acá; los
   dos del teléfono son programas aparte, y ahí se sale de éste. */
function aDondeVa(perfil, volver) {
  if (volver && /^[a-zA-Z0-9_-]+$/.test(volver)) return { afuera: false, a: '/' + volver };
  const papel = perfil ? perfil.role : null;
  if (papel === 'coordinador') return { afuera: false, a: '/panel-prestadora' };
  if (papel === 'caregiver') return { afuera: true, a: '/pwa-asistente/' };
  if (papel === 'familiar') return { afuera: true, a: '/pwa-familia/' };
  return { afuera: false, a: '/' };
}

export default function Acceso() {
  const { frase } = useFrases();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  usePestana('acceso.titulo', { fueraDeBuscadores: true });

  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);
  const [nombreCorto, setNombreCorto] = useState('');
  const [avisoPrestadora, setAvisoPrestadora] = useState('');
  const [avisoAcceso, setAvisoAcceso] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  const irA = useCallback((destino) => {
    if (destino.afuera) window.location.href = destino.a;
    else navegar(destino.a, { replace: true });
  }, [navegar]);

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');

    (async () => {
      try {
        const { ClienteDatos, Sesion } = await conLaBase();

        const sesion = await Sesion.getSession();
        if (!vigente) return;
        if (sesion) {
          irA(aDondeVa(await Sesion.perfil(), parametros.get('volver')));
          return;
        }

        /* Acá la Prestadora todavía no la decide la sesión: se usa sólo para la
           marca. Si el enlace nombra una que no existe se avisa y se sigue,
           porque quien entre va a caer en la suya de todas formas. */
        await ClienteDatos.initTenant();
        if (!vigente) return;

        setNombreCorto(ClienteDatos.slugPedido || '');
        setAvisoPrestadora(
          ClienteDatos.currentTenant && ClienteDatos.currentTenant.id
            ? '' : 'acceso.prestadora_desconocida');
        setEstado('listo');
      } catch (err) {
        console.error('Acceso, arranque:', err);
        if (vigente) setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [intento, irA, parametros]);

  /* Las dos altas se hacen contra una Prestadora, y la de quien todavía no
     tiene cuenta sólo puede salir de la dirección: no hay perfil de dónde
     sacarla. Sin el nombre corto, la pantalla de alta abre sin Prestadora y no
     da de alta a nadie —falla cerrado a propósito, antes que dejar nacer una
     ficha huérfana—, y la persona queda contra una puerta cerrada sin saber por
     qué. Por subdominio no hace falta: ése se conserva solo. */
  const conPrestadora = (camino) =>
    nombreCorto ? camino + '?t=' + encodeURIComponent(nombreCorto) : camino;

  async function entrar(evento) {
    evento.preventDefault();
    setAvisoAcceso('');

    const elCorreo = correo.trim();
    if (!elCorreo || !clave) {
      setAvisoAcceso('acceso.faltan_datos');
      return;
    }

    setEntrando(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.login(elCorreo, clave);
      irA(aDondeVa(await Sesion.perfil(), parametros.get('volver')));
    } catch (err) {
      // El detalle técnico lo registra `claveDeError` y no sale de la consola;
      // a la pantalla va la frase que corresponde a esa clase de falla.
      setAvisoAcceso(Texto.claveDeError(err, 'Acceso, inicio de sesión:'));
      setEntrando(false);
    }
  }

  /* Si ya escribió el correo, se lo lleva a la pantalla de recuperación para no
     hacerlo tipear dos veces. Va por `sessionStorage` y no colgado de la
     dirección: un correo en la dirección queda en el historial del navegador y
     en el registro de cualquier servidor que la vea. */
  const recordarCorreo = () => {
    const escrito = correo.trim();
    if (escrito) sessionStorage.setItem('correo-a-recuperar', escrito);
  };

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
            <span>{frase('acceso.verificando')}</span>
          </div>
        )}

        {estado === 'error' && (
          <div>
            <div className="acceso-aviso critico">{frase('acceso.sin_servidor')}</div>
            <button
              type="button"
              className="btn btn-secundario ancho-total"
              onClick={() => setIntento((cuantos) => cuantos + 1)}
            >
              {frase('acceso.reintentar')}
            </button>
          </div>
        )}

        {estado === 'listo' && (
          <form onSubmit={entrar} noValidate>
            {avisoPrestadora && (
              <div className="acceso-aviso atencion">{frase(avisoPrestadora)}</div>
            )}
            {avisoAcceso && (
              <div className="acceso-aviso critico">{frase(avisoAcceso)}</div>
            )}

            <div className="form-group">
              <label htmlFor="acceso-email">{frase('acceso.correo')}</label>
              <input
                type="email" id="acceso-email" autoComplete="username" required
                value={correo} onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="acceso-clave">{frase('acceso.contrasena')}</label>
              <input
                type="password" id="acceso-clave" autoComplete="current-password" required
                value={clave} onChange={(e) => setClave(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primario ancho-total mt-8" disabled={entrando}>
              {frase(entrando ? 'acceso.entrando' : 'acceso.entrar')}
            </button>

            <p className="acceso-pie">
              <Link to="/recuperar-clave" onClick={recordarCorreo}>{frase('acceso.olvide')}</Link>
            </p>

            <p className="acceso-pie">
              <span>{frase('acceso.sin_cuenta')}</span>{' '}
              <Link to={conPrestadora('/registrar-asistente')}>
                {frase('acceso.darse_de_alta')}
              </Link>{' '}
              <span>{frase('acceso.o_bien')}</span>{' '}
              <Link to={conPrestadora('/registrar-familia')}>
                {frase('acceso.darse_de_alta_familia')}
              </Link>
            </p>
          </form>
        )}

      </div>
    </main>
  );
}
