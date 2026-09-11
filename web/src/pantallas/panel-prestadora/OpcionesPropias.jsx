/* ===================================================
   LAS OPCIONES QUE ESTA PRESTADORA LE AGREGA AL CATÁLOGO

   El catálogo tiene dos pisos desde la migración 0038: lo que trae el producto
   lo ve toda Prestadora, y lo que agrega una queda de su lado. El segundo piso
   hasta hoy sólo se llenaba con una migración, que es pedirle a una Prestadora
   que espere una versión nueva del producto para poder anotar una patología que
   no está en la lista.

   Se lee y se escribe contra las tablas, y no contra la función que junta los
   dos pisos y deja afuera lo desactivado: son justo las dos distinciones que
   este bloque no puede perder. El aislamiento no depende de eso: lo sostienen
   las ocho políticas de la 0038 —leer alcanza lo general y lo propio, escribir
   sólo lo propio— y el disparador que además rechaza una opción propia en una
   lista cerrada.

   **Y se desactiva, no se borra.** La opción vieja quedó escrita en los legajos
   y en los avisos que la eligieron; borrarla deja esos renglones nombrando algo
   que ya no existe.

   **Son dos carteles y no uno**, tal como estaban: la lista y el formulario son
   dos cargas que corren casi a la vez, y con un cartel único la que termina
   segunda le borra lo que dijo la primera.

   **Lo que la tabla muestra y lo que la pantalla recuerda son dos cosas.**
   Cuando la lista no se puede traer, la tabla se vacía pero lo último que sí
   llegó se conserva: de ahí sale en qué orden va la que se agregue. Era así
   antes y se deja igual.

   **Ni un rótulo escrito acá adentro**, encabezados de la tabla incluidos: son
   frases del catálogo, que es lo que hace que el bloque exista en los tres
   idiomas.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import Cartel from './Cartel.jsx';

/* Dónde va la opción nueva adentro de su lista. Se cuenta desde las propias y
   arranca en 101, que es lo que hizo la migración 0040: así lo que agrega la
   Prestadora queda detrás del catálogo general en vez de intercalarse. */
const ORDEN_DE_LAS_PROPIAS = 100;

/* Lo que carga una Prestadora queda en el idioma en que lo escribió: la regla
   de i18n rige el texto que escribe el producto, no el que carga el cliente. Es
   la misma decisión de la migración 0038, que por eso le pide los tres idiomas
   a la opción general y uno solo a la propia. */
const enElIdiomaDeElla = (valor) => ({ 'es-AR': valor });

