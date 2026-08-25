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

  // ---- Contact form validation & Redirección al Wizard ----
  const formsToHandle = document.querySelectorAll('#contact-form, #form-solicitud-familia');
  formsToHandle.forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      let valid = true;

      form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#e53935';
          field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
        }
      });

      const emailField = form.querySelector('input[type="email"]');
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        valid = false;
        emailField.style.borderColor = '#e53935';
      }

      if (valid) {
        const consultaSelect = form.querySelector('select');
        const isBuscoCuidador = !consultaSelect || consultaSelect.value === 'busco-cuidador' || form.id === 'form-solicitud-familia';

        if (isBuscoCuidador) {
          // Redirigir al Wizard Interactivo de Publicación de Búsqueda
          window.location.href = 'formulario-integral.html';
        } else {
          const successMsg = form.querySelector('.form-success') || document.getElementById('form-success');
          if (successMsg) {
            successMsg.style.display = 'block';
            form.reset();
            setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
          }
        }
      }
    });
  });

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
  const verificacionSelect = document.getElementById('dir-verificacion');
  const cards = document.querySelectorAll('.caregiver-card');
  const resultsCount = document.getElementById('results-count');

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
    const verificacion = verificacionSelect ? verificacionSelect.value : '';

    let visibleCount = 0;

    cards.forEach(card => {
      const name = sinTildes(card.dataset.name || '');
      // La zona se guarda como clave (`grand_bourg`) y se busca como se escribe.
      const zonaEscrita = sinTildes((card.dataset.zone || '').replace(/_/g, ' '));

      const isVisible =
        (!searchTerm || name.includes(searchTerm) || zonaEscrita.includes(searchTerm))
        && tieneClave(card, 'zone', zone)
        && tieneClave(card, 'type', type)
        && tieneClave(card, 'patologia', patologia)
        && tieneClave(card, 'verificacion', verificacion);

      card.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });

    // El cuarto estado de la regla 5.3: cero resultados se dice con una frase,
    // no con un «Mostrando 0» que se lee como si algo se hubiera roto.
    if (resultsCount) {
      resultsCount.textContent = visibleCount === 0
        ? 'Ningún cuidador de la muestra coincide con esos filtros.'
        : `Mostrando ${visibleCount} cuidadores`;
    }
  }

  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (zoneSelect) zoneSelect.addEventListener('change', filterCards);
  if (typeSelect) typeSelect.addEventListener('change', filterCards);
  if (patologiaSelect) patologiaSelect.addEventListener('change', filterCards);
  if (verificacionSelect) verificacionSelect.addEventListener('change', filterCards);

  // ---- WIZARD INTERACTIVO DE 6 PASOS ----
  // Las tarjetas de los pasos 2 y 3 no se eligen igual. Las tareas son varias
  // —una persona puede necesitar higiene y medicación a la vez— y el tipo de
  // Asistente es uno solo, porque a `care_searches.profession_required` va una
  // sola clave. Antes las dos se comportaban igual y se podían marcar cuatro
  // tipos de Asistente para una misma búsqueda.
  const selectCards = document.querySelectorAll('.select-card');
  selectCards.forEach(card => {
    card.addEventListener('click', () => {
      const unaSola = card.hasAttribute('data-tipo-asistente');
      if (unaSola && !card.classList.contains('selected')) {
        card.parentNode.querySelectorAll('.select-card.selected')
          .forEach(otra => otra.classList.remove('selected'));
      }
      card.classList.toggle('selected');
    });
  });

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
    wizardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const successMsg = document.getElementById('wizard-success-msg');
      const btnSubmit = document.getElementById('btn-submit-wizard');

      const title = document.getElementById('w-title')?.value || 'Cuidadora para adulto mayor';
      const patientAge = document.getElementById('w-patient-age')?.value || '80';
      const patientGender = document.getElementById('w-patient-gender')?.value || 'Femenino';
      
      // Lo que la persona eligió en los seis pasos. Hasta la migración 0013
      // esto se recolectaba en pantalla y no salía de ahí: la búsqueda se
      // armaba con `patologias: []` y `horarios: 'flexible'` escritos a mano, y
      // los pasos 2, 3 y 4 no llegaban a la base.
      const elegidas = (atributo) => Array.from(
        document.querySelectorAll(`.select-card.selected[${atributo}]`)
      ).map((tarjeta) => tarjeta.getAttribute(atributo));

      const tipoAsistente = elegidas('data-tipo-asistente');

      const newSearch = {
        paciente: `Paciente de ${patientAge} años (${patientGender}) - ${title}`,
        // Este asistente no pregunta patologías: el paso 2 pregunta tareas.
        patologias: [],
        // `horarios` sigue escrito a mano a propósito: la columna
        // `schedule_type` guarda hoy cuatro formas distintas de nombrar lo
        // mismo y todavía no tiene vocabulario que la gobierne (pendiente 31).
        // Escribir acá una quinta forma sería empeorarlo.
        horarios: 'flexible',
        grillaHorarios: {},
        tareas: elegidas('data-tarea'),
        profesion: tipoAsistente[0] || '',
        generoPreferido: document.getElementById('w-pref-gender')?.value || '',
        frecuencia: document.getElementById('w-frequency')?.value || '',
        descripcion: document.getElementById('w-desc')?.value || '',
        estado: 'activa'
      };

      if (btnSubmit) btnSubmit.disabled = true;
      try {
        await ClienteDatos.crearBusquedaFamilia(newSearch);
        if (successMsg) successMsg.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
      } catch (err) {
        // Antes, sin ClienteDatos, esto se guardaba en el navegador y la
        // pantalla anunciaba éxito: la búsqueda no llegaba a ninguna parte y
        // nadie se enteraba. Ahora va a la base o se dice que no se pudo.
        console.error('Publicar la búsqueda:', err);
        alert(Texto.mensajeDeError(err, 'publicar la búsqueda'));
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
              <i class="fas fa-user-circle" style="font-size:72px;color:rgba(255,255,255,0.4);margin-bottom:12px;"></i>
              <div style="font-size:16px;font-weight:700;">Conectando sala segura 8x8 Encryption...</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">Cuidadora: Marisa Miranda</div>
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
