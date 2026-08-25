/* ===================================================
   LA PUERTA POR DONDE CELTATECH DA DE ALTA Y DE BAJA UNA PRESTADORA

   Este producto no tiene servidor propio: son páginas que el navegador se baja
   y que hablan directo con la base de datos. Eso alcanza para todo lo que hace
   una persona sentada frente a una pantalla, y no alcanza para nada de lo que
   tiene que hacer otro programa desde afuera, porque no hay ninguna dirección
   donde golpear.

   Esto es esa dirección. Vive en los servidores de Supabase, ni adentro de la
   base ni adentro del navegador, y es el único lugar donde puede vivir: las dos
   operaciones que atiende necesitan la llave de servicio, y una llave de
   servicio adentro de una página web la lee cualquiera con dos clics.

   Qué atiende, y son dos cosas:

       POST .../alta-y-baja/tenants   el alta      (modelo comercial §6.1)
       POST .../alta-y-baja/eventos   el cambio    (modelo comercial §6.2)

   Qué NO atiende, a propósito: nada comercial. No guarda de qué contrato viene
   una Prestadora, no guarda qué capacidades tiene contratadas, y no le pregunta
   nada a CeltaTech. El alta de §6.1 trae un `entitlements` adentro y esta puerta
   lo recibe y lo ignora, que es distinto de rechazarlo — el contrato del que
   llama no se rompe, simplemente de este lado no hay quién los use.

   Lo decidió el Desarrollador el 25 de agosto de 2026: «una cosa es el producto,
   y otra es su manejo comercial, no mezclemos o hacemos líos».

   ── Quién puede entrar ──────────────────────────────────────────────────────
   Esta puerta está fuera del control de sesiones de Supabase, a propósito y
   declarado en `config.toml` con `verify_jwt = false`. CeltaTech no tiene ni va
   a tener una cuenta de este producto, así que no puede traer una sesión.

   Lo que trae en su lugar es una firma: un resumen del cuerpo del mensaje hecho
   con una clave que sólo saben los dos lados. Quien no sepa la clave no puede
   fabricarla, y quien cambie una coma del mensaje la invalida. Es la
   verificación que pide el modelo comercial §6.2 y acá es la única que hay, así
   que sin ella no entra nada.

   Tres cuidados que no son adorno:

     * **Se firma el cuerpo crudo**, el texto tal como llegó, y recién después se
       interpreta. Firmar lo ya interpretado deja pasar dos mensajes distintos
       con la misma firma.
     * **Se comparan las dos firmas en tiempo constante.** Comparar con `===`
       corta en la primera letra distinta, y esa diferencia de microsegundos,
       repetida, deja adivinar la firma letra por letra.
     * **Si falta la clave, la puerta no abre.** No hay modo «sin firma para
       probar»: una puerta que se puede dejar abierta termina abierta.

   ── Por qué no lleva libreta de mensajes atendidos ──────────────────────────
   El modelo comercial §6.2 pide que el producto guarde los identificadores ya
   procesados, porque los avisos se reintentan y pueden llegar dos veces. Acá no
   hace falta llevar esa lista, y no llevarla es mejor que llevarla:

     * El alta es idempotente por el nombre corto, que se deduce del nombre. Un
       reintento choca con la fila que ya está y devuelve esa misma Prestadora en
       vez de crear una gemela.
     * El cambio de estado es idempotente por la fecha de emisión. La base
       descarta todo lo que se emitió antes de lo último aplicado, así que un
       repetido no cambia nada y un atrasado tampoco.

   Las dos garantías salen de datos que ya existían. Una tabla de mensajes
   atendidos daría lo mismo y habría que limpiarla para siempre.
   =================================================== */

const FIRMA = Deno.env.get('CELTATECH_FIRMA') ?? '';
const BASE = Deno.env.get('SUPABASE_URL') ?? '';
const LLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/* Qué le hace a la Prestadora cada tipo de aviso de §6.2. Lo que no está acá se
   contesta con un 200 y un «no me incumbe»: son avisos comerciales, y contestar
   un error haría que CeltaTech los reintentara para siempre. */
const QUE_HACE: Record<string, string> = {
  'suscripcion.activada': 'activo',
  'suscripcion.reactivada': 'activo',
  'suscripcion.suspendida': 'suspendido',
  'suscripcion.cancelada': 'cancelado',
};

function responder(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* Compara dos textos sin que el tiempo que tarda diga en qué letra se
   diferencian: recorre siempre los dos enteros y va acumulando las diferencias
   en vez de cortar en la primera. */
function igualesSinDelatar(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distintas = 0;
  for (let i = 0; i < a.length; i++) distintas |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distintas === 0;
}

async function firmaDe(cuerpo: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(FIRMA),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const resumen = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo));
  return Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Llama a una función de la base con la llave de servicio. Es lo único que esta
   puerta sabe hacer con la base: no arma consultas, no escribe tablas. Toda la
   lógica está en la 0023 y acá sólo se la nombra. */
