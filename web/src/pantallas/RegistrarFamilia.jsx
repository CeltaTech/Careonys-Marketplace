/* ===================================================
   ALTA DE FAMILIA

   La hermana chica del alta de Asistente, y la misma tarjeta que el acceso: sin
   barra de arriba ni pie, porque nunca los tuvo. El marco lo pone el enrutador,
   y a esta vista no le pone ninguno.

   Los cuatro estados son los que ya tenía la página: **cargando** mientras se
   comprueba si había sesión y se resuelve la Prestadora, **error** cuando no se
   pudo llegar al servidor —con el botón de reintentar, que es lo único que se
   puede hacer—, **listo** con el formulario, y **confirmar**, que es a donde se
   llega cuando la cuenta quedó creada y falta abrir el enlace del correo.

   **Acá el alta falla cerrado, y no es lo mismo que en el acceso.** Quien entra
   trae su Prestadora escrita en el perfil y por eso allá se puede seguir sin
   saberla; acá el perfil todavía no existe y la Prestadora sale del nombre corto
   que viaja en la dirección. Sin ese dato el perfil nacería huérfano, la RLS le
   rechazaría después toda escritura y la cuenta quedaría inservible sin que
   nadie se entere. Antes que eso, no se crea ninguna: se avisa y el botón queda
   apagado.

   Dos cosas que la página resolvía a mano y acá salen solas. **Los avisos
   guardan la clave de la frase y sus huecos, no el texto**, así que un cambio de
   idioma con el cartel en pantalla lo alcanza sin que nadie lo vaya a buscar; y
   **el texto de la pantalla ya llegó antes de dibujarse**, porque el proveedor
   de frases lo espera, así que acá no hace falta volver a pedirlo.
=================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { conPrestadora } from '#comun/direcciones.js';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import { conLaRevisionDeClaves } from '#comun/datos/claves.js';
import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';

/* A dónde va quien ya tiene sesión, por el papel que tiene en la Prestadora
   donde está parada. Es la misma tabla de destinos que el acceso, y son dos
   clases de destino y no una: las vistas de esta web las abre el enrutador sin
   recargar, y los dos programas del teléfono son otros programas, así que a
   ésos se va de verdad. */
function aDondeVa(perfil) {
  const papel = perfil ? perfil.role : null;
  if (papel === 'coordinador') return { afuera: false, a: '/panel-prestadora' };
  if (papel === 'caregiver') return { afuera: true, a: '/pwa-asistente/' };
  if (papel === 'familiar') return { afuera: true, a: '/pwa-familia/' };
  return { afuera: false, a: '/' };
}

