/* ===================================================
   EL PERFIL DE UN ASISTENTE PUBLICADO

   El mismo envase de siempre con otra forma: lo que la página hacía con el
   documento —esconder, sacar nodos, volver a traducir a mano— acá lo hace el
   estado. No se agregó ni se sacó nada de lo que la pantalla sabía hacer.

   **Esta pantalla es pública, y eso no es un olvido.** Es el segundo camino del
   mercado: la Familia mira el directorio, compara perfiles y contacta, y para
   comparar no hace falta tener cuenta. Lo que sí depende de quién mira es el
   botón de contactar, y eso se resuelve abajo. La vista de la base no devuelve
   ni un dato de contacto —ni teléfono, ni correo, ni domicilio—, así que mirar
   sin sesión no alcanza nada que el consentimiento de publicación no permita.

   Los cuatro estados son los que ya tenía: **cargando** mientras viaja la fila,
   **error** cuando no se pudo traer —con el botón de reintentar, que es lo
   único que la persona puede hacer—, **vacío** cuando no hay nadie publicado
   detrás de ese enlace, que no es una falla sino un enlace viejo, y **listo**
   con el perfil dibujado.

   **Lo que sale de un dato y lo que sale del catálogo no se mezclan.** El
   nombre de la persona, los nombres de sus zonas y las etiquetas de lo que
   atiende son datos y se escriben como vinieron; los rótulos son frases del
   catálogo y cambian con el idioma. Por eso el título de la pestaña deja de ser
   una frase apenas hay un nombre real: lo que se lee ahí pasó a ser un dato.
=================================================== */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Catalogo, Texto } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';

/* El papel de la Familia, escrito una sola vez. Es el mismo valor que compara
   el acceso y el que se guarda al dar de alta una cuenta de Familia. */
const ROL_FAMILIA = 'familiar';

/* A dónde se manda cuando el contacto sale bien: la aplicación de la Familia,
   con esa conversación abierta. Es otro programa, así que ahí se sale de éste y
   el salto no lo hace el enrutador. */
const DESTINO_CONVERSACION = '/pwa-familia/index.html#conversacion/';

/* Quién mira. Devuelve `null` cuando no se pudo saber, que **no es lo mismo**
   que «no hay sesión»: uno es que la pregunta falló y el otro que la respuesta
   es que no. Se distinguen porque de eso depende si se ofrece un botón, y ante
   la duda no se ofrece ninguno. */
async function quienMira(Sesion) {
  try {
    if (!Sesion) return null;
    const sesion = await Sesion.getSession();
    if (!sesion) return { sesion: false, rol: null };
    const perfil = await Sesion.perfil();
    // Con sesión y sin perfil tampoco se sabe el papel: el perfil vuelve nulo
    // igual cuando la consulta falla. Falla cerrado.
    if (!perfil) return null;
    return { sesion: true, rol: perfil.role || null };
  } catch (err) {
    console.error('Perfil, quién mira:', err);
    return null;
  }
}

