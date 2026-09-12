/* ===================================================
   EL AVISO NUEVO

   La Familia cuenta qué cuidado necesita, y los Asistentes que quieran se
   postulan. Acá no se guarda ningún trato ni ningún precio: se guarda el pedido
   y nada más.

   **La grilla de cuándo se necesita el cuidado no se dibuja acá.** Los días, los
   turnos y las horas que cubre cada turno salen del catálogo de vocabularios;
   los textos del paso, del catálogo de disponibilidad. Los junta
   `js/disponibilidad.js`, el mismo archivo que dibuja la grilla del alta del
   Asistente, y lo hace escribiendo adentro de los recuadros vacíos que esta
   pantalla deja con los nombres que él espera. Se monta una sola vez, al
   arrancar, igual que antes: la pantalla existe desde el principio y sólo se
   muestra o se esconde.

   Antes acá había tres casillas de turnos y ningún día: se podía pedir «tarde»
   pero no «los martes a la tarde», y lo que se marcaba iba a una columna suelta
   que nadie leía.

   **Las dos listas y las casillas salen del catálogo**, no de una lista escrita
   adentro de la pantalla, y cada una trae sus cuatro estados.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import BarraDeAbajo from './BarraDeAbajo.jsx';
import { CasillasDelCatalogo, SelectDelCatalogo } from '#comun/formularios/DelCatalogo.jsx';

/* La grilla se monta una vez para toda la vida del programa. La marca vive
   afuera del componente a propósito: React puede montar y desmontar una pantalla
   más de una vez, y la grilla se dibuja escribiendo en el documento, así que dos
   montajes darían dos grillas. */
let grillaPedida = false;

const CLASE_DE_CAMPO =
  'ancho-total p-9-12 redondeo-10 borde-tarjeta-15 texto-13 caja-borde fondo-superficie-hundida';

const ESTILO_DEL_TITULO = {
  margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: 'var(--marca-prestadora)'
};