export default function RegistrarFamilia() {
  const { frase } = useFrases();
  const navegar = useNavigate();
  usePestana('alta_familia.titulo', { fueraDeBuscadores: true });

  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);

  const [nombreCorto, setNombreCorto] = useState('');
  const [avisoPrestadora, setAvisoPrestadora] = useState(null);
  const [avisoErrorAlta, setAvisoErrorAlta] = useState(null);
  const [avisoConfirmarHecho, setAvisoConfirmarHecho] = useState(null);
  const [avisoConfirmarError, setAvisoConfirmarError] = useState(null);

  const [creando, setCreando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [claveRepetida, setClaveRepetida] = useState('');

  const campoClave = useRef(null);
  const campoClaveRepetida = useRef(null);

  /* La Prestadora de esta alta y el correo con el que se creó la cuenta viven
     fuera del dibujo: los leen y los escriben los dos manejadores, y cambiarlos
     no tiene por qué redibujar nada. Lo que sí se dibuja —cuál es la
     Prestadora, que además dice si hay una— va aparte, en `nombreCorto`. */
  const prestadora = useRef(null);
  const correoDelAlta = useRef(null);
  const revisarClave = useRef(null);

  const irA = useCallback((destino) => {
    if (destino.afuera) window.location.href = destino.a;
    else navegar(destino.a, { replace: true });
  }, [navegar]);

  /* Una caja de aviso que se abre es porque hay algo que decir, así que nunca
     queda en blanco: si la frase no se resolvió se dice lo genérico, que vive
     en el lector de frases en los tres idiomas. */
  const decir = (aviso) =>
    aviso ? (frase(aviso.clave, aviso.huecos) || frase('error.generico')) : '';

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');

    (async () => {
      try {
        const { ClienteDatos, Sesion } = await conLaBase();
        revisarClave.current = await conLaRevisionDeClaves();

        // Quien ya tiene sesión no se da de alta de nuevo: va adonde le toca.
        const sesion = await Sesion.getSession();
        if (!vigente) return;
        if (sesion) {
          irA(aDondeVa(await Sesion.perfil()));
          return;
        }

        const laPrestadora = await ClienteDatos.initTenant();
        if (!vigente) return;

        prestadora.current = laPrestadora;
        setNombreCorto((laPrestadora && laPrestadora.slug) || '');
        setEstado('listo');

        /* El estado vacío del arranque: la dirección no nombró ninguna
           Prestadora, o nombró una que no existe. Ver arriba por qué acá eso no
           se deja pasar. */
        if (!laPrestadora || !laPrestadora.slug) {
          setAvisoPrestadora({ clave: 'alta.sin_prestadora' });
        }
      } catch (err) {
        console.error('Alta de Familia, arranque:', err);
        if (vigente) setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [intento, irA]);

  /* Cuando el correo escrito ya tiene cuenta, el servidor contesta que el alta
     salió bien y no manda ningún correo, a propósito, para que nadie pueda
     averiguar desde afuera quién está registrado. Así que la pantalla no sabe
     cuál de los dos casos tiene delante, y prueba: si con lo que se acaba de
     escribir se puede entrar, es la misma persona registrándose de nuevo, y
     queda dada de alta también en esta Prestadora.

     De la Prestadora anterior no se lee ni se nombra nada: el nombre y el papel
     salen de este formulario, que es el que la persona acaba de llenar acá. Una
     Prestadora no ve las cuentas de otra, tampoco desde acá.

     Devuelve `true` sólo si se pudo entrar. Si no se pudo —la cuenta se acaba de
     crear y todavía no está confirmada, o alguien escribió el correo de otro con
     una contraseña que no es— sigue por el mismo camino que el alta normal, y
     por eso ninguno de los dos casos se distingue del otro desde afuera. */
  async function quedarDadaDeAltaConLaCuentaQueYaExiste(Sesion, elCorreo, laClave, elNombre) {
    try {
      await Sesion.login(elCorreo, laClave);
    } catch {
      /* No se pudo entrar, y por qué no se pudo no cambia nada: se sigue por el
         mismo camino que el alta normal, que es lo que hace que los dos casos no
         se distingan desde afuera. */
      return false;
    }
    try {
      await Sesion.sumarseAPrestadora(prestadora.current.slug, 'familiar', elNombre);
    } catch (err) {
      /* Entró y no se pudo dar de alta acá: se cierra la sesión antes de
         devolver el error. Si no, la persona queda con la sesión abierta en una
         pantalla que le dice que falló, y el próximo arranque la mandaría a la
         Prestadora donde sí tiene ficha sin que ella lo haya pedido. */
      await Sesion.logout();
      throw err;
    }
    irA(aDondeVa(await Sesion.perfil()));
    return true;
  }

  async function crearLaCuenta(evento) {
    evento.preventDefault();
    setAvisoErrorAlta(null);

    const elNombre = nombre.trim();
    const elCorreo = correo.trim();

    if (!elNombre || !elCorreo) {
      setAvisoErrorAlta({ clave: 'alta_familia.faltan_datos' });
      return;
    }

    /* Devuelve la clave de la frase, no la frase. El servidor la rechazaría
       igual, pero avisar acá evita crear media cuenta. */
    const problemaClave = revisarClave.current.revisar(clave, claveRepetida);
    if (problemaClave) {
      setAvisoErrorAlta({ clave: problemaClave.clave, huecos: problemaClave.huecos });
      const campo = clave === claveRepetida ? campoClave : campoClaveRepetida;
      if (campo.current) campo.current.focus();
      return;
    }

    setCreando(true);
    try {
      const { ClienteDatos, Sesion } = await conLaBase();

      /* La Prestadora, antes que la cuenta. El botón está apagado mientras no
         haya ninguna, así que acá no debería faltar nunca; si igual falta, no se
         crea nada. Volver a resolverla no serviría: sale de la dirección, que es
         la misma con la que se abrió la pantalla. */
      if (!prestadora.current || !prestadora.current.slug) {
        setAvisoErrorAlta({ clave: 'alta.sin_prestadora' });
        return;
      }

      const alta = await Sesion.signup(elCorreo, clave, {
        full_name: elNombre,
        /* El papel de la Familia es `familiar`, que es uno de los dos que el
           disparador de la migración 0005 acepta de quien se registra por su
           cuenta. El otro es `caregiver`; `coordinador` no está en la lista a
           propósito, porque ése lo da alguien que ya está adentro. */
        role: 'familiar',
        tenant_slug: prestadora.current.slug
      });

      if (!alta.session) {
        if (await quedarDadaDeAltaConLaCuentaQueYaExiste(Sesion, elCorreo, clave, elNombre)) return;

        /* El camino normal: el proyecto exige confirmar el correo, así que la
           cuenta queda creada y la sesión no llega hasta que se abra el enlace
           del mail. No hay nada más que guardar, así que la pantalla lo dice y
           ofrece volver a mandarlo. Y es exactamente lo mismo que ve quien
           escribió el correo de otro con una contraseña que no es, que es lo que
           hace que esta pantalla no delate a nadie. */
        correoDelAlta.current = elCorreo;
        setAvisoConfirmarHecho({
          clave: 'alta_familia.revise_el_correo',
          huecos: { correo: elCorreo }
        });
        setAvisoConfirmarError(null);
        setEstado('confirmar');
        return;
      }

      /* Y si algún día el proyecto deja de pedir la confirmación, la sesión
         llega acá misma y no hay razón para hacer esperar a nadie. */
      irA({ afuera: true, a: '/pwa-familia/' });
    } catch (err) {
      // El detalle técnico lo registra `claveDeError` y no sale de la consola;
      // a la pantalla va la frase que corresponde a esa clase de falla.
      setAvisoErrorAlta({ clave: Texto.claveDeError(err, 'Alta de Familia, crear la cuenta:') });
    } finally {
      /* El botón vuelve **sólo si hay con qué dar de alta**. Sin Prestadora
         resuelta queda apagado, que es lo mismo que hace el arranque: dejarlo
         encendido invita a apretar una puerta que no abre. */
      setCreando(false);
      setNombreCorto((prestadora.current && prestadora.current.slug) || '');
    }
  }

  /* El correo que no llegó. El servidor limita cuántos manda por hora, así que
     un segundo pedido seguido puede volver con ese aviso en lugar de un mail;
     `Texto.claveDeError` ya lo distingue. */
  async function reenviarLaConfirmacion() {
    if (!correoDelAlta.current) return;
    setReenviando(true);
    setAvisoConfirmarError(null);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.reenviarConfirmacion(correoDelAlta.current);
      setAvisoConfirmarHecho({ clave: 'alta.correo_reenviado' });
    } catch (err) {
      setAvisoConfirmarError({
        clave: Texto.claveDeError(err, 'Alta de Familia, reenviar la confirmación:')
      });
    } finally {
      setReenviando(false);
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
            <span>{frase('alta_familia.preparando')}</span>
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
          <form onSubmit={crearLaCuenta} noValidate>
            <h1 className="texto-18 peso-700 mb-8 color-titulo">
              {frase('alta_familia.encabezado')}
            </h1>
            <p className="texto-13 color-secundario mb-16">
              {frase('alta_familia.bajada')}
            </p>

            {avisoPrestadora && (
              <div className="acceso-aviso critico">{decir(avisoPrestadora)}</div>
            )}
            {avisoErrorAlta && (
              <div className="acceso-aviso critico">{decir(avisoErrorAlta)}</div>
            )}

            <div className="form-group">
              <label htmlFor="alta-nombre">{frase('alta_familia.nombre')}</label>
              <input
                type="text" id="alta-nombre" autoComplete="name" required
                value={nombre} onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="alta-email">{frase('acceso.correo')}</label>
              <input
                type="email" id="alta-email" autoComplete="email" required
                value={correo} onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="alta-clave">{frase('acceso.contrasena')}</label>
              <CampoDeClave
                ref={campoClave}
                id="alta-clave" autoComplete="new-password" required
                value={clave} onChange={(e) => setClave(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="alta-clave-repetida">{frase('alta_familia.repetir_clave')}</label>
              <CampoDeClave
                ref={campoClaveRepetida}
                id="alta-clave-repetida" autoComplete="new-password" required
                value={claveRepetida} onChange={(e) => setClaveRepetida(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primario ancho-total mt-8"
              disabled={creando || !nombreCorto}
            >
              {frase(creando ? 'alta_familia.creando' : 'alta_familia.crear')}
            </button>

            <p className="acceso-pie">{frase('alta_familia.avisa_confirmacion')}</p>

            <p className="acceso-pie">
              <span>{frase('alta_familia.ya_tiene_cuenta')}</span>{' '}
              <Link to={conPrestadora('/acceso', nombreCorto)}>
                {frase('alta_familia.ir_al_acceso')}
              </Link>
            </p>
          </form>
        )}

        {estado === 'confirmar' && (
          <div>
            <div className="acceso-aviso atencion">{decir(avisoConfirmarHecho)}</div>
            {avisoConfirmarError && (
              <div className="acceso-aviso critico">{decir(avisoConfirmarError)}</div>
            )}

            <button
              type="button"
              className="btn btn-secundario ancho-total"
              onClick={reenviarLaConfirmacion}
              disabled={reenviando}
            >
              {frase(reenviando ? 'alta_familia.reenviando' : 'alta_familia.reenviar')}
            </button>

            <Link
              to={conPrestadora('/acceso', nombreCorto)}
              className="btn btn-primario ancho-total mt-8"
            >
              {frase('alta_familia.volver_al_acceso')}
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
