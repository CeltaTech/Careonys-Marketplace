/* ===================================================
   EL TOPE DE HORAS DE LA ALARMA DE JORNADA ABIERTA

   Lo único de las alarmas que toca la Prestadora. La alarma la ven la Familia y
   el Asistente, que son quienes cerraron el trato; acá sólo se fija a partir de
   cuántas horas sin marcar la salida se avisa, porque eso es configuración de
   su espacio. Por eso este bloque no lista nada, sólo fija un número.

   **Ni un rótulo escrito acá adentro**: salen del catálogo, que es lo que los
   hace existir también en `en` y en `pt-BR`. Las marcas de identidad —el
   producto en la bajada— las resuelve el catálogo solo.

   **Los cuatro estados**: cargando con el cartel y el botón apagado, error en
   el mismo cartel, y la rama de «todavía no tiene ninguno» dicha aparte. Que no
   haya fila **no es dieciséis**: es que nadie lo configuró, y mientras tanto no
   se avisa ninguna jornada abierta. Contarlo como el valor de fábrica sería
   mostrar un tope que no está funcionando.

   El bloque entero se dibuja detrás de la comprobación del permiso, igual que
   allá arrancaba oculto y lo destapaba la carga: sin eso, quien no es
   coordinador veía el bloque vacío y un botón que no hace nada.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import Cartel from './Cartel.jsx';

/* Lo mismo que exige la tabla, dicho antes y en el idioma de la pantalla. La
   comprobación que manda es la de la base; ésta le evita a la persona un viaje
   para que le contesten con el nombre de una restricción. */
const MINIMO = 1;
const MAXIMO = 168;

export default function TopeDeAlarma({ base }) {
  const { frase } = useFrases();

  /* La fila de esta Prestadora en `alarmas_prestadora`. Vale `null` mientras no
     se trajo, y también cuando la Prestadora no tiene la suya: sin fila no hay
     nada que corregir, y guardar no llama a la base. */
  const [filaId, setFilaId] = useState(null);
  const [horas, setHoras] = useState('');
  const [campoApagado, setCampoApagado] = useState(false);
  const [botonApagado, setBotonApagado] = useState(true);
  const [cartel, setCartel] = useState({ tono: 'info', clave: 'alarmas.tope_cargando' });

  useEffect(() => {
    let vigente = true;

    (async () => {
      let fila;
      try {
        fila = await base.ClienteDatos.topeDeAlarmas();
      } catch (err) {
        console.error('Panel de la Prestadora, tope de la alarma:', err);
        if (!vigente) return;
        setBotonApagado(false);
        setCartel({ tono: 'critico', clave: 'alarmas.tope_error' });
        return;
      }
      if (!vigente) return;
      setBotonApagado(false);

      if (!fila) {
        setFilaId(null);
        setHoras('');
        setCampoApagado(true);
        setBotonApagado(true);
        setCartel({ tono: 'atencion', clave: 'alarmas.tope_vacio' });
        return;
      }

      setFilaId(fila.id);
      setHoras(String(fila.horas_jornada_abierta));
      setCampoApagado(false);
      setCartel(null);
    })();

    return () => { vigente = false; };
  }, [base]);

  /* «Todo botón que dispara una operación se apaga»: dos clics seguidos eran
     dos escrituras sobre la misma fila. */
  async function guardarTope() {
    if (!filaId) return;

    const cuantas = Number(horas);
    if (!Number.isInteger(cuantas) || cuantas < MINIMO || cuantas > MAXIMO) {
      setCartel({ tono: 'atencion', clave: 'alarmas.tope_fuera_de_rango' });
      return;
    }

    setBotonApagado(true);
    setCartel({ tono: 'info', clave: 'alarmas.tope_cargando' });

    let fila;
    try {
      fila = await base.ClienteDatos.guardarTopeDeAlarmas(filaId, cuantas);
    } catch (err) {
      console.error('Panel de la Prestadora, guardado del tope de la alarma:', err);
      setCartel({ tono: 'critico', clave: 'alarmas.tope_error' });
      return;
    } finally {
      setBotonApagado(false);
    }

    /* La base contestó sin devolver la fila: el cambio no quedó escrito, y decir
       «guardado» sería mentir. Es la misma falla que el error de arriba y se
       dice igual. */
    if (!fila) {
      setCartel({ tono: 'critico', clave: 'alarmas.tope_error' });
      return;
    }

    // El número que se muestra es el que quedó guardado, no el que se escribió.
    setHoras(String(fila.horas_jornada_abierta));
    setCartel({
      tono: 'exito',
      clave: 'alarmas.tope_guardado',
      huecos: { horas: fila.horas_jornada_abierta }
    });
  }

  return (
    <div className="card-dashboard mt-24">
      <div className="mb-16">
        <h3 className="m-0 texto-18 color-titulo">
          <i className="fas fa-hourglass-half"></i>{' '}
          <span>{frase('alarmas.tope_titulo')}</span>
        </h3>
        <p className="m-solo-arriba-4 texto-13 color-secundario">
          {frase('alarmas.tope_bajada')}
        </p>
      </div>

      <Cartel tono={cartel && cartel.tono} clave={cartel && cartel.clave}
        huecos={cartel && cartel.huecos} />

      <div className="form-group">
        <label htmlFor="tope-horas">{frase('alarmas.tope_campo')}</label>
        <input type="number" id="tope-horas" className="ancho-160"
          min={MINIMO} max={MAXIMO} step="1"
          value={horas}
          disabled={campoApagado}
          onChange={(ev) => setHoras(ev.target.value)}
        />
        <p className="texto-11 color-secundario m-solo-arriba-4">
          {frase('alarmas.tope_ayuda')}
        </p>
      </div>

      <button className="btn peso-700 texto-13" disabled={botonApagado} onClick={guardarTope}>
        <i className="fas fa-floppy-disk"></i> <span>{frase('alarmas.tope_guardar')}</span>
      </button>
    </div>
  );
}
