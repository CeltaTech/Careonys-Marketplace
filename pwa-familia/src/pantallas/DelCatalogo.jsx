/* ===================================================
   LAS LISTAS DE OPCIONES DEL AVISO, TRAÍDAS DEL CATÁLOGO

   «Los catálogos salen de la base. Una lista de opciones nunca se escribe
   adentro de una pantalla.» En la página suelta eso lo hacía `js/catalogo.js`,
   que recorría el documento y llenaba todo lo que llevara `data-catalogo`. Acá
   la pantalla la dibuja el programa y ese recorrido ya no alcanza —los nodos
   nacen y mueren cuando React quiere—, así que el mismo catálogo se pide por el
   gancho de siempre y lo que sale se dibuja igual que lo dibujaba aquél: la
   misma opción vacía adelante, la misma clase en cada casilla y el mismo nombre
   de campo, que es el que después lee el formulario al publicar.

   **Los cuatro estados, y no tres.** Mientras el catálogo viaja el desplegable
   queda apagado y dice que está cargando; si no llega lo dice; si llega vacío
   lo dice. Un desplegable vacío y uno que todavía no llegó se ven igual, y ésa
   es justamente la falla que esto viene a no tener.
=================================================== */

import { useEffect, useRef } from 'react';
import { useVocabulario } from '#comun/formularios/useVocabulario.js';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/* El aviso que ocupa el lugar de la lista cuando no hay lista: adentro de un
   desplegable va como opción apagada, porque el navegador no dibuja más que sus
   opciones. Es lo mismo que hacía `_avisar` en el catálogo de la página. */
function claveDelAviso(estado, cuantos) {
  if (estado === 'cargando') return 'catalogo.cargando';
  if (estado === 'error') return 'catalogo.error';
  if (!cuantos) return 'catalogo.vacio';
  return null;
}

/* Un desplegable. Si los ítems traen `region` se agrupan: los de región vacía
   son los encabezados y los demás cuelgan del suyo. Las zonas no las traen hoy,
   y la rama queda porque el día que una Prestadora las cargue el desplegable
   tiene que agruparlas igual que las agrupaba antes. */
export function SelectDelCatalogo({ id, clave, required, className, onChange }) {
  const { frase } = useFrases();
  const { estado, items, texto } = useVocabulario(clave);
  const campo = useRef(null);
  const elegido = useRef('');
  const aviso = claveDelAviso(estado, items.length);

  /* Lo elegido se repone cuando cambian las opciones: cambiarle las opciones a
     un desplegable le borra lo elegido, y lo que la persona ya había marcado no
     se pierde por eso. */
  useEffect(() => {
    if (!campo.current || !elegido.current) return;
    if (campo.current.value !== elegido.current) campo.current.value = elegido.current;
  });

  /* Y se olvida cuando el formulario se vacía. `form.reset()` es del navegador y
     no avisa a nadie; sin esto, el primer dibujo posterior repondría lo que el
     vaciado acaba de sacar. Al aviso publicado le pasaría justo eso. */
  useEffect(() => {
    const formulario = campo.current && campo.current.form;
    if (!formulario) return undefined;
    const olvidar = () => { elegido.current = ''; };
    formulario.addEventListener('reset', olvidar);
    return () => formulario.removeEventListener('reset', olvidar);
  }, [aviso]);

  const alElegir = (evento) => {
    elegido.current = evento.target.value;
    if (onChange) onChange(evento);
  };

  if (aviso) {
    return (
      <select ref={campo} id={id} className={className} required={required}
        disabled={estado === 'cargando'} onChange={alElegir}>
        <option value="" disabled>{frase(aviso)}</option>
      </select>
    );
  }

  const agrupado = items.some((i) => 'region' in i);
  const sinRegion = items.filter((i) => !i.region);

  return (
    <select ref={campo} id={id} className={className} required={required}
      defaultValue="" onChange={alElegir}>
      <option value="">{frase('comun.seleccionar')}</option>
      {!agrupado && items.map((i) => (
        <option key={i.clave} value={i.clave}>{texto(i)}</option>
      ))}
      {agrupado && sinRegion.map((encabezado) => (
        <optgroup key={encabezado.clave} label={texto(encabezado)}>
          {/* La región también se puede elegir entera, no sólo sus barrios. */}
          <option value={encabezado.clave}>{texto(encabezado)}</option>
          {items.filter((i) => i.region === encabezado.clave).map((i) => (
            <option key={i.clave} value={i.clave}>{texto(i)}</option>
          ))}
        </optgroup>
      ))}
      {agrupado && items
        .filter((i) => i.region && !sinRegion.some((e) => e.clave === i.region))
        .map((i) => <option key={i.clave} value={i.clave}>{texto(i)}</option>)}
    </select>
  );
}

/* Un grupo de casillas, para los vocabularios donde se elige más de una cosa.
   Acá es uno solo: las patologías del Paciente. El nombre del campo y la clase
   de cada casilla son los mismos dos ajustes que la página declaraba en el
   atributo, y el nombre importa porque al publicar el formulario junta lo
   marcado buscando por ese nombre. */
export function CasillasDelCatalogo({ clave, nombre, clase, className }) {
  const { frase } = useFrases();
  const { estado, items, texto } = useVocabulario(clave);
  const aviso = claveDelAviso(estado, items.length);

  if (aviso) return <div className={className}>{frase(aviso)}</div>;

  return (
    <div className={className}>
      {items.map((i) => (
        <label key={i.clave} className={clase || undefined}>
          <input type="checkbox" name={nombre || clave} value={i.clave} />
          {' ' + texto(i)}
        </label>
      ))}
    </div>
  );
}
