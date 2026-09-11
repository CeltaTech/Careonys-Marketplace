/* ===================================================
   LAS OPCIONES DE UNA LISTA, TRAÍDAS DEL CATÁLOGO

   «Los catálogos salen de la base. Una lista de opciones nunca se escribe
   adentro de una pantalla.» Esto es esa regla, del lado de React.

   Devuelve los cuatro estados que toda carga de datos tiene que tener, y no
   tres: mientras el catálogo viaja el desplegable queda apagado, y si no llega
   lo dice en vez de quedarse vacío. Un desplegable vacío y uno que todavía no
   llegó se ven igual, y ésa es justamente la falla que esto viene a no tener.
=================================================== */

import { useEffect, useState } from 'react';
import { Catalogo } from '../frases/lector.js';

export function useVocabulario(clave) {
  const [estado, setEstado] = useState('cargando');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let vigente = true;
    Catalogo.cargar()
      .then(() => {
        if (!vigente) return;
        setItems(Catalogo.items(clave));
        setEstado('listo');
      })
      .catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; };
  }, [clave]);

  return { estado, items, texto: (item) => Catalogo.texto(item) };
}
