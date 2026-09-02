/* ===================================================
   SESIÓN — Supabase Auth v2
   Maneja login, signup, logout, sesión y guard de rutas.
   Requiere: @supabase/supabase-js v2 cargado antes que este script.
=================================================== */

/* La dirección de la base y su clave publicable NO se escriben acá: salen de
   `ClienteDatos`, en `js/apiClient.js`, que es el único lugar donde están
   escritas.

   Hasta el 30 de agosto de 2026 estaban también acá, con el mismo valor y sin
   que ninguna de las dos mandara sobre la otra. No era una copia de la otra:
   eran dos afirmaciones sueltas del mismo hecho, y quien cambiara una no tenía
   forma de enterarse de que había otra. Se descubrió haciendo que el servidor
   local apuntara a la base de esta máquina: cambiada una sola, las pantallas
   leían de una base y le pedían la sesión a la otra, donde esas cuentas no
   existen. Salía «el correo o la contraseña no coinciden», que no dice ni de
   lejos lo que estaba pasando.

   Y si `apiClient.js` no se cargó antes, esto se planta y lo dice. El orden de
   los `<script>` es el correcto en las doce pantallas que cargan los dos, y aun
   así se comprueba: un orden que hay que recordar se olvida, y sin este aviso
   el síntoma sería un `ClienteDatos is not defined` suelto en la consola de una
   pantalla cualquiera. */
if (typeof ClienteDatos === 'undefined' ||
    !ClienteDatos.supabaseUrl || !ClienteDatos.supabaseKey) {
  throw new Error(
    'js/auth.js necesita js/apiClient.js cargado antes: de ahí sale la dirección de la base.');
}

const SUPABASE_URL  = ClienteDatos.supabaseUrl;
const SUPABASE_ANON = ClienteDatos.supabaseKey;

// Instancia del SDK oficial (expuesta globalmente para Realtime)
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/* Lo que cada depósito de archivos acepta: cuánto puede pesar y de qué tipo
   puede ser. **La verdad está en la migración 0006**, que es la que se lo dice
   al servidor; esto es una copia, y `scripts/verificar_deposito.mjs` se pone
   rojo si las dos se despegan.

   Por qué la copia existe. La regla de la empresa dice que se valida en el
   servidor lo que entra «aunque exista un control equivalente más abajo», y
   explica por qué con este caso exacto: «un límite que sólo vive en el depósito
   de archivos actúa **después** de que el archivo ya ocupó la memoria». Sin
   esto, la persona que elige del teléfono una foto de 30 MB la sube entera,
   espera, y recién entonces el servidor la rechaza. Con esto se entera antes de
   empezar, y en su idioma.

   El `accept=` de los campos de archivo no cuenta como control: es una
   sugerencia para el buscador de archivos y se puede desactivar en el diálogo
   mismo. Pero tampoco se escribe a mano en la pantalla, y sale de acá: escrito
   a mano se despegó en las dos direcciones —de menos, con un `.jpg,.png,.pdf`
   que dejaba afuera el `heic` que sale de un iPhone sin tocar nada, así que la
   foto de la credencial no se podía ni elegir; y de más, con un `image/*` que
   ofrecía elegir un `gif` para rechazarlo después de subirlo entero—. Fue el
   pendiente 118, y hoy lo escribe `_loQueAcepta()`, acá abajo. */
const DEPOSITOS = {
  'documentos-cuidadores': {
    limite: 10485760,
    tipos: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
  },
  avatares: {
    limite: 5242880,
    tipos: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  }
};

/* Por qué un archivo no se sube: devuelve la clave del catálogo con el motivo,
   o `null` si se puede subir. Tiene nombre propio —y no está escrito adentro de
   `uploadFile`— para que se lo pueda ejercer: la cuarta regla de
   `scripts/verificar_deposito.mjs` lo saca de acá y le pasa casos inventados,
   así que si esta decisión se rompe, el chequeo se pone rojo. */
function _porQueNoSeSube(deposito, archivo) {
  const acepta = Object.prototype.hasOwnProperty.call(DEPOSITOS, deposito)
    ? DEPOSITOS[deposito] : null;
  if (!acepta) return 'error.archivo_deposito';
  /* Se pregunta que el tamaño **sea un número** antes de compararlo. Si no se
     preguntara, un objeto que no es un archivo llegaría a
     `undefined > 10485760`, que en JavaScript da falso, y pasaría de largo
     justamente el caso que este control no entendió. */
  if (!archivo || typeof archivo.size !== 'number') return 'error.archivo_tipo';
  if (archivo.size > acepta.limite) return 'error.archivo_pesado';
  if (acepta.tipos.indexOf(String(archivo.type || '').toLowerCase()) === -1) {
    return 'error.archivo_tipo';
  }
  return null;
}

/* Lo que un depósito acepta, escrito como lo espera el atributo `accept` de un
   campo de archivo. Sale de `DEPOSITOS`, que es la copia guardada de lo que
   declara la migración: un solo lugar donde esté dicho qué se puede subir, y
   ningún renglón de pantalla que lo vuelva a decir por su cuenta.

   Devuelve la cadena vacía para un depósito que nadie declaró, y no una lista
   inventada: si no se sabe a dónde va el archivo, no hay nada que ofrecer.
   Quien de verdad rechaza es `_porQueNoSeSube()`, que contesta
   `error.archivo_deposito` en ese mismo caso. */
