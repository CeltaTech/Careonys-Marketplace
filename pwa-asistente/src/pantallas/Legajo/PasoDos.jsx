/* ===================================================
   PASO 2 — QUÉ SABE HACER Y CON QUÉ PAPELES LO PRUEBA

   El tipo de Asistente, el nivel de estudios, los cursos y los cuatro papeles
   que se adjuntan.

   **Los cuatro campos de archivo llevan los mismos identificadores que el alta
   de escritorio, y no es casualidad.** Los lee el módulo de documentos, que es
   el único lugar donde está escrito qué papel va a qué depósito: si una
   pantalla eligiera el destino, podría mandar el documento de identidad al
   depósito público.

   **La Matrícula se exige sólo cuando el tipo elegido la exige**, y eso lo dice
   el vocabulario y no esta pantalla. El aviso aparece cuando corresponde y se
   va cuando deja de corresponder.

   Las fichas repetibles —matrícula y estudios— son huecos: las dibuja el mismo
   módulo que usa el portal, desde la declaración de los formularios.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { SelectDelCatalogo, CasillasDelCatalogo } from '../../piezas/DelCatalogo.jsx';

export default function PasoDos({ activo, irA, alElegirTipo, avisoDeMatricula }) {
  const { frase } = useFrases();

  return (
    <div className={activo ? 'wpane active' : 'wpane'} id="wp2">
      <h3><i className="fas fa-file-invoice"></i> <span>{frase('legajo.paso2_titulo')}</span></h3>

      <div className="wfield">
        <label>{frase('legajo.tipo_asistente')}</label>
        <SelectDelCatalogo
          id="w-profesion"
          clave="tipo_asistente"
          required
          vacio="legajo.elegir_tipo"
          onChange={alElegirTipo}
        />
      </div>
      <div className="wfield">
        <label>{frase('legajo.estudios')}</label>
        <SelectDelCatalogo id="w-estudios" clave="nivel_educativo" required />
      </div>

      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--texto-principal)', margin: '12px 0 6px' }}>
        {frase('legajo.certificaciones')}
      </p>
      <CasillasDelCatalogo
        className="wcheck-group"
        clave="certificacion"
        nombre="certificacion"
        clase="catalogo-casilla"
      />

      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--texto-secundario)', margin: '12px 0 6px' }}>
        <i className="fas fa-shield-alt color-peligro"></i> <span>{frase('legajo.documentacion')}</span>
      </p>
      <div className="wfield">
        <label>{frase('legajo.doc_foto')}</label>
        <input type="file" id="foto-perfil" />
      </div>
      <div className="wfield">
        <label>{frase('legajo.doc_dni')}</label>
        <input type="file" id="file-dni" />
      </div>
      <div className="wfield">
        <label>{frase('legajo.doc_penales')}</label>
        <input type="file" id="file-penales" />
      </div>
      <div className="wfield">
        <label>{frase('legajo.doc_titulo')}</label>
        <input type="file" id="file-titulo" />
      </div>

      <p
        className="oculto"
        id="ficha-matricula-obligatoria-aviso"
        style={{
          fontSize: '10px',
          color: 'var(--tono-atencion-texto)',
          background: 'var(--tono-atencion-fondo)',
          borderRadius: '8px',
          padding: '10px',
          margin: '14px 0 0',
          display: avisoDeMatricula
        }}
      >{frase('legajo.matricula_obligatoria')}</p>

      <div id="ficha-matricula" style={{ marginTop: '14px' }}></div>
      <div id="ficha-estudio" style={{ marginTop: '14px' }}></div>

      <div className="wnav">
        <button type="button" className="wbtn-prev" onClick={() => irA(1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <button type="button" className="wbtn-next" onClick={() => irA(3)}>
          <span>{frase('legajo.siguiente')}</span> <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
