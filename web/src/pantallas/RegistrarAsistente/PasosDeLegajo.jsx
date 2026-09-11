/* ===================================================
   LOS PASOS 4, 5 Y 6: HORARIOS, LEGAJO Y PAPELES

   Los tres son casi todo hueco: la grilla de disponibilidad, las cuatro fichas
   repetibles y las preguntas del paso las dibujan los mismos módulos que usa la
   aplicación del teléfono, con lo que traen sus catálogos. Acá sólo se dice
   dónde van, con el mismo identificador de siempre, porque es por el
   identificador que el módulo los encuentra.

   Lo único escrito a mano son los tres selectores de archivo del paso 6, y
   tampoco eligen su destino: a qué depósito va cada papel lo declara
   `js/documentos-legajo.js`, que se lo escribe al campo al arrancar la pantalla.
=================================================== */

import { useFrases } from '../../frases/ProveedorDeFrases.jsx';
import { CasillasDelCatalogo } from './DelCatalogo.jsx';
import { Pane, Navegadores } from './Navegadores.jsx';

/* Lo que viene tildado de entrada, escrito una vez arriba y no en cada dibujo:
   son las mismas dos que declaraba el atributo de la página. */
const TILDADO_MODALIDAD = ['horas'];
const TILDADO_RETIRO = ['con_retiro'];

/* El estilo de las dos filas de casillas del paso 4, iguales las dos. */
const FILA_DE_CASILLAS = {
  display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap', fontSize: '13px'
};

/* El marco de cada selector de archivo del paso 6. */
const SELECTOR_DE_ARCHIVO = {
  display: 'block', width: '100%', marginTop: '6px', padding: '8px',
  border: '1.5px dashed var(--borde-card)', borderRadius: '8px',
  fontSize: '12px', cursor: 'pointer', background: 'var(--superficie)'
};

/* Los tres papeles del paso 6, que se dibujan iguales salvo por el ícono, el
   rótulo y el identificador del campo. El identificador es el que conoce el
   módulo que los sube: no se cambia. */
const LOS_TRES_PAPELES = [
  { id: 'file-dni', icono: 'fa-id-card', rotulo: 'alta.doc_dni', multiple: true },
  { id: 'file-penales', icono: 'fa-shield-alt', rotulo: 'alta.doc_penales', multiple: false },
  { id: 'file-titulo', icono: 'fa-graduation-cap', rotulo: 'alta.doc_titulo', multiple: false }
];

