/* ===================================================
   LAS GUÍAS DE CUIDADO QUE ESCRIBE LA PRESTADORA

   La misma pantalla de trabajo de siempre, con otro envase: lo que la página
   suelta hacía contra el documento —armar filas a mano, llenar desplegables,
   esconder y mostrar carteles— acá lo hace el estado. No se agregó ni se sacó
   nada de lo que la pantalla sabía hacer.

   **Es una pantalla de la sesión, no del directorio**, así que no lleva la
   barra de arriba ni el pie: trae su propio encabezado de Prestadora y su
   menú lateral, igual que el panel con el que comparte el costado.

   **Los cuatro estados están en la lista de guías, que es lo único que carga
   datos para mostrar**: cargando mientras la lista viaja, error cuando no se
   pudo traer, vacío cuando esta Prestadora todavía no escribió ninguna, y
   listo con la tabla dibujada. El formulario tiene los suyos propios sobre sus
   dos desplegables, por la misma razón: un desplegable vacío y uno que todavía
   no llegó se ven igual.

   **Son dos carteles y no uno**, tal como estaban. Son dos cargas distintas
   que corren casi a la vez —la lista de guías y las listas del formulario—:
   con un solo cartel, la que termina segunda borra lo que dijo la primera.

   **Los carteles guardan la clave de la frase, no la frase.** Así un cambio de
   idioma con el cartel en pantalla lo alcanza solo, sin que nadie lo vaya a
   buscar.

   **Lo que la tabla muestra y lo que la pantalla recuerda son dos cosas.**
   Cuando la lista no se puede traer, la tabla se vacía pero lo último que sí
   llegó se conserva: de ahí sale qué opciones ya tienen guía escrita, y eso
   sigue siendo verdad en la base aunque el último pedido haya fallado. Era así
   antes y se deja igual.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Catalogo, Identidad, Texto } from '../frases/lector.js';
import { useSesionRequerida } from '../datos/useSesionRequerida.js';

/* El papel que puede escribir las guías de una Prestadora. Es el mismo valor
   que compara el acceso para decidir a dónde entra cada quien. */
const ROL_QUE_ESCRIBE = 'coordinador';

const enUnaLinea = (valor) => String(valor || '').trim();
const enRenglones = (valor) => String(valor || '')
  .split('\n').map((renglon) => renglon.trim()).filter(Boolean);

/* Lo que escribe una Prestadora queda en el idioma en que lo escribió: la
   regla de i18n rige el texto que escribe el producto, no el que carga el
   cliente. Es la misma decisión de la migración 0041, que por eso le pide los
   tres idiomas a la guía general y uno solo a la propia. */
const soloSuIdioma = (valor) => ({ 'es-AR': valor });

/* De un texto guardado se muestra el idioma que tenga: una guía propia trae
   uno solo, pero la función no asume cuál, así que sigue sirviendo el día que
   una Prestadora cargue las suyas en portugués. */
const primerIdioma = (texto) => (texto && (texto['es-AR'] || texto.en || texto['pt-BR'])) || '';

/* Cómo se lee una fila de la base adentro de un desplegable. Las dos listas se
   llenan igual, y la de opciones además marca cuáles cargó la propia
   Prestadora. */
const rotuloDeFila = (fila) => {
  const nombre = Catalogo.textoDe(fila.i18n) || fila.clave || '';
  return fila.tenant_id
    ? nombre + ' · ' + Catalogo.frase('panel.guia_propia')
    : nombre;
};

/* Un cartel de estado. Recibe la clave del catálogo y el tono, y de ahí salen
   los dos colores, que son variables del sistema de diseño y no valores
   escritos acá. */
function Cartel({ aviso }) {
  if (!aviso || !aviso.tono) return null;
  return (
    <div
      className="p-16 redondeo-10 texto-13 interlineado-16 mb-12"
      style={{
        background: 'var(--tono-' + aviso.tono + '-fondo)',
        color: 'var(--tono-' + aviso.tono + '-texto)'
      }}
    >
      {Texto.frase(aviso.clave, aviso.huecos)}
    </div>
  );
}