function _loQueAcepta(deposito) {
  const acepta = Object.prototype.hasOwnProperty.call(DEPOSITOS, deposito)
    ? DEPOSITOS[deposito] : null;
  return acepta ? acepta.tipos.join(',') : '';
}

/* Le escribe a cada campo de archivo lo que se puede elegir. Cuál es su
   depósito lo dice el campo con `data-deposito`, y qué acepta ese depósito lo
   dice `DEPOSITOS`: la pantalla nombra el destino, nunca la lista.

   Corre sola al cargar, acá abajo, así que una pantalla nueva no tiene que
   acordarse de llamarla. Lo que se dibuja después —una ficha del legajo que la
   persona agrega— la llama con su pedazo de pantalla, que es para lo que recibe
   `raiz`.

   A un depósito que nadie declaró se le saca el `accept` en vez de dejarle uno
   vacío: los dos abren el diálogo de par en par, pero el vacío parece una
   decisión. Que ese caso no llegue a la pantalla lo sostiene la primera regla de
   `scripts/verificar_deposito.mjs`, que se pone roja con un nombre de depósito
   que ninguna migración declara, también escrito en un `data-deposito`. */
function _escribirLoQueSeAcepta(raiz) {
  const base = raiz || (typeof document !== 'undefined' ? document : null);
  if (!base || typeof base.querySelectorAll !== 'function') return 0;
  let escritos = 0;
  Array.prototype.forEach.call(
    base.querySelectorAll('input[type="file"][data-deposito]'),
    (campo) => {
      const acepta = _loQueAcepta(campo.getAttribute('data-deposito'));
      if (acepta) { campo.setAttribute('accept', acepta); escritos++; }
      else campo.removeAttribute('accept');
    }
  );
  return escritos;
}

/* El error se va con la clave del catálogo puesta. Clasificar el texto crudo
   del servidor es lo que hace `Texto.claveDeError`, y acá no hace falta
   adivinar nada: quien tira el error ya sabe qué pasó. Las dos claves son las
   mismas que usa el rechazo del servidor, así que la persona lee lo mismo
   venga de donde venga. */
function _rechazo(clave) {
  const error = new Error(clave);
  error.clave = clave;
  return error;
}

const Sesion = {

  client: _sb,

  /* Lo que acepta un depósito, y lo que se lo escribe a los campos de archivo
     que digan a cuál van. Las dos salen de `DEPOSITOS`, arriba. */
  aceptaDelDeposito: _loQueAcepta,
  escribirLoQueSeAcepta: _escribirLoQueSeAcepta,

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
  //
  // Y antes de mandar nada se mira el archivo contra lo que el depósito acepta.
  // Un depósito que no está en la tabla no se deja pasar «por las dudas»: se
  // rechaza. Todo control de acceso falla cerrado, y un nombre de depósito que
  // esta copia no conoce es exactamente el caso que no se entendió.
  /* Un identificador distinto en cada llamada. Es el punto único de verdad de
     lo que hace que el camino de un archivo no se repita: lo usan el alta del
     Asistente y las fichas del legajo, que son las dos puntas que suben papeles.

     Fue el pendiente 89: los dos armaban un camino que salía siempre igual —la
     cuenta y el tipo de papel, o la cuenta y la posición en la lista—, así que
     guardar de nuevo **borraba el archivo anterior**, sin preguntar y sin dejar
     rastro. Y el papel que se pisaba podía ser el que la Prestadora miró para
     otorgar el aval.

     `crypto.randomUUID` sólo existe en contexto seguro —`https` o `localhost`—;
     abajo quedan las dos redes para el resto de los casos, en orden de qué tan
     difícil es que dos llamadas den lo mismo. */
  uuidNuevo() {
    const fuente = (typeof crypto !== 'undefined') ? crypto : null;
    if (fuente && typeof fuente.randomUUID === 'function') {
      return fuente.randomUUID();
    }
    if (fuente && typeof fuente.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      fuente.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16)
        + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  },

  /* Sube, y **no pisa**. Es la otra mitad del pendiente 89, cerrado el 2 de
     septiembre de 2026 junto con la anterior: el camino ya no se repite, así
     que dos subidas no caen nunca en el mismo lugar; y el día que por lo que
     fuera cayeran, la segunda vuelve rechazada en vez de borrar la primera.
     `Texto.claveDeError` ya traduce ese rechazo, que llega como «already
     exists», con `error.duplicado`.

     Prohibir pisar, solo, no alcanzaba: rechazaría un guardado legítimo —sacar
     una matrícula del medio de la lista y volver a guardar—. Por eso van las
     dos cosas y no una. */
  async uploadFile(bucket, path, file) {
    const motivo = _porQueNoSeSube(bucket, file);
    if (motivo) throw _rechazo(motivo);

    const { data, error } = await _sb.storage.from(bucket).upload(path, file, {
      upsert: false,
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

/* Al cargar: cada campo de archivo dice qué se puede elegir. No se avisa nada
   en pantalla y no puede fallar: sin ningún campo de archivo no escribe nada, y
   el rechazo de verdad sigue estando antes de subir. */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _escribirLoQueSeAcepta());
  } else {
    _escribirLoQueSeAcepta();
  }
}

window.Sesion = Sesion;
window._sb = _sb; // Expuesto para uso directo de Realtime en páginas
