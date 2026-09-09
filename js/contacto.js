/* ===================================================
   LA TERCERA PUERTA — el chat no deja pasar datos de contacto

   El chat existe para que la Familia y el Asistente se conozcan **antes** de
   contratar. Si adentro del chat se puede escribir un teléfono, un correo o un
   domicilio, la conversación se sigue por afuera: la plataforma se entera del
   primer mensaje y de ninguno más, y las otras dos reglas —el teléfono no se
   muestra nunca, el directorio no entra a los buscadores— dejan de servir para
   nada. Está escrito en `docs/CATALOGO.md`, «El chat es la tercera puerta», y
   es una de las condiciones de cierre del pendiente 6.

   Cómo se usa:

       const revision = await Contacto.revisar(texto);
       if (!revision.pasa) { mostrar(revision.aviso); return; }

   LO QUE ESTO NO ES
   No es un control de seguridad, y decirlo importa más que lo que sí es. Corre
   en el navegador: quien quiera saltearlo abre la consola y lo saltea. Cierra
   el camino fácil, le dice a quien no sabía que no se puede, y deja constancia.
   **El control de verdad está del lado del servidor** desde la migración 0063:
   un disparador sobre `mensajes` que revisa el contenido antes de
   guardarlo y devuelve `contacto_bloqueado:<clave de la regla>`. Ahí no hay
   consola que valga. Esto es el aviso previo, que existe para que a nadie se le
   rechace un mensaje sin haber sabido antes que no se podía.

   Y no son dos listas de reglas: **son la misma**. Las reglas viven en la tabla
   `patrones_de_contacto` y este archivo lee una copia generada desde ella, que
   `scripts/verificar_patrones_contacto.mjs` compara en cada `commit`. Dos listas
   separadas coinciden el primer día y se despegan en silencio, y la que se
   despega es siempre la que la persona ve.

   Y tampoco es exacto. Ningún reconocedor de texto lo es: el que aprieta de más
   le rompe la conversación a alguien que no hizo nada, y el que aprieta de menos
   deja pasar algo. **Éste aprieta de menos a propósito.** Ante la duda, deja
   pasar; ninguna regla se apoya en una sola palabra suelta.

   DE DÓNDE SALEN LAS REGLAS
   De `data/patrones-contacto.json`, no de acá. Son una regla operativa, y una
   regla operativa no se escribe en el código: quien quiera ajustar qué cuenta
   como teléfono edita ese archivo y no toca ninguna pantalla. Es el mismo
   criterio con el que `js/catalogo.js` saca las listas de opciones.

   POR QUÉ FALLA CERRADO
   Si el archivo de reglas no se puede leer, no se manda el mensaje y se dice por
   qué. Un control que desaparece en silencio es peor que uno que no existe:
   nadie se entera de que dejó de estar. Es la misma razón por la que
   `js/catalogo.js` muestra un cartel roto en vez de una lista corta.

   ESTE ARCHIVO NO SE TRIPLICA
   Las copias de `js/` en cada PWA existen porque el service worker de cada una
   sólo alcanza su propia carpeta. Las dos PWAs sí tienen chat —`js/conversacion.js`,
   montado en las dos—, pero ese chat no usa este archivo: se apoya derecho en la
   puerta del servidor y muestra lo que ella conteste. El único que lee esto es
   `mockup-app.html`, que se va cuando cierre el pendiente 6. El día que una
   pantalla de una PWA quiera avisar antes de mandar, se copia y se agrega a
   `scripts/verificar_copias.mjs`.
=================================================== */

(function () {
  'use strict';

  // El idioma del texto visible, igual que en `js/catalogo.js`. Cuando el
  // producto elija idioma de verdad —pendiente 9— los dos leen de un solo lado.
  const IDIOMA_POR_DEFECTO = 'es-AR';

  let promesa = null;

  // La dirección del archivo se calcula desde la de este mismo guion, igual que
  // en `js/catalogo.js`, para que una pantalla que viva en un subdirectorio no
  // tenga que configurar nada.
  function direccionDelArchivo() {
    const guion = document.currentScript
      || Array.prototype.slice.call(document.querySelectorAll('script[src]'))
          .filter((s) => /(^|\/)contacto\.js(\?|$)/.test(s.getAttribute('src') || ''))[0];
    const src = guion ? guion.src : 'js/contacto.js';
    return src.replace(/js\/contacto\.js(\?.*)?$/, 'data/patrones-contacto.json');
  }

  const direccion = (typeof document !== 'undefined') ? direccionDelArchivo() : null;

  function traer() {
    if (!promesa) {
      promesa = fetch(direccion)
        .then((res) => {
          if (!res.ok) throw new Error('El servidor contestó ' + res.status);
          return res.json();
        })
        .catch((err) => {
          promesa = null; // Que el próximo intento vuelva a probar.
          throw err;
        });
    }
    return promesa;
  }

  /**
   * La revisión sin nada alrededor: entra el archivo de reglas ya leído y el
   * texto, sale qué se reconoció. No lee archivos ni toca la pantalla, así que
   * es lo que prueba `scripts/verificar_contacto.mjs` — la pantalla y la prueba
   * corren exactamente el mismo código.
   */
  function revisarCon(reglas, texto, idioma) {
    const lengua = idioma || IDIOMA_POR_DEFECTO;
    const enLengua = (traducciones) => (traducciones || {})[lengua]
      || (traducciones || {})[IDIOMA_POR_DEFECTO] || '';

    const motivos = (reglas.reglas || [])
      .filter((regla) => {
        // Sin `lastIndex` en cero, una expresión con bandera `g` arranca donde
        // terminó la vez anterior y contesta que no en mensajes que sí tienen.
        const expresion = new RegExp(regla.patron, regla.banderas || '');
        expresion.lastIndex = 0;
        return expresion.test(String(texto || ''));
      })
      .map((regla) => ({ clave: regla.clave, motivo: enLengua(regla.motivo) }));

    return {
      pasa: motivos.length === 0,
      motivos,
      aviso: motivos.length === 0 ? '' : enLengua(reglas.aviso)
    };
  }

  /**
   * Lo que llama la pantalla. Si las reglas no se pudieron leer no deja pasar
   * nada y lo dice, porque un control que se apaga solo no se nota.
   */
  async function revisar(texto, idioma) {
    let reglas;
    try {
      reglas = await traer();
    } catch (err) {
      console.error('Chat, reglas de contacto:', err);
      return {
        pasa: false,
        motivos: [{ clave: 'reglas_no_disponibles', motivo: '' }],
        aviso: Catalogo.frase('conversacion.reglas_no_disponibles')
      };
    }
    return revisarCon(reglas, texto, idioma);
  }

  const Contacto = { revisar, revisarCon, IDIOMA_POR_DEFECTO };

  if (typeof window !== 'undefined') window.Contacto = Contacto;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Contacto };
})();
