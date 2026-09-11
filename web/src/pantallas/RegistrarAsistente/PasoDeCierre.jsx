/* ===================================================
   EL PASO 7: LO QUE LA PERSONA AUTORIZA A PUBLICAR, Y EL ENVÍO

   El título, la bajada, el recordatorio, el rótulo del botón y las
   autorizaciones salen de data/catalogo-autorizaciones.json: acá no hay ni una
   de esas frases escrita. Los cuarenta renglones que esto ocupaba en la página
   son `js/autorizaciones.js`, porque la pantalla del teléfono necesita el mismo
   paso.

   Debajo del botón viven las dos cajas que cuentan cómo va el cierre: los cuatro
   estados del guardado, y el panel de «falta confirmar el correo», que aparece
   cuando el servidor creó la cuenta y todavía no dio sesión. Lo cargado no se
   toca: sigue en pantalla, paso por paso.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import CajaDeEstado from './CajaDeEstado.jsx';
import { Pane, Navegadores } from './Navegadores.jsx';

export default function PasoDeCierre({
  paso, irAlPaso, textosCierre, altaEstado, enviando, esperandoCorreo, correoDelAlta,
  avisoConfirmar, confirmando, reenviando, exito, yaConfirme, reenviar
}) {
  const { frase } = useFrases();

  return (
    <Pane numero={7} paso={paso}>
      <h3 id="cierre-titulo" className="texto-18 peso-700 mb-8 color-titulo">
        <i className="fas fa-circle-check"></i>{textosCierre.titulo ? ' ' + textosCierre.titulo : ''}
      </h3>
      <p id="cierre-bajada" style={{ fontSize: '13.5px', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
        {textosCierre.bajada}
      </p>
      <p id="cierre-recordatorio" style={{
        fontSize: '12.5px', color: 'var(--tono-exito-texto)', background: 'var(--tono-exito-fondo)',
        borderRadius: '8px', padding: '10px', marginBottom: '20px'
      }}>
        {textosCierre.recordatorio}
      </p>

      <div id="autorizaciones-container"></div>

      <div style={{
        margin: '20px 0', fontSize: '12.5px', color: 'var(--texto-principal)',
        display: 'flex', alignItems: 'flex-start', gap: '8px'
      }}>
        <input type="checkbox" id="acepto-terminos" required
          style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }} />
        <label htmlFor="acepto-terminos" style={{ cursor: 'pointer', lineHeight: 1.4 }}>
          <span>{frase('alta.terminos_leido')}</span>{' '}
          <a href="/docs/terminos_y_condiciones_asistentes.md" target="_blank" rel="noopener"
            style={{ color: 'var(--azul-medio-texto)', fontWeight: 700, textDecoration: 'underline' }}>
            {frase('alta.terminos_enlace')}
          </a>{' '}
          <span>{frase('alta.terminos_aclaracion')}</span>
        </label>
      </div>

      <Navegadores anterior={6} irAlPaso={irAlPaso}>
        <button
          type="submit"
          className={esperandoCorreo ? 'btn btn-secundario oculto' : 'btn btn-secundario'}
          id="btn-submit-cuidador"
          style={{ padding: '12px 32px' }}
          disabled={enviando}
        >
          <i className="fas fa-check-circle"></i>{' '}
          <span id="cierre-boton">{enviando ? frase('alta.enviando') : textosCierre.boton}</span>
        </button>
      </Navegadores>

      {/* LOS CUATRO ESTADOS DEL GUARDADO. Cerrar el alta son cinco escrituras
          seguidas —la Prestadora, los archivos, la ficha, el legajo— y ninguna
          es instantánea: sin esto el botón se apagaba y la pantalla se quedaba
          igual. */}
      <CajaDeEstado
        id="alta-estado"
        cual={altaEstado.cual}
        clave={altaEstado.clave}
        huecos={altaEstado.huecos}
        estilo={{ marginTop: '16px' }}
      />

      {/* Falta confirmar el correo. La cuenta ya quedó creada y el legajo sigue
          cargado en pantalla: no se perdió nada, sólo falta el clic del enlace
          que llegó al mail. */}
      <div
        id="cierre-confirmar"
        className={esperandoCorreo ? undefined : 'oculto'}
        style={{
          marginTop: '16px', background: 'var(--tono-atencion-fondo)',
          border: '1px solid var(--tono-atencion-borde)', borderRadius: '12px',
          padding: '16px', fontSize: '13px', color: 'var(--texto-principal)'
        }}
      >
        <p className="peso-700 mb-8">{frase('legajo.espera_titulo')}</p>
        <p className="peso-700 mb-8"><strong id="cierre-correo">{correoDelAlta}</strong></p>
        <p className="mb-10">{frase('legajo.espera_texto')}</p>
        <ol style={{ margin: '0 0 12px 18px', lineHeight: 1.6 }}>
          <li>{frase('legajo.espera_paso1')}</li>
          <li>{frase('legajo.espera_paso2')}</li>
        </ol>
        <div className="flex gap-10 envolver">
          <button type="button" className="btn btn-secundario" id="btn-ya-confirme"
            style={{ padding: '10px 20px' }} disabled={confirmando} onClick={yaConfirme}>
            <i className="fas fa-check"></i>{' '}
            <span id="ya-confirme-texto">
              {confirmando ? frase('alta.guardando') : frase('legajo.ya_confirme')}
            </span>
          </button>
          <button type="button" className="btn btn-sobre-oscuro" id="btn-reenviar-confirmacion"
            style={{ padding: '10px 20px', borderColor: 'var(--borde-card)', color: 'var(--texto-secundario)' }}
            disabled={reenviando} onClick={reenviar}>
            {reenviando ? frase('alta.mandando') : frase('legajo.reenviar')}
          </button>
        </div>
        {/* Verde cuando la noticia es buena, rojo cuando algo salió mal; sin
            texto, desaparece. */}
        <p
          id="cierre-confirmar-aviso"
          className="oculto mt-12 p-10 redondeo-8 texto-12-5"
          style={{
            display: avisoConfirmar ? 'block' : 'none',
            color: avisoConfirmar && avisoConfirmar.esError
              ? 'var(--tono-critico-texto)' : 'var(--tono-exito-texto)',
            background: avisoConfirmar && avisoConfirmar.esError
              ? 'var(--tono-critico-fondo)' : 'var(--tono-exito-fondo)'
          }}
        >
          {avisoConfirmar ? avisoConfirmar.mensaje : ''}
        </p>
      </div>

      <div
        id="form-success"
        className="form-success oculto"
        style={{
          display: exito ? 'block' : 'none',
          marginTop: '16px', background: 'var(--tono-exito-fondo)',
          color: 'var(--verde-exito-texto)', padding: '16px', borderRadius: '12px',
          fontWeight: 700, textAlign: 'center', fontSize: '14px',
          border: '1px solid var(--tono-exito-borde)'
        }}
      >
        <span>{frase('alta.enviado')}</span>
      </div>
    </Pane>
  );
}
