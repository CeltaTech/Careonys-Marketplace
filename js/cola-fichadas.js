/* ===================================================
   LA FICHADA QUE NO SE PUDO MANDAR SE GUARDA EN EL TELÉFONO

   Antes de esto, el fichado se mandaba en el momento y punto: si no había
   señal, salía un cartel de error y la fichada **se perdía**. No quedaba
   guardada en ningún lado, no se reintentaba y nadie se enteraba —ni el
   Asistente, que creía haber marcado, ni la Familia, que esperaba el aviso—.
   Y no hace falta ningún defecto para que pase: pasa cualquier día, en
   cualquier casa con paredes gruesas o sin datos en el teléfono, que es
   exactamente donde se ficha.

   La regla que ordena todo este archivo, fijada por el Desarrollador el 9 de
   septiembre de 2026: **lo que la persona ya hizo no se pierde nunca en
   silencio.** Apretar el botón es el acto; mandarlo es un detalle del programa,
   y un detalle del programa no puede borrar un acto.

   Así que apretar el botón guarda la fichada acá, en el teléfono, **antes** de
   intentar mandarla. Si se manda, se borra de acá. Si no, se queda y se
   reintenta sola.

   ---- Las cuatro decisiones que no son obvias ----

   **1. IndexedDB, no la Background Sync API.** La forma que trae el navegador
   para esto —pedirle al sistema que reintente él cuando vuelva la señal— no
   existe en el navegador de los iPhone, que es el único que se puede usar ahí.
   Media flota de teléfonos quedaría afuera. Se reintenta a mano: al volver la
   señal, al volver a la pantalla y al abrir la aplicación.

   **2. La base del teléfono se nombra por el código técnico del producto, no
   por la marca.** `IDENTIDAD.codigo`, nunca `IDENTIDAD.nombre`. Si algún día
   cambiara el nombre comercial y esto se llamara por él, la aplicación abriría
   una base vacía y las fichadas que estaban esperando quedarían huérfanas
   adentro del teléfono, sin nadie que las mande y sin nadie que se entere.

   **3. Cada fichada nace con su identificador puesto acá, y la base lo
   respeta.** Es lo que hace que reintentar sea seguro. Sin eso, una fichada que
   sí llegó pero cuya respuesta se perdió en el camino se volvería a mandar y
   quedarían dos marcas de la misma hora —y una fichada repetida no se borra
   desde ninguna pantalla—. Con el identificador puesto de antemano, el segundo
   intento choca contra el primero y la base lo ignora en vez de duplicarlo.

   **4. Sólo se manda lo del legajo que tiene la sesión abierta.** Lo que quedó
   pendiente de otra persona se queda quieto hasta que esa persona vuelva a
   entrar. Mandarlo con la sesión de otro no lo salvaría: la base lo rechaza
   igual, porque nadie puede fichar por un tercero, y el rechazo dejaría la cola
   trabada para siempre.

   ---- Lo que este archivo no hace ----

   No decide nada sobre la fichada ni la corrige. Guarda lo que le dan y lo
   entrega tal cual. Qué se ficha y con qué hora lo decide la pantalla.
=================================================== */

