/* ===================================================
   PASO 5 — LA REFERENCIA, LOS PERMISOS Y EL ENVÍO

   La ficha de referencia, el aviso de cómo sigue la incorporación, qué se
   muestra de la persona y a quién, la aceptación de los términos y el botón que
   manda todo.

   **Los permisos del cierre no son decorado.** Sin esa fila la persona no
   aparece nunca en el directorio, así que el paso no se puede saltear; el
   texto, el orden y el valor inicial de cada casilla salen de su declaración y
   los dibuja el mismo módulo que usa el portal. Mientras eso viaja, el título
   dice que está cargando: antes el paso se veía en blanco, igual que si no
   tuviera nada que confirmar.

   **El enlace al documento va aparte de la frase**, porque el texto se escribe
   como texto y no como marcado, y sube un nivel porque los documentos cuelgan
   de la raíz del sitio.

   **Y el caso de que el servidor pida confirmar el correo tiene su propio
   recuadro.** Ahí la cuenta ya quedó creada y el formulario sigue lleno: no se
   perdió nada, falta tocar un enlace y volver.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

export default function PasoCinco({
  activo, irA, cierre, enviando, espera, avisoConfirmacion,
  confirmando, reenviando, alYaConfirme, alReenviar, guardando, exito
}) {
  const { frase } = useFrases();

  return (
    <div className={activo ? 'wpane active' : 'wpane'} id="wp5">
      <h3><i className="fas fa-user-check"></i> <span>{frase('legajo.paso5_titulo')}</span></h3>

      <div id="ficha-referencia"></div>

      <div className="winfo-box">
        <strong><i className="fas fa-info-circle"></i> <span>{frase('legajo.incorporacion_titulo')}</span></strong><br />
        <span>{frase('legajo.incorporacion_texto')}</span>
      </div>

      <h4 id="cierre-titulo" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--texto-principal)', margin: '16px 0 4px' }}>
        {cierre.titulo}
      </h4>
      <p id="cierre-bajada" style={{ fontSize: '10px', color: 'var(--texto-secundario)', margin: '0 0 8px' }}>
        {cierre.bajada}
      </p>
      <p id="cierre-recordatorio" style={{ fontSize: '10px', color: 'var(--tono-exito-texto)', background: 'var(--tono-exito-fondo)', borderRadius: '8px', padding: '8px', margin: '0 0 8px' }}>
        {cierre.recordatorio}
      </p>
      <div id="autorizaciones-container"></div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '12px 0', fontSize: '12px', color: 'var(--texto-principal)' }}>
        <input type="checkbox" id="w-terminos" required style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0 }} />
        <label htmlFor="w-terminos" className="mano">
          <span>{frase('legajo.terminos')}</span>{' '}
          <a
            href="../docs/terminos_y_condiciones_asistentes.md"
            target="_blank"
            rel="noopener"
            className="color-azul-medio peso-700"
            style={{ textDecoration: 'underline' }}
          >{frase('legajo.terminos_leer')}</a>
        </label>
      </div>

      <div className="wnav">
        <button type="button" className="wbtn-prev" onClick={() => irA(4)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <button type="submit" className="wbtn-submit" disabled={enviando}>
          {enviando ? frase('asistente.creando_cuenta') : (
            <>
              <i className="fas fa-check-circle"></i>{' '}
              <span id="cierre-boton">{cierre.boton}</span>
            </>
          )}
        </button>
      </div>

      <div className="wespera-correo" id="w-espera-correo" style={{ display: espera ? 'block' : 'none' }}>
        <strong>{frase('legajo.espera_titulo')}</strong>
        <p><strong id="w-espera-correo-mail">{espera ? espera.correo : ''}</strong></p>
        <p>{frase('legajo.espera_texto')}</p>
        <ol>
          <li>{frase('legajo.espera_paso1')}</li>
          <li>{frase('legajo.espera_paso2')}</li>
        </ol>
        <div className="wespera-correo-botones">
          <button type="button" className="wbtn-next" id="w-ya-confirme" disabled={confirmando} onClick={alYaConfirme}>
            {confirmando ? frase('asistente.guardando_legajo') : frase('legajo.ya_confirme')}
          </button>
          <button type="button" className="wbtn-prev" id="w-reenviar-confirmacion" disabled={reenviando} onClick={alReenviar}>
            {reenviando ? frase('asistente.reenviando_correo') : frase('legajo.reenviar')}
          </button>
        </div>
        <p
          className="wespera-correo-aviso"
          id="w-espera-correo-aviso"
          style={{
            display: avisoConfirmacion.texto ? 'block' : 'none',
            color: avisoConfirmacion.esFalla ? 'var(--rojo-peligro-texto)' : 'var(--verde-exito-texto)'
          }}
        >{avisoConfirmacion.texto}</p>
      </div>

      <p
        className="wguardando"
        id="w-guardando"
        style={{ display: guardando.texto ? 'block' : 'none', color: guardando.color }}
      >{guardando.texto}</p>

      <div className="wsuccess-msg" id="w-success" style={{ display: exito ? 'block' : 'none' }}>
        {frase('legajo.enviado')}
      </div>
    </div>
  );
}
