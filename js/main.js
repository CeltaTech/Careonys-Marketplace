// ===================================================
// CAREONYS — JavaScript global
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

  // ---- Directory search/filter ampliado ----
  const searchInput = document.getElementById('dir-search');
  const zoneSelect = document.getElementById('dir-zone');
  const typeSelect = document.getElementById('dir-type');
  const specSelect = document.getElementById('dir-specialty');
  const verifiedSelect = document.getElementById('dir-verified');
  const cards = document.querySelectorAll('.caregiver-card');
  const resultsCount = document.getElementById('results-count');

  function filterCards() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const zone = zoneSelect ? zoneSelect.value.toLowerCase() : '';
    const type = typeSelect ? typeSelect.value.toLowerCase() : '';
    const spec = specSelect ? specSelect.value.toLowerCase() : '';
    const verif = verifiedSelect ? verifiedSelect.value.toLowerCase() : '';

    let visibleCount = 0;

    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cardZone = (card.dataset.zone || '').toLowerCase();
      const cardType = (card.dataset.type || '').toLowerCase();
      const textContent = card.textContent.toLowerCase();

      const matchSearch = !searchTerm || name.includes(searchTerm) || cardZone.includes(searchTerm);
      const matchZone = !zone || cardZone.includes(zone);
      const matchType = !type || cardType.includes(type);
      const matchSpec = !spec || textContent.includes(spec);
      const matchVerif = !verif || textContent.includes(verif);

      const isVisible = matchSearch && matchZone && matchType && matchSpec && matchVerif;
      card.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });

    if (resultsCount) {
      resultsCount.textContent = `Mostrando ${visibleCount} cuidadores`;
    }
  }

  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (zoneSelect) zoneSelect.addEventListener('change', filterCards);
  if (typeSelect) typeSelect.addEventListener('change', filterCards);
  if (specSelect) specSelect.addEventListener('change', filterCards);
  if (verifiedSelect) verifiedSelect.addEventListener('change', filterCards);

  // ---- WIZARD INTERACTIVO DE 6 PASOS ----
  const selectCards = document.querySelectorAll('.select-card');
  selectCards.forEach(card => {
    card.addEventListener('click', () => {
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
    wizardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const successMsg = document.getElementById('wizard-success-msg');
      const btnSubmit = document.getElementById('btn-submit-wizard');

      // Guardar búsqueda en localStorage para alimentar el Feed de Ofertas
      const title = document.getElementById('w-title')?.value || 'Cuidadora para adulto mayor';
      const desc = document.getElementById('w-desc')?.value || 'Asistencia en tareas diarias';
      const patientAge = document.getElementById('w-patient-age')?.value || '80';
      const patientGender = document.getElementById('w-patient-gender')?.value || 'Femenino';
      
      const newSearch = {
        id: Date.now(),
        title,
        desc,
        patientAge,
        patientGender,
        date: new Date().toLocaleDateString('es-AR')
      };

      let currentSearches = JSON.parse(localStorage.getItem('careonys_searches') || '[]');
      currentSearches.unshift(newSearch);
      localStorage.setItem('careonys_searches', JSON.stringify(currentSearches));

      if (successMsg) successMsg.style.display = 'block';
      if (btnSubmit) btnSubmit.style.display = 'none';
    });
  }

  // ---- MANEJADOR DE REGISTRO COMPLETO DE CUIDADOR ----
  const caregiverRegForm = document.getElementById('form-registro-cuidador-completo');
  if (caregiverRegForm) {
    caregiverRegForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const successMsg = caregiverRegForm.querySelector('#form-success');
      if (successMsg) {
        successMsg.style.display = 'block';
        caregiverRegForm.reset();
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
              <h3 style="margin:0;font-size:18px;color:var(--purple-dark);"><i class="fas fa-video" style="color:var(--magenta);margin-right:8px;"></i> Entrevista por Videollamada (Careonys Live)</h3>
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
