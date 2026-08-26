/* ===================================================
   CONTRASEÑAS — el único lugar donde se decide qué vale y qué no

   Tres pantallas piden una contraseña: el acceso, el alta de Asistente y la
   que se usa para elegir una nueva después de olvidarla. Si cada una revisa
   por su cuenta, tarde o temprano una pide ocho caracteres, otra seis, y la
   persona se entera del desacuerdo recién cuando el servidor la rechaza. Por
   eso el largo mínimo y **qué está mal** se deciden acá y en ningún otro lado
   («ningún patrón repetido sin punto único de verdad»). Cómo se dice cada
   aviso no se decide acá: `revisar()` devuelve la clave de la frase y el texto
   sale del catálogo, en los tres idiomas.

   El botón para ver la contraseña también sale de acá, y se pone solo: al
   cargar la página, todo campo de contraseña queda con el suyo. Una pantalla
   nueva no tiene que acordarse de nada.

   Hay una copia idéntica de este archivo en cada PWA, porque el service worker
   de cada una solo alcanza su propia carpeta. `scripts/verificar_copias.mjs`
   comprueba que las tres sean iguales byte a byte.

   Requiere: nada. Va antes que los guiones de cada pantalla.
=================================================== */

(function () {
  'use strict';

  // Lo que se le pide a la persona. Está acá arriba y solo, para que cambiarlo
  // sea cambiar un número.
  //
  // El 24 de agosto de 2026 se había decidido no decir ningún número y dejar que
  // el largo lo pusiera el servidor. No alcanzó: sin número, el único aviso
  // posible es «no cumple», y la persona se entera de cuánto le falta recién
  // cuando el servidor la rechaza. El número vive acá, y `supabase/config.toml`
  // (`minimum_password_length`) dice el mismo. Si el servidor termina pidiendo
  // menos, el navegador queda más exigente, que es el lado seguro del desacuerdo:
  // nunca deja pasar algo que el servidor vaya a rechazar.
  const MINIMO = 8;

  // El botón para ver la contraseña se arma acá, así que su rótulo no está en
  // ninguna pantalla y el recorrido del catálogo no lo alcanza: hay que pedirle
  // que traduzca ese pedazo cuando ya existe. Si el catálogo no está cargado en
  // esta pantalla, no pasa nada: queda lo que dice el botón recién creado.
  const traducir = (elemento) => {
    if (window.Catalogo && window.Catalogo.traducir) window.Catalogo.traducir(elemento);
  };

  const Clave = {

    MINIMO,

    // ── ¿Sirve esta contraseña? ──────────────────────────────────────────
    // Devuelve `null` si está bien, o **la clave de la frase** que hay que
    // mostrarle a la persona, junto con lo que va adentro de sus huecos:
    //
    //     { clave: 'clave.corta', huecos: { cuantos: 8 } }
    //
    // Devuelve la clave y no la frase por lo mismo que `Texto.claveDeError`:
    // un aviso de contraseña es texto visible, así que se traduce y sale del
    // catálogo. Decidir **de qué se trata** el problema es lógica y se queda
    // acá; cómo se dice, no. De paso queda comprobable, porque una prueba que
    // espera una clave no se rompe el día que alguien mejora la redacción.
    //
    // La forma es la misma que espera `avisar(id, clave, huecos)` en las
    // pantallas de la sesión, así que el resultado se pasa entero.
    //
    // Nunca lanza: quien llama decide dónde poner el aviso.
    //
    // `repetida` es opcional. Se pasa donde el formulario la pide dos veces
    // —el alta, la contraseña nueva— y se omite en el acceso, donde va una sola.
    revisar(clave, repetida) {
      if (!clave) return { clave: 'clave.falta' };
      if (clave.length < MINIMO) {
        return { clave: 'clave.corta', huecos: { cuantos: MINIMO } };
      }
      if (repetida !== undefined && clave !== repetida) {
        return { clave: 'clave.no_coinciden' };
      }
      return null;
    },

    // ── El botón para ver lo que se escribió ─────────────────────────────
    // Escribir una contraseña a ciegas y equivocarse es la causa más común de
    // no poder entrar. El botón dice «Mostrar» y «Ocultar» con todas las
    // letras en vez de un dibujo de ojo: un ojo tachado no aclara si lo que
    // se ve ahora es el estado o lo que va a pasar si se aprieta.
    //
    // Se llama solo al cargar la página. Vuelve a llamarse sin problema: un
    // campo que ya tiene su botón se saltea.
    prepararCampos(raiz) {
      const donde = raiz || document;
      const campos = donde.querySelectorAll('input[type="password"]');

      Array.prototype.forEach.call(campos, (campo) => {
        if (campo.parentNode && campo.parentNode.classList.contains('campo-clave')) return;

        const caja = document.createElement('div');
        caja.className = 'campo-clave';
        campo.parentNode.insertBefore(caja, campo);
        caja.appendChild(campo);
        // La marca sirve para que el CSS pueda hablarle al campo que tiene
        // botón y no a cualquier campo de adentro de la caja.
        campo.classList.add('campo-clave-campo');

        // El largo mínimo lo escribe el archivo que lo sabe, así el número no
        // queda tipeado a mano en ninguna pantalla. Sólo donde se elige una
        // contraseña nueva: en el ingreso, una cuenta vieja puede tener una más
        // corta que la que hoy se pide, y el navegador no la dejaría ni probar.
        if (campo.getAttribute('autocomplete') === 'new-password') {
          campo.setAttribute('minlength', String(MINIMO));
          if (!campo.getAttribute('placeholder')) {
            // El aviso nace escrito en castellano y el catálogo lo traduce
            // enseguida, igual que el botón de acá abajo y que el texto que las
            // pantallas llevan adentro. Es lo que hace que una pantalla que
            // todavía no carga el catálogo siga diciendo cuántos caracteres
            // hacen falta en vez de no decir nada.
            campo.setAttribute('placeholder', 'Al menos ' + MINIMO + ' caracteres');
            // Y la versión traducida se nombra, no se arma: el número entra en
            // el hueco de la frase, así que sigue viniendo de un solo lugar y
            // cada idioma lo pone donde le corresponde. Pegar pedazos daría mal
            // en los otros dos, que ordenan distinto.
            campo.setAttribute('data-frase-placeholder', 'clave.minimo');
            campo.setAttribute('data-huecos', JSON.stringify({ cuantos: MINIMO }));
          }
        }

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'campo-clave-boton';
        // El botón nace en castellano y el catálogo lo traduce enseguida, igual
        // que el texto escrito adentro de una pantalla. Es a propósito: **un
        // botón no puede aparecer sin rótulo** ni el instante que tarda en
        // llegar el archivo, y si el archivo no llega nunca, dice algo.
        boton.textContent = 'Mostrar';
        boton.setAttribute('aria-pressed', 'false');
        boton.setAttribute('aria-label', 'Mostrar la contraseña');
        boton.setAttribute('data-frase', 'clave.mostrar');
        boton.setAttribute('data-frase-aria-label', 'clave.mostrar_aria');
        caja.appendChild(boton);

        boton.addEventListener('click', () => {
          const seVe = campo.type === 'text';
          campo.type = seVe ? 'password' : 'text';
          boton.setAttribute('aria-pressed', seVe ? 'false' : 'true');
          boton.setAttribute('data-frase', seVe ? 'clave.mostrar' : 'clave.ocultar');
          boton.setAttribute('data-frase-aria-label',
            seVe ? 'clave.mostrar_aria' : 'clave.ocultar_aria');
          traducir(boton);
          campo.focus();
        });

        traducir(caja);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Clave.prepararCampos());
  } else {
    Clave.prepararCampos();
  }

  window.Clave = Clave;
})();
