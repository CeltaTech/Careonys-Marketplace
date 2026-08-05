/**
 * Careonys Data Service — Local JSON Mock Adapter & Storage
 * 
 * Este módulo actúa como la capa de acceso a datos para la plataforma Careonys y sus tenants (ej. PresDemo).
 * En la fase de desarrollo actual, lee la información desde archivos JSON locales sin tocar Supabase.
 * Para conectar con Supabase en el futuro, solo se reemplazan los métodos internos de este servicio.
 */

const CURRENT_TENANT_SLUG = 'presdemo';
const DATA_BASE_PATH = '../data/';

class CareonysDataService {
  constructor() {
    this.currentTenantSlug = CURRENT_TENANT_SLUG;
    this.cache = {};
  }

  /**
   * Carga un archivo JSON local
   */
  async _fetchJson(filename) {
    if (this.cache[filename]) {
      return this.cache[filename];
    }
    try {
      const response = await fetch(`${DATA_BASE_PATH}${filename}`);
      if (!response.ok) {
        throw new Error(`Error cargando ${filename}: ${response.statusText}`);
      }
      const data = await response.json();
      this.cache[filename] = data;
      return data;
    } catch (err) {
      console.warn(`[CareonysDataService] No se pudo cargar ${filename} vía fetch local. Usando fallback de cache.`, err);
      return this.cache[filename] || [];
    }
  }

  /**
   * Obtiene la información del tenant activo (ej. PresDemo)
   */
  async getTenantInfo(slug = this.currentTenantSlug) {
    const tenants = await this._fetchJson('tenants.json');
    return tenants.find(t => t.slug === slug) || {
      id: "tenant-presdemo",
      slug: "presdemo",
      nombre: "PresDemo — Servicios de Cuidado",
      subdominio: "presdemo.careonys.com"
    };
  }

  /**
   * Obtiene la lista de cuidadores filtrada por tenant
   */
  async getCuidadores(tenantSlug = this.currentTenantSlug) {
    const tenant = await this.getTenantInfo(tenantSlug);
    const cuidadores = await this._fetchJson('cuidadores.json');
    if (!tenant) return cuidadores;
    return cuidadores.filter(c => c.tenant_id === tenant.id);
  }

  /**
   * Filtrar cuidadores por criterios de búsqueda
   */
  async filterCuidadores({ searchTerm = '', zona = '', especialidad = '', retiro = '' } = {}) {
    const all = await this.getCuidadores();
    const term = searchTerm.toLowerCase().trim();
    const z = zona.toLowerCase().trim();
    const esp = especialidad.toLowerCase().trim();
    const ret = retiro.toLowerCase().trim();

    return all.filter(c => {
      const matchTerm = !term || 
        c.nombre.toLowerCase().includes(term) || 
        c.titulo.toLowerCase().includes(term) || 
        c.zona.toLowerCase().includes(term) ||
        (c.especialidades && c.especialidades.some(s => s.toLowerCase().includes(term)));

      const matchZona = !z || c.zona.toLowerCase().includes(z);
      const matchEsp = !esp || (c.especialidades && c.especialidades.some(s => s.toLowerCase().includes(esp)));
      const matchRetiro = !ret || (c.retiro && c.retiro.toLowerCase().includes(ret));

      return matchTerm && matchZona && matchEsp && matchRetiro;
    });
  }

  /**
   * Obtiene un cuidador específico por ID (soporta id numérico o cuid-xxx)
   */
  async getCuidadorById(id) {
    const cuidadores = await this._fetchJson('cuidadores.json');
    if (!id) return cuidadores[0] || null;

    // Mapa de IDs numéricos para compatibilidad con links legacy ?id=1, ?id=2
    const numMap = { "1": "cuid-001", "2": "cuid-002", "3": "cuid-003", "4": "cuid-004" };
    const targetId = numMap[id] || id;

    return cuidadores.find(c => c.id === targetId || c.id === id) || cuidadores[0] || null;
  }

  /**
   * Guardar solicitud de la familia localmente (Simulación de backend)
   */
  saveSolicitudCuidado(solicitudData) {
    const key = `careonys_solicitudes_${this.currentTenantSlug}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const nuevaSolicitud = {
      id: `sol-${Date.now()}`,
      tenant_id: "tenant-presdemo",
      ...solicitudData,
      creado_at: new Date().toISOString()
    };
    existing.push(nuevaSolicitud);
    localStorage.setItem(key, JSON.stringify(existing));
    return nuevaSolicitud;
  }

  /**
   * Obtiene los servicios disponibles para el tenant
   */
  async getServicios(tenantSlug = this.currentTenantSlug) {
    const tenant = await this.getTenantInfo(tenantSlug);
    const servicios = await this._fetchJson('servicios.json');
    if (!tenant) return servicios;
    return servicios.filter(s => s.tenant_id === tenant.id);
  }

  /**
   * Obtiene los cursos del tenant
   */
  async getCursos(tenantSlug = this.currentTenantSlug) {
    const tenant = await this.getTenantInfo(tenantSlug);
    const cursos = await this._fetchJson('cursos.json');
    if (!tenant) return cursos;
    return cursos.filter(c => c.tenant_id === tenant.id);
  }
}

// Exportar instancia global
window.CareonysDataService = new CareonysDataService();
