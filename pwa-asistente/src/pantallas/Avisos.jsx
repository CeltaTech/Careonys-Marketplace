/* ===================================================
   LOS AVISOS ABIERTOS

   Lo que las Familias de esta Prestadora están buscando, y el botón para
   ofrecerse. Postularse es exactamente eso: ofrecerse. Acá no hay «aceptar», no
   hay precio y no hay condiciones, porque el trato lo cierran la Familia y el
   Asistente afuera del software. Lo único que queda guardado es el contacto.

   La pantalla no muestra a la Familia, y no es un olvido: la función de la base
   no devuelve ni el nombre del Paciente ni ningún dato de contacto, justamente
   para que esta pantalla no pueda mostrarlos aunque quisiera.

   Todo lo que llega es clave de vocabulario y no etiqueta: quien traduce es esta
   pantalla, con el catálogo ya cargado. Por eso acá tampoco se escribe ninguna
   lista de opciones.

   **Los días y turnos se piden a pedido.** Son una llamada por aviso, así que
   pedirlos de entrada para los diez de la lista serían diez pedidos que quizá
   nadie mire. Se piden la primera vez que alguien abre el detalle, y si esa vez
   falla se deja volver a intentar cerrando y abriendo.

   El texto que escribió una persona —la descripción de un aviso— entra como
   texto y nunca como marcado: lo escribió otro, y es lo último a lo que se le
   puede dar de comer marcado.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';

/* La fecha, en el idioma que la persona está leyendo. Sale del catálogo, que es
   donde se decide el idioma de todo lo demás. */
function avFecha(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '';
  try { return fecha.toLocaleDateString(Catalogo.idioma); } catch (e) { return iso; }
}

/* Una clave guardada, traducida a lo que se lee. Si el vocabulario no la tiene
   se devuelve la clave cruda: es fea, pero es el dato que el aviso sí trae, y
   decir «sin especificar» sobre algo especificado sería mentir. */
function avTexto(vocabulario, clave) {
  if (!clave) return '';
  return Catalogo.etiquetaSiExiste(vocabulario, clave) || clave;
}

/* Una lista de claves —tareas, patologías— convertida a texto corrido. */
function avLista(valores, traducir) {
  if (!Array.isArray(valores)) return '';
  return valores.map(traducir).filter((t) => t).join(', ');
}

/* Los días y turnos de un aviso. Tres estados adentro de la misma caja, que es
   lo que hacía el detalle desplegable de antes. */
function Franjas({ base, avisoId, frase }) {
  const [estado, setEstado] = useState('quieto');
  const [franjas, setFranjas] = useState([]);
  const [aviso, setAviso] = useState('');
  const pedidas = useRef(false);

  async function alAbrirse(evento) {
    if (!evento.currentTarget.open || pedidas.current) return;
    pedidas.current = true;
    setEstado('cargando');
    try {
      const traidas = await base.ClienteDatos.franjasDeAviso(avisoId);
      if (!traidas || traidas.length === 0) { setEstado('vacio'); return; }
      setFranjas(traidas);
      setEstado('listo');
    } catch (err) {
      pedidas.current = false;
      setAviso(Texto.mensajeDeError(err, frase('avisos.error')));
      setEstado('error');
    }
  }

  return (
    <details onToggle={alAbrirse}>
      <summary className="curso-dato mano">{frase('avisos.rotulo_franjas')}</summary>
      <div className="curso-datos">
        {estado === 'cargando' ? <span className="curso-dato">{frase('avisos.cargando')}</span> : null}
        {estado === 'vacio' ? <span className="curso-dato">{frase('avisos.sin_dato')}</span> : null}
        {estado === 'error' ? <span className="conv-error">{aviso}</span> : null}
        {estado === 'listo' ? franjas.map((franja, cual) => (
          <span className="curso-dato" key={cual}>
            {avTexto('dia_semana', franja.dia) + ' · ' + avTexto('turno', franja.turno)}
          </span>
        )) : null}
      </div>
    </details>
  );
}

