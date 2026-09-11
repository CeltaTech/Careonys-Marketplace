/* ===================================================
   LA RED DE ASISTENTES

   La vidriera del producto, y la única lista que se ve sin iniciar sesión. Es
   la misma pantalla de siempre: lo que cambió es que la dibuja React en vez de
   un molde `<template>` rellenado a mano. Ni una función más ni una menos.

   **La pantalla no filtra por Prestadora, y eso no es un olvido.** Lo exige la
   base: `ClienteDatos.listarDirectorio()` va por `directorio_de`, que pide el
   nombre corto de una Prestadora, y la vista que mezclaba dos empresas dejó de
   existir. Escribirlo también acá sería una segunda condición que alguien
   podría cambiar sin que la otra se entere.

   **La puerta, antes que nada.** El acceso a datos y `js/zonas.js` se piden
   diferidos, como hacen el acceso y el alta de Familia: pedidos arriba de todo
   viajarían hasta en las pantallas públicas que no consultan nada. Acá la
   pantalla sí consulta, así que abre la puerta y recién entonces pregunta.

   **Los cuatro estados son cuatro de verdad, y el cuarto son dos cosas
   distintas que no se confunden.** Está el directorio vacío —ningún Asistente
   publicado en esta Prestadora, que se explica con las tres condiciones que
   hacen falta para aparecer— y está la búsqueda sin resultados, que se dice con
   su propia frase y no con un «Mostrando 0» que se lee como si algo se hubiera
   roto.

   **El filtro compara clave con clave.** Cada desplegable devuelve una clave de
   catálogo y cada Asistente trae las suyas, así que «medicos» encuentra a
   «Médicos» y ningún cambio de redacción rompe un filtro sin avisar. Eso vivía
   en `js/main.js`, que enganchaba los desplegables por su identificador y
   prendía y apagaba tarjetas ya dibujadas; acá la misma decisión se toma antes
   de dibujar, que es como se hacen las cosas de este lado.
=================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { useVocabulario } from '#comun/formularios/useVocabulario.js';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

/* Cómo se dicen las zonas de alguien que ya contestó lo sabe `js/zonas.js`, que
   es el mismo archivo que dibuja las casillas del formulario de alta. Se pide
   diferido por la misma razón que la puerta a la base, y una sola vez: la
   segunda pantalla que lo pida recibe el mismo. */
let elLectorDeZonas = null;
function conLasZonas() {
  if (!elLectorDeZonas) {
    elLectorDeZonas = import('#js/zonas.js').then(() => window.Zonas);
  }
  return elLectorDeZonas;
}

/* La búsqueda libre ignora tildes: quien escribe «nunez» busca Núñez. Las
   tildes se sacan por su número y no escribiéndolas: una tilde suelta adentro
   de un archivo es un carácter que no se ve, y el día que alguien abra esto con
   otra codificación se lleva puesta la búsqueda sin enterarse. */
