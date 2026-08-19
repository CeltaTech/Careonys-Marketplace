/* ===================================================
   CAREONYS AUTH MODULE — Supabase Auth v2
   Maneja login, signup, logout, sesión y guard de rutas.
   Requiere: @supabase/supabase-js v2 cargado antes que este script.
=================================================== */

const SUPABASE_URL  = 'https://pfbvpncavvlgmmvqkgbo.supabase.co';
const SUPABASE_ANON = 'sb_publishable_rmhuO0J5QsE5mw-5fgf-Hw_9tCHd1di';

// Instancia del SDK oficial (expuesta globalmente para Realtime)
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const CareonysAuth = {

  client: _sb,

  // ── Obtener sesión activa ──────────────────────────────
  async getSession() {
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  // ── Obtener usuario activo ─────────────────────────────
  async getUser() {
    const session = await this.getSession();
    return session ? session.user : null;
  },

  // ── Login con email + contraseña ───────────────────────
  async login(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Propagar token al apiClient para que todas las peticiones REST
    // usen el JWT del usuario en lugar de la anon key
    if (data.session && window.CareonysAPI) {
      CareonysAPI.setAuthToken(data.session.access_token);
    }
    return data.user;
  },

  // ── Registro de nuevo usuario ──────────────────────────
  async signup(email, password, metadata = {}) {
    const { data, error } = await _sb.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw new Error(error.message);
    return data.user;
  },

  // ── Cerrar sesión ──────────────────────────────────────
  async logout() {
    await _sb.auth.signOut();
    if (window.CareonysAPI) CareonysAPI.setAuthToken(null);
  },

  // ── Guard: redirige si no hay sesión ──────────────────
  async requireAuth(redirectTo = 'app.html') {
    const session = await this.getSession();
    if (!session) {
      window.location.href = redirectTo;
      return null;
    }
    if (window.CareonysAPI) CareonysAPI.setAuthToken(session.access_token);
    return session;
  },

  // ── Escuchar cambios de sesión (login / logout) ───────
  onAuthStateChange(callback) {
    return _sb.auth.onAuthStateChange((event, session) => {
      if (window.CareonysAPI) {
        CareonysAPI.setAuthToken(session ? session.access_token : null);
      }
      callback(event, session);
    });
  },

  // ── Upload de archivo a Supabase Storage ──────────────
  // bucket: 'documentos-cuidadores' | 'avatares'
  // path:   Ej: '${userId}/dni_frente.jpg'
  async uploadFile(bucket, path, file) {
    const { data, error } = await _sb.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type
    });
    if (error) throw new Error(`Storage upload error: ${error.message}`);
    const { data: urlData } = _sb.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  },

  // ── Suscripción Realtime (chat / notificaciones) ──────
  // Devuelve el canal para que el caller pueda unsubscribe() si hace falta
  subscribeToTable(table, filter, onInsert) {
    const channel = _sb
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        (payload) => onInsert(payload.new)
      )
      .subscribe();
    return channel;
  }
};

// ── Al cargar: restaurar sesión y propagar token ─────────
(async () => {
  const session = await CareonysAuth.getSession();
  if (session && window.CareonysAPI) {
    CareonysAPI.setAuthToken(session.access_token);
  }
})();

window.CareonysAuth = CareonysAuth;
window._sb = _sb; // Expuesto para uso directo de Realtime en páginas
