// ===================================================
// JavaScript global del sitio
// ===================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Navbar scroll effect ----
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // ---- Hamburger menu ----
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });
  }

  // ---- Active nav link ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- Los formularios de consulta no se atienden acá ----
     Hasta el 26 de agosto de 2026, `js/main.js` enganchaba todo
     `#contact-form` y todo `#form-solicitud-familia` y hacía una de dos
     cosas: si el motivo elegido era «busco un Asistente», llevaba a
     `formulario-integral.html`; y si no, prendía el cartel verde de
     «¡Solicitud enviada!», limpiaba el formulario y lo apagaba a los cinco
     segundos **sin haber mandado nada a ningún lado**. Era el pendiente 64.

     Los cuatro formularios de consulta del portal los atiende ahora
     `js/formulario-consulta.js`, que guarda cuando se puede guardar y
     cuando no, lo dice y ofrece el correo. Nada de eso vive acá.

     El único que llevaba a otra pantalla era el de la portada, y sólo cuando
     el motivo elegido era «busco un Asistente»: el destino era el paso a paso
     de `formulario-integral.html`, que vivía más abajo en este mismo archivo.
     Ese paso a paso chocaba con la misma pared —guardar exige una Prestadora
     resuelta, y quien llega al portal no tiene ninguna—, así que llevar hasta
     él a alguien sin sesión era hacerle completar seis pasos para terminar en
     un error. La consulta de la portada se atiende ahora donde se hace; y el
     paso a paso se fue el 9 de septiembre de 2026 junto con su pantalla, que
     era una hoja de muestra y hoy está en `fuera de uso/`. Quien publica un
     aviso de verdad es `pwa-familia/index.html:739`. */

  /* ---- Los filtros del directorio ----
     Cada desplegable devuelve una clave de catálogo y cada tarjeta lleva las
     suyas en un `data-`, así que se compara clave contra clave.

     Antes se comparaba contra el texto visible de la tarjeta, y eso fallaba de
     dos maneras a la vez: la opción «medicos» no encontraba nunca la tarjeta que
     decía «Médicos», porque la tilde no coincide, y cualquier cambio de redacción
     rompía un filtro sin que nada avisara. */
  const searchInput = document.getElementById('dir-search');
  const zoneSelect = document.getElementById('dir-zone');
  const typeSelect = document.getElementById('dir-type');
  const patologiaSelect = document.getElementById('dir-patologia');
  const comprobacionSelect = document.getElementById('dir-comprobacion');
  const resultsCount = document.getElementById('results-count');

  // Las tarjetas se preguntan cada vez y no se guardan al cargar la página: el
  // directorio llega de la base, así que cuando este archivo corre todavía no
  // hay ninguna. Antes eran ocho y estaban escritas en el HTML.
  const tarjetas = () => document.querySelectorAll('.caregiver-card');

  // Una tarjeta puede llevar varias claves separadas por espacios. Se compara
  // entera y no por pedazo: `acv` no tiene por qué encontrar a `acv_grave`.
  function tieneClave(card, atributo, clave) {
    if (!clave) return true;
    return (card.dataset[atributo] || '').split(/\s+/).indexOf(clave) !== -1;
  }

  // La búsqueda libre ignora tildes: quien escribe «nunez» busca Núñez.
  function sinTildes(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function filterCards() {
    const searchTerm = searchInput ? sinTildes(searchInput.value) : '';
    const zone = zoneSelect ? zoneSelect.value : '';
    const type = typeSelect ? typeSelect.value : '';
    const patologia = patologiaSelect ? patologiaSelect.value : '';
    const comprobacion = comprobacionSelect ? comprobacionSelect.value : '';

    let visibleCount = 0;

    tarjetas().forEach(card => {
      const name = sinTildes(card.dataset.name || '');
      // La zona se guarda como clave (`grand_bourg`) y se busca como se escribe.
      const zonaEscrita = sinTildes((card.dataset.zone || '').replace(/_/g, ' '));

      const isVisible =
        (!searchTerm || name.includes(searchTerm) || zonaEscrita.includes(searchTerm))
        && tieneClave(card, 'zone', zone)
        && tieneClave(card, 'type', type)
        && tieneClave(card, 'patologia', patologia)
        && tieneClave(card, 'comprobacion', comprobacion);

      card.classList.toggle('oculto', !isVisible);
      if (isVisible) visibleCount++;
    });

    // El cuarto estado: cero resultados se dice con una frase,
    // no con un «Mostrando 0» que se lee como si algo se hubiera roto.
    //
    // Singular y plural son dos claves distintas y no una frase armada con
    // pedazos: el número va adentro de un hueco y cada idioma la ordena como
    // quiera. Se escribe la clave y traduce el catálogo, así que el texto
    // cambia solo cuando cambia el idioma.
    if (resultsCount) {
      if (visibleCount === 0) {
        resultsCount.setAttribute('data-frase', 'directorio.sin_coincidencias');
        resultsCount.removeAttribute('data-huecos');
      } else if (visibleCount === 1) {
        resultsCount.setAttribute('data-frase', 'directorio.mostrando_uno');
        resultsCount.removeAttribute('data-huecos');
      } else {
        resultsCount.setAttribute('data-frase', 'directorio.mostrando_varios');
        resultsCount.setAttribute('data-huecos', JSON.stringify({ cuantos: visibleCount }));
      }
      if (window.Catalogo) Catalogo.traducir(resultsCount);
    }
  }

  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (zoneSelect) zoneSelect.addEventListener('change', filterCards);
  if (typeSelect) typeSelect.addEventListener('change', filterCards);
  if (patologiaSelect) patologiaSelect.addEventListener('change', filterCards);
  if (comprobacionSelect) comprobacionSelect.addEventListener('change', filterCards);

  // El directorio termina de dibujarse cuando contesta la base, que es después
  // de todo esto. Ahí llama acá para que el filtro pase sobre lo recién puesto.
  window.filtrarDirectorio = filterCards;

  // ---- El asistente por pasos se fue con la pantalla ----
  // Hasta el 9 de septiembre de 2026 acá vivía el asistente de seis pasos de
  // `formulario-integral.html`: enganchaba `wizard-care-search-form`, `w-title`,
  // `summary-title` y `summary-desc`, que existían sólo ahí. Esa pantalla era una
  // hoja de muestra —replicaba los formularios de la aplicación real para poder
  // mirarlos juntos—, ya cumplió esa función y se guardó en `fuera de uso/`, así
  // que el bloque se quedó sin nada que enganchar.
  //
  // Quien publica un aviso de verdad es `pwa-familia/index.html:739`, y los
  // enlaces «Publicar un Aviso» del portal llevan ahora a
  // `registrar-familia.html`, que reenvía a quien ya tiene sesión.
  //
  // De los seis pasos quedaron cinco preguntas que `pwa-familia` todavía no hace
  // —tareas, tipo de Asistente, género preferido, urgencia y frecuencia—, y están
  // anotadas en `docs/PENDIENTES.md`.

  // ---- Fade-in on scroll ----
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

});

// Fade-in CSS injected via JS for simplicity
const style = document.createElement('style');
style.textContent = `
  .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .fade-in.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);