function sinTildes(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Un Asistente puede llevar varias claves —varias zonas, varias patologías—, y
   se compara la clave entera y no un pedazo: `acv` no tiene por qué encontrar a
   `acv_grave`. Sin nada elegido, ese filtro no opina. */
function tieneLaClave(claves, elegida) {
  if (!elegida) return true;
  return claves.indexOf(elegida) !== -1;
}

/* Las opciones de un desplegable, con el mismo reparto que hacía el catálogo
   sobre una página suelta: cuando los ítems traen `region`, los que no tienen
   ninguna son los encabezados y los demás cuelgan del suyo. Una región también
   se elige entera, así que aparece además adentro de su propio grupo. Y una
   zona cuya región no vino se muestra igual, al final y sin grupo: esconderla
   sería perder una opción sin decirlo. */
function opcionesDe(items, texto) {
  if (!items.some((item) => 'region' in item)) {
    return items.map((item) => ({ suelta: true, clave: item.clave, etiqueta: texto(item) }));
  }

  const grupos = {};
  const salida = [];

  items.filter((item) => !item.region).forEach((item) => {
    grupos[item.clave] = { suelta: false, clave: item.clave, etiqueta: texto(item), items: [] };
    salida.push(grupos[item.clave]);
  });

  items.forEach((item) => {
    const opcion = { clave: item.clave, etiqueta: texto(item) };
    if (!item.region) { grupos[item.clave].items.push(opcion); return; }
    const destino = grupos[item.region];
    if (destino) destino.items.push(opcion);
    else salida.push({ suelta: true, ...opcion });
  });

  return salida;
}

/* Un filtro. Los cuatro son el mismo desplegable con distinto vocabulario, así
   que se escribe una vez: lo único propio de cada uno es de qué lista salen sus
   opciones y qué dice el renglón de «todas». Mientras el catálogo viaja queda
   apagado y lo dice, que es lo mismo que hacía sobre la página suelta: un
   desplegable vacío y uno que todavía no llegó se ven igual. */
function Desplegable({ id, vocabulario, claveDelVacio, valor, alCambiar }) {
  const { frase } = useFrases();
  const opciones = useVocabulario(vocabulario);

  const rotuloDelVacio =
    opciones.estado === 'cargando' ? frase('catalogo.cargando')
      : opciones.estado === 'error' ? frase('catalogo.error')
        : opciones.items.length === 0 ? frase('catalogo.vacio')
          : frase(claveDelVacio);

  return (
    <select
      id={id}
      className="flex-1 ancho-minimo-140"
      value={valor}
      onChange={(evento) => alCambiar(evento.target.value)}
      disabled={opciones.estado === 'cargando'}
    >
      <option value="">{rotuloDelVacio}</option>
      {opcionesDe(opciones.items, opciones.texto).map((entrada) => (
        entrada.suelta
          ? <option key={entrada.clave} value={entrada.clave}>{entrada.etiqueta}</option>
          : (
            <optgroup key={entrada.clave} label={entrada.etiqueta}>
              {entrada.items.map((opcion) => (
                <option key={opcion.clave} value={opcion.clave}>{opcion.etiqueta}</option>
              ))}
            </optgroup>
          )
      ))}
    </select>
  );
}

export default function Directorio() {
  const { frase } = useFrases();

  /* El directorio no se indexa. No es una preferencia: es lo que se le promete
     a quien se publica —«no aparece en Google ni en ningún buscador»,
     data/catalogo-autorizaciones.json—. Si el perfil se indexara, la Familia
     llegaría al Asistente sin pasar por la plataforma. */
  usePestana('nav.red_asistentes', { descripcion: 'directorio.descripcion', fueraDeBuscadores: true });

  const [estado, setEstado] = useState('cargando');
  const [claveDelError, setClaveDelError] = useState('');
  const [filas, setFilas] = useState([]);
  const [intento, setIntento] = useState(0);
  const [piezas, setPiezas] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [zonaElegida, setZonaElegida] = useState('');
  const [tipoElegido, setTipoElegido] = useState('');
  const [patologiaElegida, setPatologiaElegida] = useState('');
  const [comprobacionElegida, setComprobacionElegida] = useState('');

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');

    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const Zonas = await conLasZonas();
        if (!vigente) return;

        /* El catálogo hace falta para escribir «Enfermero universitario» donde
           la fila dice `enfermero_universitario`. Los dos pedidos van juntos. */
        const [traidas] = await Promise.all([
          ClienteDatos.listarDirectorio(),
          Catalogo.cargar()
        ]);
        if (!vigente) return;

        setPiezas({ ClienteDatos, Zonas });
        setFilas(traidas || []);
        setEstado(traidas && traidas.length ? 'listo' : 'vacio');
      } catch (err) {
        if (!vigente) return;
        // La clave, no el texto: así el mensaje cambia con el idioma como
        // cualquier otro rótulo de la pantalla, y el detalle crudo de la base
        // queda en la consola.
        setClaveDelError(Texto.claveDeError(err, 'traer el directorio'));
        setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, [intento]);

  /* Todo lo que una tarjeta muestra y todo lo que el filtro compara, sacado de
     la fila una sola vez por dibujo. Se resuelve mientras se dibuja y no al
     traer los datos, para que un cambio de idioma alcance también a lo que sale
     del vocabulario y no sólo a los rótulos. */
  function loQueMuestra(fila) {
    const { ClienteDatos, Zonas } = piezas;

    // Las regiones, no los municipios: ocho nombres en una tarjeta que se lee
    // de un vistazo la vuelven ilegible. El detalle está en el perfil.
    const zona = Zonas.resumen(fila);
    const tipo = Catalogo.etiquetaSiExiste('tipo_asistente', fila.profession);
    const patologias = fila.pathologies || [];
    const tareas = fila.tasks || [];

    /* Quién alcanza a quién lo resuelve la base en `zonas_claves` (migración
       0037): ahí «toda la Zona Norte» ya viene con San Isidro adentro. */
    const zonas = (fila.zonas_claves || []).slice();
    if (zonas.length === 0 && fila.zone) zonas.push(fila.zone);

    // «Prefiero no decirlo» es la respuesta de quien no quiso decirlo:
    // escribirla en la tarjeta sería publicarla igual, con otras palabras.
    const genero = fila.gender === 'sin_declarar'
      ? '' : Catalogo.etiquetaSiExiste('genero', fila.gender);

    return {
      nombre: fila.full_name || '',
      tipoYZona: [tipo, genero, zona].filter(Boolean).join(' · '),
      zonas,
      tipo: fila.profession || '',
      patologias,
      // Qué se le comprobó. La vista devuelve sólo las cinco que el
      // consentimiento nombra, así que acá no hay nada que filtrar.
      comprobaciones: fila.comprobaciones || [],
      foto: ClienteDatos.urlDeFotoPublica(fila.foto),
      inicial: (fila.full_name || '?').trim().charAt(0).toUpperCase(),
      // La moneda va al lado del número desde la migración 0074: es la que el
      // legajo tiene guardada, no la de quien mira.
      precio: fila.hourly_rate ? Texto.importe(fila.hourly_rate, fila.moneda_valor_hora) : '',
      etiquetas: patologias
        .map((clave) => Catalogo.etiquetaSiExiste('patologia', clave) || clave)
        .concat(tareas.map((clave) => Catalogo.etiquetaDeTarea(clave)))
    };
  }

  /* El nombre corto de la Prestadora viaja con el enlace. Sin él, quien llegó
     acá con `?t=<nombre corto>` abría el perfil sin Prestadora y la pantalla se
     quedaba en «esta dirección no nombró ninguna Prestadora». Por subdominio no
     hace falta —ése se conserva solo— y `slugPedido` queda en nulo, así que no
     se agrega nada. */
  function enlaceAlPerfil(fila) {
    const nombreCorto = piezas.ClienteDatos.slugPedido;
    return '/perfil?id=' + encodeURIComponent(fila.id)
      + (nombreCorto ? '&t=' + encodeURIComponent(nombreCorto) : '');
  }

  const buscado = sinTildes(busqueda);

  const visibles = estado === 'listo'
    ? filas
      .map((fila) => ({ fila, muestra: loQueMuestra(fila) }))
      .filter(({ muestra }) => {
        const nombre = sinTildes(muestra.nombre);
        // La zona se guarda como clave (`grand_bourg`) y se busca como se
        // escribe.
        const zonaEscrita = sinTildes(muestra.zonas.join(' ').replace(/_/g, ' '));

        return (!buscado || nombre.includes(buscado) || zonaEscrita.includes(buscado))
          && tieneLaClave(muestra.zonas, zonaElegida)
          && tieneLaClave([muestra.tipo], tipoElegido)
          && tieneLaClave(muestra.patologias, patologiaElegida)
          && tieneLaClave(muestra.comprobaciones, comprobacionElegida);
      })
    : [];

  /* Cero resultados se dice con una frase, no con un «Mostrando 0» que se lee
     como si algo se hubiera roto. Singular y plural son dos claves distintas y
     no una frase armada con pedazos: el número va adentro de un hueco y cada
     idioma la ordena como quiera. */
  const cuenta = visibles.length === 0
    ? frase('directorio.sin_coincidencias')
    : visibles.length === 1
      ? frase('directorio.mostrando_uno')
      : frase('directorio.mostrando_varios', { cuantos: visibles.length });

  return (
    <>
      <section className="directory-hero">
        <h1>{frase('nav.red_asistentes')}</h1>
        <p>{frase('directorio.bajada')}</p>
        <Link to="/registrar-familia" className="btn btn-atencion">
          {frase('nav.publicar_aviso')}
        </Link>
      </section>

      <div className="filter-bar">
        <div className="filter-inner envolver gap-12">
          <input
            type="text"
            id="dir-search"
            placeholder={frase('directorio.buscar')}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            style={{ flex: 2, minWidth: 220 }}
          />
          <Desplegable
            id="dir-zone" vocabulario="zona"
            claveDelVacio="directorio.todas_zonas"
            valor={zonaElegida} alCambiar={setZonaElegida}
          />
          <Desplegable
            id="dir-type" vocabulario="tipo_asistente"
            claveDelVacio="directorio.todos_tipos"
            valor={tipoElegido} alCambiar={setTipoElegido}
          />
          <Desplegable
            id="dir-patologia" vocabulario="patologia"
            claveDelVacio="directorio.todas_patologias"
            valor={patologiaElegida} alCambiar={setPatologiaElegida}
          />
          {/* El cuarto desplegable sale del vocabulario `comprobacion`, que
              tiene cinco claves y no las siete de `verificacion`: documento,
              antecedentes penales y certificado de salud se comprueban igual y
              no salen nunca. */}
          <Desplegable
            id="dir-comprobacion" vocabulario="comprobacion"
            claveDelVacio="directorio.cualquier_comprobacion"
            valor={comprobacionElegida} alCambiar={setComprobacionElegida}
          />
        </div>
      </div>

      <section className="directory-grid-section">
        {/* La cuenta es del estado «listo»: sin tarjetas no hay nada que
            contar. */}
        {estado === 'listo' && <p className="directorio-cuenta">{cuenta}</p>}

        {estado === 'cargando' && (
          <div className="directorio-estado">
            <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i>{' '}
            <span>{frase('directorio.cargando')}</span>
          </div>
        )}

        {estado === 'error' && (
          <div className="directorio-estado">
            <p>{frase(claveDelError)}</p>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setIntento((cuantos) => cuantos + 1)}
            >
              {frase('acceso.reintentar')}
            </button>
          </div>
        )}

        {estado === 'vacio' && (
          <div className="directorio-estado">
            <p>{frase('directorio.vacio')}</p>
            <p className="directorio-estado-bajada">{frase('directorio.vacio_bajada')}</p>
          </div>
        )}

        {estado === 'listo' && (
          <div className="directory-grid">
            {visibles.map(({ fila, muestra }) => (
              <article className="caregiver-card fade-in" key={fila.id}>
                <div className="card-header-strip"></div>
                <div className="card-body">
                  <div className="card-top">
                    {muestra.foto
                      ? <img className="card-avatar" alt="" src={muestra.foto} />
                      : (
                        <div className="card-avatar card-avatar-inicial" aria-hidden="true">
                          {muestra.inicial}
                        </div>
                      )}
                    <div className="card-meta">
                      <h3>{muestra.nombre}</h3>
                      <p className="sub">{muestra.tipoYZona}</p>
                    </div>
                  </div>

                  {fila.reemplazos_urgentes && (
                    <div className="card-badge">{frase('directorio.urgencias')}</div>
                  )}

                  {muestra.precio && (
                    <p className="card-precio">
                      {muestra.precio}{' '}
                      <span className="card-precio-unidad">{frase('directorio.por_hora')}</span>
                    </p>
                  )}

                  <div style={{ margin: '8px 0 12px 0' }}>
                    <span className="insignia-validada" title={frase('directorio.validado_detalle')}>
                      <i className="fas fa-user-check" aria-hidden="true"></i>{' '}
                      <span>{frase('directorio.validado')}</span>
                    </span>
                  </div>

                  {/* Sin ninguna comprobación la lista no se dibuja, y no queda
                      un hueco donde debería haber algo. */}
                  {muestra.comprobaciones.length > 0 && (
                    <div className="lista-comprobaciones">
                      {muestra.comprobaciones.map((clave) => (
                        <span className="insignia-comprobacion" key={clave}>
                          {Catalogo.etiquetaSiExiste('comprobacion', clave) || clave}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="specialties">
                    {muestra.etiquetas.map((texto, cual) => (
                      <span className="specialty-tag" key={cual}>{texto}</span>
                    ))}
                  </div>
                </div>

                <div className="card-footer">
                  <Link className="btn btn-primario" to={enlaceAlPerfil(fila)}>
                    {frase('directorio.ver_perfil')}
                  </Link>
                  <Link
                    className="btn btn-sobre-oscuro borde-color-tarjeta color-secundario"
                    to={enlaceAlPerfil(fila) + '#contactar'}
                  >
                    {frase('directorio.contactar')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="cta-banner">
        <Link to="/registrar-familia" className="btn btn-atencion">
          {frase('nav.publicar_aviso')}
        </Link>
      </div>
    </>
  );
}
