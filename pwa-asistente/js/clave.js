/* ===================================================
   CONTRASEÑAS — el único lugar donde se decide qué vale y qué no

   Tres pantallas piden una contraseña: el acceso, el alta de Asistente y la
   que se usa para elegir una nueva después de olvidarla. Si cada una revisa
   por su cuenta, tarde o temprano una pide ocho caracteres, otra seis, y la
   persona se entera del desacuerdo recién cuando el servidor la rechaza. Por
   eso el largo mínimo y las frases de aviso viven acá y en ningún otro lado
   (regla 7).

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

  const Clave = {

    MINIMO,

    // ── ¿Sirve esta contraseña? ──────────────────────────────────────────
    // Devuelve `null` si está bien, o la frase que hay que mostrarle a la
    // persona. Nunca lanza: quien llama decide dónde poner el aviso.
    //
    // `repetida` es opcional. Se pasa donde el formulario la pide dos veces
    // —el alta, la contraseña nueva— y se omite en el acceso, donde va una sola.
    revisar(clave, repetida) {
      if (!clave) return 'Falta escribir la contraseña.';
      if (clave.length < MINIMO) {
        return 'La contraseña tiene que tener al menos ' + MINIMO + ' caracteres.';
      }
      if (repetida !== undefined && clave !== repetida) {
        return 'Las dos contraseñas no coinciden.';
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
            campo.setAttribute('placeholder', 'Al menos ' + MINIMO + ' caracteres');
          }
        }

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'campo-clave-boton';
        boton.textContent = 'Mostrar';
        boton.setAttribute('aria-pressed', 'false');
        boton.setAttribute('aria-label', 'Mostrar la contraseña');
        caja.appendChild(boton);

        boton.addEventListener('click', () => {
          const seVe = campo.type === 'text';
          campo.type = seVe ? 'password' : 'text';
          boton.textContent = seVe ? 'Mostrar' : 'Ocultar';
          boton.setAttribute('aria-pressed', seVe ? 'false' : 'true');
          boton.setAttribute('aria-label',
            seVe ? 'Mostrar la contraseña' : 'Ocultar la contraseña');
          campo.focus();
        });
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
