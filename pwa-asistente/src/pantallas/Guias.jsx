/* ===================================================
   LAS GUÍAS DE CUIDADO

   Qué es la patología, qué se ve en la casa, qué señales obligan a avisar y cómo
   actuar en una emergencia. Es material de consulta: están todas las guías que
   la Prestadora publicó, no la de un Paciente en particular.

   **Los tratamientos no están, y es a propósito.** Decir qué tratamiento
   corresponde convierte al producto en fuente de indicación clínica, y entonces
   alguien tiene que responder cuando un Asistente lo siga y salga mal. Es la
   diferencia entre avisar y prescribir, y la pantalla lo dice en voz alta arriba
   de todo en vez de dejarlo supuesto.

   Lo que llega sale de una puerta de la base que exige el nombre corto de la
   Prestadora y devuelve el catálogo general del producto más lo que agregó esa
   Prestadora, donde lo suyo reemplaza a lo general. Ese reemplazo lo resuelve la
   base y no esta pantalla: si lo decidiera acá, habría que decidirlo igual en la
   aplicación de la Familia y en el sitio. Y sólo llegan las publicadas, que
   también lo garantiza la base: un borrador que se ve es una indicación que
   nadie firmó.

   **Que el filtro no deje ninguna no es lo mismo que no haber guías**, así que
   se dice distinto y no se manda la pantalla al estado vacío.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';

function Guia({ entrada, frase }) {
  const guia = entrada.guia;
  const senales = Catalogo.textoDe(guia.senales_de_alarma) || [];
  const emergencia = Catalogo.textoDe(guia.en_emergencia) || [];

  return (
    <div className="curso-tarjeta">
      <h3>{entrada.nombre}</h3>
      {/* El distintivo aparece sólo cuando la guía la escribió la Prestadora.
          Importa que se note: es la que manda sobre la general, y quien la lee
          tiene derecho a saber quién responde por lo que está leyendo. */}
      {guia.propia ? <span className="curso-datos">{frase('guia.propia')}</span> : null}
      <p>{Catalogo.textoDe(guia.descripcion)}</p>

      <h4>{frase('guia.que_esperar')}</h4>
      <p>{Catalogo.textoDe(guia.que_esperar)}</p>

      <h4>{frase('guia.senales')}</h4>
      <ul>{senales.map((texto, cual) => <li key={cual}>{texto}</li>)}</ul>

      <h4>{frase('guia.emergencia')}</h4>
      <ol>{emergencia.map((texto, cual) => <li key={cual}>{texto}</li>)}</ol>
    </div>
  );
}

export default function Guias({ activa, visita, base, navegar }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [todas, setTodas] = useState([]);
  const [buscado, setBuscado] = useState('');
  const [aviso, setAviso] = useState('');
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (visita === null) return;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        /* El catálogo hace falta para el nombre visible de cada patología: la
           base guarda la clave y el nombre se traduce acá. Quién decide entre la
           base y el archivo sin conexión lo resuelve el propio catálogo. */
        const [guias] = await Promise.all([
          Catalogo.cargarGuias(),
          Catalogo.cargar()
        ]);
        if (!vigente) return;

        const juntadas = [];
        for (const [vocabulario, opciones] of Object.entries(guias || {})) {
          for (const [clave, guia] of Object.entries(opciones || {})) {
            juntadas.push({
              nombre: Catalogo.etiquetaSiExiste(vocabulario, clave) || clave,
              guia: guia
            });
          }
        }
        juntadas.sort((a, b) => a.nombre.localeCompare(b.nombre, Catalogo.idioma));

        if (juntadas.length === 0) { setEstado('vacio'); return; }
        setTodas(juntadas);
        setEstado('listo');
      } catch (err) {
        if (!vigente) return;
        setAviso(Texto.mensajeDeError(err, 'traer las guías de cuidado'));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [visita, base, pedido]);

  const filtro = (buscado || '').trim().toLowerCase();
  const muestra = filtro ? todas.filter((e) => e.nombre.toLowerCase().includes(filtro)) : todas;

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-guias">
      <div className="wizard-header-bar">
        <button type="button" className="btn-volver-cabecera" id="gui-volver" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>{frase('guia.titulo')}</h2>
      </div>

      <div className="capacitaciones-cuerpo">
        <div className="pwa-estado" id="gui-cargando" hidden={estado !== 'cargando'}>
          {frase('guia.cargando')}
        </div>

        <div className="pwa-estado" id="gui-error" hidden={estado !== 'error'}>
          <p id="gui-error-texto">{aviso}</p>
          <button
            type="button"
            className="btn btn-primario"
            id="gui-reintentar"
            onClick={() => setPedido((antes) => antes + 1)}
          >{frase('guia.reintentar')}</button>
        </div>

        <div className="pwa-estado" id="gui-vacio" hidden={estado !== 'vacio'}>
          <p>{frase('guia.vacio')}</p>
          <p className="pwa-estado-bajada">{frase('guia.vacio_bajada')}</p>
        </div>

        <div id="gui-listo" hidden={estado !== 'listo'}>
          <p className="capacitaciones-bajada">{frase('guia.aclaracion')}</p>

          <div className="input-wrapper">
            <input
              type="search"
              id="gui-buscar"
              placeholder={frase('guia.buscar')}
              value={buscado}
              onChange={(evento) => setBuscado(evento.target.value)}
            />
          </div>

          <p className="pwa-estado-bajada" id="gui-sin-resultado" hidden={muestra.length > 0}>
            {frase('guia.sin_resultado')}
          </p>

          <div id="gui-lista">
            {muestra.map((entrada, cual) => (
              <Guia key={entrada.nombre + cual} entrada={entrada} frase={frase} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
