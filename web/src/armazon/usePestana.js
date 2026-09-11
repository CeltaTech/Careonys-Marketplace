/* ===================================================
   EL NOMBRE DE LA PESTAÑA, Y SI LA PANTALLA VA A LOS BUSCADORES

   Antes cada pantalla lo traía escrito arriba de todo, porque cada pantalla era
   un archivo. Ahora son vistas de un mismo programa: el nombre es de la vista y
   no del sitio, así que se pone al entrar y se saca al salir. Igual con el
   pedido de no aparecer en los buscadores, que lo llevan las pantallas de
   sesión y de trabajo, nunca las públicas.

   **Una advertencia que conviene tener escrita.** Ese pedido ahora lo escribe
   el programa en vez de venir en el archivo. Un buscador que ejecute el
   programa lo ve igual; uno que sólo mire el archivo no. Las pantallas que
   importa que se encuentren —las públicas— no piden nada, así que no dependen
   de esto; y a las otras, que además exigen sesión, no hay nada que mostrarles.
=================================================== */

import { useEffect } from 'react';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';

export function usePestana(claveDelTitulo, { fueraDeBuscadores = false } = {}) {
  const { frase } = useFrases();

  useEffect(() => {
    const anterior = document.title;
    document.title = frase(claveDelTitulo);

    let etiqueta = null;
    if (fueraDeBuscadores) {
      etiqueta = document.createElement('meta');
      etiqueta.name = 'robots';
      etiqueta.content = 'noindex, nofollow';
      document.head.appendChild(etiqueta);
    }

    return () => {
      document.title = anterior;
      if (etiqueta) etiqueta.remove();
    };
  }, [claveDelTitulo, fueraDeBuscadores, frase]);
}