export default function Perfil() {
  const { frase } = useFrases();
  const [parametros] = useSearchParams();
  usePestana('perfil.titulo', { descripcion: 'perfil.descripcion', fueraDeBuscadores: true });

  const id = parametros.get('id');

  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);
  const [fila, setFila] = useState(null);
  const [prestadora, setPrestadora] = useState('');
  const [nombreCorto, setNombreCorto] = useState('');
  const [claveDelError, setClaveDelError] = useState('');

  /* El contacto vive aparte del perfil a propósito: el perfil se ve igual
     mientras se averigua quién mira, y el botón aparece cuando se sabe.
     Mientras tanto queda «resolviendo», que es lo que la página mostraba al
     abrirse: el enlace para entrar como Familia y nada más. */
  const [contacto, setContacto] = useState('resolviendo');
  const [contactando, setContactando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    setContacto('resolviendo');
    setAviso(null);

    (async () => {
      try {
        const { ClienteDatos, Sesion } = await conLaBase();

        /* Tres cosas que hacen falta antes de dibujar y no dependen una de
           otra: cómo se escriben las zonas, la fila, y el catálogo que traduce
           `enfermero_universitario` a «Enfermero universitario». Las zonas se
           piden acá adentro y no arriba de todo por lo mismo que la puerta a la
           base: pedidas arriba viajarían hasta en las pantallas que no las
           miran. */
        const [, laFila] = await Promise.all([
          import('../../../js/zonas.js'),
          ClienteDatos.traerDelDirectorio(id),
          Catalogo.cargar()
        ]);
        if (!vigente) return;

        if (!laFila) { setEstado('vacio'); return; }

        // El título de la pestaña lleva el nombre de la Prestadora, que es de
        // quien es este directorio, y no el del producto: la persona llegó por
        // el enlace de una empresa y ese es el nombre que reconoce.
        setPrestadora((ClienteDatos.currentTenant && ClienteDatos.currentTenant.name) || '');
        setNombreCorto(ClienteDatos.slugPedido || '');
        setFila(laFila);
        setEstado('listo');

        const quien = await quienMira(Sesion);
        if (!vigente) return;

        // Sin sesión: el botón lleva a entrar y el cartel dice por qué. No se
        // ofrece un botón que promete abrir algo y falla al apretarlo.
        if (quien && quien.sesion === false) {
          setContacto('sin_sesion');
          setAviso({ clave: 'perfil.contactar_entrar', tono: 'atencion' });
          return;
        }

        // Con sesión de Familia: el botón abre la conversación, y entrar de
        // nuevo no tiene sentido.
        if (quien && quien.rol === ROL_FAMILIA) {
          setContacto('familia');
          return;
        }

        // Cualquier otro papel, uno que esta pantalla no reconoce, o no haber
        // podido averiguar quién mira: no se ofrece nada.
        setContacto('cerrado');
        setAviso({ clave: 'perfil.contactar_solo_familia', tono: 'atencion' });
      } catch (err) {
        if (!vigente) return;
        // La clave, no el texto: así el mensaje cambia con el idioma como
        // cualquier otro rótulo de la pantalla.
        setClaveDelError(Texto.claveDeError(err, 'traer el perfil'));
        setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [id, intento]);

  /* Lo que sale de la fila se arma una sola vez, cuando la fila llega, y no en
     cada dibujo. Que no se rehaga al cambiar de idioma es lo que la página ya
     hacía: los rótulos cambian, y los datos ya escritos quedan como estaban
     hasta que se vuelvan a pedir. */
  const perfilDibujado = useMemo(() => {
    if (!fila) return null;
    const Zonas = window.Zonas;
    const nombre = fila.full_name || '';

    // Arriba las regiones, que es lo que ubica de un vistazo, y acá van todas:
    // el «y 2 más» existe porque una tarjeta del directorio no tiene lugar, y
    // esta pantalla sí. Cuando la respuesta es texto libre esta línea queda
    // vacía a propósito: abajo está entera, y repetirla la diría dos veces.
    const zona = (fila.zonas || []).length ? Zonas.resumen(fila, Infinity) : '';
    // «Prefiero no decirlo» no se escribe: es la respuesta de quien no quiso
    // decirlo, y ponerla igual sería publicarla con otras palabras.
    const genero = fila.gender === 'sin_declarar'
      ? '' : Catalogo.etiquetaSiExiste('genero', fila.gender);

    return {
      nombre,
      inicial: (nombre || '?').trim().charAt(0).toUpperCase(),
      foto: window.ClienteDatos.urlDeFotoPublica(fila.foto),
      tipoYZona: [
        Catalogo.etiquetaSiExiste('tipo_asistente', fila.profession),
        genero,
        zona
      ].filter(Boolean).join(' · '),
      // La moneda va al lado del número: es la que el legajo tiene guardada, no
      // la de quien mira.
      importe: fila.hourly_rate
        ? Texto.importe(fila.hourly_rate, fila.moneda_valor_hora) : '',
      // Cada región es un renglón; adentro, los municipios que tildó. Una
      // región tildada entera queda con el renglón y sin municipios, que es
      // exactamente lo que contestó.
      grupos: Zonas.detalle(fila),
      comprobaciones: (fila.comprobaciones || []).map((clave) => ({
        clave,
        texto: Catalogo.etiquetaSiExiste('comprobacion', clave) || clave
      })),
      // Las patologías y las tareas son las mismas etiquetas del directorio: las
      // tareas están repartidas en tres vocabularios y el catálogo sabe
      // buscarlas en los tres.
      etiquetas: (fila.pathologies || [])
        .map((c) => Catalogo.etiquetaSiExiste('patologia', c) || c)
        .concat((fila.tasks || []).map((c) => Catalogo.etiquetaDeTarea(c)))
    };
  }, [fila]);

  /* El nombre de la pestaña deja de ser una frase apenas hay un nombre real.
     Se escribe después del que pone la vista, y se vuelve a escribir cada vez
     que aquél se rehace —al cambiar de idioma—, que si no el catálogo lo
     pisaría de vuelta con «Perfil de Asistente». */
  useEffect(() => {
    if (!perfilDibujado) return;
    document.title = [perfilDibujado.nombre, prestadora].filter(Boolean).join(' — ');
  }, [perfilDibujado, prestadora, frase]);

  /* Los dos enlaces a la pantalla de acceso se llevan el nombre corto de la
     Prestadora. Sin eso, quien llegó con `?t=<nombre corto>` y aprieta
     «Contactar» sin sesión cae en una pantalla que ya no sabe de qué Prestadora
     se estaba hablando. Por subdominio no hace falta: ése se conserva solo, y
     el nombre corto queda en nulo. */
  const enlaceDeAcceso = nombreCorto
    ? '/acceso?t=' + encodeURIComponent(nombreCorto) : '/acceso';

  /* Dos formas de escribir la última miga, porque son dos cosas distintas. El
     nombre de la persona es un dato y se escribe tal cual. «Perfil» es un
     rótulo, así que sale del catálogo y cambia con el idioma. */
  const miga = perfilDibujado && estado === 'listo'
    ? perfilDibujado.nombre
    : frase(estado === 'cargando' ? 'perfil.cargando' : 'perfil.miga');

  /* El contacto es el hecho por el que la Prestadora cobra, y es lo único que
     el software guarda de este camino: ni precio, ni condiciones, ni
     aceptación. Abrir la conversación es idempotente —si esa Familia ya tiene
     una con ese Asistente, devuelve la misma—, así que apretar dos veces no
     cuenta dos contactos; el botón se apaga igual mientras corre. */
  async function contactar() {
    setContactando(true);
    setAviso(null);
    try {
      const { ClienteDatos } = await conLaBase();
      const conversacion = await ClienteDatos.abrirConversacion(fila.id, null);
      if (!conversacion || !conversacion.id) throw new Error('conversacion_no_creada');
      window.location.href = DESTINO_CONVERSACION + encodeURIComponent(conversacion.id);
    } catch (err) {
      // Dos renglones y son dos cosas distintas: qué no se pudo hacer, que es
      // una frase de esta pantalla, y por qué, que lo clasifica `Texto`.
      setAviso({
        clave: 'perfil.contactar_error',
        tono: 'critico',
        detalle: Texto.mensajeDeError(err, 'abrir la conversación')
      });
      setContactando(false);
    }
  }

  return (
    <>
      {/* La miga. El ancho y el aire de esta barra no los dice ninguna clase de
          `css/utilidades.css`, así que ésos quedan escritos acá y el resto no. */}
      <div className="fondo-superficie-hover borde-abajo" style={{ padding: '12px 24px' }}>
        <div className="m-centrado texto-13 color-secundario" style={{ maxWidth: '900px' }}>
          <Link to="/" className="color-info">{frase('nav.inicio')}</Link>
          {' > '}
          <Link to="/directorio" className="color-info">{frase('pie.directorio')}</Link>
          {' > '}
          <span>{miga}</span>
        </div>
      </div>

      {estado === 'cargando' && (
        <div className="directorio-estado">
          <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i>{' '}
          <span>{frase('perfil.cargando')}</span>
        </div>
      )}

      {estado === 'error' && (
        <div className="directorio-estado">
          <p>{frase(claveDelError)}</p>
          <p className="mt-16 flex gap-12 justificar-centro envolver">
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setIntento((cuantos) => cuantos + 1)}
            >
              {frase('acceso.reintentar')}
            </button>
            <Link
              className="btn btn-sobre-oscuro borde-color-tarjeta color-secundario"
              to="/directorio"
            >
              {frase('perfil.volver')}
            </Link>
          </p>
        </div>
      )}

      {estado === 'vacio' && (
        <div className="directorio-estado">
          <p><strong>{frase('perfil.no_disponible')}</strong></p>
          <p className="directorio-estado-bajada">{frase('perfil.no_disponible_bajada')}</p>
          <p className="mt-16">
            <Link className="btn btn-primario" to="/directorio">{frase('perfil.volver')}</Link>
          </p>
        </div>
      )}

      {estado === 'listo' && perfilDibujado && (
        <>
          <section className="profile-hero">
            <div className="profile-layout container">
              <div className="profile-avatar-wrap">
                {/* La foto o, si no cargó ninguna, la inicial del nombre. Se
                    dibuja una de las dos y nunca la otra escondida: un hueco
                    escondido es un hueco que algún día vuelve a aparecer. */}
                {perfilDibujado.foto ? (
                  <img
                    className="profile-avatar"
                    src={perfilDibujado.foto}
                    alt={perfilDibujado.nombre}
                  />
                ) : (
                  <div className="profile-avatar perfil-avatar-inicial" aria-hidden="true">
                    {perfilDibujado.inicial}
                  </div>
                )}
              </div>

              <div className="profile-info">
                <h1>{perfilDibujado.nombre}</h1>
                <p className="sub">{perfilDibujado.tipoYZona}</p>

                {perfilDibujado.importe && (
                  <p className="perfil-precio">
                    {perfilDibujado.importe}{' '}
                    <span className="perfil-precio-unidad">{frase('directorio.por_hora')}</span>
                  </p>
                )}

                {fila.reemplazos_urgentes && (
                  <div className="profile-urgent">
                    <i className="fas fa-clock" aria-hidden="true"></i>{' '}
                    <span>{frase('directorio.urgencias')}</span>
                  </div>
                )}

                <div>
                  <span className="insignia-validada" title={frase('directorio.validado_detalle')}>
                    <i className="fas fa-user-check" aria-hidden="true"></i>{' '}
                    <span>{frase('directorio.validado')}</span>
                  </span>
                </div>

                {/* Qué se le comprobó. Sale de la misma vista que el directorio,
                    así que dice lo mismo en las dos pantallas y no hay una
                    segunda regla que mantener. */}
                {perfilDibujado.comprobaciones.length > 0 && (
                  <div className="lista-comprobaciones">
                    {perfilDibujado.comprobaciones.map(({ clave, texto }) => (
                      <span className="insignia-comprobacion" key={clave}>{texto}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="profile-content">
            <div className="profile-grid">

              <div>
                {/* Dónde trabaja. Está aparte de «Qué atiende» porque son dos
                    preguntas distintas, y porque quien cubre cinco zonas
                    necesita renglones: en la línea de arriba entran las regiones
                    y nada más. */}
                <div className="profile-section fade-in">
                  <h3>{frase('perfil.donde_trabaja')}</h3>
                  {perfilDibujado.grupos.length > 0 ? (
                    <div>
                      {perfilDibujado.grupos.map((grupo, cual) => (
                        <p className="perfil-zona-region" key={grupo.region || cual}>
                          {grupo.region && <strong>{grupo.region}</strong>}
                          {grupo.partes.length > 0
                            && (grupo.region ? ': ' : '') + grupo.partes.join(', ')}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p>{frase('perfil.sin_zonas')}</p>
                  )}
                </div>

                <div className="profile-section fade-in">
                  <h3>{frase('perfil.que_atiende')}</h3>
                  {perfilDibujado.etiquetas.length > 0 ? (
                    <div className="spec-list">
                      {perfilDibujado.etiquetas.map((texto) => (
                        <span className="spec-item" key={texto}>{texto}</span>
                      ))}
                    </div>
                  ) : (
                    <p>{frase('perfil.sin_etiquetas')}</p>
                  )}
                </div>
              </div>

              <div>
                {/* El contacto no se dibuja como un formulario que anda. Acá
                    había uno que contestaba «¡Mensaje enviado!» sin mandar nada
                    a ninguna parte, y esa respuesta era falsa dos veces: no se
                    enviaba, y aunque se enviara el consentimiento de publicación
                    promete que sólo las Familias registradas pueden
                    comunicarse. */}
                <div className="profile-section fade-in" id="contactar">
                  <h3>{frase('perfil.contactar')}</h3>
                  <p>{frase('perfil.contacto_bajada')}</p>

                  {aviso && (
                    <div className={'acceso-aviso ' + aviso.tono} role="status">
                      <span>{frase(aviso.clave)}</span>
                      {/* El motivo técnico ya viene clasificado y traducido, así
                          que se escribe tal cual y en un nodo aparte. */}
                      <span>{aviso.detalle ? ' ' + aviso.detalle : ''}</span>
                    </div>
                  )}

                  {/* Qué se ofrece acá lo decide **quién mira**: sin sesión, un
                      botón que lleva a entrar; con sesión de Familia, el que
                      abre la conversación; con cualquier otro papel —y también
                      cuando no se pudo averiguar quién mira—, ninguno: el
                      control falla cerrado. */}
                  <div className="profile-acciones">
                    {contacto === 'familia' && (
                      <button
                        type="button"
                        className="btn btn-primario"
                        onClick={contactar}
                        disabled={contactando}
                      >
                        {frase(contactando ? 'perfil.contactando' : 'directorio.contactar')}
                      </button>
                    )}

                    {contacto === 'sin_sesion' && (
                      <Link className="btn btn-primario" to={enlaceDeAcceso}>
                        {frase('directorio.contactar')}
                      </Link>
                    )}

                    {contacto === 'resolviendo' && (
                      <Link className="btn btn-primario" to={enlaceDeAcceso}>
                        {frase('perfil.entrar_familia')}
                      </Link>
                    )}

                    <Link
                      className="btn btn-sobre-oscuro borde-color-tarjeta color-secundario"
                      to="/registrar-familia"
                    >
                      {frase('nav.publicar_aviso')}
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      <div className="cta-banner">
        <Link to="/directorio" className="btn btn-atencion">{frase('perfil.ver_mas')}</Link>
      </div>
    </>
  );
}
