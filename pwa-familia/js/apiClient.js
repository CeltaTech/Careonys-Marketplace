/* ===================================================
   CAPA DE ACCESO A DATOS
   Desarrollado por CeltaTech.
   Lectura y escritura contra Supabase, con resolución de Organización.
=================================================== */

const ClienteDatos = {
  useSupabase: true,
  supabaseUrl: 'https://pfbvpncavvlgmmvqkgbo.supabase.co',
  supabaseKey: 'sb_publishable_rmhuO0J5QsE5mw-5fgf-Hw_9tCHd1di',
  currentTenant: null,
  currentAuthToken: null,   // ← JWT del usuario autenticado (seteado por auth.js)

  // Almacena el JWT del usuario activo para usar en headers REST
  setAuthToken(token) {
    this.currentAuthToken = token;
  },

  // --- QUIÉN ES LA PRESTADORA ---
  // El orden importa y es éste, no el inverso:
  //
  //   1. **Con sesión, la Prestadora sale del perfil.** Es el mismo dato que
  //      miran las políticas de la base (`prestadora_actual()`), así que la
  //      pantalla y la base no pueden discrepar.
  //   2. **Sin sesión, el enlace elige qué vidriera se muestra.** Es lo único
  //      que puede hacer sin datos detrás, y no decide ningún acceso: quien
  //      llegue con `?tenant=` a una Prestadora ajena ve su vidriera pública y
  //      nada más, porque las tablas con datos exigen sesión.
  //
  // Al revés sería lo de antes: la barra de direcciones eligiendo de quién son
  // los datos que se piden.
  // Varias pantallas la llaman por su cuenta y el arranque automático la llama
  // igual: se resuelve una sola vez por carga y las demás esperan a la misma.
  async initTenant() {
    if (!this._resolucionEnCurso) this._resolucionEnCurso = this._resolverPrestadora();
    return this._resolucionEnCurso;
  },

  _resolucionEnCurso: null,

  async _resolverPrestadora() {
    try {
      if (window.Sesion) {
        const perfil = await Sesion.perfil();
        if (perfil && perfil.tenant_id) {
          const propia = await this._supabaseRequest(
            'GET', 'tenants', null, { id: `eq.${perfil.tenant_id}` });
          if (propia && propia[0]) {
            this.currentTenant = propia[0];
            this._applyBranding(this.currentTenant);
            return this.currentTenant;
          }
        }
      }

      // Sin sesión: qué vidriera mostrar. Del parámetro o del subdominio.
      const urlParams = new URLSearchParams(window.location.search);
      let slug = urlParams.get('tenant') || urlParams.get('t');

      if (!slug) {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (hostname.endsWith('.vercel.app')) {
          if (parts.length > 3) slug = parts[0];
        } else if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
          slug = parts[0];
        }
      }

      if (slug && this.useSupabase) {
        const res = await this._supabaseRequest('GET', 'tenants', null, { slug: `eq.${slug}` });
        if (res && res[0]) {
          this.currentTenant = res[0];
          this._applyBranding(this.currentTenant);
          return this.currentTenant;
        }
      }

      this.currentTenant = await this._prestadoraDeRespaldo();
    } catch (err) {
      console.error('No se pudo resolver la Prestadora:', err);
      this.currentTenant = await this._prestadoraDeRespaldo();
    }

    if (this.currentTenant) this._applyBranding(this.currentTenant);
    return this.currentTenant;
  },

  // Cuando no hay sesión ni enlace que valga, la vidriera muestra la primera
  // Prestadora que devuelve la base. Es una decisión de presentación y no de
  // permisos: sin sesión no se llega a ningún dato de nadie.
  async _prestadoraDeRespaldo() {
    if (this.useSupabase) {
      try {
        const res = await this._supabaseRequest('GET', 'tenants', null, { limit: '1' });
        if (res && res[0]) return res[0];
      } catch (err) {
        console.error('No se pudo leer ninguna Prestadora:', err);
      }
    }
    return null;
  },

  _applyBranding(tenant) {
    if (!tenant) return;
    // Inyectar variables CSS de colores al root
    if (tenant.primary_color) {
      document.documentElement.style.setProperty('--marca-prestadora', tenant.primary_color);
    }
    if (tenant.accent_color) {
      document.documentElement.style.setProperty('--marca-prestadora-acento', tenant.accent_color);
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

    // La insignia del producto va solo en el pie, y solo cuando lo que se muestra
    // es una Prestadora cliente y no el producto mismo.
    if (!Identidad.esProductoPropio(tenant)) {
      const footerLogo = document.querySelector('.footer-brand .logo, .footer .logo');
      if (footerLogo && !footerLogo.querySelector('.powered-by-tag')) {
        const tag = document.createElement('span');
        tag.className = 'powered-by-tag';
        tag.style.cssText = 'font-size: 11px; font-weight: 700; color: var(--texto-secundario); margin-top: 6px; display: block; letter-spacing: 0.3px;';
        tag.innerHTML = 'Powered by <span style="color:var(--marca-prestadora-acento); font-weight: 900;">' + Identidad.datos.nombre + '</span>';
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
    let data = JSON.parse(localStorage.getItem('aspirantes') || '[]');
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
    localStorage.setItem('aspirantes', JSON.stringify(data));
    return nuevo;
  },

  // Guarda el legajo del Asistente: las cuatro fichas repetibles y las dos
  // banderas de consentimiento (migracion 0004). Las claves de cada fila salen
  // de data/catalogo-fichas.json y coinciden con las columnas de la tabla.
  async guardarLegajoAsistente(caregiverId, legajo) {
    const tablas = {
      matriculas: 'matriculas_asistente',
      estudios: 'estudios_asistente',
      experiencia: 'experiencia_laboral_asistente',
      referencias: 'referencias_asistente'
    };

    if (!this.useSupabase) {
      const guardados = JSON.parse(localStorage.getItem('legajos') || '{}');
      guardados[caregiverId] = legajo;
      localStorage.setItem('legajos', JSON.stringify(guardados));
      return guardados[caregiverId];
    }

    const tenantId = this.currentTenant ? this.currentTenant.id : null;
    const marcar = fila => ({ ...fila, caregiver_id: caregiverId, tenant_id: tenantId });
    const guardado = {};

    for (const clave of Object.keys(tablas)) {
      const filas = (legajo[clave] || []).map(marcar);
      if (filas.length > 0) {
        guardado[clave] = await this._supabaseRequest('POST', tablas[clave], filas);
      }
    }

    if (legajo.banderas) {
      guardado.banderas = await this._supabaseRequest('POST', 'banderas_asistente',
        marcar({ ...legajo.banderas, respondido_el: new Date().toISOString() }));
    }

    return guardado;
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
      localStorage.setItem('aspirantes', JSON.stringify(data));
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
    let data = JSON.parse(localStorage.getItem('busquedas') || '[]');
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
    localStorage.setItem('busquedas', JSON.stringify(data));
    return nueva;
  },

  // Alias con campos camelCase — usado por pwa-familia/index.html (screen-publicar)
  // Normaliza el vocabulario de la UI al vocabulario interno del mapper.
  async crearBusqueda(busquedaData) {
    return await this.crearBusquedaFamilia({
      paciente:      busquedaData.patientName  || busquedaData.paciente,
      patologias:    busquedaData.pathologiesRequired || busquedaData.patologias || [],
      horarios:      busquedaData.scheduleType || busquedaData.horarios,
      grillaHorarios: busquedaData.gridSchedule7x3 || busquedaData.grillaHorarios || {},
      family_user_id: busquedaData.familyUserId || busquedaData.family_user_id || null
    });
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
    let data = JSON.parse(localStorage.getItem('fichadas') || '[]');
    const nuevoFichado = {
      id: 'clock-' + Date.now(),
      ...fichadoData,
      timestamp: new Date().toISOString()
    };
    data.push(nuevoFichado);
    localStorage.setItem('fichadas', JSON.stringify(data));
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
    let data = JSON.parse(localStorage.getItem('bitacora') || '[]');
    const nuevaEntry = {
      id: 'log-' + Date.now(),
      ...entryData,
      timestamp: new Date().toISOString()
    };
    data.push(nuevaEntry);
    localStorage.setItem('bitacora', JSON.stringify(data));
    return nuevaEntry;
  },

  async getBitacoraDiaria(searchId = null) {
    if (this.useSupabase) {
      const queryParams = {};
      if (searchId) {
        queryParams.search_id = `eq.${searchId}`;
      }
      queryParams.order = 'created_at.desc';
      return await this._supabaseRequest('GET', 'logbook_entries', null, queryParams);
    }
    let data = JSON.parse(localStorage.getItem('bitacora') || '[]');
    return data.reverse();
  },

  // --- INTEGRACIÓN REST DE SUPABASE ---
  async _supabaseRequest(method, table, data = null, queryParams = {}) {
    const urlObj = new URL(`${this.supabaseUrl}/rest/v1/${table}`);
    Object.keys(queryParams).forEach(key => urlObj.searchParams.append(key, queryParams[key]));
    
    const headers = {
      'apikey': this.supabaseKey,
      // Usar JWT del usuario si está disponible (activa RLS), si no usar anon key
      'Authorization': `Bearer ${this.currentAuthToken || this.supabaseKey}`,
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
        cuit: row.cuit || '',
        domicilio: row.address || '',
        cbu: row.bank_info || '',
        referencia: row.reference_info || {},
        educacion: row.education_info || {},
        fechaNacimiento: row.birthdate || '',
        genero: row.gender || '',
        nacionalidad: row.nationality || '',
        valorHora: row.hourly_rate || '',
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
      if (data.user_id !== undefined) row.user_id = data.user_id;
      if (data.nombre !== undefined) row.full_name = data.nombre;
      if (data.dni !== undefined) row.dni = data.dni;
      if (data.telefono !== undefined) row.phone = data.telefono;
      if (data.email !== undefined) row.email = data.email;
      if (data.profesion !== undefined) row.profession = data.profesion;
      if (data.zona !== undefined) row.zone = data.zona || data.zonaResidencia;
      if (data.patologias !== undefined) row.pathologies = data.patologias;
      if (data.tareas !== undefined) row.tasks = data.tareas;
      if (data.documentos !== undefined) row.documents = data.documentos;
      if (data.cuit !== undefined) row.cuit = data.cuit;
      if (data.domicilio !== undefined) row.address = data.domicilio;
      if (data.cbu !== undefined) row.bank_info = data.cbu;
      if (data.referencia !== undefined) row.reference_info = data.referencia;
      if (data.educacion !== undefined) row.education_info = data.educacion;
      if (data.fechaNacimiento !== undefined) row.birthdate = data.fechaNacimiento || null;
      if (data.genero !== undefined) row.gender = data.genero;
      if (data.nacionalidad !== undefined) row.nationality = data.nacionalidad;
      if (data.valorHora !== undefined) row.hourly_rate = data.valorHora || null;
      if (data.estado !== undefined) row.verification_status = data.estado;
      return row;
    }
    if (table === 'care_searches') {
      const row = {};
      if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
      if (data.family_user_id !== undefined) row.family_user_id = data.family_user_id;
      if (data.paciente !== undefined) row.patient_name = data.paciente;
      if (data.patologias !== undefined) row.pathologies_required = data.patologias;
      if (data.horarios !== undefined) row.schedule_type = data.horarios;
      if (data.grillaHorarios !== undefined) row.grid_schedule_7x3 = data.grillaHorarios;
      if (data.contacto !== undefined) row.pathologies_required = [...(Array.isArray(data.patologias) ? data.patologias : []), { contacto: data.contacto }];
      if (data.estado !== undefined) row.status = data.estado;
      return row;
    }
    return data;
  }
};

// Inicializar el Tenant automáticamente al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  ClienteDatos.initTenant();
});

window.ClienteDatos = ClienteDatos;
