/* ===================================================
   LAS LISTAS DE OPCIONES, TRAÍDAS DEL CATÁLOGO

   «Los catálogos salen de la base. Una lista de opciones nunca se escribe
   adentro de una pantalla.» En la página suelta esto lo hacía `js/catalogo.js`
   recorriendo el documento y llenando todo lo que llevara `data-catalogo`. Acá
   la pantalla la dibuja el programa, así que el mismo catálogo se pide por el
   gancho de siempre y lo que sale se dibuja igual que lo dibujaba aquél: la
   misma opción vacía adelante, los mismos grupos por región, la misma clase en
   cada casilla, el mismo nombre de campo y las mismas casillas tildadas de
   entrada.

   **Los cuatro estados, y no tres.** Mientras el catálogo viaja el desplegable
   queda apagado y dice que está cargando; si no llega lo dice; si llega vacío
   lo dice. Un desplegable vacío y uno que todavía no llegó se ven igual, y ésa
   es justamente la falla que esto viene a no tener.

   **Qué dice la opción vacía se pregunta.** En esta pantalla no es siempre la
   misma: el Tipo de Asistente dice «elegir el tipo» y los otros dos dicen
   «seleccionar», que es lo que la página declaraba campo por campo.
=================================================== */

import { useEffect, useRef } from 'react';
import { useVocabulario } from '#comun/formularios/useVocabulario.js';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/* El aviso que ocupa el lugar de la lista cuando no hay lista: adentro de un
   desplegable va como opción apagada, porque el navegador no dibuja más que
   sus opciones. Es lo mismo que hacía `_avisar`. */
function claveDelAviso(estado, cuantos) {
  if (estado === 'cargando') return 'catalogo.cargando';
  if (estado === 'error') return 'catalogo.error';
  if (!cuantos) return 'catalogo.vacio';
  return null;
}

/* Un desplegable. Si los ítems traen `region` se agrupan: los de región vacía
   son los encabezados y los demás cuelgan del suyo. Ninguno de los tres
   vocabularios de esta pantalla los trae hoy, y la rama queda porque el día que
   una Prestadora los cargue el desplegable tiene que agruparlos igual que
   agrupaba antes. */
export function SelectDelCatalogo({ id, clave, required, vacio = 'comun.seleccionar', onChange }) {
  const { frase } = useFrases();
  const { estado, items, texto } = useVocabulario(clave);
  const campo = useRef(null);
  const elegido = useRef('');
  const aviso = claveDelAviso(estado, items.length);

  /* Lo elegido se repone cuando cambian las opciones: el desplegable se llena
     cuando el vocabulario llega, y cambiarle las opciones a un desplegable le
     borra lo elegido. Lo que la persona ya había marcado no se pierde por eso. */
  useEffect(() => {
    if (!campo.current || !elegido.current) return;
    if (campo.current.value !== elegido.current) campo.current.value = elegido.current;
  });

  /* Y se olvida cuando el formulario se vacía. `form.reset()` es del navegador
     y no avisa a nadie; sin esto, el primer dibujo posterior repondría lo que
     el vaciado acababa de sacar. */
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
      <select ref={campo} id={id} required={required} disabled={estado === 'cargando'} onChange={alElegir}>
        <option value="" disabled>{frase(aviso)}</option>
      </select>
    );
  }

  const agrupado = items.some((i) => 'region' in i);
  const sinRegion = items.filter((i) => !i.region);

  return (
    <select ref={campo} id={id} required={required} defaultValue="" onChange={alElegir}>
      <option value="">{frase(vacio)}</option>
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

/* Un grupo de casillas, para los vocabularios donde se elige más de una cosa
   —patologías, tareas, certificaciones, modalidades, retiro—. El nombre del
   campo, la clase de cada casilla y cuáles vienen tildadas de entrada son los
   mismos tres ajustes que la página declaraba en el atributo.

   Lo tildado de entrada se pone como propiedad y no como atributo, igual que lo
   ponía `_llenarGrupo`: así `form.reset()` las deja destildadas, que es lo que
   la pantalla hace hoy. */
export function CasillasDelCatalogo({ clave, nombre, clase, marcados = [], className, style }) {
  const { frase } = useFrases();
  const { estado, items, texto } = useVocabulario(clave);
  const contenedor = useRef(null);
  const yaSeMarcaron = useRef(false);
  const aviso = claveDelAviso(estado, items.length);

  /* Se tilda una sola vez, cuando la lista llega, y nunca más: es lo que hacía
     el catálogo al llenar el grupo. Volver a tildarlas en cada dibujo le
     desharía a la persona el destilde que acaba de hacer. */
  useEffect(() => {
    if (aviso || yaSeMarcaron.current || !contenedor.current || !marcados.length) return;
    yaSeMarcaron.current = true;
    marcados.forEach((cual) => {
      const casilla = contenedor.current.querySelector('input[value="' + cual + '"]');
      if (casilla) casilla.checked = true;
    });
  }, [aviso, marcados]);

  if (aviso) {
    return <div ref={contenedor} className={className} style={style}>{frase(aviso)}</div>;
  }

  return (
    <div ref={contenedor} className={className} style={style}>
      {items.map((i) => (
        <label key={i.clave} className={clase || undefined}>
          <input type="checkbox" name={nombre || clave} value={i.clave} />
          {' ' + texto(i)}
        </label>
      ))}
    </div>
  );
}