(function () {
  'use strict';

  const NOMBRE_BASE = `${Identidad.datos.codigo}-fichadas-pendientes`;
  const VERSION_BASE = 1;
  const DEPOSITO = 'pendientes';

  // Cuántas veces se reintenta una fichada que la base rechaza por algo que no
  // es la falta de señal. Se reintenta poco y no una sola vez: un rechazo puede
  // venir de una sesión recién vencida que vuelve sola al minuto siguiente.
  // Pasado el tope deja de reintentarse pero **no se borra**, y la pantalla la
  // sigue mostrando: una fichada trabada se ve, no desaparece. Y desde que la
  // pantalla dice el motivo, se ve además **por qué** está trabada, que es lo
  // que separa esperar de volver a apretar el botón al pedo.
  const INTENTOS_ANTES_DE_PARAR = 5;

  let sincronizando = false;
  const avisados = [];

  function abrir() {
    return new Promise((listo, falla) => {
      const pedido = indexedDB.open(NOMBRE_BASE, VERSION_BASE);
      pedido.onupgradeneeded = () => {
        const base = pedido.result;
        if (!base.objectStoreNames.contains(DEPOSITO)) {
          base.createObjectStore(DEPOSITO, { keyPath: 'id' });
        }
      };
      pedido.onsuccess = () => listo(pedido.result);
      pedido.onerror = () => falla(pedido.error);
    });
  }

  function transaccion(modo, hacer) {
    return abrir().then((base) => new Promise((listo, falla) => {
      const t = base.transaction(DEPOSITO, modo);
      const pedido = hacer(t.objectStore(DEPOSITO));
      t.oncomplete = () => { base.close(); listo(pedido && pedido.result); };
      t.onerror = () => { base.close(); falla(t.error); };
    }));
  }

  // Un identificador que no choca con ninguno. `randomUUID` no existe en un
  // sitio servido sin cifrar —que es como se lo ve en desarrollo—, así que hay
  // un camino de respaldo con la misma forma.
  function nuevoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const azar = new Uint8Array(16);
    crypto.getRandomValues(azar);
    azar[6] = (azar[6] & 0x0f) | 0x40;
    azar[8] = (azar[8] & 0x3f) | 0x80;
    const hex = Array.from(azar, (b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
           '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  // Se le pasa a quien quiera mostrarlo el estado de la cola: cuántas están
  // esperando, por qué motivo la base rechazó alguna, y si esa ya dejó de
  // reintentarse. La pantalla se suscribe una vez y no pregunta.
  //
  // El nombre dice `cuenta` y no `avisar` a propósito: acá no se escribe nada en
  // ninguna pantalla —se entrega un número y quien lo recibe decide qué hacer con
  // él—, y llamarlo `avisar` hacía que la comprobación de los cuatro estados
  // leyera esta cola como si dibujara una lista en pantalla.
  //
  // El motivo que sale de acá **es una clave del catálogo**, nunca el texto que
  // devolvió el servidor. Se muestra una sola, la de la más vieja que fue
  // rechazada: es la que traba a todas las que vienen atrás, porque la cola se
  // corta en el primer tropiezo.
  function avisarLaCuenta() {
    ColaFichadas.listar().then((cola) => {
      const rechazada = cola.filter((f) => f.motivo)[0] || null;
      const motivo = rechazada ? rechazada.motivo : null;
      const trabada = !!(rechazada && rechazada.intentos >= INTENTOS_ANTES_DE_PARAR);
      avisados.forEach((quien) => {
        // Una pantalla rota no puede trabar la cola.
        try { quien(cola.length, motivo, trabada); } catch (e) { /* sigue */ }
      });
    }).catch(() => {});
  }

  /* ---- LOS TRES MOTIVOS QUE SE PUEDEN DECIR ----

     Lo ordenó el Desarrollador el 10 de septiembre de 2026, contestando qué
     tiene que ver el Asistente cuando la base le rechaza una fichada: «lo que
     debe ver es un mensaje diciendole porque (los mensajes seran sacados de
     entre una lista de posibles y aprobados, no podemos decir todo)». Esta es
     esa lista, y es corta a propósito.

     Y coincide con la regla de la empresa: el texto crudo que devuelve la base
     nombra tablas, columnas y restricciones, y eso no se le muestra a nadie.

     Clasificar la falla no se hace acá —lo hace `Texto.claveDeError`, que es el
     único clasificador del proyecto y ya manda el detalle técnico a la
     consola—. Lo que se hace acá es **quedarse con lo que se puede decir**, que
     no es lo mismo: el catálogo general tiene mensajes escritos para una
     pantalla con un formulario delante, y «conviene revisar el formulario» es
     una instrucción imposible para alguien parado en la puerta de una casa con
     una marca que ya hizo. Cuando no hay nada útil que decir, se dice eso
     mismo, que es la verdad. */
  const MOTIVOS_QUE_SE_PUEDEN_DECIR = {
    'error.sin_permiso': 'fichado.motivo_sesion',
    'error.sesion_cerrada': 'fichado.motivo_sesion',
    'error.datos_invalidos': 'fichado.motivo_rechazada',
    'error.no_encontrado': 'fichado.motivo_rechazada'
  };

  // Fuera del navegador —una prueba en la línea de comandos— no hay nada de eso
  // cargado, y ahí cae en el motivo que no dice nada, que también es de la
  // lista.
  function motivoDelRechazo(error) {
    if (typeof window === 'undefined' || !window.Texto || typeof Texto.claveDeError !== 'function') {
      return 'fichado.motivo_desconocido';
    }
    const clase = Texto.claveDeError(error, 'registrar el fichado');
    return MOTIVOS_QUE_SE_PUEDEN_DECIR[clase] || 'fichado.motivo_desconocido';
  }

  // Sin señal, `fetch` no devuelve una respuesta de error: rechaza con
  // `TypeError`. Es la única forma de distinguir «no salió del teléfono» de
  // «llegó y la base dijo que no», y son dos casos opuestos: el primero se
  // reintenta siempre, el segundo cuenta intentos.
  function esFaltaDeSenal(error) {
    return error instanceof TypeError || !navigator.onLine;
  }

  const ColaFichadas = {
    nuevoId,

    // La pantalla la necesita para elegir qué decirle a la persona: «no hay
    // señal, se manda solo» y «la base dijo que no» no son lo mismo.
    esFaltaDeSenal,

    // Guarda una fichada para mandarla después. Recibe lo mismo que el envío,
    // más el identificador y la hora en que se marcó.
    async guardar(fichada) {
      const item = Object.assign({ intentos: 0, motivo: null }, fichada);
      await transaccion('readwrite', (deposito) => deposito.put(item));
      avisarLaCuenta();
      return item;
    },

    async listar() {
      const todas = await transaccion('readonly', (deposito) => deposito.getAll());
      return (todas || []).sort((a, b) => String(a.marcadaEn).localeCompare(String(b.marcadaEn)));
    },

    async quitar(id) {
      await transaccion('readwrite', (deposito) => deposito.delete(id));
      avisarLaCuenta();
    },

    async cuantas() {
      const todas = await transaccion('readonly', (deposito) => deposito.getAll());
      return (todas || []).length;
    },

    // Las que están esperando y son de este legajo. Es lo que mira la pantalla
    // para decir cuántas quedaron sin mandar.
    async pendientesDe(caregiverId) {
      const todas = await this.listar();
      return todas.filter((f) => f.caregiverId === caregiverId);
    },

    alCambiar(quien) {
      if (typeof quien === 'function') avisados.push(quien);
    },

    // Intenta mandar lo que haya, de la más vieja a la más nueva. Se corta al
    // primer tropiezo a propósito: si no hay señal, las que siguen tampoco van
    // a salir, y seguir intentando sólo gasta batería.
    //
    // Devuelve la lista de motivos de lo que salió mal, vacía si no salió mal
    // nada. No alcanza con que la cola se lo guarde para sí: un fallo que nadie
    // puede mirar es un fallo que no existe hasta que alguien pierde una
    // fichada por él. Son claves del catálogo, no textos del servidor, y quien
    // la llama decide qué hacer con ellas. La pantalla del Asistente no la usa:
    // se entera por `alCambiar`, que le llega igual cuando el rechazo aparece
    // mientras la aplicación está en segundo plano.
    async sincronizar() {
      const problemas = [];
      if (sincronizando) return problemas;
      if (!window.ClienteDatos || !window.Sesion) return problemas;
      sincronizando = true;
      try {
        const legajo = await ClienteDatos.legajoPropio();
        if (!legajo) return problemas;
        const cola = await this.pendientesDe(legajo);
        for (const fichada of cola) {
          if (fichada.intentos >= INTENTOS_ANTES_DE_PARAR) continue;
          try {
            await ClienteDatos.registrarFichadoGPS(fichada);
            await this.quitar(fichada.id);
          } catch (error) {
            if (esFaltaDeSenal(error)) break;
            fichada.intentos += 1;
            fichada.motivo = motivoDelRechazo(error);
            await transaccion('readwrite', (deposito) => deposito.put(fichada));
            problemas.push(fichada.motivo);
            avisarLaCuenta();
            break;
          }
        }
      } catch (error) {
        // Ni siquiera se pudo preguntar quién es. No hay nada que reintentar
        // ahora y la cola queda entera para el próximo intento: no se pierde
        // ninguna fichada, pero el motivo se cuenta igual.
        problemas.push(motivoDelRechazo(error));
      } finally {
        sincronizando = false;
      }
      return problemas;
    },

    // Los tres momentos en que vale la pena volver a intentar: cuando el
    // teléfono avisa que volvió la señal, cuando la persona vuelve a la
    // aplicación, y al abrirla.
    //
    // Y antes de intentar nada se le cuenta a la pantalla cómo está la cola.
    // Sin esto, una fichada que ya agotó los intentos no vuelve a producir
    // ningún aviso —`sincronizar` la saltea— y la persona abría la aplicación
    // con una fichada trabada y ninguna explicación, que es exactamente lo que
    // este cambio viene a terminar.
    arrancar() {
      avisarLaCuenta();
      window.addEventListener('online', () => this.sincronizar());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.sincronizar();
      });
      this.sincronizar();
    }
  };

  window.ColaFichadas = ColaFichadas;
})();
