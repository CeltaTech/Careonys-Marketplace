/* ===================================================
   EL REPORTE DEL SERVICIO

   Cuatro campos y un botón. Lo único obligatorio son las notas: sin texto no hay
   nada que registrar, y se dice antes de mandar nada.

   **El botón se apaga mientras la novedad viaja.** Dos clics eran dos renglones
   idénticos en los reportes, y ninguno de los dos se puede borrar desde la
   pantalla.

   El reporte se guarda contra el legajo y no contra la cuenta: la política de la
   base pide el legajo, y con el identificador de la cuenta lo rechazaba siempre.
=================================================== */

import { useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';

export default function FormularioDeReporte({ base }) {
  const { frase } = useFrases();
  const [presion, setPresion] = useState('');
  const [glucemia, setGlucemia] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!notas.trim()) { window.alert(frase('reporte.falta_texto')); return; }
    setGuardando(true);
    try {
      const caregiverId = await base.ClienteDatos.legajoPropio();
      if (!caregiverId) throw new Error(frase('fichado.sin_legajo'));
      await base.ClienteDatos.registrarReporte({ presion, glucemia, medicamentos, notas, caregiverId });
      window.alert(frase('reporte.guardado'));
      setPresion('');
      setGlucemia('');
      setMedicamentos('');
      setNotas('');
    } catch (err) {
      window.alert(Texto.mensajeDeError(err, 'registrar la novedad'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="novedades-form">
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--marca-prestadora)' }}>
        <i className="fas fa-notes-medical"></i> <span>{frase('reporte.titulo')}</span>
      </h4>
      <div className="form-group-pwa">
        <label>{frase('reporte.presion')}</label>
        <input
          type="text"
          id="bit-presion"
          placeholder={frase('reporte.presion_ejemplo')}
          value={presion}
          onChange={(evento) => setPresion(evento.target.value)}
        />
      </div>
      <div className="form-group-pwa">
        <label>{frase('reporte.glucemia')}</label>
        <input
          type="text"
          id="bit-glucemia"
          placeholder={frase('reporte.glucemia_ejemplo')}
          value={glucemia}
          onChange={(evento) => setGlucemia(evento.target.value)}
        />
      </div>
      <div className="form-group-pwa">
        <label>{frase('reporte.medicamentos')}</label>
        <input
          type="text"
          id="bit-medicamentos"
          placeholder={frase('reporte.medicamentos_ejemplo')}
          value={medicamentos}
          onChange={(evento) => setMedicamentos(evento.target.value)}
        />
      </div>
      <div className="form-group-pwa">
        <label>{frase('reporte.notas')}</label>
        <textarea
          id="bit-notas"
          className="alto-60"
          placeholder={frase('reporte.notas_ejemplo')}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
        ></textarea>
      </div>
      <button
        type="button"
        className="btn-login mt-8"
        id="btn-guardar-reporte"
        disabled={guardando || !base}
        onClick={guardar}
      >{guardando ? frase('reporte.guardando') : frase('reporte.guardar')}</button>
    </div>
  );
}
