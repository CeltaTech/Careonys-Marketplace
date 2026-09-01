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
  //
  // **Si la resolución falla, falla acá y se ve.** Hasta el 26 de agosto de 2026
  // el fallo se atrapaba adentro y se devolvía `null`, que es exactamente lo
  // mismo que devuelve «esta dirección no nombró ninguna Prestadora»: la
  // pantalla no tenía cómo distinguir «no se pudo preguntar» de «no hay», y
  // terminaba diciendo lo segundo cuando pasaba lo primero. Ahora sale como
  // fallo, y quien muestra algo lo atrapa y lo dice — que es el estado
  // **error** de la regla de los cuatro estados.
  //
  // Un fallo tampoco queda pegado a la carga: la resolución guardada se borra,
  // así el próximo que pregunte vuelve a intentar. Sin eso, un corte de un
  // segundo al arrancar dejaba la página entera sin Prestadora hasta recargarla.
  async initTenant() {
    if (!this._resolucionEnCurso) {
      this._resolucionEnCurso = this._resolverPrestadora().catch((err) => {
        this._resolucionEnCurso = null;
        throw err;
      });
    }
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

      // Queda anotado qué Prestadora nombró la dirección. Es lo único que
      // distingue «la dirección no dijo nada» de «la dirección dijo algo que no
      // existe», y son casos distintos: uno es que falta el enlace y el otro que
      // el enlace está mal.
      this.slugPedido = slug || null;

      if (slug) {
        // `prestadora_por_slug` en vez de pedirle filas a `tenants`: desde la
        // migración 0021 esa tabla no se lee sin sesión. La puerta exige el
        // nombre corto y devuelve una sola Prestadora, con sus colores y su
        // logotipo y nada más.
        const res = await this._supabaseRequest('POST', 'rpc/prestadora_por_slug', { p_slug: slug });
        if (res && res[0]) {
          this.currentTenant = res[0];
          this._applyBranding(this.currentTenant);
          return this.currentTenant;
        }
      }

      // Sin nombre corto no hay Prestadora, y ya no hay respaldo. Hasta la 0021
      // se mostraba la primera que devolviera la base, y eso era leer la lista
      // de clientes de CeltaTech: el Desarrollador decidió el 25 de agosto de
      // 2026 que esa lista no la ve nadie fuera de su panel de control.
      this.currentTenant = null;
    } catch (err) {
      // No se traga: se deja el estado limpio y el fallo sigue camino hacia
      // quien muestra la pantalla. Ver la explicación arriba, en `initTenant`.
      this.currentTenant = null;
      throw err;
    }

    if (this.currentTenant) this._applyBranding(this.currentTenant);
    return this.currentTenant;
  },

  // Qué nombró la dirección (`?t=` o subdominio). Arranca sin contestar porque
  // todavía no se resolvió nada.
  slugPedido: null,

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
    // El logotipo se mide desde la raíz del sitio y no desde la página que lo
    // pide. La columna `logo_url` de una Prestadora guarda una ruta relativa:
    // leída desde `pwa-familia/index.html` apuntaba a `pwa-familia/assets/`,
    // donde no hay ninguna carpeta `assets`, y el logotipo salía roto en las dos
    // PWAs. `new URL` con la raíz de base resuelve los tres casos de una vez:
    // una dirección entera se respeta, una que empieza con barra también, y una
    // relativa se cuelga de la raíz.
    // Si la Prestadora no tiene logotipo propio se muestra el del producto, que
    // es lo mismo que muestra la pantalla antes de que la Prestadora se
    // resuelva. El respaldo no nombra a ninguna Prestadora: hasta hoy era el de
    // una en particular, y cualquier otra veía el logotipo ajeno.
    const guardado = tenant.logo_url || Identidad.datos.logotipo;
    const logoUrl = new URL(guardado, window.location.origin + '/').href;
    const logoSelectors = '.logo-brand, .tenant-logo, .navbar-logo img, .logo img';
    document.querySelectorAll(logoSelectors).forEach(img => {
      img.src = logoUrl;
    });

    // El nombre no se escribe por selector. Cada pantalla dice dónde va con el
    // marcador `{{organizacion}}`, y esto lo vuelve a resolver ahora que se sabe
    // cuál es: así alcanza también al título, a la descripción y a los textos
    // que no tienen ningún selector que los distinga.
    Identidad.resolverOrganizacion(tenant.name);

    // La insignia del producto va solo en el pie, y solo cuando lo que se muestra
    // es una Prestadora cliente y no el producto mismo.
    if (!Identidad.esProductoPropio(tenant)) {
      const footerLogo = document.querySelector('.footer-brand .logo, .footer .logo');
      if (footerLogo && !footerLogo.querySelector('.powered-by-tag')) {
        const tag = document.createElement('span');
        tag.className = 'powered-by-tag';
        tag.style.cssText = 'font-size: 11px; font-weight: 700; color: var(--texto-secundario); margin-top: 6px; display: block; letter-spacing: 0.3px;';
        // El rótulo va en su propio elemento y no suelto adentro del sello: el
        // catálogo traduce escribiendo el texto entero del elemento que lleva
        // `data-frase`, así que compartirlo con el nombre de la Prestadora lo
        // borraría en cuanto llegara la traducción.
        const rotulo = document.createElement('span');
        rotulo.setAttribute('data-frase', 'pie.sello_producto');
        rotulo.textContent = 'Con la tecnología de';
        tag.appendChild(rotulo);
        tag.appendChild(document.createTextNode(' '));
        const marca = document.createElement('span');
        marca.style.cssText = 'color:var(--marca-prestadora-acento); font-weight: 900;';
        marca.textContent = Identidad.datos.nombre;
        tag.appendChild(marca);
        // El sello nace después de que la pantalla ya se tradujo, así que se pide
        // por él. Si el catálogo no está —una pantalla que no lo cargue—, queda
        // el castellano, que es el respaldo de siempre.
        if (window.Catalogo) window.Catalogo.traducir(tag);
        footerLogo.appendChild(tag);

        footerLogo.style.display = 'flex';
        footerLogo.style.flexDirection = 'column';
        footerLogo.style.alignItems = 'flex-start';
      }
    }
  },

  // --- MÓDULO 1: RECLUTAMIENTO Y LEGAJOS (ASISTENTES) ---
  async getAspirantes(filter = {}) {
    // Filtrar automáticamente por el tenant activo
    const activeFilter = { ...filter };
    if (this.currentTenant) {
      activeFilter.tenant_id = this.currentTenant.id;
    }
    return await this._supabaseGet('caregivers', activeFilter);
  },

  async registrarAspirante(registroData) {
    const dbData = { ...registroData };
    if (this.currentTenant) {
      dbData.tenant_id = this.currentTenant.id;
    }
    return await this._supabasePost('caregivers', dbData);
  },

  // Las zonas de cobertura que ofrece esta Prestadora, para que el formulario
  // de reclutamiento las muestre y la persona tilde las suyas.
  //
  // Va por `zonas_de` y no pidiéndole filas a `zonas_cobertura`: quien completa
  // ese formulario todavía no tiene cuenta, y desde la migración 0035 esa tabla
  // no se lee sin sesión. Es la misma clase de puerta que `prestadora_por_slug`,
  // y exige el nombre corto por el mismo motivo: así no existe forma de pedir
  // las zonas de todas las Prestadoras.
  //
  // **La Prestadora se resuelve antes, no se da por resuelta**, igual que en
  // `getPerfilDelDirectorio`. Preguntar sólo por `currentTenant` parece
  // equivalente y no lo es: si esto corre antes de que `initTenant` termine, la
  // respuesta es la lista vacía, y vacío no significa «todavía no sé» sino «esta
  // Prestadora no cargó zonas». La pantalla mostraría el campo de texto libre a
  // todo el mundo y nadie vería un error. Pasó la primera vez que se probó.
  //
  // Con la Prestadora de verdad sin resolver sí devuelve la lista vacía, y ahí
  // el texto libre es lo correcto: no se sabe de quién es el formulario, así que
  // no hay lista que mostrar.
  async zonasDePrestadora() {
    const prestadora = this.currentTenant || await this.initTenant();
    const slug = prestadora ? prestadora.slug : null;
    if (!slug) return [];
    return await this._supabaseRequest('POST', 'rpc/zonas_de', { p_slug: slug }) || [];
  },

  // Los vocabularios: el catálogo general que trae el producto más las opciones
  // que agregó esta Prestadora. Desde la migración 0038 viven en tablas, y hasta
  // entonces vivían en un archivo servido al navegador — donde nadie podía
  // agregar una opción sin publicar una versión nueva.
  //
  // Va por `vocabularios_de` y no leyendo `vocabularios`: la mitad de las
  // pantallas que piden el catálogo son públicas —el directorio, el formulario
  // de reclutamiento— y quien las usa todavía no tiene cuenta. Es la misma
  // puerta que `prestadora_por_slug` y `zonas_de`, y exige el nombre corto por
  // el mismo motivo: no existe forma de pedir las opciones de todas.
  //
  // **Sin Prestadora resuelta devuelve el catálogo general, y eso es correcto**,
  // al revés de lo que pasa con las zonas. Ahí la lista vacía mentía —«esta
  // Prestadora no cargó zonas» cuando la verdad era «todavía no sé cuál es»—;
  // acá el catálogo general es lo que ve cualquier cliente el día que se da de
  // alta, así que la respuesta es verdadera aunque la Prestadora no se resuelva.
  async vocabulariosDePrestadora() {
    const prestadora = this.currentTenant || await this.initTenant();
    const slug = prestadora ? prestadora.slug : null;
    return await this._supabaseRequest('POST', 'rpc/vocabularios_de', { p_slug: slug });
  },

  // Las Guías de cuidado: qué es la patología, qué se ve en el domicilio, qué
  // señales obligan a avisar y cómo actuar en una emergencia. Cuelgan de una
  // opción de vocabulario —no de una tabla de patologías—, así que las
  // discapacidades y las tareas de cuidado pueden tener la suya sin una tabla
  // nueva (migración 0041).
  //
  // Va por `guias_de` y no leyendo `guias_cuidado` por el mismo motivo que los
  // vocabularios: la tabla no le concede nada a `anon`, y la pantalla que
  // necesita esto puede estar mostrándose sin sesión.
  //
  // **La guía de la Prestadora reemplaza a la general; no se suman.** Es la
  // diferencia con `vocabulariosDePrestadora`, y no es un descuido: dos
  // opciones distintas en una lista conviven, pero dos textos que explican la
  // misma patología se contradicen, y el Asistente no tiene cómo saber a cuál
  // hacerle caso. Manda quien responde por él, que es su Prestadora.
  //
  // **Sólo salen las publicadas.** Una guía sin revisar no llega a ninguna
  // pantalla, porque la base exige que quede escrito quién la revisó y cuándo
  // antes de dejar publicarla. Un borrador que se ve es una indicación que
  // nadie firmó.
  //
  // Y no hay copia en `data/`, al revés del catálogo: el archivo del catálogo
  // viaja a todos los teléfonos, y lo que escribió una Prestadora no puede
  // repartirse a cualquiera. Que su gente igual la necesita en una casa sin
  // señal es cierto, y está anotado sin resolver (pendiente 102).
  async guiasDePrestadora() {
    const prestadora = this.currentTenant || await this.initTenant();
    const slug = prestadora ? prestadora.slug : null;
    return await this._supabaseRequest('POST', 'rpc/guias_de', { p_slug: slug });
  },

  // ── LAS GUÍAS QUE ESCRIBE LA PRESTADORA ────────────────────────────────
  // Lo de arriba es la puerta de lectura: devuelve lo publicado y sirve sin
  // sesión, que es lo que necesita el teléfono del Asistente. Lo de acá abajo
  // es el otro lado, el de quien las escribe, y va contra la tabla y no contra
  // la puerta por dos motivos: la puerta esconde los borradores —justamente lo
  // que hay que poder editar— y funde la guía general con la propia, que es
  // exactamente la distinción que esta pantalla no puede perder.
  //
  // Nada de esto necesita que la pantalla se acuerde de filtrar por
  // Prestadora: las cuatro políticas de la migración 0041 ya lo hacen, y la de
  // alta, cambio y baja exige además `tenant_id is not null`, así que la guía
  // general no se toca ni equivocándose.

  // Las listas sobre las que tiene sentido escribir una guía. Sale de la base
  // —columna `admite_guia`, migración 0043— y no de una lista escrita acá:
  // ofrecerle a alguien escribir la guía de cuidado del «día de la semana» es
  // el síntoma de un catálogo que se resolvió en la pantalla.
  async vocabulariosConGuia() {
    return await this._supabaseRequest('GET', 'vocabularios', null, {
      select: 'id,clave,i18n',
      admite_guia: 'is.true',
      activo: 'is.true',
      order: 'orden.asc'
    });
  },

  // Las opciones de una de esas listas. Vienen las del catálogo general y las
  // propias de esta Prestadora, porque eso es lo que devuelve la política de
  // lectura de `vocabulario_items`; las de otra Prestadora no llegan acá.
  async opcionesConGuia(vocabularioId) {
    return await this._supabaseRequest('GET', 'vocabulario_items', null, {
      select: 'id,clave,i18n,tenant_id',
      vocabulario_id: `eq.${vocabularioId}`,
      activo: 'is.true',
      order: 'orden.asc'
    });
  },

  // Sus guías, sólo las suyas. El `tenant_id=not.is.null` no es la seguridad
  // —de eso se ocupa la política— sino la pantalla: sin él entrarían también
  // las diecinueve generales publicadas, que ella no escribió y no puede
  // corregir, y la lista diría que tiene veintiuna guías propias.
  async misGuias() {
    return await this._supabaseRequest('GET', 'guias_cuidado', null, {
      select: 'id,vocabulario_item_id,descripcion,que_esperar,senales_de_alarma,' +
        'en_emergencia,publicada,revisada_por,revisada_el,created_at,' +
        'vocabulario_items(clave,i18n,vocabularios(id,clave,i18n))',
      tenant_id: 'not.is.null',
      order: 'created_at.desc'
    });
  },

  // El alta escribe el `tenant_id` desde la Prestadora que ya resolvió la
  // sesión. Si no hay ninguna se corta acá y no se manda el pedido: sin ese
  // valor la política lo rechazaría igual, pero con un error de la base en vez
  // de uno que la pantalla sepa contar.
  async crearGuia(datos) {
    const prestadora = this.currentTenant || await this.initTenant();
    if (!prestadora || !prestadora.id) {
      throw new Error('No se pudo resolver la Prestadora de esta sesión.');
    }
    const filas = await this._supabaseRequest('POST', 'guias_cuidado',
      Object.assign({ tenant_id: prestadora.id }, datos));
    return filas[0] || null;
  },

  // El cambio no toca `tenant_id` ni `vocabulario_item_id`: de qué opción
  // habla una guía no se corrige, se borra y se escribe la otra. Cambiarlo
  // dejaría el historial diciendo que siempre habló de la nueva.
  async actualizarGuia(id, datos) {
    const filas = await this._supabaseRequest('PATCH', 'guias_cuidado', datos,
      { id: `eq.${id}` });
    return filas[0] || null;
  },

  async borrarGuia(id) {
    return await this._supabaseRequest('DELETE', 'guias_cuidado', null,
      { id: `eq.${id}` });
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

    // Las zonas tildadas, una fila por zona (migración 0035). Lo que la persona
    // escribió cuando no había lista para tildar no viene por acá: ése es un
    // campo de `caregivers` y lo lleva el alta, junto con los demás datos.
    //
    // Una región tildada entra como una fila más, sin sus municipios, y eso es
    // deliberado: «trabajo en todo el Oeste» no es lo mismo que la lista de sus
    // municipios el día que la Prestadora agregue uno.
    if (legajo.zonas && legajo.zonas.length > 0) {
      guardado.zonas = await this._supabaseRequest('POST', 'zonas_asistente',
        legajo.zonas.map((zonaId) => marcar({ zona_id: zonaId })));
    }

    return guardado;
  },

  async cambiarEstadoAspirante(id, nuevoEstado, notaInterna = '') {
    return await this._supabasePatch('caregivers', id, { estado: nuevoEstado, notaPrestadora: notaInterna });
  },

  // --- MÓDULO 2: AVISOS Y SOLICITUDES DE FAMILIAS ---
  async getAvisosFamilia() {
    const filter = {};
    if (this.currentTenant) {
      filter.tenant_id = this.currentTenant.id;
    }
    return await this._supabaseGet('avisos', filter);
  },

  // Las franjas —cuándo se necesita el cuidado— no son una columna de
  // `avisos`: son filas de `franjas_aviso`, una por casillero
  // marcado (migración 0016). Por eso se apartan antes de mandar el aviso y
  // se guardan después, cuando el aviso ya tiene identificador.
  async crearAvisoFamilia(avisoData) {
    const dbData = { ...avisoData };
    const franjas = dbData.franjas || [];
    delete dbData.franjas;
    if (this.currentTenant) {
      dbData.tenant_id = this.currentTenant.id;
    }
    const aviso = await this._supabasePost('avisos', dbData);
    if (aviso && aviso.id && franjas.length > 0) {
      try {
        await this.guardarFranjasDeAviso(aviso.id, franjas);
      } catch (err) {
        // El aviso ya está publicado: no se puede deshacer con otro pedido
        // sin arriesgarse a borrar algo que sí quedó bien. Lo que se puede
        // hacer es no mentir sobre qué pasó.
        console.error('Las franjas del aviso ' + aviso.id + ':', err);
        const falla = new Error('aviso_sin_franjas');
        falla.aviso = aviso;
        falla.causa = err;
        throw falla;
      }
    }
    return aviso;
  },

  // Una fila por casillero marcado. `dia` y `turno` guardan claves de los
  // vocabularios `dia_semana` y `turno`, nunca la etiqueta: es exactamente lo
  // que guarda `franjas_asistente` del otro lado, y por eso las dos se pueden
  // cruzar. Antes esto era una columna `jsonb` a la que cada pantalla le
  // escribía una forma distinta —pendiente 40—: la aplicación de la Familia
  // mandaba turnos sin decir de qué día, y el formulario del portal preguntaba
  // días y no mandaba nada.
  async guardarFranjasDeAviso(avisoId, franjas) {
    const filas = (franjas || []).map((franja) => {
      const fila = { aviso_id: avisoId, dia: franja.dia, turno: franja.turno };
      if (this.currentTenant) fila.tenant_id = this.currentTenant.id;
      return fila;
    });
    if (filas.length === 0) return [];
    return await this._supabaseRequest('POST', 'franjas_aviso', filas);
  },

  async getFranjasDeAviso(avisoId) {
    return await this._supabaseRequest('GET', 'franjas_aviso', null,
      { aviso_id: `eq.${avisoId}` });
  },

  // Alias con campos camelCase — usado por pwa-familia/index.html (screen-publicar)
  // Normaliza el vocabulario de la UI al vocabulario interno del mapper.
  async crearAviso(avisoData) {
    return await this.crearAvisoFamilia({
      paciente:      avisoData.patientName  || avisoData.paciente,
      patologias:    avisoData.pathologiesRequired || avisoData.patologias || [],
      horarios:      avisoData.scheduleType || avisoData.horarios,
      // Cuándo se necesita el cuidado. Sale de `Franjas.recolectar()`, así que
      // llega como una lista de pares `{ dia, turno }` con claves de catálogo.
      franjas:       avisoData.franjas || [],
      // De quién es el aviso no se manda: lo pone la base sola. `familia_id`
      // nace con valor por omisión `auth.uid()` (migración 0020), y es
      // justamente eso lo que impide publicar un aviso a nombre de otro. Hasta
      // hoy acá viajaba `family_user_id`, una columna que no existe en ninguna
      // migración, así que el pedido entero se caía.
      // Migración 0013. Cada uno con sus dos nombres porque la pantalla del
      // teléfono escribe algunos en inglés y otros en castellano; este atajo
      // existe justamente para absorber esa mezcla.
      zona:            avisoData.zone || avisoData.zona,
      descripcion:     avisoData.description || avisoData.descripcion,
      motivoConsulta:  avisoData.consultationReason || avisoData.motivoConsulta,
      tareas:          avisoData.tasksRequired || avisoData.tareas,
      profesion:       avisoData.professionRequired || avisoData.profesion,
      generoPreferido: avisoData.preferredGender || avisoData.generoPreferido,
      frecuencia:      avisoData.frequency || avisoData.frecuencia
    });
  },

  // --- MÓDULO 3: FICHADO GPS Y REPORTES DE CUIDADO ---

  // El identificador del **legajo** de quien tiene la sesión abierta, que no es
  // el de su **cuenta**. Son dos columnas distintas de la misma tabla:
  // `caregivers.id` es el legajo y `caregivers.user_id` es la cuenta. La
  // función que resuelve el permiso, `legajo_propio()`, devuelve el primero, y
  // la clave foránea de la fichada y la del reporte apuntan al primero.
  //
  // Hasta el 31 de agosto de 2026 las dos pantallas mandaban el de la cuenta,
  // así que la base las rechazaba siempre y `clock_ins` no tenía una sola fila
  // (fue el pendiente 112, cerrado ese mismo día). Vive acá y no en la
  // pantalla porque son dos lugares que
  // necesitan el mismo dato, y porque la regla de resolverlo es una sola.
  //
  // Devuelve nulo si quien mira no tiene legajo. Quien llama decide qué hacer
  // con eso: acá no se inventa ninguno, que es lo que hacía el identificador
  // escrito a mano que había antes.
  async legajoPropio() {
    if (!window.Sesion) return null;
    const sesion = await Sesion.getSession();
    const cuenta = sesion && sesion.user && sesion.user.id;
    if (!cuenta) return null;
    const filas = await this._supabaseRequest('GET', 'caregivers', null, {
      user_id: `eq.${cuenta}`, select: 'id', limit: '1'
    });
    return filas && filas[0] ? filas[0].id : null;
  },

  async registrarFichadoGPS(fichadoData) {
    return await this._supabaseRequest('POST', 'clock_ins', {
      caregiver_id: fichadoData.caregiverId,
      latitude: fichadoData.latitude || fichadoData.lat,
      longitude: fichadoData.longitude || fichadoData.lng,
      event_type: fichadoData.tipoEvent || fichadoData.event_type || fichadoData.estado
    });
  },

  async registrarReporte(entryData) {
    return await this._supabaseRequest('POST', 'reportes', {
      aviso_id: entryData.avisoId,
      caregiver_id: entryData.caregiverId,
      blood_pressure: entryData.presion || entryData.blood_pressure,
      glycemia: entryData.glucemia || entryData.glycemia,
      medications_administered: entryData.medicamentos || entryData.medications,
      daily_notes: entryData.notas || entryData.daily_notes
    });
  },

  async getReportes(avisoId = null) {
    const queryParams = {};
    if (avisoId) {
      queryParams.aviso_id = `eq.${avisoId}`;
    }
    queryParams.order = 'created_at.desc';
    return await this._supabaseRequest('GET', 'reportes', null, queryParams);
  },

  // --- LOS CURSOS ---

  // La oferta general de cursos, la que se ve sin iniciar sesión. Es lo que
  // muestra `cursos.html`, que es una pantalla pública: quien la abre todavía
  // no tiene cuenta, así que nada de lo de abajo le sirve.
  //
  // Va contra la vista `oferta_de_cursos` y no contra la tabla `cursos`, que no
  // le concede nada a `anon`. La vista publica columna por columna lo que se
  // decidió publicar —el Desarrollador, el 31 de agosto de 2026— y lo acota a
  // las filas generales del producto: el curso que arma una Prestadora no sale
  // por ahí (migración 0051).
  //
  // **Y no trae el contenido del curso**: ni lo que se estudia, ni sus
  // evaluaciones, ni sus preguntas. Eso se cursa con sesión y se pide con
  // sesión, más abajo en este mismo archivo.
  //
  // Las filas llegan con la forma que espera `js/catalogo.js`, así que no hay
  // que darlas vuelta acá: la vista ya las arma así.
  async ofertaDeCursos() {
    return await this._supabaseRequest('GET', 'oferta_de_cursos', null, {
      select: '*',
      order: 'orden.asc'
    });
  },

  // La oferta de cursos de quien inició sesión: la general de CeltaTech más la
  // de su Prestadora, nunca la de otra. Eso no lo decide este renglón sino la
  // política de la tabla (migración 0008), que es donde tiene que decidirse.
  //
  // `publicado` se filtra acá y no allá a propósito: la política de `cursos` no
  // lo mira —la de `evaluaciones` sí—, así que un curso guardado sin publicar
  // llegaría igual. Que no llegue a la pantalla es lo que corresponde; que no
  // llegue al navegador sería mejor todavía, y eso es una migración.
  async getCursos() {
    return await this._supabaseRequest('GET', 'cursos', null, {
      select: 'id,clave,nombre,descripcion,horas,nivel,modalidad,otorga_certificado,orden',
      publicado: 'eq.true',
      order: 'orden.asc'
    });
  },

  // --- EL EXAMEN ---
  // La corrección la hace la base (migración 0008), y no por prolijidad: la
  // respuesta correcta vive en una columna que no tiene permiso de lectura
  // para nadie. Acá sólo se piden los enunciados y se manda lo contestado.

  // Las evaluaciones que esta persona puede rendir. Salen de la base porque
  // son un catálogo («los catálogos salen de la base»): ninguna pantalla tiene una clave escrita
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

  // --- EL CHAT ---
  //
  // Estos dos renglones estaban escritos con `fetch` a mano adentro de
  // `mockup-app.html`, armando la dirección y los encabezados por su cuenta.
  // Eran el pendiente 15, y no era prolijidad: quien escribe la llamada a mano
  // decide solo si manda el token de la sesión o la clave pública, y ese es
  // justo el renglón del que depende que la base sepa quién pregunta.
  //
  // **Lo que estos dos métodos NO deciden es el modelo del chat**, que sigue
  // sin decidirse —si es una tabla `messages` o son `conversaciones` y
  // `mensajes`— y está frenado en `docs/ALCANCE.md` §4. Por eso la consulta se
  // mudó tal como estaba, con su tabla y sus columnas de hoy: mover una
  // consulta de lugar no es elegir el modelo, y elegirlo acá sería decidir de
  // costado algo que está esperando decisión.

  // Los mensajes del chat, del más viejo al más nuevo.
  //
  // Hoy trae los últimos y nada más: **no filtra por conversación, porque la
  // tabla de hoy no tiene con qué**. Lo que impide que alguien lea la
  // conversación de otro no es este renglón sino la política de la tabla, y así
  // tiene que seguir siendo.
  async getMensajes(limite = 50) {
    return await this._supabaseRequest('GET', 'messages', null, {
      order: 'created_at.asc',
      limit: limite
    });
  },

  // Manda un mensaje al chat. Devuelve lo que quedó guardado.
  //
  // El autor viaja en el cuerpo porque la columna no tiene valor por omisión
  // (`supabase/migrations/0001_esquema_inicial.sql:140`), a diferencia de la
  // columna de la Organización, que sí lo tiene. **Que venga del navegador no
  // lo vuelve falsificable**: la política exige `author_id = auth.uid()` salvo
  // que quien escriba sea personal de la Prestadora
  // (`supabase/migrations/0020_la_barrera_tambien_va_entre_familias.sql:109`),
  // así que un mensaje firmado con otra persona lo rechaza la base. Si algún
  // día esa columna toma `auth.uid()` por omisión, este parámetro sobra.
  async enviarMensaje(contenido, autorId) {
    const filas = await this._supabaseRequest('POST', 'messages', {
      content: contenido,
      author_id: autorId
    });
    return Array.isArray(filas) ? filas[0] : filas;
  },

  // --- MÓDULO: EL DIRECTORIO ---
  // La única lista que se ve sin iniciar sesión. Sale de `directorio`,
  // que exige las dos condiciones —la Prestadora validó el legajo y la persona
  // autorizó a publicarlo— y no devuelve ni un dato de contacto (migración
  // 0012). Lo que se muestra es lo que el consentimiento promete y nada más:
  // nombre, foto, zona, qué atiende y precio por hora
  // (`data/catalogo-autorizaciones.json`, `perfil_publicado`).
  //
  // **El filtro por Prestadora ya no se pone acá: lo exige la base.** Hasta la
  // migración 0021 esta función agregaba `tenant_id=eq.` y la vista devolvía
  // las dos Prestadoras mezcladas si alguien se olvidaba de hacerlo —era el
  // pendiente 2, y volvía a abrirse cada vez que se escribía una consulta
  // nueva—. Ahora la vista no está concedida a nadie y la única forma de
  // leerla es `directorio_de`, que pide el nombre corto de una Prestadora. La
  // respuesta que mezcla dos empresas dejó de existir.
  //
  // Si no se pudo resolver ninguna Prestadora no se pide nada y se avisa, y se
  // distingue de qué caso se trata: sin enlace, o con un enlace que nombra una
  // empresa que no existe.
  async listarDirectorio() {
    const prestadora = this.currentTenant || await this.initTenant();
    if (!prestadora || !prestadora.slug) {
      throw new Error(this.slugPedido ? 'PRESTADORA_DESCONOCIDA' : 'SIN_PRESTADORA');
    }

    return await this._supabaseRequest('POST', 'rpc/directorio_de', { p_slug: prestadora.slug });
  },

  // Una sola persona del directorio, por su identificador. Va a la misma puerta
  // que la lista —`perfil_del_directorio`, que lee `directorio`— y nunca
  // a la tabla: así una dirección escrita a mano no puede mostrar a alguien que
  // no autorizó publicarse, ni un dato que la vista no devuelve.
  //
  // Pide el nombre corto además del identificador, y no por prolijidad: con el
  // identificador solo, el enlace de una empresa abriría el perfil de alguien de
  // otra. Eso lo exige la función, no esta pantalla.
  //
  // Devuelve `null` cuando no hay nadie con ese identificador. La pantalla lo
  // trata como «este perfil no está disponible», que es distinto de una falla.
  async traerDelDirectorio(id) {
    // Un identificador que no tiene forma de UUID no es de nadie, y se contesta
    // sin preguntarle a la base: ella devolvería un error de sintaxis, y un
    // error en pantalla se lee como que el sistema se rompió en vez de como un
    // enlace viejo. Los hay: hasta el 25 de agosto de 2026 esta pantalla se
    // abría con `?id=1`.
    const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !FORMA_UUID.test(String(id))) return null;

    const prestadora = this.currentTenant || await this.initTenant();
    if (!prestadora || !prestadora.slug) {
      throw new Error(this.slugPedido ? 'PRESTADORA_DESCONOCIDA' : 'SIN_PRESTADORA');
    }

    const filas = await this._supabaseRequest('POST', 'rpc/perfil_del_directorio', {
      p_slug: prestadora.slug,
      p_id: id
    });
    return (filas && filas[0]) || null;
  },

  // La foto del directorio vive en el depósito público `avatares`, y la vista
  // devuelve el camino adentro del depósito y nunca una dirección firmada: las
  // firmadas vencen, y guardar una es guardar algo que deja de funcionar.
  //
  // `Sesion.urlPublica()` arma la misma dirección con la biblioteca de
  // Supabase. El directorio no la usa porque no carga esa biblioteca: es una
  // pantalla que se ve sin cuenta, y traerse el cliente de sesión entero para
  // formar una dirección sería cargarle a cada visita algo que no necesita.
  urlDeFotoPublica(camino) {
    if (!camino) return null;
    return `${this.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/avatares/${camino}`;
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
        zonasTexto: row.zonas_texto || '',
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
    if (table === 'avisos') {
      return {
        id: row.id,
        paciente: row.patient_name,
        patologias: row.pathologies_required || [],
        contacto: row.contact_info || null,
        horarios: row.schedule_type,
        // La grilla de días y turnos no está más acá: cada casillero es una
        // fila de `franjas_aviso` y se pide con `getFranjasDeAviso`. La
        // columna `grid_schedule_7x3` sigue existiendo con lo que le quedó
        // guardado, pero ninguna pantalla le escribe ni la lee (migración 0016).
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
  // la de nombres conocidos. Eso es lo que permite la advertencia del final: hasta
  // 0013 el traductor descartaba en silencio todo lo que no reconocía, y una
  // pantalla podía preguntar algo durante meses sin que se guardara nunca. Así
  // se perdieron la grilla de disponibilidad, la zona y la descripción de un
  // aviso. La falla se veía recién cuando alguien iba a buscar el dato a la
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
      llevar('zonasTexto', 'zonas_texto');
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
    } else if (table === 'avisos') {
      llevar('tenant_id', 'tenant_id');
      // De quién es el aviso no se traduce porque no se manda: `familia_id` la
      // completa la base con `auth.uid()` (migración 0020). Acá había un
      // `llevar('family_user_id', 'family_user_id')` a una columna inexistente;
      // y como `llevar` sólo descarta `undefined`, el `null` con el que llegaba
      // viajaba igual y la base rechazaba el aviso entero. Se saca el campo, no
      // se le cambia el nombre: mandarlo, aunque fuera con el nombre correcto,
      // sería dejar publicar a nombre de otro.
      llevar('paciente', 'patient_name');
      llevar('patologias', 'pathologies_required');
      llevar('horarios', 'schedule_type');
      // `grid_schedule_7x3` no se escribe más: las franjas son filas de
      // `franjas_aviso` y las manda `crearAvisoFamilia`. Si alguna
      // pantalla vuelve a mandar `grillaHorarios`, la advertencia del final de
      // este método lo va a decir, que es justamente lo que se quiere.
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

// Resolver la Prestadora apenas carga la pantalla, para que la marca aparezca
// cuanto antes.
//
// **Éste es el único llamado sin red a propósito, y el motivo es que no muestra
// nada**: lo único que hace de visible es pintar los colores y el logotipo. Si
// falla, la pantalla se queda con la marca del producto, que es justo lo que
// muestra mientras tanto — o sea que no hay nada que avisar. Quien sí necesita
// la Prestadora para mostrar algo la vuelve a pedir con `initTenant()`, que
// reintenta, y ahí el fallo se atrapa y se dice en la pantalla.
document.addEventListener('DOMContentLoaded', () => {
  ClienteDatos.initTenant().catch((err) => {
    console.error('No se pudo resolver la Prestadora al arrancar:', err);
  });
});

window.ClienteDatos = ClienteDatos;