function Aviso({ aviso, base, frase, misPostulaciones, alPostularse, alRetirarse }) {
  const [yaEsta, setYaEsta] = useState(!!aviso.ya_me_postule);
  const [mensaje, setMensaje] = useState('');
  const [postulando, setPostulando] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const [dicho, setDicho] = useState('');
  const [error, setError] = useState('');
  const [textoPostulado, setTextoPostulado] = useState(frase('avisos.ya_postulado'));

  const idDelCampo = 'av-mensaje-' + aviso.id;

  const motivo = avTexto('motivo_consulta', aviso.motivo_consulta);

  /* Un renglón «Rótulo: valor». Un valor que no vino se dice y no se deja el
     hueco: un dato ausente y un dato que nadie miró se leen igual, y no son lo
     mismo. */
  const dato = (claveDelRotulo, valor) =>
    frase(claveDelRotulo) + ': ' + (valor || frase('avisos.sin_dato'));

  async function postularme() {
    setError('');
    setDicho('');
    setPostulando(true);
    try {
      const fila = await base.ClienteDatos.postularse(aviso.id, mensaje);
      if (fila && fila.id) alPostularse(aviso.id, fila.id);
      aviso.ya_me_postule = true;
      setMensaje('');
      setYaEsta(true);
      setTextoPostulado(frase('avisos.postulado_ok'));
    } catch (err) {
      /* Sin legajo no se puede uno postular, y eso no es una falla del servidor:
         es un paso que falta. Se dice lo que falta, y además se lo separa de
         todo lo demás, que sí es una falla y va a la consola entera mientras la
         pantalla recibe la versión clasificada. */
      const faltaElLegajo = err && err.message === 'postulacion_sin_legajo';
      if (!faltaElLegajo) console.error('Postulación a un aviso:', err);
      setError(faltaElLegajo
        ? frase('avisos.sin_legajo')
        : Texto.mensajeDeError(err, frase('avisos.error_postular')));
    } finally {
      setPostulando(false);
    }
  }

  async function retirar() {
    const cual = misPostulaciones[aviso.id];
    if (!cual) return;
    setError('');
    setDicho('');
    setRetirando(true);
    try {
      await base.ClienteDatos.retirarPostulacion(cual);
      alRetirarse(aviso.id);
      aviso.ya_me_postule = false;
      setYaEsta(false);
      setTextoPostulado(frase('avisos.ya_postulado'));
      setDicho(frase('avisos.retirada'));
    } catch (err) {
      setError(Texto.mensajeDeError(err, frase('avisos.error_retirar')));
    } finally {
      setRetirando(false);
    }
  }

  return (
    <div className="curso-tarjeta">
      <h3>{aviso.descripcion || frase('avisos.sin_dato')}</h3>
      {motivo ? <p>{motivo}</p> : null}

      <div className="curso-datos">
        <span className="curso-dato">{dato('avisos.rotulo_zona', avTexto('zona', aviso.zona))}</span>
        <span className="curso-dato">{dato('avisos.rotulo_profesion', avTexto('tipo_asistente', aviso.profesion))}</span>
        <span className="curso-dato">{dato('avisos.rotulo_frecuencia', avTexto('frecuencia', aviso.frecuencia))}</span>
        {/* Los horarios son lo único que no pasa por un vocabulario: la columna
            guarda hoy tres formas distintas de nombrar lo mismo y todavía no
            tiene lista que la gobierne, así que se muestra lo guardado tal cual:
            inventarle acá una cuarta forma sería empeorarlo. */}
        <span className="curso-dato">{dato('avisos.rotulo_horarios', aviso.horarios || '')}</span>
        <span className="curso-dato">{dato('avisos.rotulo_genero', avTexto('genero_preferido', aviso.genero_preferido))}</span>
        <span className="curso-dato">{dato('avisos.rotulo_tareas', avLista(aviso.tareas, (c) => Catalogo.etiquetaDeTarea(c)))}</span>
        <span className="curso-dato">{dato('avisos.rotulo_patologias', avLista(aviso.patologias, (c) => avTexto('patologia', c)))}</span>
      </div>

      <Franjas base={base} avisoId={aviso.id} frase={frase} />

      <p className="curso-datos">{frase('avisos.publicado', { fecha: avFecha(aviso.created_at) })}</p>

      {/* Cuando ya se ofreció. El botón de retirar sale sólo si se sabe con qué
          fila: ofrecer un botón que no puede hacer nada es peor que no
          ofrecerlo. */}
      <div hidden={!yaEsta}>
        <p className="curso-resultado curso-resultado-aprobado">{textoPostulado}</p>
        <button
          type="button"
          className="btn btn-sobre-oscuro"
          hidden={!misPostulaciones[aviso.id]}
          disabled={retirando}
          onClick={retirar}
        >{retirando ? frase('avisos.retirando') : frase('avisos.retirar')}</button>
      </div>

      {/* Y cuando todavía no. El aviso de no escribir el teléfono va arriba del
          campo y no abajo: avisa antes, no después. */}
      <div hidden={yaEsta}>
        <p className="conv-aviso">{frase('avisos.mensaje_aviso_contacto')}</p>
        <div className="form-group-pwa">
          <label htmlFor={idDelCampo}>{frase('avisos.mensaje_etiqueta')}</label>
          <textarea
            rows="3"
            id={idDelCampo}
            placeholder={frase('avisos.mensaje_lugar')}
            value={mensaje}
            onChange={(evento) => setMensaje(evento.target.value)}
          ></textarea>
        </div>
        <button
          type="button"
          className="btn btn-primario"
          disabled={postulando}
          onClick={postularme}
        >{postulando ? frase('avisos.postulando') : frase('avisos.postularse')}</button>
      </div>

      <p className="pwa-estado-bajada" hidden={!dicho}>{dicho}</p>
      <p className="conv-error" hidden={!error}>{error}</p>
    </div>
  );
}

