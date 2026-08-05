/* ===================================================
   CAREONYS MARKETPLACE — API Client Abstraction Layer
   Desarrollado por CeltaTech (SaaS)
   Nota: Actualmente opera en modo Supabase nativo vía REST.
=================================================== */

const CareonysAPI = {
  useSupabase: true,
  supabaseUrl: 'https://pfbvpncavvlgmmvqkgbo.supabase.co',
  supabaseKey: 'sb_publishable_rmhuO0J5QsE5mw-5fgf-Hw_9tCHd1di',

  // --- MÓDULO 1: RECLUTAMIENTO Y LEGAJOS (CUIDADORES) ---
  async getAspirantes(filter = {}) {
    if (this.useSupabase) {
      return await this._supabaseGet('caregivers', filter);
    }
    // Mock Local Data
    let data = JSON.parse(localStorage.getItem('careonys_aspirantes') || '[]');
    if (data.length === 0) {
      data = [
        {
          id: 'asp-101',
          nombre: 'Claudia González',
          dni: '35422573',
          telefono: '11 4589 1234',
          email: 'claudia.gonzalez@email.com',
          profesion: 'Cuidadora Domiciliaria',
          zona: 'Palermo, CABA',
          patologias: ['Alzheimer', 'Parkinson'],
          tareas: ['Higiene y confort', 'Control de signos vitales'],
          documentos: { dni: 'dni_claudia.pdf', penales: 'penales_claudia.pdf', titulo: 'titulo_gerontologia.pdf' },
          estado: 'en_revision',
          fechaRegistro: '2026-08-04'
        },
        {
          id: 'asp-102',
          nombre: 'Roberto Gómez',
          dni: '32114902',
          telefono: '11 3902 4411',
          email: 'roberto.gomez@email.com',
          profesion: 'Enfermero Universitario',
          zona: 'Belgrano, CABA',
          patologias: ['ACV', 'Diabetes', 'Pacientes Postrados'],
          tareas: ['Aplicación de inyecciones', 'Control de signos vitales', 'Administración medicación'],
          documentos: { dni: 'dni_roberto.pdf', penales: 'penales_roberto.pdf', titulo: 'titulo_enfermeria.pdf' },
          estado: 'validado_prestadora',
          fechaRegistro: '2026-08-01'
        }
      ];
      localStorage.setItem('careonys_aspirantes', JSON.stringify(data));
    }
    return data;
  },

  async registrarAspirante(postulacionData) {
    if (this.useSupabase) {
      return await this._supabasePost('caregivers', postulacionData);
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
      return await this._supabaseGet('care_searches');
    }
    let data = JSON.parse(localStorage.getItem('careonys_searches') || '[]');
    return data;
  },

  async crearBusquedaFamilia(busquedaData) {
    if (this.useSupabase) {
      return await this._supabasePost('care_searches', busquedaData);
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

window.CareonysAPI = CareonysAPI;
