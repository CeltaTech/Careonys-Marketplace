/* ===================================================
   RECUPERAR LA CONTRASEÑA

   Hermana de la pantalla de acceso, y por eso sigue su forma: pide la puerta,
   espera, y recién entonces pregunta. Los tres estados de allá, más uno propio
   —**enviado**—, que es lo único que la persona ve después de pedir el enlace.
   El «vacío» acá tampoco existe: no hay ninguna lista que pueda venir sin
   elementos.

   **La Prestadora se resuelve sólo para la marca de la tarjeta.** Que no se
   reconozca no impide recuperar nada, así que a diferencia del acceso acá no se
   avisa: sería un cartel sobre algo que a quien mira no le cambia nada.

   **El correo puede venir escrito desde el acceso**, para no hacerlo tipear dos
   veces. Viaja por `sessionStorage` y no colgado de la dirección: un correo en
   la dirección queda en el historial del navegador y en el registro de
   cualquier servidor que la vea. Se lee una sola vez y se borra al leerlo.

   **Y la respuesta es siempre la misma, exista la cuenta o no.** Contestar
   distinto le regalaría a cualquiera una forma de averiguar qué correos están
   registrados acá. Por eso el estado «enviado» no depende de nada que la base
   haya contestado sobre esa dirección, y nombra al correo que se escribió, no
   al que exista.

   **Los avisos guardan la clave de la frase, no la frase.** Así un cambio de
   idioma con el cartel en pantalla lo alcanza solo, sin que nadie lo vaya a
   buscar.
=================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { conPrestadora } from '#comun/direcciones.js';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

export default function RecuperarClave() {
  const { frase } = useFrases();
  /* Pantalla de la sesión, no del directorio: no tiene nada que hacer en un
     buscador. */
  usePestana('recuperar.titulo', { fueraDeBuscadores: true });

  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);
  const [correo, setCorreo] = useState('');
  const [correoAvisado, setCorreoAvisado] = useState('');
  const [avisoEnvio, setAvisoEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [nombreCorto, setNombreCorto] = useState('');

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');

    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        await ClienteDatos.initTenant();
        if (!vigente) return;

        setNombreCorto(ClienteDatos.slugPedido || '');
        setEstado('listo');

        /* Lo que dejó escrito la pantalla de acceso. Se borra apenas se usa:
           una vez puesto en el formulario ya no hace falta guardado, y dejarlo
           ahí lo haría reaparecer en una visita posterior que no tiene nada que
           ver con ésta. */
        const traido = sessionStorage.getItem('correo-a-recuperar');
        if (traido) {
          setCorreo(traido);
          sessionStorage.removeItem('correo-a-recuperar');
        }
      } catch (err) {
        console.error('Recuperar la contraseña, arranque:', err);
        if (vigente) setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [intento]);

  async function enviar(evento) {
    evento.preventDefault();
    setAvisoEnvio('');

    const elCorreo = correo.trim();
    if (!elCorreo) {
      setAvisoEnvio('recuperar.falta_correo');
      return;
    }

    setEnviando(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.pedirNuevaClave(elCorreo);
      setCorreoAvisado(elCorreo);
      setEstado('enviado');
    } catch (err) {
      // El detalle técnico lo registra `claveDeError` y no sale de la consola;
      // a la pantalla va la frase que corresponde a esa clase de falla.
      setAvisoEnvio(Texto.claveDeError(err, 'Recuperar la contraseña, envío:'));
      setEnviando(false);
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
            <span>{frase('recuperar.cargando')}</span>
          </div>
        )}

        {estado === 'error' && (
          <div>
            {/* Las dos frases son las mismas de la pantalla de acceso y se piden
                con su clave: la misma frase escrita dos veces se traduce dos
                veces y se corrige una sola. */}
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
          <form onSubmit={enviar} noValidate>
            <h2 className="texto-20 peso-800 color-titulo mb-8">
              {frase('recuperar.titulo')}
            </h2>
            <p className="texto-14 color-secundario interlineado-16 mb-20">
              {frase('recuperar.explicacion')}
            </p>

            {avisoEnvio && (
              <div className="acceso-aviso critico">{frase(avisoEnvio)}</div>
            )}

            <div className="form-group">
              <label htmlFor="recuperar-email">{frase('acceso.correo')}</label>
              <input
                type="email" id="recuperar-email" autoComplete="username" required
                value={correo} onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primario ancho-total mt-8" disabled={enviando}>
              {frase(enviando ? 'recuperar.enviando' : 'recuperar.enviar')}
            </button>

            <p className="acceso-pie">
              <Link to={conPrestadora('/acceso', nombreCorto)}>{frase('recuperar.volver')}</Link>
            </p>
          </form>
        )}

        {estado === 'enviado' && (
          <div>
            <h2 className="texto-20 peso-800 color-titulo mb-8">
              {frase('recuperar.revise_correo')}
            </h2>
            {/* El correo va solo, en su propio renglón, y no adentro de la
                frase. Una frase se traduce entera, así que partirla en dos
                pedazos alrededor del correo sale mal en cuanto un idioma ordena
                distinto. Arriba y aparte, se lee igual de bien en los tres. */}
            <p className="texto-15 peso-700 color-titulo interlineado-16">
              <strong>{correoAvisado}</strong>
            </p>
            <p className="texto-14 color-secundario interlineado-16">
              {frase('recuperar.enlace_enviado')}
            </p>
            <p className="texto-14 color-secundario interlineado-16 mt-12">
              {frase('recuperar.no_aparece')}
            </p>
            <p className="acceso-pie">
              <Link to={conPrestadora('/acceso', nombreCorto)}>{frase('recuperar.volver')}</Link>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