export default function Avisos({ activa, visita, base, navegar }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [avisos, setAvisos] = useState([]);
  const [hayLegajo, setHayLegajo] = useState(false);
  const [misPostulaciones, setMisPostulaciones] = useState({});
  const [aviso, setAviso] = useState('');
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (visita === null || !base) return;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        /* El catálogo hace falta antes de dibujar: la base guarda claves y los
           nombres visibles se traducen acá. */
        await Catalogo.cargar();

        /* Sin legajo la base devuelve cero avisos, que se lee igual que «no hay
           ninguno». Son dos cosas distintas y se dicen distinto. */
        const legajo = await base.ClienteDatos.legajoPropio();
        if (!vigente) return;
        setHayLegajo(!!legajo);
        if (!legajo) { setEstado('listo'); return; }

        const [traidos, mias] = await Promise.all([
          base.ClienteDatos.avisosAbiertos(),
          base.ClienteDatos.misPostulaciones()
        ]);
        if (!vigente) return;

        const cruce = {};
        for (const postulacion of mias || []) {
          cruce[postulacion.aviso_id] = postulacion.id;
        }
        setMisPostulaciones(cruce);

        if (!traidos || traidos.length === 0) { setEstado('vacio'); return; }
        setAvisos(traidos);
        setEstado('listo');
      } catch (err) {
        if (!vigente) return;
        setAviso(Texto.mensajeDeError(err, frase('avisos.error')));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visita, base, pedido]);

  const alPostularse = (avisoId, filaId) =>
    setMisPostulaciones((antes) => ({ ...antes, [avisoId]: filaId }));

  const alRetirarse = (avisoId) => setMisPostulaciones((antes) => {
    const quedan = { ...antes };
    delete quedan[avisoId];
    return quedan;
  });

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-avisos">
      <div className="wizard-header-bar">
        <button type="button" className="btn-volver-cabecera" id="av-volver" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>{frase('avisos.titulo')}</h2>
      </div>

      <div className="capacitaciones-cuerpo">
        <div className="pwa-estado" id="av-cargando" hidden={estado !== 'cargando'}>
          {frase('avisos.cargando')}
        </div>

        <div className="pwa-estado" id="av-error" hidden={estado !== 'error'}>
          <p id="av-error-texto">{aviso}</p>
          <button
            type="button"
            className="btn btn-primario"
            id="av-reintentar"
            onClick={() => setPedido((antes) => antes + 1)}
          >{frase('avisos.reintentar')}</button>
        </div>

        <div className="pwa-estado" id="av-vacio" hidden={estado !== 'vacio'}>
          <p>{frase('avisos.vacio_titulo')}</p>
          <p className="pwa-estado-bajada">{frase('avisos.vacio_bajada')}</p>
        </div>

        <div id="av-listo" hidden={estado !== 'listo'}>
          <p className="pwa-estado-bajada" id="av-sin-legajo" hidden={hayLegajo}>
            {frase('avisos.sin_legajo')}
          </p>

          <p className="capacitaciones-bajada" id="av-bajada" hidden={!hayLegajo}>
            {frase('avisos.bajada')}
          </p>

          <div id="av-lista" hidden={!hayLegajo}>
            {avisos.map((cada) => (
              <Aviso
                key={cada.id}
                aviso={cada}
                base={base}
                frase={frase}
                misPostulaciones={misPostulaciones}
                alPostularse={alPostularse}
                alRetirarse={alRetirarse}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
