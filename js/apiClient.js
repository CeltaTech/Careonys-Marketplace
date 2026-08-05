/* ===================================================
   CAREONYS MARKETPLACE — API Client Abstraction Layer
   Desarrollado por CeltaTech (SaaS)
   Nota: Soporta arquitectura Multi-Tenant dinámica conectada a Supabase.
=================================================== */

const CareonysAPI = {
  useSupabase: true,
  supabaseUrl: 'https://pfbvpncavvlgmmvqkgbo.supabase.co',
  supabaseKey: 'sb_publishable_rmhuO0J5QsE5mw-5fgf-Hw_9tCHd1di',
  currentTenant: null,

  // --- RESOLVER MULTI-TENANT DINÁMICO ---
  async initTenant() {
    // 1. Detectar slug desde query param (?tenant=presdemo) o subdominio
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('tenant') || urlParams.get('t');

    if (!slug) {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        slug = parts[0];
      }
    }

    // Default fallback para demo local
    if (!slug) {
      slug = 'presdemo';
    }

    try {
      if (this.useSupabase) {
        // Obtener configuración del tenant de Supabase
        const res = await this._supabaseRequest('GET', 'tenants', null, { slug: `eq.${slug}` });
        if (res && res[0]) {
          this.currentTenant = res[0];
        }
      }
      
      // Fallback a mock si no se pudo cargar
      if (!this.currentTenant) {
        this.currentTenant = {
          id: 'tenant-presdemo',
          slug: 'presdemo',
          name: 'PresDemo — Servicios de Cuidado',
          primary_color: '#1A365D',
          accent_color: '#E53E3E',
          logo_url: 'assets/images/logo_presdemo.png'
        };
      }

      // Aplicar branding dinámicamente en el DOM
      this._applyBranding(this.currentTenant);
    } catch (err) {
      console.error('Error al inicializar el tenant:', err);
    }
  },

  _applyBranding(tenant) {
    // Inyectar variables CSS de colores al root
    if (tenant.primary_color) {
      document.documentElement.style.setProperty('--color-primary', tenant.primary_color);
    }
    if (tenant.accent_color) {
      document.documentElement.style.setProperty('--color-accent', tenant.accent_color);
    }

    // Reemplazar logos e imágenes de marca
    const logoUrl = tenant.logo_url || 'assets/images/logo_presdemo.png';
    const logoSelectors = '.logo-brand, .tenant-logo, .navbar-logo img, .logo img';
    document.querySelectorAll(logoSelectors).forEach(img => {
      img.src = logoUrl;
    });

    // Reemplazar nombres y textos de marca
    const nameSelectors = '.tenant-name, .navbar-logo span, .logo span';
    document.querySelectorAll(nameSelectors).forEach(el => {
      el.textContent = tenant.name;
    });

    // Inyectar la insignia "Powered by Careonys" discretamente si el tenant es secundario
    if (tenant.slug !== 'careonys') {
      // 1. En el Navbar
      const navLogo = document.querySelector('.navbar-logo');
      if (navLogo && !navLogo.querySelector('.powered-by-tag')) {
        const tag = document.createElement('span');
        tag.className = 'powered-by-tag';
        tag.style.cssText = 'font-size: 8px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; display: block; opacity: 0.85;';
        tag.innerHTML = 'Powered by <span style="color:var(--color-accent, #E53E3E)">Careonys</span>';
        navLogo.appendChild(tag);
        
        navLogo.style.display = 'flex';
        navLogo.style.flexDirection = 'column';
        navLogo.style.alignItems = 'flex-start';
        
        const origSpan = navLogo.querySelector('span:not(.powered-by-tag)');
        if (origSpan) {
          origSpan.style.marginTop = '4px';
          origSpan.style.fontSize = '16px';
        }
      }

      // 2. En el Footer
      const footerLogo = document.querySelector('.footer-brand .logo, .footer .logo');
      if (footerLogo && !footerLogo.querySelector('.powered-by-tag')) {
        const tag = document.createElement('span');
        tag.className = 'powered-by-tag';
        tag.style.cssText = 'font-size: 9px; font-weight: 700; color: #94a3b8; margin-top: 4px; display: block;';
        tag.innerHTML = 'Powered by <span style="color:var(--color-accent, #E53E3E)">Careonys</span>';
        footerLogo.appendChild(tag);
        
        footerLogo.style.display = 'flex';
        footerLogo.style.flexDirection = 'column';
        footerLogo.style.alignItems = 'flex-start';
      }
    }
  },

  // --- MÓDULO 1: RECLUTAMIENTO Y LEGAJOS (CUIDADORES) ---
  async getAspirantes(filter = {}) {
    if (this.useSupabase) {
      // Filtrar automáticamente por el tenant activo
      const activeFilter = { ...filter };
      if (this.currentTenant) {
        activeFilter.tenant_id = this.currentTenant.id;
      }
      return await this._supabaseGet('caregivers', activeFilter);
    }
    
    // Mock Local Data
    let data = JSON.parse(localStorage.getItem('careonys_aspirantes') || '[]');
    return data;
  },

  async registrarAspirante(postulacionData) {
    if (this.useSupabase) {
      const dbData = { ...postulacionData };
      if (this.currentTenant) {
        dbData.tenant_id = this.currentTenant.id;
      }
      return await this._supabasePost('caregivers', dbData);
    }
    let data = await this.getAspirantes();
    const nuevo = {
      id: 'asp-' + Date.now(),
      ...postulacionData,
      estado: 'en_revision',
      fechaRegistro: new Date().toISOString().split('T')[0]
    };
    data.push(nuevo);
    localStorage.setItem('careonys_aspirantes', JSON.stringify(data));
    return nuevo;
  },

  async cambiarEstadoAspirante(id, nuevoEstado, notaInterna = '') {
    if (this.useSupabase) {
      return await this._supabasePatch('caregivers', id, { estado: nuevoEstado, notaPrestadora: notaInterna });
    }
    let data = await this.getAspirantes();
    const index = data.findIndex(a => a.id === id);
    if (index !== -1) {
      data[index].estado = nuevoEstado;
      data[index].notaPrestadora = notaInterna;
      data[index].fechaValidacion = new Date().toISOString();
      localStorage.setItem('careonys_aspirantes', JSON.stringify(data));
      return data[index];
    }
    throw new Error('Aspirante no encontrado');
  },

  // --- MÓDULO 2: BÚSQUEDAS Y SOLICITUDES DE FAMILIAS ---
  async getBusquedasFamilia() {
    if (this.useSupabase) {
      const filter = {};
      if (this.currentTenant) {
        filter.tenant_id = this.currentTenant.id;
      }
      return await this._supabaseGet('care_searches', filter);
    }
    let data = JSON.parse(localStorage.getItem('careonys_searches') || '[]');
    return data;
  },

  async crearBusquedaFamilia(busquedaData) {
    if (this.useSupabase) {
      const dbData = { ...busquedaData };
      if (this.currentTenant) {
        dbData.tenant_id = this.currentTenant.id;
      }
      return await this._supabasePost('care_searches', dbData);
    }
    let data = await this.getBusquedasFamilia();
    const nueva = {
      id: 'req-' + Date.now(),
      ...busquedaData,
      estado: 'activa',
      fechaCreacion: new Date().toISOString()
    };
    data.push(nueva);
    localStorage.setItem('careonys_searches', JSON.stringify(data));
    return nueva;
  },

  // --- MÓDULO 3: FICHADO GPS Y BITÁCORA MÉDICA ---
  async registrarFichadoGPS(fichadoData) {
    if (this.useSupabase) {
      const dbData = {
        caregiver_id: fichadoData.caregiverId || fichadoData.cuidadorId,
        latitude: fichadoData.latitude || fichadoData.lat,
        longitude: fichadoData.longitude || fichadoData.lng,
        event_type: fichadoData.tipoEvent || fichadoData.event_type || fichadoData.estado
      };
      return await this._supabaseRequest('POST', 'clock_ins', dbData);
    }
    let data = JSON.parse(localStorage.getItem('careonys_clockins') || '[]');
    const nuevoFichado = {
      id: 'clock-' + Date.now(),
      ...fichadoData,
      timestamp: new Date().toISOString()
    };
    data.push(nuevoFichado);
    localStorage.setItem('careonys_clockins', JSON.stringify(data));
    return nuevoFichado;
  },

  async registrarBitacoraDiaria(entryData) {
    if (this.useSupabase) {
      const dbData = {
        search_id: entryData.searchId || entryData.busquedaId,
        caregiver_id: entryData.caregiverId || entryData.cuidadorId,
        blood_pressure: entryData.presion || entryData.blood_pressure,
        glycemia: entryData.glucemia || entryData.glycemia,
        medications_administered: entryData.medicamentos || entryData.medications,
        daily_notes: entryData.notas || entryData.daily_notes
      };
      return await this._supabaseRequest('POST', 'logbook_entries', dbData);
    }
    let data = JSON.parse(localStorage.getItem('careonys_bitacora') || '[]');
    const nuevaEntry = {
      id: 'log-' + Date.now(),
      ...entryData,
      timestamp: new Date().toISOString()
    };
    data.push(nuevaEntry);
    localStorage.setItem('careonys_bitacora', JSON.stringify(data));
    return nuevaEntry;
  },

  // --- INTEGRACIÓN REST DE SUPABASE ---
  async _supabaseRequest(method, table, data = null, queryParams = {}) {
    const urlObj = new URL(`${this.supabaseUrl}/rest/v1/${table}`);
    Object.keys(queryParams).forEach(key => urlObj.searchParams.append(key, queryParams[key]));
    
    const headers = {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const options = {
      method: method,
      headers: headers
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(urlObj.toString(), options);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Request failed: ${response.statusText} - ${errText}`);
    }
    return await response.json();
  },

  async _supabaseGet(table, filter = {}) {
    const queryParams = {};
    if (filter.id) {
      queryParams.id = `eq.${filter.id}`;
    }
    if (filter.estado) {
      queryParams.verification_status = `eq.${filter.estado}`;
    }
    if (filter.tenant_id) {
      queryParams.tenant_id = `eq.${filter.tenant_id}`;
    }
    const res = await this._supabaseRequest('GET', table, null, queryParams);
    return res.map(row => this._mapFromDatabase(table, row));
  },

  async _supabasePost(table, data) {
    const dbData = this._mapToDatabase(table, data);
    const res = await this._supabaseRequest('POST', table, dbData);
    return res[0] ? this._mapFromDatabase(table, res[0]) : null;
  },

  async _supabasePatch(table, id, data) {
    const dbData = this._mapToDatabase(table, data);
    const queryParams = { id: `eq.${id}` };
    const res = await this._supabaseRequest('PATCH', table, dbData, queryParams);
    return res[0] ? this._mapFromDatabase(table, res[0]) : null;
  },

  _mapFromDatabase(table, row) {
    if (table === 'caregivers') {
      return {
        id: row.id,
        nombre: row.full_name,
        dni: row.dni,
        telefono: row.phone,
        email: row.email,
        profesion: row.profession,
        zona: row.zone,
        patologias: row.pathologies || [],
        tareas: row.tasks || [],
        documentos: row.documents || {},
        estado: row.verification_status,
        fechaRegistro: row.created_at ? row.created_at.split('T')[0] : ''
      };
    }
    if (table === 'care_searches') {
      return {
        id: row.id,
        paciente: row.patient_name,
        patologias: row.pathologies_required || [],
        horarios: row.schedule_type,
        grillaHorarios: row.grid_schedule_7x3 || {},
        estado: row.status,
        fechaCreacion: row.created_at
      };
    }
    return row;
  },

  _mapToDatabase(table, data) {
    if (table === 'caregivers') {
      const row = {};
      if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
      if (data.nombre !== undefined) row.full_name = data.nombre;
      if (data.dni !== undefined) row.dni = data.dni;
      if (data.telefono !== undefined) row.phone = data.telefono;
      if (data.email !== undefined) row.email = data.email;
      if (data.profesion !== undefined) row.profession = data.profesion;
      if (data.zona !== undefined) row.zone = data.zona || data.zonaResidencia;
      if (data.patologias !== undefined) row.pathologies = data.patologias;
      if (data.tareas !== undefined) row.tasks = data.tareas;
      if (data.documentos !== undefined) row.documents = data.documentos;
      if (data.estado !== undefined) row.verification_status = data.estado;
      return row;
    }
    if (table === 'care_searches') {
      const row = {};
      if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
      if (data.paciente !== undefined) row.patient_name = data.paciente;
      if (data.patologias !== undefined) row.pathologies_required = data.patologias;
      if (data.horarios !== undefined) row.schedule_type = data.horarios;
      if (data.grillaHorarios !== undefined) row.grid_schedule_7x3 = data.grillaHorarios;
      if (data.estado !== undefined) row.status = data.estado;
      return row;
    }
    return data;
  }
};

// Inicializar el Tenant automáticamente al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  CareonysAPI.initTenant();
});

window.CareonysAPI = CareonysAPI;
