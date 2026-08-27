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

     Los cinco formularios de consulta del portal los atiende ahora
     `js/formulario-consulta.js`, que guarda cuando se puede guardar y
     cuando no, lo dice y ofrece el correo. Nada de eso vive acá.

     El único que llevaba a otra pantalla era el de la portada, y sólo cuando
     el motivo elegido era «busco un Asistente»: el destino era el paso a
     paso de `formulario-integral.html`, que publica el aviso de verdad y
     está más abajo en este mismo archivo. Ese paso a paso choca con la
     misma pared —guardar exige una Prestadora resuelta, y quien llega al
     portal no tiene ninguna—, así que llevar hasta él a alguien sin sesión
     era hacerle completar seis pasos para terminar en un error. La consulta
     de la portada se atiende ahora donde se hace, y el paso a paso sigue en
     pie para quien sí tiene sesión: pendiente 64. */

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

  // ---- WIZARD INTERACTIVO DE 6 PASOS ----
  // Acá había veinte renglones que marcaban y desmarcaban tarjetas a mano, y
  // que además tenían que acordarse de que las de tipo de Asistente son de a
  // una. Ya no hacen falta: cada tarjeta la dibuja `js/catalogo.js` con su
  // control adentro, así que de un grupo de redondas se marca una sola porque
  // lo hace el navegador, y lo elegido se lee del formulario.

  const nextBtns = document.querySelectorAll('.btn-next-step');
  const prevBtns = document.querySelectorAll('.btn-prev-step');
  const stepNodes = document.querySelectorAll('.wizard-step-node');
  const stepPanes = document.querySelectorAll('.wizard-step-pane');

  function goToStep(stepNum) {
    stepPanes.forEach(pane => { pane.style.display = 'none'; });
    const targetPane = document.getElementById(`step-pane-${stepNum}`);
    if (targetPane) targetPane.style.display = 'block';

    stepNodes.forEach(node => {
      const nStep = parseInt(node.dataset.step, 10);
      node.classList.remove('active', 'completed');
      if (nStep === stepNum) {
        node.classList.add('active');
      } else if (nStep < stepNum) {
        node.classList.add('completed');
      }
    });

    // Actualizar resumen en Paso 6
    if (stepNum === 6) {
      const titleInput = document.getElementById('w-title');
      const descInput = document.getElementById('w-desc');
      const sumTitle = document.getElementById('summary-title');
      const sumDesc = document.getElementById('summary-desc');

      if (sumTitle && titleInput && titleInput.value) sumTitle.textContent = titleInput.value;
      if (sumDesc && descInput && descInput.value) sumDesc.textContent = descInput.value;
    }
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.next, 10);
      goToStep(nextStep);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = parseInt(btn.dataset.prev, 10);
      goToStep(prevStep);
    });
  });

  const wizardForm = document.getElementById('wizard-care-search-form');
  if (wizardForm) {
    // El paso 4 pregunta cuándo se necesita el cuidado con la misma grilla de
    // días por turnos que el alta del Asistente pregunta al revés. Los textos y
    // los casilleros los pone `js/disponibilidad.js` desde el catálogo.
    Franjas.montarTextos('franjas-cuidado', 'paso_de_franjas_aviso');
    Franjas.montarGrilla('grilla-cuidado', 'grilla_aviso');

    wizardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const successMsg = document.getElementById('wizard-success-msg');
      const btnSubmit = document.getElementById('btn-submit-wizard');

      const title = document.getElementById('w-title')?.value || 'Asistente para adulto mayor';
      const patientAge = document.getElementById('w-patient-age')?.value || '80';
      const patientGender = document.getElementById('w-patient-gender')?.value || 'Femenino';
      
      // Lo que la persona eligió en los seis pasos. Hasta la migración 0013
      // esto se recolectaba en pantalla y no salía de ahí: el aviso se
      // armaba con `patologias: []` y `horarios: 'flexible'` escritos a mano, y
      // los pasos 2, 3 y 4 no llegaban a la base.
      //
      // Se pregunta por el vocabulario y no por la clase de la tarjeta: la
      // grilla la dibuja el catálogo y el valor lo guarda el control de cada
      // una, así que lo elegido es lo que el formulario tiene marcado.
      const elegidas = (vocabulario) => Array.from(
        document.querySelectorAll(`[data-catalogo="${vocabulario}"] input:checked`)
      ).map((control) => control.value);

      const tipoAsistente = elegidas('tipo_asistente');

      const newSearch = {
        paciente: `Paciente de ${patientAge} años (${patientGender}) - ${title}`,
        // Este asistente no pregunta patologías: el paso 2 pregunta tareas.
        patologias: [],
        // `horarios` sigue escrito a mano a propósito: la columna
        // `schedule_type` guarda hoy cuatro formas distintas de nombrar lo
        // mismo y todavía no tiene vocabulario que la gobierne (pendiente 31).
        // Escribir acá una quinta forma sería empeorarlo.
        horarios: 'flexible',
        // Un par `{ dia, turno }` por casillero marcado, con claves de
        // catálogo. Va a `franjas_aviso`, una fila cada uno.
        franjas: Franjas.recolectar('grilla-cuidado').franjas,
        tareas: elegidas('tarea_cuidado'),
        profesion: tipoAsistente[0] || '',
        generoPreferido: document.getElementById('w-pref-gender')?.value || '',
        frecuencia: document.getElementById('w-frequency')?.value || '',
        descripcion: document.getElementById('w-desc')?.value || '',
        estado: 'activa'
      };

      if (btnSubmit) btnSubmit.disabled = true;
      try {
        await ClienteDatos.crearAvisoFamilia(newSearch);
        if (successMsg) successMsg.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
      } catch (err) {
        // Antes, sin ClienteDatos, esto se guardaba en el navegador y la
        // pantalla anunciaba éxito: el aviso no llegaba a ninguna parte y
        // nadie se enteraba. Ahora va a la base o se dice que no se pudo.
        console.error('Publicar el aviso:', err);
        alert(Texto.mensajeDeError(err, 'publicar el aviso'));
        if (btnSubmit) btnSubmit.disabled = false;
      }
    });
  }

  // ---- MODAL SIMULADO DE VIDEOLLAMADA DE ENTREVISTA ----
  const videoBtns = document.querySelectorAll('a[href*="video"], .btn-video-call');
  videoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      let overlay = document.querySelector('.video-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'video-modal-overlay';
        overlay.innerHTML = `
          <div class="video-modal-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h3 style="margin:0;font-size:18px;color:var(--texto-titulo);"><i class="fas fa-video" style="color:var(--azul-medio-texto);margin-right:8px;"></i> Entrevista por Videollamada</h3>
              <button class="btn-close-video" style="background:none;border:none;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <div class="video-screen-placeholder">
              <i class="fas fa-user-circle" style="font-size:72px;color:var(--icono-sobre-color);margin-bottom:12px;"></i>
              <div style="font-size:16px;font-weight:700;">Conectando sala segura 8x8 Encryption...</div>
              <div style="font-size:12px;color:var(--texto-sobre-color-tenue);margin-top:4px;">Asistente: Marisa Miranda</div>
            </div>
            <div class="video-controls">
              <button class="video-btn mute" title="Silenciar Micrófono"><i class="fas fa-microphone"></i></button>
              <button class="video-btn cam" title="Activar/Desactivar Cámara"><i class="fas fa-video"></i></button>
              <button class="video-btn hangup btn-close-video" title="Finalizar Llamada"><i class="fas fa-phone-slash"></i></button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelectorAll('.btn-close-video').forEach(closeBtn => {
          closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
          });
        });
      }

      setTimeout(() => {
        overlay.classList.add('active');
      }, 50);
    });
  });

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
