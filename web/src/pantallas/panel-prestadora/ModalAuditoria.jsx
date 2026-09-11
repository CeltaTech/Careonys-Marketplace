/* ===================================================
   LA AUDITORÍA DEL LEGAJO Y LA RESOLUCIÓN DE LA PRESTADORA

   Lo que la Prestadora controla de un Asistente, entero y en un solo lugar: el
   detalle del legajo con sus papeles firmados, las verificaciones papel por
   papel, las resoluciones que ya se tomaron, y la resolución de ahora.

   **Los papeles se abren con enlace firmado y con vencimiento.** Eso lo
   resuelve quien abre el legajo, arriba; acá sólo se dibuja lo que vino: el
   enlace, «pendiente» cuando el papel no se cargó, o «sin enlace» cuando no se
   pudo firmar.

   **Otorgar el aval y rechazar son la misma operación con distinto resultado**,
   así que la pregunta, el apagado de los botones y el aviso de error viven en
   un solo lugar. Las dos decisiones caen sobre el trabajo de una persona y
   ninguna se deshace desde esta pantalla, así que antes se dice qué va a pasar
   y se puede cancelar; mientras la operación corre, los dos botones se apagan.

   **Y el motivo es obligatorio.** No se resuelve sin escribirlo, y la base lo
   exige otra vez por si alguien llama por afuera de esta pantalla.

   **El modal está siempre puesto y se muestra o se esconde**, igual que antes:
   de ahí sale que lo escrito en el motivo siga estando al volver a abrir otro
   legajo, que es como se comportaba la página suelta.
=================================================== */

import { useState } from 'react';
import { useFrases } from '../../frases/ProveedorDeFrases.jsx';
import { Texto } from '../../frases/lector.js';
import Verificaciones from './Verificaciones.jsx';
import Resoluciones from './Resoluciones.jsx';

/* Un papel del legajo. Viene resuelto de arriba en una de las tres formas que
   tenía: el enlace firmado, el papel que todavía no se cargó, y el papel que no
   se pudo firmar. */
function Documento({ documento }) {
  const { frase } = useFrases();
  if (!documento || !documento.url) {
    return (
      <span style={{ color: 'var(--texto-secundario)' }}>
        {frase(documento && documento.falta === 'sin_enlace'
          ? 'panel.documento_sin_enlace' : 'panel.documento_pendiente')}
      </span>
    );
  }
  return (
    <a href={documento.url} target="_blank" rel="noopener"
      style={{ color: 'var(--azul-medio-texto)', fontWeight: 700 }}>
      {frase(documento.rotulo)}
    </a>
  );
}

