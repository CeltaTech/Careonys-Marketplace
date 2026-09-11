/* ===================================================
   LAS EVALUACIONES

   La misma pantalla de siempre con otro envase: lo que la página hacía con el
   documento —esconder paneles, sacar nodos, colgarles la clave de una frase y
   volver a traducirlos a mano— acá lo hace el estado. No se agregó ni se sacó
   nada de lo que la pantalla sabía hacer.

   **Son seis paneles y uno solo se ve por vez**, los mismos seis que la página
   prendía y apagaba con la clase `oculto`: los cuatro estados de siempre
   —cargando, error, vacío, listo— y el «listo» partido en tres, porque de eso
   se trata esta pantalla: elegir qué rendir, rendirlo y ver cómo salió.

   **Los avisos guardan la clave de la frase, no la frase.** Ya era así antes,
   con la clave colgada del cartel para poder retraducirlo cuando cambiara el
   idioma. Acá se guarda la clave y se pide la frase al dibujar, así que un
   cambio de idioma con el cartel en pantalla lo alcanza solo.

   **Lo que sale de un dato y lo que sale del catálogo no se mezclan.** El
   nombre de la evaluación, los enunciados y el texto de cada opción los cargó
   alguien de la Prestadora: son datos y se escriben como vinieron. Todo lo
   demás son frases del catálogo y cambian con el idioma. Y se escriben como
   texto, nunca como marcas de página: una etiqueta metida adentro de un
   enunciado se ejecutaría en el navegador de quien rinde.

   **Singular y plural son dos frases distintas y no una armada con pedazos.**
   «Rendida 3 veces» partido en cachos sale mal en cuanto un idioma ordena
   distinto o no usa el mismo plural, así que cada caso tiene su clave y los
   números viajan en huecos.

   **El tope de intentos de verdad lo aplica la función que corrige.** Lo de acá
   es sólo para no ofrecer un botón que va a fallar.

   **El resultado dice cuántas estuvieron bien, no cuáles.** Con dos opciones
   por pregunta, marcar la que falló es decir cuál era la buena.
=================================================== */

import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Texto } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';
import { useSesionRequerida } from '../datos/useSesionRequerida.js';

/* El papel que rinde evaluaciones. La función de la base rechaza igual a quien
   no tiene legajo, pero conviene decirlo antes de mostrar las preguntas. */
const ROL_ASISTENTE = 'caregiver';

