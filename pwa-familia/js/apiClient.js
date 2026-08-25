/* ===================================================
   CAPA DE ACCESO A DATOS
   Desarrollado por CeltaTech.
   Lectura y escritura contra Supabase, con resolución de Organización.
=================================================== */

const ClienteDatos = {
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
  //   2. **Sin sesión, el enlace elige qué directorio se muestra.** Es lo único
  //      que puede hacer sin datos detrás, y no decide ningún acceso: quien
  //      llegue con `?tenant=` a una Prestadora ajena ve su directorio y
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

      // Sin sesión: qué directorio mostrar. Del parámetro o del subdominio.
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

      if (slug) {
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

  // Cuando no hay sesión ni enlace que valga, el directorio muestra la primera
  // Prestadora que devuelve la base. Es una decisión de presentación y no de
  // permisos: sin sesión no se llega a ningún dato de nadie.
  async _prestadoraDeRespaldo() {
    try {
      const res = await this._supabaseRequest('GET', 'tenants', null, { limit: '1' });
      if (res && res[0]) return res[0];
    } catch (err) {
      console.error('No se pudo leer ninguna Prestadora:', err);
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
        tag.textContent = 'Powered by ';
        const marca = document.createElement('span');
        marca.style.cssText = 'color:var(--marca-prestadora-acento); font-weight: 900;';
        marca.textContent = Identidad.datos.nombre;
        tag.appendChild(marca);
        footerLogo.appendChild(tag);

        footerLogo.style.display = 'flex';
        footerLogo.style.flexDirection = 'column';
        footerLogo.style.alignItems = 'flex-start';
      }
    }
  },

  // --- MÓDULO 1: RECLUTAMIENTO Y LEGAJOS (CUIDADORES) ---
  async getAspirantes(filter = {}) {
    // Filtrar automáticamente por el tenant activo
    const activeFilter = { ...filter };
    if (this.currentTenant) {
      activeFilter.tenant_id = this.currentTenant.id;
    }
    return await this._supabaseGet('caregivers', activeFilter);
  },

  async registrarAspirante(postulacionData) {
    const dbData = { ...postulacionData };
    if (this.currentTenant) {
      dbData.tenant_id = this.currentTenant.id;
    }
    return await this._supabasePost('caregivers', dbData);
  },

  // Guarda el legajo del Asistente: las cuatro fichas repetibles, lo que
  // autoriza al cerrar el alta (migración 0004) y su disponibilidad horaria
  // (migración 0012). Las claves de cada fila salen de data/catalogo-fichas.json,
  // data/catalogo-autorizaciones.json y data/catalogo-disponibilidad.json, y
  // coinciden con las columnas de cada tabla.
  async guardarLegajoAsistente(caregiverId, legajo) {
    const tablas = {
      matriculas: 'matriculas_asistente',
      estudios: 'estudios_asistente',
      experiencia: 'experiencia_laboral_asistente',
      referencias: 'referencias_asistente'
    };

    const tenantId = this.currentTenant ? this.currentTenant.id : null;
    const marcar = fila => ({ ...fila, caregiver_id: caregiverId, tenant_id: tenantId });
    const guardado = {};

    for (const clave of Object.keys(tablas)) {
      const filas = (legajo[clave] || []).map(marcar);
      if (filas.length > 0) {
        guardado[clave] = await this._supabaseRequest('POST', tablas[clave], filas);
      }
    }

    if (legajo.autorizaciones) {
      guardado.autorizaciones = await this._supabaseRequest('POST', 'autorizaciones_asistente',
        marcar({ ...legajo.autorizaciones, respondido_el: new Date().toISOString() }));
    }

    // La disponibilidad va a dos tablas: lo general a una fila propia, y cada
    // casillero marcado de la grilla a una fila de franjas_asistente. Antes de
    // la migración 0012 la grilla llegaba hasta acá y se descartaba en silencio,
    // porque no había dónde ponerla: era el pendiente 23.
    if (legajo.disponibilidad) {
      const franjas = legajo.disponibilidad.franjas || [];
      const general = { ...legajo.disponibilidad };
      delete general.franjas;
      guardado.disponibilidad = await this._supabaseRequest('POST', 'disponibilidad_asistente',
        marcar({ ...general, respondido_el: new Date().toISOString() }));
      if (franjas.length > 0) {
        guardado.franjas = await this._supabaseRequest('POST', 'franjas_asistente',
          franjas.map(marcar));
      }
    }

    return guardado;
  },

  async cambiarEstadoAspirante(id, nuevoEstado, notaInterna = '') {
    return await this._supabasePatch('caregivers', id, { estado: nuevoEstado, notaPrestadora: notaInterna });
  },

  // --- MÓDULO 2: BÚSQUEDAS Y SOLICITUDES DE FAMILIAS ---
  async getBusquedasFamilia() {
    const filter = {};
    if (this.currentTenant) {
      filter.tenant_id = this.currentTenant.id;
    }
    return await this._supabaseGet('care_searches', filter);
  },

  async crearBusquedaFamilia(busquedaData) {
    const dbData = { ...busquedaData };
    if (this.currentTenant) {
      dbData.tenant_id = this.currentTenant.id;
    }
    return await this._supabasePost('care_searches', dbData);
  },

  // Alias con campos camelCase — usado por pwa-familia/index.html (screen-publicar)
  // Normaliza el vocabulario de la UI al vocabulario interno del mapper.
  async crearBusqueda(busquedaData) {
    return await this.crearBusquedaFamilia({
      paciente:      busquedaData.patientName  || busquedaData.paciente,
      patologias:    busquedaData.pathologiesRequired || busquedaData.patologias || [],
      horarios:      busquedaData.scheduleType || busquedaData.horarios,
      grillaHorarios: busquedaData.gridSchedule7x3 || busquedaData.grillaHorarios || {},
      family_user_id: busquedaData.familyUserId || busquedaData.family_user_id || null,
      // Migración 0013. Cada uno con sus dos nombres porque la pantalla del
      // teléfono escribe algunos en inglés y otros en castellano; este atajo
      // existe justamente para absorber esa mezcla.
      zona:            busquedaData.zone || busquedaData.zona,
      descripcion:     busquedaData.description || busquedaData.descripcion,
      motivoConsulta:  busquedaData.consultationReason || busquedaData.motivoConsulta,
      tareas:          busquedaData.tasksRequired || busquedaData.tareas,
      profesion:       busquedaData.professionRequired || busquedaData.profesion,
      generoPreferido: busquedaData.preferredGender || busquedaData.generoPreferido,
      frecuencia:      busquedaData.frequency || busquedaData.frecuencia
    });
  },

  // --- MÓDULO 3: FICHADO GPS Y BITÁCORA MÉDICA ---
  async registrarFichadoGPS(fichadoData) {
    return await this._supabaseRequest('POST', 'clock_ins', {
      caregiver_id: fichadoData.caregiverId || fichadoData.cuidadorId,
      latitude: fichadoData.latitude || fichadoData.lat,
      longitude: fichadoData.longitude || fichadoData.lng,
      event_type: fichadoData.tipoEvent || fichadoData.event_type || fichadoData.estado
    });
  },

  async registrarBitacoraDiaria(entryData) {
    return await this._supabaseRequest('POST', 'logbook_entries', {
      search_id: entryData.searchId || entryData.busquedaId,
      caregiver_id: entryData.caregiverId || entryData.cuidadorId,
      blood_pressure: entryData.presion || entryData.blood_pressure,
      glycemia: entryData.glucemia || entryData.glycemia,
      medications_administered: entryData.medicamentos || entryData.medications,
      daily_notes: entryData.notas || entryData.daily_notes
    });
  },

  async getBitacoraDiaria(searchId = null) {
    const queryParams = {};
    if (searchId) {
      queryParams.search_id = `eq.${searchId}`;
    }
    queryParams.order = 'created_at.desc';
    return await this._supabaseRequest('GET', 'logbook_entries', null, queryParams);
  },

  // --- EL EXAMEN ---
  // La corrección la hace la base (migración 0008), y no por prolijidad: la
  // respuesta correcta vive en una columna que no tiene permiso de lectura
  // para nadie. Acá sólo se piden los enunciados y se manda lo contestado.

  // Las evaluaciones que esta persona puede rendir. Salen de la base porque
  // son un catálogo (regla 5.1): ninguna pantalla tiene una clave escrita
  // adentro. La política ya devuelve sólo las publicadas, las generales y las
  // de su Prestadora.
  async getEvaluaciones() {
    return await this._supabaseRequest('GET', 'evaluaciones', null, {
      select: 'id,clave,nombre,porcentaje_para_aprobar,intentos_maximos,curso_id',
      order: 'nombre.asc'
    });
  },

  // Devuelve la evaluación con sus preguntas y las opciones de cada una.
  // Las opciones salen de `opciones_para_responder`, que es la vista sin la
  // columna de la respuesta: pedirle `opciones_pregunta` directamente no
  // devuelve nada, y así tiene que quedarse.
  async getEvaluacion(clave) {
    const evaluaciones = await this._supabaseRequest('GET', 'evaluaciones', null, {
      clave: `eq.${clave}`,
      select: 'id,clave,nombre,porcentaje_para_aprobar,intentos_maximos'
    });
    const evaluacion = evaluaciones[0];
    if (!evaluacion) return null;

    const preguntas = await this._supabaseRequest('GET', 'preguntas_evaluacion', null, {
      evaluacion_id: `eq.${evaluacion.id}`,
      select: 'id,clave,enunciado,orden',
      order: 'orden.asc'
    });
    if (preguntas.length === 0) return { ...evaluacion, preguntas: [] };

    const opciones = await this._supabaseRequest('GET', 'opciones_para_responder', null, {
      pregunta_id: `in.(${preguntas.map(p => p.id).join(',')})`,
      select: 'id,pregunta_id,clave,texto,orden',
      order: 'orden.asc'
    });

    return {
      ...evaluacion,
      preguntas: preguntas.map(pregunta => ({
        ...pregunta,
        opciones: opciones.filter(o => o.pregunta_id === pregunta.id)
      }))
    };
  },

  // `respuestas` es un objeto: identificador de pregunta → identificador de la
  // opción elegida. Lo que devuelve es lo que calculó la base, que es el único
  // resultado que vale.
  async rendirEvaluacion(evaluacionId, respuestas) {
    return await this._supabaseRequest('POST', 'rpc/rendir_evaluacion', {
      p_evaluacion: evaluacionId,
      p_respuestas: respuestas
    });
  },

  // Los intentos de quien inició sesión. La política de la base ya decide
  // cuáles puede ver: los propios, y los de su Prestadora si es del personal.
  async getIntentosEvaluacion(evaluacionId) {
    const queryParams = {
      select: 'id,evaluacion_id,porcentaje,aprobado,rendido_el',
      order: 'rendido_el.desc'
    };
    if (evaluacionId) queryParams.evaluacion_id = `eq.${evaluacionId}`;
    return await this._supabaseRequest('GET', 'intentos_evaluacion', null, queryParams);
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
        contacto: row.contact_info || null,
        horarios: row.schedule_type,
        grillaHorarios: row.grid_schedule_7x3 || {},
        estado: row.status,
        // Lo que la Familia pide y hasta la migración 0013 no tenía dónde
        // guardarse.
        zona: row.zone || '',
        descripcion: row.description || '',
        motivoConsulta: row.consultation_reason || '',
        tareas: row.tasks_required || [],
        profesion: row.profession_required || '',
        generoPreferido: row.preferred_gender || '',
        frecuencia: row.frequency || '',
        fechaCreacion: row.created_at
      };
    }
    return row;
  },

  // El traductor de ida: del nombre que usa la pantalla al nombre de la columna.
  //
  // Cada campo se declara una sola vez, con `llevar`, y de esa misma lista sale
  // la de nombres conocidos. Eso es lo que permite el aviso del final: hasta la
  // 0013 el traductor descartaba en silencio todo lo que no reconocía, y una
  // pantalla podía preguntar algo durante meses sin que se guardara nunca. Así
  // se perdieron la grilla de disponibilidad, la zona y la descripción de una
  // búsqueda. La falla se veía recién cuando alguien iba a buscar el dato a la
  // base y no estaba; ahora se ve la primera vez que se prueba la pantalla.
  _mapToDatabase(table, data) {
    const row = {};
    const conocidas = new Set();

    // `origen` es como lo llama la pantalla; `destino`, como se llama la
    // columna. El tercero es para los pocos campos que además necesitan una
    // vuelta de tuerca antes de guardarse.
    const llevar = (origen, destino, ajustar) => {
      conocidas.add(origen);
      if (data[origen] === undefined) return;
      row[destino] = ajustar ? ajustar(data[origen]) : data[origen];
    };

    if (table === 'caregivers') {
      llevar('tenant_id', 'tenant_id');
      llevar('user_id', 'user_id');
      llevar('nombre', 'full_name');
      llevar('dni', 'dni');
      llevar('telefono', 'phone');
      llevar('email', 'email');
      llevar('profesion', 'profession');
      llevar('zona', 'zone', (v) => v || data.zonaResidencia);
      conocidas.add('zonaResidencia');   // se lee ahí arriba: no es un perdido
      llevar('patologias', 'pathologies');
      llevar('tareas', 'tasks');
      llevar('documentos', 'documents');
      llevar('cuit', 'cuit');
      llevar('domicilio', 'address');
      llevar('cbu', 'bank_info');
      llevar('referencia', 'reference_info');
      llevar('educacion', 'education_info');
      llevar('fechaNacimiento', 'birthdate', (v) => v || null);
      llevar('genero', 'gender');
      llevar('nacionalidad', 'nationality');
      llevar('valorHora', 'hourly_rate', (v) => v || null);
      llevar('estado', 'verification_status');
    } else if (table === 'care_searches') {
      llevar('tenant_id', 'tenant_id');
      llevar('family_user_id', 'family_user_id');
      llevar('paciente', 'patient_name');
      llevar('patologias', 'pathologies_required');
      llevar('horarios', 'schedule_type');
      llevar('grillaHorarios', 'grid_schedule_7x3');
      llevar('contacto', 'contact_info');
      llevar('estado', 'status');
      // Migración 0013: lo que las pantallas de la Familia ya preguntaban.
      llevar('zona', 'zone');
      llevar('descripcion', 'description');
      llevar('motivoConsulta', 'consultation_reason');
      llevar('tareas', 'tasks_required');
      llevar('profesion', 'profession_required');
      llevar('generoPreferido', 'preferred_gender');
      llevar('frecuencia', 'frequency');
    } else {
      // Una tabla sin traducción propia viaja tal cual: los nombres que le
      // llegan ya son los de sus columnas.
      return data;
    }

    const perdidas = Object.keys(data).filter((c) => !conocidas.has(c));
    if (perdidas.length) {
      console.warn('ClienteDatos: la tabla «' + table + '» no tiene dónde guardar '
        + perdidas.map((c) => '«' + c + '»').join(', ')
        + '. Eso se pregunta en pantalla y no se está guardando.');
    }
    return row;
  }
};

// Inicializar el Tenant automáticamente al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  ClienteDatos.initTenant();
});

window.ClienteDatos = ClienteDatos;
