/* ===================================================
   LOS MOVIMIENTOS QUE SON DEL SITIO Y NO DE UNA PANTALLA

   Son tres, y estaban escritos en el guion general que el navegador cargaba
   suelto en cada página. Ese guion se apagó al pasar el sitio a un solo
   programa —ya no hay páginas sueltas que lo llamen— y con él se apagaron los
   movimientos. Acá vuelven, hechos de la manera que corresponde ahora: el
   programa los enciende una vez y los apaga al terminar.

   **Aparecer al bajar.** Un bloque marcado para aparecer arranca corrido y
   apagado, y se enciende cuando entra en pantalla. Se enciende una sola vez:
   después queda quieto. Antes alcanzaba con mirar la página al abrirla, porque
   lo que había al abrir era todo lo que iba a haber. Ahora las pantallas se
   cambian sin recargar y muchas traen sus bloques después de preguntarle a la
   base, así que además de mirar lo que ya está se queda mirando lo que
   aparezca.

   **Y el escondite lo prende el programa.** La regla que apaga el bloque cuelga
   de una marca que se le pone al cuerpo de la página acá adentro, y no en
   cualquier lado: si el navegador no sabe hacer este movimiento, la marca no se
   pone y no se esconde nada. Un bloque que no se pudo encender nunca es un
   bloque que no se lee.

   **Deslizarse hasta una parte de la misma pantalla.** Un enlace que nombra un
   pedazo de lo que se está viendo se desliza hasta ahí en vez de saltar. Y si
   el nombre viene pegado a la dirección —porque el enlace llegó desde otra
   pantalla—, se hace lo mismo al llegar, que antes lo hacía el navegador solo
   al cargar el archivo.
=================================================== */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* El mismo umbral y el mismo margen de siempre: el bloque se enciende cuando
   asoma una décima parte, y el margen de abajo lo hace esperar hasta que entró
   de verdad y no apenas rozó el borde. */
const CUANDO_ASOMA = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const APAGADO = 'fade-in';
const ENCENDIDO = 'visible';
const HAY_APARICION = 'con-aparicion';

export function useAparecerAlBajar() {
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return undefined;

    const vigia = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add(ENCENDIDO);
        vigia.unobserve(entrada.target);
      });
    }, CUANDO_ASOMA);

    const mirar = (elemento) => {
      if (elemento.classList.contains(APAGADO)
        && !elemento.classList.contains(ENCENDIDO)) vigia.observe(elemento);
      elemento.querySelectorAll('.' + APAGADO + ':not(.' + ENCENDIDO + ')')
        .forEach((adentro) => vigia.observe(adentro));
    };

    /* Lo que ya está dibujado, y después lo que vaya apareciendo: una pantalla
       nueva, o las tarjetas que llegan cuando contesta la base. */
    const nuevos = new MutationObserver((cambios) => {
      cambios.forEach((cambio) => {
        cambio.addedNodes.forEach((nodo) => {
          if (nodo.nodeType === 1) mirar(nodo);
        });
      });
    });

    document.body.classList.add(HAY_APARICION);
    mirar(document.body);
    nuevos.observe(document.body, { childList: true, subtree: true });

    return () => {
      nuevos.disconnect();
      vigia.disconnect();
      document.body.classList.remove(HAY_APARICION);
    };
  }, []);
}

/* Un nombre de pedazo de pantalla es una palabra, no una consulta: se lo busca
   por identificador y no por selector. Así `#` a secas —el enlace que no lleva
   a ningún lado y sólo existe para que algo se pueda pulsar— no encuentra nada
   y se deja pasar, en vez de romper la búsqueda. */
function pedazoDePantalla(nombre) {
  if (!nombre || nombre.charAt(0) !== '#' || nombre.length < 2) return null;
  return document.getElementById(nombre.slice(1));
}

export function useDeslizarHastaLaParte() {
  const donde = useLocation();

  useEffect(() => {
    const alPulsar = (evento) => {
      const enlace = evento.target.closest ? evento.target.closest('a') : null;
      if (!enlace || evento.defaultPrevented) return;
      const destino = pedazoDePantalla(enlace.getAttribute('href'));
      if (!destino) return;
      evento.preventDefault();
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    document.addEventListener('click', alPulsar);
    return () => document.removeEventListener('click', alPulsar);
  }, []);

  /* Al llegar con el pedazo colgado de la dirección hay que esperar a que la
     pantalla esté dibujada, y por eso se mira en el cuadro siguiente. */
  useEffect(() => {
    if (!donde.hash) return undefined;
    const cuadro = requestAnimationFrame(() => {
      const destino = pedazoDePantalla(donde.hash);
      if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(cuadro);
  }, [donde.hash, donde.pathname]);
}
