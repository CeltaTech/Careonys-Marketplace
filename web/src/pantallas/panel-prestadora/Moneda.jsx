/* ===================================================
   CON QUÉ MONEDA TRABAJA ESTA PRESTADORA

   «Todo importe se guarda con su moneda», y hasta la migración 0074 el único
   importe del esquema —el valor por hora de un legajo— era un número suelto.
   Ahora la moneda la elige cada Prestadora, y es acá.

   Lo que se guarda es con qué nacen los importes de ahí en adelante: al
   escribir un valor por hora, la base le copia esta moneda al legajo y no
   vuelve a mirar esta pantalla nunca más. Por eso cambiarla no le mueve el
   precio a nadie, y por eso el mismo importe se muestra siempre con la moneda
   con la que se escribió.

   **La lista sale del vocabulario `moneda`, no de acá adentro**: es la misma
   regla que rige toda lista de opciones. Y los rótulos salen del catálogo de
   frases, que es lo que hace que el bloque exista también en `en` y en `pt-BR`.

   **Los cuatro estados**: cargando con el cartel y el botón apagado, error en
   el mismo cartel, la rama de «no se supo de quién es este panel» dicha aparte,
   y listo con la moneda que la base tiene guardada. El desplegable tiene los
   suyos propios, por lo mismo: uno vacío y uno que todavía no llegó se ven
   igual.

   **Y una moneda guardada que el vocabulario ya no tiene deja el desplegable en
   blanco**, tal como quedaba antes: así no se muestra elegida una moneda que no
   está en la lista, y guardar sin tocar nada pide que se elija una.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { useVocabulario } from '#comun/formularios/useVocabulario.js';
import { Catalogo } from '#comun/frases/lector.js';
import Cartel from './Cartel.jsx';

export default function Moneda({ base }) {
  const { frase } = useFrases();
  const monedas = useVocabulario('moneda');

  /* La fila de esta Prestadora en `tenants`. Vale `null` mientras no se trajo, y
     también cuando no se pudo resolver de quién es el panel: sin fila no hay
     nada que corregir, y guardar no llama a la base. */
  const [filaId, setFilaId] = useState(null);
  const [sinFila, setSinFila] = useState(false);

  /* Lo elegido. `null` es «nadie la asignó todavía», que no es lo mismo que la
     cadena vacía: sin asignación queda elegida la primera de la lista, que es
     lo que hace el navegador solo. */
  const [valor, setValor] = useState(null);
  const [botonApagado, setBotonApagado] = useState(true);
  const [cartel, setCartel] = useState({ tono: 'info', clave: 'panel.moneda_cargando' });

  useEffect(() => {
    let vigente = true;

    (async () => {
      let fila;
      try {
        fila = await base.ClienteDatos.monedaDeLaPrestadora();
      } catch (err) {
        console.error('Panel de la Prestadora, moneda:', err);
        if (!vigente) return;
        setBotonApagado(false);
        setCartel({ tono: 'critico', clave: 'panel.moneda_error' });
        return;
      }
      if (!vigente) return;
      setBotonApagado(false);

      if (!fila) {
        setFilaId(null);
        setSinFila(true);
        setBotonApagado(true);
        setCartel({ tono: 'atencion', clave: 'panel.moneda_vacio' });
        return;
      }

      setFilaId(fila.id);
      setSinFila(false);
      if (fila.moneda) setValor(fila.moneda);
      setCartel(null);
    })();

    return () => { vigente = false; };
  }, [base]);

  const hayOpciones = monedas.estado === 'listo' && monedas.items.length > 0;
  /* Qué queda elegido, con las mismas tres reglas de antes: sin lista no hay
     nada elegido; sin asignación, la primera; y lo asignado sólo si la lista lo
     tiene. */
  const elegida = !hayOpciones
    ? ''
    : valor === null
      ? monedas.items[0].clave
      : (monedas.items.some((m) => m.clave === valor) ? valor : '');

  /* «Todo botón que dispara una operación se apaga»: dos clics seguidos eran
     dos escrituras sobre la misma fila. */
  async function guardarMoneda() {
    if (!filaId) return;

    /* Lo único que se puede validar acá es que haya algo elegido: las opciones
       son las del vocabulario, y qué códigos valen lo dice la base con la
       comprobación que le puso la 0074 a la columna. */
    if (!elegida) {
      setCartel({ tono: 'atencion', clave: 'panel.moneda_sin_elegir' });
      return;
    }

    setBotonApagado(true);
    setCartel({ tono: 'info', clave: 'panel.moneda_cargando' });

    let fila;
    try {
      fila = await base.ClienteDatos.guardarMonedaDeLaPrestadora(filaId, elegida);
    } catch (err) {
      console.error('Panel de la Prestadora, guardado de la moneda:', err);
      setCartel({ tono: 'critico', clave: 'panel.moneda_error' });
      return;
    } finally {
      setBotonApagado(false);
    }

    /* La base contestó sin devolver la fila: el cambio no quedó escrito, y decir
       «guardado» sería mentir. */
    if (!fila) {
      setCartel({ tono: 'critico', clave: 'panel.moneda_error' });
      return;
    }

    /* La que se muestra es la que quedó guardada, no la que se eligió. Y se
       nombra como la nombra el vocabulario —«Peso argentino», no «ARS»—, salvo
       que el vocabulario no la tenga. */
    setValor(fila.moneda);
    const nombre = Catalogo.etiquetaSiExiste('moneda', fila.moneda) || fila.moneda;
    setCartel({ tono: 'exito', clave: 'panel.moneda_guardado', huecos: { moneda: nombre } });
  }

  return (
    <div className="card-dashboard mt-24">
      <div className="mb-16">
        <h3 className="m-0 texto-18 color-titulo">
          <i className="fas fa-coins"></i>{' '}
          <span>{frase('panel.moneda_titulo')}</span>
        </h3>
        <p className="m-solo-arriba-4 texto-13 color-secundario">
          {frase('panel.moneda_bajada')}
        </p>
      </div>

      <Cartel tono={cartel && cartel.tono} clave={cartel && cartel.clave}
        huecos={cartel && cartel.huecos} />

      <div className="form-group">
        <label htmlFor="moneda-elegida">{frase('panel.moneda_campo')}</label>
        <select id="moneda-elegida" className="ancho-160"
          value={elegida}
          disabled={monedas.estado === 'cargando' || sinFila}
          onChange={(ev) => setValor(ev.target.value)}
        >
          {/* Mientras la lista viaja, o cuando no llegó, el desplegable dice qué
              pasa en vez de quedarse en blanco: un desplegable vacío y uno que
              todavía no llegó se ven igual. */}
          {!hayOpciones && (
            <option value="" disabled>
              {frase(monedas.estado === 'cargando' ? 'catalogo.cargando'
                : monedas.estado === 'error' ? 'catalogo.error' : 'catalogo.vacio')}
            </option>
          )}
          {hayOpciones && monedas.items.map((moneda) => (
            <option key={moneda.clave} value={moneda.clave}>{monedas.texto(moneda)}</option>
          ))}
        </select>
        <p className="texto-11 color-secundario m-solo-arriba-4">
          {frase('panel.moneda_ayuda')}
        </p>
      </div>

      <button className="btn peso-700 texto-13" disabled={botonApagado} onClick={guardarMoneda}>
        <i className="fas fa-floppy-disk"></i> <span>{frase('panel.moneda_guardar')}</span>
      </button>
    </div>
  );
}
