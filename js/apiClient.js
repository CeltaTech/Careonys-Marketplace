/* ===================================================
   CAREONYS MARKETPLACE — API Client Abstraction Layer
   Desarrollado por CeltaTech (SaaS)
   Nota: Actualmente opera en modo Mock/LocalStorage.
   Diseñado para conectar con Supabase cambiando un solo flag.
=================================================== */

const CareonysAPI = {
  useSupabase: false, // Cambiar a true cuando se configuren las credenciales de Supabase
  supabaseUrl: '',
  supabaseKey: '',

  // --- MÓDULO 1: RECLUTAMIENTO Y LEGAJOS (CUIDADORES) ---
  async getAspirantes(filter = {}) {
    if (this.useSupabase) {
      // Implementación Supabase Client
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
          estado: 'en_revision', // 'en_revision', 'validado_prestadora', 'rechazado'
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
    let data = JSON.parse(localStorage.getItem('careonys_searches') || '[]');
    return data;
  },

  async crearBusquedaFamilia(busquedaData) {
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
    let data = JSON.parse(localStorage.getItem('careonys_bitacora') || '[]');
    const nuevaEntry = {
      id: 'log-' + Date.now(),
      ...entryData,
      timestamp: new Date().toISOString()
    };
    data.push(nuevaEntry);
    localStorage.setItem('careonys_bitacora', JSON.stringify(data));
    return nuevaEntry;
  }
};

window.CareonysAPI = CareonysAPI;
