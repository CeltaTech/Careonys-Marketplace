/* ===================================================
   SESIÓN — Supabase Auth v2
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

const Sesion = {

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
    if (data.session && window.ClienteDatos) {
      ClienteDatos.setAuthToken(data.session.access_token);
    }
    return data.user;
  },

  // ── Registro de nuevo usuario ──────────────────────────
  // Devuelve la cuenta y la sesión por separado. Vienen separadas de verdad:
  // si el proyecto exige confirmar el correo, la cuenta se crea y la sesión
  // no llega hasta que la persona abre el enlace del mail. Quien llama tiene
  // que mirar `session` antes de escribir nada, porque sin ella las escrituras
  // salen como visitante anónimo y la base las rechaza.
  async signup(email, password, metadata = {}) {
    const { data, error } = await _sb.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw new Error(error.message);
    if (data.session && window.ClienteDatos) {
      ClienteDatos.setAuthToken(data.session.access_token);
    }
    return { user: data.user, session: data.session };
  },

  // ── El perfil de quien inició sesión ───────────────────
  // Punto único de verdad para el rol y la Prestadora del lado del navegador:
  // salen de `profiles`, que es lo mismo que miran las políticas de la base.
  // Nunca de la barra de direcciones.
  async perfil() {
    const session = await this.getSession();
    if (!session) return null;
    const { data, error } = await _sb
      .from('profiles')
      .select('id, tenant_id, role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) {
      console.error('Perfil de la sesión:', error.message);
      return null;
    }
    return data;
  },

  // ── El error técnico, traducido ────────────────────────
  // Regla 5.1: ninguna pantalla muestra lo que devuelve la base tal cual. Acá
  // se clasifica una vez y lo usan todas; el texto crudo queda en la consola.
  mensajeDeError(err) {
    const crudo = ((err && err.message) || '').toLowerCase();
    if (crudo.includes('invalid login credentials')) {
      return 'El correo o la contraseña no coinciden.';
    }
    if (crudo.includes('email not confirmed')) {
      return 'La cuenta existe, pero falta confirmar el correo. El enlace está en la casilla.';
    }
    if (crudo.includes('already registered') || crudo.includes('already been registered')) {
      return 'Ya hay una cuenta con ese correo. Se puede entrar desde la pantalla de acceso.';
    }
    if (crudo.includes('rate limit') || crudo.includes('too many')) {
      return 'Hubo demasiados intentos seguidos. Conviene esperar unos minutos.';
    }
    if (crudo.includes('password')) {
      return 'La contraseña no cumple con lo que pide el servidor: al menos ocho caracteres.';
    }
    if (crudo.includes('failed to fetch') || crudo.includes('networkerror')) {
      return 'No se pudo conectar con el servidor. Puede ser la conexión de este equipo.';
    }
    if (crudo.includes('maximum allowed size') || crudo.includes('payload too large')) {
      return 'El archivo pesa demasiado. El límite es 10 MB para documentos y 5 MB para la foto.';
    }
    if (crudo.includes('mime type') || crudo.includes('invalid_mime')) {
      return 'Ese tipo de archivo no se acepta. Se admiten imágenes (JPG, PNG, WEBP) y PDF.';
    }
    if (crudo.includes('row-level security') || crudo.includes('violates row')
        || crudo.includes('permission denied') || crudo.includes('unauthorized')) {
      return 'La sesión no tiene permiso para esta operación. Conviene volver a entrar.';
    }
    return 'No se pudo completar la operación. Conviene intentar de nuevo en un momento.';
  },

  // ── Cerrar sesión ──────────────────────────────────────
  async logout() {
    await _sb.auth.signOut();
    if (window.ClienteDatos) ClienteDatos.setAuthToken(null);
  },

  // ── Guardia: manda a la pantalla de acceso si no hay sesión ──
  // Se lleva de dónde venía, para volver ahí después de entrar.
  async requireAuth(redirectTo = 'acceso.html') {
    const session = await this.getSession();
    if (!session) {
      const aqui = window.location.pathname.split('/').pop() || '';
      const vuelta = aqui ? ('?volver=' + encodeURIComponent(aqui)) : '';
      window.location.href = redirectTo + vuelta;
      return null;
    }
    if (window.ClienteDatos) ClienteDatos.setAuthToken(session.access_token);
    return session;
  },

  // ── Escuchar cambios de sesión (login / logout) ───────
  onAuthStateChange(callback) {
    return _sb.auth.onAuthStateChange((event, session) => {
      if (window.ClienteDatos) {
        ClienteDatos.setAuthToken(session ? session.access_token : null);
      }
      callback(event, session);
    });
  },

  // ── Archivos ─────────────────────────────
  // Devuelve el **camino** del archivo, no una dirección web, y eso es lo que se
  // guarda en la base. El depósito de documentos es privado: su dirección no abre
  // sin firma, y la firmada vence, así que guardarla sería guardar algo que
  // mañana no sirve. La dirección se pide en el momento de mostrarla.
  //
  // La primera carpeta del camino tiene que ser la cuenta dueña del archivo
  // (`<user_id>/<archivo>`): de ahí sale el permiso (migración 0006).
  async uploadFile(bucket, path, file) {
    const { data, error } = await _sb.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type
    });
    if (error) throw new Error(error.message);
    return data.path;
  },

  // Para el depósito público (`avatares`): dirección fija, sin vencimiento.
  urlPublica(bucket, camino) {
    if (!camino) return null;
    return _sb.storage.from(bucket).getPublicUrl(camino).data.publicUrl;
  },

  // Para el privado (`documentos-cuidadores`): enlace temporal. Que venza es la
  // idea — un enlace eterno a un documento de identidad es el documento.
  async urlFirmada(bucket, camino, segundos = 300) {
    if (!camino) return null;
    const { data, error } = await _sb.storage.from(bucket).createSignedUrl(camino, segundos);
    if (error) { console.error('Enlace firmado:', error.message); return null; }
    return data.signedUrl;
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
  const session = await Sesion.getSession();
  if (session && window.ClienteDatos) {
    ClienteDatos.setAuthToken(session.access_token);
  }
})();

window.Sesion = Sesion;
window._sb = _sb; // Expuesto para uso directo de Realtime en páginas