async function llamarALaBase(funcion: string, argumentos: unknown) {
  const respuesta = await fetch(`${BASE}/rest/v1/rpc/${funcion}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': LLAVE,
      'Authorization': `Bearer ${LLAVE}`,
    },
    body: JSON.stringify(argumentos),
  });
  const texto = await respuesta.text();
  let cuerpo: unknown = texto;
  try { cuerpo = JSON.parse(texto); } catch { /* la base contestó algo que no es JSON */ }
  return { ok: respuesta.ok, estado: respuesta.status, cuerpo };
}

Deno.serve(async (pedido: Request): Promise<Response> => {
  if (pedido.method !== 'POST') {
    return responder(405, { error: 'Esta puerta sólo atiende POST' });
  }

  /* Sin clave configurada no se abre. Es un error del lado del producto, no de
     quien llama, así que se contesta 500 y no 401: que CeltaTech reintente. */
  if (!FIRMA || !BASE || !LLAVE) {
    console.error('Falta configuración: la puerta no puede verificar firmas ni entrar a la base');
    return responder(500, { error: 'La puerta no está configurada' });
  }

  const crudo = await pedido.text();

  const declarada = (pedido.headers.get('X-CeltaTech-Firma') ?? '').replace(/^sha256=/, '');
  if (!declarada || !igualesSinDelatar(declarada, await firmaDe(crudo))) {
    return responder(401, { error: 'Firma inválida' });
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return responder(400, { error: 'El cuerpo no es JSON' });
  }

  const camino = new URL(pedido.url).pathname.replace(/\/+$/, '').split('/').pop();

  // ── El alta (§6.1) ───────────────────────────────────────────────────────
  if (camino === 'tenants') {
    const cliente = (cuerpo.cliente ?? {}) as Record<string, unknown>;
    const nombre = typeof cliente.razon_social === 'string' ? cliente.razon_social : '';
    if (!nombre.trim()) {
      return responder(400, { error: 'Falta cliente.razon_social' });
    }

    const r = await llamarALaBase('alta_de_prestadora', {
      p_nombre: nombre,
      // Opcional, y existe para un caso real: dos clientes distintos con la
      // misma razón social. Sin esto, el segundo recibiría el primero.
      p_slug: typeof cuerpo.slug === 'string' ? cuerpo.slug : null,
      /* La descripción es el texto que la Prestadora muestra en su propia
         pantalla, y lo escribe ella. El alta de §6.1 no trae nada parecido
         —razón social, identificación fiscal y país— y ninguno de esos tres se
         le muestra a nadie acá adentro. Nace vacía y la completa su dueña. */
      p_descripcion: null,
    });
    if (!r.ok) {
      console.error('El alta falló:', r.estado, r.cuerpo);
      return responder(502, { error: 'La base rechazó el alta', detalle: r.cuerpo });
    }

    const fila = (Array.isArray(r.cuerpo) ? r.cuerpo[0] : r.cuerpo) as
      { id: string; slug: string; creada: boolean } | undefined;
    if (!fila) return responder(502, { error: 'La base no devolvió la Prestadora' });

    /* 201 si la creó esta llamada, 200 si ya estaba. La diferencia le sirve a
       quien llama para distinguir su propio reintento de una razón social
       repetida por dos empresas distintas. */
    return responder(fila.creada ? 201 : 200, {
      tenant_ref: fila.id,
      slug: fila.slug,
      creada: fila.creada,
    });
  }

  // ── El cambio de estado (§6.2) ───────────────────────────────────────────
  if (camino === 'eventos') {
    const tipo = typeof cuerpo.tipo === 'string' ? cuerpo.tipo : '';
    const ref = typeof cuerpo.tenant_ref === 'string' ? cuerpo.tenant_ref : '';
    const emitido = typeof cuerpo.emitido_en === 'string' ? cuerpo.emitido_en : '';

    const estado = QUE_HACE[tipo];
    if (!estado) {
      /* Los avisos comerciales se reciben y no se hacen. Con 200, para que no se
         reintenten para siempre. */
      return responder(200, { aplicado: false, motivo: 'Este producto no atiende «' + tipo + '»' });
    }
    if (!ref || !emitido) {
      return responder(400, { error: 'Falta tenant_ref o emitido_en' });
    }

    const r = await llamarALaBase('fijar_estado_de_prestadora', {
      p_id: ref,
      p_estado: estado,
      p_emitido_en: emitido,
    });
    if (!r.ok) {
      console.error('El cambio de estado falló:', r.estado, r.cuerpo);
      return responder(502, { error: 'La base rechazó el cambio', detalle: r.cuerpo });
    }

    const fila = (Array.isArray(r.cuerpo) ? r.cuerpo[0] : r.cuerpo) as
      { estado: string; aplicado: boolean } | undefined;
    if (!fila) return responder(502, { error: 'La base no devolvió el estado' });

    return responder(200, {
      estado: fila.estado,
      aplicado: fila.aplicado,
      ...(fila.aplicado ? {} : { motivo: 'Ya se aplicó algo emitido después de esto' }),
    });
  }

  return responder(404, { error: 'Esta puerta atiende /tenants y /eventos' });
});
