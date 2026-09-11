/* ===================================================
   LO QUE LA PANTALLA LE DICE AL NAVEGADOR Y A LOS BUSCADORES

   Antes cada pantalla lo traía escrito arriba de todo, porque cada pantalla era
   un archivo. Ahora son vistas de un mismo programa: el nombre de la pestaña es
   de la vista y no del sitio, así que se pone al entrar y se saca al salir.
   Igual con la descripción que muestran los buscadores, y con el pedido de no
   aparecer en ellos, que lo llevan las pantallas de sesión y de trabajo, nunca
   las públicas.

   **Los tres se ponen y se sacan juntos**, y por eso están en un solo lugar: si
   una pantalla pusiera la descripción y no la sacara, la siguiente quedaría
   descripta con el texto de la anterior, que es peor que no tener ninguna.

   **Una advertencia que conviene tener escrita.** Todo esto ahora lo escribe el
   programa en vez de venir en el archivo. Un buscador que ejecute el programa lo
   ve igual; uno que sólo mire el archivo no. Las pantallas que importa que se
   encuentren —las públicas— son justamente las que llevan descripción, así que
   el día que eso pese, lo que se arma para publicar tiene que escribirles el
   encabezado de entrada. Al pedido de no aparecer no le pasa: lo llevan las
   pantallas que además exigen sesión, y a un buscador no hay nada que mostrarle
   ahí.
=================================================== */

import { useEffect } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

export function usePestana(claveDelTitulo, { descripcion = '', fueraDeBuscadores = false } = {}) {
  const { frase } = useFrases();

  useEffect(() => {
    const anterior = document.title;
    document.title = frase(claveDelTitulo);

    /* Cada etiqueta se crea acá y se borra al salir. No se toca ninguna que ya
       estuviera en la página: si el archivo de entrada trae la suya, sigue
       siendo la del sitio y vuelve a quedar sola cuando esta vista se va. */
    const puestas = [];
    const poner = (nombre, contenido) => {
      const etiqueta = document.createElement('meta');
      etiqueta.name = nombre;
      etiqueta.content = contenido;
      document.head.appendChild(etiqueta);
      puestas.push(etiqueta);
    };

    if (descripcion) poner('description', frase(descripcion));
    if (fueraDeBuscadores) poner('robots', 'noindex, nofollow');

    return () => {
      document.title = anterior;
      puestas.forEach((etiqueta) => etiqueta.remove());
    };
  }, [claveDelTitulo, descripcion, fueraDeBuscadores, frase]);
}
