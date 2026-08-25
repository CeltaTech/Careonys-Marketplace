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

  // ── Olvidó la contraseña: mandar el enlace ─────────────
  // No contesta si ese correo tiene cuenta o no, y la pantalla tampoco: decir
  // «esa cuenta no existe» le regala a cualquiera una forma de averiguar quién
  // está registrado. Siempre se responde lo mismo.
  //
  // `volverA` es la dirección a la que lleva el enlace del correo. Tiene que
  // estar en la lista de direcciones permitidas del proyecto; si no está, el
  // enlace termina en la portada y la persona no puede cambiar nada.
  async pedirNuevaClave(email, volverA) {
    const destino = volverA || (window.location.origin + '/nueva-clave.html');
    const { error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo: destino });
    if (error) throw new Error(error.message);
  },

  // ── Elegir la contraseña nueva ─────────────────────────
  // Necesita una sesión abierta. Cuando se llega desde el enlace del correo, el
  // SDK ya la abrió solo al leer la dirección (`detectSessionInUrl`), así que
  // acá no hay nada que pedir: si no hay sesión, el enlace venció.
  async cambiarClave(nueva) {
    const { data, error } = await _sb.auth.updateUser({ password: nueva });
    if (error) throw new Error(error.message);
    return data.user;
  },

  // ── Volver a mandar el correo de confirmación ──────────
  // Para quien se dio de alta y no encuentra el mail. El servidor limita cuántos
  // manda por hora, así que un segundo pedido seguido puede volver con ese aviso
  // en lugar de un correo; `Texto.mensajeDeError` ya lo traduce.
  async reenviarConfirmacion(email) {
    const { error } = await _sb.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
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
// Acá no se avisa en pantalla a propósito: esto corre en las once pantallas que
// cargan este archivo, y su único trabajo es pasarle el permiso al cliente de
// datos. Si falla, el primer pedido de esa pantalla va a fallar también, y esa
// pantalla sí sabe cómo decirlo. Lo que no puede pasar es que el fallo se pierda
// sin dejar rastro.
(async () => {
  try {
    const session = await Sesion.getSession();
    if (session && window.ClienteDatos) {
      ClienteDatos.setAuthToken(session.access_token);
    }
  } catch (err) {
    console.error('Restauración de la sesión guardada:', err);
  }
})();

window.Sesion = Sesion;
window._sb = _sb; // Expuesto para uso directo de Realtime en páginas