export default function Examen() {
  const { frase } = useFrases();
  const [parametros] = useSearchParams();
  usePestana('examen.titulo', { fueraDeBuscadores: true });

  /* La guardia de siempre: quien no inició sesión no ve esta pantalla y se lo
     lleva de dónde venía para devolverlo ahí después de entrar. */
  const {
    estado: estadoSesion, motivo: motivoDeLaSesion, base,
    reintentar: reintentarLaSesion,
  } = useSesionRequerida();

  /* Cuál de los seis paneles se ve. */
  const [estado, setEstado] = useState('cargando');
  const [claveDelError, setClaveDelError] = useState('');
  const [claveDelVacio, setClaveDelVacio] = useState('');

  /* Volver a arrancar: lo piden el botón de reintentar y los dos «Volver a la
     lista», que en la página llamaban a `arrancar()` otra vez. */
  const [arranques, setArranques] = useState(0);

  const [lista, setLista] = useState([]);

  /* Lo que se está rindiendo ahora. */
  const [enCurso, setEnCurso] = useState(null);
  const [intentosUsados, setIntentosUsados] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [avisoIntentos, setAvisoIntentos] = useState(null);
  const [avisoExamen, setAvisoExamen] = useState(null);
  const [puedeEntregar, setPuedeEntregar] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);

  const [resultado, setResultado] = useState(null);

  /* Una caja que se abre es porque hay algo que decir, así que nunca queda en
     blanco: si la frase no se resolvió, se dice lo genérico. Era lo que hacía
     `avisar` en la página, y vale para los dos carteles del examen. */
  const loQueDiceElAviso = (aviso) =>
    frase(aviso.clave, aviso.huecos) || frase('error.generico');

  /* Los tres motivos por los que esta pantalla no tiene nada que mostrar. Van
     por clave como todo lo demás; cuál de los tres es lo decide quien llama. */
  const decirVacio = useCallback((clave) => {
    setClaveDelVacio(clave);
    setEstado('vacio');
  }, []);

  /* Qué dice el panel de error. Quién elige la frase es `claveDeError`, que
     mira la falla y dice de qué clase es —el detalle técnico se queda en la
     consola, nunca en la pantalla—, y el texto sale del catálogo como
     cualquier otro rótulo, así que cambia con el idioma. */
  const decirError = useCallback((err, queSeIntentaba) => {
    setClaveDelError(Texto.claveDeError(err, queSeIntentaba));
    setEstado('error');
  }, []);

  // --- La lista ---------------------------------------------------------

  /* Los dos pedidos van adentro del `try` y no afuera: `getEvaluaciones` y
     `getIntentosEvaluacion` traen datos y no muestran nada, así que el fallo no
     lo cuenta ninguno de los dos —le toca a quien muestra—. Sin esto la
     pantalla se quedaba en «Cargando…» para siempre. */
  const verLista = useCallback(async () => {
    setEstado('cargando');
    try {
      const { ClienteDatos } = await conLaBase();
      const evaluaciones = await ClienteDatos.getEvaluaciones();

      if (!evaluaciones || evaluaciones.length === 0) {
        decirVacio('examen.sin_evaluaciones');
        return;
      }

      const intentos = await ClienteDatos.getIntentosEvaluacion();

      setLista(evaluaciones.map((evaluacion) => {
        const propios = intentos.filter((i) => i.evaluacion_id === evaluacion.id);
        const aprobada = propios.some((i) => i.aprobado);

        let detalle;
        if (aprobada) detalle = { clave: 'examen.aprobada' };
        else if (propios.length === 1) detalle = { clave: 'examen.rendida_una' };
        else if (propios.length > 1) {
          detalle = { clave: 'examen.rendida_varias', huecos: { cuantas: propios.length } };
        } else detalle = { clave: 'examen.sin_rendir' };

        return { id: evaluacion.id, clave: evaluacion.clave, nombre: evaluacion.nombre, detalle };
      }));

      setEstado('lista');
    } catch (err) {
      decirError(err, 'Examen, lista de evaluaciones:');
    }
  }, [decirError, decirVacio]);

  // --- El examen --------------------------------------------------------

  /* Los dos pedidos van adentro del `try` por lo mismo que arriba, así que
     `abrir` responde por sí misma y se la puede llamar desde cualquier lado,
     incluso desde un botón. */
  const abrir = useCallback(async (clave) => {
    setEstado('cargando');
    try {
      const { ClienteDatos } = await conLaBase();
      const evaluacion = await ClienteDatos.getEvaluacion(clave);

      if (!evaluacion || !evaluacion.preguntas || evaluacion.preguntas.length === 0) {
        decirVacio('examen.sin_preguntas');
        return;
      }

      setEnCurso(evaluacion);
      const propios = await ClienteDatos.getIntentosEvaluacion(evaluacion.id);
      const usados = propios.length;
      setIntentosUsados(usados);

      /* Las respuestas arrancan en blanco: abrir una evaluación es empezarla, y
         quien vuelve a rendirla no encuentra marcado lo de la vez pasada. */
      setRespuestas({});
      setAvisoExamen(null);

      const quedan = evaluacion.intentos_maximos
        ? evaluacion.intentos_maximos - usados
        : null;

      if (quedan === null) {
        if (usados === 1) {
          setAvisoIntentos({ clave: 'examen.sin_limite_una', tono: 'info' });
        } else if (usados > 1) {
          setAvisoIntentos({
            clave: 'examen.sin_limite_varias', huecos: { cuantas: usados }, tono: 'info'
          });
        } else {
          setAvisoIntentos(null);
        }
        setPuedeEntregar(true);
      } else if (quedan > 0) {
        if (quedan === 1) {
          setAvisoIntentos({
            clave: 'examen.queda_uno',
            huecos: { total: evaluacion.intentos_maximos },
            tono: 'info'
          });
        } else {
          setAvisoIntentos({
            clave: 'examen.quedan_varios',
            huecos: { cuantos: quedan, total: evaluacion.intentos_maximos },
            tono: 'info'
          });
        }
        setPuedeEntregar(true);
      } else {
        if (evaluacion.intentos_maximos === 1) {
          setAvisoIntentos({ clave: 'examen.una_sola_vez', tono: 'atencion' });
        } else {
          setAvisoIntentos({
            clave: 'examen.sin_intentos',
            huecos: { cuantos: evaluacion.intentos_maximos },
            tono: 'atencion'
          });
        }
        setPuedeEntregar(false);
      }

      setEstado('examen');
    } catch (err) {
      decirError(err, 'Examen, apertura de la evaluación:');
    }
  }, [decirError, decirVacio]);

  // --- Arranque ---------------------------------------------------------

  /* Si la dirección nombra una evaluación, se abre esa. Es como llega quien
     viene de «Mis Capacitaciones», que ya eligió el curso. Si la clave no
     existe, `abrir` muestra el estado vacío con su explicación, que es mejor
     que mandarlo de vuelta a empezar. */
  const pedida = parametros.get('evaluacion');

  useEffect(() => {
    if (estadoSesion !== 'listo' || !base) return;
    let vigente = true;

    (async () => {
      setEstado('cargando');
      try {
        await base.ClienteDatos.initTenant();
        if (!vigente) return;

        /* La función de la base rechaza igual a quien no tiene legajo, pero
           conviene decirlo antes de mostrar las preguntas. */
        const perfil = await base.Sesion.perfil();
        if (!vigente) return;
        if (!perfil || perfil.role !== ROL_ASISTENTE) {
          decirVacio('examen.no_es_asistente');
          return;
        }

        if (pedida) await abrir(pedida);
        else await verLista();
      } catch (err) {
        if (!vigente) return;
        decirError(err, 'Examen, arranque:');
      }
    })();

    return () => { vigente = false; };
  }, [estadoSesion, base, pedida, arranques, abrir, verLista, decirError, decirVacio]);

  // --- Entregar ---------------------------------------------------------

  async function entregar(evento) {
    evento.preventDefault();
    setAvisoExamen(null);

    const contestadas = {};
    let faltan = 0;
    enCurso.preguntas.forEach((pregunta) => {
      const elegida = respuestas[pregunta.id];
      if (elegida) contestadas[pregunta.id] = elegida;
      else faltan += 1;
    });

    if (faltan > 0) {
      if (faltan === 1) setAvisoExamen({ clave: 'examen.falta_una', tono: 'critico' });
      else {
        setAvisoExamen({
          clave: 'examen.faltan_varias', huecos: { cuantas: faltan }, tono: 'critico'
        });
      }
      return;
    }

    setCorrigiendo(true);
    try {
      const { ClienteDatos } = await conLaBase();
      const corregido = await ClienteDatos.rendirEvaluacion(enCurso.id, contestadas);
      setIntentosUsados((cuantos) => cuantos + 1);
      setResultado(corregido);
      setEstado('resultado');
    } catch (err) {
      /* El detalle técnico lo registra `claveDeError` y no sale de la consola;
         a la pantalla va la frase que corresponde a esa clase de falla. */
      setAvisoExamen({ clave: Texto.claveDeError(err, 'Examen, corrección:'), tono: 'critico' });
    } finally {
      setCorrigiendo(false);
    }
  }

  // --- Lo que se dibuja -------------------------------------------------

  /* Mientras la guardia comprueba la sesión —y mientras se lleva a quien no la
     tiene— la pantalla dice que está cargando, que es lo que decía la página. */
  const esperandoLaSesion = estadoSesion !== 'listo' && estadoSesion !== 'error';
  const cual = estadoSesion === 'error' ? 'error' : (esperandoLaSesion ? 'cargando' : estado);

  /* Falle la guardia o falle lo de acá, la frase es la que corresponde a esa
     clase de fallo: la guardia devuelve la suya igual que esta pantalla la
     suya. Y reintentar tiene que reintentar lo que falló, no otra cosa: si lo
     que no llegó fue la sesión, el botón vuelve a pedirla; si llegó y falló lo
     de después, vuelve a arrancar la pantalla. */
  const fallaLaSesion = estadoSesion === 'error';
  const claveQueSeLee = fallaLaSesion ? motivoDeLaSesion : claveDelError;
  const volverAIntentar = fallaLaSesion
    ? reintentarLaSesion
    : () => setArranques((cuantos) => cuantos + 1);

  const aprobado = resultado ? resultado.aprobado === true : false;
  const quedanDespues = enCurso && enCurso.intentos_maximos
    ? enCurso.intentos_maximos - intentosUsados
    : null;
  const ofrecerOtraVez = !aprobado && (quedanDespues === null || quedanDespues > 0);

  const volverALaLista = (evento) => {
    evento.preventDefault();
    setArranques((cuantos) => cuantos + 1);
  };

  return (
    <main className="examen-pantalla">
      <div className="examen-tarjeta">

        <div className="examen-marca">
          <img className="tenant-logo" src="/assets/images/logotipo.png" alt="" />
          <span className="tenant-name"></span>
        </div>

        {cual === 'cargando' && (
          <div className="examen-cargando">
            <i className="fas fa-circle-notch fa-spin"></i>{' '}
            <span>{frase('comun.cargando')}</span>
          </div>
        )}

        {cual === 'error' && (
          <div>
            {/* Qué falló se sabe recién cuando falla, así que la frase la elige
                `claveDeError`. El rótulo del botón nació en la pantalla de
                acceso y se pide con su clave: una clave no se renombra, y la
                misma frase escrita dos veces se traduce dos veces y se corrige
                una sola. */}
            <div className="examen-aviso critico">{frase(claveQueSeLee)}</div>
            <button
              type="button"
              className="btn btn-secundario ancho-total"
              onClick={volverAIntentar}
            >
              {frase('acceso.reintentar')}
            </button>
          </div>
        )}

        {cual === 'vacio' && (
          <div>
            <h1 className="examen-titulo">{frase('examen.titulo')}</h1>
            <p className="examen-bajada">{frase(claveDelVacio)}</p>
            <p className="examen-pie">
              <Link to="/cursos">{frase('examen.ver_cursos')}</Link>
            </p>
          </div>
        )}

        {cual === 'lista' && (
          <div>
            <h1 className="examen-titulo">{frase('examen.titulo')}</h1>
            <p className="examen-bajada">{frase('examen.bajada')}</p>
            <ul className="examen-lista">
              {lista.map((evaluacion) => (
                <li key={evaluacion.id}>
                  <button type="button" onClick={() => abrir(evaluacion.clave)}>
                    {/* El nombre lo cargó alguien de la Prestadora: es dato, no
                        texto de la pantalla, y por eso es lo único de acá que no
                        pasa por el catálogo. */}
                    <span className="nombre">{evaluacion.nombre}</span>
                    <span className="detalle">
                      {frase(evaluacion.detalle.clave, evaluacion.detalle.huecos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cual === 'examen' && enCurso && (
          <form onSubmit={entregar} noValidate>
            {/* El nombre de la evaluación no se traduce: lo escribió alguien de
                la Prestadora. Las condiciones sí, y cambian de frase según
                cuántas preguntas tenga; los dos números entran en huecos y cada
                idioma los pone donde le corresponda. */}
            <h1 className="examen-titulo">{enCurso.nombre}</h1>
            <p className="examen-bajada">
              {frase(
                enCurso.preguntas.length === 1
                  ? 'examen.condiciones_una'
                  : 'examen.condiciones_varias',
                {
                  cuantas: enCurso.preguntas.length,
                  porcentaje: enCurso.porcentaje_para_aprobar
                }
              )}
            </p>

            {avisoIntentos && (
              <div className={'examen-aviso ' + avisoIntentos.tono}>
                {loQueDiceElAviso(avisoIntentos)}
              </div>
            )}
            {avisoExamen && (
              <div className={'examen-aviso ' + avisoExamen.tono}>
                {loQueDiceElAviso(avisoExamen)}
              </div>
            )}

            <div>
              {enCurso.preguntas.map((pregunta, cuantas) => (
                <div className="examen-pregunta" key={pregunta.id}>
                  <p className="enunciado">{(cuantas + 1) + '. ' + pregunta.enunciado}</p>
                  {pregunta.opciones.map((opcion) => (
                    <label className="examen-opcion" key={opcion.id}>
                      <input
                        type="radio"
                        name={'pregunta-' + pregunta.id}
                        value={opcion.id}
                        checked={respuestas[pregunta.id] === opcion.id}
                        onChange={() => setRespuestas((cuales) => ({
                          ...cuales, [pregunta.id]: opcion.id
                        }))}
                      />
                      <span>{opcion.texto}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {/* El rótulo se pide por su clave y no se escribe, para que un
                cambio de idioma mientras la corrección corre lo alcance igual. */}
            <button
              type="submit"
              className="btn btn-primario ancho-total"
              disabled={!puedeEntregar || corrigiendo}
            >
              <span>{frase(corrigiendo ? 'examen.corrigiendo' : 'examen.entregar')}</span>
            </button>

            <p className="examen-pie">
              <a href="#" onClick={volverALaLista}>{frase('examen.volver_lista')}</a>
            </p>
          </form>
        )}

        {cual === 'resultado' && resultado && (
          <div>
            <div className={'examen-aviso ' + (aprobado ? 'exito' : 'atencion')}>
              {/* La cifra es un número y un signo: no hay nada que traducir. */}
              <p className="examen-resultado-cifra">{resultado.porcentaje + '%'}</p>
              <p style={{ fontWeight: 700, margin: '0 0 6px' }}>
                {frase(aprobado ? 'examen.aprobado' : 'examen.no_aprobado')}
              </p>
              <p className="m-0">
                {frase('examen.resultado_detalle', {
                  correctas: resultado.respuestas_correctas,
                  total: resultado.preguntas_totales,
                  porcentaje: resultado.porcentaje_para_aprobar
                })}
              </p>
            </div>

            {ofrecerOtraVez && (
              <button
                type="button"
                className="btn btn-primario ancho-total"
                onClick={() => abrir(enCurso.clave)}
              >
                {frase('examen.rendir_de_nuevo')}
              </button>
            )}

            <p className="examen-pie">
              <a href="#" onClick={volverALaLista}>{frase('examen.volver_lista')}</a>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