export default function OpcionesPropias({ base }) {
  const { frase } = useFrases();

  // Lo último que trajo la base, y lo que la tabla está mostrando. Ver arriba.
  const [opciones, setOpciones] = useState([]);
  const [filas, setFilas] = useState([]);

  const [cartelLista, setCartelLista] = useState({ tono: 'info', clave: 'panel.opciones_cargando' });
  const [cartelForm, setCartelForm] = useState(null);

  const [listas, setListas] = useState([]);
  const [listasApagadas, setListasApagadas] = useState(true);

  /* La opción que se está corrigiendo, o `null` si lo que se escribe es nueva.
     De acá sale la única diferencia entre el alta y el cambio: el formulario es
     el mismo, y tenerlo dos veces era tener dos validaciones que el día de
     mañana dicen cosas distintas. */
  const [enCorreccion, setEnCorreccion] = useState(null);
  const [vocabularioId, setVocabularioId] = useState('');
  const [nombre, setNombre] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [cambiando, setCambiando] = useState(null);

  const campoNombre = useRef(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      /* Las dos cargas atrapan lo suyo, pero lo que falle afuera de ellas no
         lo atrapaba nadie y la pantalla se quedaba en «cargando» sin decir
         nada. El cartel de la lista es el que está a la vista en ese momento. */
      try {
        await cargarOpcionesPropias(() => vigente);
        if (!vigente) return;
        await cargarListasAbiertas(() => vigente);
      } catch (err) {
        if (!vigente) return;
        setCartelLista({
          tono: 'critico',
          clave: Texto.claveDeError(err, 'Panel de la Prestadora, opciones propias, arranque:')
        });
      }
    })();
    return () => { vigente = false; };
    // Corre una vez, cuando el bloque entra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  /* «Los cuatro estados»: el cartel dice cargando antes de la primera espera,
     el error se escribe en la pantalla, y «todavía no agregó ninguna» se dice
     aparte, porque cero filas y una consulta que falló se ven iguales. */
  async function cargarOpcionesPropias(sigue = () => true) {
    setFilas([]);
    setCartelLista({ tono: 'info', clave: 'panel.opciones_cargando' });

    let traidas;
    try {
      traidas = await base.ClienteDatos.misOpciones();
    } catch (err) {
      console.error('Panel de la Prestadora, opciones propias del catálogo:', err);
      if (!sigue()) return;
      setCartelLista({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'traer las opciones propias')
      });
      return;
    }
    if (!sigue()) return;

    const lista = traidas || [];
    setOpciones(lista);

    if (!lista.length) {
      setCartelLista({ tono: 'neutro', clave: 'panel.opciones_vacio' });
      return;
    }

    setCartelLista(null);
    setFilas(lista);
  }

  /* Las listas que admiten opciones propias. Salen de la base —las cerradas son
     las que después se comparan con la ley o entre Prestadoras, y el disparador
     rechaza igual una opción propia adentro de una de ellas—. Ofrecerlas sería
     ofrecer un error que recién aparece al guardar. */
  async function cargarListasAbiertas(sigue = () => true) {
    setListasApagadas(true);
    setCartelForm({ tono: 'info', clave: 'panel.opciones_listas_cargando' });

    let traidas;
    try {
      traidas = await base.ClienteDatos.vocabulariosAbiertos();
    } catch (err) {
      console.error('Panel de la Prestadora, listas que admiten opciones propias:', err);
      if (!sigue()) return;
      setCartelForm({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'traer las listas del catálogo')
      });
      return;
    }
    if (!sigue()) return;

    /* El catálogo general es el que manda qué listas hay: las filas propias de
       `vocabularios` son la vuelta de tuerca que ninguna pantalla usa todavía. */
    const generales = (traidas || []).filter((lista) => !lista.tenant_id);

    if (!generales.length) {
      setCartelForm({ tono: 'atencion', clave: 'panel.opciones_listas_vacio' });
      return;
    }

    setCartelForm(null);
    setListas(generales);
    setListasApagadas(false);
  }

  /* La clave con la que la opción se guarda para siempre, calculada mientras se
     escribe el nombre. Se muestra porque es lo que no se va a poder cambiar: el
     texto se corrige, la clave no. */
  const clave = Texto.claveDesde(nombre);

  function limpiarFormularioDeOpcion() {
    setEnCorreccion(null);
    setVocabularioId('');
    setNombre('');
  }

  function cancelarCorreccionDeOpcion() {
    limpiarFormularioDeOpcion();
    setCartelForm(null);
  }

  /* Trae la opción a los campos. No la vuelve a pedir a la base: la fila que se
     va a corregir es la misma que ya está dibujada en la tabla.

     La lista queda apagada a propósito. Lo que ya se guardó con esta opción
     apunta a la fila, y la fila cuelga de su lista: moverla de lista cambiaría
     el significado de lo que otros ya eligieron. Para eso se desactiva ésta y se
     agrega otra, que es lo que dice el texto de ayuda. */
  function corregirOpcion(id) {
    const opcion = opciones.filter((o) => o.id === id)[0];
    if (!opcion) return;

    setEnCorreccion(opcion.id);
    setVocabularioId(opcion.vocabulario_id);
    setNombre(Catalogo.texto(opcion));
    if (campoNombre.current) campoNombre.current.focus();
  }

  function ordenSiguiente(deLaLista) {
    return opciones
      .filter((o) => o.vocabulario_id === deLaLista)
      .reduce((mayor, o) => Math.max(mayor, Number(o.orden) || 0), ORDEN_DE_LAS_PROPIAS) + 1;
  }

  /* «Todo botón que dispara una operación se apaga»: dos clics seguidos eran
     dos opciones iguales o dos correcciones sobre la misma fila. */
  async function guardarOpcion() {
    const comoSeLlama = String(nombre || '').trim();
    const corregia = enCorreccion;

    /* Lo mismo que van a exigir la tabla y el disparador, dicho antes y en el
       idioma de la pantalla. La base sigue siendo la que manda: esto no la
       reemplaza, le evita a la persona un viaje para que le contesten con el
       nombre de una restricción. */
    if (!vocabularioId) { setCartelForm({ tono: 'atencion', clave: 'panel.opciones_falta_lista' }); return; }
    if (!comoSeLlama) { setCartelForm({ tono: 'atencion', clave: 'panel.opciones_falta_nombre' }); return; }

    const suClave = Texto.claveDesde(comoSeLlama);
    if (!suClave) { setCartelForm({ tono: 'atencion', clave: 'panel.opciones_nombre_sin_clave' }); return; }

    setGuardando(true);
    setCartelForm({ tono: 'info', clave: 'panel.opciones_guardando' });

    let fila;
    try {
      if (corregia) {
        fila = await base.ClienteDatos.actualizarOpcion(corregia,
          { i18n: enElIdiomaDeElla(comoSeLlama) });
      } else {
        /* La clave repetida se busca antes de escribir. La unicidad la sostiene
           la base, pero ahí la respuesta llega como el nombre de una
           restricción, y eso no es un mensaje para nadie. Se miran las generales
           y las propias, y también las desactivadas: una desactivada sigue
           ocupando su clave. */
        const yaEstan = await base.ClienteDatos.clavesDeVocabulario(vocabularioId);
        if ((yaEstan || []).some((o) => o.clave === suClave)) {
          setCartelForm({ tono: 'atencion', clave: 'panel.opciones_ya_existe' });
          return;
        }
        fila = await base.ClienteDatos.crearOpcion({
          vocabulario_id: vocabularioId,
          clave: suClave,
          i18n: enElIdiomaDeElla(comoSeLlama),
          orden: ordenSiguiente(vocabularioId)
        });
      }
    } catch (err) {
      console.error('Panel de la Prestadora, guardado de una opción propia:', err);
      setCartelForm({ tono: 'critico', clave: Texto.claveDeError(err, 'guardar la opción') });
      return;
    } finally {
      setGuardando(false);
    }

    /* La base contestó sin devolver la fila: el cambio no quedó escrito, y decir
       «guardada» sería mentir. */
    if (!fila) { setCartelForm({ tono: 'critico', clave: 'panel.opciones_error_guardar' }); return; }

    limpiarFormularioDeOpcion();
    await cargarOpcionesPropias();
    setCartelForm({
      tono: 'exito',
      clave: corregia ? 'panel.opciones_corregida' : 'panel.opciones_guardada'
    });
  }

  /* Desactivar es lo más parecido a borrar que tiene este bloque, así que se
     confirma: se dice qué va a pasar, qué no se toca y que se puede volver
     atrás. Volver a activar no pregunta, porque no le saca nada a nadie. */
  async function cambiarEstadoDeOpcion(id) {
    const opcion = opciones.filter((o) => o.id === id)[0];
    if (!opcion) return;

    const comoSeLlama = Catalogo.texto(opcion);
    const apagar = !!opcion.activo;
    if (apagar && !confirm(Texto.frase('panel.opciones_desactivar_pregunta', { opcion: comoSeLlama }))) {
      return;
    }

    setCambiando(id);
    setCartelLista({ tono: 'info', clave: 'panel.opciones_cambiando' });

    let fila;
    try {
      fila = await base.ClienteDatos.actualizarOpcion(id, { activo: !apagar });
    } catch (err) {
      console.error('Panel de la Prestadora, alta o baja de una opción propia:', err);
      setCambiando(null);
      setCartelLista({
        tono: 'critico',
        clave: Texto.claveDeError(err, 'cambiar el estado de la opción')
      });
      return;
    }

    if (!fila) {
      setCartelLista({ tono: 'critico', clave: 'panel.opciones_error_guardar' });
      return;
    }

    if (enCorreccion === id) cancelarCorreccionDeOpcion();
    await cargarOpcionesPropias();
    setCambiando(null);
    setCartelLista({
      tono: 'exito',
      clave: apagar ? 'panel.opciones_desactivada_aviso' : 'panel.opciones_reactivada_aviso',
      huecos: { opcion: comoSeLlama }
    });
  }

  return (
    <div className="card-dashboard mt-24">
      <div className="mb-16">
        <h3 className="m-0 texto-18 color-titulo">
          <i className="fas fa-list-ul"></i>{' '}
          <span>{frase('panel.opciones_titulo')}</span>
        </h3>
        <p className="m-solo-arriba-4 texto-13 color-secundario">
          {frase('panel.opciones_bajada')}
        </p>
      </div>

      <Cartel tono={cartelLista && cartelLista.tono} clave={cartelLista && cartelLista.clave}
        huecos={cartelLista && cartelLista.huecos} />

      <table className="aspirantes-table">
        <thead>
          <tr>
            <th>{frase('panel.opciones_col_lista')}</th>
            <th>{frase('panel.opciones_col_opcion')}</th>
            <th>{frase('panel.opciones_col_estado')}</th>
            <th>{frase('panel.opciones_col_acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((opcion) => (
            <tr key={opcion.id}>
              <td>{Catalogo.texto(opcion.vocabularios || {})}</td>
              <td><strong>{Catalogo.texto(opcion)}</strong></td>
              <td>
                <span className={'status-pill ' + (opcion.activo ? 'status-validado' : 'status-revision')}>
                  {frase(opcion.activo ? 'panel.opciones_activa' : 'panel.opciones_desactivada')}
                </span>
              </td>
              <td>
                <button className="btn btn-secundario texto-11 p-6-12 mr-8"
                  onClick={() => corregirOpcion(opcion.id)}>
                  {frase('panel.opciones_corregir')}
                </button>
                <button
                  className={opcion.activo
                    ? 'btn fondo-peligro color-sobre-color texto-11 p-6-12'
                    : 'btn btn-secundario texto-11 p-6-12'}
                  disabled={cambiando === opcion.id}
                  onClick={() => cambiarEstadoDeOpcion(opcion.id)}>
                  {frase(opcion.activo ? 'panel.opciones_desactivar' : 'panel.opciones_reactivar')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fondo-superficie-hundida p-16 redondeo-12 borde-tarjeta mt-24">
        <h4 className="m-0 mb-12 texto-14 color-titulo">
          {frase(enCorreccion ? 'panel.opciones_form_correccion' : 'panel.opciones_form_nueva')}
        </h4>

        <Cartel tono={cartelForm && cartelForm.tono} clave={cartelForm && cartelForm.clave}
          huecos={cartelForm && cartelForm.huecos} />

        <div className="grilla-2 gap-16">
          <div className="form-group">
            <label htmlFor="opciones-campo-lista">{frase('panel.opciones_campo_lista')}</label>
            <select id="opciones-campo-lista"
              value={vocabularioId}
              disabled={listasApagadas || !!enCorreccion}
              onChange={(ev) => setVocabularioId(ev.target.value)}
            >
              {/* La primera opción existe sólo cuando hay listas, igual que
                  antes: mientras no llegaron, el desplegable está vacío y
                  apagado, y lo que pasa lo dice el cartel de acá arriba. */}
              {!!listas.length && <option value="">{frase('panel.opciones_elegir_lista')}</option>}
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>{Catalogo.texto(lista)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="opciones-campo-nombre">{frase('panel.opciones_campo_nombre')}</label>
            <input type="text" id="opciones-campo-nombre" maxLength="120"
              ref={campoNombre}
              placeholder={frase('panel.opciones_hueco_nombre')}
              value={nombre}
              onChange={(ev) => setNombre(ev.target.value)}
            />
            <p className="texto-11 color-secundario m-solo-arriba-4">
              {clave ? frase('panel.opciones_guardada_como', { clave: clave }) : ''}
            </p>
          </div>
        </div>

        <p className="texto-11 color-secundario m-0 mb-16">{frase('panel.opciones_ayuda_clave')}</p>

        <div className="flex gap-12">
          <button className="btn peso-700 texto-13" disabled={guardando} onClick={guardarOpcion}>
            <i className="fas fa-floppy-disk"></i>{' '}
            <span>{frase(guardando ? 'panel.opciones_guardando' : 'panel.opciones_guardar')}</span>
          </button>
          <button className="btn btn-secundario texto-13" disabled={guardando}
            onClick={cancelarCorreccionDeOpcion}>
            <span>{frase('panel.opciones_cancelar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