export default function Publicar({ activa, navegar }) {
  const { frase } = useFrases();
  const formulario = useRef(null);
  const enCurso = useRef(false);
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(false);

  /* Los textos del paso y la grilla, pedidos al mismo archivo que los dibuja en
     el alta del Asistente. */
  useEffect(() => {
    if (grillaPedida) return;
    grillaPedida = true;
    (async () => {
      try {
        await import('#js/disponibilidad.js');
        await window.Franjas.montarTextos('franjas-cuidado', 'paso_de_franjas_aviso');
        await window.Franjas.montarGrilla('grilla-cuidado', 'grilla_aviso');
      } catch (err) {
        console.error('Grilla de las franjas del aviso:', err);
      }
    })();
  }, []);

  async function publicar(evento) {
    evento.preventDefault();
    if (enCurso.current) return;
    const nombre = document.getElementById('pb-nombre').value.trim();
    const zona = document.getElementById('pb-zona').value;
    const tipo = document.getElementById('pb-tipo').value;
    if (!nombre || !zona || !tipo) {
      alert(frase('familia.aviso_faltan_datos'));
      return;
    }
    /* Un par `{ dia, turno }` por casillero marcado, con claves de catálogo. Va
       a `franjas_aviso`, una fila cada uno. */
    const franjas = window.Franjas.recolectar('grilla-cuidado').franjas;
    const patologias = Array.from(
      document.querySelectorAll('input[name="patologia"]:checked')
    ).map((casilla) => casilla.value);
    const descripcion = document.getElementById('pb-descripcion').value;

    enCurso.current = true;
    setPublicando(true);
    try {
      const { ClienteDatos, Sesion } = await conLaBase();
      const sesion = await Sesion.getSession();
      await ClienteDatos.crearAviso({
        patientName: nombre,
        zona,
        scheduleType: tipo,
        franjas,
        pathologiesRequired: patologias,
        description: descripcion,
        familyUserId: sesion?.user?.id || null
      });
      setPublicado(true);
      formulario.current.reset();
      /* `reset()` no desmarca la grilla: sus casilleros son botones y no
         controles de formulario. Sin esto, la búsqueda siguiente arrancaría con
         lo que se marcó en la anterior. */
      window.Franjas.limpiar('grilla-cuidado');
      setTimeout(() => {
        setPublicado(false);
        navegar('dashboard');
      }, 4000);
    } catch (err) {
      alert(frase(Texto.claveDeError(err, 'publicar el aviso')));
    } finally {
      enCurso.current = false;
      setPublicando(false);
    }
  }

  return (
    <div className={'app-screen pb-64' + (activa ? ' active' : '')} id="screen-publicar">
      <div className="app-header">
        <button className="btn-back" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>
          <i className="fas fa-plus-circle color-marca-acento"></i>{' '}
          <span>{frase('familia.nuevo_aviso')}</span>
        </h1>
        <div className="ancho-24"></div>
      </div>

      <div className="p-16">
        <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', margin: '0 0 16px 0' }}>
          {frase('familia.aviso_bajada')}
        </p>

        <form id="form-nuevo-aviso" ref={formulario} noValidate onSubmit={publicar}>

          {/* Datos del Paciente */}
          <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-12">
            <h4 style={ESTILO_DEL_TITULO}>
              <i className="fas fa-user-injured" style={{ marginRight: '6px' }}></i>
              <span>{frase('familia.aviso_datos_paciente')}</span>
            </h4>
            <div className="mb-10">
              <label className="bloque texto-11 peso-700 color-secundario mb-4">
                {frase('familia.aviso_nombre_paciente')}
              </label>
              <input type="text" id="pb-nombre" required className={CLASE_DE_CAMPO}
                placeholder={frase('familia.aviso_nombre_ejemplo')} />
            </div>
            <div className="grilla grilla-2 gap-10 mb-10">
              <div>
                <label className="bloque texto-11 peso-700 color-secundario mb-4">
                  {frase('familia.aviso_edad')}
                </label>
                <input type="number" id="pb-edad" placeholder="80" min="50" max="110"
                  className={CLASE_DE_CAMPO} />
              </div>
              <div>
                <label className="bloque texto-11 peso-700 color-secundario mb-4">
                  {frase('familia.aviso_zona')}
                </label>
                <SelectDelCatalogo id="pb-zona" clave="zona" required className={CLASE_DE_CAMPO} />
              </div>
            </div>
          </div>

          {/* Tipo de Cuidado */}
          <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-12">
            <h4 style={ESTILO_DEL_TITULO}>
              <i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i>
              <span>{frase('familia.aviso_tipo_cuidado')}</span>
            </h4>
            <label className="bloque texto-11 peso-700 color-secundario mb-4">
              {frase('familia.aviso_modalidad')}
            </label>
            <SelectDelCatalogo id="pb-tipo" clave="modalidad_contratacion" required
              className={CLASE_DE_CAMPO + ' mb-10'} />

            {/* Los tres recuadros que llena `js/disponibilidad.js`. Nacen vacíos
                y con los nombres que ese archivo busca. */}
            <p id="franjas-cuidado-titulo"
              style={{ fontSize: '11px', fontWeight: 700, color: 'var(--texto-secundario)', marginBottom: '2px' }}></p>
            <p id="franjas-cuidado-bajada"
              style={{ fontSize: '10px', color: 'var(--texto-secundario)', margin: '0 0 6px' }}></p>
            <div id="grilla-cuidado"></div>
            <p id="franjas-cuidado-ayuda"
              style={{ fontSize: '10px', color: 'var(--texto-secundario)', margin: '6px 0 0' }}></p>
          </div>

          {/* Patologías */}
          <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-16">
            <h4 style={ESTILO_DEL_TITULO}>
              <i className="fas fa-notes-medical" style={{ marginRight: '6px' }}></i>
              <span>{frase('familia.aviso_condicion')}</span>
            </h4>
            <label className="bloque texto-11 peso-700 color-secundario mb-8">
              {frase('familia.aviso_patologias')}
            </label>
            <CasillasDelCatalogo clave="patologia" nombre="patologia"
              clase="catalogo-casilla" className="grilla grilla-2 gap-8" />
            <div className="mt-12">
              <label className="bloque texto-11 peso-700 color-secundario mb-4">
                {frase('familia.aviso_descripcion')}
              </label>
              <textarea id="pb-descripcion" rows="3" className={CLASE_DE_CAMPO}
                placeholder={frase('familia.aviso_descripcion_ejemplo')}></textarea>
            </div>
          </div>

          <button type="submit" id="btn-enviar-aviso" disabled={publicando}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'var(--marca-prestadora-acento)', color: 'var(--texto-sobre-color)',
              fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
              boxShadow: 'var(--sombra-alta)'
            }}>
            {publicando ? frase('familia.aviso_publicando') : (
              <>
                <i className="fas fa-bullhorn"></i>{' '}
                <span>{frase('familia.aviso_publicar')}</span>
              </>
            )}
          </button>
          <div className="oculto" id="pb-success"
            style={{
              display: publicado ? 'block' : 'none',
              background: 'var(--tono-exito-fondo)', color: 'var(--verde-exito-texto)',
              padding: '14px', borderRadius: '12px', fontWeight: 700, textAlign: 'center',
              fontSize: '13px', border: '1px solid var(--tono-exito-borde)', marginTop: '12px'
            }}>
            <span>{frase('familia.aviso_publicado')}</span>
          </div>
        </form>
      </div>

      <BarraDeAbajo actual="publicar" navegar={navegar} />
    </div>
  );
}