export default function PasosDeLegajo({
  paso, irAlPaso, seguir, textosDisponibilidad, exigeMatricula, avisoMatriculaCritico
}) {
  const { frase } = useFrases();

  return (
    <>
      {/* PASO 4: DISPONIBILIDAD HORARIA Y TARIFAS */}
      <Pane numero={4} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-calendar-alt"></i> <span>{frase('legajo.paso4_titulo')}</span>
        </h3>

        <div className="fondo-superficie-hover redondeo-12 p-20 borde-tarjeta mb-20">
          <p className="texto-13 peso-700 color-principal mb-12">{frase('legajo.modalidades')}</p>
          <CasillasDelCatalogo
            clave="modalidad_contratacion" nombre="modalidad_contratacion"
            clase="catalogo-casilla" marcados={TILDADO_MODALIDAD} style={FILA_DE_CASILLAS}
          />
          <p className="texto-13 peso-700 color-principal mb-12">{frase('legajo.retiro')}</p>
          <CasillasDelCatalogo
            clave="retiro" nombre="retiro"
            clase="catalogo-casilla" marcados={TILDADO_RETIRO} style={FILA_DE_CASILLAS}
          />
          <div className="form-group" style={{ marginTop: '16px', maxWidth: '300px' }}>
            <label htmlFor="valor-hora">{frase('legajo.valor_hora')}</label>
            <input type="number" id="valor-hora" placeholder={frase('legajo.valor_hora_ejemplo')} required />
          </div>

          {/* La grilla no se dibuja acá. Los días, los turnos y las horas que
              cubre cada turno salen de data/catalogo-vocabularios.json; los
              textos del paso, de data/catalogo-disponibilidad.json. Las junta
              js/disponibilidad.js. */}
          <p id="disponibilidad-titulo" className="texto-13 peso-700 color-principal mb-4">
            {textosDisponibilidad.titulo}
          </p>
          <p id="disponibilidad-bajada" className="texto-12-5 color-secundario mb-12">
            {textosDisponibilidad.bajada}
          </p>
          <div id="grilla-disponibilidad"></div>
          <p id="disponibilidad-ayuda"
            style={{ fontSize: '11.5px', color: 'var(--texto-secundario)', margin: '8px 0 0 0' }}>
            {textosDisponibilidad.ayuda}
          </p>

          <div id="preguntas-disponibilidad" style={{ marginTop: '20px' }}></div>
        </div>

        <Navegadores anterior={3} siguiente={5} irAlPaso={irAlPaso} seguir={seguir} />
      </Pane>

      {/* PASO 5: LEGAJO — FICHAS REPETIBLES (matrícula, estudios, experiencia, referencias) */}
      {/* Se dibuja desde data/catalogo-fichas.json vía js/fichas-legajo.js
          («los formularios se declaran, no se dibujan»). */}
      <Pane numero={5} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-folder-open"></i> <span>{frase('alta.paso5_titulo')}</span>
        </h3>
        {/* Mientras no se sepa qué Tipo de Asistente se eligió, el aviso está
            escondido por la clase, igual que nacía en la página. Cuando se sabe,
            manda el estilo: se ve sólo si ese tipo exige matrícula. Y si se
            intentó pasar de paso sin cargarla, se repinta en rojo y queda así. */}
        <p
          id="ficha-matricula-obligatoria-aviso"
          className={exigeMatricula === null ? 'oculto' : undefined}
          style={{
            fontSize: '12.5px',
            color: 'var(--tono-atencion-texto)',
            background: avisoMatriculaCritico ? 'var(--tono-critico-fondo)' : 'var(--tono-atencion-fondo)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '16px',
            display: exigeMatricula === null ? undefined : (exigeMatricula ? 'block' : 'none')
          }}
        >
          {frase('legajo.matricula_obligatoria')}
        </p>
        <div id="ficha-matricula" className="mb-24"></div>
        <div id="ficha-estudio" className="mb-24"></div>
        <div id="ficha-experiencia_laboral" className="mb-24"></div>
        <div id="ficha-referencia" className="mb-24"></div>

        <Navegadores anterior={4} siguiente={6} irAlPaso={irAlPaso} seguir={seguir} />
      </Pane>

      {/* PASO 6: REFERENCIAS Y CONFIRMACIÓN */}
      <Pane numero={6} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-user-check"></i> <span>{frase('alta.paso6_titulo')}</span>
        </h3>

        {/* CARGA DE DOCUMENTOS: DNI, PENALES, TÍTULO */}
        <div className="fondo-superficie-hover redondeo-12 p-20 borde-tarjeta mb-20">
          <h4 className="texto-14 peso-700 color-titulo mb-6">
            <i className="fas fa-file-upload color-azul-medio"></i>{' '}
            <span>{frase('legajo.documentacion')}</span>
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', margin: '0 0 14px 0' }}>
            {frase('alta.documentos_condiciones')}
          </p>

          {LOS_TRES_PAPELES.map((papel, cuantos) => (
            <div
              key={papel.id}
              className={cuantos === LOS_TRES_PAPELES.length - 1 ? 'form-group' : 'form-group mb-14'}
            >
              <label className="peso-700 texto-13">
                <i className={'fas ' + papel.icono + ' color-azul-medio'}></i>{' '}
                <span>{frase(papel.rotulo)}</span> <span className="color-peligro">*</span>
              </label>
              <input
                type="file" id={papel.id} name={papel.id}
                multiple={papel.multiple || undefined} required
                style={SELECTOR_DE_ARCHIVO}
              />
              <p id={papel.id + '-status'} className="texto-11 color-exito m-solo-arriba-4 oculto">
                <i className="fas fa-check-circle"></i> <span>{frase('alta.archivo_listo')}</span>
              </p>
            </div>
          ))}
        </div>

        {/* NOTA DEL PROCESO DE INCORPORACIÓN DE ASISTENTES, A CARGO DE LA PRESTADORA */}
        <div style={{
          background: 'var(--tono-exito-fondo)', borderLeft: '4px solid var(--verde-exito)',
          borderRadius: '8px', padding: '16px', margin: '20px 0', fontSize: '12.5px',
          color: 'var(--tono-exito-texto)', lineHeight: 1.6
        }}>
          <strong>
            <i className="fas fa-info-circle"></i> <span>{frase('alta.incorporacion_titulo')}</span>
          </strong><br />
          <span>{frase('alta.incorporacion_texto')}</span>
        </div>

        <Navegadores anterior={5} siguiente={7} irAlPaso={irAlPaso} seguir={seguir} />
      </Pane>
    </>
  );
}
