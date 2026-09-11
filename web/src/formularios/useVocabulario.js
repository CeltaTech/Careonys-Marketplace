/* ===================================================
   LAS OPCIONES DE UNA LISTA, TRAÍDAS DEL CATÁLOGO

   «Los catálogos salen de la base. Una lista de opciones nunca se escribe
   adentro de una pantalla.» Esto es esa regla, del lado de React.

   Devuelve los cuatro estados que toda carga de datos tiene que tener, y no
   tres: mientras el catálogo viaja el desplegable queda apagado, y si no llega
   lo dice en vez de quedarse vacío. Un desplegable vacío y uno que todavía no
   llegó se ven igual, y ésa es justamente la falla que esto viene a no tener.

   **Y las opciones salen de dos lados, no de uno.** Casi todas son vocabularios
   —motivos de consulta, zonas, modalidades—, pero el desplegable de cursos
   elige entre los cursos que la Prestadora ofrece, que es la oferta y no un
   vocabulario. Son dos listas distintas del mismo catálogo y se piden distinto,
   así que se pide una o la otra acá adentro y quien las use recibe lo mismo en
   los dos casos. Sin esto, la pantalla de cursos tendría que traerse la oferta
   por su cuenta y armar el desplegable a mano.
=================================================== */

import { useEffect, useState } from 'react';
import { Catalogo } from '../frases/lector.js';

export function useVocabulario(clave, { desdeLaOferta = false } = {}) {
  const [estado, setEstado] = useState('cargando');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let vigente = true;

    /* La oferta trae los nombres en los tres idiomas, así que además de la
       oferta hace falta el catálogo de frases para elegir cuál se muestra. */
    const traer = desdeLaOferta
      ? Promise.all([Catalogo.cargarOferta(), Catalogo.cargar()])
        .then(([oferta]) => (oferta && oferta[clave]) || [])
      : Catalogo.cargar().then(() => Catalogo.items(clave));

    traer
      .then((lista) => {
        if (!vigente) return;
        setItems(lista);
        setEstado('listo');
      })
      .catch(() => { if (vigente) setEstado('error'); });

    return () => { vigente = false; };
  }, [clave, desdeLaOferta]);

  return { estado, items, texto: (item) => Catalogo.texto(item) };
}