export default function GuiasPrestadora() {
  const { frase } = useFrases();
  const guardia = useSesionRequerida();

  usePestana('panel.guia_titulo', {
    descripcion: 'panel.guia_descripcion',
    fueraDeBuscadores: true
  });

  /* El arranque, que es el que decide si la pantalla queda operativa. Mientras
     no lo esté, los botones no hacen nada, que es exactamente lo que pasaba
     cuando esta pantalla era un archivo suelto: sin permiso no se le colgaba
     ningún escuchador a ninguno. */
  const [operativa, setOperativa] = useState(false);

  /* El nombre de la Prestadora resuelta. No se muestra directamente: se guarda
     para que la pantalla se vuelva a dibujar cuando llega, porque tres frases
     del encabezado lo llevan adentro. */
  const [organizacion, setOrganizacion] = useState(Identidad.organizacion());

  // Lo último que trajo la base, y lo que la tabla está mostrando. Ver arriba.
  const [guias, setGuias] = useState([]);
  const [filas, setFilas] = useState([]);

  const [avisoLista, setAvisoLista] = useState({ tono: 'info', clave: 'catalogo.cargando' });
  const [avisoForm, setAvisoForm] = useState(null);

  const [actualizando, setActualizando] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [vocabularios, setVocabularios] = useState([]);
  const [vocabulariosHabilitados, setVocabulariosHabilitados] = useState(true);
  const [opciones, setOpciones] = useState([]);
  const [opcionesHabilitadas, setOpcionesHabilitadas] = useState(true);

  // La guía que se está corrigiendo, o `null` si lo que se escribe es nueva.
  // De acá sale la única diferencia entre el alta y el cambio: el resto del
  // formulario es el mismo, y tenerlo dos veces era tener dos validaciones que
  // el día de mañana dicen cosas distintas.
  const [enCorreccion, setEnCorreccion] = useState(null);

  const [vocabularioId, setVocabularioId] = useState('');
  const [opcionId, setOpcionId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [queEsperar, setQueEsperar] = useState('');
  const [senales, setSenales] = useState('');
  const [emergencia, setEmergencia] = useState('');
  const [publicada, setPublicada] = useState(false);
  const [revisadaPor, setRevisadaPor] = useState('');
  const [revisadaEl, setRevisadaEl] = useState('');

  const campoDescripcion = useRef(null);

  /* El nombre de la pestaña lleva el nombre de la Prestadora adentro, así que
     se vuelve a escribir cuando ésta se resuelve. Va después del que pone la
     vista, que si no lo pisaría con el marcador ya resuelto al del producto. */
  useEffect(() => {
    document.title = frase('panel.guia_titulo');
  }, [frase, organizacion]);

  /* El arranque. El orden no es casual: sin sesión no hay Prestadora, y sin
     Prestadora no hay nada que traer ni permiso para escribir. La sesión la
     resuelve la guardia, que además es la que lleva a la pantalla de acceso a
     quien no la tenga.

     El texto de la pantalla no se pide acá: lo pide el proveedor de frases
     antes de dibujar nada, que es el mismo «pedirlo por su propia red» de
     antes, dicho una sola vez para las quince pantallas. */
  useEffect(() => {
    if (guardia.estado === 'error') {
      setAvisoLista({ tono: 'critico', clave: 'panel.arranque_error' });
      return;
    }
    if (guardia.estado !== 'listo' || !guardia.base) return;

    let vigente = true;

    (async () => {
      const { ClienteDatos, Sesion } = guardia.base;
      try {
        await ClienteDatos.initTenant();
        if (!vigente) return;
        setOrganizacion(Identidad.organizacion());

        const perfil = await Sesion.perfil();
        if (!vigente) return;

        if (!perfil || perfil.role !== ROL_QUE_ESCRIBE) {
          setAvisoLista({ tono: 'atencion', clave: 'panel.sin_permiso' });
          return;
        }

        setOperativa(true);

        // La lista va antes que las opciones: al llenar el desplegable de
        // opciones se sacan las que ya tienen guía, y eso lo sabe por lo que
        // trajo la lista.
        await cargarGuias(ClienteDatos, () => vigente);
        if (!vigente) return;
        await cargarVocabularios(ClienteDatos, () => vigente);
      } catch (err) {
        console.error('Guías de la Organización, arranque:', err);
        if (vigente) setAvisoLista({ tono: 'critico', clave: 'panel.arranque_error' });
      }
    })();

    return () => { vigente = false; };
    // Corre una vez por pantalla, cuando la guardia terminó de resolver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardia.estado, guardia.base]);

  // ── LA LISTA DE SUS GUÍAS ───────────────────────────────────────────────

  async function dibujarGuias(ClienteDatos, sigue = () => true) {
    setAvisoLista({ tono: 'info', clave: 'panel.guia_cargando' });

    let traidas;
    try {
      traidas = await ClienteDatos.misGuias();
    } catch (err) {
      console.error('Guías de la Organización, lista:', err);
      if (!sigue()) return null;
      // La tabla se vacía; lo último que sí llegó se conserva. Ver arriba.
      setFilas([]);
      setAvisoLista({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'traer las Guías de cuidado')
      });
      return null;
    }
    if (!sigue()) return null;

    const lista = traidas || [];
    setGuias(lista);
    setFilas(lista);

    if (!lista.length) {
      setAvisoLista({ tono: 'neutro', clave: 'panel.guia_vacio' });
      return lista;
    }

    setAvisoLista(null);
    return lista;
  }

  /* El botón se apaga mientras la base contesta. */
  async function cargarGuias(ClienteDatos, sigue = () => true) {
    setActualizando(true);
    try {
      return await dibujarGuias(ClienteDatos, sigue);
    } finally {
      if (sigue()) setActualizando(false);
    }
  }

  // ── LAS DOS LISTAS DEL FORMULARIO ───────────────────────────────────────

  /* De qué listas se puede escribir una guía. Sale de la base —la columna
     `admite_guia`, migración 0043—, no de una lista escrita acá: ofrecerle a
     alguien escribir la guía de cuidado del «día de la semana» es el síntoma de
     un catálogo que se resolvió adentro de la pantalla. */
  async function cargarVocabularios(ClienteDatos, sigue = () => true) {
    setVocabulariosHabilitados(false);
    setAvisoForm({ tono: 'info', clave: 'panel.guia_listas_cargando' });

    let listas;
    try {
      listas = await ClienteDatos.vocabulariosConGuia();
    } catch (err) {
      console.error('Guías de la Organización, listas del catálogo:', err);
      if (!sigue()) return;
      setAvisoForm({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'traer las listas del catálogo')
      });
      return;
    }
    if (!sigue()) return;

    if (!listas || !listas.length) {
      setAvisoForm({ tono: 'atencion', clave: 'panel.guia_listas_vacio' });
      return;
    }

    setAvisoForm(null);
    setVocabularios(listas);
    setVocabulariosHabilitados(true);
  }

  /* Las opciones de la lista elegida. Vienen las del catálogo general y las
     que cargó esta Prestadora, porque eso es lo que devuelve la política de
     lectura; las de otra Prestadora no llegan hasta acá.

     Se sacan las que ya tienen guía escrita, porque la base admite una sola por
     opción: dejarlas ofrecidas es ofrecer un error que recién aparece al
     guardar. La que se está corrigiendo se deja, que si no desaparecería del
     formulario justo mientras se la edita.

     Devuelve las que quedaron libres, para que quien la llame sepa si la opción
     que quería elegir está entre ellas. */
  async function cargarOpciones(cualLista, idEnCorreccion, listaDeGuias) {
    const ClienteDatos = guardia.base && guardia.base.ClienteDatos;

    setOpcionesHabilitadas(false);
    setOpciones([]);
    setOpcionId('');
    if (!cualLista || !ClienteDatos) return [];

    setAvisoForm({ tono: 'info', clave: 'panel.guia_opciones_cargando' });

    let traidas;
    try {
      traidas = await ClienteDatos.opcionesConGuia(cualLista);
    } catch (err) {
      console.error('Guías de la Organización, opciones de la lista:', err);
      setAvisoForm({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'traer las opciones de la lista')
      });
      return [];
    }

    const yaEscritas = (listaDeGuias || [])
      .filter((g) => g.id !== idEnCorreccion)
      .map((g) => g.vocabulario_item_id);
    const libres = (traidas || []).filter((o) => yaEscritas.indexOf(o.id) === -1);

    if (!libres.length) {
      setAvisoForm({ tono: 'atencion', clave: 'panel.guia_opciones_vacio' });
      return [];
    }

    setAvisoForm(null);
    setOpciones(libres);
    setOpcionesHabilitadas(true);
    return libres;
  }

  function alElegirLista(valor) {
    setVocabularioId(valor);
    if (!operativa) return;
    cargarOpciones(valor, enCorreccion, guias);
  }

  // ── ESCRIBIR, CORREGIR Y BORRAR ─────────────────────────────────────────

  function limpiarFormulario() {
    setEnCorreccion(null);
    setVocabularioId('');
    setOpciones([]);
    setOpcionId('');
    setDescripcion('');
    setQueEsperar('');
    setSenales('');
    setEmergencia('');
    setPublicada(false);
    setRevisadaPor('');
    setRevisadaEl('');
  }

  /* Trae la guía a los campos. No la vuelve a pedir a la base: la fila que se
     va a corregir es la misma que ya está dibujada en la tabla. */
  async function corregirGuia(id) {
    if (!operativa) return;

    const guia = guias.filter((g) => g.id === id)[0];
    if (!guia) { setAvisoForm({ tono: 'atencion', clave: 'panel.guia_no_esta' }); return; }

    setEnCorreccion(guia.id);

    // La lista se elige por su identificador, que viene con la fila embebida.
    // Si esa lista ya no está entre las que admiten guía, el desplegable queda
    // sin elegir, igual que antes: un valor que no está entre las opciones no
    // se puede seleccionar.
    const listaId = ((guia.vocabulario_items || {}).vocabularios || {}).id || '';
    const listaElegible = vocabularios.some((v) => v.id === listaId) ? listaId : '';
    setVocabularioId(listaElegible);

    const libres = await cargarOpciones(listaElegible, guia.id, guias);
    if (libres.some((o) => o.id === guia.vocabulario_item_id)) {
      setOpcionId(guia.vocabulario_item_id);
    }

    setDescripcion(primerIdioma(guia.descripcion));
    setQueEsperar(primerIdioma(guia.que_esperar));
    setSenales((primerIdioma(guia.senales_de_alarma) || []).join('\n'));
    setEmergencia((primerIdioma(guia.en_emergencia) || []).join('\n'));
    setPublicada(!!guia.publicada);
    setRevisadaPor(guia.revisada_por || '');
    setRevisadaEl(guia.revisada_el ? String(guia.revisada_el).slice(0, 10) : '');

    if (campoDescripcion.current) campoDescripcion.current.focus();
  }

  /* El botón se apaga mientras la base contesta, porque dos clics eran dos
     guías o dos correcciones. */
  async function guardarGuia() {
    if (!operativa) return;

    const ClienteDatos = guardia.base.ClienteDatos;

    const laDescripcion = enUnaLinea(descripcion);
    const loQueEsperar = enUnaLinea(queEsperar);
    const lasSenales = enRenglones(senales);
    const laEmergencia = enRenglones(emergencia);
    const quienRevisó = enUnaLinea(revisadaPor);

    /* Lo mismo que van a exigir las restricciones de la base, dicho antes y en
       castellano. La base sigue siendo la que manda: esto no la reemplaza, le
       evita a la persona un viaje para que le contesten en inglés. */
    if (!opcionId) { setAvisoForm({ tono: 'atencion', clave: 'panel.guia_falta_opcion' }); return; }
    if (!laDescripcion || !loQueEsperar || !lasSenales.length || !laEmergencia.length) {
      setAvisoForm({ tono: 'atencion', clave: 'panel.guia_falta_texto' });
      return;
    }
    if (publicada && (!quienRevisó || !revisadaEl)) {
      setAvisoForm({ tono: 'atencion', clave: 'panel.guia_falta_firma' });
      return;
    }

    const datos = {
      descripcion: soloSuIdioma(laDescripcion),
      que_esperar: soloSuIdioma(loQueEsperar),
      senales_de_alarma: soloSuIdioma(lasSenales),
      en_emergencia: soloSuIdioma(laEmergencia),
      publicada: publicada,
      revisada_por: quienRevisó || null,
      revisada_el: revisadaEl || null
    };

    const corregia = enCorreccion;
    setGuardando(true);
    setAvisoForm({ tono: 'info', clave: 'panel.guia_guardando' });

    try {
      if (corregia) {
        await ClienteDatos.actualizarGuia(corregia, datos);
      } else {
        datos.vocabulario_item_id = opcionId;
        await ClienteDatos.crearGuia(datos);
      }
    } catch (err) {
      setAvisoForm({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'guardar la Guía de cuidado')
      });
      return;
    } finally {
      setGuardando(false);
    }

    limpiarFormulario();
    await cargarGuias(ClienteDatos);
    setAvisoForm({ tono: 'exito', clave: corregia ? 'panel.guia_corregida' : 'panel.guia_guardada' });
  }

  function cancelarEdicion() {
    limpiarFormulario();
    setAvisoForm(null);
  }

  /* Toda operación destructiva se confirma: borrar una guía deja al personal
     sin lo que esta Prestadora decidió que rige, y desde acá no se deshace. Así
     que antes se dice qué va a pasar y se puede cancelar. */
  async function borrarGuia(id) {
    if (!operativa) return;
    if (!window.confirm(Texto.frase('panel.guia_borrar_pregunta'))) return;

    const ClienteDatos = guardia.base.ClienteDatos;

    setBorrandoId(id);
    setAvisoLista({ tono: 'info', clave: 'panel.guia_borrando' });

    try {
      await ClienteDatos.borrarGuia(id);
    } catch (err) {
      setBorrandoId(null);
      setAvisoLista({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'borrar la Guía de cuidado')
      });
      return;
    }

    if (enCorreccion === id) cancelarEdicion();
    await cargarGuias(ClienteDatos);
    setBorrandoId(null);
    setAvisoLista({ tono: 'exito', clave: 'panel.guia_borrada' });
  }

  // ── LA PANTALLA ─────────────────────────────────────────────────────────

  return (
    <>
      <header className="tenant-header">
        <div className="tenant-brand">
          <i className="fas fa-book-medical"></i>{' '}
          <span>{frase('comun.organizacion')}</span>{' '}
          <span className="tenant-badge">{frase('panel.guia_organizacion')}</span>
        </div>
        <div className="texto-13">
          <i className="fas fa-user-shield"></i>{' '}
          <span>{frase('panel.guia_operador')}</span>{' '}
          <Link to="/" className="color-sobre-color ml-8">
            {frase('panel.guia_volver_portal')}
          </Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <ul className="sidebar-menu">
            <li>
              <Link to="/panel-prestadora">
                <i className="fas fa-users-cog"></i>{' '}
                <span>{frase('panel.guia_menu_legajos')}</span>
              </Link>
            </li>
            <li>
              <Link to="/guias-prestadora" className="active">
                <i className="fas fa-book-medical"></i>{' '}
                <span>{frase('panel.guia_menu_guias')}</span>
              </Link>
            </li>
          </ul>
        </aside>

        <main className="admin-content">

          <div className="card-dashboard mb-16">
            <h3 className="m-0 texto-18 color-titulo">
              <i className="fas fa-book-medical"></i>{' '}
              <span>{frase('panel.guia_encabezado')}</span>
            </h3>
            <p className="m-solo-arriba-4 texto-13 color-secundario">{frase('panel.guia_bajada')}</p>
            <p className="fondo-info p-10 redondeo-8 texto-12 color-principal mt-12">
              {frase('panel.guia_aviso_sin_tratamientos')}
            </p>
          </div>

          <div className="card-dashboard mb-16">
            <div className="flex justificar-entre alinear-centro mb-16">
              <h3 className="m-0 texto-18 color-titulo">
                <i className="fas fa-list-check"></i>{' '}
                <span>{frase('panel.guia_lista_titulo')}</span>
              </h3>
              <button
                type="button"
                className="btn btn-secundario texto-12 p-9-12"
                disabled={actualizando}
                onClick={() => {
                  if (operativa) cargarGuias(guardia.base.ClienteDatos);
                }}
              >
                <i className="fas fa-sync-alt"></i>{' '}
                <span>{frase('panel.guia_actualizar')}</span>
              </button>
            </div>

            <Cartel aviso={avisoLista} />

            <table className="aspirantes-table">
              <thead>
                <tr>
                  <th>{frase('panel.guia_tabla_lista')}</th>
                  <th>{frase('panel.guia_tabla_opcion')}</th>
                  <th>{frase('panel.guia_tabla_estado')}</th>
                  <th>{frase('panel.guia_tabla_revision')}</th>
                  <th>{frase('panel.guia_tabla_acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((guia) => {
                  const item = guia.vocabulario_items || {};
                  const lista = item.vocabularios || {};
                  return (
                    <tr key={guia.id}>
                      <td>{Catalogo.textoDe(lista.i18n) || lista.clave || ''}</td>
                      <td><strong>{Catalogo.textoDe(item.i18n) || item.clave || ''}</strong></td>
                      <td>
                        <span
                          className={'status-pill ' + (guia.publicada ? 'status-validado' : 'status-revision')}
                        >
                          {frase(guia.publicada
                            ? 'panel.guia_estado_publicada'
                            : 'panel.guia_estado_borrador')}
                        </span>
                      </td>
                      <td className="texto-12">
                        {guia.revisada_por ? (
                          <>
                            {guia.revisada_por}
                            <br />
                            <span className="color-secundario">
                              {Texto.fechaCorta(guia.revisada_el)}
                            </span>
                          </>
                        ) : (
                          <span className="color-secundario">{frase('panel.guia_sin_revision')}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secundario texto-11 p-6-12 mr-8"
                          onClick={() => corregirGuia(guia.id)}
                        >
                          {frase('panel.guia_corregir')}
                        </button>
                        <button
                          type="button"
                          className="btn fondo-peligro color-sobre-color texto-11 p-6-12"
                          disabled={borrandoId === guia.id}
                          onClick={() => borrarGuia(guia.id)}
                        >
                          {frase('panel.guia_borrar')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card-dashboard">
            <h3 className="m-0 mb-16 texto-18 color-titulo">
              <i className="fas fa-pen-to-square"></i>{' '}
              <span>
                {frase(enCorreccion ? 'panel.guia_form_correccion' : 'panel.guia_form_nueva')}
              </span>
            </h3>

            <Cartel aviso={avisoForm} />

            <div className="grilla-2 gap-16">
              <div className="form-group">
                <label htmlFor="campo-vocabulario">{frase('panel.guia_campo_lista')}</label>
                <select
                  id="campo-vocabulario"
                  value={vocabularioId}
                  disabled={!vocabulariosHabilitados}
                  onChange={(e) => alElegirLista(e.target.value)}
                >
                  <option value="">{frase('panel.guia_elegir_lista')}</option>
                  {vocabularios.map((fila) => (
                    <option key={fila.id} value={fila.id}>{rotuloDeFila(fila)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="campo-opcion">{frase('panel.guia_campo_opcion')}</label>
                <select
                  id="campo-opcion"
                  value={opcionId}
                  disabled={!opcionesHabilitadas}
                  onChange={(e) => setOpcionId(e.target.value)}
                >
                  <option value="">{frase('panel.guia_elegir_opcion')}</option>
                  {opciones.map((fila) => (
                    <option key={fila.id} value={fila.id}>{rotuloDeFila(fila)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="campo-descripcion">{frase('panel.guia_campo_descripcion')}</label>
              <textarea
                id="campo-descripcion"
                ref={campoDescripcion}
                rows="3"
                placeholder={frase('panel.guia_hueco_descripcion')}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="campo-que-esperar">{frase('panel.guia_campo_que_esperar')}</label>
              <textarea
                id="campo-que-esperar"
                rows="3"
                placeholder={frase('panel.guia_hueco_que_esperar')}
                value={queEsperar}
                onChange={(e) => setQueEsperar(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="campo-senales">
                <span>{frase('panel.guia_campo_senales')}</span>{' '}
                <span className="color-secundario texto-11">{frase('panel.guia_ayuda_lineas')}</span>
              </label>
              <textarea
                id="campo-senales"
                rows="4"
                placeholder={frase('panel.guia_hueco_senales')}
                value={senales}
                onChange={(e) => setSenales(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="campo-emergencia">
                <span>{frase('panel.guia_campo_emergencia')}</span>{' '}
                <span className="color-secundario texto-11">{frase('panel.guia_ayuda_lineas')}</span>
              </label>
              <textarea
                id="campo-emergencia"
                rows="4"
                placeholder={frase('panel.guia_hueco_emergencia')}
                value={emergencia}
                onChange={(e) => setEmergencia(e.target.value)}
              ></textarea>
            </div>

            <div className="fondo-superficie-hundida p-16 redondeo-12 borde-tarjeta mb-16">
              <label className="peso-700 texto-13 color-principal mano">
                <input
                  type="checkbox"
                  id="campo-publicada"
                  className="ancho-20"
                  checked={publicada}
                  onChange={(e) => setPublicada(e.target.checked)}
                />{' '}
                <span>{frase('panel.guia_campo_publicada')}</span>
              </label>
              <p className="texto-11 color-secundario m-solo-arriba-4">
                {frase('panel.guia_ayuda_publicar')}
              </p>
              <div className="grilla-2 gap-16 mt-12">
                <div className="form-group m-0">
                  <label htmlFor="campo-revisada-por">{frase('panel.guia_campo_revisada_por')}</label>
                  <input
                    type="text"
                    id="campo-revisada-por"
                    placeholder={frase('panel.guia_hueco_revisada_por')}
                    value={revisadaPor}
                    onChange={(e) => setRevisadaPor(e.target.value)}
                  />
                </div>
                <div className="form-group m-0">
                  <label htmlFor="campo-revisada-el">{frase('panel.guia_campo_revisada_el')}</label>
                  <input
                    type="date"
                    id="campo-revisada-el"
                    value={revisadaEl}
                    onChange={(e) => setRevisadaEl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-12">
              <button
                type="button"
                className="btn peso-700 texto-13"
                disabled={guardando}
                onClick={guardarGuia}
              >
                <i className="fas fa-floppy-disk"></i>{' '}
                <span>{frase(guardando ? 'panel.guia_guardando' : 'panel.guia_guardar')}</span>
              </button>
              <button
                type="button"
                className="btn btn-secundario texto-13"
                disabled={guardando}
                onClick={cancelarEdicion}
              >
                {frase('panel.guia_cancelar')}
              </button>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