export default function ModalAuditoria({
  base, abierto, legajo, caregiverId, token, alCerrar, alResolver
}) {
  const { frase } = useFrases();

  const [nota, setNota] = useState('');
  const [resolviendo, setResolviendo] = useState(null);

  const rotulo = (clave) => frase(clave);

  /* Las dos resoluciones pasan claves del catálogo, no frases: así la pregunta,
     el aviso y el rótulo del botón existen en los tres idiomas como cualquier
     otro texto de la pantalla. */
  async function resolverAspirante({ estado, pregunta, aviso, cual }) {
    if (!caregiverId) return;

    const motivo = nota.trim();
    if (!motivo) {
      alert(Texto.frase('panel.resolucion_falta_motivo'));
      const campo = document.getElementById('nota-entrevista');
      if (campo) campo.focus();
      return;
    }

    if (!confirm(Texto.frase(pregunta))) return;

    setResolviendo(cual);

    try {
      /* El estado del legajo y el motivo se escriben juntos, en una sola
         transacción: si el motivo no entra, el legajo tampoco queda resuelto. */
      await base.ClienteDatos.resolverLegajo(caregiverId, estado, motivo);
    } catch (err) {
      console.error('Panel de la Prestadora, resolución del legajo:', err);
      alert(Texto.mensajeDeError(err, 'registrar la resolución del legajo'));
      return;
    } finally {
      setResolviendo(null);
    }

    alert(Texto.frase(aviso));
    alCerrar();
    alResolver();
  }

  const documentos = (legajo && legajo.documentos) || {};

  return (
    <div className="modal-legajo" style={{ display: abierto ? 'flex' : 'none' }}>
      <div className="modal-box">
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '16px', borderBottom: '1px solid var(--borde-card)',
          paddingBottom: '12px'
        }}>
          <h3 className="m-0 color-titulo">
            <i className="fas fa-id-card"></i>{' '}
            <span>{frase('panel.modal_titulo')}</span>
          </h3>
          <button onClick={alCerrar} className="sin-fondo sin-borde texto-20 mano"
            aria-label={frase('panel.modal_cerrar')}>&times;</button>
        </div>

        <div className="texto-13 interlineado-16 color-principal">
          {legajo && (
            <>
              <p><strong>{rotulo('panel.detalle_nombre')}</strong> {legajo.nombre}</p>
              <p>
                <strong>{rotulo('panel.detalle_dni')}</strong> {legajo.dni} |{' '}
                <strong>{rotulo('panel.detalle_email')}</strong> {legajo.email} |{' '}
                <strong>{rotulo('panel.detalle_telefono')}</strong> {legajo.telefono}
              </p>
              <p>
                <strong>{rotulo('panel.detalle_profesion')}</strong> {legajo.profesion}
                {' ('}{legajo.zona}{')'}
              </p>
              <p>
                <strong>{rotulo('panel.detalle_patologias')}</strong>{' '}
                {(legajo.patologias || []).join(', ')}
              </p>
              <p>
                <strong>{rotulo('panel.detalle_tareas')}</strong>{' '}
                {(legajo.tareas || []).join(', ')}
              </p>
              <div style={{
                background: 'var(--tono-info-fondo)', padding: '10px',
                borderRadius: '8px', marginTop: '10px'
              }}>
                <strong>{rotulo('panel.detalle_documentos')}</strong><br />
                {rotulo('panel.detalle_dni_archivo')} <Documento documento={documentos.dni} /> |{' '}
                {rotulo('panel.detalle_penales_archivo')} <Documento documento={documentos.penales} /> |{' '}
                {rotulo('panel.detalle_titulo_archivo')} <Documento documento={documentos.titulo} />
              </div>
            </>
          )}
        </div>

        {/* Los dos bloques son pedidos propios con cartel propio, así que el
            legajo se muestra apenas está y ellos llegan solos. */}
        {caregiverId && (
          <Verificaciones base={base} caregiverId={caregiverId} token={token} />
        )}
        {caregiverId && (
          <Resoluciones base={base} caregiverId={caregiverId} token={token} />
        )}

        <div style={{
          background: 'var(--superficie-hundida)', padding: '16px', borderRadius: '12px',
          margin: '16px 0', border: '1px solid var(--borde-card)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--texto-titulo)' }}>
            <i className="fas fa-user-check"></i>{' '}
            <span>{frase('panel.resolucion_titulo')}</span>
          </h4>
          <div className="mb-12">
            <label className="peso-700 texto-12" htmlFor="nota-entrevista">
              {frase('panel.resolucion_nota_etiqueta')}
            </label>
            <textarea id="nota-entrevista"
              className="ancho-total alto-60 p-8 texto-12 redondeo-6 borde-tarjeta mt-4"
              placeholder={frase('panel.resolucion_nota_hueco')}
              value={nota}
              onChange={(ev) => setNota(ev.target.value)}
            ></textarea>
          </div>
          <div className="flex gap-12">
            <button className="btn"
              style={{
                background: 'var(--verde-exito)', color: 'var(--texto-sobre-color)',
                fontWeight: 800, fontSize: '13px', flex: 1
              }}
              disabled={!!resolviendo}
              onClick={() => resolverAspirante({
                estado: 'validado_prestadora',
                pregunta: 'panel.aprobar_pregunta',
                aviso: 'panel.aprobar_aviso',
                cual: 'aprobar'
              })}
            >
              {resolviendo === 'aprobar' ? frase('panel.aprobar_mientras') : (
                <>
                  <i className="fas fa-check-circle"></i>{' '}
                  <span>{frase('panel.aprobar_boton')}</span>
                </>
              )}
            </button>
            <button className="btn fondo-peligro color-sobre-color peso-700 texto-13"
              disabled={!!resolviendo}
              onClick={() => resolverAspirante({
                estado: 'rechazado',
                pregunta: 'panel.rechazar_pregunta',
                aviso: 'panel.rechazar_aviso',
                cual: 'rechazar'
              })}
            >
              {resolviendo === 'rechazar'
                ? frase('panel.rechazar_mientras')
                : <span>{frase('panel.rechazar_boton')}</span>}
            </button>
          </div>
        </div>

        <p className="texto-11 color-secundario m-0">{frase('panel.nota_legal')}</p>
      </div>
    </div>
  );
}
