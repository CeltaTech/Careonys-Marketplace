# Alcance — qué existe y qué no

> **Este archivo es la referencia única sobre el estado del producto.** Si otro documento dice que
> algo está terminado y acá figura como no construido, gana este. Verificado contra el código el
> 2026-08-24. El inventario que lo respalda es `docs/INVENTARIO.md`, del 23.
>
> Acá va solo **qué existe**. Lo que queda abierto vive en `docs/PENDIENTES.md`, con su condición
> de cierre. Ninguna afirmación entra sin archivo y renglón.

---

## 1. Construido y funcionando

| Módulo | Estado |
|---|---|
| Autenticación con Supabase Auth | Funciona, y **el acceso lo decide la sesión**. `acceso.html` es la pantalla de inicio de sesión y manda a cada rol donde le toca; `panel-prestadora.html:444` llama a `Sesion.requireAuth()` y además comprueba el rol. Las migraciones 0005 y 0006 ponen el límite en la base, del lado que no se puede falsificar. Probado con dos Prestadoras: `scripts/probar_aislamiento.mjs`. **El alta de Asistente exige confirmar el correo, y se queda así**: decidido por el Desarrollador el 2026-08-26 (pendiente 21 cerrado) — el alta es de dos pasos, pero nadie puede darse de alta con el correo de otra persona; `supabase/config.toml` tiene `mailer_autoconfirm: false` |
| Directorio de Asistentes con filtros | Maquetado y navegable |
| Perfil del Asistente | Maquetado |
| Portal de registro de Asistentes | Maquetado, con el legajo funcionando: `registrar-asistente.html` guarda las cuatro fichas repetibles y el consentimiento de publicación en las tablas de la migración 0004, y la disponibilidad horaria en las de la 0012 |
| Archivos del legajo | Funcionan. La foto va al depósito público `avatares` y los papeles al privado `documentos-cuidadores`, cada uno en la carpeta de su cuenta; en la base queda el camino, y la dirección se firma al mostrarla (`js/auth.js:265`). Declarados en `supabase/migrations/0006_archivos_del_legajo.sql`, no a mano |
| Consentimiento de publicación | Funciona de punta a punta. El alta pregunta al cerrar (`data/catalogo-autorizaciones.json`, paso 7) y guarda la respuesta en `autorizaciones_asistente`; el directorio cruza contra ella y **no muestra a nadie que no haya dicho que sí** (`supabase/migrations/0007_directorio_con_consentimiento.sql`). Sin respuesta no se publica: la casilla arranca sin marcar. Y el directorio va con `noindex`, que es lo que ese mismo consentimiento promete |
| Evaluaciones de competencias | Funcionan, y **las corrige el servidor**. `examen.html` pide sesión, lista lo que la persona puede rendir y manda las respuestas a `rendir_evaluacion()`; la columna con la respuesta correcta no tiene permiso de lectura para nadie y las opciones salen de la vista `opciones_para_responder`, que no la incluye (`supabase/migrations/0008_cursos_y_evaluaciones.sql`). El intento no se puede escribir a mano: la tabla no tiene política de escritura y los permisos están revocados. `cursos.html` ya no tiene examen propio, enlaza a esta pantalla. Falta el contenido: ver `docs/PENDIENTES.md` punto 24 |
| Motor de fichas del legajo (`js/fichas-legajo.js`) | Funciona. Dibuja, valida y recolecta Matrícula, estudio, experiencia y referencia leyendo `data/catalogo-fichas.json` y `data/catalogo-vocabularios.json`. Ninguna de las cuatro está escrita en la pantalla |
| Formulario integral de datos del Paciente | Maquetado, paso a paso |
| Cliente de datos (`js/apiClient.js`) | Funciona en modo local y modo Supabase |
| Identidad del producto (`js/identidad.js`) | Funciona y está verificada. Ver abajo |
| Alta y baja de una Prestadora desde CeltaTech | Funciona, y **es lo único que este producto recibe de afuera**. La función de borde `supabase/functions/alta-y-baja/index.ts` verifica la firma del pedido y llama a las dos funciones de la migración 0023. Probada contra el servidor desplegado: `scripts/probar_alta_y_baja.mjs`, doce comprobaciones |

**Maquetado** significa que la pantalla existe y se navega, no que la lógica detrás esté escrita.

### La única puerta que este producto le abre a CeltaTech

**Construida el 25 de agosto de 2026**, con las migraciones 0023 y 0024 y la función de borde
`alta-y-baja`. Antes de eso, dar de alta una Prestadora era abrir la consola de la base y escribir
un `insert` a mano — no había otra forma, porque `tenants` tiene políticas de lectura y ninguna de
escritura, y eso está bien: una política de escritura dejaría que cualquiera con una cuenta creara
Prestadoras. Lo que faltaba no era un permiso, era una puerta con llave.

**Este producto no tiene servidor propio**, así que no había ninguna dirección donde CeltaTech
pudiera golpear: son páginas que el navegador se baja y que hablan directo con la base. La puerta
es una función de borde, que vive en los servidores de Supabase y es el único lugar donde puede
vivir — las dos operaciones necesitan la llave de servicio, y una llave de servicio adentro de una
página web la lee cualquiera.

Atiende dos cosas y ninguna más:

| Camino | Qué hace | Contrato |
|---|---|---|
| `POST /functions/v1/alta-y-baja/tenants` | Crea la Prestadora y devuelve su identificador, que es el `tenant_ref` que CeltaTech guarda | `../../docs/MODELO_COMERCIAL_CELTATECH.md` §6.1 |
| `POST /functions/v1/alta-y-baja/eventos` | La deja activa, suspendida o cancelada | §6.2 |

**Lo que no atiende es todo lo demás, y es a propósito.** El Desarrollador puso el límite ese
mismo día: *«una cosa es el producto, y otra es su manejo comercial, no mezclemos o hacemos
líos»*. Así que acá no se guarda de qué contrato viene una Prestadora, no se guarda qué
capacidades tiene contratadas, y no se le pregunta nada a CeltaTech. El alta de §6.1 trae un
`entitlements` adentro: la puerta lo recibe y lo ignora, que es distinto de rechazarlo — el
contrato de quien llama no se rompe, simplemente de este lado no hay quién los use.

De ahí sale, sin escribir una línea, la regla que §6.3 declara no negociable —«fallo abierto con
el último valor conocido»—: **un producto que no le pregunta nada a CeltaTech no se cae cuando
CeltaTech se cae.**

#### Quién puede entrar

La puerta está fuera del control de sesiones de Supabase, declarado en `supabase/config.toml` con
`verify_jwt = false`. No es un descuido: CeltaTech no tiene ni va a tener una cuenta de este
producto, así que no puede traer una sesión. Lo que trae es una firma —un resumen del cuerpo del
mensaje hecho con una clave que saben los dos lados—, y sin firma válida no pasa un solo pedido.

Tres cuidados que no son adorno, y los tres están probados:

- **Se firma el texto crudo** y recién después se interpreta. Firmar lo ya interpretado deja pasar
  dos mensajes distintos con la misma firma, y la comprobación 3 de la prueba es exactamente esa:
  se firma un cuerpo y se manda otro.
- **Las firmas se comparan en tiempo constante.** Comparar cortando en la primera letra distinta
  deja adivinar la firma letra por letra, midiendo cuánto tarda cada intento.
- **Si falta la clave, la puerta no abre.** No existe un modo «sin firma para probar»: una puerta
  que se puede dejar abierta termina abierta.

#### Por qué no lleva una lista de mensajes ya atendidos

El modelo comercial §6.2 pide que el producto guarde los identificadores de los avisos ya
procesados, porque los avisos se reintentan y llegan dos veces. Acá esa lista no hace falta, y no
llevarla es mejor que llevarla:

- **El alta no duplica** porque el nombre corto se deduce del nombre. El mismo nombre da el mismo
  nombre corto, que choca con la fila que ya está, y el alta devuelve la Prestadora que existía en
  vez de crear una gemela.
- **El cambio de estado no se pisa** porque la base guarda cuándo se emitió la orden que dejó el
  estado como está (`tenants.estado_fijado_en`) y descarta todo lo emitido antes. Un aviso
  repetido no cambia nada, y uno atrasado tampoco.

Lo segundo importa más de lo que parece. Los reintentos con espera no conservan el orden: puede
llegar primero el reintento de una cancelación vieja y después el aviso que la reactivaba. Sin esa
fecha, una Prestadora quedaría cancelada por un mensaje que ya no era verdad.

#### Suspender no hace hoy nada nuevo

`status` ya hacía algo desde la 0021: las tres funciones públicas exigen `activo`, así que una
Prestadora suspendida se queda sin puerta de calle —nadie ve su marca ni su directorio sin
sesión— mientras su personal, que sí tiene cuenta, sigue trabajando igual. **La puerta deja eso
exactamente como estaba.** Qué más se le corta a quien no paga cuando hay gente cuidando a una
persona es una pregunta abierta del Desarrollador, anotada en
`../../docs/SUGERENCIAS_DESDE_EL_MARKETPLACE.md`, y no se contesta desde acá.

### El límite entre Prestadoras lo pone la sesión

**Cerrado el 24 de agosto de 2026**, con las migraciones 0005 y 0006. Antes, la Prestadora salía
de la barra de direcciones y viajaba como un filtro más en cada consulta: eso no es aislamiento,
es una sugerencia, porque un filtro que viaja en el pedido lo cambia quien llama.

Cómo quedó:

- **Registrarse ya no decide nada.** El disparador de `auth.users` crea la fila de `profiles`
  (`supabase/migrations/0005_acceso_por_sesion.sql:93`) y valida la Prestadora contra `tenants`, pero **el rol no sale
  de los metadatos**: quien se registra solo queda siempre con un rol sin acceso a los datos de la
  Prestadora. Pedir ser coordinador de otra Prestadora no sirve de nada.
- **Pertenecer y poder ver son dos cosas distintas.** `public.es_personal_de_prestadora()` es el
  punto único de verdad, y las políticas de `caregivers`, de las siete tablas del legajo y de
  `verificaciones_asistente` preguntan por él y por `prestadora_actual()`.
- **La aplicación pregunta en el mismo orden que la base.** Con sesión, la Prestadora sale del
  perfil (`js/apiClient.js:60`); sin sesión, el enlace elige qué directorio se muestra y nada más.
- **Los archivos siguen la misma regla.** Ver la fila «Archivos del legajo» de arriba.

Probado con dos Prestadoras ficticias: `scripts/probar_aislamiento.mjs`, **ciento diecinueve
comprobaciones, contadas y pasadas el 1 de septiembre de 2026** contra la base de esta máquina. Y
falsificado a propósito para verificar que se pone en rojo cuando corresponde.

### El nombre del producto salió del código

**Cerrado el 23 de agosto de 2026.** Estaba escrito a mano 273 veces. Hoy vive en un solo archivo,
`js/identidad.js:41-44`, y no aparece en ninguna otra parte del código.

Cómo quedó:

- **El texto visible usa marcadores** —`{{producto}}`, `{{productoCorto}}`, `{{dominio}}`,
  `{{contacto}}`— y `js/identidad.js` los resuelve al cargar la página. Hay 59 repartidos en las 12
  pantallas, y las 12 cargan el archivo.
- **Lo que persiste se nombra por su función**, según «lo que se guarda para siempre se nombra por lo que hace». El identificador
  técnico del producto es `plataforma` y no la marca (`js/identidad.js:52`); el logotipo es
  `assets/images/logotipo.png`; las claves guardadas en el navegador pasaron a `aspirantes`,
  `busquedas`, `fichadas`, `bitacora` y las cachés a `asistente-v4` y `familia-v4`. Esas se
  renombraron **antes** de que la base guardara nada: renombrarlas después habría sido una
  migración de datos, no un cambio de nombre.
- **Los identificadores del código** dejaron de llevar la marca: `CareonysAPI` es `ClienteDatos` y
  `CareonysAuth` es `Sesion`.
- **Los dos `manifest.json` se generan**, con `scripts/generar_manifiestos.mjs`. No pueden llevar
  marcadores: el navegador los lee como archivo y ahí no corre JavaScript.
- **Un chequeo lo sostiene.** `scripts/verificar_identidad.mjs` falla si la marca reaparece escrita
  a mano, si alguna de las tres copias de `js/identidad.js` se separa, o si los manifiestos quedaron
  viejos. Se probaron los tres casos rompiendo cada cosa a propósito y el chequeo falló en los tres:
  una prueba que no puede fallar no prueba nada.

  Lo corre git antes de cada commit, junto con los otros cinco, desde `.githooks/pre-commit`.
  Suelto sigue andando: `node scripts/verificar_identidad.mjs`.

Lo que **no** cerraba esto: el nombre de la **Prestadora de ejemplo**, «PresDemo», quedaba escrito
a mano en 18 archivos. Era otro problema —el nombre de un cliente, no el del producto— y se cerró
el 26 de agosto de 2026 con el marcador `{{organizacion}}`, contado más abajo.

---

### El texto visible dejó de tutear

Cerró el pendiente 10, el 24 de agosto de 2026. Las catorce pantallas hablan en forma impersonal,
y de *usted* cuando hay que dirigirse a alguien, como pide «trato de usted».

- **Qué se cambió**: 187 renglones de texto visible, en once de las catorce pantallas. Las otras
  tres —`acceso.html`, `examen.html` y `panel-prestadora.html`— ya estaban limpias. La mayoría era
  voseo argentino («Encontrá», «Publicá tu aviso», «¿No tenés cuenta?»), pero también había
  imperativos en tú («describe», «habilita») y futuros de segunda persona («Recibirás una
  respuesta»).
- **Dos criterios de estilo**, tomados para que no convivieran dos formas de escribir lo mismo:
  la etiqueta de un campo no lleva posesivo —«Correo electrónico», no «Su correo electrónico»—, y
  el botón va en infinitivo: «Ingresar», «Registrarse», «Postularse».
- **Un chequeo lo sostiene.** `scripts/verificar_trato.mjs` falla si el voseo, un pronombre
  informal o un imperativo con el pronombre pegado atrás reaparecen en el texto visible. Antes de
  recorrer el proyecto se prueba a sí mismo contra ocho frases que tutean y ocho que no, y si el
  detector falla en cualquiera de las dieciséis se detiene en vez de dar un cero tranquilizador:
  una prueba que no puede fallar no prueba nada. Se probó además plantando «Registrate y completá
  tu perfil» en una pantalla real, y falló.

**Lo que el chequeo no puede ver, y hay que leer con ojos**: el imperativo en tú sin acento.
«Descarga la aplicación» tutea y «El sistema descarga el archivo» no, y se escriben igual.
Distinguirlas necesita entender la frase.

**Lo que se encontró de paso.** El texto de las pantallas se revisó archivo por archivo, y
aparecieron dos cosas que no eran de trato:

- Un `await` adentro de una función que no era `async`, en `pwa-asistente/index.html`. Es un
  error de sintaxis, así que el navegador descartaba el bloque `<script>` entero: la aplicación
  del Asistente se dibujaba completa y no funcionaban ni el ingreso, ni el fichado, ni la
  reportes, sin ningún aviso. Corregido, y ahora `scripts/verificar_guiones.mjs` lo vigila —era
  el único bloque roto de los veinticuatro del proyecto—.
- Un `á` guardado como carácter roto en `solicitar-asistente.html`, que hacía invisible esa frase
  a cualquier búsqueda. Corregido.

---

### Un dato ya no puede entrar como código en una pantalla

Cerró el pendiente 22, el 24 de agosto de 2026. Los sesenta y nueve lugares donde un dato guardado
se metía adentro del marcado ahora pasan por `Texto.escapar`, en seis archivos:
`panel-prestadora.html`, `perfil.html`, `mockup-app.html`, `registrar-asistente.html`,
`pwa-familia/index.html` y `js/fichas-legajo.js`.

- **Cuál era el problema**: un nombre escrito como `<img src=x onerror=...>` no se veía como un
  nombre — se ejecutaba, y se ejecutaba en la pantalla de quien lo estaba leyendo. En este
  proyecto quien lee suele ser el personal de la Prestadora, o sea justo quien tiene los permisos,
  o una familia mirando los reportes de cuidado.
- **Los dos peores casos** no estaban donde decía el pendiente. Uno era el mensaje de chat de
  `mockup-app.html:788`, que lo escribe una persona y lo lee otra. El otro era
  `panel-prestadora.html`, la pantalla que el pendiente daba por arreglada: tenía el renglón de la
  tabla de Asistentes entero sin escapar —nombre, documento, teléfono, profesión y zona— y el
  único `onclick` escrito en el marcado de todo el proyecto.
- **Escapar no alcanzaba ahí, y por eso se sacó el `onclick`.** Adentro de un atributo el
  navegador deshace el escapado antes de leer el contenido como código, así que un `&#39;` vuelve
  a ser una comilla y cierra la cadena igual. El identificador ahora se pasa por
  `addEventListener` (`panel-prestadora.html:236`), que nunca vuelve a leer texto como programa.
- **Un solo punto de verdad**, como pide «ningún patrón repetido sin punto único de verdad»: `js/texto.js` (77 renglones) tiene
  `Texto.escapar` y `Texto.mensajeDeError`, y lo cargan las catorce pantallas. Antes de esto el
  único archivo que cargaban todas era `js/identidad.js`; ahora son dos. La copia local de
  `panel-prestadora.html` se borró. Hay copia idéntica en cada PWA, porque el service worker de
  cada una solo alcanza su propia carpeta, y `scripts/verificar_copias.mjs` compara las tres.
- **De paso cerró la otra mitad de «un mensaje de error es texto visible».** `Texto.mensajeDeError` clasifica la falla —sin
  red, sin permiso, dato repetido, no está, dato inválido— y devuelve la frase que corresponde; el
  texto crudo de la base, que nombra tablas y restricciones, queda en la consola. Reemplazó a los
  `alert('... ' + err.message)` de `mockup-app.html` y al aviso de los reportes de
  `pwa-familia/index.html`.
- **Un chequeo lo sostiene.** `scripts/verificar_escapado.mjs` recorre los treinta y tres archivos
  y falla si un dato entra crudo en el marcado, si aparece un manejador escrito en un atributo, o
  si un `innerHTML` se arma sumando cadenas. Antes de recorrer nada se prueba contra diecisiete
  casos —siete que tienen que fallar y diez que tienen que pasar—, y si el detector falla en
  cualquiera se detiene. Se probó además plantando un dato sin escapar en `cursos.html`, y avisó
  en el renglón exacto.

**Lo que el chequeo no puede ver, y hay que leer con ojos**: no sigue el rastro de una variable.
Acepta `${id}` sin preguntar de dónde salió, así que si tres renglones más arriba alguien le
asignó un dato sin escapar, pasa. Reconoce que el dato está escapado sólo cuando el escapado se
escribe ahí mismo.

**Un marcador para las excepciones legítimas.** Cuando lo que se interpola es marcado que arma el
mismo módulo —y cuyos datos ya van escapados allá—, la línea lleva un comentario que empieza con
`seguro:` y explica por qué. Hay dos, los dos en `js/fichas-legajo.js`.

---

### El error que ve una persona ya no es el que devuelve la base

Cerró el pendiente 28, el 24 de agosto de 2026, y con él la mitad de «un mensaje de error es texto visible» que había
quedado abierta.

- **El contacto de una Familia tiene su propia columna.** `solicitar-asistente.html` pide nombre,
  correo y celular a quien busca un Asistente, y `js/apiClient.js` los mandaba adentro de
  `pathologies_required`, la columna de las patologías, con un comentario que los llamaba
  «metadata extra» — que es como se llama a un dato cuando no se le hizo lugar. La migración
  `0009_contacto_de_la_busqueda.sql` crea `contact_info` y rescata las filas que hubieran quedado
  mal escritas. **Está escrita y todavía no aplicada** (pendiente 30): hasta que corra, esa
  pantalla guarda en una columna que la base no tiene. El pendiente decía que ninguna pantalla mandaba contacto; sí lo mandaba, y era la
  pantalla pública.
- **Un solo clasificador de errores, no dos.** Al cerrar el pendiente 22 quedaron conviviendo
  `Sesion.mensajeDeError` en `js/auth.js` y `Texto.mensajeDeError` en `js/texto.js`: la misma
  decisión en dos lugares, que es justo lo que prohíbe «ningún patrón repetido sin punto único de verdad». Se unificaron en `js/texto.js`,
  que es donde va —un mensaje de error es texto, no es sesión— y que además lo cargan las catorce
  pantallas, cosa que `js/auth.js` no. Los siete llamadores pasaron al nombre nuevo.
- **Ocho avisos mostraban el texto crudo de la base.** Quedaban `alert('Error al ...: ' +
  err.message)` en `pwa-asistente/index.html`, `pwa-familia/index.html` y
  `solicitar-asistente.html`. Ahora todos pasan por `Texto.mensajeDeError`, que deja el detalle
  técnico en la consola y muestra la frase que corresponde.
- **El chequeo lo sostiene.** `scripts/verificar_escapado.mjs` avisa cuando un `.message` o un
  `.error_description` aparece en la misma sentencia que un `alert`, un `confirm`, un `innerHTML`
  o un `textContent`. Su autoprueba pasó de diecisiete casos a veintidós, y fue ella la que
  encontró que la primera versión del detector no veía el crudo cuando venía adentro de una
  plantilla. Se probó además plantando un aviso con el error crudo en un archivo de prueba, y
  avisó en el renglón exacto.
- **Una frase decía un número que nadie verificó.** El aviso de contraseña afirmaba «al menos ocho
  caracteres»; `supabase/config.toml` decía seis, y el servidor remoto puede decir otra cosa
  (es el pendiente 21). Ahora no dice ningún número: el largo lo pone el servidor, y «nunca hardcodear»
  no deja escribir un valor operativo adentro del código.
  **Revertido el mismo día**, más abajo: sin número el aviso no sirve. El número volvió, a un solo
  lugar, y el archivo de configuración dice el mismo.

---

### Lo que se siembra ya habla el idioma del catálogo

Cerró el pendiente 27, el 24 de agosto de 2026.

- **Eran ocho valores, no uno.** El pendiente nombraba `enfermero` en lugar de
  `enfermero_universitario`. Revisada la siembra entera contra
  `data/catalogo-vocabularios.json` aparecieron siete más: `cuidados_paliativos` por `paliativos`,
  `acompanamiento` por `solo_acompanamiento`, y cuatro que no existían en ningún vocabulario
  —`movilidad_reducida`, `traslados`, `curaciones`, `estimulacion_cognitiva`—. Ninguno daba error
  en ninguna parte.
- **El daño no está en la base, está en la pantalla.** Las columnas son texto libre y aceptan
  cualquier cosa. `js/catalogo.js:398` traduce la clave guardada a su etiqueta y, cuando no la
  encuentra, muestra la clave cruda: la ficha decía «enfermero» en minúscula y con guión bajo. Y
  el filtro por Tipo de Asistente busca por la clave que ofrece el catálogo, así que esa fila no
  aparecía nunca.
- **Se arregló por los dos caminos.** `0003_dos_prestadoras_ficticias.sql` quedó corregida, para
  que una base creada desde cero nazca bien, y `0010_claves_de_catalogo_en_la_siembra.sql`
  actualiza las cuatro filas de la base que ya está andando. La 0010 va por identificador y no
  buscando la clave vieja, para que las dos bases queden con exactamente los mismos valores.
  **Está escrita y todavía no aplicada**, igual que la 0009 (pendiente 30).
- **El chequeo lo sostiene.** `scripts/verificar_claves.mjs` empareja la lista de columnas de cada
  `insert` con la de valores y exige que lo que caiga en una columna de catálogo sea una clave de
  su vocabulario. Entiende el texto suelto y el arreglo `'["higiene"]'::jsonb`, y no se confunde
  con un `(select ...)` en el medio ni con una comilla adentro de un nombre. Su autoprueba tiene
  once casos; se probó además plantando dos valores falsos en una migración de prueba, y avisó en
  los dos renglones exactos.
- **Quedan dos columnas sin dueño**, `schedule_type` y `nationality`, que hoy guardan cuatro
  formas distintas para lo mismo. No se adivinó cuál corresponde: es el pendiente 31.
- **Y apareció una lista repetida cuatro veces.** El chequeo de identidad empezó a avisar de
  dieciséis marcas escritas a mano que eran las de siempre, vistas dentro de `.claude/worktrees/`,
  una copia entera del proyecto que deja el CLI. Ninguno de los cuatro chequeos que recorren
  carpetas la excluía, porque cada uno llevaba su propia lista de carpetas a saltear, parecida a
  las otras tres pero distinta. Ahora la lista y el recorrido viven en `scripts/recorrido.mjs` y
  los cuatro la consumen («ningún patrón repetido sin punto único de verdad»).

---

### El directorio dejó de traer sus listas escritas a mano

Cerró la parte del pendiente 20 que dependía del código, el 24 de agosto de 2026.

- **El pendiente decía que el problema estaba en la base y estaba en la pantalla.** Nombraba
  `caregivers.profession` y las claves `domiciliaria`, `enfermera`, `auxiliar` y `at`. Esas
  palabras no eran filas: eran los `<option>` y los `data-` de `directorio.html`. Se verificó
  además que ninguna pantalla escribe hoy una clave inventada en esa columna —`registrar-asistente.html:336`
  y `formulario-integral.html:353` toman las suyas del catálogo—, y de la
  base misma no se puede afirmar nada desde acá, porque `caregivers` no se deja leer sin sesión.
- **Los cuatro filtros salen del catálogo** (`directorio.html:77`): zona, Tipo de Asistente,
  patología y verificación. Eran veinticinco opciones escritas a mano contra «los catálogos salen de la base»; ahora
  son cuatro `data-catalogo`. Las zonas llegan agrupadas por región, que la lista escrita a mano
  no hacía.
- **Las ocho tarjetas de muestra hablan el mismo idioma que los filtros.** Cada una lleva ahora
  `data-zone`, `data-type`, `data-patologia` y `data-verificacion` con claves del catálogo, y
  `filterCards()`, en `js/main.js`, compara clave contra clave.
- **Antes comparaba contra el texto visible de la tarjeta, y fallaba de dos maneras.** La opción
  `medicos` no encontraba nunca a la tarjeta que decía «Médicos», porque la tilde no coincide;
  `parkinson` y `acv` no existían en ninguna tarjeta y devolvían cero sin explicar por qué. Y
  cualquier cambio de redacción rompía un filtro sin que nada avisara.
- **Cero resultados ahora se dice con una frase**, no con un «Mostrando 0» que se lee como si
  algo se hubiera roto: es el cuarto estado.
- **El contador vivía en dos lugares.** `directorio.html` tenía un observador que contaba las
  tarjetas visibles y escribía la misma frase que ya escribe `filterCards()`. Se sacó el
  observador («ningún patrón repetido sin punto único de verdad»).
- **Y salió una palabra que el glosario prohíbe.** `../../docs/GLOSARIO_PRODUCTOS_CAREONYS.md:24` nombra «especialidad»
  entre lo que no se debe usar por «Tipo de Asistente». Estaba nueve veces en seis pantallas,
  incluida una etiqueta de formulario y una columna de tabla. No queda ninguna. La otra palabra
  del mismo tipo, «cuidador» usada como genérico, aparece 176 veces y es el pendiente 33.

---

### El directorio se ve sin sesión, y el consentimiento dice la verdad

Decidido por el Desarrollador el 24 de agosto de 2026. Cerró la parte del pendiente 2 que estaba
esperando una decisión suya.

- **Qué se decidió.** El directorio se ve sin iniciar sesión, con nombre y foto, porque es lo que
  convence a una Familia que todavía no es clienta. Lo que no se muestra nunca son los datos de
  contacto —documento, teléfono, correo y domicilio—, y comunicarse con un Asistente es sólo para
  Familias registradas.
- **Y por eso hubo que cambiar lo que se le promete al Asistente.** El consentimiento decía «su
  perfil se muestra a las Familias **de su Prestadora**, **dentro de la plataforma**», y la
  pantalla no lo cumplía: cualquiera con la dirección veía su nombre y su cara. Se reescribió en
  los tres idiomas (`data/catalogo-autorizaciones.json`, `perfil_publicado`) para decir lo que de verdad
  pasa. No es un retoque de redacción: era una promesa escrita que el producto no cumplía.
- **Lo que no cambió.** El perfil sigue sin aparecer en Google ni en ningún buscador, y el
  teléfono sigue sin mostrarse nunca. Las dos reglas de `docs/CATALOGO.md` quedan como estaban.
- **Y apareció una tercera regla que no estaba escrita.** El chat es la otra puerta por donde se
  escapa el negocio: si adentro del chat se puede escribir un teléfono, las otras dos reglas no
  sirven de nada. Quedó anotada en `docs/CATALOGO.md` y en el pendiente 6.

### La pantalla se llama directorio, y la palabra inventada no quedó en ningún lado

- **Había una palabra que la línea de comandos se inventó y nadie aprobó.** Al Desarrollador le
  resultó desagradable, con razón: dejaba al Asistente como algo puesto en exhibición. Estaba en
  70 lugares de 20 archivos.
- **El nombre bueno ya estaba escrito y no hubo que inventar nada:** `docs/GLOSARIO.md:28` dice
  que `directorio` nombra una pantalla, la pantalla ya se llamaba `directorio.html`, la ficha ya
  se llamaba `perfil.html`, y la casilla guardada en la base ya se llamaba `perfil_publicado`.
- **Y va sin adjetivo.** Por un rato se escribió «directorio público», hasta que el Desarrollador
  preguntó el 24 de agosto de 2026 por qué no «directorio» a secas. No hay respuesta: directorio
  hay uno solo y se ve sin sesión, así que el adjetivo no distinguía nada de nada. Que se vea sin
  iniciar sesión se dice en la oración cuando hace falta decirlo, no en el nombre. «Perfil
  público» perdió el adjetivo por lo mismo, y por una razón más que marcó el Desarrollador ese
  día: lo que no se muestra no está en el perfil, está en el legajo, que es otra cosa.
- **Y no quedó ni un rastro de la palabra vieja, tampoco en las migraciones ya aplicadas.** Ese
  fue el pedido expreso del Desarrollador el mismo día: mientras siga escrita en algún archivo va
  a volver a aparecer sola. La línea de comandos había propuesto dejarla ahí porque una migración
  aplicada es el registro de lo que corrió; el registro de verdad es el historial de Git, que sí
  guarda cada versión y no se puede reescribir por accidente. Cambiaron **sólo comentarios**, más
  el nombre de una política, que la migración 0011 ya había renombrado en el servidor.

### El perfil y el legajo se separaron, y con eso se fue otra palabra inventada

- **Lo marcó el Desarrollador el 24 de agosto de 2026**, leyendo una frase de la línea de comandos
  que los usaba como sinónimos: una cosa es el perfil, donde se elige qué se muestra, como en
  cualquier red social, y otra el legajo, que es el currículum con los papeles que lo respaldan.
  Las dos definiciones quedaron escritas en `docs/GLOSARIO.md` §3, aprobadas ese mismo día.
- **«Perfil profesional» era el Tipo de Asistente con otro nombre.** El glosario heredado ya fija
  **Tipo de Asistente** y prohíbe expresamente llamarlo especialidad, categoría, puesto o rol;
  «perfil profesional» era la misma cosa una vez más, y encima chocaba con «perfil del puesto»,
  que la fila de Tareas también prohíbe. Salió de 16 archivos. La clave del vocabulario pasó de
  `perfil_profesional` a `tipo_asistente`, y con ella el mapa de `scripts/verificar_claves.mjs`.
- **Se cambió ahora porque hoy es gratis.** Esa clave vive únicamente en archivos: en los tres
  catálogos, en los atributos `data-catalogo` de cuatro pantallas y en `js/fichas-legajo.js`. En
  la base la columna se llama `profession` y no se toca, porque «lo que se guarda para siempre se nombra por lo que hace» dice que un
  identificador guardado no se renombra. Cuando el pendiente 7 lleve los catálogos a tablas, el
  mismo cambio habría sido una migración de datos.
- **Donde se completa un legajo ya no dice perfil.** Cambiaron `index.html`, `registrar-asistente.html`
  y `solicitar-asistente.html`: quien carga documentos, certificados y experiencia está completando
  su legajo. A la Familia, que no tiene legajo, se le pide directamente «sus datos y los de su ser
  querido», sin ninguna de las dos palabras.
- **«Perfil público» perdió el adjetivo**, por lo mismo que lo perdió el directorio y por una razón
  más: lo que no se muestra no está en un perfil privado, está en el legajo. Salió de `docs/ALCANCE.md`,
  `docs/GLOSARIO.md`, `docs/MODULOS.md`, `data/catalogo-fichas.json` y un comentario de la migración 0004.
- **Lo que sigue llamándose perfil y no se toca:** la ficha de la cuenta —`profiles` en la base,
  `Sesion.perfil()` en el código—, que es una tercera cosa: quién inició sesión, con qué rol y de qué
  Prestadora. Está guardada así desde el principio. No aparece en texto visible, así que la confusión
  no llega a la pantalla; queda avisada en el glosario para que no vuelva a entrar por ahí.

---

### Quien olvida la contraseña ya tiene por dónde volver

Etapas 1 y 2 del pendiente 21, el 24 de agosto de 2026. La etapa 3 está más abajo, en su propia
sección.

- **Un solo lugar decide qué contraseña vale.** Nace `js/clave.js`. Tres pantallas piden una
  contraseña —el acceso, el alta de Asistente y la que elige una nueva— y hasta ahora cada una
  revisaba por su cuenta; con tres copias, tarde o temprano una pide ocho caracteres y otra seis
  («ningún patrón repetido sin punto único de verdad»). El largo mínimo y las frases de aviso viven ahí y en ningún otro lado.
- **El botón para ver la contraseña se pone solo.** Al cargar la página, todo campo de contraseña
  queda con el suyo. Una pantalla nueva no tiene que acordarse de nada. Dice «Mostrar» y «Ocultar»
  con todas las letras en vez de un dibujo de ojo, porque un ojo tachado no aclara si lo que se ve
  es el estado actual o lo que va a pasar al apretarlo.
- **Volvió el número, y se explica por qué.** La nota de más arriba —«ahora no dice ningún número:
  el largo lo pone el servidor»— no aguantó el uso: sin número, el único aviso posible es «no
  cumple», y la persona se entera de cuánto le falta recién cuando el servidor la rechaza. El ocho
  vive en `js/clave.js` y `supabase/config.toml` dice el mismo. Si el servidor alojado termina
  pidiendo menos, el navegador queda más exigente, que es el lado seguro del desacuerdo.
- **Dos pantallas nuevas.** `recuperar-clave.html` pide el correo y manda el enlace;
  `nueva-clave.html` recibe a quien llega desde ese enlace y guarda la contraseña nueva.
  `acceso.html` enlaza a la primera, y le pasa el correo ya escrito **por `sessionStorage` y no
  colgado de la dirección**: un correo en la dirección queda en el historial del navegador y en el
  registro de cualquier servidor que la vea (§4 de `CLAUDE.md`).
- **La pantalla no dice si ese correo tiene cuenta.** Contesta lo mismo en los dos casos.
  Contestar distinto le regalaría a cualquiera una forma de averiguar quién está registrado acá.
- **El estilo de las tres pantallas de sesión se subió a `css/styles.css`.** Vivía adentro de
  `acceso.html`; con dos pantallas más de la misma cara, tres copias del mismo bloque se separan
  solas.
- **El archivo de configuración y el servidor alojado ya dicen lo mismo.** Era la mitad del
  pendiente 21 y se resolvió con `supabase config push`, sin tocar el tablero de Supabase. En el
  servidor, `site_url` decía `http://localhost:3000` y la lista de direcciones de vuelta estaba
  **vacía**: cualquier enlace de correo caía en la portada. Ahora apunta a la dirección publicada
  en Vercel, con las tres que Vercel le da al proyecto más el servidor de pruebas de esta máquina,
  y el largo mínimo de contraseña quedó en ocho de los dos lados.
- **Empujar el archivo entero casi apaga dos cosas que nadie quería apagar.** El primer intento
  llevó al servidor lo que el archivo decía por defecto de fábrica, y eso incluía **apagar la
  verificación en dos pasos** (que el servidor tenía encendida) y **acortar de ocho a seis dígitos
  el código que llega por correo**, que lo vuelve cien veces más fácil de adivinar. Se detectó en
  el mismo momento porque el comando imprime la diferencia antes de aplicarla, se corrigió el
  archivo y el segundo intento lo dejó como estaba. Queda anotado porque `supabase config push`
  **empuja todo el archivo, no lo que uno cambió**: antes de correrlo hay que leer la diferencia
  entera, no sólo buscar el renglón propio.
- **Cuatro regexes del clasificador de errores no funcionaban.** `js/texto.js` traía ocho bytes de
  retroceso donde tenía que decir `\b`: los patrones de 400, 401, 403, 404, 409 y 422 pedían un
  carácter de retroceso literal alrededor del número, así que ningún código HTTP encontraba su
  frase y todos caían en «avisar al soporte». Los metió un `heredoc` de la línea de comandos, que
  en esta máquina se come las barras invertidas. Arreglado en el original y en las dos copias, y
  comprobado con un caso de 404 que antes fallaba.

### Confirmar el correo ya no cuesta el legajo

Etapa 3 del pendiente 21, el 24 de agosto de 2026.

- **El alta se parte en dos: crear la cuenta y guardar el legajo.** Eran un solo tramo, y ahí
  estaba el problema. Cuando el servidor exige confirmar el correo —y lo exige—, `signUp` devuelve
  la cuenta creada pero **sin sesión**, y sin sesión no se puede escribir nada: la base rechaza las
  escrituras de un visitante anónimo. Como el tramo que escribe vivía adentro del envío, la única
  salida era volver a empezar. Ahora vive aparte y se entra por dos puertas.
- **El aviso que mandaba a empezar de nuevo se fue.** Decía que había que confirmar el correo y
  **volver a completar el formulario**, con lo que se perdían los siete pasos recién cargados. En
  su lugar aparece un panel: la cuenta quedó creada, el correo salió a tal dirección, lo cargado
  sigue en pantalla, y hay dos botones.
- **«Ya confirmé, continuar».** Entra con la contraseña que la persona todavía tiene escrita y
  sigue guardando desde donde se había frenado. Si todavía no tocó el enlace, el servidor contesta
  que falta confirmar y el aviso lo dice sin borrar nada: se vuelve a intentar y listo. La
  contraseña vive en memoria mientras dura la espera, nunca en el almacenamiento del navegador ni
  colgada de la dirección (§4 de `CLAUDE.md`).
- **«Volver a mandar el correo»**, para el mail que no llegó. El servidor limita cuántos manda por
  hora, así que un segundo pedido seguido puede volver con ese aviso en vez de un correo, y el
  panel lo traduce.
- **Comprobado con las tres puertas cerradas.** Se suplantaron sólo las llamadas que hablan con el
  servidor, y el camino del navegador corrió entero: el panel aparece con el correo escrito y el
  botón de enviar se esconde; el botón se deshabilita mientras está en curso («todo botón que dispara una operación se apaga»); con el
  correo sin confirmar el aviso sale en rojo y no se pierde ni un dato; con el correo confirmado se
  guardan la ficha y las cuatro secciones del legajo, la pantalla vuelve a su estado normal y la
  contraseña desaparece de la memoria y de la pantalla.

### El alta del teléfono ya pide una contraseña

Cierra el pendiente 38, el 24 de agosto de 2026.

- **La contraseña era el número de documento.** `pwa-asistente/index.html` creaba la cuenta con el
  correo y el valor del campo del documento, que está escrito tres renglones más arriba en la misma
  pantalla. Un número de documento figura en papeles, se dicta por teléfono y lo conoce cualquiera
  que haya visto una fotocopia: no es un secreto. Ahora la pantalla la pregunta, con su repetición,
  como cualquier otra alta.
- **Y un alta fallida ya no sigue adelante en silencio.** Si la cuenta no se podía crear —porque el
  correo ya tenía una, por ejemplo—, el error se anotaba en la consola del navegador y la pantalla
  mostraba «¡Legajo enviado!» igual: el legajo quedaba escrito y la persona se iba convencida de
  tener cuenta. Ahora se frena ahí, con el aviso traducido, y no se guarda nada.
- **El largo mínimo no se volvió a tipear.** Las dos pantallas del teléfono no cargaban
  `js/clave.js`, que es el archivo que sabe qué contraseña vale. Ahora lo cargan, y de paso ese
  archivo pasó a escribir él mismo el largo mínimo y el aviso de qué falta en cada campo donde se
  elige una contraseña nueva, así que los dos `8` que estaban tipeados a mano en
  `registrar-asistente.html` se borraron. Donde se escribe una contraseña vieja —el acceso— no se
  pone mínimo a propósito: una cuenta creada antes puede tener una más corta que la que hoy se
  pide, y el navegador no la dejaría ni probar.
- **La espera del correo funciona igual que en la pantalla grande.** Cuando el servidor exige
  confirmar, aparece el mismo panel de la sección de arriba: la cuenta quedó creada, el correo
  salió a tal dirección, lo cargado sigue en pantalla, «Ya confirmé, continuar» entra y guarda
  desde donde se había frenado, y el otro botón vuelve a mandar el correo.
- **El botón de ver la contraseña le pisaba el texto escrito.** En las pantallas del teléfono los
  campos de un formulario se pintan con una regla de dos clases, que pesa más que la que le hace
  lugar al botón: el relleno volvía al original y lo escrito terminaba abajo del botón. La regla
  ahora pide tres piezas —la caja, el tipo y una marca que el propio `js/clave.js` le pone al
  campo— y por eso gana. Queda comprobado con un campo recién creado al lado del otro: con la marca
  mide 72 píxeles de relleno, sin la marca mide 14.
- **Comprobado con las puertas cerradas**, con datos inventados y sin escribir una sola fila en la
  base: la contraseña vacía, la corta y las dos que no coinciden frenan antes de crear nada; el
  correo ya registrado crea cero legajos donde antes creaba uno; y el camino bueno crea la cuenta
  con la contraseña elegida y no con el documento.

Ya no queda ninguna contraseña de mentira en pantalla. La de acceso venía prellenada con seis
dígitos para poder mostrar el producto sin tipear, y el correo que la acompañaba tampoco
correspondía a ninguna cuenta. Los cuatro campos se vaciaron el 25 de agosto de 2026 y arrancan
con su indicación adentro (`pwa-asistente/index.html:329` y `:333`,
`pwa-familia/index.html:591` y `:594`). Lo que falta para cerrar el pendiente 47 es la otra mitad:
que exista una cuenta de Asistente ficticia con la que se pueda entrar, y eso depende del tope de
correos del pendiente 45.

### Las trece migraciones ya corren en el servidor

Comprobado el 24 de agosto de 2026 contra el proyecto real: el servidor tiene aplicadas 0001 a
0013, las mismas trece que hay en `supabase/migrations/`. Antes tenía hasta la 0008, y esa
distancia costaba dos cosas que ya no cuestan:

- **La columna del contacto existe.** La 0009 agregó `avisos.contact_info`, que es donde
  `js/apiClient.js:1184` escribe el contacto de una búsqueda. Mientras no estaba, el formulario
  público de `solicitar-asistente.html` mandaba una columna que la base no tenía.
- **Las filas de ejemplo hablan el idioma del catálogo.** La 0010 reemplazó las claves viejas de
  las cuatro filas ficticias —«enfermero» y compañía— por las que las pantallas esperan.
- **La 0011 armó el directorio**, que es lo que hoy se ve sin sesión.
- **La 0012 le dio lugar a la disponibilidad** y cambió el nombre de una tabla, abajo.
- **La 0013 le dio lugar a lo que pide una Familia**, que es lo que sigue.

Queda dicho porque el estado real manda sobre el documentado (la regla de la empresa «el estado real está por encima del documentado»): un archivo en
`supabase/migrations/` describe lo que se quiso aplicar, no lo que corre. Esto último se preguntó.
Para la 0012 se preguntó dos veces, porque la primera vez el programa dijo que había terminado y
la migración había fallado a la mitad: se le pidió a la base, tabla por tabla, que dijera qué
tiene. `banderas_asistente` contesta que no existe; `autorizaciones_asistente`,
`disponibilidad_asistente` y `franjas_asistente` contestan que existen y que a un visitante sin
sesión no le muestran nada; y `directorio` devuelve la columna `reemplazos_urgentes` y
ya no devuelve `disponible_urgencias`.

### Las últimas listas escritas a mano se fueron de las pantallas

Quedaban dos, y eran las más visibles: las diez tarjetas del asistente de seis pasos de
`formulario-integral.html`. Cada una traía su ícono, su título y su explicación escritos adentro
del HTML —setenta y dos renglones—, que es exactamente lo que prohíbe «los catálogos salen de la base». Agregar una
tarea de cuidado era editar una pantalla. Ahora las dos grillas se declaran en dos renglones y el
contenido sale del catálogo:

```html
<div class="card-select-grid" data-catalogo="tarea_cuidado"
     data-catalogo-como="tarjetas" data-catalogo-nombre="tarea"></div>
```

- **El ícono y la explicación se mudaron al catálogo**, no se inventaron: son los mismos diez que
  estaban en la pantalla. Los ítems del catálogo ganaron dos campos optativos, `icono` y `bajada`.
  Los que no los tienen se dibujan igual, con su etiqueta y un ícono neutro; escribirles una
  explicación inventada habría sido volver a poner texto de producto donde no va.
- **Y aparecieron seis opciones que la pantalla se estaba comiendo.** Las tarjetas mostraban seis
  de las ocho tareas y cuatro de los ocho tipos de Asistente. Las que faltaban no eran una decisión
  de nadie: eran las que quien tipeó el HTML no tipeó. Un Asistente podía ofrecer «Aplicación de
  inyecciones y sondas» —el vocabulario entero se le muestra desde siempre— y ninguna Familia
  podía pedirla. Las dos puntas vuelven a hablar de lo mismo.
- **El título de cada tarjeta ahora es el del catálogo.** Decía «Cuidador/a Domiciliario/a» donde
  el catálogo dice «Asistente / Cuidador domiciliario»: el mismo dato con dos redacciones, que es
  la falla que el catálogo existe para no tener.

**Cada tarjeta pasó a ser una etiqueta con su casilla adentro**, y eso borró más código del que
agregó. Antes un recuadro se pintaba con una clase de CSS que ponía y sacaba `js/main.js`, con
veinte renglones que además tenían que acordarse de que los tipos de Asistente son de a uno. Ahora
el tipo de control lo dice la pantalla —`tarjetas` para marcar varias, `tarjetas-una` para marcar
una sola—, de que se marque una sola se ocupa el navegador, y lo elegido se lee del formulario en
lugar de leerse de una clase. De yapa, la grilla se puede recorrer con el teclado, que antes no se
podía.

**Y el aviso de «Cargando opciones…» dejó de ser sólo de los desplegables.** Un grupo de casillas
o una grilla de tarjetas que todavía no llegó se veía igual que uno que vino vacío, que es
justamente la falla que el catálogo existe para no tener («los cuatro estados»).

### Lo que una Familia pide ya tiene dónde guardarse

Tres pantallas le preguntan cosas a una Familia y `avisos` tenía siete columnas. Lo que
sobraba no daba error: se perdía en silencio un paso antes de la base. La 0013 le dio una columna
a cada cosa —`zone`, `description`, `consultation_reason`, `tasks_required`,
`profession_required`, `preferred_gender` y `frequency`— y las tres pantallas ya las usan.
Comprobado en el navegador, pantalla por pantalla, mirando la fila que sale hacia la base.

- **El motivo de la consulta salió de adentro de las patologías.** `solicitar-asistente.html`
  mandaba «quiero hacer un curso» en la columna donde van las patologías del paciente, que es la
  misma falla que la 0009 arregló con el teléfono. Ahora va a `consultation_reason`, y la
  migración además rescata las filas que ya se hubieran escrito así.
- **La zona se elige de una lista.** En el teléfono se escribía a mano —«Ej: Palermo»—, así que
  dos personas del mismo barrio podían escribirlo de dos maneras y ningún filtro juntarlas. Ahora
  sale del vocabulario `zona`, que tiene dos escalones: la región entera o el barrio suelto.
- **El asistente de seis pasos manda los seis.** Preguntaba tareas, tipo de Asistente, género
  preferido, frecuencia y descripción, y armaba la búsqueda con `patologias: []` y
  `horarios: 'flexible'` escritos a mano. De paso se corrigieron las claves de las tarjetas, que
  decían `movilidad`, `at`, `domiciliario` y `enfermero`: ninguna era clave de ningún vocabulario.
  Como hasta hoy nadie las leía no ensuciaron ninguna fila, y a partir de ahora sí se leen.
- **Y elegir el tipo de Asistente pasó a ser elegir uno.** Las cuatro tarjetas del paso 3 se
  podían marcar todas a la vez, y a la columna va una sola clave.

**El traductor dejó de perder cosas en silencio**, que es lo que hacía posible todo lo anterior.
`ClienteDatos._mapToDatabase` armaba la fila campo por campo y descartaba sin decir nada cualquier
nombre que no reconociera: así se perdieron la grilla de disponibilidad, la zona y la descripción,
y la falla se veía recién cuando alguien iba a buscar el dato a la base. Ahora cada campo se
declara una sola vez y de esa misma lista sale la de nombres conocidos, así que el traductor puede
avisar: *«la tabla avisos no tiene dónde guardar «colorFavorito». Eso se pregunta en
pantalla y no se está guardando»*. Era el pendiente 37.

**Falta una sola cosa de las que se preguntan**, y se dejó afuera a propósito: la modalidad de
contratación iría a `schedule_type`, que hoy guarda cuatro formas distintas de nombrar lo mismo y
no tiene vocabulario que la gobierne. Es el pendiente 31 y lo decide el Desarrollador; hasta
entonces, escribir ahí una quinta forma sería empeorarlo.

### La grilla de disponibilidad dejó de tirarse, y las banderas se llaman autorizaciones

El último paso del alta preguntaba días y turnos —veintiún casilleros— y no los guardaba en
ningún lado: `caregivers` no tenía dónde ponerlos y el traductor del cliente de datos los
descartaba sin decir nada. Era el pendiente 23, y estaba abierto desde que la pantalla existe.

- **Dos tablas nuevas, y las dos son módulo compartido** (`CLAUDE.md`, «los módulos»):
  `disponibilidad_asistente` guarda lo general —hoy, si acepta reemplazos urgentes— y
  `franjas_asistente` guarda una fila por casillero marcado. Ninguna de las dos sabe qué es un
  directorio ni una postulación: son verdad sobre un Asistente aunque el trabajo llegue por
  prestación directa.
- **La grilla se dibuja desde el catálogo**, no está escrita en las pantallas. `js/disponibilidad.js`
  la arma con los vocabularios `dia_semana` y `turno`, y por eso lo que se guarda son las claves
  —`lunes`, `manana`— y no las etiquetas que se ven. Agregar un turno de madrugada hoy es una fila
  de `data/catalogo-vocabularios.json`.
- **Las dos pantallas del alta comparten ese archivo**, así que dejaron de tener cuarenta y dos
  celdas escritas a mano entre las dos.
- **La pantalla del teléfono ahora guarda.** No llamaba nunca a `guardarLegajoAsistente`: quien se
  registraba desde el teléfono llenaba la grilla y no quedaba nada. Con el pendiente 36 cerrado
  manda además las cuatro fichas y el consentimiento.
- **«Bandera» se fue del proyecto.** La palabra la había puesto la línea de comandos traduciendo
  *flag*, y el Desarrollador la sacó el 24 de agosto de 2026: «una bandera es una tela que
  identifica un país o un ejército, pero nunca es una casilla». La tabla es
  `autorizaciones_asistente`, el catálogo es `data/catalogo-autorizaciones.json`, y donde la
  palabra nombraba un interruptor de código —`useSupabase`— dice interruptor. Sólo queda en el
  nombre del archivo `0004_legajo_matricula_verificaciones_banderas.sql`, a propósito: el programa
  de Supabase reconoce cada migración por su número **y su nombre**, y renombrar una que ya corrió
  obliga a repararla a mano en el servidor.
- **Y «disponible para reemplazos urgentes» dejó de ser una autorización.** El Desarrollador
  decidió el mismo día que eso no es algo que se permita sino algo que se está: se mudó al paso de
  disponibilidad. Con eso cerró también el pendiente 26.

### Lo que una Familia necesita se pregunta igual que lo que un Asistente puede dar

Hecho el 25 de agosto de 2026. Es el pendiente 40, y la mitad que la línea de comandos puede
hacer está hecha; la otra mitad es del Desarrollador y está al final.

- **El problema no era la columna, era la pregunta.** `avisos.grid_schedule_7x3` es una
  columna `jsonb` y cada pantalla le escribía una forma distinta porque **ninguna de las dos
  preguntaba las dos cosas**: `pwa-familia/index.html` pedía turnos sin decir de qué día y
  `formulario-integral.html` pedía días sin decir de qué turno. Con media pregunta no había forma
  de escribir un casillero, así que una mandaba `{ turnos: [...] }` y la otra no mandaba nada.
- **Las dos pantallas preguntan ahora la misma grilla de veintiún casilleros**, la misma que usa el
  Asistente desde el pendiente 23. No es una grilla nueva: `js/disponibilidad.js` ya sabía armarla
  desde el catálogo, y lo único que le faltaba era poder servir a los dos lados. Ahora recibe qué
  bloque del catálogo tiene que leer, y `data/catalogo-disponibilidad.json` declara dos: la del
  Asistente dice «¿Cuándo puede trabajar?» y marca «Disponible»; la de la búsqueda dice «¿Cuándo se
  necesita el cuidado?» y marca «Se necesita». El mismo casillero, dos preguntas distintas.
- **Se guarda como lo guarda un Asistente: una fila por casillero.** La migración 0015 crea
  `franjas_aviso`, espejo exacto de `franjas_asistente` —clave de `dia_semana`, clave de
  `turno`, una sola por par, aislamiento por Prestadora, y `anon` sin ningún permiso—. El día que
  alguien quiera cruzar lo que un Asistente puede dar con lo que una Familia necesita, de los dos
  lados va a haber filas comparables.
- **Se fue el lunes-a-viernes que nadie eligió.** El portal traía cinco días premarcados de fábrica:
  quien no tocara nada publicaba un pedido de lunes a viernes sin haberlo dicho. La grilla arranca
  vacía, que es la misma decisión que ya se había tomado para la del Asistente.
- **Publicar y guardar los casilleros son dos pedidos, y la pantalla no miente sobre eso.** Si el
  segundo falla, la búsqueda ya quedó publicada: decir «no se pudo publicar» haría que la persona
  publique de nuevo y queden dos. Dice lo que pasó —que la búsqueda está publicada y que los días y
  turnos no se guardaron— y aclara que no hace falta publicarla otra vez (`js/texto.js`,
  `aviso_sin_franjas`).
- **Los estilos de la grilla salieron del HTML.** Estaban escritos adentro de
  `pwa-asistente/index.html` y ahora viven en `css/styles-pwa.css`, que las dos aplicaciones
  comparten byte a byte. Es un renglón menos para el pendiente 33.
- **Comprobado en el navegador, en las tres pantallas.** Los veintiún casilleros se dibujan como
  grilla en las tres; el título, la bajada y la ayuda salen del catálogo y son distintos según de
  qué lado se pregunte; marcar martes a la tarde y sábado a la noche devuelve exactamente esos dos
  pares; y quien navega con el teclado escucha «Martes, Tarde, Se necesita», que es la pregunta de
  la búsqueda y no la del Asistente. La del Asistente sigue diciendo «Disponible» y conserva su
  pregunta de reemplazos urgentes.

**Lo que falta y es del Desarrollador.** Son dos cosas, y la segunda toca datos guardados, que por
regla no las mueve la línea de comandos:

1. **Aplicar la migración `supabase/migrations/0016_franjas_de_un_aviso.sql`** pegándola en el
   panel de Supabase, en SQL Editor. Hasta que corra, publicar una búsqueda guarda la búsqueda pero
   no sus días y turnos, y la pantalla lo dice.
2. **Vaciar y sacar `avisos.grid_schedule_7x3`.** Ya no la escribe ni la lee nadie, pero la
   columna existe y tiene adentro las dos formas viejas. La línea es
   `alter table public.avisos drop column grid_schedule_7x3;`

### El alta del teléfono guarda el legajo entero, y no sólo la disponibilidad

Cierra el pendiente 36, el 25 de agosto de 2026.

Quien se registraba desde el teléfono quedaba dado de alta sin legajo y sin poder aparecer nunca en
el directorio: el directorio exige una fila en `autorizaciones_asistente` con un `join` y no con un
`left join` (`supabase/migrations/0012_autorizaciones_y_disponibilidad.sql:186`), y esa pantalla no
tenía el paso que la crea. Ahora manda lo mismo que el portal.

- **Los dos pasos que faltaban se dibujan desde el catálogo**, no están escritos en la pantalla.
  Matrícula y estudios en el paso 2, experiencia laboral en el paso 3 y referencias en el paso 5
  salen de `data/catalogo-fichas.json` a través de `js/fichas-legajo.js`
  (`pwa-asistente/index.html:1866`, `montarFichas`). El paso de cierre sale de
  `data/catalogo-autorizaciones.json`.
- **El paso de cierre pasó a ser un módulo.** Estaba escrito adentro de `registrar-asistente.html`,
  cuarenta renglones que traían el archivo y armaban las casillas. Ahora es `js/autorizaciones.js`,
  y las dos pantallas consumen el mismo («ningún patrón repetido sin punto único de verdad»). Copiarlo habría sido tener el mismo paso dos
  veces, con el precio de siempre: se arregla uno y el otro queda viejo.
- **Subir los archivos también dejó de estar en la pantalla.** `FichasLegajo.subirArchivos`
  (`js/fichas-legajo.js:291`) es el único lugar que sabe a qué depósito van la matrícula y el
  título, y devuelve la lista de los que no subieron para que quien llama avise una sola vez.
- **De paso arregló algo que estaba mal en el portal.** Cuando la ficha de estudio no traía archivo
  —es optativo—, la fila viajaba igual con una clave `archivo` en `null`. La columna se llama
  `archivo_url` (`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:68`), así
  que esa fila no entraba y la persona no se enteraba.
- **Y el alta del teléfono creaba cuentas sin dueño.** `registrarAspirante` no escribía `user_id`,
  así que la persona quedaba con cuenta y con legajo, pero el legajo no era de nadie y no lo podía
  abrir. Se agrega en `guardarLegajo` (`pwa-asistente/index.html:1931`), que es donde ya se sabe
  quién inició sesión.

**Cómo se comprobó, el 25 de agosto de 2026.** En dos mitades, porque el servidor alojado todavía
no deja registrar cuentas de prueba (pendiente 39). En el navegador: la pantalla arma el legajo
entero —cuatro fichas, la autorización y dos franjas horarias— y se guardó tal cual salió. Contra
la base local, con las catorce migraciones puestas y con el `ClienteDatos` de verdad cargado desde
`js/apiClient.js`, ese mismo legajo dejó **una fila en cada una de las cinco tablas** que antes
quedaban vacías —`matriculas_asistente`, `estudios_asistente`, `experiencia_laboral_asistente`,
`referencias_asistente`, `autorizaciones_asistente`—, más la de `disponibilidad_asistente` y dos de
`franjas_asistente`, y `caregivers.user_id` con la cuenta que acababa de crearse.

La prueba puede fallar, que es lo que la hace valer: con el legajo validado por la Prestadora y la
autorización en «sí», la persona aparece en `directorio`; poniendo esa misma autorización
en «no», desaparece. Es exactamente el camino que antes no existía.


### La prueba de aislamiento vuelve a correr entera

Cierra el pendiente 39, el 25 de agosto de 2026.

La prueba de la que depende la regla de la empresa «aislamiento entre Organizaciones» se había
quedado sin poder arrancar: empieza creando cuentas ficticias y el servidor alojado las rechaza.
El propio pendiente proponía tres caminos y dejaba el tercero sin probar. Es el que anda.

- **Corre contra la base local**, con `node scripts/probar_aislamiento.mjs --local`. Ahí el
  registro no manda ningún correo, así que ni el tope ni la confirmación la frenan.
- **Pasaron las 36 comprobaciones**, dos corridas seguidas: las tablas, los archivos de los dos
  depósitos, el directorio con su consentimiento y el examen que corrige la base.
- **Y la base local estaba al día**: las catorce migraciones de entonces aplicadas desde cero, con
  las dos Prestadoras ficticias que la prueba necesita para distinguir «aislado» de «todo
  bloqueado».

Lo que no se arregla con esto es el correo del proyecto alojado, que sigue con el servicio de
fábrica y su tope bajo. Eso es el pendiente 45, y toca al alta de verdad, no sólo a las pruebas.


### Y después se pudrió en diez migraciones, hasta que volvió a correr el 26 de agosto de 2026

Diez migraciones después de aquella corrida, la prueba **ya no arrancaba y nadie se había
enterado**. Es el caso exacto que la regla «una prueba que no puede fallar no prueba nada»
describe, y esta vez salió a la luz en las tres formas de una vez.

- **No compilaba.** Dos `const retoque` en el mismo alcance: Node ni siquiera llegaba a abrir una
  conexión. Renombrada la segunda a `retoquePonderacion`.
- **La base local estaba diez migraciones atrás**, en la 0014, mientras el servidor alojado ya
  tenía las 24. Lo primero que devolvió la prueba fueron ocho fallos de «no encuentro la tabla»
  que no eran agujeros de aislamiento: eran tablas que en esa base no existían.
- **Y arrancaba pidiendo la lista de Prestadoras**, que la migración 0021 quitó a propósito. Con
  las migraciones al día, la prueba se cortaba en el primer renglón: «hacen falta dos
  Prestadoras, hay 0». Ahora las pide de a una por su nombre corto, con
  `prestadora_por_slug`, que es la única puerta que quedó.

**El fallo que importó es el del directorio, y lo destapó la única comprobación positiva que
tenía.** La prueba leía `directorio` derecho, y la 0021 le sacó el permiso a todo el mundo:
las dos comprobaciones que esperan **no** ver a nadie seguían diciendo «bien», porque no veía a
nadie nunca. La tercera —la que exige que la persona **sí** aparezca después de autorizar— es la
que se puso en rojo. Sin ella, tres comprobaciones rotas habrían seguido pasando por años. Hoy el
directorio se pide por `directorio_de(<nombre corto>)` y el perfil por
`perfil_del_directorio(<nombre corto>, <id>)`.

**Y se le agregó la comprobación que faltaba desde la 0021:** que el legajo publicado de una
Prestadora **no** aparezca en el directorio de la otra. Es la razón de ser de esa migración, y
hasta hoy nada la verificaba.

**Resultado: 49 comprobaciones, todas en verde**, contra las 24 migraciones. Cubren el perfil que
crea el registro, el legajo, los archivos de los dos depósitos, el directorio de cada Prestadora,
el examen, y la barrera entre dos Familias de una misma Prestadora —avisos, horarios, mensajes,
reportes y ponderaciones—.

**Y volvió a correr ese mismo día contra las 27, con el mismo resultado: 49 de 49.** Pero para
que diera eso hubo que aplicarle a la base local dos migraciones que le faltaban, y ahí está lo
que conviene anotar. `supabase migration list --local` mostraba la 0026 y la 0027 con el archivo
presente y el renglón de la base vacío, mientras que `--linked` las tenía completas: **la base
local se había vuelto a atrasar el mismo día en que se la había puesto al día**, lo cual dice que
no es un descuido sino la forma normal de las cosas. `supabase migration up --local` las aplicó
enteras las dos, que de paso es una comprobación de que corren o no corren, sin dejar la base a
mitad de camino.

**Lo que importa no es el atraso sino que la prueba no lo nota.** El 49 de 49 es el mismo número
que habría dado sin aplicar ninguna de las dos: la 0026 sólo reemplaza la vista y la 0027 sólo
inserta filas, ninguna crea tabla ni columna, y la prueba no nombra en sus 828 renglones ni a
`verificaciones_asistente` ni a la lista `comprobaciones`. Cuando la base estaba diez
migraciones atrás la prueba se rompió a los gritos, pero fue porque aquellas migraciones
**creaban tablas**. Una que sólo aprieta una política o sólo siembra datos la deja probando la
forma anterior y contestando en verde.

**Y eso quedó arreglado el mismo día: la prueba ya no avisa, se niega.** Antes de resolver la
dirección de la base y mucho antes de crear ninguna cuenta ficticia, `scripts/probar_aislamiento.mjs`
le pregunta a la línea de comandos qué migraciones tiene aplicadas la base a la que apunta y las
compara con los archivos de `supabase/migrations/`. Si falta una sola, imprime cuáles faltan y
sale sin haber tocado nada. **Falla cerrado en los tres casos en que no puede saberlo**: si no hay
migraciones en disco, si el comando no corrió, o si el listado llegó sin un solo renglón de versión.

**Y se comprobó con la base deliberadamente atrasada, porque con la base al día una comprobación
escrita al revés pasa igual.** Se dejó un archivo de migración de mentira en la carpeta, con un
comentario adentro y nada más, que existe como archivo y no está aplicado en ninguna base: la
prueba se negó a arrancar, lo nombró, y dijo con qué comando se arregla. Sacado el archivo, vuelve a
correr entera y da las 49 en verde. La base nunca se tocó: el archivo jamás se aplicó.


### El servidor de mirar las pantallas ya no muestra la versión vieja

Cierra el pendiente 42, el 25 de agosto de 2026. Lo que faltaba era comprobar si el programa que
levanta el servidor toma `.claude/launch.json` cuando cambia. **Toma uno, pero no el del
proyecto.**

- **Hay dos archivos con ese nombre y gana el de arriba.** El que se lee es
  `F:\proyectos\celtatech\.claude\launch.json`, el de la carpeta desde donde arranca la sesión,
  no `Careonys-Marketplace/.claude/launch.json`. Ahí la configuración `marketplace` seguía diciendo
  `python -m http.server`, que es exactamente el servidor que no manda ninguna instrucción sobre
  guardar copias: por eso el arreglo escrito el 24 de agosto no se notaba. Los dos archivos dicen
  ahora lo mismo y nombran `scripts/servidor_local.py`.
- **El servidor publica la carpeta del proyecto**, calculada desde la ubicación de su propio
  archivo, y no aquella desde la que lo llamaron. Levantado desde un nivel más arriba publicaba de
  más y las direcciones no coincidían: contestaba igual, que es la peor forma de estar mal.
- **Comprobado pidiendo el mismo archivo antes y después.** Antes: `200 OK` sin ninguna instrucción
  sobre copias. Después: `Cache-Control: no-store, must-revalidate`, `Pragma: no-cache`,
  `Expires: 0`, y `pwa-asistente/index.html` sigue contestando `200`.

**Ninguno de los dos `launch.json` está en el repositorio**: `.gitignore:21` excluye `.claude/`
entero. Lo que se sube es el guion; la configuración que lo llama vive sólo en esta máquina, así
que en otra hay que volver a escribirla.


### El perfil muestra a la persona que dice la dirección, y nada más que eso

Cierra el pendiente 44, el 25 de agosto de 2026.

`perfil.html` tenía ocho personas escritas adentro, numeradas del 1 al 8. Ahora lee de la base la
persona cuyo identificador viene en la dirección, y dibuja seis datos: nombre, foto, zona, qué
atiende, precio por hora y si acepta reemplazos urgentes. Son exactamente los que devuelve
`directorio`, la vista que sólo deja pasar a quien tiene el legajo validado por la
Prestadora **y** además autorizó que se lo publique.

- **Lo trae `traerDelDirectorio` (`js/apiClient.js:784`)**, que pide una sola fila filtrando por
  identificador y por Prestadora. Un identificador que no tiene forma de identificador se contesta
  sin preguntarle a la base: la base devolvería un error de sintaxis, y un error en pantalla se lee
  como que el sistema se rompió, cuando lo que hay es un enlace viejo. Los hay: hasta el 25 de
  agosto de 2026 esta pantalla se abría con `?id=1`.
- **El filtro por Prestadora se puede desmentir, y se intentó.** La vista devuelve hoy 7 personas
  publicadas, repartidas entre las dos Prestadoras ficticias. Pidiendo desde el enlace de PresDemo
  el identificador de una persona de la otra Prestadora, la pantalla no la muestra: queda vacía. Sin
  ese filtro aparecería, que es exactamente la falla que se estaba buscando.
- **Los cuatro estados están** (`perfil.html:71`, `:72`, `:81` y `:91`): cargando, error con
  «Reintentar», vacío —«Este perfil no está disponible», con el porqué y la vuelta al directorio— y
  listo. Los cuatro se probaron contra el servidor de verdad, el de error cortándole la dirección al
  cliente de datos.
- **Nada se pinta de adorno.** Una persona marcada para reemplazos urgentes muestra ese aviso y otra
  que no lo está no lo muestra. Quien no cargó foto muestra la inicial de su nombre.

**Lo que se sacó y por qué.** Estrellas, puntaje, nivel «CUIDADOR ORO», certificaciones, referencias,
estudios, descripción y una grilla de días marcada a mano. Ninguno de esos datos existe en la base;
lo único que sí existiría —lo que se le controló al legajo— es el pendiente 43 y todavía no está
decidido. Con ellos se fueron seis bloques de `css/styles.css` que ya no vestían a nadie, comprobado
uno por uno con `grep` antes de borrarlos.

**También se fue el formulario de contacto**, que contestaba «¡Mensaje enviado!» sin mandar nada. Acá
no hacía falta preguntar: el consentimiento que la persona firma ya dice que sólo las Familias
registradas pueden comunicarse con ella, y que lo hacen por la plataforma
(`data/catalogo-autorizaciones.json`, `perfil_publicado`). En su lugar la pantalla explica eso mismo
(`perfil.html:160`) y ofrece las dos puertas que sí existen: entrar como Familia y publicar un aviso.
Lo que falta —empezar una conversación con esa persona en particular— quedó anotado como pendiente 46.

**Tres traducciones que estaban por escribirse dos veces subieron a los archivos compartidos**
(«ningún patrón repetido sin punto único de verdad»): el precio en pesos es `Texto.importe` (`js/texto.js:152`), la etiqueta de una lista es
`Catalogo.etiquetaSiExiste` (`js/catalogo.js:408`), y la de una tarea —que puede estar en cualquiera
de tres listas— es `Catalogo.etiquetaDeTarea` (`js/catalogo.js:421`). Vivían adentro de
`directorio.html`; ahora las dos pantallas las piden al mismo lugar.


### Los chequeos corren solos antes de cada commit

Cierra el pendiente 17, el 25 de agosto de 2026.

Eran seis chequeos que había que acordarse de correr, uno por uno. Ahora los corre git.

- **`scripts/verificar_todo.mjs` los corre a todos** y devuelve error si falla cualquiera. No lleva
  la lista escrita adentro: busca en `scripts/` todo lo que se llame `verificar_*.mjs` y lo corre en
  orden alfabético, así que el séptimo chequeo que alguien escriba entra solo. Ese detalle no es
  adorno: el renglón que se acaba de borrar decía «ya son cinco» cuando ya eran seis.
- **`.githooks/pre-commit` lo llama antes de cada commit** y frena el commit si algo falla. Probado
  al revés, que es la única prueba que vale: se le agregó un renglón a una de las copias de
  `js/texto.js`, se intentó commitear, y git no dejó — «1 de 6 chequeos fallaron: copias».
- **Los seis juntos tardan menos de un segundo**, así que no hay razón para saltearlos. Se puede,
  con `git commit --no-verify`, y conviene que sea raro.
- **No se agregó ningún `package.json`.** El sitio se publica como archivos sueltos y meterle uno
  cambiaría cómo lo detecta el servicio de publicación. El gancho llama a `node` directamente.

**En otra máquina hay que decirle a git dónde está el gancho, una sola vez**: `git config
core.hooksPath .githooks`. La carpeta `.githooks/` sí se sube, pero la configuración que la nombra
vive en `.git/config`, que no. Sin ese comando el gancho está en el repositorio y nadie lo llama.


### La palabra «cuidador» salió de las pantallas y ya no puede volver sola

Cierra el pendiente 33, el 25 de agosto de 2026.

El glosario dice que **Asistente** es el término general y que «cuidador» es apenas un tipo, pero las
pantallas decían «cuidador» en todos lados. Ya no, y esta vez la limpieza no depende de que alguien
se acuerde.

- **Salieron las 82 apariciones de las diez pantallas**, una por una: `index.html`, `mockup-app.html`,
  `registrar-asistente.html`, `solicitar-asistente.html`, `cursos.html`, `formulario-integral.html`,
  `panel-prestadora.html`, `soporte-remoto.html`, las dos aplicaciones de teléfono y las notas del
  catálogo. Donde decía «cuidador» ahora dice **Asistente**.
- **`scripts/verificar_vocabulario.mjs` es el chequeo que impide que vuelva.** Falla el commit si la
  palabra aparece en el texto que ve una persona. Es el séptimo, y confirmó lo que prometía el
  renglón anterior de este documento: entró solo, sin tocar ni el corredor ni el gancho.
- **Antes de escribirlo se sacó `visible()` a `scripts/texto_visible.mjs`**, que ahora comparten el
  chequeo de trato y el de vocabulario. Copiarlo hubiera sido la octava lista repetida dos veces
  («ningún patrón repetido sin punto único de verdad»).
- **La prueba se hizo al revés**, que es la única que vale: se dejó un archivo con «Encuentre al
  cuidador que necesita» y el chequeo lo señaló con archivo y renglón. Además el detector se prueba
  a sí mismo contra catorce frases —cinco que tienen que saltar y nueve que no— antes de mirar
  ningún archivo.
- **Buscando la palabra apareció un error de verdad.** `js/main.js` comparaba la respuesta de la
  portada contra `busco-cuidador`, una clave que no existe en ningún lado: la de verdad es
  `busco_asistente`. Quien elegía «Busco un Asistente» no llegaba nunca al formulario de
  publicación. Corregido.
- **Y dos respaldos que no respaldaban a nadie**: `apiClient.js` aceptaba `fichadoData.cuidadorId` y
  `entryData.cuidadorId` por si alguien los mandaba, y no los manda ninguna pantalla. Borrados de
  las tres copias.
- **El borrador legal se llama `docs/terminos_y_condiciones_asistentes.md`** y adentro dice
  Asistente y Prestadora. Su propio aviso pedía exactamente esa corrección. **Ninguna cláusula
  cambió**, y el aviso de que un abogado todavía no lo revisó sigue entero.

**Dónde la palabra se quedó a propósito**, porque ahí no es el término general:

- **`cuidador domiciliario`**, con el sustantivo pegado: es el nombre de un tipo, la clave
  `cuidador_domiciliario` del vocabulario `tipo_asistente`. Un enfermero universitario y un cuidador
  domiciliario son dos tipos de Asistente.
- **`soporte-remoto.html`**: esa pantalla habla de las familias que cuidan a un familiar mayor.
  Llamarlas Asistentes sería mentirles, así que ahí «cuidadores» son ellas. El pie de esa misma
  pantalla sí decía el genérico y sí se cambió.
- **`síndrome del cuidador`**, en `data/catalogo-oferta.json`: es el nombre de un cuadro clínico.
- **Los nombres que no se leen**: el depósito `documentos-cuidadores`, la imagen
  `hero_cuidadores.png`, el botón `btn-submit-cuidador`, el formulario
  `form-registro-cuidador-completo`, la clase `caregiver-card` y la tabla `caregivers`. Cambiarlos
  rompe algo y no los ve nadie.

**Lo que falta y es del Desarrollador**

1. **La etiqueta del tipo dice «Asistente / Cuidador domiciliario»**, y esa barra hace que el término
   general parezca un tipo. Es una etiqueta de negocio, así que la decisión es suya: se deja como
   está hasta que diga otra cosa.
2. **El plan técnico heredado conservaba 106 apariciones de la palabra, y se resolvió borrándolo**
   el 25 de agosto de 2026. Era la respuesta correcta a la pregunta que este punto dejaba abierta
   —si ese plan seguía vigente—: su propia advertencia decía que la arquitectura estaba
   descartada, así que corregirle el vocabulario a mil renglones vencidos era trabajo tirado. Lo
   que servía está en `docs/TABLAS_QUE_FALTAN.md`, ya con el vocabulario del glosario.


### Los colores dejaron de estar escritos a mano

Cierra la mitad de colores del pendiente 8, el 25 de agosto de 2026.

Un color escrito con su número —`#1e293b`, `rgba(0,0,0,0.5)`— **no cambia cuando se enciende el modo
oscuro**. Los tokens ya estaban, pero mientras quedara uno solo a mano, encender el modo oscuro
dejaba cuadros blancos con letra blanca adentro de una pantalla negra. Por eso el modo oscuro
automático seguía apagado.

- **Salieron 434 colores de dieciséis archivos.** Eran 62 valores distintos para unas quince ideas:
  cinco verdes apenas diferentes eran todos el mismo cuadro de «salió bien», escritos cinco veces
  por cinco manos. Ahora todos salen de `css/tokens.css`.
- **La sustitución se decidió por el par, no por el color.** `#fff` de fondo es una superficie y
  `#fff` de letra es texto sobre color: son dos tokens distintos para el mismo número. El guion que
  hizo el trabajo hizo primero una pasada en seco y **se negó a cambiar nada** hasta que las 88
  combinaciones de propiedad y color estuvieran todas mapeadas a mano. Así aparecieron cuatro que
  nadie hubiera visto: tres adentro de una plantilla de JavaScript donde la propiedad no se puede
  leer mirando hacia atrás, y el velo de un modal.
- **Las sombras se cambiaron enteras, no por su color.** Una sombra es geometría más color, y el
  color solo no quiere decir nada: `0 4px 24px …` es `--sombra-alta` completa.
- **Aparecieron ocho tokens que faltaban.** Cuatro son el tercer miembro de un par que ya existía
  —cada tono de señal tenía fondo y letra pero no borde, y por eso el borde se escribía a mano—. Los
  otros cuatro le ponen nombre a recetas que estaban copiadas: la sombra de una ilustración suelta,
  el velo que oscurece el pie de una foto, el ícono decorativo sobre fondo oscuro y el velo oscuro
  de una pastilla apoyada sobre color.
- **`scripts/verificar_paleta.mjs` es el chequeo que impide que vuelvan.** Es el octavo, y también
  entró solo: ni el corredor ni el gancho de commit se tocaron.
- **El chequeo encontró una cuarta puerta que el barrido no había mirado.** Los colores entran por
  los atributos `style=`, por los bloques `<style>`, por los `.css` — y por el JavaScript, que pinta
  con `elemento.style.background = '#ffebee'`. Había dieciséis ahí, invisibles para cualquiera que
  buscara en las hojas de estilo.
- **Quedan dos colores escritos a mano, con nombre y motivo**: el rojo de Google y el azul de
  Facebook, en los botones de ingresar con esas cuentas. No son de la paleta y no cambian de noche.

**De paso se midió el contraste de cada texto**, con el navegador abierto en las dieciséis pantallas:
719 textos, uno por uno, comparando el color de la letra contra el fondo de verdad —compuesto capa
por capa, no el que declara la regla—. Hoy quedan 11 por debajo del mínimo de 4.5:1, y los tres
motivos que quedan son decisiones que no puede tomar la línea de comandos; están abajo. Todo lo
demás se arregló, y se arregló **cambiando qué token usa cada regla, no el token**.

- `--azul-medio-texto` está calculado para llegar a 4.5:1 sobre blanco puro, y sobre cualquier gris
  nuestro se queda en 4.0. Donde se apoyaba sobre un gris ahora va `--tono-info-texto`, que es el
  mismo azul más oscuro: las etiquetas de los cursos, los rótulos en mayúscula de arriba de cada
  título, las migas de `perfil.html` y el botón de mostrar la contraseña.
- **Una pastilla aclaraba el fondo debajo de su propia letra blanca.** `--velo-sobre-color` aclara,
  que es lo que hace falta para un `:hover`; abajo de letra blanca hace lo contrario de lo que hay
  que hacer, y esos rótulos quedaban en 2.6:1. Ahora hay un velo que oscurece.
- **Las secciones 1 y 2 de `css/tokens.css` no se tocaron**, que es lo que ellas mismas mandan: son
  el sistema de Careonys y se cambian allá. Los dos tokens nuevos de contraste están en la sección
  3, que es la propia del marketplace.

**Lo que falta y es del Desarrollador**

1. **Letra blanca sobre `--azul-medio` llega a 3.21:1 y hace falta 4.5:1.** Pasa en cinco lugares:
   el redondel del paso activo del formulario (`formulario-integral.html` y
   `registrar-asistente.html`), la banda con el nombre adentro del teléfono dibujado
   (`index.html` y `registrar-asistente.html`) y el botón de ingresar de `mockup-app.html`. **El
   arreglo cambia cómo se ve**: o el fondo pasa a `--azul-oscuro` —y entonces el paso activo se
   confunde con el paso ya hecho, que ya usa ese color— o la letra pasa a oscura. Es una decisión de
   diseño, así que se deja como está hasta que diga cuál.
2. **El rojo de la Prestadora de ejemplo llega a 4.13:1 sobre blanco.** No es un token nuestro: sale
   de `accent_color` de su fila en `tenants`, y `js/apiClient.js` lo escribe encima al abrir sesión.
   El problema no es el color sino que **nada valida el color que elige una Prestadora**. Cuando
   haya cientos, va a haber cientos de rojos ilegibles.
3. **Las estrellas de calificación quedan en 4.4996:1**, que es 4.5 raspando por abajo.
   `--naranja-alerta-texto` promete 4.5:1 sobre fondo claro y se queda a cuatro diezmilésimas. Es un
   token de Careonys, así que el arreglo va allá: subirle una pizca de oscuridad.


### La pantalla se pone de noche sola, y lo que se rompía de noche ya no puede volver

Cierra la mitad de modo oscuro del pendiente 8, el 25 de agosto de 2026.

**Qué se hizo.** Quien tiene la computadora puesta en oscuro ahora abre el sitio en oscuro, sin
tocar nada y sin esperar a que cargue ningún programa. Hasta ayer el modo oscuro estaba escrito
entero y no lo veía nadie: sólo se encendía escribiendo `data-tema='oscuro'` a mano en el HTML,
cosa que ninguna pantalla hacía. Son tres cambios en `css/tokens.css` y sus dos copias:

- El bloque `@media (prefers-color-scheme: dark)` (`css/tokens.css:275`), con los mismos valores
  que `:root[data-tema='oscuro']` (`css/tokens.css:232`).
- La guarda `:not([data-tema='claro'])` en ese bloque (`css/tokens.css:276`). Sin ella, quien
  tiene la computadora en oscuro no podría volver a la pantalla clara ni pidiéndolo. Con ella, la
  elección de la persona le gana a la de la máquina en las dos direcciones.
- `color-scheme` (`css/tokens.css:95`), que le avisa al navegador de qué lado está. La barra de
  desplazamiento, el calendario que se abre en un campo de fecha y la lista que baja de un
  desplegable no las dibuja este proyecto: las dibuja el navegador, y sin esa línea las dibuja
  claras encima de una pantalla oscura. Es la única forma de decírselo.

**Por qué recién ahora.** Porque un color escrito con su número no cambia de noche, y hasta ayer
había 434 escritos a mano. Encender esto antes habría dejado cuadros blancos con letra blanca
adentro. La sección anterior cuenta cómo se fueron.

**Lo que apareció al encenderlo.** Se midieron los 763 textos de las dieciséis pantallas contra el
fondo que de verdad tienen debajo, con la computadora puesta en oscuro: **58 quedaban por debajo
del mínimo legible**. Casi todos eran el mismo error, repetido once veces y con un solo nombre:

- **Nueve lugares usaban de fondo un token que se llama `-texto`.** Un token de letra está hecho
  para pintar sobre el papel y de noche se aclara a propósito, que es lo que tiene que hacer una
  letra cuando el papel se pone negro. Usado como fondo de una pastilla con letra blanca encima
  hace exactamente lo contrario: el botón azul de «Inscribirse» quedaba celeste con letra blanca,
  en 2.22:1. Le tocaba al botón primario de las tres hojas de estilo, a la insignia de legajo
  validado, a las tres franjas de las tarjetas de prensa, a los dos botones redondos de la
  videollamada y al fondo oscuro de esas mismas franjas.
- **Dos lugares hacían lo simétrico**: fondo que no cambia de noche con letra que sí. El botón
  naranja y la pastilla «PRÓXIMAMENTE» tomaban la letra de `--texto-principal`, que de noche se
  vuelve casi blanca — y el naranja de abajo seguía siendo el mismo naranja.

**Los colores macizos.** De ahí salieron nueve tokens nuevos en la sección 3 de `css/tokens.css`,
que es la propia del marketplace: siete `--relleno-*` (`css/tokens.css:113`) para lo que se llena
entero y lleva letra encima, `--relleno-atencion-hover` para cuando el mouse se apoya en un botón
naranja, y `--texto-oscuro-sobre-color` (`css/tokens.css:131`), que es el opuesto exacto de
`--texto-sobre-color`: la letra oscura que va encima de un color demasiado claro para letra
blanca. **Los valores son exactamente los que esos once lugares tenían de día**, así que de día no
cambió nada; lo único que cambia es que de noche se quedan quietos. Y están abajo de todo a
propósito, donde el modo oscuro no los toca.

**El noveno chequeo.** `scripts/verificar_temas.mjs` cuida las dos cosas que rompen la noche, y las
cuida solo: que los dos bloques del modo oscuro sigan diciendo lo mismo —están repetidos porque
CSS no deja poner una condición de pantalla adentro de un selector, y una copia que nadie compara
se separa sola— y que ningún token de letra vuelva a pintar un fondo. Tiene una excepción escrita
con su motivo: las tres rayas del menú, que son un dibujo del mismo color que la letra y **sí**
tienen que aclararse de noche. Se registró solo en `scripts/verificar_todo.mjs` y en el gancho de
`git commit`, sin tocar ninguno de los dos.

**Cómo quedó.** De los 763 textos, **10 quedan por debajo del mínimo de noche y 10 de día**, y no
hay ninguno nuevo: son los mismos tres motivos que ya estaban anotados arriba como decisión del
Desarrollador, y que desde hoy tienen número propio en `docs/PENDIENTES.md` —el pendiente 48—.
De noche son cuatro de letra blanca sobre el azul medio y seis que salen de los colores que eligió
la Prestadora de ejemplo; de día son cinco y cinco, porque el botón de ingresar de
`mockup-app.html` falla de día y de noche se salva, y el enlace de 1.43:1 falla de noche y de día
se salva. **De los 58 que rompía la noche no queda ninguno.**

**El caso más claro de los que quedan.** De noche, el enlace «Registrarse como Asistente» de la
pantalla de acceso del Asistente queda en **1.43:1**, que es prácticamente invisible. El color es
`#1A365D`, el azul marino que la Prestadora de ejemplo tiene guardado en `tenants.primary_color`,
apoyado sobre una tarjeta que de noche es gris oscuro. De día ese azul marino sobre blanco se lee
perfecto. No hay nada roto en las hojas de estilo: **el color que elige una Prestadora no tiene
versión de noche**, y `js/apiClient.js` lo escribe encima de los tokens igual. Es el punto 2 de la
lista de acá abajo, y de noche cuesta el doble.

### Los estilos pegados al HTML pasaron a clases, y quedaron en poco más de un tercio

Cierra el pendiente 8 entero, el 26 de agosto de 2026. La mitad de colores ya estaba cerrada el
día anterior —la sección de acá arriba—; esto es la otra mitad, la que el Desarrollador puso en
palabras ese mismo día: «cuantos menos sean mejor, me parece un despropósito tantos estilos.
Depura», con un límite al lado: «los estilos después habrá que congeniarlos con los de Careonys,
así que tratá de gastar el menor esfuerzo posible en eso».

**Qué había.** 694 atributos `style=` escritos a mano en las pantallas, con 2.199 declaraciones
adentro. Pero apenas 360 formas distintas: la mayoría no eran decisiones diferentes, era la misma
decisión copiada. `color:var(--texto-secundario)` aparecía 112 veces, `font-weight:700` otras
104 y `display:none` 39.

**Qué se hizo, y en qué orden.** Primero se midió qué convenía nombrar. Convertir *formas enteras*
—el atributo completo, tal cual está— habría mudado 458 atributos a 120 clases, pero cada clase
habría servido a un solo lugar. Convertir *declaraciones sueltas* rinde mucho más, porque se
apilan: 125 clases cubren las 445 conversiones, y lo que era
`style="font-size:11px;color:var(--texto-secundario);margin-top:4px"` ahora es
`class="texto-11 color-secundario mt-4"`, en el mismo orden, para que se siga leyendo igual. Las
125 viven en `css/utilidades.css`, agrupadas por lo que deciden y con el motivo escrito arriba
(`css/utilidades.css:17`).

**Sólo se convirtió el atributo cuyas declaraciones estaban todas nombradas.** Con una sola que no
lo estuviera, el atributo se quedó donde estaba. Es lo que pedía la condición de cierre: las
decisiones que aparecen una sola vez no se tocan.

**Por qué el selector está escrito dos veces.** `.texto-11.texto-11` señala exactamente lo mismo
que `.texto-11`, pero pesa el doble al decidir quién gana. Hace falta: un atributo `style=` le
gana a cualquier regla de una hoja, así que al pasarlo a clase la decisión podía perder contra
reglas que ya existían, como `.card p`. Escrito dos veces gana esas, y sigue perdiendo contra lo
que el guion escriba en el atributo `style` del elemento, que es justo lo que se quiere: prender
y apagar desde el guion tiene que seguir funcionando. **No se usó `!important`** por ese mismo
motivo: hay unos treinta y cinco lugares donde el guion escribe color, fondo o borde en el
atributo, y `!important` los habría dejado sin efecto.

**Y `.oculto` está escrito tres veces** (`css/utilidades.css:47`), porque un elemento puede
llevar `oculto` junto con `flex` o `grilla` —se esconde y se muestra, y cuando se muestra va
en fila—, y escondido tiene que ganar siempre. Comprobado en el navegador el mismo día sobre el
caso real que lo pedía: el grupo de una casilla del legajo (`js/fichas-legajo.js:104`) mide
`flex` visible, `none` con la clase puesta y `flex` de nuevo al sacársela.

**Esconder dejó de ser estilo y pasó a ser estado.** Los 39 `display:none` enteros y 16 más que
venían mezclados con otras declaraciones salieron del atributo y son la clase `oculto`. Eso
obligó a cambiar el interruptor de «los cuatro estados», y ahí estaba el riesgo real de todo el
trabajo: el idioma anterior era `panel.style.display = ''`, que **con la clase puesta ya no
muestra nada**, porque sin nada escrito en el atributo vuelve a mandar la clase. Las seis pantallas
que lo usaban dicen ahora `classList.toggle('oculto', …)` (`acceso.html:99`), que además no le
impone forma a ningún panel: el que se muestra recupera la que le dio el CSS. Comprobado en el
navegador en `directorio.html` y `perfil.html`, estado por estado, y en `directorio.html` se
ve lo que estaba en juego: la grilla de resultados vuelve a `display: grid`, no a `block`.

**Y se borró lo que no usaba nadie**, que es la parte (c): 19 clases de utilidad en inglés que
habían quedado escritas y no aparecen en ninguna pantalla, 15 bloques de reglas de diseño que
tampoco —la matriz de disponibilidad semanal, el desglose de tarifas, las insignias de
verificación— y 3 renglones en `css/mockup-app.css`. `css/styles.css` pasó de 2.395 a 2.196
renglones. Nada de eso se pierde: el repositorio lo guarda, y se recupera con
`git show 8cfcc3e:css/styles.css`.

**Cómo quedó.** **249 atributos `style=`, con 982 declaraciones**, contra los 694 y 2.199 de
antes. La condición de cierre pedía bajar de 300. De los 249, **229 están en el marcado** y son
las decisiones que aparecen una sola vez —las que no se tocan a propósito— y **51 están adentro de
guiones**, armando HTML desde una plantilla; de esos 51, 28 podrían convertirse el día que se
quiera, y el chequeo los cuenta en voz alta para que el número no se pierda.

**El chequeo número 20.** `scripts/verificar_estilos.mjs` vigila que esto no se deshaga solo, y
su regla es una sola: **si todo lo que dice un atributo `style=` ya tiene clase, ese atributo
sobra** (`scripts/verificar_estilos.mjs:12`). No prohíbe el atributo —las decisiones únicas
siguen escritas donde están—: prohíbe volver a escribir a mano lo que la hoja ya nombra. No lleva
ningún número adentro: lee las clases de `css/utilidades.css`, así que agregar una alcanza para
que empiece a vigilarla. **Y se comprobó que puede fallar** antes de darlo por bueno: se le metió
a propósito un `style="font-weight:700;color:var(--texto-secundario);"` en `directorio.html`,
falló nombrando el renglón y la clase que correspondía, y el archivo se dejó como estaba.

**Esta hoja es provisoria por diseño, y eso no es un defecto.** El día que el Marketplace se
fusione con Careonys hay que congeniar los dos sistemas de estilo y de acá va a sobrevivir poco.
Por eso no se rehízo el diseño: se nombró lo que se repetía, se borró lo muerto y nada más. Las
tres carpetas llevan copia de la hoja —las PWA no alcanzan la del padre sin conexión— y
`scripts/verificar_copias.mjs` compara las tres byte a byte.

### El plan técnico heredado se borró, y lo que servía quedó en una página

El 25 de agosto de 2026.

**Qué había.** `docs/CAREONYS_PRESDEMO_Plan_Tecnico.md`, 1.545 renglones heredados de otro
proyecto. Su propia advertencia decía que la arquitectura que proponía estaba descartada
—monorepo, aplicación móvil con React Native, aplicación de Windows con Tauri, servidor propio— y
que lo único vigente era el modelo de datos. Conservaba además **106 apariciones de «cuidador»**,
la palabra que salió del resto del proyecto el día anterior, y estaba exento de dos chequeos por
ser material heredado. Un documento vencido que nadie corrige no se queda quieto: se lo cita.

**Qué se hizo antes de borrarlo.** Se midieron sus 22 tablas propuestas contra las 22 que
existen de verdad en `supabase/migrations/`. Doce ya estaban construidas con otro nombre
—`cuidadores` es `caregivers`, `avisos` es `avisos`, `certificaciones` son tres tablas
distintas—, y en esos casos **manda la migración, no el documento**. Diez no existían, y ese era
todo el valor que quedaba: postulaciones, chat, videollamadas, reseñas, puntos, notificaciones,
favoritos, pagos, moderación y configuración.

**Dónde quedó.** En `docs/TABLAS_QUE_FALTAN.md`, una ficha por tabla: para qué sirve, qué columnas
proponía el material heredado, de qué depende, **qué hay que decidir antes de escribirla**, y de
qué lado del reparto de `docs/MODULOS.md` cae cada una —ocho son propias de la modalidad de
contrataciones y dos son compartidas—. También se transcribió entero el sistema de puntos y
niveles que proponía, porque es una decisión de producto pensada y perderla costaría volver a
pensarla; queda anotado que **no está aprobada** y que `docs/ALCANCE.md` §4 la tiene congelada.

**Lo que apareció al revisarlas una por una.** **Ninguna de las diez tenía `prestadora_id`.** El
material fue escrito para una sola empresa, y la «toda tabla nace con clave uuid y con la columna de su Organización» pide esa columna en toda
tabla con datos propios de una Organización aunque hoy siempre valga lo mismo —es lo que hace que
la fusión futura sea un update y no una migración—. Además: `postulaciones.tarifa_propuesta`
guarda un número sin moneda («todo importe se guarda con su moneda»); los tipos de `notificaciones` incluyen `postulacion`, que
es una palabra propia de esta modalidad y no puede aparecer en un módulo compartido («los módulos»); y
`video_llamadas` y `pagos` tienen columnas que atan el esquema a un proveedor externo que todavía
no se eligió. Las cinco reglas que ninguna puede saltearse están al principio del documento nuevo.

**Una colisión de vocabulario que quedó anotada, y que después se decidió.** El material
heredado llamaba `avisos` a lo que publica una Familia, y en el producto «aviso» se usaba
para otra cosa: el aviso de que el Asistente llegó, el que sale por WhatsApp o por correo.
Se dejó escrito sin decidir. **El 25 de agosto de 2026 el Desarrollador decidió**: el Aviso
es lo que la Familia publica, la tabla se llama `avisos`, y para el otro sentido queda
**notificación**. Ver más abajo, «Las dos tablas de esta modalidad pasaron a llamarse como lo
que guardan».

**Lo que se descartó y no se trajo.** La arquitectura entera, el sistema de diseño propuesto
—superado por `css/tokens.css`, que existe y funciona—, seis proveedores externos elegidos de
antemano para funciones que no se construyeron, el panel de administración de una aplicación que
no existe, y el plan por fases en semanas. Nada de eso se archivó: se borró, y sigue en la
historia de git para quien lo necesite.

### Las citas de la documentación vuelven a apuntar donde dicen

El 25 de agosto de 2026.

**El problema.** La regla de la empresa «documentación verificable» pide que toda afirmación sobre una decisión ya tomada cite
**archivo y renglón exacto**, «verificable en segundos». Ese día había 94 citas con renglón en la
documentación y **26 apuntaban a la nada**: una de cada cuatro. No porque alguien se equivocara al
escribirlas, sino porque una cita con renglón se rompe sola: el archivo crece por arriba, la cita
se queda quieta y termina señalando una llave de cierre. El renglón 199 de `js/main.js` era una
llave sola; el 191 de `formulario-integral.html`, un cierre de `div`; y el 528 de
`directorio.html` estaba 198 renglones más allá del final de un archivo que tiene 330.

Eso no es un detalle de prolijidad. Quien sigue una cita y no encuentra nada deja de seguir las
otras, y entonces la regla de citar se convierte en adorno: el documento vuelve a valer lo que
vale la memoria de quien lo escribió.

**Qué se hizo.** Se corrigieron las 26, buscando en el código real a qué apuntaba cada una. Cuatro
nombraban archivos que ya no existen con ese nombre —una cita partida en dos renglones que el
buscador no veía entera, y una migración citada sin su carpeta—. Y **dos apuntaban a un renglón con
contenido, pero con el contenido equivocado**, que es el caso que ningún guion puede detectar:
el renglón 692 de `mockup-app.html` decía ser el escapado del chat y era una redirección, y el
396 de `js/apiClient.js` decía ser el aviso de una Prestadora que no existe y era la primera
evaluación de una lista.

**El décimo chequeo.** `scripts/verificar_referencias.mjs` exige tres cosas de cada cita: que el
archivo exista, que tenga ese renglón, y que en ese renglón haya algo. Una llave sola, una
etiqueta que cierra, el fin de un comentario o un renglón en blanco no son una cita: son el rastro
de una que se corrió. Se registra solo en `scripts/verificar_todo.mjs` y en el gancho de
`git commit`, sin tocar ninguno de los dos.

**Los documentos exentos, y por qué.** Un documento que es **una foto fechada** cita el
código de ese día a propósito, y corregirle los renglones sería falsear lo que decía.
`docs/INVENTARIO.md` lo dice en su propio renglón 7, y `docs/PLAN_ACCESO.md` es un plan escrito
antes de tocar código, cuyas citas muestran los problemas que había ese día. Los dos están en la
lista `FOTOS` del chequeo, cada uno con su motivo escrito al lado —una exención sin motivo es una
excepción que nadie va a poder revisar después—. Empezaron siendo cuatro: el plan técnico heredado
se borró el mismo día, y el plan de la Prestadora, el 26 de agosto de 2026, al ejecutarse. **Una
exención se borra junto con el archivo que eximía**, si no queda señalando a un documento que ya
no está.

**Lo que el chequeo no puede ver, dicho de frente.** Una cita que se corrió a otro renglón **con
contenido** pasa igual: el guion no sabe de qué habla la frase. Se probó exigir que un
identificador nombrado en la misma frase estuviera cerca del renglón citado, y sobre las citas de
hoy daba **tres avisos falsos de cada cinco**, así que se descartó. Un chequeo que avisa de más se
termina apagando, y entonces no verifica nada. Atrapa el caso ruidoso —que es el común—, y las
dos citas del párrafo anterior aparecieron leyendo, no corriendo el guion.

**De paso, las cuentas viejas.** Revisar cita por cita destapó números que ya no eran ciertos en
`docs/PENDIENTES.md`, y se recontaron todos: la Prestadora de ejemplo está escrita **102 veces en
23 archivos** —no 111 en 18—, su logotipo en 27 lugares de 15 archivos, las copias byte a byte son
**921 renglones** —no 1.082— y los estilos pegados al HTML son **2.166 declaraciones en 687
atributos**. Tres pendientes habían quedado describiendo cosas ya arregladas: el punto 20 decía
que el paso 3 del formulario todavía tenía las profesiones escritas a mano, el 9 que quedaba
suelta la hora del chat, y el 11 que un remiendo tenía escrito el UUID de la Prestadora de
ejemplo. Ninguna de las tres seguía siendo verdad. Y el pendiente 14 se cerró: **ninguna pantalla
tiene ya datos escritos adentro**.

**El README cuenta los diez.** Hasta hoy los chequeos existían y no estaban explicados en ninguna
parte, y el comando que hace falta una sola vez por máquina —`git config core.hooksPath
.githooks`— vivía en dos documentos internos. Ahora están los diez en una tabla del `README.md`,
con qué impide cada uno que vuelva.

### El Asistente ve sus capacitaciones, y al lado lo que rindió

Cierra el pendiente 34, el 25 de agosto de 2026.

«Mis Capacitaciones» llevaba a `cursos.html`, que es la vidriera pública: los mismos seis cursos
para cualquiera, sin un solo dato de quien había iniciado sesión. Ahora es una pantalla de la
aplicación, y lee de la base.

- **El cliente de datos aprendió a pedir los cursos.** `getCursos()` en `js/apiClient.js` era lo que
  faltaba: ya sabía pedir las evaluaciones y los intentos de quien inició sesión, pero ninguna
  pantalla leía la tabla `cursos`, que existe desde la migración 0008. Filtra `publicado=eq.true` y
  ordena por `orden`. Ese filtro está en el pedido y no en la política de la tabla porque la
  política de `cursos` no mira `publicado` —la de `evaluaciones` sí—; que el curso sin publicar no
  llegue a la pantalla es lo que corresponde, que no llegue al navegador sería mejor, y eso es una
  migración.
- **La pantalla nueva es `screen-capacitaciones`**, con los cuatro estados:
  buscando, error con «Reintentar», sin cursos publicados, y la lista. Los dos enlaces que llevaban
  afuera —el del cajón de menú y el de la barra de abajo— ahora entran acá.
- **Al lado de cada curso está lo que esa persona rindió**, que es lo que la vidriera pública no
  puede mostrar: sale de `intentos_evaluacion`, que la base sólo le muestra a quien lo rindió y a su
  Prestadora. Cuatro renglones posibles: «Aprobada con 100% el 12/08/2026», «Todavía no la rindió»,
  «Rendida 2 veces, sin aprobar. Quedan 2 intentos» o «Este curso no tiene evaluación».
- **El botón «Rendir la evaluación» sale sólo si queda algo que rendir**: no aparece si ya aprobó,
  ni si gastó los intentos, ni si el curso no tiene evaluación.
- **`examen.html` acepta `?evaluacion=<clave>`** y abre esa. Quien llega desde «Mis Capacitaciones»
  ya eligió el curso, y volver a mostrarle la lista sería hacerlo elegir dos veces. Sin ese dato en
  la dirección, la pantalla sigue mostrando la lista como antes.
- **La tarjeta se arma con un molde, no pegando textos.** `scripts/verificar_escapado.mjs` rechazó
  la primera versión, que sumaba cadenas para armar el marcado, y tenía razón aunque escapara: el
  proyecto usa un `<template>` con partes marcadas y `textContent`, que es la misma forma que usa
  `directorio.html`. Probado con un nombre de curso que trae `<script>` adentro: llegó a la pantalla
  como texto y no creó ninguna etiqueta.
- **Los estilos van en `pwa-asistente/css/styles-pwa.css` y no en el bloque `<style>` del HTML**, que
  son 271 renglones esperando el reparto del pendiente 8. No se le agrega a esa pila.
- **Apareció la primera fecha del proyecto.** No había ninguna: ni un `toLocaleDateString` en ningún
  archivo. `Texto.fechaCorta()` la escribe como se escribe acá —«12/08/2026»— y devuelve vacío si no
  hay fecha, para que la pantalla pueda no mostrar nada en vez de mostrar «Invalid Date».
- **El nivel del curso no se muestra.** `cursos.nivel` guarda `basico`, `intermedio` y `avanzado`,
  que no son claves de ningún vocabulario, así que no hay de dónde sacar cómo se escriben en la
  pantalla. Inventarlo desde acá sería inventar una palabra. Queda anotado en el pendiente 31, que
  es donde viven las columnas que guardan catálogo sin tener catálogo.

**Lo que se probó y lo que no.** El pedido a la base sale bien formado y la pantalla contesta: se lo
miró salir con sus filtros y su orden. Los cuatro estados se recorrieron enteros —el error se forzó
rompiendo la dirección del servidor, y «Reintentar» volvió a cargar—. Pero **la lista con los cursos
de verdad no se pudo ver**, y conviene saber por qué: sin sesión, la base contesta como visitante y
la política de `cursos` es `for select to authenticated`, así que devuelve cero filas sin dar error
—por eso la pantalla muestra «Todavía no hay cursos publicados»—. Y **hoy no hay ninguna cuenta de
Asistente con la que entrar**: la que viene escrita en la pantalla de acceso no existe en el
servidor —contesta «Invalid login credentials»— y crear una nueva choca con el tope de correos del
pendiente 45. Eso quedó anotado como pendiente 47. La lista se recorrió con cursos inventados
—singular y plural de las horas, los cuatro resultados, el botón apareciendo y no apareciendo— y
dibujó bien las cinco tarjetas.


### El tablero de la Familia dejó de mostrar afinidades inventadas y caras prestadas

Hecho el 25 de agosto de 2026, sin número de pendiente: apareció al revisar la tira de Asistentes
del tablero de la Familia y se arregló ahí mismo.

- **La tira decía «Cuidadores recomendados» y no había ninguna recomendación detrás.** Cada
  tarjeta traía un «95% Match» que no calculaba nadie: era un número fijo escrito en el HTML, el
  mismo para las cuatro personas. La maqueta `mockup-app.html` tenía además dos tarjetas escritas a
  mano con un «98% Match» y un «92% Match». Se fueron los tres números y la palabra
  «recomendados»: la tira se llama **Asistentes**, que es lo que muestra.

- **Salía de la tabla equivocada.** Leía `caregivers`, que es el personal entero de la Prestadora,
  incluida la gente cuyo legajo todavía no se validó y la que no autorizó publicarse. Ahora lee
  `directorio`, la misma vista que el directorio, que exige las dos cosas.

- **Quien no tenía foto llevaba la cara de otra persona.** El respaldo era
  `assets/images/perfil_maria.png`, una foto de banco de imágenes: cualquier Asistente sin retrato
  aparecía con esa cara. Ahora, sin foto, va la inicial del nombre en un círculo, igual que en el
  directorio.

- **A quien no dijera su tipo se le ponía «Cuidadora».** Una palabra inventada por la pantalla, y
  encima en femenino. Se fue: el tipo y la zona salen del catálogo, y si no hay ninguno de los dos
  el renglón no se dibuja en vez de rellenarse con algo.

- **La tira ahora tiene los cuatro estados** —buscando, error con su botón de
  reintentar, vacío con su explicación, y la lista— y se arma con un `<template>` y `textContent`,
  así que un nombre con una etiqueta adentro llega como texto. Se probó con
  `<script>alert(1)</script><b>Prueba</b>` de nombre: cero elementos `script` y cero `b` creados.

- **Ninguna imagen se le pide más a un sitio ajeno.** Nueve `<img>` del proyecto tenían escrito
  `onerror="this.src='https://via.placeholder.com/…'"`. Ese sitio ya no contesta, así que la imagen
  de respaldo también fallaba, y al fallar volvía a disparar el mismo `onerror`: el navegador
  quedaba pidiendo la misma dirección para siempre. En una sola visita al tablero de la Familia se
  contaron más de ciento cincuenta pedidos fallidos. Encima dos de los archivos locales que
  disparaban ese respaldo no existen —`foto_familiar_default.png` y `paciente_default.png`—, y un
  tercero era otra vez la cara prestada. Los tres apuntan ahora a
  `assets/images/retrato_generico.svg`, un dibujo neutro que es un archivo y no un dibujo pegado en
  cada pantalla, para que se cambie en un solo lugar.

- **El logotipo de la Prestadora salía roto en las dos PWAs.** La columna `logo_url` de la
  Prestadora de prueba guarda `assets/images/logo_presdemo.png`, una ruta relativa; leída desde
  `pwa-familia/index.html` apuntaba a `pwa-familia/assets/`, donde no hay ninguna carpeta `assets`.
  `_applyBranding` la resuelve ahora contra la raíz del sitio con `new URL`, que sirve para los
  tres casos: una dirección entera se respeta, una que empieza con barra también, y una relativa se
  cuelga de la raíz. No se tocó el dato guardado.

**Lo que se probó.** Todo, y en el servidor de mirar las pantallas: las cuatro tarjetas reales que
devuelve `directorio` —nombres inventados, tipo y zona traducidos por el catálogo, precio
por hora con el formato del proyecto, inicial en lugar de foto porque ninguna tiene—, el estado de
error forzado rompiendo la dirección del servidor, el botón de reintentar volviendo a la lista, el
estado vacío, y el nombre con una etiqueta adentro. Después de eso, cero pedidos a `placeholder.com`
y cero imágenes rotas en las dos PWAs, en la maqueta y en el directorio.

### El directorio muestra a gente que existe en la base, y sólo la de una Prestadora

Cierra el pendiente 2, el 24 de agosto de 2026. Eran dos cosas y las dos están hechas.

- **La pantalla dejó de tener ocho personas escritas adentro.** `directorio.html` tenía 377
  renglones de tarjetas a mano, con nombres, puntajes, estrellas, un «98% Match» y cuatro
  insignias de verificación, ninguno de los cuales salía de ningún lado. Ahora hay un molde
  —`<template id="molde-asistente">`, `directorio.html:126`— y el contenido llega de
  `directorio`. El archivo pasó de 534 renglones a 342.
- **Todo lo inventado se fue con las tarjetas.** No hay sistema de puntaje, no hay estrellas y no
  hay porcentaje de coincidencia, así que no se muestran. Lo que queda es lo que el consentimiento
  promete —nombre, foto, zona, qué atiende y precio por hora
  (`data/catalogo-autorizaciones.json`, `perfil_publicado`)—, más la insignia «Legajo validado por
  la Prestadora», que es la condición que la vista ya exige para devolver la fila, y la de
  reemplazos urgentes, que sale de `disponibilidad_asistente`.
- **El filtro por Prestadora vive en el cliente de datos y no es optativo**
  (`js/apiClient.js:704`). El resto del archivo filtra «si hay Prestadora resuelta», y eso no sirve
  para una pantalla que se ve sin cuenta: sin sesión, la que no filtra devuelve las dos mezcladas.
  Acá, si no hay Prestadora, no se pide nada.
- **Y si la dirección nombra una Prestadora que no existe, tampoco se muestra otra.** Comprobado
  en el navegador antes de tocar nada: `directorio.html?t=prestadora-que-no-existe` mostraba los
  cuatro Asistentes de PresDemo, porque el respaldo devuelve la primera Prestadora de la base. El
  respaldo sirve para una dirección que no nombra ninguna, no para una que nombra mal. Ahora se
  distingue un caso del otro (`js/apiClient.js:756`) y el segundo avisa. **Y desde la
  migración 0021 el respaldo ya no existe**: mostrar la primera Prestadora de la base era
  leer la lista de clientes de CeltaTech, y esa lista no la ve nadie. Quien entra sin
  enlace ahora ve que le falta el enlace.
- **La base tenía el directorio vacío y nadie se enteraba.** `directorio` devolvía **cero
  filas**, y no por un problema de permisos: los legajos inventados de la migración 0003 están
  validados, pero nadie había contestado la autorización de publicación, que la vista exige. Con
  ocho tarjetas dibujadas encima, eso no se veía. La migración 0014 pone cinco legajos inventados
  más y contesta las autorizaciones, y **deja una validada y sin publicar a propósito** —Ester
  Villalba Ficticia— para que la condición del consentimiento se pueda comprobar: si apareciera,
  la vista no estaría mirándola.
- **Comprobado en el navegador, con las dos Prestadoras.** PresDemo muestra cuatro y Cuidar Norte
  muestra tres; nunca siete, que es el total. Los tres filtros y la búsqueda libre funcionan sobre
  las tarjetas recién traídas —la búsqueda «ruben» encuentra a Rubén Ocampo Ficticio—, y los
  cuatro estados se probaron uno por uno, incluido el botón de reintentar. La
  respuesta de la base no trae documento, teléfono, correo ni domicilio.
- **Se sacó el filtro «Verificación»**, que la pantalla ofrecía y nada podía contestar: lo que se
  controló de un legajo vive en `verificaciones_asistente`, que no es pública. Es el pendiente 43.
- **`perfil.html` quedó a mitad de camino y por eso se lo frenó.** Sus datos estaban escritos a
  mano, indexados del 1 al 8, y tomaba el identificador con `parseInt(...) || 1`: con el
  identificador de la base —que es un UUID— daba NaN, caía en el 1 y mostraba a otra persona sin
  avisar. Ese día un enlace que no reconocía pasó a decir lo que pasa y a ofrecer la vuelta al
  directorio. **Se cerró el 25 de agosto de 2026**, y con él el pendiente 44: hoy la pantalla lee
  de `directorio`, como cuenta «El perfil muestra a la persona que dice la dirección, y
  nada más que eso» más arriba.

### Un botón que opera se apaga mientras opera, y lo que no se puede deshacer se pregunta antes

El 25 de agosto de 2026.

Las reglas de la empresa —cuatro estados, confirmar lo destructivo, apagar el botón
mientras la operación está en curso— estaban escritas desde el principio y no había ningún chequeo
que las mirara. Se contaron los botones del proyecto: **veintidós manejadores esperan una
operación, y seis no apagaban nada.** Otros tres sólo se alcanzaban desde el marcado y dos más a
través de una función intermedia, así que ninguno de los cinco aparecía en la cuenta.

**El peor era el aval de la Prestadora sobre el legajo de una persona.** «Aprobar» y «Rechazar»
en `panel-prestadora.html` no preguntaban nada, no se apagaban, y —esto es lo grave— **no tenían
quién atrapara un error**: si la escritura fallaba, la ventana se cerraba, aparecía el aviso de
éxito y la pantalla se recargaba como si hubiera funcionado. Nadie se enteraba de nada. Los dos
pasaron a compartir una sola función, `resolverAspirante`, que pregunta, apaga los dos botones,
atrapa el error y lo muestra, y recién entonces avisa y cierra. De paso, **«Rechazar» guarda ahora
la nota de la entrevista que se escribió**, no la frase fija «No cumple requisitos.» que guardaba
siempre; esa frase quedó de respaldo para cuando no se escribe nada.

**El segundo era el fichado por GPS**, en `mockup-app.html` y en `pwa-asistente/index.html`.
Esperar la ubicación puede tardar varios segundos y el botón no daba ninguna señal de estar
haciendo algo, así que dos toques eran dos fichados en la misma hora, y un fichado repetido no se
borra desde ninguna pantalla. Ahora los dos botones —entrada y salida— se apagan juntos mientras
la ubicación está en camino, y se vuelven a prender pase lo que pase, también cuando se deniega el
permiso.

**El tercero no era un botón sino un mensaje que se perdía.** El chat de la maqueta escribía la
burbuja en la pantalla y mandaba el mensaje al servidor; el servidor contestaba «no autorizado» y
nadie lo leía, porque `fetch` no falla cuando el servidor rechaza el pedido: contesta, y hay que
mirar la respuesta. **Todos los mensajes se estaban perdiendo en silencio, con la burbuja en
pantalla como si hubieran salido.** Ahora la burbuja lleva escrito debajo que no se pudo enviar.

**Lo demás, en orden.** «Cerrar sesión» era un enlace disfrazado de botón en las tres aplicaciones
—un enlace no se puede apagar—, y ahora es un botón de verdad que pregunta antes, avisando que
para volver a entrar hay que escribir de nuevo el correo y la contraseña. Guardar una novedad en
el botón de reportes se apaga y dice «Guardando...». Abrir una evaluación desde un botón en `examen.html`
no tenía quién atrapara un fallo del servidor y la pantalla se quedaba en «Cargando...» para
siempre; ahora termina en el panel de error. Y quitar un bloque del legajo con datos adentro
pregunta antes: si el bloque está vacío no pregunta nada, porque preguntar por nada enseña a
contestar que sí sin leer, que es justamente como después se pierde lo que sí importaba.

**El estado apagado no existía en ninguna hoja de estilos.** Se apagaba el botón y se veía igual
que encendido. Se agregó a las cuatro.

**El chequeo once, `scripts/verificar_botones.mjs`.** Mira las tres formas en que un botón llega a
una operación: el manejador escrito ahí mismo, el que delega en una función, y el que sale de un
`onclick` del marcado. Si adentro hay un `await` tiene que haber también un `.disabled`, acá o en
alguna función que llame.

Dos decisiones se tomaron midiendo, no opinando. **El cuerpo de cada función se recorta contando
llaves**, porque recortando una cantidad fija de renglones el manejador de al lado le presta su
apagado al que no lo tiene: así fue como una primera versión aprobó justo uno de los seis que
tenía que encontrar. Y **se probó extender el chequeo a los manejadores que reciben la función por
su nombre a secas, y se descartó**: los tres que hay en el proyecto tapan su botón con el panel de
«cargando», que protege lo mismo. Tres avisos falsos de tres es un chequeo que alguien apaga, y
entonces no verifica nada.

Antes de mirar el proyecto, el chequeo se mira a sí mismo con diez casos, seis que tiene que dejar
pasar y cuatro que tiene que encontrar. Y para que no fuera una prueba que no puede fallar, se
sacaron de la historia de git las versiones anteriores de las cuatro pantallas y se las pasó por
el chequeo: encontró los catorce defectos, uno por uno.

### El arranque de una pantalla ya dice cuando falla

Las reglas de la empresa piden cuatro estados —cargando, error, vacío, listo— a todo componente
que carga datos. Lo primero que carga datos en cualquier pantalla es su arranque, y era
exactamente lo que nadie miraba: **había ocho arranques y ninguno de los ocho tenía quién atrapara
un fallo.** Hoy los ocho lo tienen, y el chequeo doce impide que vuelva a entrar uno sin él.

Lo que pasaba sin ese resguardo: el arranque es una sola cadena de pedidos, y en cuanto uno falla
se caen todos los de abajo sin llegar a ejecutarse. Lo que queda en pantalla no es un error, es la
pantalla vacía.

**El daño no era igual en las cuatro pantallas, y conviene decirlo así en vez de dejarlo parejo.**

- **Una sola quedaba muda de verdad.** En `panel-prestadora.html:379`, una tabla sin legajos se ve
  igual esté rota o esté bien: es idéntica a la de una Prestadora que todavía no cargó ninguno.
  Ahora el fallo escribe en la propia tabla «No se pudo preparar la pantalla. Conviene volver a
  cargarla», que es el estado de error que faltaba.
- **Las otras tres caen en la pantalla de acceso**, y eso ya era la verdad: sin sesión rescatada,
  lo que corresponde mostrar es el acceso. Lo que se perdía era el rastro. Ahora
  `mockup-app.html:435` y `:909`, `pwa-asistente/index.html:964` y `pwa-familia/index.html:1129`
  dejan el detalle técnico en la consola en lugar de tirarlo.
- **`js/auth.js:292` no avisa en pantalla, y es a propósito.** Corre en las once pantallas que
  cargan ese archivo —no en las dieciséis, y el comentario decía catorce hasta que se contaron—, y su
  único trabajo es pasarle el permiso al cliente de datos. Si falla, el primer pedido de esa
  pantalla va a fallar también, y esa pantalla sí sabe cómo decirlo; poner un cartel acá sería
  contarlo dos veces. Lo que no podía seguir pasando es que el fallo desapareciera sin dejar
  rastro en ninguna parte.

**Antes de escribir el chequeo se probaron dos reglas más amplias y se descartaron las dos, con la
medición hecha.** Un chequeo que avisa de más se termina apagando, y entonces no verifica nada.

- **Los cuatro estados buscados por vocabulario** —que cada pantalla nombre «cargando», «error» y
  «vacío»— dieron aviso falso justo en `panel-prestadora.html`, que cubre los cuatro estados con
  una sola función, `estadoTabla('info' | 'critico' | 'neutro')`, y no escribe ninguna de esas
  palabras. Un chequeo que le dice «te falta» a la pantalla que mejor lo hace no sirve.
- **Todo `await` adentro de un `try`**, mirando el proyecto entero, dejaba afuera 26 de 77. Casi
  todos eran falsos: `ClienteDatos.initTenant()` atrapa su propio error y cae en una Prestadora de
  respaldo, y los cuatro de `examen.html` viven adentro de funciones que `arrancar` llama dentro
  de su `try`.
- **La que midió limpio fue la del arranque**: ocho de ocho rotos, cero avisos falsos. Esa sí se
  puede dejar prendida.

**El chequeo** vive en `scripts/verificar_arranque.mjs` y mira tres formas de la misma cosa —una
tarea que espera algo y que nadie aguarda, así que si falla no hay dónde caer—: el arranque de la
pantalla, el bloque suelto que corre solo al cargar el archivo, y la tarea que se le entrega a una
función que no espera respuesta, como el `getCurrentPosition` que ficha por GPS. Esas dos últimas
ya estaban bien y siguen vigiladas.

No alcanza con que el cuerpo tenga un `try` en alguna parte: para cada `await` se busca hacia
atrás si hay un `try` abierto que todavía no cerró. Uno de los casos de prueba es justo eso, un
`try` que cierra antes del `await`. El cuerpo se recorta contando llaves, por el mismo motivo que
en `verificar_botones.mjs`.

Se mira a sí mismo con once casos, cinco que tiene que encontrar y seis que tiene que dejar pasar.
Y para que no fuera una prueba que no puede fallar, se sacaron de la historia de git las versiones
anteriores de los cinco archivos: encontró los seis defectos que tenían, que son los ocho del
proyecto porque `js/auth.js` está copiado tres veces.

Qué no mira, dicho de frente: si el `catch` hace algo útil —uno vacío pasa igual—, y las llamadas
hacia adentro; si el arranque llama a una función que espera, ese `await` es problema de esa
función.

En la misma pasada salieron de las dos aplicaciones del teléfono el correo y la contraseña que
venían escritos en los campos de acceso. Está contado más arriba, en «El alta del teléfono ya pide
una contraseña».

### Las cinco reglas del esquema ya tienen quién las mire

Cinco reglas de `CLAUDE.md` vivían sólo en `CLAUDE.md`: nada impedía que una migración nueva las
incumpliera. Ahora las mira `scripts/verificar_esquema.mjs` antes de cada commit. **Cuatro están
limpias y la quinta tiene un solo incumplimiento**, que quedó anotado como pendiente 51 en vez de
taparse.

- **Toda tabla enciende su RLS en la misma migración que la crea** (§4). Las 22 lo hacen.
  Encenderla después, a mano desde el panel de Supabase, deja una ventana abierta entre las dos
  cosas y deja el repositorio diciendo algo que no es.
- **Toda función que se saltea la RLS le revoca el permiso a `PUBLIC` y a `anon`** (§4). Las cinco
  lo hacen: `prestadora_actual`, `crear_perfil_al_registrarse`, `es_personal_de_prestadora`,
  `legajo_propio` y `rendir_evaluacion`. Una función `SECURITY DEFINER` del esquema `public` es
  además una dirección web, porque PostgREST publica ese esquema. El chequeo **no** mira
  `authenticated` a propósito: ahí los dos casos son legítimos, porque la que consumen las
  políticas tiene que conservarlo —sin él la aplicación no puede leer sus propias tablas— y la que
  dispara un `trigger` no lo necesita.
- **Toda tabla tiene la columna de la Organización** (§5.10). Las 22 la tienen. `tenants` está
  exenta con el motivo escrito: es la Organización, y su propio identificador es el que las demás
  copian.
- **Toda tabla tiene clave primaria `uuid`** (§5.10). Las 22 la tienen, y se comprobó el 25 de
  agosto de 2026 recorriendo las quince migraciones: quince la declaran al lado de la columna y
  siete —las de la 0001— en un `alter table … add constraint … primary key` que está más abajo
  en el mismo archivo, así que el chequeo busca en las tres formas y no en una. Es la otra mitad
  de la regla de la columna de Organización, y es por lo mismo: dos bases que se fusionan con
  claves correlativas chocan en el número 1, y hay que reasignarlas todas junto con cada
  referencia que las apunta. Con UUID no chocan. Hasta el 25 de agosto de 2026 esta mitad no la
  miraba nadie, aunque la de al lado sí.
- **Todo importe se guarda con su moneda** (§5.11). Acá está el único incumplimiento:
  `caregivers.hourly_rate` (`supabase/migrations/0001_esquema_inicial.sql:102`) es un `numeric` a
  secas, y no hay columna de moneda en ninguna de las 22 tablas. Es el único importe del esquema.
  Agregarle la moneda toca una columna que ya tiene datos escritos, así que lo decide el
  Desarrollador: es el pendiente 51.

**Una medición equivocada se corrigió antes de escribirla como verdad, y conviene dejarla contada.**
La primera versión del chequeo buscaba la columna de la Organización sólo adentro del `create
table`, y avisó de tres tablas —`clock_ins`, `reportes` y `messages`— que en realidad la
tienen: se la agrega la migración 0002 en los renglones 52 a 54. Lo que delató el error fue que las
políticas de esas mismas tres tablas usan `tenant_id`, o sea que la columna existe. La regla pide la
columna, no el momento; el momento lo pide sólo la RLS, y por un motivo distinto. El chequeo hoy lee
las quince migraciones juntas antes de juzgar ninguna.

Se mira a sí mismo con diecisiete casos, siete que tiene que encontrar y diez que tiene que dejar pasar
—entre ellos `numeric(10,2)`, que con un recorte ingenuo por el primer paréntesis que cierra parte
la tabla por la mitad—. Y para que no fuera una prueba que no puede fallar, se corrió una copia con
la lista de exenciones vacía: aparecen los dos casos conocidos, cada uno en su renglón exacto.

### La regla de los módulos se midió para hacerle un chequeo, y el chequeo no se escribió

**El reparto de módulos se queda sin chequeo automático, y conviene dejar escrito por qué**, porque parecía
la candidata más fácil: es la única que trae su propia lista de palabras. `docs/MODULOS.md`, «Cómo se comprueba que la línea está bien puesta»,
manda «buscar en lo compartido cualquier palabra que sólo signifique algo acá —`modalidad`,
directorio, aviso, postulación, contacto, puntaje, destacado—». Se midió el 25 de agosto de 2026 y
la medición dice que no.

- **Sobre el texto crudo de las migraciones compartidas: once apariciones, once falsas.** Todas
  están en comentarios, y varias son el enunciado de la propia regla —«ninguna tabla de acá sabe
  qué es un directorio ni una postulación»—. Un chequeo que avisa cada vez que alguien escribe la
  regla que el chequeo vigila se apaga el primer día.
- **Sobre los nombres solos, sacando comentarios y textos entrecomillados: una aparición, también
  falsa.** Es `create policy "Directorio de Prestadoras"` en `tenants`, y ahí «directorio» es la
  lista de Prestadoras, no el directorio de Asistentes de esta modalidad. Una exención para cero
  hallazgos.
- **La lista de siete palabras no es la línea, es una muestra de la línea.** La mitad vieja del
  esquema está en inglés —`caregivers`, `care_searches`, `clock_ins`—, así que ninguna de las
  siete la toca. Y la columna compartida que más cerca pasa de la línea,
  `autorizaciones_asistente.perfil_publicado`, no usa ninguna de las siete.
- **Y la que decide: el único incumplimiento real que había ese día era invisible para esa
  prueba.** Las dos tablas de esta modalidad no llevaban el prefijo de la modalidad que
  `docs/GLOSARIO.md:20` aprobó para tablas el 24 de agosto, y ni `care_searches` ni
  `franjas_busqueda` —así se llamaban— contenían ninguna de las siete palabras. La prueba
  pasaba limpia con el problema adentro.

**Lo que falta no es el chequeo, es el prefijo.** La propia página lo dice en
`docs/MODULOS.md:63`: el prefijo «es lo que hace que la prueba de más abajo se pueda correr con
una búsqueda de texto». Puesto el prefijo, la regla se vuelve mecánica —nada que no se llame
`algo` puede nombrar una palabra de esta modalidad— y el chequeo se escribe en una tarde.
Sin el prefijo, cualquier chequeo tendría que saber de qué lado está cada tabla, y ese reparto
tabla por tabla no está escrito en ningún lado: `docs/MODULOS.md` reparte módulos.

Quedó anotado como **pendiente 52** y el Desarrollador lo decidió ese mismo día: se renombran
las dos. Cómo quedó está en la sección de acá abajo.

### El cuadro «Estado real» se volvió a medir, y una cuenta estaba mal

El `README.md` abría con siete filas de números —pantallas, renglones, dependencias, tablas—
que eran del arranque del proyecto y que nadie había vuelto a medir. Decía «6 tablas en
Supabase, **sin migraciones en el repositorio**» cuando hay veintidós tablas y dieciséis
migraciones. Se midió todo de nuevo el 25 de agosto de 2026, contra el árbol de trabajo:

| Decía | Dice |
|---|---|
| 12 pantallas HTML, 7.082 renglones | 16 pantallas HTML, 8.290 renglones |
| 2.600 renglones de JavaScript propio, 1.606 metidos en el HTML | 8.423 en 28 archivos, más 2.883 metidos en el HTML en 13 bloques |
| 3.349 renglones de CSS, 32 variables con nombre | 4.170 en 7 archivos, 64 tokens con nombre |
| 2.566 declaraciones en 772 atributos `style=` | 2.166 en 687 |
| ninguna pantalla protegida | 11 de las 16 rescatan la sesión al abrir |
| 4 dependencias por CDN | 4 servidores de afuera: dos de tipografías y dos de bibliotecas |
| 6 tablas, sin migraciones en el repositorio | 24 tablas y 20 migraciones |

Dos filas merecen una explicación. **Los estilos pegados al HTML bajaron** —de 2.566
declaraciones a 2.166— porque en el medio se sacaron los 434 colores escritos a mano; el
pendiente 8 lo cuenta. Y **el JavaScript no creció tres veces**: de los 8.423 renglones,
**5.084 son copias byte a byte** de otro archivo, que es exactamente el pendiente 13. El
cuadro ahora lo dice en la misma fila, para que el número no se lea como trabajo hecho.

**Y contar sirvió para encontrar una cuenta mal hecha.** `js/auth.js` decía en un comentario
que ese arranque «corre en las catorce pantallas». Corre en **once**: son las que cargan el
archivo. Hoy hay dieciséis pantallas, así que el número no era ni el viejo ni el nuevo — era
uno que nunca se volvió a contar. Se corrigió en las tres copias del archivo y en el pasaje
de este documento que lo repetía.

### Las pantallas también dicen Aviso, y el «Wizard» dejó de estar en inglés

El renombre de la mañana llegó hasta la base y hasta el código, y a la tarde se vio que
faltaba lo único que la gente lee: **las pantallas seguían diciendo «Publicar Búsqueda»**.
Estaba en el enlace de la barra de siete pantallas, en el título y en cuatro lugares más de
`formulario-integral.html`, en dos de `pwa-familia/index.html` y en el menú de
`panel-prestadora.html`. Publicar una búsqueda no quiere decir nada: se publica un aviso, y
buscar es lo que hace después el que lo lee.

- **El enlace de la barra dice «Publicar un Aviso»** en las siete pantallas que lo tienen.
- **Se fue «(Wizard)»**, que estaba entre paréntesis en catorce enlaces, y también «Wizard
  Interactivo» y «Wizard de Publicación», que eran texto visible en inglés. Quedó **«paso a
  paso»**. No se tradujo por «asistente», que es la palabra correcta para eso en castellano,
  porque en este producto un Asistente es una persona.
- **El botón que publica decía `PUBLICAR BÚSQUEDA AHORA`** y ahora dice `PUBLICAR EL AVISO
  AHORA`. Ése no lo encontró la lectura sino el chequeo, porque estaba todo en mayúsculas.
- **Los dos avisos de éxito cambiaron de persona.** El de la PWA decía «Lo contactaremos a la
  brevedad»: daba por sentado el género de quien lee. Ahora dice «Nos vamos a comunicar a la
  brevedad».
- **Los identificadores del formulario acompañan**: `form-nueva-busqueda` pasó a
  `form-nuevo-aviso` y `btn-enviar-busqueda` a `btn-enviar-aviso`.
- **Y adentro del código había un `AVISOS` que no eran avisos.** `js/catalogo.js`,
  `js/disponibilidad.js` y `js/autorizaciones.js` guardaban ahí los cuatro estados de la
  «los cuatro estados» —«Cargando opciones…», «No se pudieron cargar», «No hay opciones
  disponibles», «Por ahora no hay nada para mostrar acá»—, que no son ni un Aviso ni una
  notificación: son **mensajes** en pantalla. La constante pasó a llamarse `MENSAJES` en
  los tres módulos y en sus ocho copias. Esto no lo pidió nadie: el problema de un nombre
  ambiguo no es sólo que la misma cosa tenga dos nombres, sino que dos cosas tengan el
  mismo.

**Y el chequeo de vocabulario pasó a mirar dos palabras en vez de una.**
`scripts/verificar_vocabulario.mjs` vigilaba que «cuidador» no volviera a ser el término
general; ahora vigila además que «búsqueda» no vuelva a nombrar lo que se publica. La palabra
suelta **no** se prohíbe, porque buscar sigue siendo buscar: «Filtro y Búsqueda en la Red de
Asistentes» está bien dicho y pasa. Lo que se prohíben son las formas donde nombra una cosa
guardada —publicar una búsqueda, una búsqueda publicada, una búsqueda nueva, las búsquedas de
una Familia—, que son las que no tienen ningún uso legítimo. Se prueba a sí mismo con once
frases nuevas, seis que tiene que encontrar y cinco que tiene que dejar pasar.

### El renombre se aplicó contra el servidor, y de paso murió un estado que nadie escribía

Las migraciones `0015` y `0016` estaban escritas y sin aplicar, y mientras tanto el código pedía
tablas que en el servidor todavía se llamaban como antes. **Se aplicaron el 25 de agosto de 2026
con `supabase db push`**, contra la base de este proyecto —`pfbvpncavvlgmmvqkgbo`, la misma que
nombra `js/apiClient.js:8`—, y no contra la de Careonys, que está en producción y no se toca desde
acá. Quedan las diecisiete migraciones del repositorio aplicadas, sin diferencia entre lo local y
el servidor.

**Y aplicarlas destapó un valor muerto.** `caregivers.verification_status` aceptaba dos palabras
para decir una sola cosa: `validado` y `validado_prestadora`. La `0007:8` ya había escrito qué
significa —«Validado quiere decir "la Prestadora revisó los papeles"»—, que es exactamente lo que
dice `validado_prestadora` con todas las letras. Los dos pasaban en todos lados, y **el corto no lo
escribía nadie**: el único lugar que asigna un estado validado es `panel-prestadora.html:393`, y
pone el largo. El corto sólo aparecía leído, y en una fila de ejemplo.

La `0017` lo saca: pasa las filas que decían `validado` a decir `validado_prestadora`, y el
directorio deja de nombrar el valor muerto. En el código quedaba un solo lugar que lo leía
—`pwa-asistente/index.html:1544`, un `||` defensivo— y también se fue. **Lo que la `0017` no hace es
cerrar la lista de estados con un `check`**, porque para eso hay que saber cuáles son todos, y hoy
el código nombra cuatro sin que ningún lugar diga que ésos son todos.

Esto cierra la mitad del pendiente 53. La otra mitad no la puede cerrar la línea de comandos: falta
**el nombre del segundo nivel de Asistente**, y un nombre no se inventa.

### Las dos tablas de esta modalidad pasaron a llamarse como lo que guardan

**Decidido por el Desarrollador el 25 de agosto de 2026**, sobre el pendiente 52 y con las tres
opciones a la vista: se renombran las dos, no una sola. El motivo que dio es el que cierra la
discusión —*no puede ser que tengamos distintos nombres para la misma cosa*—, y vale más que el
trabajo de arreglarlo.

**Eran dos problemas encimados.** El primero, el prefijo: `docs/GLOSARIO.md:20` había aprobado el
24 de agosto que lo que sólo existe en esta modalidad lo lleve en el nombre, y no lo llevaba
ninguna tabla. El segundo, la palabra: `care_searches` no guardaba búsquedas. Una búsqueda es el
acto de buscar y no deja nada guardado; lo que queda guardado es el aviso que publica la Familia.

**Cómo quedó.**

| Antes | Ahora | Qué pasó |
|---|---|---|
| `care_searches` | `avisos` | `supabase/migrations/0015_los_avisos_se_llaman_avisos.sql`, con su clave, su restricción, su índice y su política |
| `reportes.search_id` y `messages.search_id` | `aviso_id` | La misma migración, con sus dos restricciones |
| `caregivers_publicos` | `directorio` | La misma migración. El nombre no es nuevo: es el del módulo, decidido el 24 de agosto en `docs/MODULOS.md:58` |
| `franjas_busqueda` | `franjas_aviso` | No hubo renombre: la migración que la crea no estaba aplicada, así que se reescribió y se renumeró a `supabase/migrations/0016_franjas_de_un_aviso.sql`. Esa tabla nunca llegó a existir |
| `franjas_busqueda.search_id` | `franjas_aviso.aviso_id` | Ídem |
| `grilla_busqueda`, `paso_de_franjas_busqueda` | `grilla_aviso`, `paso_de_franjas_aviso` | Claves del catálogo `data/catalogo-disponibilidad.json` y sus dos copias |
| `getBusquedasFamilia`, `crearBusquedaFamilia`, `crearBusqueda`, `guardarFranjasDeBusqueda`, `getFranjasDeBusqueda` | `getAvisosFamilia`, `crearAvisoFamilia`, `crearAviso`, `guardarFranjasDeAviso`, `getFranjasDeAviso` | `js/apiClient.js` y sus dos copias, más quien las llama |
| `busqueda_sin_franjas` | `aviso_sin_franjas` | El error y su texto en `js/texto.js` |

**Lo que la renumeración evitó.** La migración de las franjas era la 0015 y pasó a ser la 0016,
porque tiene que correr después del renombre: cuelga de `avisos`. Como no se había pegado
todavía en el panel de Supabase, se pudo reescribir en vez de agregarle un renombre encima. Es la
diferencia entre las dos tablas: `care_searches` ya existía en el servidor y necesitó una
migración de verdad; `franjas_busqueda` no existió nunca.

**Lo que este renombre dejó a la vista y no arregló.** `reportes` y `messages` son tablas
compartidas y siguen apuntando a un objeto que sólo existe en esta modalidad. Antes la columna se
llamaba `search_id` y no se notaba; ahora se llama `aviso_id` y se nota. Es un problema de
reparto, no de nombres, y sigue anotado en el pendiente 52.

**Las dos migraciones están escritas y ninguna aplicada.** El Desarrollador tiene que pegarlas en
el panel de Supabase, en orden: primero la 0015, después la 0016. Hasta que lo haga, el código
nombra tablas que en el servidor todavía se llaman como antes.

### Los cuatro estados se midieron dos veces, y la segunda dijo lo contrario que la primera

Los cuatro estados —cargando, error, vacío, listo— son una regla de la empresa, y eran lo último
no negociable de la sección 5 que no miraba nadie.

**La primera medición, el 25 de agosto de 2026, concluyó que la regla ya se cumplía y que no valía
la pena escribir el chequeo. Estaba equivocada, y conviene dejar escrito por qué**, porque el error
no fue de descuido: fue de método, y el mismo método está a mano para volver a cometerlo.

Aquel detector buscó **funciones**: toda `async function` que espera un pedido de datos y además
escribe en la pantalla. Encontró catorce y avisó de siete, y las siete eran falsas —cada una por un
motivo distinto: el estado lo encendía una función auxiliar, el fallo lo atrapaba quien llamaba, el
cartel de carga estaba escrito en el HTML desde el principio—. Con siete de siete falsas, la
conclusión pareció obvia: la regla se cumple y el cumplimiento es invisible para una prueba
automática.

**Lo que falló fue la unidad de medida.** Contar funciones deja afuera todo lo que no es una
función: un `await` suelto adentro de un escuchador de eventos, un `try` sin `catch`, un cargador de
`js/` que no atrapa nada y muere en la pantalla que lo llama. Y deja afuera, sobre todo, la
pregunta que importa, que no es «¿esta función maneja los cuatro estados?» sino **«¿hay alguna
espera de la que una persona no se entere si sale mal?»**.

**La segunda medición, el 26 de agosto de 2026, contó bloques asincrónicos en vez de funciones, y
encontró doce puntos de carga incumplidores.** No siete falsos: doce reales, en ocho pantallas.
Entre ellos, tres que decían en la cara algo que no era: `nueva-clave.html` contaba un fallo de red
como «este enlace ya no sirve» y mandaba a pedir uno nuevo que tampoco iba a poder abrir;
`registrar-asistente.html` mostraba el cartel de éxito cuando el alta se había salteado el legajo;
y `js/apiClient.js` devolvía el mismo `null` para «no se pudo preguntar qué Prestadora es» y para
«esta dirección no nombra ninguna», así que la pantalla decía lo segundo cuando pasaba lo primero.

De esos doce, **once se corrigieron y uno quedó exento**: los dos de `mockup-app.html`, que es un
modelo estético con fecha de vencimiento escrita en el pendiente 6 y que el chequeo declara y
explica cada vez que corre.

**El chequeo existe y se llama `scripts/verificar_estados.mjs`.** Lo levanta
`scripts/verificar_todo.mjs`, que lo descubre solo. Mide 59 puntos de carga y 220 bloques
asincrónicos en 45 archivos. Reconoce tres formas distintas de contar un fallo —decirlo, volver a
lanzarlo, o anotarlo en una lista que la función devuelve— y tiene pruebas propias que le rompen
cada una para comprobar que el detector todavía avisa; sin eso, un detector que se ablanda de más
pasa a dar verde por no mirar.

**Y la lección de método, que es lo único de esta sección que sirve para el próximo chequeo:** una
medición que sale toda en verde no es una buena noticia hasta que se comprueba que **podía** salir
en rojo. La primera midió con una unidad que no podía encontrar lo que había, y por eso no encontró
nada. La regla que quedó escrita de ahí está en el `CLAUDE.md` de la empresa: «una prueba que no
puede fallar no prueba nada».


**Lo que sí encontró la medición fue otra cosa, y ésa se arregló el mismo día.** El mismo
interruptor está escrito ocho veces en ocho pantallas, y las copias no eran equivalentes: cuatro
encendían el panel con `display: 'block'` y dos con `display: ''`. No es lo mismo. `'block'` le
impone al panel una forma; `''` le devuelve la que le había dado el CSS. Y en este proyecto ya hay
un panel que no es `block`: `.directory-grid` es `display: grid` (`css/styles.css:1098`), y por eso
`directorio.html` tuvo que usar la forma vacía. Las otras cuatro —`acceso.html`, `examen.html`,
`nueva-clave.html` y `recuperar-clave.html`— andaban de casualidad, porque hoy ninguno de sus
paneles es grid ni flex, y el día que alguien agregara uno se habría aplastado sin avisar. Las seis
que conmutan `display` dijeron `''` desde ese día, con el motivo escrito al lado. **Y el 26 de
agosto de 2026 dejaron de conmutar `display` del todo**: al pasar esconder a la clase `oculto` —el
pendiente 8—, vaciar el atributo dejó de mostrar nada, porque sin nada escrito ahí vuelve a mandar
la clase. Las seis dicen ahora `classList.toggle('oculto', …)` (`acceso.html:99`), que no impone
forma ninguna: el panel que se muestra recupera la que le dio el CSS, sea grid, flex o la que sea.
Que sigan siendo ocho copias es parte del pendiente 13.

**«Toda operación destructiva se confirma» se midió en el mismo rato y salió todavía más
corta.** La regla pide confirmación explícita ante cada una, y la medición encontró que en este proyecto hay exactamente una:
rechazar un legajo (`panel-prestadora.html:350`). No hay un solo `delete` contra la base en las
cuarenta y cuatro pantallas y guiones —lo único que se parece son dos `delete` de JavaScript sobre
un objeto en memoria, `js/apiClient.js:407` y `js/apiClient.js:451`, que no tocan nada guardado—, y
salir de la sesión no
destruye nada. La única que hay ya pregunta antes, y la pregunta dice qué queda después:
«Se va a rechazar este legajo. Queda cerrado y la persona no aparece en el plantel activo.
Desde esta pantalla no se puede volver atrás. ¿Confirma?».
No hace falta un chequeo para vigilar un caso que además está bien; lo que hace falta es acordarse
cuando aparezca el segundo, y por eso queda escrito acá.

### Cuánto vale cada papel lo decide cada Prestadora, no nosotros

Al diseñar el puntaje del legajo, la línea de comandos propuso que las cinco comprobaciones
valieran todas lo mismo, con este argumento: cualquier otro reparto obliga a defender por qué el
domicilio vale menos que la referencia, y eso no lo puede defender nadie. **El argumento estaba
bien y el dueño estaba mal.** El Desarrollador corrigió que el que tiene que poder defender ese
reparto no somos nosotros sino **cada Prestadora**, cuyo criterio puede legítimamente no ser el
nuestro —y que puede, además, no querer calificar a nadie.

Así que los pesos iguales dejaron de ser la regla y pasaron a ser **el valor de fábrica**. La
migración `0018_cada_prestadora_pondera_su_puntaje.sql` agrega dos tablas:

| Tabla | Qué guarda |
|---|---|
| `puntaje_prestadora` | Una fila por Prestadora, con una sola llave: `califica`. En `false` desaparece el número de todas sus pantallas |
| `ponderacion_comprobacion` | Una fila por Prestadora y comprobación, con `ponderacion`. Arranca en 20 las cinco, que es 100 repartido en partes iguales |

**Apagar el puntaje no apaga el escudo.** Son cosas distintas: el escudo dice que el legajo está
validado, y eso es la puerta de la modalidad —no se entra sin eso—. El número dice cuánto acreditó
alguien de más. Se puede no querer lo segundo sin dejar de necesitar lo primero.

**Y una ponderación en cero no es lo mismo que apagar el puntaje.** Cero quiere decir «esta
comprobación a mí no me importa», y el resto sigue sumando. Por eso son dos tablas y no una: una tabla vacía
no dice «todas valen uno», dice «todavía nadie configuró esto», y esas dos cosas no se pueden
confundir. La migración siembra las filas de fábrica para las Prestadoras que ya existen,
justamente para que el valor de fábrica sea visible y no un supuesto escondido en el código.

**La palabra `peso` no sobrevivió al primer lector.** El Desarrollador leyó «el formulario de
pesos en el panel de la Prestadora» y preguntó si se estaba hablando de dinero. Esa es toda la
prueba que hacía falta: acá el peso es la moneda antes que cualquier otra cosa. La migración
`0022_la_ponderacion_no_es_plata_y_suma_cien.sql` renombró la tabla y la columna a
`ponderacion`, que es la palabra que ya significa cuánto cuenta cada cosa dentro de un total.
Sale barato porque la base todavía no tiene datos reales; dentro de un año no salía.

**Y con el sí vino una regla que cambia la tabla más que el nombre:** «lo que sí es importante
es que la suma de todos los ítems valorados dé 100%, así que si se agrega alguno la prestadora
tendrá que reacomodar las ponderaciones de cada ítem para que el total de todas ellas dé el
100%». Hasta la 0018 cada comprobación valía lo suyo y era independiente: subirle a una no le
bajaba a ninguna, y el total era cinco, o seis, o lo que diera. Ahora **el total es una cantidad
fija que se reparte**, y subirle a una obliga a bajarle a otra.

Lo hace cumplir un disparador de restricción diferido, no una comprobación por renglón, y el
motivo es que reacomodar mueve varias filas: en el medio el total nunca da 100, así que mirar
después de cada una haría fallar la primera. Mira una sola vez, cuando la Prestadora terminó de
guardar.

**Lo que gana la regla, además de que el número se lea.** Agregar una comprobación sexta deja de
poder hacerse a escondidas: la fila nueva entra valiendo 20, el total queda en 120 y la base no
la deja pasar hasta que alguien reacomode las demás. Es la clase de regla que sirve **porque
molesta** — si no molestara, la sexta entraría y nadie se enteraría de que el criterio de esa
Prestadora cambió solo.

**Y se lleva puesta la fracción «4 de 5 comprobaciones».** Sólo se lee bien si las cinco valen
lo mismo, y ahora valen lo que cada Prestadora diga. El número pasa a ser un porcentaje, que es
además lo que la suma a 100 vuelve natural: un legajo con el domicilio y la referencia
comprobadas tiene 40 %. La lista al lado se queda, por el motivo de siempre —un número suelto
invita a comparar personas y la lista invita a decidir—. Es el pendiente 56.

Las dos tablas se leen sólo con sesión y con la política de siempre —`tenant_id =
prestadora_actual()`—, y `anon` no las ve: con qué criterio pondera una Prestadora es asunto
suyo, y publicarlo dejaría comparar criterios de Prestadoras distintas, que es justo lo que
todavía no está decidido (pendiente 56).

**Esto abre una consecuencia que hay que mirar antes de dibujar la pantalla.** El diseño decía
mostrar «4 de 5 comprobaciones». Esa fracción sólo se lee bien mientras las cinco valgan lo
mismo; en cuanto una Prestadora las pondera distinto, «4 de 5» deja de querer decir algo y hay
que mostrar un porcentaje. Quedó anotado en el pendiente 56 junto con la pregunta más difícil:
qué ve una **Familia** en un directorio donde conviven Prestadoras que ponderan distinto.

### El cuaderno se llama reporte, y la tabla ahora se llama igual que en Careonys

Lo que el Asistente anota de cada jornada se llamaba de tres maneras a la vez: «cuaderno de
cuidado» en el menú, «bitácora» en el resto de las pantallas y `logbook_entries` en la base. El
Desarrollador decidió el 25 de agosto de 2026 que se llama **reporte**.

**Reporte y no informe**, entre las dos palabras que puso sobre la mesa. Reportar es
*re-portare*, llevar de vuelta: es exactamente lo que hace el Asistente, le lleva a la Familia lo
que pasó en la jornada. Informar es *in-formare*, darle forma a algo, y suena a documento
elaborado por alguien que analiza; esto es una anotación diaria, no un dictamen. **Y no es
palabra nueva:** Careonys ya tenía la tabla como `reportes`, así que la fusión va a encontrar un
solo nombre en vez de dos.

Se cambió en los tres lados a la vez, que es la única forma de que no vuelva:

| Dónde | Qué |
|---|---|
| La base | `logbook_entries` pasó a `reportes`, con sus tres restricciones y su política (`0019`) |
| El código | `registrarBitacoraDiaria` → `registrarReporte`, `getBitacoraDiaria` → `getReportes`, `cargarBitacora` → `cargarReportes`, y los identificadores de pantalla y de estilo que decían `cuaderno` |
| Lo que se lee | 98 apariciones en 20 archivos, entre menús, títulos, mensajes y comentarios |

**La migración cambia el nombre y nada más.** Las columnas siguen como estaban: acá son
`blood_pressure`, `glycemia`, `medications_administered` y `daily_notes`, y en Careonys son
`signos_vitales`, `medicacion` y `texto_libre`, que es otra forma de guardar lo mismo.
Emparejarlas es trabajo de la fusión, no de un renombre.

**Dos apariciones se quedaron a propósito**, y por el mismo motivo: son citas literales de código
que ya no existe. Las claves `bitacora` de `localStorage` se llamaban así y se borraron con el
camino de imitación; el bloque SQL que `docs/ESQUEMA.md` copia es la política original tal cual
estaba escrita. Cambiarles el nombre haría que el documento mienta sobre lo que hubo.

**Y la palabra vieja quedó vigilada.** `scripts/verificar_vocabulario.mjs` pasó de mirar dos
palabras a mirar tres: ahora también falla si «cuaderno» o «bitácora» reaparecen en texto
visible. Este detector no lleva excepciones, al revés que el de «cuidador»: ninguna de las dos
palabras tiene otro uso legítimo acá, así que cualquier aparición es la palabra vieja volviendo.

### La barrera no era una sola: eran tres, y sólo estaban dos

El Desarrollador lo dijo el 25 de agosto de 2026 en una frase: una Familia no puede ver a la
otra, una Prestadora no puede ver a la otra, y un Asistente no puede ver al otro. Se auditaron
las políticas vivas de todas las tablas y **la frase nombraba tres barreras, no una**. La que
llamábamos «el tenant» es sólo la del medio:

| Barrera | Con qué se sostiene | Cómo estaba |
|---|---|---|
| Prestadora ↔ Prestadora | `tenant_id = prestadora_actual()`, desde la 0002 | entera |
| Asistente ↔ Asistente | `legajo_propio()` desde la 0005 y la 0012; la carpeta propia en el depósito, desde la 0006 | entera |
| Familia ↔ Familia | nada | **no existía** |

Las dos primeras separan cosas que están en tablas distintas o en carpetas distintas. La
tercera es más difícil justamente porque **las dos Familias están adentro de la misma
Prestadora**: ahí el `tenant_id` de las dos vale lo mismo, así que no separa nada. Cinco tablas
se conformaban con él, y eso quería decir que **una Familia, con sólo iniciar sesión, leía,
modificaba y borraba los avisos de las demás, y leía la presión, la glucemia y la medicación de
todos los Pacientes de la Prestadora**. Lo mismo un Asistente con sesión. La migración
`supabase/migrations/0020_la_barrera_tambien_va_entre_familias.sql` lo cierra, y está aplicada.

**Faltaba una pieza antes de poder escribir la regla: el aviso no sabía de quién era.**
`avisos` no tenía ninguna columna que lo atara a quien lo publicó, así que no había con
qué comparar. Ahora tiene `familia_id`, y el valor **sale del valor por omisión y nunca del
pedido** —igual que `tenant_id` desde la 0002—, que es lo que hace que nadie pueda publicar un
aviso a nombre de otra persona. Los horarios y la conversación no deciden nada por su cuenta:
cuelgan del aviso, y si el aviso no se ve, el `exists` de la política no encuentra nada y ellos
tampoco se ven.

**Y había un agujero recién hecho, propio, que se cerró en la misma pasada.** Las dos tablas de
la 0018 —cuánto pondera cada Prestadora su puntaje— tenían políticas que sólo miraban el
`tenant_id`, así que cualquier sesión de esa Prestadora podía cambiar los pesos del puntaje. No
lo usaba nada todavía. Se cerró antes de que lo usara algo.

**Lo que esta migración deja peor, a propósito y con la razón escrita.** La pantalla de reportes
de la Familia **va a quedar vacía**. Hasta ayer mostraba los reportes de todos los Pacientes de
la Prestadora, que no es «llena»: es peor que vacía. Un reporte no guarda para qué Familia es
—`aviso_id` existe desde el principio y el código nunca lo llenó, comprobado en
`pwa-asistente/index.html`, donde se escribe el reporte sin ese dato—, así que no hay forma de
darle los suyos y ninguno más. Entre mostrar de más y no mostrar nada, se eligió no mostrar
nada, y **la pantalla ahora dice por qué está vacía** en vez de dar a entender que nadie
escribió. La cláusula que se lo va a devolver **ya está escrita** en la política y hoy no
encuentra ninguna fila: empieza a funcionar sola el día que un reporte cuelgue de algo, que es
el pendiente 52 y por esto pasó a ser urgente.

**Un aviso publicado antes de hoy tampoco lo ve su Familia**, porque `familia_id` le quedó
vacío. Lo sigue viendo el personal de la Prestadora. No se rellenó a mano: no hay dato de dónde
sacarlo, y adivinar el dueño de un aviso es exactamente lo que la migración vino a impedir.

**La prueba de aislamiento pasó de 27 comprobaciones a 39.** Las doce nuevas necesitaban una
cuenta más: A y B están en Prestadoras distintas y entre ellas alcanza con el `tenant_id`, así
que no probaban nada de esto. C está en la misma Prestadora que A, y es el único par que puede
mostrar si la barrera existe. Comprueban que cada Familia publica su aviso y sale a su nombre
sin haberlo mandado, que mandarlo a nombre de otra no sirve, que ninguna ve, modifica ni borra
el aviso de la otra, ni sus horarios, ni su conversación, ni ningún reporte, y que los pesos del
puntaje no se leen ni se cambian desde una sesión que no es del personal. Esa última no mira una
tabla vacía: **las filas existen porque las siembra la propia 0018**, así que ver cero ahí es la
política y no la falta de datos. **Las doce quedaron escritas y no corridas**: el guion completo
necesita `--local` con `supabase start`, porque el registro por correo del servidor remoto pide
confirmar la casilla y ahí la prueba nunca llega a tener sesión. Está dicho en la cabecera del
propio guion desde antes.

### La validación no parte a los Asistentes en dos clases: es un tilde que habilita

Quedó escrito acá porque durante un día entero se buscó una palabra que no hacía falta. El
pendiente 53 pedía cómo llamar «al Asistente que ya pasó todos los controles», dando por sentado
que había dos clases de persona y que a la segunda le faltaba el nombre. **El Desarrollador
corrigió el 25 de agosto de 2026 que no hay dos clases.** La validación es un tilde en un
casillero que cambia una condición y habilita a la persona; quien todavía no lo tiene no es otra
categoría de Asistente, es simplemente **alguien tramitando su incorporación**.

Eso cierra el pendiente sin inventar ninguna palabra, que es el mejor final posible: la regla del
Desarrollador dice que una palabra nueva mal elegida cuesta muchísimo más sacarla después que
ponerla. Lo único que había que arreglar era el texto en pantalla, que nombraba un estado en vez
de nombrar lo que está pasando:

| Decía | Dice |
|---|---|
| 🔴 En Revisión (`panel-prestadora.html`) | 🟡 Tramitando su incorporación |
| 🟡 En revisión — Complete su legajo (`pwa-asistente/index.html`) | 🟡 Tramitando su incorporación — Complete su legajo |

El punto rojo también estaba mal y por el mismo motivo: rojo se lee como que algo falló, y acá no
falló nada — hay un trámite en curso. Los nombres guardados en la base no se tocaron
(`en_revision`, `validado_prestadora`): «lo que se guarda para siempre se nombra por lo que hace» dice que lo que persiste se nombra por su
función y no se renombra, y esos dos nombres describen bien el casillero.

**Y la corrección dejó algo a la vista.** El código sí inventa la clase de persona que el
Desarrollador dice que no existe: la llama «Aspirante», 55 veces en 7 archivos, y esa palabra no
está en el glosario de este proyecto ni en el de Careonys. Es el pendiente 57.

### El anónimo dejó de tener listas y pasó a tener puertas con nombre

Dos cosas se leían sin iniciar sesión con la clave que viaja adentro de cada pantalla —la que
cualquiera lee del navegador—, y ninguna de las dos debía leerse. No es una sospecha: se preguntó
contra el servidor de verdad antes de tocar nada.

| Qué devolvía | Cuánto |
|---|---|
| `directorio` | 7 legajos publicados, de las dos Prestadoras, mezclados |
| `tenants` | las 2 Prestadoras activas, o sea la lista de clientes de CeltaTech |

**La pantalla filtraba bien y eso no alcanzaba.** `js/apiClient.js` pedía el directorio con
`tenant_id=eq.<la suya>` desde que se cerró el pendiente 2, así que por la pantalla nadie veía de
más. Pero las reglas de la empresa piden aislamiento «en aplicación **y base de datos**, nunca
solo frontend», y una lista que separa sólo porque el que pregunta se porta bien no separa nada:
la misma dirección sin el filtro devolvía todo.

**Las dos frases que lo cerraron** son del Desarrollador, el 25 de agosto de 2026: «cada
prestadora tiene su propio directorio, sus propias familias, etc. No se mezcla nada», y «no existe
una lista de prestadoras que el cliente, familia, asistente o vaya uno a saber quién pueda ver».

**Por qué hicieron falta funciones y no políticas.** Una política decide qué filas puede ver quien
pregunta; **ninguna puede exigir que la pregunta traiga un filtro**. Y sin sesión la base no tiene
a quién preguntarle de qué Prestadora es la visita. Lo único que resuelve las dos cosas a la vez
es una función con un argumento obligatorio —el nombre corto, el que ya viaja en `?t=` y en el
subdominio—: sin ese dato no devuelve nada, y con él devuelve una sola Prestadora. La respuesta
que mezcla dos empresas dejó de existir, en vez de depender de que nadie se olvide.

Después de la migración 0021 el rol anónimo **no lee ninguna tabla ni vista de este esquema**.
Tiene tres puertas y las tres le piden nombrar una Prestadora: `prestadora_por_slug`,
`directorio_de` y `perfil_del_directorio`. El barrido lo confirma contra el servidor real: 27
tablas y vistas, 23 que ni dejan preguntar, 4 que contestan sin devolver nada, **0 que devuelvan
filas**. Y su lista de excepciones quedó vacía, que es la primera vez.

**Lo que dejó de funcionar a propósito.** Entrar sin nombrar ninguna Prestadora ya no muestra
nada. Antes se mostraba la primera que devolviera la base; eso *era* leer la lista, así que se fue
con ella. Quien entre sin el enlace de su Prestadora va a ver que le falta el enlace, que es
exactamente lo que le pasa.

**Y la corrección destapó algo que faltaba.** Si una Prestadora sólo se ve y se habilita desde el
panel de control de CeltaTech, ese panel tiene que existir, y no existe: `status` se cambia hoy a
mano contra la base. Es el pendiente 58, y es lo único del modelo de aislamiento de Careonys que
acá parecía no hacer falta.

### El directorio dice qué se le comprobó a cada uno, y el consentimiento lo promete

Cerró el pendiente 43, el 26 de agosto de 2026, con las tres decisiones que el Desarrollador
había tomado ese mismo día: se muestra el género, el directorio puede decir qué se controló de un
legajo, y por eso vuelve el filtro que se había sacado el 24.

**Qué sale y qué no.** La vista `directorio` ganó una columna, `comprobaciones`
(`supabase/migrations/0026_el_directorio_dice_que_se_comprobo.sql`), con hasta cinco claves:
domicilio, referencia, matrícula, título y curso aprobado. Las cinco ya estaban restringidas en la
base desde la migración 0018, así que no hubo que inventar ninguna palabra.

| Qué se decidió no publicar | Por qué |
|---|---|
| Documento, antecedentes penales y certificado de salud | Son la puerta. Quien está publicado ya los pasó, así que nombrarlos no distingue a nadie, y son lo más sensible del legajo |
| Fechas y números | El consentimiento promete decir **qué** se comprobó, no cuándo ni con qué papel |
| Lo que **falta** | Decir qué falta es publicar el estado de los papeles de una persona, y eso no lo autorizó nadie |
| «Prefiero no decirlo», cuando es la respuesta de género | Escribirla en la tarjeta sería publicarla con otras palabras |

**Un papel presentado no es un papel comprobado.** La columna cuenta sólo las verificaciones en
estado `verificado`; el curso no viene de ahí sino de un intento aprobado, porque lo corrigió la
base (migración 0008) y nunca fue un papel que alguien entregó.

**La primera prueba no probaba nada, y se rehízo.** Con la columna ya aplicada contra el servidor
real, las siete personas publicadas devolvían lista vacía: la siembra no tenía ni una comprobación
cargada, así que una consulta rota y una correcta contestaban lo mismo. La migración 0027 cargó
comprobaciones repartidas a propósito —alguien con una matrícula sólo presentada, alguien con los
antecedentes penales comprobados de verdad—, y recién entonces la prueba pudo fallar. Con ella:
Ramiro devuelve una sola comprobación y no dos, Nadia devuelve tres y no cuatro, y el filtro por
matrícula devuelve cero.

**El consentimiento dice lo mismo, en los tres idiomas.** `data/catalogo-autorizaciones.json`
nombra ahora el género y qué se comprobó, aclara que del domicilio sólo se dice que se comprobó y
nunca cuál es, y sigue prometiendo que ningún dato de contacto se muestra.

**Y apareció una decisión de redacción que no es nuestra.** Con el género pegado al Tipo de
Asistente, la tarjeta dice «Enfermero universitario · Femenino». El desajuste ya existía en el
catálogo; recién ahora se ve. Es el pendiente 60.

### El chat no deja pasar un teléfono, y hay que decir hasta dónde llega eso

Hecho el 26 de agosto de 2026. Cierra la parte del pendiente 6 que no dependía de ninguna
decisión: la condición ya estaba tomada por el Desarrollador el 24 de agosto y escrita en
`docs/CATALOGO.md` como «la tercera puerta».

**Qué hace.** Antes de mandar un mensaje, el chat lo revisa. Si adentro hay algo que parece un
teléfono —en dígitos o escrito con palabras—, un correo —incluso disfrazado de «arroba» y
«punto»— o un domicilio, el mensaje no sale: se dice por qué, y **el texto se queda en el campo**
para que se pueda corregir. Nunca se dibuja la burbuja, porque una burbuja que aparece y
desaparece se lee como un error del programa y no como una negativa.

**Dónde vive cada cosa, y por qué ahí.**

| Pieza | Dónde | Por qué |
|---|---|---|
| Las reglas | `data/patrones-contacto.json` | Son una regla operativa, y una regla operativa no se escribe en el código. Quien quiera ajustar qué cuenta como teléfono edita ese archivo y no toca ninguna pantalla |
| El reconocedor | `js/contacto.js` | Un solo lugar. El día que haya chat en las PWAs, lo llaman igual |
| La prueba | `scripts/verificar_contacto.mjs` | Entra sola al gancho de `pre-commit`, que busca los chequeos en la carpeta |
| El aviso, en tres idiomas | dentro del archivo de reglas | Un mensaje de error es texto visible, y no nace en un solo idioma |

**No se triplica.** Las copias de `js/` en cada PWA existen porque el trabajador de servicio de
cada una sólo alcanza su propia carpeta. Ninguna de las dos tiene chat, así que no hay nada que
copiar todavía.

**La prueba tiene dos listas, y la segunda es la que sirve.** Trece mensajes que **no pueden
pasar** y trece que **no pueden quedar bloqueados**. Con una sola lista, un reconocedor que
bloqueara todo pasaría la prueba entera. Y el daño real de este control no es dejar escapar un
teléfono —eso ya está anotado— sino cortarle la conversación a un Asistente que dijo que cobra
3500 por hora y trabaja de 8 a 16. Se comprobó que la prueba falla de las dos maneras: sin
reglas, y con una regla que bloquea cualquier cosa.

**Falla cerrado y se nota.** Si el archivo de reglas no se puede leer, el mensaje no sale y la
pantalla lo dice. Un control que se apaga en silencio es peor que uno que no existe, porque nadie
se entera de que dejó de estar.

**Y lo que hay que decir de esto es lo que no hace.** Corre en el navegador de quien escribe. Se
saltea abriendo la consola, y quien tiene motivo para saltearlo es exactamente contra quien
existe. **La mitad que importa va del lado del servidor y hoy no se puede escribir**: la tabla del
chat no existe, `messages` es de otro modelo y todavía no se decidió cuál queda. Quedó como
pendiente 62, con la condición de que el control entre en la misma migración que cree la tabla y
lea las mismas reglas, no una segunda copia de ellas.

**Y el mismo día se sacó del HTML la consulta al chat.** Leer y mandar mensajes estaba escrito con
`fetch` a mano adentro de `mockup-app.html`, armando la dirección y los encabezados ahí mismo: era
el pendiente 15. No era una cuestión de prolijidad. Quien escribe la llamada a mano decide solo si
manda el token de quien inició sesión o la clave pública, y de ese renglón depende que la base
sepa quién está preguntando. Ahora son `ClienteDatos.getMensajes()` y
`ClienteDatos.enviarMensaje()` (`js/apiClient.js:737`), que arman el pedido una sola vez para
todos.

Se ganó algo que no se buscaba: la lectura vieja miraba `res.ok` y, si venía en falso, seguía de
largo con la lista vacía. `_supabaseRequest` convierte eso en un error. Hoy la tabla contesta
`42501 permission denied` a quien no inició sesión, y eso antes se veía igual que un chat sin
mensajes.

**Lo que no se decidió al mudarla.** La consulta se movió tal como estaba, con su tabla y sus
columnas de hoy, y sigue sin filtrar por conversación porque la tabla de hoy no tiene con qué.
Cuál es el modelo del chat —`messages`, o `conversaciones` y `mensajes`— sigue esperando decisión
en el §4 de este mismo documento, y mover una consulta de lugar no es elegirlo.

### Las pantallas dejaron de tener el texto adentro

Hasta el 26 de agosto de 2026 todo lo que una persona lee estaba escrito a mano adentro del HTML,
en castellano y nada más, mientras la regla de la empresa pide `es-AR`, `en` y `pt-BR` **desde el
día uno**. Ese día se construyó el mecanismo entero, se convirtió el camino de la contraseña
completo —entrar, pedir el enlace y elegir una contraseña nueva— y la pantalla de las evaluaciones.
El inventario, el orden y lo que falta están en `docs/PLAN_I18N.md`; acá está lo que existe.

**El texto vive donde ya vivían las opciones.** `data/catalogo-frases.json` es hermano de los seis
catálogos que ya había y lo lee el mismo `js/catalogo.js`. La pantalla nombra y el catálogo
contesta, que es exactamente el reparto que ya regía para los desplegables:

```html
<button data-frase="acceso.entrar">Entrar</button>
```

Lo escrito adentro no se borra: es lo que se ve mientras el archivo viaja, y lo que queda si el
archivo no llega. **Una pantalla nunca aparece vacía**, ni el instante que tarda.

Son tres marcas y hacen tres cosas distintas: `data-frase` cambia lo que se lee adentro del
elemento, `data-frase-<atributo>` cambia un atributo —`placeholder`, `aria-label`, `title`—, y
`data-huecos` trae lo que va adentro de los huecos. **La frase se rellena entera y no se arma con
pedazos**: «Al menos 8 caracteres» pegado con un `+` sale mal en portugués y en inglés, que ordenan
distinto, así que el número entra en `{cuantos}` y cada idioma lo pone donde le corresponda.

**Lo que arma el código se marca igual.** El botón de ver la contraseña no está escrito en ninguna
pantalla —lo fabrica `js/clave.js`—, así que lleva sus `data-frase` puestos desde el código y pide
`Catalogo.traducir(elemento)` cuando ya existe. Eso no es prolijidad: **un texto escrito a mano se
queda en el idioma en que nació**. Se vio en `acceso.html`, donde el aviso de la Prestadora
desconocida seguía en castellano después de cambiar a portugués, con la pantalla entera ya
traducida alrededor. Ahora `avisar()` recibe la clave y no la frase, y el cartel cambia con todo lo
demás.

**El sello del pie fue el caso que mostró el borde de esto.** Decía «Powered by» escrito adentro
de `js/apiClient.js`, en las tres copias, y era el segundo texto más repetido de todo el proyecto.
Mudarlo al catálogo no alcanzaba con ponerle un `data-frase` al sello: **el catálogo traduce
escribiendo el texto entero del elemento marcado**, y ahí adentro también vive el nombre de la
Prestadora, que no se traduce nunca. Así que se partió en dos —el rótulo en su propio `<span>` con
la clave `pie.sello_producto`, el nombre al lado— y el sello pide `Catalogo.traducir()` cuando ya
está armado, porque nace después de que la pantalla se tradujo (`js/apiClient.js:160`). Es la misma
regla que `despejar()` deja escrita en `scripts/texto_visible.mjs:87`: **un elemento convertido
lleva texto y nada más**. Probado en las tres: «Con la tecnología de», «Powered by» y «Com a
tecnologia de», con el nombre intacto al lado en las tres.

**Los mensajes de error se partieron en dos**, que era la única forma de que se pudieran traducir.
`Texto.claveDeError()` mira la falla y decide **de qué se trata**, que es lógica y se queda en
`js/texto.js`; la frase que se lee sale del catálogo, porque un mensaje de error es texto visible.
De paso quedó comprobable: una prueba que le pasa un error y espera una clave no se rompe el día
que alguien mejora la redacción.

**El idioma se decide en un solo lugar.** `idiomaDelEntorno()`, en este orden: `?idioma=` en la
dirección, lo guardado de la vez anterior, lo que declara el navegador. `es-419` y `pt-PT` caen en
`es-AR` y `pt-BR` por la raíz y no por una lista escrita a mano. `Catalogo.cambiarIdioma()` reescribe
la pantalla sin recargarla. **Falta el selector visible**: dónde va en el encabezado de catorce
pantallas es una decisión de diseño, y ésas se consultan.

**El chequeo es lo que impide que esto se deshaga.** `scripts/verificar_frases.mjs` corre antes de
cada `commit` con cinco reglas —la clave existe, tiene los tres idiomas, ninguna sobra, ninguna
pantalla ya convertida volvió a tener texto a mano, y las cinco frases de emergencia no están
duplicadas— y ve también las claves que pone el código, no sólo las escritas en el HTML. Dice
además cuánto falta: el día que se escribió esto, **4 de 45 archivos**. La cuenta de hoy está
más abajo, en la sección de la segunda tanda.

**El singular y el plural son dos frases, no una con un pedazo cambiado.** «Rendida 3 veces» no se
arma pegando «Rendida», el número y «veces»: cada idioma arma su oración y elige su plural, y hay
idiomas que ni siquiera tienen las mismas dos formas. Así que hay `examen.rendida_una` y
`examen.rendida_varias`, el número entra en un hueco, y el guion elige cuál de las dos pedir. En
`examen.html` son ocho pares, que es la pantalla donde apareció el caso por primera vez.

**Quién decide qué contraseña vale, y quién decide cómo se lo dice, son dos cosas distintas.**
`Clave.revisar()` (`js/clave.js:70`) sigue siendo el único lugar del proyecto que sabe cuándo una
contraseña no sirve, pero ya no devuelve la frase: devuelve **la clave** de la frase y lo que va en
sus huecos —`{ clave: 'clave.corta', huecos: { cuantos: 8 } }`—, con la misma forma que espera el
`avisar()` de las tres pantallas de la sesión, así que el resultado se pasa entero. Es el mismo
reparto que ya se había hecho con los mensajes de error, y por el mismo motivo: un aviso de
contraseña es texto visible. De paso el largo mínimo dejó de estar escrito dos veces —lo dice
únicamente la indicación que `js/clave.js` le pone al campo, y ninguna pantalla lo repite.

**Un cartel que se abre solo no puede pedir la frase sin esperarla.** `Catalogo.frase()` está hecha
para llamarse mientras se dibuja y por eso no espera nada; si el catálogo todavía viaja, devuelve
vacío. En `nueva-clave.html` eso se veía: el aviso del enlace vencido es el único que se abre
apenas carga la pantalla, y salía el error genérico en vez de decir que el enlace había vencido. Lo
que se abre solo pide ahora `Catalogo.traducir(caja)`, que sí espera, y recién si después quedó
vacío se pone lo genérico. En `acceso.html` el mismo error estaba escrito y no se veía nunca,
porque ahí los carteles los abre la persona. **Los 16 chequeos no lo veían**: apareció mirando la
consola del navegador.

**Dos fallas de verdad aparecieron al probar con el archivo escondido**, que es la prueba que sí
podía fallar. `acceso.html` confundía un catálogo que no llegaba con un servidor caído: mostraba
«no se pudo conectar» y escondía el formulario, cuando se podía entrar igual. Y `lang` se ponía
antes de que el texto llegara, así que declaraba inglés sobre contenido en castellano y un lector
de pantalla lo habría pronunciado mal. `lang` describe lo que está escrito, no lo que se pidió.

**Y dos chequeos aprendieron a distinguir el idioma el mismo día.** `verificar_trato.mjs` marcó
«publicá-lo», que en portugués es lo normal, como si fuera un voseo; y «cuidador», que en portugués
es la palabra correcta, es justo la que el vocabulario prohíbe en castellano. `soloCastellano()`,
en `scripts/texto_visible.mjs`, deja fuera lo rotulado `en` y `pt-BR` **por la clave y no por las
palabras**, que es la única forma de saberlo con certeza. Los chequeos que valen para los tres
idiomas siguen viendo todo.

### Las cajas fuertes se reconocen por lo que dicen, no por cómo se escriben

`scripts/recorrido.mjs` es por donde pasan todos los chequeos para leer archivos, y era también
donde se hacía cumplir la regla de `F:\proyectos\CLAUDE.md`: una carpeta que anuncia que guarda
claves no se abre, no se lista y no se cita. **Lo hacía comparando el nombre exacto**, así que
alcanzaba justo para las cinco carpetas que existían el día que se escribió la lista: una llamada
`no-commit`, `NoCommit` o `No Commit` —el mismo pedido, otra tipografía— se habría recorrido y
leído entera. Una regla de seguridad que depende de acertar la mayúscula no es una regla.

Ahora el nombre se compara desnudo: se separan las palabras pegadas en mayúscula y se borra todo lo
que no sea una letra, así que diecisiete formas de escribir lo mismo son la misma puerta cerrada.
Lo que no es secreto sino ruido —`node_modules`, `.git`, `fuera de uso`— se sigue nombrando tal
cual, porque lo escribe una herramienta y lo escribe siempre igual.

`scripts/verificar_cajas.mjs` lo comprueba, y **lo comprueba de las dos puntas**: arma un árbol de
mentira en la carpeta temporal del sistema, con las diecisiete formas y seis carpetas parecidas que
sí tienen que leerse —`comisiones`, `pushear-ahora`—, y falla tanto si se abrió una cerrada como si
se cerró una abierta. Una regla que cierra de más deja de revisar código de verdad y tampoco avisa.
Las carpetas se fabrican en vez de buscarse a propósito: acá no hay ninguna caja fuerte, así que un
chequeo que sólo mirara este proyecto pasaría siempre sin probar nada. Se comprobó volviendo a la
comparación exacta: el chequeo falló con catorce avisos.


### Los permisos de la base se midieron en vivo, y no en los archivos

Hasta el 26 de agosto de 2026 todo lo que se sabía de la seguridad de la base salía de leer las
migraciones. Eso es historial de intención: dice qué se quiso, no qué quedó. Esa noche se trajo el
esquema real del servidor con `supabase db dump --linked --schema public` —que no pide contraseña
porque la línea de comandos ya está enlazada— y se revisó contra él. **Y esa medición dejó de ser
de una sola vez:** quedó escrita como `scripts/probar_permisos_en_vivo.mjs`, que la repite cuando se
la llame, contra la base enlazada o contra la local con `--local`. Hoy da cuatro comprobaciones
en rojo —que son el pendiente 67— y una en verde, que es la que las contiene: las 34 políticas
piden sesión. Se corre a mano y no entra en los veintiún chequeos del `commit`, porque necesita
hablar con la base. **Aparecieron dos agujeros,
que quedaron como pendientes 66 y 67, y siete cosas que están bien.** Se anotan las siete para que
nadie las vuelva a investigar:

- **Las 24 tablas tienen la RLS encendida.** Ninguna quedó afuera, y se comparó tabla por tabla
  contra la lista de las que la encienden, no por muestreo.
- **Ninguna política se alcanza sin sesión.** Las 34 son `to authenticated`. O sea que un visitante
  sin cuenta no llega a ninguna tabla, y todo lo público del producto pasa por otra puerta.
- **Esa otra puerta son tres funciones, y son exactamente las tres previstas**: `directorio_de`,
  `perfil_del_directorio` y `prestadora_por_slug`. De las once funciones que se saltean la RLS, las
  otras ocho están fuera del alcance anónimo. Son once y no trece: el chequeo del esquema informa
  trece porque cuenta declaraciones en las migraciones, y `crear_perfil_al_registrarse` y
  `alta_de_prestadora` están declaradas más de una vez. La cuarta que figura concedida a `anon` es
  `la_ponderacion_suma_cien`, que devuelve `trigger`: Postgres se niega a llamarla de otro modo que
  como disparador, así que el permiso sobra pero no abre nada.
- **`opciones_pregunta` tiene la RLS encendida y ni una política**, que es la forma correcta de
  sellar una tabla: no la lee nadie con sesión, y la respuesta correcta sale únicamente por la
  vista `opciones_para_responder`, que no la trae. La vista lleva escrito al lado que esa columna
  no se agrega nunca.
- **La vista del directorio no la puede consultar nadie de forma directa.** Ni `anon` ni
  `authenticated` tienen consulta sobre `directorio`: la migración 0021 se la revocó a los
  dos, y en vivo sigue revocada. Importa porque la vista no es `security_invoker`, así que corre con
  los permisos de quien la creó y se saltearía el aislamiento entre Prestadoras; lo que la contiene
  es que sólo la leen las tres funciones, y las tres piden el nombre corto de una Prestadora.
- **La vista `caregivers_publicos` ya no existe.** La borraron las migraciones 0007 y 0012. Quedan
  dos comentarios de tabla que todavía la nombran —en `autorizaciones_asistente` y en
  `referencias_asistente`—, que es documentación vieja adentro de la base y no un permiso abierto.
- **El camino de las verificaciones está protegido de punta a punta.** Lo que el directorio publica
  como comprobado sale de `verificaciones_asistente` y de `intentos_evaluacion`, y de las dos el
  Asistente tiene sola lectura. Ninguna de las dos se puede falsificar desde una sesión. El agujero
  del pendiente 66 no está en la evidencia sino en el veredicto que la resume.

**Y el del 66 se ejecutó esa misma noche, contra la base local y con una cuenta inventada.**
Hasta ahí salía de leer el texto de las políticas; con las 27 migraciones aplicadas se hizo el
intento entero, y salió peor de lo que decía el papel: el legajo se puede **crear ya sellado**
—el `POST` con `verification_status` adentro contesta `201` y el valor queda—, o sea que ni
hace falta modificarlo después; el sello se baja y se vuelve a subir cuantas veces se quiera; y
la persona **apareció en el directorio público**, pedido sin ninguna sesión. Lo ficticio se borró
al terminar. **La prueba puede fallar:** la misma cuenta, en la misma corrida, intentó mudar su
legajo a la Prestadora ajena y recibió `403`. Y quedó a la vista un cruce con el pendiente 70: la
tarjeta del intruso salió con la lista `comprobaciones` vacía, que es lo mismo que muestra hoy la
de cualquiera, porque ninguna pantalla carga esas comprobaciones. **La única señal que habría
distinguido un legajo revisado de uno auto-sellado hoy no distingue nada.**

**Los dos depósitos de archivos también se midieron, y esa prueba sí se pudo hacer entera.**
Se pidieron las dos direcciones públicas contra el servidor real: `avatares` contesta «objeto no
encontrado», o sea que el depósito está ahí y es público; `documentos-cuidadores` contesta
«depósito no encontrado», o sea que por la puerta pública no existe. **Cada uno es el control del
otro**: si el privado se hubiera quedado público —que es lo que pasa cuando alguien lo crea a mano
desde el tablero—, habría contestado igual que el primero. En el esquema de depósitos, en vivo,
están las tres políticas que declaró la migración 0006, y ninguna más. La que le deja al personal
de la Prestadora mirar los papeles de su gente compara la Organización con un `join` contra el
legajo, así que el aislamiento no depende del camino del archivo.

**Y de ahí sale algo que este producto no puede contestar solo**: la regla de la empresa dice que
los archivos no se sirven nunca con dirección pública y que la ruta empieza por la Organización, y
acá la foto del directorio es pública —porque el directorio se ve sin sesión— y la ruta empieza
por la cuenta. Las dos cosas están razonadas por escrito en la migración que las creó, así que no
son un olvido; lo que falta es que la regla y el producto digan lo mismo. Quedó anotado como punto
10 de `celtatech\\docs\\SUGERENCIAS_DESDE_EL_MARKETPLACE.md`, que es donde va lo que decide la
empresa.

**Y hay una prueba que este barrido no pudo hacer, que conviene decir en vez de dejarla implícita:**
no se ejecutó ninguna operación con una sesión de Asistente de verdad, porque esa cuenta todavía no
existe (pendientes 45 y 47). Todo lo de arriba sale del texto de las políticas y de los permisos
leídos de la base en vivo. Es mucho más que leer las migraciones y es menos que haberlo intentado.

### El catálogo dejó de decir dónde se lo usa, y pasó a calcularlo

Cada uno de los veinticuatro vocabularios de `data/catalogo-vocabularios.json` lleva una lista
`usado_en` que dice en qué pantalla y en qué renglón se lo usa. Se medió contra los archivos
reales: **de las 36 citas con renglón, acertaba una** —la de `motivo_consulta` en
`soporte-remoto.html`—, y una apuntaba al renglón 510 de un archivo que tiene 486. No fue
descuido de nadie. Esa lista se mantenía a mano y el marcado se mueve todos los días; y
`scripts/verificar_referencias.mjs`, que es el que comprueba que toda cita apunte a algo, mira los
trece documentos de `docs/` y no entra en `data/`. Por eso pasaron dieciséis chequeos sin que
nadie las mirara.

**Se cambió el sentido de la lista: en vez de escribirse, se calcula.** El chequeo nuevo es
`scripts/verificar_usos.mjs`, y con `--escribir` rehace la lista y vuelve a copiar el archivo a
las dos aplicaciones, así `copias` sigue en verde. Sin esa opción sólo compara, en los dos
sentidos: cada cita tiene que apuntar a un renglón donde el vocabulario se nombre, y cada lugar
donde se lo nombra tiene que estar en la cita.

**Un vocabulario llega a la pantalla por seis puertas, y todas se declaran.** `data-catalogo="X"`
en el marcado; `data-campo="algo@X"`, que es lo mismo dicho desde la declaración de un campo;
`"vocabulario": "X"` en `data/catalogo-fichas.json`, que es como las fichas del legajo declaran
los suyos; `"filas"` y `"columnas"` en `data/catalogo-disponibilidad.json`, de donde la grilla saca
los días y los turnos; `Catalogo.items('X')` y `Catalogo.etiquetaSiExiste('X', …)`, que son las dos
puertas del catálogo que reciben el nombre; y la lista que recorre `etiquetaDeTarea` en
`js/catalogo.js:422`, que busca una tarea en tres vocabularios seguidos.

**Y lo que no cuenta importa igual que lo que cuenta.** Que el nombre aparezca entre comillas no
alcanza: `genero`, `zona`, `frecuencia` y `patologia` son además nombres de columna de la base.
`input[name="patologia"]` y `elegidas('tarea_cuidado')` **leen de vuelta** lo que el catálogo ya
dibujó, así que contarlos sería contar dos veces el mismo lugar. Y el encabezado de
`js/catalogo.js` trae `data-catalogo="genero"` escrito adentro de un comentario, como ejemplo: por
eso esa forma se busca sólo en los `.html`. Las copias tampoco se citan — un portador que aparece
en una copia se le atribuye a su original, que es donde hay que ir a tocarlo, y la lista de copias
sale de `scripts/verificar_copias.mjs`, que pasó a exportarla para no tener dos listas.

**La prueba de que el chequeo mira.** Se corrió **antes** de arreglar nada, y encontró las 35
citas falsas, que es lo que pedía la condición de cierre. Después, con la lista ya calculada y el
chequeo en verde, se metió un renglón vacío arriba del `data-catalogo="patologia"` de
`directorio.html:83` — o sea, se corrió todo lo de abajo un renglón. El chequeo se puso rojo y
nombró los cinco vocabularios afectados, diciendo de cada uno el renglón viejo y el nuevo. Se
restauró el archivo y volvió al verde. Un chequeo que no se prueba así puede estar mirando cero
archivos y decir que sí.

**Quedan 69 citas de 24 vocabularios, cada una en el renglón que dice, y son dieciocho
chequeos.** Y salió una corrección de la primera medición, que conviene decir porque estaba
escrita en `docs/PENDIENTES.md`: los vocabularios que no usa nadie no son cinco, son dos
—`verificacion` y `discapacidad`—. `tarea_hogar`, `tarea_acompanamiento` y `puesto_experiencia` sí
se usan, desde `data/catalogo-fichas.json`, que la primera pasada no miraba. Los dos que quedan el
chequeo los informa y no rompe: que sobren o que falte la pantalla que los iba a pedir es una
decisión, no un defecto.


### La Prestadora de ejemplo estaba escrita a mano en cada pantalla

Este producto se muestra con el nombre y el logotipo de la Prestadora que se esté mirando: cuál es
sale de la dirección —`?t=` o subdominio— y se busca en la base, o sea que se sabe **después** de
que la pantalla ya se dibujó. Escribir el nombre de una Prestadora adentro de una pantalla la deja
bien para esa sola; cualquier otra ve un cartel con el nombre de una empresa que no es la suya.

**Y estaba escrito.** Medido el 26 de agosto de 2026: la Prestadora de ejemplo aparecía **70 veces
en dieciocho archivos** —nueve títulos de pantalla, dos descripciones para los buscadores, cinco
avisos de derechos reservados, el texto que dice de quién es la responsabilidad de un aval, y
veinte rutas del archivo del logotipo—. El guion de marca corregía al cargar los nombres y los
logotipos que colgaban de un encabezado o de un pie, y nada más: el título de la pantalla, la
descripción para los buscadores, el texto de la imagen y los textos corridos no los tocaba nadie.
Esos se publicaban con el nombre de la Prestadora de ejemplo **para todo el mundo**, incluida la
descripción con la que la pantalla aparece en un buscador.

**Cómo se escribe ahora.** La pantalla dice **dónde** va el nombre, con el marcador
`{{organizacion}}`, y `js/identidad.js` lo resuelve dos veces. La primera, al dibujar, valiendo el
nombre del producto (`js/identidad.js:62`); la segunda, cuando la Prestadora llega, con el suyo
(`js/identidad.js:150`, que llama `js/apiClient.js:158`). Mostrar el producto mientras la
Prestadora no se sabe no es un respaldo inventado para tapar un hueco: **sin Prestadora resuelta,
la pantalla es del producto**, así que lo que se ve es cierto en los dos momentos. No hay marcador
roto en la pantalla ni relleno neutro, y no hay ninguna Prestadora haciendo de valor por defecto
de todas las demás.

Resolver dos veces obliga a acordarse de dónde estaba cada marcador, porque una vez reemplazado ya
no está en la pantalla para volver a buscarlo. El paseo anota cada lugar junto con su texto
original (`js/identidad.js:78`) y la segunda vuelta trabaja sobre esa anotación.

**El nombre por selector se borró, no se dejó al lado.** `_applyBranding` escribía el nombre
buscando tres clases de CSS; eso es la misma decisión en dos lugares, y el marcador la hace mejor
—alcanza al título, a la descripción y a los textos corridos, que no tienen ninguna clase que los
distinga—. Quedó una sola forma de escribir el nombre. El logotipo sigue cambiándose por selector,
porque es una imagen y no un texto, pero su respaldo pasó a ser el del producto.

**De paso apareció un error de etiqueta:** `panel-prestadora.html:25` decía «Organización» y
mostraba el nombre **del producto** en el lugar donde va el de la Organización.

**El chequeo que lo sostiene.** `scripts/verificar_organizacion.mjs` es el dieciocho, y mira dos
cosas, cada una contra su punto único de verdad: que ningún nombre de Prestadora esté escrito en
el marcado, los guiones ni los estilos —y la lista de Prestadoras no está escrita adentro del
chequeo, sale de `supabase/migrations/`, de las altas y de los cambios de nombre posteriores,
`scripts/verificar_organizacion.mjs:76`—, y
que la única ruta de logotipo que se escriba sea la que declara `js/identidad.js`. Si ninguna
migración carga una Prestadora con nombre, el chequeo **falla** en vez de pasar en verde sobre una
lista vacía (`scripts/verificar_organizacion.mjs:111`).

**Se probó que puede fallar**, que es la regla de que una prueba que no puede fallar no prueba
nada. Se rompieron las dos reglas a propósito: se escribió el nombre de una de las Prestadoras del
seed en una pantalla y se restauró la ruta vieja del logotipo. Rojo las dos veces, nombrando
archivo y renglón. Se deshizo, y volvió el verde.

**Y el mecanismo se probó en un navegador de verdad, que es lo que encontró el defecto.** Ningún
chequeo estático lo hubiera visto: el título de la pantalla no se volvía a resolver.
`document.title = x` **reemplaza el nodo de texto** de `<title>`, así que el nodo anotado en la
primera vuelta quedaba huérfano y escribirle no hacía nada. Se arregló guardando el título antes
de tocar nada y salteando `<title>` en el paseo de textos (`js/identidad.js:112` y
`js/identidad.js:118`). Con eso, en el navegador: título, pie, descripción para los buscadores y
texto de la imagen pasan de «Careonys» a la Prestadora y vuelven.

**Probado de punta a punta contra la base publicada**, con las dos Prestadoras de ejemplo:
`directorio.html?t=presdemo` y `?t=cuidarnorte` resuelven cada una su nombre, su logotipo y su
color, y las dos pantallas se ven distintas entre sí y distintas del producto. Sin `?t=`, y en las
tres pantallas que no cargan el cliente de datos, se ve el producto, que es lo correcto.

En el camino se aclararon dos cosas que parecían defectos y no lo son. La base contesta `42501
permission denied` a quien le pida filas de `tenants` sin sesión, **y eso está bien**: desde la
migración 0021 la lista de Prestadoras no la ve nadie, porque es la lista de clientes de CeltaTech.
La pantalla no la pide: llama a `prestadora_por_slug`, que exige el nombre corto y devuelve una
sola Prestadora con sus colores y su logotipo (`js/apiClient.js:97`). Y la portada no cambia de
marca porque no carga el cliente de datos —tampoco `cursos.html` ni `soporte-remoto.html`—, así que
en esas tres el marcador se queda en el nombre del producto y no hay nada que resolver.

**Y apareció algo que no se estaba buscando: la base publicada no es la que arman las
migraciones.** PresDemo se llama ahí «PresDemo — Servicios de Cuidado» y tiene cargado su logotipo;
la migración que la crea la carga con el nombre «PresDemo» y sin logotipo, y ninguna migración
escribe ninguna de las dos cosas. O sea que se pusieron a mano contra la base. Reconstruirla desde
cero daba una base distinta de la que está publicada. **Conviene decir de dónde salió**: se llegó
ahí por haber dado por cierto lo que decían las migraciones en vez de preguntarle a la base, que
es exactamente lo que la regla «el estado real está por encima del documentado» viene a evitar. El
diagnóstico escrito el mismo día —«la Prestadora de ejemplo no tiene logotipo»— era falso para
PresDemo y verdadero para Cuidar Norte. Se arregló el mismo día, y cómo se hizo está más abajo.

**Tres cosas se hicieron distinto de como decía el plan** que había escrito para esto, y por eso
se anotan antes de borrarlo:

1. **Un marcador, no tres.** El plan proponía `{{prestadora}}`, `{{prestadoraLogo}}` y
   `{{prestadoraColor}}`, con un segundo motor de marcadores adentro de `_applyBranding`. Un
   marcador solo, viviendo en el motor que ya existía, evita tener dos mecanismos que hacen lo
   mismo. El logotipo y el color no necesitan marcador: ya se resolvían por selector y por
   variable de CSS.
2. **Una tercera respuesta a qué se muestra mientras la Prestadora no se sabe.** El plan daba dos
   —dejar el marcador a la vista, o poner un texto neutro—. Ninguna de las dos dice la verdad; el
   nombre del producto sí.
3. **El respaldo del logotipo es el del producto.** El plan pedía sacar del repositorio el
   logotipo de la Prestadora de ejemplo. Se dejó, porque es de ella y la base puede apuntarlo,
   pero dejó de ser el respaldo de todas.

### La base publicada volvió a ser la que arman las migraciones

El desvío se arregló el mismo 26 de agosto de 2026, y arreglarlo empezó por medirlo bien. Las dos
columnas que se habían mirado a ojo eran las dos que se encontraron: **mirar a ojo es lo que dejó
pasar el desvío la primera vez**. Así que se hizo al revés: se reconstruyó una base local desde
cero con todas las migraciones, se volcaron las dos del mismo modo y se compararon fila por fila y
columna por columna.

**De ahí salieron tres clases de diferencia, y sólo una era un desvío.**

1. **La fila de la Prestadora de ejemplo.** Nombre, descripción y logotipo escritos a mano contra
   la base. Es el desvío, y ahora lo escribe
   `supabase/migrations/0029_la_prestadora_de_ejemplo_dice_lo_mismo_en_las_dos_bases.sql`, **sin
   condición**. La migración anterior escribía el logotipo sólo `where logo_url is null`, y contra
   la base publicada eso no hizo nada, porque el valor ya estaba puesto: una migración que no corre
   justo donde hace falta no arregla nada. Entre los dos textos ganó el de la base publicada, que
   es el que ya se había demostrado funcionando, con una corrección: su descripción decía
   «plataforma», que el glosario de la empresa no admite para nombrar una unidad vendible.
2. **Los identificadores y las fechas.** Cada base genera los suyos. No es un desvío y no hay nada
   que escribir.
3. **Once filas que están publicadas y ninguna migración carga.** Cinco son perfiles, y están
   bien: cuelgan de una cuenta de acceso, las crea el disparador de la migración 0005 al
   registrarse alguien, y una base recién construida no tiene cuentas. Las otras seis son legajos
   cargados a mano probando pantallas, tres de ellos la misma persona inventada repetida y uno con
   todos sus datos vacíos. Se ven en el directorio de la demostración. Borrarlos es pisar datos,
   así que lo decide el Desarrollador: quedó como pendiente 81.

**Y se dejó hecho lo que hace falta para que la próxima vez no dependa de la casualidad.** El
desvío no lo denunció nada: se encontró mirando otra cosa. Ahora `scripts/comparar_bases.mjs` hace
esa comparación entera y sola, y reparte lo que encuentra en esas mismas tres clases: rompe con las
dos primeras y muestra la tercera para que la mire una persona, porque un guion no puede saber si
una fila de más es un desvío o alguien que usó el producto. No entra en los chequeos del `commit`,
que corren sin red. **Se probó que puede fallar**: contra el volcado de antes de la migración
denuncia exactamente las tres columnas corridas, con lo que decía cada base; contra el de después,
ninguna.

El chequeo de organización también quedaba corto: armaba su lista de nombres prohibidos leyendo
sólo las altas, así que el nombre nuevo de una Prestadora renombrada por una migración posterior
—justamente el nombre con el que hoy se la ve— era el único que ninguna pantalla tenía prohibido
escribir. Ahora lee las altas y los cambios de nombre
(`scripts/verificar_organizacion.mjs:76`). Probado igual: escrito a mano en una pantalla, el nombre
nuevo la pone en rojo y nombra la migración que lo escribe.

De paso viajaron dos comentarios de tabla que seguían nombrando `caregivers_publicos`, una vista
que se llama `directorio` desde la migración 0015. No eran un desvío —estaban igual en las
dos bases, porque salen de las migraciones—, era texto que ya no describía lo que hay.


### Las dos bases dicen lo mismo sin excepciones, y las sobras se fueron

Cuando `scripts/comparar_bases.mjs` empezó a comparar las dos bases fila por fila, quedaron once
que están publicadas y ninguna migración carga. En ese momento se anotaron como pendiente y se
dejó la decisión al Desarrollador, porque borrar es pisar datos. La decisión llegó el 26 de agosto
de 2026, y fue que se vayan las once: **aunque sean ficticios, los datos tienen que ser coherentes
y las bases no pueden estar desprolijas.**

Y no era un problema estético. Esas filas se ven: el directorio de la Organización de pruebas
—que es justamente lo que se le muestra a un cliente en una demostración— mostraba tres veces la
misma persona inventada, un legajo con el nombre, el documento, el teléfono y el correo todos
vacíos, y un correo con el nombre anterior del producto adentro.

**De paso se corrigió una afirmación que este documento traía mal, y después hubo que corregir la
corrección.** El pendiente decía que los cinco perfiles «estaban bien», porque los crea al
registrarse alguien el disparador de la migración 0005. Contra eso se escribió acá que `profiles`
no tenía ninguna clave foránea hacia `auth.users`, así que una fila ahí no probaba que hubiera una
cuenta detrás. **Eso es falso.** El 26 de agosto de 2026, probando otra cosa contra la base local,
un `insert` en `profiles` con un identificador inventado lo rechazó `profiles_id_fkey`, que existe
desde la primera migración, apunta a `auth.users(id)` y borra en cascada
(`supabase/migrations/0001_esquema_inicial.sql:252`). O sea que cada uno de los cinco perfiles
tuvo su cuenta de acceso: sin ella la fila no podía existir.

Lo que sigue en pie es lo otro: tres de los cinco tienen identificador escrito a mano —unos, dos y
tres repetidos—, que ninguna alta genera, y los otros dos se cargaron al mismo microsegundo. Con
la clave foránea a la vista eso significa que **también las cuentas de acceso se escribieron a
mano**, porque una fila de `profiles` con ese identificador exige una de `auth.users` con el
mismo. Lo que no resuelve es si las otras dos nacieron de un registro de verdad; y da igual, porque
el Desarrollador ya había dicho lo que decide: son datos inventados y se van.

Las borra `supabase/migrations/0031_se_van_las_sobras_de_la_base_publicada.sql`, que **nombra una
por una las once** en su encabezado, para que quede el rastro de qué había cuando ya no se pueda
mirar. Doce tablas apuntan a un legajo, así que primero se va lo que cuelga y recién después el
legajo. El borrado va por identificador y no por una condición del tipo «lo que no cargó ninguna
migración»: una condición así se lleva puesto también lo que cargue alguien mañana usando el
producto. En la base local la migración no hace nada, porque ninguno de esos once identificadores
existe en una base recién construida — que es exactamente de lo que se trata.

**Comprobado corriendo la comparación después:** ya no lista ninguna fila de más. Lo único que
sigue difiriendo son las fechas que cada base se pone al construirse, que el guion cuenta y dice
en voz alta en vez de esconder.

### La dirección pública volvió a servir lo que hay publicado

Durante días el sitio `careonys-marketplace.vercel.app` mostró el producto de veintiún días
antes: el directorio con las ocho tarjetas inventadas escritas a mano, la portada titulada
«PrestDemo» y tuteando, y `data/catalogo-frases.json` —subido esa misma semana— contestando 404.
No era memoria del navegador: se pidió con `curl` y sin caché y contestaba lo viejo.

**La causa no era ninguna de las que se sospecharon.** No era que el dominio estuviera colgado de
otra cuenta, y no era que los despliegues no llegaran: llegaban todos, uno por cada `push`, el
último a los quince segundos. **Llegaban y quedaban bloqueados antes de empezar a construir** —
veinte seguidos, con estado `UNKNOWN` en la línea de comandos y «Obstruido» en el tablero. El
motivo lo decía Vercel adentro del despliegue bloqueado: *el autor de la confirmación no tenía
acceso de contribución al proyecto*, y debajo, que el plan Hobby no admite colaboración en
repositorios privados.

Encajaba todo: el repositorio es privado, la cuenta de Vercel es la de CeltaTech, y los commits
venían firmados con el correo personal del Desarrollador, que GitHub atribuye a otra cuenta. Para
Vercel eso es un colaborador, y en Hobby un colaborador no despliega un repositorio privado.

**Se arregló haciendo que este repositorio firme como CeltaTech**, con `git config user.email`
puesto sólo en esta carpeta. De las cuatro salidas posibles es la única que no cuesta plata ni
obliga a hacer público el código; las otras tres eran pagar el plan Pro, abrir el repositorio, o
mudar el correo personal a la cuenta de GitHub de CeltaTech, que además obliga a sacarlo antes de
la otra cuenta porque GitHub no admite el mismo correo en dos.

**Comprobado el 26 de agosto de 2026**, con el primer `push` firmado así: el despliegue pasó a
`Ready` en cuatro segundos, y la dirección pública contesta lo nuevo por tres señales
independientes —`data/catalogo-frases.json` pasó de 404 a 200, la portada ya no trae ninguna de
las ocho tarjetas escritas a mano, y no tutea en ninguna parte—. El título que entrega es
`{{organizacion}}` en crudo, que es lo esperado y lo que describe el pendiente 79: el marcador lo
resuelve el navegador, así que lo que el servidor manda todavía lo trae sin resolver.

### Cada Prestadora ficticia tiene ahora sus Familias y sus Asistentes

Las dos Prestadoras de ejemplo estaban desparejas y a medio llenar. PresDemo tenía seis
Asistentes y Cuidar Norte tres; cada una tenía **un** aviso, y ese aviso tenía nueve columnas
vacías, entre ellas la de contacto, que es la única forma que tiene este producto de saber que
detrás hay una Familia. Y había seis tablas con cero filas: las cuatro que guardan lo que un
legajo muestra por dentro —estudios, matrículas, experiencia y referencias— y las dos de franjas
horarias, la del Asistente y la del aviso.

**Cero filas no es un dato menor: es una prueba que no puede fallar.** Una pantalla que lee de
una tabla vacía se ve exactamente igual esté bien o esté rota, y la demostración muestra un
legajo sin nada adentro sin que nada avise por qué. Lo mismo con el cruce entre lo que un
Asistente puede y lo que un aviso necesita: con las dos tablas vacías, la consulta devuelve
vacío siempre, y eso no distingue «no hay coincidencias» de «la consulta está mal escrita».

Lo pidió el Desarrollador el 26 de agosto de 2026: cinco o seis Familias y cinco o seis
Asistentes en cada Prestadora ficticia, porque es mejor para probar y para mostrarle el producto
a un cliente. Lo escribe
`supabase/migrations/0030_cada_prestadora_ficticia_con_sus_familias_y_sus_asistentes.sql`, y así
quedaron las dos:

| | Asistentes | Validados | En el directorio | Familias |
|---|---|---|---|---|
| **PresDemo** | 6 | 5 | 4 | 6 |
| **Cuidar Norte** | 6 | 5 | 5 | 6 |

**Los números de las dos no coinciden a propósito.** El directorio público devuelve nueve, que es
cuatro más cinco: si alguna pantalla mezclara las dos Prestadoras, el número cantaría solo. Con
dos columnas iguales, mezclarlas se ve igual que no mezclarlas.

**Cada Prestadora quedó además con los casos que hacen falta para probar**, no con seis filas
iguales: un Asistente `en_revision` que no está publicado, uno validado que eligió no publicarse,
uno que acepta reemplazos urgentes, y una verificación en estado `presentado` —el papel llegó,
nadie lo miró todavía— al lado de las que están `verificado`. Un directorio donde todos están en
el mismo estado no prueba que el estado se respete.

**Y el cruce que motivó llenar las dos tablas de franjas ahora devuelve filas.** Hay dos
coincidencias puestas a mano, una en cada Prestadora: el aviso de San Isidro pide martes y jueves
a la mañana y Omar Zabala Ficticio está justo ahí con esas dos franjas; el de Ramos Mejía pide
lunes a la mañana y jueves a la tarde, y Lorena Maidana Ficticia tiene las dos. Cruzando zona y
franja la consulta devuelve esas dos filas y ninguna otra.

**Tres cosas que la migración deliberadamente no hace, y por qué.**

1. **Ninguna Familia tiene cuenta para entrar.** En este producto una Familia no tiene tabla:
   existe porque publicó un aviso, y lo que se sabe de ella es el contacto que dejó ahí. La
   columna que la ataría a una cuenta apunta a `auth.users`, y crear cuentas desde una migración
   significa escribir una contraseña adentro del repositorio, que es exactamente lo que prohíbe
   la regla de credenciales de la empresa. Los avisos quedan sin cuenta, que es el caso que la
   migración 0020 ya había previsto: son los que ve el personal de la Prestadora.
2. **Los avisos nuevos no dicen `schedule_type`.** Esa columna no tiene vocabulario —es el
   pendiente 31— y hoy cada lugar que la escribe usa una forma distinta. Escribir una quinta
   forma empeora el problema en vez de arreglarlo, así que el horario va donde sí tiene
   vocabulario: en las franjas del aviso, con `dia_semana` y `turno`.
3. **Ningún estado de aviso nuevo.** Todos quedan `activa`. Inventar un estado sería inventar
   una palabra de negocio sin aprobarla.

Todos los datos son inventados y se nota a propósito: los documentos son de la serie 90.000.000,
los teléfonos empiezan en 5000 o 6000, los correos terminan en un dominio que no existe, los
apellidos terminan en «Ficticia» o «Ficticio», los pacientes se llaman «Paciente de Ejemplo» y
las referencias «Referencia Inventada».

### El chequeo de claves no veía la mitad de las migraciones nuevas

Al escribir la 0030 apareció que `scripts/verificar_claves.mjs` —el que comprueba que ninguna
migración escriba un valor que no esté en el catálogo de vocabularios— estaba mirando una sola
de las dos formas de cargar filas. Reconocía `insert into tabla (columnas) values (…)`, y no
reconocía la otra, la que usan la 0027 y la 0030: `insert … select … from una lista de valores`,
donde las columnas no se declaran junto a la tabla sino después de la lista. **Veintisiete filas
de franjas, treinta y cinco de avisos y todo el contenido de los cuatro legajos pasaban sin que
nadie les mirara los valores.**

Un chequeo que no mira no es un chequeo que pasa: es un chequeo que no existe. Ahora reconoce las
dos formas (`scripts/verificar_claves.mjs:213`) y conoce cinco columnas más —modalidad y nivel de
un curso, día y turno de una franja, puesto de una experiencia—.

**Se probó que puede fallar**, que es la única forma de saber que sirve. Con dos valores
cambiados a mano adentro de la 0030 —un turno que no existe y una profesión que no está en el
catálogo—, el chequeo denunció los dos, con su renglón, y cortó. Restaurados, vuelve a decir que
las treinta migraciones están limpias. Además quedaron cuatro casos nuevos en su autoprueba, dos
que tienen que romper y dos que tienen que pasar; uno de esos dos últimos es una lista de valores
**sin** nombres de columna, que el chequeo tiene que dejar pasar en vez de adivinar a qué columna
corresponde cada uno.

### Cualquiera con sesión podía vaciar las tablas de las dos Prestadoras

Era el pendiente 67, y resultó peor de lo que ese renglón decía. La base tenía escrito con
cuidado el segundo paso de los dos que hace Postgres —treinta y cuatro políticas, todas pidiendo
sesión— y el primero tal como venía de fábrica. Supabase deja puesto un permiso por omisión que
le concede *todo* a `anon` y a `authenticated` sobre cada tabla, secuencia y función nueva de
`public`, así que cada tabla nacía abierta sin que ninguna migración lo pidiera.

**Lo que eso abría no era teórico, y se midió.** Con una cuenta ficticia de coordinador de
PresDemo, contra la base local, con las 31 migraciones aplicadas: esa cuenta **veía 6 avisos** —los
de su Prestadora, que es lo que la política le deja ver— y con un solo `truncate` **dejó la tabla
en 0**, borrando también los 6 de Cuidar Norte. La RLS no lo detuvo porque no puede: filtra filas,
y vaciar la tabla no es filtrar filas. `TRUNCATE` no mira ninguna política. El pendiente decía que
el permiso «está de más igual» aunque no hubiera daño; había daño, y alcanzaba a la Organización
ajena.

Lo arregla `supabase/migrations/0032_los_permisos_de_tabla_al_minimo.sql`, que **no concede nada
nuevo: sólo saca.** Cada tabla queda con exactamente los verbos que sus propias políticas ya
permiten —alta, baja, modificación y consulta donde la política dice `for all`; sólo consulta
donde dice `for select`— y se van `TRUNCATE`, `REFERENCES` y `TRIGGER`, que ninguna pantalla usa y
que PostgREST no sabe pedir. Se van también los cinco permisos que tenía `anon` sin usarlos, la
función de disparador que había quedado al alcance anónimo, y los seis renglones de permiso por
omisión, que son los que hacían que esto se repusiera solo con cada tabla nueva.

**Consecuencia que hay que saber, porque cambia cómo se escribe una migración de acá en más:**
toda migración que cree una tabla, una vista o una función tiene que conceder sus permisos
explícitamente. Si no, la pantalla va a recibir `42501 permission denied` con una sesión válida, y
eso no se arregla tocando políticas.

**Y la 0032 sacó de más, cosa que se descubrió al día siguiente y se corrigió con la migración
0033.** El renglón `revoke all on table public.profiles from anon, authenticated` se llevó puesto
también un permiso **por columna** que la migración 0005 había escrito a propósito, `update
(full_name)` (`supabase/migrations/0005_acceso_por_sesion.sql:160`). En Postgres, `REVOKE ALL ON
TABLE` no distingue el permiso sobre la tabla entera del permiso sobre una columna: borra los dos.
`supabase/migrations/0033_vuelve_el_permiso_por_columna_del_perfil.sql` lo repone, y nada más.
Ninguna pantalla lo usa hoy —ningún archivo de `js/` escribe `profiles`—, así que no hubo síntoma
visible; lo que se había roto no era una función, era una defensa.

**Por qué ese permiso es la defensa, y no una comodidad.** `profiles` tiene la política «Su propio
perfil, de escritura», que dice `id = auth.uid()` y **no nombra ninguna columna**. La tabla guarda
`role` y `tenant_id`. Lo único que impide que alguien con sesión se ascienda a personal de la
Prestadora o se mude a otra Organización escribiéndose el `tenant_id` es que el permiso llegue
acotado a `full_name`. Comprobado el 26 de agosto de 2026 contra la base local, con una cuenta
ficticia y sesión simulada: corregirse el propio nombre sale bien; ascenderse a `coordinador` y
mudarse a la Prestadora ajena contestan las dos `permission denied for table profiles`; y
escribirle el nombre a otra persona toca cero filas.

**Queda como pendiente 82, que no es una alarma sino una trampa armada.** La protección no vive
donde se la busca: quien lea la política va a leer «cada quien escribe su propia fila» y no va a
ver ningún límite de columnas, porque no lo hay — está seis renglones más abajo, en un `grant`. La
0032 es la prueba de que se pisa sin querer. Y el mensaje de Postgres sugiere literalmente el
arreglo equivocado: `HINT: Grant the required privileges to the current role with: GRANT UPDATE ON
public.profiles TO authenticated`, que es justo la línea que abre el agujero.

**Y una afirmación de la 0032 quedó mal escrita.** Su encabezado dice que `profiles` «no tiene el
permiso de tabla que la haría funcionar» y que la política de escritura es letra muerta. Era falso
al escribirse: el permiso existía, acotado a `full_name`, desde 0005. Lo volvió cierto la propia
0032, al revocarlo. Una migración aplicada no se edita, así que aquel párrafo queda como está y la
corrección vive acá y en el encabezado de la 0033.

**Cómo se comprobó, en tres capas, porque el volcado del esquema solo no alcanza.** Una:
`scripts/probar_permisos_en_vivo.mjs` da las cinco en verde contra las dos bases, sin que se
tocara la prueba, y sus dos comprobaciones de sostén siguen en pie —el volcado trae tablas y
políticas, y las tres puertas del directorio siguen al alcance anónimo—. Dos: con una cuenta
ficticia y sesión simulada contra la base local se leyeron las tablas, se llamaron las funciones
del directorio, y se dio de alta, se modificó y se dio de baja un aviso, todo `1` fila; el
`truncate` que antes vaciaba la tabla ahora contesta `permission denied`; y el disparador de las
ponderaciones **sigue rechazando** aunque su función ya no se pueda llamar desde ninguna sesión,
porque el permiso de llamada se verifica al crear el disparador y no cada vez que se dispara.
Tres: `scripts/probar_aislamiento.mjs --local` pasó entero con los permisos recortados —registro
real, sesiones reales, archivos, examen, avisos y reportes—, que es la única capa que prueba que
no se rompió nada de lo que la aplicación hace de verdad; se volvió a correr después de la 0033,
sobre la base local reconstruida desde cero con las 33 migraciones en orden. Y cuatro, que apareció
después: la prueba por columna sobre `profiles`, la que encontró lo que la 0032 había sacado de
más. Las tres primeras capas la habían dejado pasar —ninguna escribe `profiles`—, que es
exactamente el motivo por el que el pendiente 82 pide una prueba en el repositorio y no a mano.

**Lo que no se tocó, y por qué se dice.** Las funciones que llaman las políticas conservan
`authenticated`: una política evalúa su expresión con los permisos de quien consulta, y quitarle
ese permiso a una de ésas no devuelve cero filas, **falla**. `service_role` tampoco se tocó.


### La persona se elegía su propia antigüedad, y ahora la fecha la pone la base

`caregivers.created_at` tenía su valor por omisión desde el principio, pero la política «Su propio
legajo» es `for all` y no nombra ninguna columna, así que la fecha entraba en el alta como
cualquier otro dato. **Medido el 26 de agosto de 2026** contra la base local, con una cuenta
ficticia y sesión simulada: el legajo se creó con fecha de alta del **1 de enero de 2015**, y un
`update` posterior la corrió al **1 de enero de 2010**. Las dos veces la base guardó lo que le
mandaron.

**Hoy no se veía en ninguna pantalla** —`js/apiClient.js:1094` la traduce a `fechaRegistro` y ese
nombre no aparece en ningún otro archivo del proyecto—, así que no había consecuencia visible. Se
arregló igual, porque la antigüedad es exactamente la clase de dato que después se usa para ordenar
un directorio o para decidir a quién se muestra primero, y ese día el agujero pasa a ser una
ventaja que alguien se dio a sí mismo.

**Lo arregla `supabase/migrations/0034_la_fecha_de_alta_del_legajo_la_pone_la_base.sql`** con un
disparador `before insert or update`: al dar de alta la fecha es la de ese momento y se ignora lo
que venga de afuera; al modificar, queda como estaba. Vale para todo el mundo, incluido el
servidor.

**Por qué un disparador y no un permiso por columna**, que era la otra herramienta disponible. Acá
las dos servían —a diferencia del veredicto de la Prestadora del pendiente 66, donde el permiso por
columna no sirve porque el personal y el Asistente son el mismo rol de base—. Se eligió el
disparador por dos razones. Una: el límite queda escrito en la tabla, donde lo lee quien lee el
esquema, y no en un `grant` a treinta renglones de distancia. Dos: un permiso por columna se pierde
sin que nadie se entere, y eso no es una hipótesis — la migración 0032 se llevó puesto el `update
(full_name)` de `profiles` con un `revoke all on table`, y hubo que reponerlo con la 0033.

**Cómo se comprobó, y por qué la prueba podía fallar.** Es el mismo guion corrido dos veces, antes
y después de la migración: la primera vez guardó 2015 y después 2010; la segunda ignoró las dos y
puso la hora real. Y trae su comprobación de sostén —que la persona sí pueda corregirse el
teléfono—, sin la cual cerrar la tabla entera habría dado el mismo verde sin arreglar nada.

**Ninguna migración escribe esa fecha**, así que el disparador no le cambia nada a los datos
ficticios: se verificó sobre las tres que dan de alta legajos —`0003`, `0014` y `0030`—, y ninguna
la nombra. Si algún día hace falta traer legajos de otro sistema conservando sus fechas, esa
migración apaga el disparador mientras carga y lo vuelve a encender, y así queda dicho que la
excepción fue a propósito.

### Los cinco formularios del portal dejaron de decir que mandaron algo, y de paso se supo que nadie puede mandarlo

Cinco pantallas públicas preguntan lo mismo —nombre, correo, celular, motivo y si quiere
novedades— y hasta el 26 de agosto de 2026 hacían con la respuesta tres cosas distintas, todas
malas. Tres de ellas —`index.html`, `cursos.html` y `soporte-remoto.html`— prendían un cartel
verde que decía «✓ ¡Solicitud enviada!» **sin haber mandado nada a ningún lado**: el guion que
las atendía, en `js/main.js`, mostraba el cartel y limpiaba el formulario. Una cuarta,
`#form-solicitud-familia`, se recargaba a sí misma y borraba lo escrito. La quinta,
`solicitar-asistente.html`, era la única que intentaba guardar.

**El plan era hacer que las otras cuatro guardaran como esa quinta. La medición lo tiró abajo.**
`scripts/probar_consulta_publica.mjs` hace contra la base local, con datos inventados, el mismo
alta que hace esa pantalla:

- **sin sesión —que es como llega cualquiera al portal— contesta 401, «permission denied»**:
  `anon` no tiene permiso sobre la tabla;
- **con una cuenta recién creada contesta 403**, porque la política «Busquedas de la Prestadora»
  exige `tenant_id = prestadora_actual()` (`supabase/migrations/0002_aislamiento_por_prestadora.sql:87`)
  y una cuenta nueva no tiene Prestadora.

La prueba trae su comprobación de sostén —la misma fila con una sesión válida entra—, sin la cual
una tabla cerrada para todos habría dado el mismo rojo y no habría distinguido nada.

**O sea que hoy ninguna consulta del portal puede llegar a la base**, y la única pantalla que
decía la verdad la decía siempre en su forma mala: «no se pudo». Abrirle la tabla a quien no
inició sesión es ampliar el acceso anónimo, que es decisión del Desarrollador —pendiente 25— y no
de esta tarea.

**Lo que hay ahora es un solo guion para los cinco**, `js/formulario-consulta.js`, que hace una
cosa y la dice como es: si hay sesión **y** se resolvió una Prestadora guarda la consulta, que es
el único caso en el que el guardado puede funcionar y el que va a andar solo el día que se abra la
puerta; y si no, muestra el correo del producto con la consulta ya redactada adentro y deja que la
persona la mande. **Nada dice «enviado» hasta que algo se envió.** El motivo va a
`consultation_reason`, que la migración 0013 creó justamente para distinguir a quien busca cuidado
de quien pregunta por un curso, y la dirección sale de `js/identidad.js`, que es el único punto de
verdad de la marca.

Todo el texto que escribe ese guion está en el catálogo en los tres idiomas, el botón se apaga
mientras corre y el fallo se dice en la pantalla, no en la consola. Con eso **las cinco pantallas
quedaron libres para convertirse al i18n**, que era lo que el cartel falso trababa:
traducir una mentira a tres idiomas cuesta tres veces más sacarla.

**Y probar los cinco en el navegador encontró otra cosa, que era la que de verdad tapaba el
formulario de `cursos.html`: el desplegable de cursos no se llenaba nunca.** Quedaba clavado en
«Cargando las opciones…», y como es obligatorio, ese formulario no se podía enviar ni aunque
funcionara. El motivo: el molde estaba escrito adentro del `<select>`, y **el navegador descarta
todo lo que no sea `<option>` adentro de un `<select>` al leer la página**, así que el `<template>`
no llegaba nunca al documento y `js/catalogo.js` avisaba —a la consola, donde no lo ve nadie— que
no encontraba ninguno. Ahora un `<select>` con `data-oferta` se llena con el mismo código que ya
llenaba los desplegables de vocabulario: una opción es una clave y una etiqueta, y para eso no hace
falta molde. De paso se arregló un error que la consola daba en toda pantalla que dibuja la oferta
entera —«no tiene todas las claves pedidas», con la lista de claves faltantes vacía—: la
comparación se hacía también cuando la pantalla no pedía ninguna clave, y ahí cero nunca iba a ser
igual a cinco.

**Lo que no se hizo, y por qué.** El consentimiento de novedades lo siguen preguntando los cinco y
no lo recibe ninguna tabla: hoy viaja adentro del correo, que es mejor que perderse, pero no es
guardarlo. Y `formulario-integral.html` no se borró aunque el Desarrollador la dio por sentenciada:
adentro tiene lo único que publica un aviso de verdad —el paso a paso, por `js/main.js:213`—, y ese
paso a paso choca con exactamente la misma pared. Las dos cosas están en el pendiente 64.

### Cuatro pantallas se convirtieron a la vez, y hacerlo a la vez mostró tres defectos del mecanismo

El 26 de agosto de 2026, con los carteles falsos ya cerrados, se convirtieron al i18n
`index.html`, `cursos.html`, `soporte-remoto.html` y `solicitar-asistente.html`: **205 frases
nuevas**, que dejan el catálogo en 460 y el chequeo en «10 de 46 archivos ya convertidos». La
quinta, `formulario-integral.html`, se dejó como está: está sentenciada a borrarse en el
pendiente 64, y traducir a tres idiomas 119 frases de una pantalla que se va es trabajo tirado.
Lo que falta bajó de 665 frases distintas a 479.

**Se hicieron las cuatro a la vez a propósito, y eso fue lo que encontró los tres defectos.** Las
cuatro traen el mismo formulario de consulta, así que lo que en una habría parecido un caso raro
apareció cuatro veces y se vio que era del mecanismo y no de la pantalla.

**Uno: el `value` de un redondel no es texto visible, y se estaba contando como tal.**
`scripts/texto_visible.mjs` leía todos los `value` por igual. Pero el de un redondel, un
casillero, un campo escondido o una opción de lista **no se lee en la pantalla**: es el dato que
viaja al servidor, y `js/formulario-consulta.js` lo compara letra por letra —`novedades === 'si'`—.
Traducirlo rompía el sí/no de novedades en los tres idiomas a la vez, en las cuatro pantallas.
Ahora lo saca `sinValoresGuardados()` (`scripts/texto_visible.mjs:42`), que deja adentro el
`value` de un botón porque ése sí se lee, y tiene una prueba de seis casos donde dos tienen que
fallar: si la función se pasara de larga y tapara también el rótulo de un botón, la prueba se
pone en rojo. **Y la misma regla estaba escrita dos veces**: `scripts/inventario_textos.mjs`
tenía su propia copia, más floja —no miraba el `type`, así que contaba todo `<input>` con
`value`—. Se borró y consume la compartida, que es lo que pide «ningún patrón repetido sin punto
único de verdad».

**Dos: lo que cuelga de un `<template>` no se traducía nunca.** `Catalogo._llenarOferta()`
clonaba el molde, lo rellenaba con los datos del ítem y llamaba a `Identidad`, pero no a
`Catalogo.traducir()`. Como lo que está adentro de un `<template>` no está en el documento, la
traducción de arranque tampoco lo alcanza: las copias llegaban siempre con el castellano de
respaldo. Eran las 21 frases de las tarjetas de curso de `cursos.html` y el cartel «Próximamente»
de `index.html`. Se agregó la llamada (`js/catalogo.js:553`) y se comprobó en el navegador, que
es donde esto se ve: `cursos.html?idioma=en` dice hoy «8 hours / Certificate / ENROL», e
`index.html?idioma=pt-BR` dice «Em breve».

**Tres: un campo con sus tres idiomas colgando se dibujaba «[object Object]».** `campo()`
resolvía el idioma sólo para el nombre; `descripcion` y `etiqueta` salían por `String(valor)`.
Hoy no se nota porque esos campos todavía son una cadena suelta en castellano, pero se rompía
justo el día que dejaran de serlo, que es el trabajo siguiente. Pasa por el mismo criterio de
idioma que el nombre.

**Lo que falta para que esas cuatro pantallas estén de verdad traducidas es el contenido de los
datos.** El marco cambia de idioma y las tarjetas no: `data/catalogo-oferta.json` —9 servicios, 6
cursos y 1 evaluación— y los 142 ítems de los 24 vocabularios de `data/catalogo-vocabularios.json`
están sólo en `es-AR`. El mecanismo ya los soporta, `Catalogo.textoDe()` los busca por idioma: los
campos están vacíos, nada más. Medido en el navegador el mismo día: `cursos.html?idioma=en` tiene
el encabezado, el pie y los rótulos en inglés y los seis cursos en castellano.

Y una decisión que no toma la línea de comandos: **«Careonys Academy»** (`cursos.html:121`), que
estaba escrito así desde antes y quedó igual en los tres idiomas. Es un nombre comercial, y la
regla de la empresa deja los nombres de marca como estén; pero la tabla de equivalencias pide
castellano existiendo la forma castellana. Anotado en el pendiente 9 para que lo decida el
Desarrollador.


### Y después, la mitad que no se ve desde el chequeo de frases: el contenido de los datos

Una pantalla puede tener las 46 frases de su marco traducidas y seguir mostrándole al visitante
seis tarjetas de curso en castellano. Eso es lo que pasaba el 26 de agosto de 2026 con
`cursos.html?idioma=en`, y el chequeo de frases lo daba por bueno, porque lo que hay adentro de
las tarjetas no lo escribe la pantalla: sale de `data/catalogo-oferta.json` y de
`data/catalogo-vocabularios.json`. El mecanismo ya lo soportaba —`Catalogo.textoDe()`
(`js/catalogo.js:382`) elige el idioma de cualquier texto que traiga sus tres idiomas colgando—;
lo que faltaba era el texto.

**Quedaron 218 textos en los tres idiomas**: los 24 títulos de vocabulario, sus 142 ítems, las 10
bajadas, y los 43 de la oferta —9 servicios, 6 cursos y la evaluación entera, con sus preguntas y
sus opciones—.

**Comprobado en el navegador, no supuesto.** `cursos.html?idioma=en` dibuja «Introduction to
caring for older adults», «Basic level» y su descripción en inglés; `directorio.html?idioma=pt-BR`
abre sus cuatro desplegables en portugués: «Todas as zonas», «Assistente / Cuidador domiciliar»,
«Todas as patologias», «Endereço comprovado».

**Lo que junta no confía en lo que le dan.** Antes de escribir nada comprueba que el `es-AR` de
cada traducción coincida **byte a byte** con el del archivo real —compara `Buffer` y no cadenas,
para que una tilde escrita descompuesta no pase inadvertida—, que no falte ni sobre ninguna clave
mirado en las dos direcciones, y que `en` y `pt-BR` estén y no estén vacíos. Y se probó contra
cuatro copias rotas a propósito —falta una clave, sobra una clave, `es-AR` cambiado, `pt-BR`
vacío— más una sana, porque una comprobación que no puede fallar no comprueba nada: ve las cuatro
y deja pasar la sana.

**Una sola quedó sin traducir, y a propósito.** «Guardia de 12 horas», del vocabulario
`modalidad_contratacion`. Guardia es palabra del glosario de los dos productos y no está traducida
en ningún archivo del proyecto; la palabra obvia en inglés, *shift*, ya está tomada por «turno», y
el glosario dice que una Guardia **no** es un turno, así que reusarla pisaría una distinción que
el glosario define a propósito. Se dejó sin `en` ni `pt-BR`: así `Catalogo.textoDe()` cae al
castellano, que es lo que ya se veía, en vez de mostrar un cartel raro. La pregunta quedó anotada.

**Y traducir los datos mostró algo que no se veía desde ninguna pantalla: el inglés y el portugués
no estaban parejos entre catálogos.** Cada archivo de `data/` se escribió aparte, así que la misma
palabra del negocio salió distinta en cada uno. `Asistente` era «Caregiver» en las 47 apariciones
del catálogo de frases, y «assistant» —minúscula, y otra palabra— en tres sueltas de
`catalogo-autorizaciones.json` y `catalogo-disponibilidad.json`; en portugués, «assistente» en
minúscula donde el resto escribe «Assistente». La ortografía inglesa mezclaba las dos escuelas:
«authorised», «recognised» y «licence» conviviendo con «specialized» y «Personalized», y
«wellbeing» con «well-being». Y la Matrícula era «Matrícula» en `catalogo-fichas.json`, que en
portugués de Brasil es la inscripción a un curso y no la habilitación profesional, contra «registro
profissional» en los otros dos. Se emparejaron los trece, eligiendo en cada caso la forma que ya
dominaba. Sale de eso `servicios.asistente_virtual`, que dice «Virtual assistant» a propósito:
ahí Asistente no nombra a la persona del glosario sino a un programa, que es justo el caso que el
glosario advierte cuando una palabra aprobada aparece nombrando otra cosa.

**Leer los 142 ítems uno por uno —que es la primera vez que alguien los leyó todos seguidos—
destapó además tres cosas del castellano**, que no se arreglaron acá porque cada una es una
decisión: el organismo fiscal que cambió de nombre y una lista impositiva que sólo vale en un país
(pendiente 84), el campo `etiqueta` de los cursos que repite lo que ya dice `nivel` (85), y tres
textos escritos distinto de sus vecinos sin motivo (86).


### El alta de un Asistente avisaba que faltaban campos y avanzaba igual

Apareció el 26 de agosto de 2026 tirando de un hilo distinto: por qué `js/main.js` guarda un
título escrito a mano cuando el campo viene vacío. El título resultó ser de `formulario-integral.html`,
que está sentenciado a borrarse; el hilo llevó a otra cosa.

**Dos navegadores de pasos escuchaban el mismo botón.** `registrar-asistente.html` tiene el suyo,
escrito adentro de la pantalla, que **valida el paso antes de dejar pasar al siguiente**
(`registrar-asistente.html:917`). Y `js/main.js` traía otro, el del asistente por pasos de
`formulario-integral.html`, que se enganchaba a `.btn-next-step` en cualquier pantalla que
cargara el archivo —y `registrar-asistente.html` lo carga— **sin validar nada**
(`js/main.js:206`). Los dos corrían en cada clic, en ese orden, así que el segundo deshacía lo
que el primero acababa de decidir.

**El resultado se comprobó en el navegador, no se dedujo.** Con los catorce campos obligatorios
del paso 1 vacíos, la pantalla decía «Faltan completar campos o archivos obligatorios» **y pasaba
al paso 2 lo mismo**. Los siete pasos quedaban así: la validación existía, se ejecutaba, avisaba,
y no servía para nada. Lo único que la salvaba era el envío final, que revalida los siete
(`registrar-asistente.html:1145`), así que a la base nunca llegó un alta incompleta —pero quien
se anotaba se enteraba de lo que le faltaba recién al final, después de siete pasos.

**El arreglo es pedir por la pantalla propia antes de enganchar nada.** Ese bloque de `js/main.js`
lee `w-title`, `summary-title` y `summary-desc`, que existen sólo en `formulario-integral.html`,
así que ahora se engancha únicamente si ese formulario está (`js/main.js:172`). Comprobado en el
navegador de las dos maneras, que es lo que hace que la prueba pueda fallar: con el paso 1 vacío
avisa y **no** avanza; con el paso 1 completo avanza y no avisa. Y `formulario-integral.html`
sigue funcionando igual, resumen del paso 6 incluido.

**Se midió si pasaba en otro lado y no pasa.** De los doce selectores a los que `js/main.js` le
engancha un manejador, sólo `.btn-next-step` y `.btn-prev-step` aparecen en más de una pantalla,
y sólo `registrar-asistente.html` tenía además el suyo propio. Por eso no se agregó un chequeo:
guardaría un caso único, y un chequeo que avisa de más se termina apagando.

### El inventario de texto contaba 92 cosas que no eran texto

Apareció el 27 de agosto de 2026 revisando de dónde salía cada frase que `scripts/inventario_textos.mjs`
decía sacar de los guiones. Decía 122; de verdad eran 30. **Lo que falta traducir no son 479
frases distintas sino 414**, y la diferencia no es trabajo hecho: es una medición que estaba mal.

Importa porque de este número cuelgan dos decisiones: cuánto trabajo es el i18n, y quién lo
hace —la única decisión abierta del plan (`docs/PLAN_I18N.md`, sección 5, punto 2)—. Un
inventario que cuenta de más pide presupuesto de más.

**Las seis familias de ruido y cómo se reconoce cada una están en `docs/PLAN_I18N.md`
sección 2.2.1**, y no se repiten acá. El criterio, sí: **ninguna se reconoce mirando si la cadena
parece una frase.** Eso es adivinar, y adivinar es lo que hacía el guion viejo. Cada una se
reconoce por algo que el proyecto ya escribió alrededor —que la cadena sea el argumento de
`Catalogo.frase()`, que esté al lado de un `===`, que el elemento haya nacido de un
`createElement('style')`—, que es el mismo criterio con el que `scripts/verificar_referencias.mjs:42`
descartó su heurística de cercanía: un chequeo que avisa de más se termina apagando.

**Se comprobó al revés.** Un archivo de mentira con cuatro frases escritas de cuatro maneras
distintas y dos cosas que no son texto: aparecen las cuatro, no aparecen las dos. Y las categorías
que el arreglo no toca dieron el mismo número antes y después —588 apariciones—, así que cambió lo
que tenía que cambiar y nada más.

### Tres módulos se guardaban su propio idioma, y uno se lo escribía al catálogo

Apareció el 28 de agosto de 2026 comprobando otra cosa: en una pantalla cargada con
`?idioma=pt-BR`, `document.documentElement.lang` decía `pt-BR` y `Catalogo.idioma` decía `es-AR` en
la misma carga. Los dos no pueden tener razón.

**El defecto tiene dos capas, y la segunda es la que hace daño.** La primera: `js/disponibilidad.js`,
`js/autorizaciones.js` y `js/fichas-legajo.js` arrancaban con `idioma: 'es-AR'` y no lo resolvían
nunca, así que todo lo que dibujaban salía en castellano aunque la página estuviera en inglés. La
segunda: `js/disponibilidad.js` además le **escribía** esa copia al catálogo —`Catalogo.idioma =
this.idioma`, adentro de `montarGrilla()`—, y desde ese renglón en adelante la pantalla entera
hablaba castellano. Era una carrera: lo que el catálogo dibujaba antes de que montara la grilla
salía bien, y todo lo de después salía mal.

**Reproducido antes de tocar nada**, en `registrar-asistente.html?idioma=en`: la grilla decía
«¿Cuándo puede trabajar?» en castellano, y después de montarse
`Catalogo.textoDe(Catalogo.items('zona')[0])` devolvía «Ciudad de Buenos Aires» en vez de «City of
Buenos Aires».

**La regla que rompía ya estaba escrita**, en `js/catalogo.js:40`: «El idioma es uno solo para las
tres cosas —opciones, oferta y frases— y se decide en `idiomaDelEntorno()`. Tenerlo en un solo
lugar es lo que evita la pantalla mitad en un idioma y mitad en otro.» Por eso el arreglo no
necesitó decidir nada: es la regla «ningún patrón repetido sin punto único de verdad» aplicada.

**El arreglo es que los módulos pregunten en vez de guardar.** Cada uno cambió su propiedad por un
`get idioma()` que devuelve `window.Catalogo.idioma` y se cae al valor de omisión sólo mientras el
catálogo no llegó; y la línea que le escribía el idioma al catálogo se borró. Nadie más le asigna
nada a esas propiedades —las dos únicas asignaciones a un `.idioma` en todo el proyecto eran la
legítima de `js/catalogo.js` y ésta—, así que un lector sin escritor alcanza. Las cuatro copias
que `scripts/verificar_copias.mjs` declara se refrescaron.

**Y para que no vuelva, `scripts/verificar_frases.mjs` tiene una regla 7**, con la misma forma que
la 6: se queja de un `idioma:` guardado como literal o como valor de omisión, y de cualquier
escritura a `Catalogo.idioma`. **Probada rompiendo el archivo a propósito**: devolviendo
`js/disponibilidad.js` a su forma vieja, el chequeo señala los dos renglones y sale en rojo;
restaurado, vuelve a verde. Tiene además diez casos escritos de las dos formas que se parecen y
significan cosas distintas —`get idioma()` y `idioma: idiomaDelEntorno()` no tienen que casar,
`idioma: IDIOMA_POR_DEFECTO` sí—, porque la diferencia entre la forma buena y la mala son dos
caracteres.

**Comprobado en el navegador en los dos idiomas que no son el de omisión.** En inglés las cinco
cosas dicen `en` y la grilla dice «When are you available to work?»; en portugués dicen `pt-BR` y
«Quando você pode trabalhar?», con la zona en «Cidade de Buenos Aires».

**Lo que esto no cubre:** la regla 7 mira que nadie se guarde el idioma, no que lo use bien. Un
módulo que pregunte el idioma y después dibuje una fecha a mano sigue pasando —eso lo mira la
regla 6, y sólo para `Intl`—.

### La Guía de cuidado: qué mirar y cómo actuar, sin decir qué tratamiento dar

Migración 0041, el 29 de agosto de 2026. Nace de una pregunta del Desarrollador —qué necesita
saber un Asistente antes de entrar a una casa— y de tres decisiones suyas: el alcance es
**descripción, señales de alarma y cómo actuar ante una emergencia**; la escriben **dos**, el
producto lo general y cada Prestadora lo suyo; y la palabra aprobada es **«Guía de cuidado»**.

**Los tratamientos quedan afuera a propósito.** Decir qué tratamiento corresponde convierte al
producto en fuente de indicación clínica, y entonces alguien tiene que responder cuando un
Asistente lo siga y salga mal. Avisar no es prescribir, y la pantalla lo dice arriba de todo en vez
de dejarlo supuesto: *«Estas guías dicen qué observar y cuándo avisar. No indican tratamientos.»*

- **La tabla es `guias_cuidado`** (`supabase/migrations/0041_las_guias_de_cuidado.sql:109`), y cada
  guía cuelga de una opción del catálogo —hoy de una patología—, no de un texto suelto. Cuatro
  columnas de contenido: `descripcion`, `que_esperar`, `senales_de_alarma` y `en_emergencia`. Las
  dos primeras son texto, las dos últimas son listas, porque una señal se mira de a una y un paso
  de emergencia se sigue en orden.
- **Los dos escalones son el mismo patrón que ya usa el catálogo desde la 0038**: `tenant_id` en
  nulo es lo que trae el producto, `tenant_id` cargado es lo que agregó esa Prestadora. **Y acá lo
  propio reemplaza a lo general**, no se suma —al revés que las opciones del catálogo, que se
  suman—. El reemplazo lo resuelve la base con un `distinct on` que ordena por «tiene dueño
  primero», y no la pantalla: si lo decidiera la pantalla habría que decidirlo igual en la
  aplicación de la Familia y en el sitio, y tres decisiones iguales escritas en tres lados son tres
  oportunidades de que una quede vieja.
- **Los tres idiomas para lo que escribe el producto, el suyo para lo que escribe la clienta**
  (`:130`). Es la misma decisión de la 0035 con las zonas y de la 0038 con las opciones: la regla
  de i18n rige el texto del producto, no el que carga el cliente. Las listas tienen su par de
  funciones propias —`i18n_lista_completa` e `i18n_lista_minima` (`:49`, `:73`)—, porque las que ya
  existían miran una cadena y una lista no lo es.
- **Ninguna guía se publica sin firma** (`:145`). `publicada` en verdadero exige `revisada_por` con
  texto y `revisada_el` con fecha. Lo que el Asistente lee al entrar a una casa no sale de acá sin
  que alguien responda por ello, y eso lo impide la base, no la pantalla.
- **Una guía general por opción, y una por Prestadora** —restricción única más un índice parcial
  (`:153`, `:156`), porque en Postgres dos `null` no chocan y la restricción sola dejaba cargar la
  general dos veces.
- **Y una guía no cruza Prestadoras** (`:184`): un disparador impide que la guía de una cuelgue de
  una opción de otra, y que el catálogo general escriba guías sobre las opciones privadas de una
  clienta —de las que el producto no sabe nada y sobre las que no le corresponde opinar—.
- **La puerta es `guias_de(p_slug)`** (`:272`), del mismo tipo que `vocabularios_de`: la tabla no le
  concede nada a `anon` (`:254`), y lo que sale a la calle es una función que **exige el nombre
  corto**, devuelve la general más la de esa sola Prestadora, y sólo las publicadas. Está anotada
  con su motivo en `scripts/verificar_esquema.mjs:441`, que es donde viven las funciones que llegan
  al alcance anónimo a propósito.
- **La pantalla nueva es `screen-guias`** en la aplicación del Asistente
  (`pwa-asistente/index.html:722`), con los cuatro estados y un buscador. **Es una biblioteca de
  consulta, no la guía del Paciente de hoy**, y eso es una carencia conocida: no existe todavía
  ninguna pantalla donde el Asistente vea al Paciente que va a atender, así que no hay dónde colgar
  la guía. Queda como pendiente 105.
- **Su chequeo es `scripts/verificar_guias.mjs`**, y le pregunta a las dos bases: la de esta
  máquina dice si la migración está bien escrita, la de verdad dice si además está aplicada donde
  entran las pantallas. Mira que la tabla siga cerrada, que la puerta conteste, que las guías
  generales traigan sus cuatro partes en los tres idiomas, y que pidiendo con el nombre de una
  Prestadora no aparezca texto de otra. **Cuando no puede probar el aislamiento lo dice en voz alta
  en el renglón final**, porque con cero guías cargadas la comparación da «no se cruzó» exactamente
  igual que si estuviera bien.
- **Las diecinueve guías generales están escritas y ninguna está publicada.** La migración
  `supabase/migrations/0042_las_diecinueve_guias_generales.sql` cargó las 19 patologías del catálogo
  con sus cuatro partes en los tres idiomas, **como borrador**. La base no deja publicar una guía
  sin que quede escrito quién la revisó y cuándo, y esa firma no la puede poner una migración: es
  una persona haciéndose responsable de lo que ahí dice, no un dato. Así que la puerta —que sólo
  devuelve publicadas— todavía no entrega ninguna, y la pantalla del Asistente muestra el estado
  «todavía no hay guías». **Eso es lo correcto y no es el final**: falta la revisión profesional
  (pendiente 104).
- **La Prestadora escribe la suya desde `guias-prestadora.html`**, que es una pantalla del panel y
  pide rol `coordinador`. Elige la lista y la opción del catálogo, escribe las cuatro partes,
  guarda como borrador, corrige, publica firmando quién la revisó y cuándo, y borra. La pantalla
  valida en castellano antes que la base —`guias-prestadora.html:466`—, así que quien intenta
  publicar sin firma lee «Para publicar una guía hay que dejar escrito quién la revisó y cuándo» y
  no el texto crudo de una restricción. Borrar avisa antes qué consecuencia tiene y se puede
  cancelar (`guias-prestadora.html:539`).
- **Se comprobó desde la pantalla, con las dos Prestadoras ficticias.** El 30 de agosto de 2026,
  con una coordinadora en cada una (`scripts/preparar_coordinadores_locales.mjs`) y contra la base
  de esta máquina: cada una escribió la suya, la corrigió, la publicó y la vio en la lista; ninguna
  vio la de la otra; y a la ajena, pidiéndola por su identificador desde la sesión de la otra, no
  la pudo leer, ni cambiar, ni borrar. Contra la general, la coordinadora no pudo crear una, ni
  cambiar la que hay, ni borrarla; y sin sesión la pantalla manda a `acceso.html`. **La revisión
  se guarda como fecha y no como instante** desde
  `supabase/migrations/0044_la_fecha_de_revision_es_una_fecha.sql`: guardada como instante, un día
  declarado acá se mostraba como el anterior.
- **Y el aislamiento de la puerta se compara ahora en cualquier base**, incluida la publicada,
  desde que `supabase/migrations/0045_cada_prestadora_ficticia_con_su_propia_guia.sql` carga la
  guía propia de dos Prestadoras ficticias. Antes de eso, la prueba de la pantalla vivía sólo en
  datos cargados a mano y se perdía con la base.
- **Lo demás que falta**: la guía no llega al teléfono sin señal (pendiente 102), que es justo
  cuando más se necesita.

## 2. Falta construir

Nada de esto se migra: **se escribe por primera vez.** Conviene tenerlo presente al estimar,
porque migrar es más barato que construir.

| Función | Qué hay hoy |
|---|---|
| **Calculadora de presupuesto** | No existe. Ni el cálculo ni las tarifas |
| **Algoritmo de match** | No existe. Los porcentajes ("98% Match") son texto escrito a mano en el HTML |
| **Puntos reputacionales y rangos** (Bronce → Plata → Oro) | No existe |
| **Reemplazo urgente por cercanía** (<2hs, <5km) | No existe. El botón está, la lógica no |
| **Badges de verificación de 4 niveles** | Se muestran. No hay validación real detrás de ninguno |
| **La pantalla que carga las verificaciones del legajo** | La tabla, sus columnas de rastro, sus políticas y la vista que las publica están desde las migraciones 0004, 0005 y 0026; **falta dónde apretar**, así que hoy sólo tienen comprobaciones los legajos que sembraron las migraciones 0027 y 0030. Es el pendiente 70 |
| **Reportes de salud y signos vitales** | Maquetado sin persistencia — y ver §3 |
| **Asesoría de reintegros de Obra Social** | Maquetado sin lógica — y ver §3 |

---

## 3. Es una modalidad de Careonys **y además** un producto que se vende solo

**Decidido por el Desarrollador el 23 de agosto de 2026 y ampliado el 25.** Cierra las dos
decisiones que bloqueaban el arranque.

Lo que se estaba construyendo acá como producto aparte es **una modalidad más de Careonys**: no
una cuarta aplicación ni un sistema hermano. Una misma Prestadora puede tener las dos encendidas
a la vez, con unos clientes de atención directa y otros que eligen del catálogo.

**Y el 25 de agosto el Desarrollador agregó la otra mitad, que este título daba por cerrada de
más:** CeltaTech además lo vende **por sí solo**, a clientes que no usan Careonys. Preguntado cuál
de las dos, contestó *«las dos cosas»*. Lo que eso **no** quiere decir es que un cliente termine
con dos contratos: pasar del Marketplace a Careonys entero **reemplaza** el contrato, no lo suma
—dos contratos hay cuando son dos productos distintos que conviven, como un ERP o un CRM—.

Todo eso es comercial y se decide del otro lado; acá está anotado porque cambia una frase de este
documento y ninguna línea de código. El detalle está en
`../../docs/SUGERENCIAS_DESDE_EL_MARKETPLACE.md`.

### La palabra `marketplace` está ocupada, pero está mal puesta

Careonys guarda el valor `marketplace` en tres lugares —`prestadora_modalidades.modalidad`,
`asistentes.canales` y `guardias.canal_modalidad`—. **Ahí adentro no significa mercado.**

Lo que separa esos valores es **bajo qué régimen trabaja el Asistente**, y el código lo dice con
todas las letras: *"en prestación directa la Prestadora dirige el trabajo; en marketplace el
Asistente elige qué toma y mantiene su independencia operativa"*
(`supabase/migrations/20260820190000_el_canal_del_asistente_se_elige_y_se_respeta.sql:11`). Es la
distinción entre relación de dependencia y trabajo autónomo, con consecuencias legales reales: las
siete advertencias del artículo 23 de la LCT cargadas en `advertencias_legales` cuelgan de ahí, y
los textos de consentimiento tienen dos versiones separadas por `modalidad`, cuyos valores son
`dependencia` y `autonomo` — no `directa` y `marketplace`.

**Aceptar o rechazar una guardia no es lo que distingue una cosa de la otra.** Es un derecho del
Asistente y vale en las dos. Está en `ofertas_guardia`, una tabla que **no tiene columna de canal**:
cualquier guardia puede ofrecerse y contestarse con `acepta` o `rechaza`, sin importar el régimen.

Y un mercado es otra cosa. Un mercado en línea junta **a muchos que ofrecen con muchos que
buscan, en un solo lugar**: la plataforma pone el espacio, quien ofrece publica, quien busca
compara y contrata, y quien puso el espacio cobra una comisión por operación. Alguien publica lo
que necesita o mira lo que hay ofrecido, la otra parte acepta o no, y si coinciden empieza la
prestación.

### Los muchos que ofrecen son los Asistentes, nunca las Prestadoras

**Decidido por el Desarrollador el 23 de agosto de 2026.**

El mercado es de una Prestadora: sus Asistentes ofreciendo, sus Familias buscando. Muchos de un
lado y muchos del otro, pero **todos adentro de la misma Organización**. Es lo que ya hace
`js/apiClient.js:764`, que resuelve una Prestadora y le muestra los suyos a `directorio.html`.

**Ninguna búsqueda, en ninguna modalidad, mezcla Asistentes de dos Prestadoras.** Mezclarlas sería
abandonar el aislamiento entre Organizaciones para conseguir un desorden general. No
se hace, y no se vuelve a preguntar por modalidad ni por pantalla.

De acá salen dos cosas prácticas:

- El límite de aislamiento no se toca. Lo que lo debilitaba —la Prestadora saliendo de la barra
  de direcciones— se cerró el 24 de agosto de 2026: ver «El límite entre Prestadoras lo pone la
  sesión», arriba.
- Ningún esquema de este proyecto necesita una tabla ni una consulta que cruce Prestadoras. Si
  alguna vez una consulta parece necesitarla, está mal planteada.

### Consecuencias

1. **Acá no se usa la palabra `marketplace` en ningún identificador.** No porque el significado
   esté tomado, sino porque el valor guardado ya la usa y colisionaría. **El término técnico se
   eligió el 24 de agosto de 2026: la modalidad se llama modalidad de este producto y su
   identificador es `modalidad`** (`docs/GLOSARIO.md` §3 y §4). El nombre comercial «Careonys
   Marketplace» no cambia: es decisión de marca y no entra al código.
2. **`docs/GLOSARIO.md` §1 tiene la definición equivocada.** Dice que en marketplace *"el Asistente
   elige cuáles toma"*, que es la parte que vale para las dos. Es un término heredado: se corrige
   en el glosario de Careonys, no acá.
3. **Careonys tiene un valor mal nombrado, y eso es un caso de la comparación en los dos
   sentidos.** Por su función debería llamarse `autonomo`, la palabra que sus propias tablas
   legales ya usan para lo mismo. Pero es un valor **guardado**, y «lo que se guarda para siempre se nombra por lo que hace» dice que lo que
   persiste no se renombra: cambiarlo es migración de datos sobre un sistema en producción.
   **Decisión del Desarrollador, del lado de Careonys.** Acá sólo queda anotado.

### Lo que se comparte, no se construye

Estos módulos son de las dos modalidades y ya existen del lado de Careonys. Acá no se hacen de
nuevo:

| Módulo | Dónde vive hoy |
|---|---|
| Plantel de Asistentes | `asistentes`, `tipos_asistente`, `matriculas_asistente`, `documentos_asistente` |
| Reclutamiento | `postulaciones`, `etapas_incorporacion_asistente`, `verificaciones_asistente` |
| Cursos y certificaciones | `certificados`, `calificaciones_asistente` |
| Clientes | `familias`, `pacientes`, `miembros_familia` |
| Zonas de cobertura | `zonas_cobertura` |

**El reparto completo, módulo por módulo, está en `docs/MODULOS.md`** (24 de agosto de
2026), que traza la línea de corte también para lo que no existe todavía de ningún lado.

Lo propio de esta modalidad es lo que la distingue: que el cliente **busca y elige** en vez de
recibir una asignación. Eso es el directorio, el perfil, el filtro y la solicitud. Sus
módulos llevan el prefijo de la modalidad.

### La comparación va en los dos sentidos

Unificar no es que este proyecto se disuelva adentro del otro. Hay cosas resueltas acá que están
mejor que su equivalente del programa grande, y al unificar se comparan una por una: la que gane
queda, venga de donde venga. Esta carpeta es candidata a fuente, no sólo a destino.

Un caso ya visible: **Careonys no tiene tabla de cursos.** Tiene `certificados`, que registra el
resultado, pero no la oferta —seis cursos con su duración, su nivel y su evaluación— que acá está
descripta y ahora vive en `data/catalogo-oferta.json`.

Lo que sí se descarta es la idea de un esquema propio y paralelo: haya ganado quien haya ganado,
al final hay una sola tabla de cada cosa.

Los cuatro módulos que estaban duplicados —reportes de salud, signos vitales, check-in con
ubicación, reportes diarios, Obra Social— no se construyen de nuevo acá: existen y funcionan del
otro lado, y si alguna pantalla de acá los resuelve mejor, eso se lleva allá.

---

## 4. Cerrada: la lógica comercial no vive acá

**Cerrada por el Desarrollador el 25 de agosto de 2026**, y en los mismos términos en que estaba
planteada: *«una cosa es el producto, y otra es su manejo comercial, no mezclemos o hacemos
líos»*. Antes de eso había dicho lo mismo de otras dos maneras, sobre dos propuestas distintas:
guardar de qué contrato viene cada Prestadora, y guardar qué capacidades tiene contratadas. Las
dos volvieron con dos palabras, «tema de CeltaTech».

**Qué queda afuera, entonces:** el producto no guarda ni consulta capacidades, no decide qué
significa suspender a alguien, y no le pregunta nada a CeltaTech mientras hay gente trabajando. Lo
único que sí recibe es el alta y la baja de una Prestadora, por la puerta de §1.

**Y el producto tampoco restringe.** Lo aclaró el Desarrollador el 25 de agosto de 2026, y es
la parte que faltaba: *«desde la aplicación no se restringe, eso no es una funcionalidad técnica
sino comercial. Marketplace informa sus capacidades y las mismas son autorizadas o no según el mix
comercial que CeltaTech decida»*.

O sea que ninguna pantalla de este producto se apaga por lo que un cliente tenga o no tenga
contratado, y ninguna pregunta antes de mostrarse. **Lo que este producto sí tiene que poder
hacer es decir qué sabe hacer** —la lista de sus capacidades, y qué combinaciones son
técnicamente posibles—, porque de esa lista CeltaTech arma el paquete de cada cliente. Decidir
quién tiene cuál, y hacerlo cumplir al dar el acceso, es de CeltaTech.

De ahí sale una regla práctica para cualquier tarea futura: si un pedido pide esconder,
deshabilitar o limitar algo **según lo que ese cliente pagó**, la tarea está mal planteada del
mismo modo que dice el `CLAUDE.md` de Careonys en su §1.bis. Se para y se consulta.

**Y qué queda afuera de este repositorio**, que es la otra mitad de la decisión: lo comercial se
le anota a CeltaTech en `../../docs/SUGERENCIAS_DESDE_EL_MARKETPLACE.md` y no se construye acá,
aunque parezca chico y aunque el producto pudiera hacerlo. No se pregunta caso por caso.

Lo que sigue es cómo estaba planteada la decisión, que explica de dónde venía:

Los dos documentos de modelo de negocio de `docs/` ponen planes, comisiones, precios y facturación
**adentro del producto**: niveles de suscripción, comisión por transacción, canon de licencia.

El `CLAUDE.md` de Careonys decidió lo contrario en su §1.bis: nada comercial vive del lado del
producto, eso pertenece al panel de CeltaTech, y *"si una tarea parece pedir que el producto sepa
cuánto paga un cliente, la tarea está mal planteada: se para y se consulta"*.

Un dato nuevo que conviene tener a la vista al decidir: Careonys ya tiene dos tablas llamadas
`cobros_marketplace` y `suscripciones_marketplace`. O sea que parte de lo comercial de esta
modalidad ya está construido allá, aunque ninguna de las dos tablas tiene comentario que explique
qué guarda. Antes de escribir nada comercial acá conviene abrirlas.

**Y así quedó: no se construye lógica comercial en este proyecto.**

---

## 5. Hoja de ruta

En este orden, porque cada uno depende del anterior:

1. **Resolver las decisiones abiertas** — el nombre (`docs/GLOSARIO.md` §4), el alcance frente a
   Careonys (§3) y la lógica comercial (§4).
2. **Escribir el esquema** en `supabase/migrations/`, con RLS desde la migración que crea cada
   tabla y el vocabulario del glosario.
3. **Aplicar la tabla de equivalencias** de `docs/DISENO.md`: ninguna pantalla portada escribe un
   color a mano, y ninguna conserva la paleta ajena. La pantalla del teléfono se toma de `css/mockup-app.css`: tiene los 60 selectores
   del CSS embebido de `pwa-familia` más 18 propios, 55 de los 60 comunes con el mismo detalle, y es
   la única de las tres escrita contra las variables — 85 usos de `var(--…)` contra 10 y 11, y 20
   colores literales contra 70 y 92.
4. **Levantar el esqueleto** React 18 + Vite + React Router + Oxlint + Vitest, con una pantalla
   portada de punta a punta para validar el andamiaje.
5. **Portar las 11 pantallas restantes**, una por vez, cada una funcionando antes de empezar la
   siguiente.
6. **Construir lo de §2** que haya sobrevivido a la decisión de alcance.

La publicación en producción no entra en esta lista: es un proyecto exploratorio y no se publica
hasta que el resultado satisfaga.

**Cuándo se arranca el punto 4, decidido por el Desarrollador el 24 de agosto de 2026.** El
esqueleto de React se levanta **recién cuando el catálogo esté entero en tablas y los estilos
afuera del HTML**, no antes. El motivo es de costo: portar antes obliga a escribir cada pantalla
dos veces —una en HTML plano para que funcione hoy, otra en React—, y ese trabajo duplicado es
exactamente el que el reparto de módulos quiere evitar. Mientras tanto, cada pantalla que se toca deja el
contenido en su catálogo y los colores en las variables, que es preparar el terreno para el punto
4 sin escribir nada dos veces.

### La red de chequeos se adapta antes del punto 4, no después

Esto es el paso 1 de «antes de un cambio grande»: el inventario de qué asume el código de hoy,
hecho sobre **la red que sostiene al producto** en vez de sobre el producto. Va acá y no en
`docs/INVENTARIO.md` porque ese archivo es una foto del 22 de agosto de 2026 y se deja como está. Al hacerse esta medición
corrían dieciséis chequeos antes de cada `commit` (`.githooks/pre-commit` llama a `scripts/verificar_todo.mjs`), y
son los que impiden que vuelvan los colores a mano, el tuteo, las claves en el código, las
pantallas mudas y los textos escritos adentro del HTML. **Medido el 26 de agosto de 2026 leyendo
los dieciséis, no de memoria.**

**El hallazgo: nueve chequeos no se rompen, se callan.** *(Se midió de nuevo el 28 de agosto
de 2026 corriendo la red en vez de leyéndola, y eran once. La cuenta corregida está al final de
esta sección.)*

`scripts/recorrido.mjs` recorre el proyecto y **cada chequeo le pide una lista de extensiones**.
Ninguno de los dieciséis nombra `.jsx` ni `.tsx`. Así que el día que la primera pantalla deja de
ser `.html` y pasa a ser un componente, **nueve chequeos no la miran, y no avisan de nada**:
siguen diciendo ✔, con un número más chico que nadie está mirando. Otros dos —`guiones` y
`contacto`— quedan tocados de otra manera, y están en la misma tabla porque tampoco sobreviven
como están.

| Chequeo | Qué recorre hoy | Qué pasa con un `.jsx` |
|---|---|---|
| `arranque` | `.html`, `.js` | Deja de verlo |
| `botones` | `.html`, `.js` | Deja de verlo |
| `escapado` | `.html`, `.js` | Deja de verlo |
| `frases` | `.html`, `.js` | Deja de verlo |
| `identidad` | `.html`, `.js`, `.css`, `.json`, `.webmanifest`, `.txt` | Deja de verlo |
| `paleta` | `.html`, `.css`, `.js` | Deja de verlo |
| `temas` | `.html`, `.css` | Deja de verlo |
| `trato` | `.html`, `.js`, `.json` | Deja de verlo |
| `vocabulario` | `.html`, `.js`, `.json` | Deja de verlo |
| `guiones` | sólo los bloques `<script>` de cada `.html` | **Se queda sin nada que revisar**: en Vite no hay guiones adentro del HTML |
| `contacto` | carga `js/contacto.js` con `require()` | Ver 9.3 |

**Por qué importa más de lo que parece:** son nueve pruebas que pasan a no poder fallar, más una
décima —`guiones`— que se queda mirando cero bloques y también dice ✔. Un chequeo
que recorre cero archivos informa lo mismo que uno que recorrió cuarenta y nueve y no encontró
nada. La migración no rompería la red — **la desarmaría en silencio**, que es peor, porque el
`commit` sigue saliendo verde.

Y no alcanza con agregar `.jsx` a las listas: **cuatro de esos chequeos buscan una forma que en
React no existe.** `paleta` y `temas` buscan color escrito adentro de `style="..."`, y en JSX eso
se escribe `style={{...}}`. `escapado` mira dos cosas que en React no
existen: las plantillas de texto que arman HTML con `${...}` adentro, y los manejadores escritos
en el marcado (`onclick="..."`). En un componente el marcado no se arma con texto y el manejador
se pasa como función, así que **React escapa solo** y el chequeo se queda sin sus dos objetivos;
lo que hay que mirar en su lugar es una sola cosa, `dangerouslySetInnerHTML`. O sea que ese
chequeo se vuelve **más corto y más exigente**, no más largo. `frases` pide que en una pantalla
convertida no quede texto a mano, y hoy reconoce lo convertido por el atributo `data-frase`, que
en un componente no es un atributo sino una llamada.

**Los cinco que sobreviven, y por qué.**

| Chequeo | Por qué no lo afecta |
|---|---|
| `claves` | Lee las 27 migraciones `.sql`. La base no cambia de forma porque cambie la pantalla |
| `esquema` | Lo mismo: las 24 tablas y sus políticas |
| `cajas` | Comprueba que las carpetas cerradas sigan cerradas, con su propio árbol de mentira. No depende de cómo esté escrito el producto |
| `referencias` | Comprueba que cada cita `archivo:renglón` de la documentación apunte a algo. **Va a fallar, y a propósito**: al renombrarse las pantallas, las 154 citas dejan de encontrar su archivo. Es el único que avisa fuerte de la migración, y conviene no apagarlo |
| `copias` | Compara 27 archivos que tienen que ser iguales byte a byte. **No falla, contra lo que decía este renglón hasta el 28 de agosto de 2026**: su lista nombra `.js`, `.json` y `.css`, y ningún `.html`, así que renombrar las pantallas la deja igual —se corrió la simulación y dio los mismos 29 grupos, sin una sola diferencia—. Y **la migración es la ocasión de que deje de hacer falta**: las tres copias existen porque hoy no hay forma de compartir código entre las tres aplicaciones, y con una herramienta de armado sí la hay |

**Lo que se midió y salió al revés de lo esperado.**

Dos chequeos —`contacto` e `identidad`— cargan un archivo del producto y corren **el mismo código
que corre la pantalla**, en vez de una copia: `js/contacto.js` y `js/identidad.js`, con
`createRequire`. Funciona porque hoy **no hay `package.json`**, así que Node los lee como módulos
de los de antes, y los dos archivos terminan en `module.exports`.

Levantar Vite crea un `package.json`, y casi siempre con `"type": "module"`. Lo esperable era que
`require()` fallara. **Se probó, y no falla: devuelve un objeto vacío.** Node lee el archivo como
módulo nuevo, donde `module.exports` no significa nada, y no protesta. O sea que `IDENTIDAD` y
`Contacto` llegan valiendo *nada*.

Que eso se note depende de una casualidad afortunada: los dos chequeos usan lo que cargaron
enseguida y sin preguntar —`IDENTIDAD.nombre` en `scripts/verificar_identidad.mjs:57`,
`Contacto.revisarCon(...)` en `scripts/verificar_contacto.mjs:77`—, así que revientan en el acto y
el `commit` se frena. **Si alguno hubiera preguntado antes «¿tiene nombre?», habría pasado en
verde sin haber comprobado nada.** Es exactamente la trampa que la regla de la empresa describe:
`undefined < 3` da falso, y un control escrito así deja pasar justo el caso que no entendió.

**Qué hacer con esto, en orden.**

1. **Antes de la primera pantalla portada**, no después: agregar `.jsx`/`.tsx` a las listas de los
   nueve que sólo cambian de extensión, y darles a `paleta`, `temas`, `escapado` y `frases` la
   forma que esas cuatro cosas tienen en React.
2. **Que la red se pruebe a sí misma. Hecho el 28 de agosto de 2026, y antes de la migración
   porque protege hoy.** Ningún chequeo puede ya quedar mirando cero archivos y decir ✔: se
   plantan. El cómo está al final de esta sección.
3. **`guiones` no se adapta: se jubila.** Comprueba la sintaxis de los guiones sueltos adentro del
   HTML, y esa categoría desaparece; de eso pasa a ocuparse la herramienta de armado, que no
   compila un componente con un error de sintaxis.
4. **`copias` se jubila también, pero recién cuando las tres copias dejen de existir**, no antes.

**Medido de nuevo el 28 de agosto de 2026, corriendo la red en vez de leyéndola.**

La medición de arriba se hizo leyendo los chequeos. La del 28 se hizo **haciendo la mudanza en
una copia**: el proyecto entero duplicado afuera del repositorio, con los dieciséis `.html`
renombrados a `.jsx` y nada más, y la red corrida contra esa copia. Salió distinto en tres
puntos, y en los tres la lectura había sido optimista.

- **No eran nueve los que se callaban, eran once**, y el número que importa es otro:
  **diecisiete de los veinte chequeos siguieron diciendo ✔.** Sólo tres se pusieron en rojo
  —`frases`, `referencias` y `usos`—.
- **`estilos` era uno de los callados y no estaba en la lista.** Informó *«ninguno de los 0
  atributos `style=` del marcado»* y lo contó como éxito.
- **`copias` no avisa**, contra lo que decía la tabla de los que sobreviven.

Lo que cada uno contó antes y después, que es lo que nadie estaba mirando: `arranque` 10 y 7 → 3
y 3; `botones` 21 y 11 → 1 y 1; `escapado` 46 → 30; `estados` 58, 220 y 45 → 18, 174 y 30;
`estilos` 125, 229, 51 y 28 → 125, 0, 31 y 15; `guiones` 40 → 28; `organizacion` 56 → 40;
`paleta` 53 → 37; `temas` 26 → 10; `trato` 63 → 47; `vocabulario` 62 → 47. `cajas`, `claves`,
`contacto`, `copias` y `esquema` dieron idéntico.

**Lo que se construyó con eso, el mismo día.** `scripts/recorrido.mjs` —que es el punto único por
donde cualquier chequeo pide archivos— tiene ahora dos funciones: `seRevisaron(cuantos, qué)`,
que corta el chequeo si el número es cero y explica que no probó nada, y `hayArchivos(...)`, que
es el recorrido de siempre con esa guarda puesta. **Están conectadas en los diecinueve chequeos
que recorren algo**: dieciséis puntos donde se pedían archivos, y ocho más donde lo que podía
quedar vacío era una lista o un catálogo —las migraciones de `claves` y `esquema`, los grupos de
`copias`, los archivos de tokens de `temas`, las clases de utilidad y las pantallas de
`estilos`, las frases de `frases`, los vocabularios de `usos` y las reglas e idiomas de
`contacto`—.

**Y la guarda tiene su propio vigilante**, porque una regla que se aplica a mano se despega:
`scripts/verificar_red.mjs` es el chequeo número 21 y exige que **cada** `verificar_*.mjs` la
tenga. Lee el archivo **sin sus comentarios**, para que nombrarla en un encabezado no cuente como
tenerla, y lleva una lista de exentos donde cada exento va con su motivo escrito al lado —hoy hay
uno solo, `cajas`, que se arma su propio árbol de prueba y ya comprueba que no venga vacío—.
Se comprobó que puede fallar: en la copia de prueba se le sacó la guarda a `verificar_trato.mjs`,
y lo nombró y salió en rojo.

**Lo que esto todavía no tapa**, y está abierto como pendiente: perder **parte** del corpus sigue
sin avisar. Casi todos los chequeos piden `['.html', '.js']` juntos, así que renombrar las
pantallas les deja los treinta `.js` y la guarda no se dispara. Con la guarda puesta, la misma
simulación pone en rojo **uno solo más** que antes, `guiones`, que es el único que pide `.html` a
secas. Exigir que cada extensión nombrada encuentre algo rompería hoy mismo, porque
`scripts/verificar_identidad.mjs:39` nombra `.webmanifest` y `.txt` y el proyecto no tiene ni un
archivo de ninguna de las dos. Elegir entre las salidas posibles es decidir una política de
exenciones, y eso no se inventa acá.


### El chequeo veinticuatro: que la copia del teléfono no sirva texto viejo

*(30 de agosto de 2026.)*

**Qué pasó.** Al convertir a los tres idiomas los textos de la aplicación del Asistente, las
frases nuevas quedaron en las tres copias del catálogo, el servidor las entregaba, y la pantalla
seguía en castellano. Contestaba la copia que el programa guarda adentro del navegador para poder
abrirse sin señal: `asistente-v18`. Lo único que hace caducar esa copia es el nombre con que se
guardó —`CACHE_NAME`, `pwa-asistente/service-worker.js:7`—, y ese nombre se sube a mano.

**Por qué es peor que un error común.** La comprobación en el navegador **no puede fallar sola**:
mientras conteste la copia vieja, verificar una frase nueva da el resultado de antes y se lee como
que el cambio no anduvo. Es la regla «una prueba que no puede fallar no prueba nada» vista desde
el lado del navegador, y no había nada que la cuidara.

**Qué hace el chequeo.** `scripts/verificar_sinconexion.mjs` busca por nombre todos los
`service-worker.js` del proyecto —el día que haya un tercer programa para el teléfono entra
solo— y les exige dos cosas. Una: que ninguno de los archivos de `ASSETS_TO_CACHE` haya cambiado
después del commit donde se puso el `CACHE_NAME` que el archivo tiene hoy; si el número que hay
no está en ningún commit, es que se acaba de subir y eso es justo lo que se pide. Dos: que todos
esos archivos existan, porque `cache.addAll()` es todo o nada y un solo 404 tira abajo la
instalación entera sin decir nada.

El commit del número **no se busca con `git log -S`**, que informa el commit donde la cuenta de
apariciones cambió y no distingue el que puso el número nuevo del que sacó el viejo: se camina el
historial del archivo del más nuevo al más viejo mientras el número siga siendo el mismo.

**Se comprobó que puede fallar**, las dos reglas por separado: con un renglón agregado a
`pwa-asistente/index.html` nombró el archivo y el número que había quedado atrás, y con una
entrada de mentira en la lista nombró el archivo que no existe. Los números se subieron a mano
esta vez —`asistente-v19` y `familia-v17`—, y desde ahora olvidarse rompe el commit.

### La tabla del estado real ya no se escribe a mano

*(30 de agosto de 2026)*

El README abre con una tabla de números bajo el título «Estado real», con la fecha en que se
midió al lado. Al ir a corregir un renglón apareció que la tabla no estaba vieja: estaba
**equivocada desde el día que se midió**. Decía 24 migraciones cuando ese día había 27, y 13
chequeos cuando ese día había 14. Contar a mano cuarenta archivos sale mal, y sale mal en
silencio, porque un número escrito con su fecha al lado parece verificado.

**Y este mismo párrafo lo estaba cometiendo.** Decía «hoy hay 42» migraciones y «hoy hay 24»
chequeos, y para el 31 de agosto de 2026 los dos números eran falsos: eran 47 y 26. Los «hoy» se
sacaron y **no se reemplazaron por otros**, porque el punto de la anécdota no necesita ninguno y
cualquier número suelto que se escriba acá vuelve a envejecer solo.

Ahora la tabla sale de `scripts/medir_estado.mjs`, que la mide y la deja escrita en el README
con `--escribir`. **No es un chequeo**: no se planta ni tiene opinión, informa, y por eso no se
llama `verificar_` y `scripts/verificar_todo.mjs` no lo levanta. Recorre con el mismo
`scripts/recorrido.mjs` que los chequeos, así que tampoco abre una caja fuerte, y respeta los
finales de línea de Windows del README para que poner al día ocho números no se vea como un
cambio de mil renglones.

Lo único que sigue escrito a mano es de qué es cada servidor de afuera —«dos de tipografías y dos
de bibliotecas»—, porque eso no se puede medir. Está atado a que sean cuatro: el día que aparezca
un quinto, el renglón dice que hay que escribirlo de nuevo en vez de repetir la frase de antes.

### El texto que carga una migración también es texto visible

*(30 de agosto de 2026)*

`verificar_trato` y `verificar_vocabulario` revisan cómo está escrito el castellano que ve una
persona, y los dos tenían `supabase/` en la lista de carpetas que no abren. La lista estaba
pensada para código, y una migración es código —pero además **carga texto que después se lee en la
pantalla**: las etiquetas de los 24 vocabularios entran en la base escritas en
`supabase/migrations/0039_el_catalogo_general_entra_en_las_tablas.sql`, y las cuatro partes de
las 19 Guías de cuidado en `supabase/migrations/0042_las_diecinueve_guias_generales.sql`. Son 76
textos de guía más 166 etiquetas que nadie estaba mirando: una guía podía tutear al Asistente y no
se sabía hasta verla en el teléfono.

Ahora los dos abren `supabase/` y miran también los `.sql`. De un `.sql` se mira **sólo lo
rotulado `"es-AR"`**, sea una frase o una lista de frases, y eso lo resuelve
`visibleDeMigracion()` en `scripts/texto_visible.mjs:139`. Elegir por el rótulo del idioma y no
por el lugar deja afuera por construcción las sentencias, los nombres de tabla, los comentarios y
los otros dos idiomas, que es más seguro que sacarlos después: por eso esta función no necesita
`soloCastellano()` —no borra los otros idiomas, nunca los mira—.

**Se comprobó que puede fallar**, y con texto de verdad y no con un comentario agregado al final:
se cambió una señal de alarma real de la guía del ACV por «Fijate si el cuidador nota la caída de
un lado de la cara», y los dos chequeos la nombraron en su renglón exacto. Y se comprobó lo
contrario, que es lo que suele quedar sin probar: en `0039` hay dos etiquetas en portugués que
dicen «Cuidador domiciliar» —que en portugués es la palabra correcta— y ninguna de las dos se
informa. Los archivos revisados pasaron de 65 a 107 en el trato y de 64 a 106 en el vocabulario.

### El chequeo veinticinco: clases nombradas que ninguna hoja declara

*(30 de agosto de 2026)*

**Qué se encontró.** El campo de fecha y la lista de horarios de `solicitar-asistente.html`
llevaban `class="form-control"`, que es el nombre que usa Bootstrap y que este proyecto no
declara en ninguna parte: cero apariciones en los diez `.css` y en los `<style>` de las
pantallas. Con ellos aparecieron dos bandas —`insurance-section` y `care-manager-section`— y un
envoltorio, `inner-hero-content`, igual de inexistentes.

**Y hay que decir con cuidado qué estaba roto, porque no era lo que parecía.** Los dos campos
**se veían bien**: `css/styles.css:599` declara `.form-group input, .form-group select,
.form-group textarea` y los dos están adentro de un `.form-group`, así que el estilo les llegaba
por descendencia. `form-control` no dibujaba nada ni tapaba nada; era peso muerto. El daño es de
lectura, y por eso dura: el marcado afirma que ese campo tiene un estilo propio, alguien lo va a
buscar a la hoja el día que haya que cambiarlo, y no está. Las dos bandas sí tenían el dibujo
escrito a mano en su atributo `style=`, nombrando además una clase que nadie declaraba; ahora
dicen en `css/styles.css` exactamente lo que decían ahí.

**El chequeo.** `scripts/verificar_clases.mjs` compara toda clase nombrada en un `class="…"`
contra tres fuentes: las hojas `.css`, los `<style>` escritos adentro de una pantalla —que es
donde vive buena parte de este producto— y **los nombres que cualquier guion mencione entre
comillas**, porque una clase también sirve de agarradera para el programa y ésas no se dibujan.
De las 345 nombradas, cinco existen sólo por esa tercera vía: `btn-next-step`, `btn-prev-step`,
`fade-in`, `tenant-logo` y `wizard-step-pane`.

Font Awesome es la única familia exenta, y se saltea por prefijo —`fas`, `far`, `fab` y todo lo
que empiece con `fa-`— porque su hoja no está en este repositorio. La excepción está escrita
adentro del chequeo para que agregar una segunda cueste discutirlo.

**Se comprobó que puede fallar**, y de las dos maneras. El detector se prueba a sí mismo contra
once casos escritos —una clase comentada que no cuenta, `fas` y `fa-user` que no se informan, un
selector con varias clases de un saque del que hay que ver todas y no sólo la primera—, y se
planta si alguno da vuelto. Y sobre el proyecto de verdad: se le devolvió el `class="form-control"`
al campo de fecha, informó la clase y el archivo, y el archivo se dejó como estaba.

### El aislamiento de las Guías se probó desde la pantalla, y esa prueba duró unas horas

*(30 de agosto de 2026)*

**Lo que se probó.** Con las dos coordinadoras ficticias, cada una escribió desde
`guias-prestadora.html` la guía de su Prestadora, la publicó con quién la revisó y cuándo, y
después se miró desde la sesión de la otra: `guiasQueVe:1, veLaDePresDemo:0, cambioLaDePresDemo:0,
borroLaDePresDemo:0`. Con las dos cargadas, `scripts/verificar_guias.mjs:268` pudo hacer por fin
la comparación que tenía escrita desde el principio —lo que la puerta `guias_de` le devuelve a una
contra lo que le devuelve a otra— y pasó.

**Lo que pasó unas horas después.** La base de esta máquina se volvió a levantar de cero y las dos
guías se fueron con ella. El chequeo no falló: volvió a decir que no podía probar nada, que es lo
correcto y también lo inútil. **Una prueba que vive sólo en datos cargados a mano es una foto, no
un chequeo**, y la regla del producto ya lo decía —«el seed carga siempre al menos dos Prestadoras
con datos, porque sin eso la prueba de aislamiento no se puede correr», `CLAUDE.md` §3—.

**Cómo quedó.** `supabase/migrations/0045_cada_prestadora_ficticia_con_su_propia_guia.sql` carga
las dos guías propias, y con eso la comparación corre en cualquier base recién construida,
incluida la publicada, donde antes no había ninguna. Las dos escriben sobre **la misma** patología
—`alzheimer`— con texto distinto cada una, y eso es lo que le permite fallar: sobre opciones
distintas los textos no podrían coincidir nunca y el chequeo pasaría siempre, incluso con el
aislamiento roto. La tercera Prestadora ficticia se deja sin guía propia a propósito, que es el
caso de quien no escribió ninguna.

**La firma se escribe ahí y no se escribió en la 0042**, y la línea que las separa es a quién
alcanza cada guía: una general la lee el personal de cualquier Prestadora, incluidas las reales, y
esa firma la pone una persona que se hace responsable; una propia no sale nunca de la Prestadora
que la escribió, y estas dos son ficticias, firmadas por personas inventadas igual que las
Familias y los Asistentes que esas mismas Prestadoras ya tienen cargados. Ninguna guía general se
publica en la 0045.

**Se comprobó que puede fallar**, y con el caso que importa: se le copió a una Prestadora el texto
de la otra en la base de esta máquina, el chequeo nombró la guía y las dos Prestadoras, y los
datos se dejaron como estaban. La propia migración se defiende igual: se planta si no quedaron dos
guías publicadas, y también si las dos dicen lo mismo.

### La dirección de la base estaba escrita dos veces, y ninguna de las dos mandaba

*(30 de agosto de 2026 — cierra el pendiente 106)*

**Qué pasaba.** `js/apiClient.js` declaraba la dirección del servidor y su clave publicable, y
`js/auth.js` las declaraba otra vez, con el mismo valor. No era una copia de la otra: eran dos
afirmaciones sueltas del mismo hecho, sin ninguna que mandara sobre la otra, y quien cambiara una
no tenía forma de enterarse de que había otra. Con las tres copias del pendiente 13, el mismo
valor estaba escrito seis veces.

**Cómo se descubrió.** Haciendo que el servidor local apuntara a la base de esta máquina.
Cambiada una sola, las pantallas leían de una base y le pedían la sesión a la otra, donde esas
cuentas no existen; salía «el correo o la contraseña no coinciden», que no dice ni de lejos lo que
estaba pasando. `scripts/servidor_local.py` se acomodó entonces reemplazando la dirección en
**todo** `.js` que sirve, y por eso lo sigue haciendo: el día que alguien la vuelva a escribir en
otro archivo, esto no va a servir una copia a medias.

**Cómo quedó.** Se declaran en `js/apiClient.js:8-9` y en ningún otro lado. `js/auth.js:31-32`
las lee de `ClienteDatos`, y si ese archivo no se cargó antes se planta con un mensaje que dice
qué falta, en vez de dejar un `ClienteDatos is not defined` suelto en la consola de una pantalla
cualquiera. El orden de los `<script>` ya era el correcto en las doce pantallas que cargan los
dos, y aun así se comprueba: un orden que hay que recordar se olvida.

**El chequeo veintiséis, `scripts/verificar_base.mjs`, mira cuatro cosas y las cuatro hacen
falta:**

1. Que la dirección y la clave no estén escritas fuera del grupo de copias registrado. La lista de
   dónde se permite sale de `scripts/verificar_copias.mjs:35`, no de una segunda lista escrita
   adentro del chequeo: si mañana el original cambia de nombre o gana una copia, se entera solo.
2. Que `js/auth.js` siga sacándolas de `ClienteDatos` **con una asignación**. Sin esto, borrar el
   cableado dejaría el chequeo pasando: cero apariciones fuera del original es exactamente lo que
   devuelve un producto que ya no se conecta a ninguna base. Y se pide la asignación y no la
   mención, porque el nombre aparece también en el aviso de arranque.
3. Que toda pantalla que carga `js/auth.js` cargue antes `js/apiClient.js`.
4. Que en ningún archivo haya nada con forma de credencial que no sea la publicable. Son cinco
   formas: una clave secreta de la base, un jetón firmado, una dirección de base con la
   contraseña adentro, una clave privada en formato PEM y una clave de AWS. Ninguna va al
   navegador nunca, ni siquiera en el archivo que sí puede tener la publicable, así que esta
   cuarta no tiene exentos.

**Y las cinco formas se eligieron por una sola condición: que no tengan hoy ningún uso legítimo.**
Se contó sobre los 224 archivos de texto del proyecto y las cinco dan cero. Lo único con forma de
credencial que hay escrito son las tres apariciones de la clave publicable —el original y sus dos
copias, decidido y anotado en `docs/INVENTARIO.md:383`— y cinco contraseñas de cuentas ficticias
adentro de los guiones de prueba, que es como se entra a la base de esta máquina para probar. Por
eso la contraseña escrita a mano **no** entra en la lista: daría cinco rojos que habría que
perdonar de a uno, y una lista de perdones sobre credenciales es exactamente lo que esta regla no
puede tener. Un exento acá sería una credencial subida con permiso.

Las tres formas nuevas se falsificaron de las dos maneras. Cada una tiene en la autoprueba un caso
que **tiene** que dar rojo y otro parecido que **no** debe darlo: una dirección de base sin
contraseña —`postgres` hacia `localhost`, que es como se escribe en la documentación—, un
certificado público, que empieza igual que una clave privada pero es lo contrario, y una palabra
cualquiera que arranca con las mismas cuatro letras que una clave de AWS. Y además se probó en
serio, metiendo un archivo con las tres formas adentro del proyecto y comprobando que el chequeo se
pone rojo. La primera de las tres se falsificó sola: la escribí de ejemplo en el encabezado del
propio chequeo, y el chequeo se plantó señalando su propio archivo.

**El chequeo no escribe adentro ninguno de los valores que busca.** Los lee del proyecto, y los de
su autoprueba los arma por pedazos. Así no hay que hacerle una excepción a sí mismo, que es la
manera más silenciosa de romper un chequeo como éste.

**Se comprobó que puede fallar, con los cuatro casos, uno por uno:** un archivo suelto con la
dirección adentro, el cableado de `auth.js` apuntado a otra cosa, `apiClient.js` cargado después
de `auth.js` en `acceso.html`, y un archivo con una clave inventada con forma de secreta. Los
cuatro dieron rojo y nombraron el archivo; todo se dejó como estaba.

**Y se comprobó que sigue funcionando donde importa**, que es entrar: con el servidor local
apuntando a la base de esta máquina, la coordinadora ficticia de una de las dos Prestadoras entró
por `acceso.html`, cayó en `panel-prestadora.html` con rol `coordinador` y su Prestadora resuelta,
y las llamadas de la pantalla —perfil, Prestadora, legajos— contestaron todas. El archivo servido
no nombra ninguna base: la única que nombra alguna es `js/apiClient.js`.

### La configuración de fábrica se sembró una vez, y las que nacieron después nacieron sin nada

*(30 de agosto de 2026 — cierra el pendiente 97)*

**Qué pasaba.** La migración 0018 le dejó a cada Prestadora su puntaje de fábrica —una fila en
`puntaje_prestadora` y cinco ponderaciones que suman 100— y lo hizo por un motivo que
escribió ahí mismo: *«una tabla vacía no dice "todas valen uno", dice "todavía nadie configuró
esto"»*. Lo que faltaba es que ese `insert` corrió **una sola vez**, sobre las Prestadoras que
existían ese día. Comprobado contra la base de esta máquina: `presdemo` y `cuidarnorte` tenían 1 y
5 filas; `cuidarsur`, que nace en la 0035, tenía 0 y 0. Y le pasaba lo mismo a toda Prestadora que
entrara por la puerta de alta de CeltaTech, porque `alta_de_prestadora` —nacida en la 0023 y reescrita
por última vez en la 0025— escribe la fila de `tenants` y nada más.

**Dónde se puso el arreglo, y por qué ahí.** En un disparador sobre `tenants`
—`supabase/migrations/0046_toda_prestadora_nace_con_su_configuracion.sql`—, no adentro del alta.
Hay dos caminos por los que nace una Prestadora, la puerta de alta y una migración, y **el que
falló fue el segundo**: ponerlo adentro del alta arreglaba el camino que nunca se rompió. El
disparador llama a `configuracion_de_fabrica_del_puntaje`, que es también la que corre el arreglo
de las que ya habían nacido sin ella: qué es la configuración de fábrica se dice en un solo lugar.

**Lo que no toca.** La Prestadora que ya tiene ponderaciones cargadas no se toca, ni siquiera si
tiene menos de cinco: un reparto de tres comprobaciones es alguien que borró dos a propósito, y
completárselo con veintes le rompería el total de 100 sin avisarle. Se siembra la que no tiene
**ninguna**, que es la que nunca configuró nada. Se comprobó: con una Prestadora dejada en tres
comprobaciones, con reparto propio y sin calificar, la función corrió y no cambió ni un valor.

**Se comprobó por los dos caminos y se comprobó que la prueba puede fallar.** Una Prestadora
insertada a mano y otra creada por `alta_de_prestadora` nacieron las dos con 1 fila de puntaje y 5
ponderaciones que suman 100; sacando el disparador, la misma alta quedó en 0 y 0. Las tres pruebas
corrieron adentro de transacciones que se deshicieron, así que no quedó cargada ninguna Prestadora
de prueba. La migración además se planta sola si al terminar queda alguna Prestadora sin
configuración o si el disparador no quedó puesto, y correrla dos veces no duplica nada.

**Y la sexta regla del chequeo del esquema**, `scripts/verificar_esquema.mjs`, es lo que queda de
esto para la próxima: **toda siembra que recorre las Prestadoras que existen hoy tiene que dejar
además un disparador sobre `tenants`**. Un `insert … select … from public.tenants` sin acotar corre
una vez y no vuelve; el disparador es lo que atiende a las que vengan. No se exige que estén en la
misma migración —acá el arreglo llegó veintiocho migraciones después— pero sí que estén las dos. La
regla sigue un salto de llamadas, porque el disparador de la 0046 no siembra él mismo sino que
llama a la función que sabe cuál es la configuración de fábrica, y resuelve los renombres, porque
la 0022 le cambió el nombre justo a una de las dos tablas que siembra la 0018. Se comprobó que
puede fallar contra el contenido real: sacándole el disparador a la 0046, las dos siembras de la
0018 se pusieron en rojo con el nombre de hoy de cada tabla.

### Ocho avisos que ya no aparecen, y un aviso que ahora dice quién los pidió

*(30 de agosto de 2026 — cierra el pendiente 101)*

**Qué decía el pendiente.** Al abrir `registrar-asistente.html`, la consola escribía ocho veces
`Catálogo: no existe la frase «null».` — o sea `Catalogo.frase(null)`, que avisa y devuelve texto
vacío. No rompía nada visible, y por eso llevaba ahí sin que nadie lo mirara: ocho renglones rojos
en la pantalla que más se usa enseñan a no leer la consola. Lo que quedaba abierto no era el
síntoma sino la pregunta: **quién los pedía**.

**No se reprodujo, y no por falta de buscarlo.** Se enganchó el aviso en el único lugar del
proyecto que lo escribe —`js/catalogo.js`, un solo `console.error` en los tres archivos— para que
guardara además la pila de llamadas, y se abrió la pantalla en cinco escenarios: con el árbol de
hoy contra la base de esta máquina; con el árbol de hoy contra la base publicada; con el árbol
tal como estaba el 29 de agosto, que es el día del informe, sacado a una copia aparte del
repositorio; en la publicada, directamente; y en inglés. **Cero avisos en los cinco.** No fue una
pantalla a medio cargar: los nueve catálogos de la página resolvieron sus opciones —género,
condición fiscal, tipo de Asistente, nivel educativo, certificaciones, patologías, tareas de
cuidado, modalidades y retiro— y `frase()` se llamó treinta veces, ninguna con clave nula. También
se descartó que hubiera una copia sin conexión sirviendo archivos viejos: no hay ninguna
registrada en esa dirección.

**La prueba puede fallar**, que es lo que la hace valer: pedidas a mano una clave nula y una
inventada, las dos quedaron registradas con su pila. Sin eso, «no apareció» y «no estaba mirando»
se escriben igual.

**Así que no se sabe qué los causaba, y se dice.** Lo que sí se arregló es lo que dejó el
pendiente abierto tres días: que el aviso no sirviera para encontrar al culpable.

**Cómo quedó el aviso.** `js/catalogo.js` avisa ahora tres cosas donde antes avisaba una:

1. **Desde dónde se pidió la frase.** La pila de llamadas va adentro del mensaje. La próxima vez
   que aparezca uno de estos, el nombre de quien llama está en el mismo renglón rojo, y no hay que
   volver a enganchar nada.
2. **Una vez por clave, no una por llamada.** La misma clave pedida veinte veces mientras se
   dibuja una lista es un solo problema. Ocho renglones iguales no se leen.
3. **Una clave nula no es una clave escrita mal.** «Se pidió una frase sin clave» y «no existe la
   frase tal» son fallas de lugares distintos —la primera es de quien llama, que no le pasó
   ninguna; la segunda es una frase que falta en el catálogo—, y el mensaje las separa.

Lo que **no** cambió es lo que la pantalla ve: una clave que falta sigue devolviendo la cadena
vacía. La otra salida que el pendiente aceptaba —que una clave nula devolviera vacío **sin**
avisar— se descartó a propósito: `frase(null)` es siempre una falla de quien llama, y callarla
deja el producto sin la única señal que lo dice.

### Las cuatro columnas que ninguna política miraba

*(31 de agosto de 2026 — cierra los pendientes 66, 74, 75 y 82)*

**Eran cuatro pendientes y era un solo defecto cuatro veces:** la política decide por fila, y lo
que importaba era qué columna se toca. Las dos políticas de `caregivers` son `for all` y no nombran
ninguna columna; la de `profiles` dice «cada quien escribe su propia fila»
(`supabase/migrations/0005_acceso_por_sesion.sql:145` a `:180`). Las tres contestan bien la
pregunta que se les hace —«¿esta fila es suya?»— y ninguna contesta la que hacía falta. Cuando la
respuesta es sí, quien pide escribe la fila **entera**, incluidas las columnas donde vive el
veredicto de otro:

- **66** — un Asistente se ponía solo `verification_status`, que es el sello que dice que la
  Prestadora le revisó los papeles, y con eso entraba al directorio público como validado.
- **74** — el personal de una Prestadora se pasaba a su nombre, o al de un tercero, el `user_id`
  de un legajo ajeno.
- **82** — `role` y `tenant_id` de `profiles`, que es de donde salen `es_personal_de_prestadora()`
  y `prestadora_actual()`, o sea las expresiones sobre las que se apoyan las políticas de todas
  las tablas.
- **75** — con el sello puesto, cambiar `documents` dejaba el sello hablando de papeles que ya no
  estaban.

**Por qué un disparador y no un permiso por columna.** Porque el permiso es por rol, y acá los dos
lados son el mismo rol: el personal de la Prestadora y el Asistente entran los dos como
`authenticated`. Quitarle a ese rol la escritura de `verification_status` se la quitaría también a
quien tiene que ponerlo. Lo que los distingue no es el permiso, es la política, y **una política
recibe la fila, no el cambio**. Un disparador `before` es lo único que ve el valor viejo y el
nuevo a la vez.

**Cómo quedó**, en `supabase/migrations/0047_las_columnas_que_ninguna_politica_miraba.sql`. Dos
disparadores, uno por tabla:

- Sobre `caregivers`, `before insert or update`: en el alta el sello **no se toma del pedido**, lo
  pone el disparador; en la modificación, si cambia y quien pide no es personal, se rechaza. El
  `user_id` no cambia después del alta, para nadie. Y el papel nuevo baja el sello, que es la
  opción A.
- Sobre `profiles`, `before update`: `role` y `tenant_id` no cambian desde una sesión. **Acá no hay
  excepción para el personal, y es a propósito:** la política de `profiles` no le deja a nadie
  alcanzar el perfil de otra persona, así que lo único que un permiso al personal habilitaría es
  ascenderse a sí mismo y mudarse solo de Prestadora, que es justo el agujero.

**Y sin sesión el disparador no interviene.** Cuando `auth.uid()` es nulo no hay a quién exigirle
nada: es la base hablando consigo misma —una migración, una siembra— o la puerta de administración
de CeltaTech, que ya la cuida quien tiene esa clave. Sin esa salvedad, toda migración que sembrara
un legajo ya validado lo habría escrito sin sello y sin decirlo.

**El permiso por columna del 82 se conservó, no se reemplazó.**
`grant update (full_name) on public.profiles to authenticated`
(`supabase/migrations/0005_acceso_por_sesion.sql:160`) sigue siendo la primera puerta; el
disparador es la segunda, que es la que se lee donde se la busca. El 82 nunca fue un agujero
abierto sino una trampa armada: la protección no vivía donde se la lee, y ya se había perdido una
vez sin que nadie se enterara —la migración 0032 se la llevó puesta y la 0033 la repuso—. La
migración 0047 agrega además una comprobación que se planta si alguna migración futura vuelve a
conceder `update` sobre `profiles` sin nombrar columnas.

**Sobre el pendiente 75, el Desarrollador eligió la opción A: el papel nuevo baja el sello.** Había
tres defendibles —bajarlo, prohibir el cambio, o permitirlo y anotarlo para revisar después— y la
elegida es la que hace que el sello signifique siempre lo mismo: **habla de los papeles que están
hoy**. La tercera era la única que dejaba el sello mintiendo, porque mientras nadie revisara, el
directorio seguía diciendo «validado» sobre un papel que nadie miró. El costo de la A —volver a
revisar tras un cambio de papel— cae sobre la Prestadora, que es quien firma, y no sobre la
Familia, que es quien no tiene cómo saber.

**Con una excepción, y también a propósito: cuando el papel lo cambia el personal, el sello no se
mueve.** Es quien firma, y está viendo lo que sube en el mismo acto; bajárselo a sí misma
obligaría a la Prestadora a sellar dos veces cada corrección, que es burocracia inventada por el
sistema.

**Las cuatro pruebas viven en el repositorio y no se corrieron a mano.** Dos ya existían o se
escribieron antes de la migración y **daban rojo a propósito**; las cuatro dan verde ahora, sin que
se las haya tocado:

| Prueba | Qué mide | Cómo arrancó |
|---|---|---|
| `scripts/probar_sello_de_la_prestadora.mjs` | 66 | 3 en rojo |
| `scripts/probar_de_quien_es_el_legajo.mjs` | 74 | 2 en rojo de 3 |
| `scripts/probar_el_rol_y_la_prestadora_del_perfil.mjs` | 82 | en verde, y se explica abajo |
| `scripts/probar_el_papel_nuevo_baja_el_sello.mjs` | 75 | escrita después de elegida la opción |

**Y cada una lleva su comprobación de sostén, que es lo que la hace poder fallar.** Sin eso,
cerrar la tabla entera dejaría todos los rechazos en verde sin haber arreglado nada. Que la
persona pueda corregirse el teléfono y el nombre; que la coordinadora pueda editar un legajo de su
Prestadora y no alcance el de la ajena; que cambiar un papel de un legajo **sin** sellar salga bien
y no mueva nada.

**Las dos que no arrancaron en rojo, dichas como fueron y no como convenía.** La del 82 arrancó
entera en verde, porque el permiso por columna la sostenía: ahí no había agujero que cerrar sino
una protección escrita donde nadie la lee. Que puede fallar se comprobó aparte, poniendo a mano
`grant update on public.profiles to authenticated` en la base de esta máquina: dos comprobaciones
se pusieron en rojo, y el permiso se dejó exactamente como estaba. Y de las tres del 74, la tercera
—que la persona regale su propio legajo— ya estaba tapada por el `with check` de «Su propio
legajo». La del 75 se escribió después del arreglo, así que también se comprobó bajándole el
disparador a la base local: la comprobación del sello se puso en rojo y el disparador se repuso.

**Un rojo arrastrado se lee igual que un rojo propio**, y eso costó una corrida. La prueba del 74
empezó midiendo sus tres comprobaciones sobre un mismo legajo, y la segunda leyó lo que había
dejado la primera. Ahora cada comprobación estrena el suyo. Y los destinos de los traspasos son
cuentas **sin** legajo, porque `user_id` tiene índice único —`idx_caregivers_user_unico`—, así que
apuntar a alguien que ya tiene el suyo devuelve un conflicto: rechazado por chocar contra un índice
no es lo mismo que rechazado por no tener derecho.

**Las cuatro pruebas limpian lo que crearon**, incluidas las cuentas. Una cuenta ficticia ascendida
a coordinador es basura con permisos, y justo aparece en la corrida en la que uno está mirando otra
cosa.

**Qué se comprobó después, y contra qué.** Las cuatro pruebas en verde y los veintiséis chequeos
pasando contra la base de esta máquina; la migración aplicada a la base publicada desde la línea de
comandos y confirmada con `supabase migration list --linked`. De las tres pruebas que ya existían,
`probar_permisos_en_vivo.mjs` sigue con su único rojo declarado —el pendiente 67— sin moverse;
`probar_aislamiento.mjs` no corre contra el servidor publicado porque ahí el alta pide confirmar el
correo, que es una limitación de siempre y no de esta tanda.

**Lo que esta tanda destapó, y lo que se creyó ver mal.** `probar_alta_y_baja.mjs` pasó a dar 9 de
12 contra la base publicada, y el motivo no es el 0047. La primera lectura fue **equivocada y se
escribió acá antes de verificarla**: se dijo que desde la migración 0046 ninguna Prestadora se
podía dar de baja. **La puerta de baja de CeltaTech no borra nada ni borró nunca** —marca `activo`,
`suspendido` o `cancelado`, `supabase/functions/alta-y-baja/index.ts:102`—, y el estado protege de
verdad: por el camino real, `directorio_de()` devuelve las personas con la Prestadora activa y
ninguna con la Prestadora suspendida o cancelada. El `409` era de **la limpieza de la propia
prueba**, que sí borra con la llave de administración y chocaba contra las seis filas de puntaje
que la 0046 le cuelga a toda Prestadora al nacer; ya está arreglado borrando en orden. Lo que sí
queda abierto —y es el aporte real de haberlo mirado— es que **nadie decidió nunca qué pasa con las
personas si alguna vez se borra una Prestadora**, y el esquema hoy se contradice: el legajo
sobreviviría y sus papeles no podrían. Está en `docs/PLAN_BAJA_DE_PRESTADORA.md`, sin aprobar, y es
el **pendiente 107**.

**Y lo que la opción A todavía le debe a quien la sufre.** Que la persona vea, **antes** de cambiar
un papel, que hacerlo le baja el sello. Hoy no se puede escribir: ninguna pantalla cambia
`documents` —el mapeo existe en `js/apiClient.js:1157` y no lo usa nadie— y el chequeo de frases se
pone en rojo con toda frase de catálogo que ninguna pantalla nombre. La frase entra el día que
entre la pantalla; es el **pendiente 108**.

**Lo que sigue sin verse, que es el pendiente 70.** Cerrar estos cuatro impide que alguien se selle
solo; **no** hace que se vea quién fue revisado y con qué. La lista `comprobaciones` de la tarjeta
del directorio sigue vacía para todo el mundo, porque ninguna pantalla escribe
`verificaciones_asistente`. O sea que la única señal que le permitiría a una Familia distinguir un
legajo revisado de uno que no lo está sigue sin distinguir nada.

### La aplicación de teléfono del Asistente preguntaba una zona que ya no cambiaba nada

Cerró el pendiente 94, el 31 de agosto de 2026.

- **Lo que había era peor que no tener nada.** El formulario del teléfono pedía «Zona de
  Cobertura» en un campo de texto libre escrito a mano adentro del propio HTML, y lo guardaba en
  `caregivers.zone`. Desde la migración 0036 el directorio y el perfil se arman con `zonas` y
  `zonas_texto`, así que quien corregía su zona desde el teléfono **veía que se guardaba y no
  cambiaba ni su tarjeta del directorio ni su perfil**. El campo tampoco estaba en el catálogo:
  seguía en castellano en las tres versiones de idioma.
- **Ahora pregunta igual que la web.** El teléfono carga `js/zonas.js`
  (`pwa-asistente/index.html:914`), lo monta en el hueco de
  `pwa-asistente/index.html:502` y el módulo decide la forma: la lista con casillas cuando la
  Prestadora tiene zonas cargadas, el texto libre cuando todavía no cargó ninguna. Comprobado en
  el navegador **las dos**, contra la base de esta máquina.
- **Marcar una región entera vale por toda la región, y no duplica.** Medido: al tildar «Zona
  Norte» sus dos municipios quedan apagados y lo que se recolecta es una sola clave, la de la
  región. Y los nombres salen traducidos por el vocabulario `zona`, cosa que el campo escrito a
  mano nunca hizo.
- **La zona sigue siendo obligatoria, y ahora lo cuida el envío.** El `required` del campo viejo
  lo hacía el navegador; una lista de casillas sin tildar no la agarra ningún navegador. Se le
  pregunta al módulo antes de enviar, y si no hay respuesta el formulario vuelve al paso 1 y lleva
  la vista al campo (`pwa-asistente/index.html:2012`).
- **Se guarda donde se lee**: las claves van a `zonas_asistente` y el texto libre a `zonas_texto`,
  por `js/apiClient.js:424` y `:1154`. `caregivers.zone` no la escribe más nadie, y eso abrió el
  **pendiente 109**.
- **Y el 109 se cerró esa misma noche, por la salida que no borra datos.** Se midió
  primero: ninguna pantalla manda `zona` ni `zonaResidencia` al escribir un legajo, así
  que el mapeo de `js/apiClient.js` estaba esperando un dato que ya nadie manda. Se sacó
  de las tres copias, y **la columna se quedó**: guarda la zona de los legajos anteriores a
  la migración 0035 y la leen tres respaldos, así que borrarla sería borrar la zona de
  las personas cargadas antes de que existiera `zonas_asistente`. Que es histórica y de
  sólo lectura **queda dicho en la base**, no en un documento: lo escribe
  `supabase/migrations/0050_zone_queda_dicha_como_historica.sql:31`, porque un comentario
  de columna viaja con el esquema y ahí es donde va a mirar quien la encuentre.
- **Arrastró las tres cosas que el pendiente anticipaba.** `js/zonas.js` entró por primera vez en
  los grupos de copias de `scripts/verificar_copias.mjs:59`, porque hasta hoy ninguna aplicación
  de teléfono lo cargaba; entró en la lista de la copia sin conexión con el número de versión
  subido, o el teléfono ya instalado se quedaba sin él; y las dos frases del campo viejo salieron
  de las tres copias del catálogo, porque el chequeo de frases se pone en rojo con toda frase que
  ninguna pantalla nombre.

---

### «Publicación comprobada» era una prueba que no podía fallar

Salió el 31 de agosto de 2026, al ir a comprobar lo del pendiente 94.

- **Lo que se venía haciendo.** Después de cada `push` se le pedía la raíz a `careonys.com`, y un
  `200` se leía como «publicado». Quedó escrito así en más de un cierre de tarea.
- **Por qué no probaba nada, y son dos motivos.** El primero: `careonys.com` **no es este
  producto**. Es una página de obra de un solo archivo, `noindex`, que hoy no tiene nada que ver
  con el Marketplace. El segundo, peor: contesta ese mismo `200`, con esa misma página, para
  **cualquier** dirección —se le pidió `assets/images/logotipo.png` y una dirección inventada, y
  las dos volvieron `200 text/html`—. O sea que el `200` iba a salir igual con el despliegue roto,
  con el archivo sin subir o con el repositorio vacío.
- **Dónde vive de verdad**: `careonys-marketplace.vercel.app`, que sí contesta `404` a una
  dirección inventada y sirve cada archivo con su tipo de contenido.
- **Y ahora lo comprueba un guion**, `scripts/comprobar_publicacion.mjs`: toma los archivos del
  último commit, los pide al sitio y compara el contenido entero y el tipo contra lo que git
  subió. **Arranca por el control negativo** y se corta ahí si no pasa. Probado en los dos
  sentidos: en verde contra el sitio de verdad, y en rojo contra `careonys.com` —justo el caso
  que engañó—.
- **Compara contra lo que git subió, no contra el disco**, y eso lo corrigió el 31 de agosto de
  2026 el propio guión al dar tres rojos: decía que las tres copias de `js/auth.js` no habían
  llegado, con 305 bytes de diferencia, y los 305 eran los 305 retornos de carro de un archivo
  de 305 renglones. El archivo de trabajo tiene `CRLF` y el objeto que git guarda —el que
  Vercel clona— tiene `LF`. **Un rojo falso en la única herramienta que dice «la publicación
  salió bien» es peor que no tenerla**, porque el día que se ponga roja de verdad ya nadie le
  cree. De paso arregló lo otro, que era más callado: contra el disco también medía los
  cambios sin subir, así que un archivo editado y no publicado salía en rojo por no estar
  publicado.
- **Y compara el contenido, no el tamaño.** Dos archivos distintos del mismo largo pasaban de
  largo, que no es un caso raro —cambiar una palabra por otra de igual largo alcanza—.
  Falsificado con un solo byte dado vuelta: sale rojo y dice desde qué byte difieren. **De
  estos archivos no se imprime una sola letra**, sólo la posición, porque `js/auth.js` es
  justamente el que una vez llevó una clave a la pantalla.
- **No entra en los veintiséis chequeos** a propósito: necesita red y necesita que el despliegue
  haya terminado, así que va al cerrar, después del `push`. Queda escrito en `CLAUDE.md:133`.

---

### El sitio publicado servía la documentación interna entera

Salió el 31 de agosto de 2026, del mismo tirón que lo de arriba: al ir a comprobar bien la
publicación se vio qué más contestaba el servidor.

- **Qué estaba abierto.** No había `.vercelignore`, así que se subía el repositorio entero.
  Cualquiera con la dirección leía `docs/PENDIENTES.md` —125 KB con la lista enumerada de todo lo
  que este producto todavía no resuelve, sección de Seguridad incluida—, `docs/ALCANCE.md`, las 47
  migraciones con cada política de RLS escrita, los guiones de comprobación y el `CLAUDE.md` de
  este producto. Medido pidiéndolos: los cinco contestaban `200`.
- **Qué gravedad tiene cada cosa, sin exagerar ni minimizar.** Que el esquema y las políticas se
  lean **no** rompe el aislamiento: la base no depende de que nadie las conozca, y publicarlas no
  le da a nadie una fila que la RLS no le daría igual. La lista de pendientes es otra cosa: le
  ahorra el trabajo a quien busque por dónde entrar, porque le dice en castellano dónde están los
  agujeros conocidos y cuáles siguen abiertos. Y no hay ningún motivo para publicarla.
- **Cerrado con `.vercelignore`**, que además deja afuera las cajas fuertes por su nombre: hoy no
  llegan porque `git` no las rastrea, pero la línea de comandos de Vercel no mira `.gitignore`, así
  que una publicación hecha desde esta carpeta y no desde el repositorio las habría subido.
- **Quedan servidos a propósito los dos documentos legales**, porque los enlazan las pantallas
  públicas (`index.html:517`, `registrar-asistente.html:539`, `formulario-integral.html:418`). Que
  se muestren estando sin revisión profesional es el pendiente 49 y no se toca desde acá.
- **Comprobado en los dos sentidos.** Antes del despliegue el guion daba rojo en los cinco; después
  da verde, y las quince pantallas del sitio, las cuatro hojas de estilo, el catálogo, el logotipo,
  las dos aplicaciones de teléfono y los dos documentos legales siguen contestando `200` con el
  mismo tamaño que tienen acá.

### La prueba de aislamiento se podía correr, y hacía cinco días que nadie la corría

**El pendiente 45 decía que la comprobación de seguridad más importante del producto había quedado
sin poder correr, y eso era sólo medio cierto.** Lo que no puede correr es contra el servidor
publicado, porque ahí el alta pide confirmar el correo y la prueba nunca llega a tener sesión.
Contra la base de esta máquina corre entera, y el propio encabezado del guion lo dice desde que se
escribió: `scripts/probar_aislamiento.mjs:9`. El 1 de septiembre de 2026 se corrió con `--local` y
**pasaron las 119 comprobaciones**, incluidas las cinco que sólo existen ahí —ascender a alguien a
coordinador para ver si el personal lee los papeles de su Prestadora y no los de la otra, y si no
lee ninguna de las tres tablas de la modalidad—, porque ascender pide la clave de administración y ésa
vive nada más que en el entorno local.

**Conviene no confundir las dos cosas.** La corrida local prueba las migraciones de
`supabase/migrations/`, que son los mismos archivos de los dos lados, y el guion se niega a arrancar
si a la base le falta alguna. Lo que no alcanza a ver es una diferencia de configuración del
proyecto alojado, que no viaja en ninguna migración. Así que el pendiente 45 sigue abierto por lo
que siempre estuvo —el correo— y no por lo otro.

**Y el intento de esa misma noche sin `--local` dejó otra cuenta huérfana en el proyecto alojado**,
que es lo que pasa cada vez: la cuenta se crea, la sesión no vuelve, y borrarla pide la clave de
servicio. Está anotado en el pendiente 45 para que el número que el Desarrollador tiene que limpiar
en Authentication → Users siga siendo el de verdad.

### Tres documentos decían tres números distintos, y ninguno era el bueno

Al escribir lo de arriba aparecieron, de paso, **tres cuentas de cuántas comprobaciones tiene la
prueba de aislamiento, en tres documentos, y las tres equivocadas**: dieciséis en
`docs/INVENTARIO.md`, cuarenta en `docs/PLAN_AUDITORIA.md` y cuarenta y nueve en este mismo archivo.
Son 52. Cada número fue cierto el día que se escribió y después la prueba creció sin que nadie
volviera a pasar por ahí.

**Ninguno de los chequeos podía agarrarlo, y no por descuido: el número no se puede contar
leyendo el archivo.** Hay 44 llamadas a `comprobar()` y salen 52 renglones, porque varias están
adentro de un bucle. Un chequeo estático daría 44 y pondría en rojo a los documentos que dijeran la
verdad. Y `verificar_todo.mjs` corre en el gancho de `commit`, sin red y sin base levantada, así que
tampoco podía correr la prueba para averiguarlo.

**Lo revisa entonces el único que sabe el número: la corrida.** Al terminar, `probar_aislamiento.mjs`
cuenta las que hizo y busca en los cuatro documentos la frase que dice cuántas son, escrita en
letras o en cifras según el documento. Un desajuste **no** dice que el aislamiento falle —eso sería
enseñarle a la próxima persona a desconfiar del mensaje—: el veredicto del aislamiento sale
primero y completo, y el desajuste sale después, como nota al pie, diciendo que se corrige el
documento y no la prueba. El código del añadido está en `scripts/probar_aislamiento.mjs:2114`.

**Comprobado en los dos sentidos**, como pide la regla de la casa: con `docs/INVENTARIO.md` falseado
a propósito la prueba sale con código 1 y nombra el archivo y la frase que buscó; con el número
verdadero sale con 0 y los cuatro documentos dan verde.

### Y la tabla del README decía de sí misma que no quedaba vieja

Tirando de ese hilo apareció el mismo error una vez más, y esta vez en el archivo que cualquiera
abre primero. El README arranca con una tabla de números bajo el título «Estado real», y arriba
dice, con todas las letras, que **no se escribe a mano y no queda vieja**. La segunda mitad era
falsa: decía 31 archivos de JavaScript cuando ya había 32. La cuenta se había corrido esa misma
tarde, al cerrar el pendiente 94, que agregó `pwa-asistente/js/zonas.js`.

**La tabla se mide sola desde el 30 de agosto de 2026, pero nadie corría al medidor.**
`scripts/medir_estado.mjs` la calcula bien; lo que faltaba era que alguien lo llamara. No lo llamaba
el gancho de `commit`, no lo llamaba ningún chequeo, y no lo nombraba ningún documento fuera del
propio README. Un generador que hay que acordarse de correr es un archivo escrito a mano con pasos
de más.

**Ahora lo mira `scripts/verificar_estado.mjs`**, que entra en la tanda del gancho de `commit`. Le
pide los renglones al medidor, los compara con los que están escritos, y si alguno no coincide dice
cuál y con qué comando se arregla. **La fecha queda afuera de la comparación a propósito**: cambia
todos los días, y compararla pondría esto en rojo cada mañana sin que nadie hubiera tocado nada
—un chequeo que ladra todos los días es un chequeo que se aprende a ignorar—. Para poder
importárselo, `medir_estado.mjs` distingue ahora si lo corrieron o lo importaron, y sólo imprime y
escribe en el primer caso.

**Esto sí se puede hacer en el gancho de `commit`, y la prueba de aislamiento no**: estos números
salen de leer archivos, así que se miden sin red y sin base levantada, que es lo único que hay
cuando el gancho corre.

**Comprobado en los dos sentidos**: con un renglón del README falseado a mano el chequeo sale con
código 1 y muestra el renglón escrito al lado del medido; con la tabla al día sale con 0. Y de
paso se comprobó solo: el primer intento salió en rojo porque la tabla decía 26 chequeos y con él
adentro ya eran 27. Además `verificar_red.mjs` lo rechazó la primera vez, con razón —podía pasar
comparando cero renglones contra cero renglones—, y se arregló con `seRevisaron()`.

### Las dos cosas eran la misma, y ahora hay un comando que las junta

Los dos hallazgos del día tienen la misma forma, y conviene decirlo junto porque la conclusión no
es de ninguno de los dos por separado. La prueba de aislamiento sabía correr contra la base de esta
máquina desde que se escribió, y no se corría. El medidor del README sabía medir, y no se corría.
Ninguna de las dos herramientas estaba rota. **Una herramienta que hay que acordarse de correr es
una herramienta que no corre**, y la lista de pendientes no alcanza para acordarse: la de
aislamiento estaba anotada ahí, con un renglón que además decía mal lo que trababa.

Los chequeos que leen archivos ya tenían resuelto ese problema —los corre `verificar_todo.mjs`
desde el gancho de `commit`, sin que nadie los llame—. Las pruebas que necesitan una base levantada
no podían entrar ahí, y quedaban sueltas: seis archivos con seis nombres largos que hay que
recordar de a uno.

**`node scripts/probar_todo.mjs` las corre a las seis.** No es un chequeo más: es el equivalente de
`verificar_todo.mjs` para el otro lado de la línea, el de las pruebas que registran cuentas
ficticias, les hacen escribir y preguntan quién ve qué. Tres decisiones que valen la pena:

- **Las rojas a propósito están anotadas con el pendiente que las explica**, y no tumban la corrida.
  Hoy hay una: `probar_permisos_en_vivo.mjs`, que es el pendiente 67.
- **Pero si una de ésas pasa, la corrida falla igual**, y dice que hay que sacarla de la lista y
  cerrar el pendiente. Una prueba que perdona un rojo para siempre deja de mirar, y con el tiempo se
  vuelve un archivo que dice ✔ sin haber comprobado nada.
- **Las dos que quedan afuera están nombradas adentro del guion y en su salida**, con el motivo:
  `probar_alta_y_baja.mjs` necesita la clave de firma y su limpieza borra datos publicados
  (pendiente 107), y `probar_consulta_publica.mjs` va contra el servidor publicado. Un recorte
  callado se lee como «estaban todas».

**Comprobado en los dos sentidos, y en los dos que importan**: con una prueba inexistente agregada a
la lista salió con código 1 nombrándola; con una roja esperada que en realidad pasaba salió con
código 1 pidiendo cerrar el pendiente; y tal como queda, con la base local levantada, las cinco que
tienen que pasar pasan y la sexta da el rojo que tiene que dar.

### Una prueba de seguridad estuvo en rojo cinco días y nadie la miró, porque el rojo estaba anotado

`scripts/probar_permisos_en_vivo.mjs` pregunta a la base qué funciones puede llamar alguien **sin
sesión**. Pasó en verde el 26 de agosto de 2026, cuando las migraciones 0032 y 0033 cerraron el
pendiente 67. Y desde entonces daba rojo, sin que nadie se enterara, hasta el 31 de agosto.

**Nada se había roto.** Las migraciones 0035, 0038 y 0041 abrieron tres puertas más a `anon` —las
zonas, los vocabularios y las guías— y las tres están abiertas a propósito, con el motivo escrito
al lado en `AL_ALCANCE_ANONIMO` de `scripts/verificar_esquema.mjs`. Lo que estaba mal era otra cosa:
**la prueba llevaba su propia lista, con las tres viejas.** Dos listas de lo mismo se despegan
siempre, y la que se despega es la que nadie mira.

Y no se miró por un segundo motivo, peor: el rojo estaba anotado en `scripts/probar_todo.mjs` como
esperado, **contra el pendiente 67 — que ya estaba cerrado y ya no figuraba en la lista**. Una roja
esperada contra un número que no existe es un permiso permanente para no mirar.

Quedaron cerradas las dos puertas:

- La prueba **importa** la lista de `verificar_esquema.mjs` en vez de tener la suya. Hay un solo
  lugar donde se escribe qué está abierto y por qué.
- `probar_todo.mjs` **comprueba que el pendiente de cada roja esperada siga abierto**, y si no lo
  está corta antes de correr ninguna prueba. Si no puede leer ningún pendiente, también corta: un
  chequeo que no encuentra lo que busca no escribe su ✔.

**Comprobado en los dos sentidos.** La prueba pasa hoy, y sacándole a mano una de las seis puertas
de la lista vuelve a dar rojo —y avisa que quedó inservible si el nombre ya no se encuentra—. La
guarda nueva se probó cambiando el 89 por un número inventado: corta ahí y dice cuál.

---

### Y una tabla de números escrita a mano decía casi el triple de lo que hay

Encontrado el 31 de agosto de 2026, al lado de lo anterior. `docs/PENDIENTES.md` traía el reparto
de los estilos pegados al HTML pantalla por pantalla —qué va a costar más portar, y en qué orden
conviene—: 16 archivos y **687 atributos `style=`**. Hoy son 13 archivos y **247**. Tres de los que
nombraba —`nueva-clave.html`, `recuperar-clave.html` y `acceso.html`— hace días que no tienen
ninguno. Decía además que las dos PWAs suman 763 renglones de CSS en bloques `<style>`; son 960, y
se olvidaba de `examen.html`, que tiene 174.

La tabla llevaba escrito «Contada el 25 de agosto de 2026», que es honesto y no alcanza: una fecha
avisa de que el número puede haber cambiado, no de que cambió. **Un número medido a mano envejece
en silencio.** Es exactamente el defecto que `scripts/verificar_estado.mjs` ya existía para evitar
en el README, aplicado a un documento donde nadie lo había mirado.

**Cómo quedó.** El reparto sale ahora de `scripts/medir_estado.mjs`, que lo escribe entre dos
marcas con `--escribir`, y `scripts/verificar_estado.mjs` lo compara antes de cada `commit` igual
que la tabla del README. Se comprobó que puede fallar de tres maneras distintas: cambiándole un
número a mano, sacando una de las dos marcas, y agregando una pantalla nueva con un `style=`
adentro. Las tres dan rojo y dicen cuál es la diferencia.

---

### Y no era una sola: veinticuatro comentarios del código decían que un agujero seguía abierto

Encontrado el mismo 31 de agosto de 2026, tirando del hilo anterior. Si una prueba pudo quedar
anotada contra un pendiente cerrado, la pregunta que sigue es cuántos textos más hablan en presente
de algo que ya se arregló. Se contaron: **157 citas a un pendiente en 128 archivos**, y 39 apuntando
a un número que ya no está en la lista.

Quince de esas 39 estaban bien escritas y era el detector el que no las entendía: «eran el pendiente
15», «era el pendiente 23», «el pendiente 101 estuvo abierto por eso». El tiempo verbal ya dice que
se cerró. Las otras **24 estaban mal de verdad**, y tres de ellas en el peor lugar posible:

- `probar_de_quien_es_el_legajo.mjs` decía «hoy un coordinador puede ponerse a su nombre el legajo
  de otra persona». No puede desde el 31 de agosto de 2026: lo cerró la migración 0047.
- `probar_el_papel_nuevo_baja_el_sello.mjs` y `probar_el_rol_y_la_prestadora_del_perfil.mjs`
  presentaban los pendientes 75 y 82 como agujeros abiertos, cerrados por la misma migración.

Son tres pruebas que **pasan**, con un encabezado que dice que el producto está roto. Quien las
corra y las vea en verde tiene dos versiones y ningún motivo para creerle a una más que a la otra
—que es exactamente lo que dejó a la prueba de permisos cinco días en rojo sin que nadie mirara—.

**Lo que evita que vuelva a pasar** es `scripts/verificar_pendientes.mjs`, que corre con los demás
antes de cada `commit`: falla si un archivo nombra «pendiente N» y ese N ya no es una fila abierta
de `docs/PENDIENTES.md`, salvo que el texto diga ahí mismo que se cerró. **No pide borrar la cita**
—casi siempre conviene dejarla, porque explica de dónde salió una decisión—: pide que esté en
pasado.

**Qué queda afuera, a propósito.** `docs/ALCANCE.md` —este archivo— y los `docs/PLAN_*.md` narran un
momento con fecha, y las migraciones aplicadas no se editan jamás. Medido: este archivo tiene 122
citas, 66 a pendientes ya cerrados, y ninguna es un error. Pedirle a un relato fechado que hable del
futuro es convertirlo en un documento que hay que reescribir cada vez que se cierra algo.

**Comprobado en los dos sentidos.** El chequeo se prueba a sí mismo contra seis textos de mentira
antes de mirar el proyecto —uno en presente tiene que ser señalado, uno en pasado tiene que pasar,
un «fue» lejos de la cita no tiene que valer—, se planta si no logra leer ningún pendiente abierto o
si no encuentra ninguna cita, y se le agregó a mano una cita a un «pendiente 99999» en el README
para ver que la señala. Después se sacó.

---

### El pendiente 89 dejó de ser una afirmación y pasó a ser una prueba

El pendiente 89 decía, desde el 27 de agosto de 2026, que subir dos veces el mismo papel borra el
primero. Estaba comprobado leyendo las dos puntas del código y nada más: no había forma de que el
día que se arreglara alguien se enterara, ni de que si mañana se rompía de nuevo algo lo dijera.
Ahora hay `scripts/probar_pisado_de_archivos.mjs`, que lo mide.

**Lo difícil no era medirlo: era medirlo sin haber elegido todavía el arreglo.** El pendiente tiene
tres salidas —que el camino lleve la fecha, que el depósito guarde versiones, o que pisar quede
prohibido— y la elección es del Desarrollador. Una prueba escrita contra una de las tres da rojo
para siempre si se elige otra, y ese rojo se lee como «no se arregló». Así que la prueba mira **las
dos causas por separado**, y con que se corte una alcanza:

- **La causa A, contra la base:** sube un papel ficticio, sube otro al mismo camino, y pregunta si
  el primero sigue estando. Se pone en verde si la segunda subida vuelve rechazada o si el viejo se
  sigue pudiendo bajar.
- **La causa B, leída del código:** si el camino que arman las dos puntas deja de ser siempre el
  mismo, la segunda subida cae en otro lado y no pisa nada. El guion imprime las dos plantillas tal
  como están escritas hoy, y si alguna deja de encontrarse **no da por buena la prueba**: la declara
  inservible. Un chequeo que no encuentra lo que busca y sigue adelante escribe su ✔ sin haber
  mirado nada.

La tercera salida —versiones en el depósito— no se mide desde ahí, porque la versión anterior no
está en ningún camino que se pueda pedir. **Está dicho adentro del guion**, para que si se elige ésa
el rojo no se confunda con el defecto.

**Comprobada en los dos sentidos.** Tal como está el código, da rojo. Poniendo `upsert: false` a
mano en `js/auth.js` la segunda subida vuelve rechazada y pasa a verde; devolviendo eso y poniendo
en cambio la fecha adentro de las dos plantillas del camino, también pasa a verde por el otro lado.
Las dos veces se restauró el código original.

**Y midiéndolo apareció un segundo defecto que el pendiente no tenía.** No hace falta subir dos
veces el mismo papel: `js/fichas-legajo.js:307` numera los archivos por su **posición** en la lista,
así que sacar una matrícula del medio y guardar escribe el papel de la fila siguiente encima del de
la anterior, y deja además un archivo suelto que ya no nombra ninguna fila. Eso cambia la elección
que hay que hacer: **prohibir pisar, solo, no alcanza**, porque rechazaría ese guardado, que es
legítimo. Hay que dejar de numerar por posición igual. Quedó escrito en el pendiente 89.

### La extensión de las pantallas estaba escrita cuarenta veces, y once chequeos se callaban

Encontrado y hecho el 31 de agosto de 2026. El pendiente 69 venía diciendo desde el 26 de agosto
que el día que las pantallas dejaran de ser `.html` un puñado de chequeos iba a seguir dando ✔
mirando menos archivos. En vez de leerlo otra vez, se corrió: una copia del proyecto con las
quince pantallas renombradas a `.jsx`, y la red entera encima.

**Seis se plantaron y once siguieron en verde con un número más chico.** El peor no era el más
ruidoso sino el más tranquilo: `estilos` informó que ninguno de los **cero** atributos `style=`
del marcado repetía nada, y lo contó como éxito. `botones` pasó de 21 manejadores en 11 pantallas
a 1 en 1. Ninguno de los once dijo que algo faltaba, porque desde adentro no faltaba nada: cada
uno pidió los archivos que sabía pedir y revisó todos los que le dieron.

**Por qué pasaba.** `'.html'` estaba escrito a mano en cuarenta llamadas repartidas por diecinueve
guiones —once en `scripts/verificar_paleta.mjs` sin ir más lejos—. Es el caso de manual de la
regla de la empresa que dice que ningún patrón repetido queda sin punto único de verdad: la misma
decisión, tomada cuarenta veces, y para cambiarla hay que acertarle a las cuarenta.

**Cómo quedó.** La extensión vive ahora en `scripts/recorrido.mjs`, en `EXTENSIONES_DE_PANTALLA`,
y en ningún otro lado. Los guiones que juntan archivos piden esa lista; los que preguntan por un
archivo suelto usan `esPantalla()`. En la misma copia renombrada, con ese solo renglón puesto en
`['.jsx']`, **los once volvieron a sus números de siempre** y de veintiocho chequeos quedaron tres
en rojo: `estado` y `usos`, que comparan nombres de archivo escritos en la documentación, y
`estados`, que busca las frases de su catálogo por el nombre de la pantalla. Los tres tienen que
gritar, porque documentación y catálogo hay que corregirlos a mano.

**Lo que no arregla, dicho para que no se lea de más.** Cuatro chequeos buscan formas que en React
no existen —el color adentro de `style="…"`, las plantillas que arman marcado, los manejadores
escritos en el marcado y el atributo `data-frase`—. No aparecieron en rojo en esta prueba, y no
porque estén resueltos: un renombre no cambia el contenido del archivo. Se van a caer cuando el
marcado sea React de verdad, y hay que reescribirlos igual.

**El vigilante.** `scripts/verificar_red.mjs` ya exigía que cada chequeo se plante si no encuentra
nada; ahora también se pone en rojo si alguno vuelve a escribir la extensión a mano. Se probó con
las tres formas: escrita, nombrada sólo adentro de un comentario —que no cuenta—, y pedida como
corresponde. Él es el único exento, porque sus pruebas de adentro son textos de chequeo de mentira
y la tienen que traer escrita para que haya algo que reconocer.

**Y la misma prueba, corrida al revés, dejó una medición nueva.** Si se renombran los 32 `.js` en
vez de las pantallas, **doce chequeos se plantan y ocho siguen dando ✔ con menos archivos**:
`escapado` cae de 49 archivos a 17 —dos tercios menos, y lo suyo es justamente que los datos y los
errores no salgan crudos a la pantalla, que es código—, `estados` de 267 bloques asincrónicos a
56, `paleta` de 56 archivos a 24, `trato` de 114 a 82. Ése es el pendiente 91, que ahora tiene una
prueba que puede fallar contra la red de hoy; la vieja, la de renombrar las pantallas, dejó de
servir el día que los chequeos empezaron a seguir la extensión.

---

### La regla de la bóveda estaba escrita en dos lugares, y la que usaban todos era la más floja

Encontrado el 31 de agosto de 2026, tirando del mismo hilo que lo anterior. `F:\proyectos\CLAUDE.md`
cierra tres cosas: las carpetas que anuncian que no se suben, **las carpetas `Exclusivo
<cliente>`** y **los archivos cuyo nombre anuncia que guardan claves**. `scripts/recorrido.mjs`
—el que usan los veintiocho chequeos— cerraba la primera y ninguna de las otras dos.
`scripts/inventario_textos.mjs` las cerraba las tres, en una función propia, porque el 26 de
agosto de 2026 ese mismo guion había entrado en una caja fuerte y contado las frases de un archivo
que no tenía que abrir.

Así que la regla existía dos veces, con dos contenidos distintos, y **la que gobernaba a los
veintiocho era la más floja**. Es la regla de la empresa sobre el patrón repetido, con el agravante
de que acá lo repetido es una regla de seguridad: se arregla en un lado, se olvida en el otro, y
nadie lo nota porque los dos siguen dando ✔.

**Cómo quedó.** `nuncaSeAbre()` decide sola, y cierra también las `Exclusivo <cliente>` —por el
arranque del nombre, porque lo que sigue es el nombre del cliente y no se puede saber de
antemano— y los nombres que anuncian una clave. `inventario_textos.mjs` borró su copia y pregunta
la misma función.

**Y se probó de las dos puntas, porque cerrar de más también es una falla.** `nueva-clave.html` es
la pantalla donde alguien cambia su contraseña, no un lugar donde haya una guardada: si la palabra
sola alcanzara, el recorrido perdería seis archivos de código de verdad —las dos pantallas,
`js/clave.js` y sus dos copias, `scripts/verificar_claves.mjs` y una migración— sin decir nada.
`scripts/verificar_cajas.mjs` comprueba ahora 24 formas de nombrar una carpeta cerrada, 6 de
nombrar un archivo cerrado y 13 nombres parecidos que sí se recorren; se lo puso en rojo tres
veces, sacándole la regla de `Exclusivo`, sacándole la de las claves, y sacándole la excepción del
código, y las tres veces dijo cuál faltaba.

**Lo que no cambió: ningún chequeo perdió corpus.** Se guardaron los números de los veintiocho
antes y después, y son idénticos salvo el mensaje del propio `cajas`. Era la comprobación
necesaria: una regla que cierra de más se ve exactamente igual que una que anda bien, salvo por el
número que nadie mira.

### El `grep -r` a mano entró a una caja fuerte por cuarta vez, y la respuesta fue una herramienta

El 31 de agosto de 2026, buscando otra cosa, un `find` sin exclusiones tecleado desde la raíz del
proyecto listó el nombre de un archivo de adentro de `No commit\`. No se leyó su contenido ni se
citó nada, pero **es la cuarta vez**: el 26 de agosto fue la primera versión de
`scripts/inventario_textos.mjs`, que entró y contó las frases de un archivo que no tenía que abrir;
el 28 fue un `grep -rn` sin exclusiones; y el 31, dos veces, las dos con `find`.

Las cuatro por lo mismo, y por eso vale escribirlo: **la regla estaba en la cabeza de quien
tecleaba y no en la herramienta.** Después de la primera se arregló el guion; después de la segunda
se arregló otro guion; y el hábito de escribir las exclusiones en cada comando siguió intacto,
porque un hábito se cumple casi siempre y acá «casi siempre» no sirve de nada.

Así que la herramienta: `scripts/listar.mjs`. Recorre con `scripts/recorrido.mjs` —el mismo
guardián que usan los veintiocho chequeos, probado con cuarenta y tres casos en
`scripts/verificar_cajas.mjs`—, así que trae las exclusiones puestas y no hay nada que recordar.
`node scripts/listar.mjs .html` lista sólo las pantallas; `--buscar "patrón"` contesta
`archivo:renglón: texto`, que es la forma en que este proyecto cita, y sale con 1 cuando no
encontró nada, para que sirva adentro de una condición. Queda documentada en el README, en
`docs/INVENTARIO.md` y en la memoria del proyecto, que ahora nombra la herramienta en vez del
hábito.

### Y con esa herramienta apareció una tercera tabla vieja, con seis números equivocados

Buscando en la documentación con `listar.mjs` salió que tres documentos daban tres cifras distintas
para la misma medición de estilos. Medidos los archivos, la que estaba mal era la de
`docs/INVENTARIO.md` §5.1, y no en un número: en **seis**.

Decía que `css/styles.css` la usaban «las 10 páginas de la raíz» —son 15—; que `tokens.css` y
`utilidades.css` las usaban «las 16 pantallas» —son 17—; le daba 285 renglones a cada
`styles-pwa.css` cuando tienen 287; y cerraba con un total de 4.638 donde el README, que sí sale de
medir, decía 4.642.

**Lo peor no son los renglones: es la columna «la enlazan».** Un número de renglones lo corrige
cualquiera que abra el archivo. Esa columna sólo envejece cuando alguien agrega una pantalla, que
es justo el momento en que nadie vuelve a leer una tabla de estilos. Se agregaron pantallas y la
tabla no se enteró. Ahora sale de mirar los `<link href>` del marcado, así que se entera sola.

Es la tercera tabla que pasa de escrita a medida: `scripts/medir_estado.mjs` la genera entre marcas
y `scripts/verificar_estado.mjs` la compara antes de cada `commit`, igual que la del README y que el
reparto de `docs/PENDIENTES.md`. Se comprobó que puede fallar **cuatro veces**: cambiándole un
número a mano; sacándole la marca de apertura; agregando un `.css` nuevo que ninguna pantalla
enlaza —que ejerce además el renglón «no la enlaza ninguna pantalla»—; y quitándole el `<link>` a
`cursos.html`, que la puso en rojo con «15 de las 17» contra «14 de las 17». Verde otra vez las
cuatro veces.

De paso se juntaron en un solo lugar las cuatro constantes de las marcas, que estaban escritas una
vez en el que escribe y otra vez en el que compara.

### La tabla de chequeos del README llevaba cuatro de atraso, y nadie lo sabía

Tirando del mismo hilo: `scripts/verificar_todo.mjs` encuentra los chequeos solos, buscando
`scripts/verificar_*.mjs`, así que un chequeo nuevo entra a la red el día que se escribe. Lo que
**no** es automático es la tabla `| Chequeo | Qué impide que vuelva |` del README, que es donde está
escrito **qué impide cada uno**. Esa se escribe a mano, y estaba cuatro atrás:
`scripts/verificar_base.mjs`, `verificar_clases.mjs`, `verificar_estado.mjs` y
`verificar_pendientes.mjs` existían, corrían en cada `commit` y no figuraban en ninguna parte.

No es un problema estético. **Un chequeo que nadie sabe que está ahí es una regla que el próximo
que discuta el tema va a dar por no sostenida**, y va a construir alrededor de un agujero que en
realidad está tapado —o va a pedir permiso para algo que el gancho de `commit` le va a rebotar sin
que entienda por qué—. Y al revés: una fila sin archivo detrás es una regla que se cree sostenida y
no lo está, que es peor todavía.

`scripts/verificar_red.mjs` la compara ahora en los dos sentidos. Se comprobó en rojo tres veces:
sacándole la fila a `verificar_clases`, agregando una fila con un nombre inventado, y sacándole a
`verificar_red` su propia fila —esta última porque la primera versión no la habría notado, ya que
comparaba contra la lista que deja afuera a los dos que no se revisan a sí mismos—. Queda afuera
sólo `verificar_todo.mjs`, que no es un chequeo sino el que los corre.

Con eso `verificar_red.mjs` mira tres cosas: que ninguno pueda recorrer cero archivos y decir ✔;
que ninguno escriba a mano la extensión de las pantallas; y que la tabla que las explica esté al
día. Las tres son la misma regla de la empresa mirada desde ángulos distintos —una prueba que no
puede fallar no prueba nada—, aplicada a la red misma.

**Y un cuarto hallazgo, chico:** `verificar_pendientes.mjs` daba por abierta una cita bien escrita,
«las clases que cerraron el pendiente 8», porque su lista de formas de cierre tenía `cerró` y no
`cerraron`. Se agregó, con su prueba, y **no** se agregó el futuro: «esto cerrará el pendiente N»
habla de uno que sigue abierto, y ahora hay un caso que lo comprueba.

---

### El cuarto número escrito a mano estaba mal el mismo día en que se contó

Ya son cuatro, y éste es el que mejor lo muestra. `docs/INVENTARIO.md` abría su lista de guiones
diciendo que en `scripts/` había «51 archivos `.mjs`» y «doce herramientas sueltas», y cerraba con
«Contado el 31 de agosto de 2026». Son 52 y trece, **y ya lo eran ese mismo día**: `scripts/listar.mjs`
se escribió unas horas después de contar, y nadie volvió al párrafo.

Los tres casos anteriores se podían leer como descuido acumulado —la tabla del README con cinco
días, el reparto de estilos con casi el triple, la tabla del CSS con seis números—. Éste no deja esa
salida: la fecha estaba puesta, era la de hoy, y el número igual era falso. **Una fecha avisa de que
el número pudo cambiar, no de que cambió**, y quien la lee entiende justo lo contrario. Un número
con fecha reciente es más peligroso que uno sin fecha, porque el sin fecha al menos se desconfía.

Así que la frase pasó a ser el cuarto bloque que sale del medidor: `scripts/medir_estado.mjs` cuenta
los `.mjs` de la carpeta, los separa en chequeos `verificar_*`, pruebas `probar_*` y herramientas
sueltas, y escribe la frase entre dos marcas; `scripts/verificar_estado.mjs` la compara antes de cada
`commit`. Se comprobó en rojo cuatro veces: cambiando un número a mano, sacando una de las marcas,
agregando un `scripts/probar_de_mentira.mjs` —que la puso en 53 archivos y 11 pruebas— y sacando las
marcas del reparto, que es otro bloque.

**Y esa última prueba encontró algo que no buscaba.** El aviso de «faltan las marcas» estaba escrito
dos veces, una por bloque, y la copia nombraba `ABRE` y `CIERRA`: constantes que no existen en ese
archivo. Nunca se había notado porque **ese camino sólo corre cuando algo ya está mal**, y hasta ese
día nada lo había estado. Si alguien hubiera sacado las marcas de verdad, el chequeo no habría dicho
«faltan las marcas»: se habría caído con un error de programación, que es exactamente el momento en
que uno menos quiere leer un error que no explica nada.

La corrección no fue arreglar la copia sino **borrarla**: los tres bloques que escribe el medidor
pasan hoy por una sola `escribirEntreMarcas()`, y los tres que compara el chequeo por una sola
`compararEntreMarcas()`. Es la regla de la empresa —ningún patrón repetido sin punto único de
verdad— cobrándose sola: el error vivía en la copia, y sin copia no hay dónde esconderlo.

---

### La novena medición a mano del mismo día pasó a ser un guion, y encontró uno más

El pendiente 91 dice que perder la mitad del corpus no pone en rojo a nadie, y lo decía con ocho
pares de números medidos a mano: `escapado` de 49 archivos a 17, `estados` de 267 bloques a 56,
`paleta` de 56 a 24. La medición se había hecho armando una copia del proyecto con los `.js`
renombrados a `.ts` y mirando, uno por uno, cuáles seguían diciendo ✔.

Después de encontrar cuatro números escritos a mano que ya estaban viejos, dejar el noveno escrito
igual no tenía defensa. Así que el experimento se volvió `scripts/probar_perdida_de_corpus.mjs`:
copia el proyecto —con `archivos()`, para que el guardián de las cajas fuertes venga puesto—,
renombra los `.js`, corre la red de los dos lados y reparte cada chequeo en tres columnas. Se plantó:
notó que le faltaban archivos. Dijo exactamente lo mismo: no mira los `.js`, no perdió nada. Dijo ✔
con otro número: **revisó menos y lo contó como éxito**.

**Y la primera vez que corrió encontró nueve, no ocho.** El que faltaba era `estilos`, que pasa de
51 atributos `style=` adentro de guiones a 20 y sigue en verde. No lo había visto nadie porque su
mensaje tiene cuatro números y sólo dos cambian; a ojo se lee igual. Es la misma lección una vez
más, ahora del otro lado: **el número escrito a mano no sólo envejece, además nace incompleto**.

La prueba se comprobó en las dos direcciones. Da rojo hoy, con nueve ciegos; los pares de
números y el reparto de las otras columnas los imprime el guión y acá no se copian. Y sabe dar verde: dejándole ver los `.ts` a uno de los nueve, ese chequeo pasó
solo de la columna de los ciegos a la de los que no perdieron nada. Se planta además si la copia
salió vacía, si no hubo un `.js` que renombrar, si ningún chequeo mira los `.js`, o si alguno ya
viene fallando en el proyecto sin tocar —esto último saltó solo en la primera corrida, porque el
guion recién escrito había cambiado la cuenta de guiones de `docs/INVENTARIO.md` y el bloque
generado del día anterior lo agarró en el acto—.

**Lo que la prueba no hace es elegir la salida.** Las tres posibles están en el pendiente 91 y son
una política de exenciones, o sea una decisión. Lo que cambia es que ahora la elección tiene con
qué comprobarse, y que el día que alguien la crea resuelta hay un comando que contesta.

---

### Nombrar la guarda no es plantarse, y leyendo el archivo no se nota

La pregunta hermana de la de arriba —qué pasa cuando a un chequeo le sacan la mitad del corpus— es
qué pasa cuando no le queda nada. Esa ya estaba contestada: es el pendiente 69, y el 28 de agosto
de 2026 se cerró poniendo `seRevisaron()` y `hayArchivos()` en la red entera, con `verificar_red.mjs`
de vigilante. Se corrió igual, para ver, y **la red pasó**: en una copia que sólo lleva `scripts/`
se planta la red entera menos su exento, cada chequeo nombrando qué le faltó —«no se encontró un solo archivo
.html ni .js», «ENOENT … docs/PENDIENTES.md»—, y el único verde es `cajas`, que se fabrica su propio
árbol de prueba y por eso no depende del proyecto. Un negativo verificado, que es un resultado y no
un trámite: **la red nota cuando el corpus desaparece; lo que no nota es cuando se achica.** Esa
frase antes era una suposición razonable y ahora es una medición.

Lo interesante apareció al preguntarse si valía la pena dejarlo probado, existiendo ya
`verificar_red.mjs`. **Vale, porque no comprueban lo mismo.** `verificar_red.mjs` comprueba
**leyendo**: mira que cada chequeo *nombre* a `hayArchivos` o a `seRevisaron`, sin los comentarios,
para que citarlas en un encabezado no cuente. Pero nombrarlas no es plantarse. Un chequeo puede
llamarlas para un corpus y hacer su trabajo con otro, y entonces pasa con las dos palabras escritas
y cero archivos revisados. Se escribió uno así a propósito —pide `hayArchivos` sobre `scripts/` y
cuenta pantallas con `archivos()`—: **la mitad que lee lo dejó pasar y la que corre lo agarró.**

Escribir esa prueba tuvo además un costo que conviene anotar, porque es la regla de la empresa
cobrándose al revés: la primera versión traía **su propia lista de exentos**, con `verificar_cajas`
y su motivo, al lado de la lista idéntica que ya vivía adentro de `verificar_red.mjs`. Dos listas
que dicen lo mismo se arreglan una vez y queda mal la otra. La lista se mudó a
`ARMAN_SU_PROPIO_CORPUS`, en `scripts/recorrido.mjs`, pegada a la guarda de la que exime, y ahora la
comparten el que lee y el que corre. **Antes de agregar algo que ya podría existir, buscarlo
primero** —y acá no se buscó: lo encontró el propio experimento, cuando el chequeo de mentira salió
en rojo por `verificar_red.mjs` antes de que la prueba nueva llegara a correr.

---

### La prueba de aislamiento dejaba diecisiete coordinadoras ficticias

`scripts/probar_aislamiento.mjs` crea cuatro cuentas, y a una la asciende a coordinador porque es
la única forma de comprobar que el personal de una Prestadora lee los papeles de la suya y no los
de la otra. Al terminar borraba los legajos y los archivos, y las cuentas las dejaba, con este
argumento escrito: su correo es `@ejemplo.invalid`, un dominio que por norma no existe, así que no
le llegó ni le puede llegar nada a nadie.

Es cierto y no alcanza. El 31 de agosto de 2026 se contó sobre la base de esta máquina: de las
**86 cuentas, 84 eran residuo de pruebas**, y **diecisiete tenían el rol `coordinador` sobre
PresDemo**, una por corrida. Una cuenta ficticia con rol de coordinador no es inofensiva porque
nadie pueda entrar por correo: es basura con permisos sobre los papeles de una Prestadora entera.
El argumento contestaba la pregunta del daño por correo, que nadie había hecho, y no la del
permiso. Otra prueba de la casa ya lo decía con todas las letras —«una cuenta ficticia ascendida a
coordinador es basura con permisos: no se deja»— y era justamente la que no lo cumplía.

La clave de administración que hace falta para borrarlas **ya estaba en el guion**: se usa para el
ascenso. Así que con `--local` ahora se borran las cuatro. Contra el servidor alojado no hay con
qué, y eso sigue siendo el pendiente 45.

Lo que comprueba al final **no es que borró las que anotó**. Eso lo pasaría una prueba que crea una
cuenta por un camino que ninguna lista registra: se borraría todo lo anotado y el mensaje diría que
quedó limpio. Comprueba que la base terminó con **el mismo total de cuentas** con el que empezó, y
el total lo contesta el servidor. **Comprobado en los dos sentidos**: con el guion entero da 0 y
dice que la base quedó con las 86 que tenía; sacando al coordinador de la lista de borrado, da 1 y
dice que tenía 86 y ahora tiene 87.

Y el desajuste **no se suma a los fallos del aislamiento**: eso diría que falló el aislamiento
cuando lo que falló fue la limpieza, y enseñar a desconfiar del veredicto es peor que el problema
que avisa.

---

### La siembra tenía catorce columnas que nunca se llenan, y ninguna pantalla lo mostraba

Las tres Prestadoras ficticias son el banco de pruebas del producto: si algo no se puede hacer con
ellas, no se puede hacer. Así que vale preguntarles lo mismo que a una base de un cliente, y la
pregunta que más rinde no es «¿hay algo mal cargado?» sino **«qué columna no se llena ni una vez?»**
Una así no se ve en ninguna pantalla, porque la pantalla se dibuja igual. Lo que no se ve es que
**nada la está probando**: la consulta que la olvida y la que la trae contestan lo mismo. Es el
argumento con el que la migración 0027 cargó comprobaciones en los legajos —«una consulta rota y una
consulta correcta contra una tabla vacía contestan exactamente lo mismo»— aplicado a la siembra
entera y no a una tabla.

El 31 de agosto de 2026 se midió: **catorce de las 225 columnas de las 25 tablas con datos**. Están
todas en el pendiente 110, agrupadas por lo que significa cada una, y el grupo que importa es el
primero: `cursos`, `evaluaciones`, `preguntas_evaluacion`, `opciones_pregunta` y `vocabularios`
guardan la oferta general con `tenant_id` nulo y lo propio de una Prestadora con `tenant_id`
cargado, y **la siembra sólo cargaba lo general**. O sea que la mitad `tenant_id =
prestadora_actual()` de cinco políticas de RLS no tenía una sola fila que la ejercite, y la prueba
de aislamiento no la podía agarrar porque el dato no existía. Ahí no había nada roto: había cinco
puertas que nadie había probado.

**Cuatro de esas cinco las cerró la migración 0048**, el mismo día. En vez de cargar una fila
cualquiera para llenar la columna, hace que PresDemo arme **su** curso: ya tenía una certificación
propia en los vocabularios —`certificacion/rcp_avanzada`—, y una Prestadora que le exige a su gente
algo que la oferta general no dicta es exactamente la que arma su propio curso. Con eso vienen su
evaluación final —que de paso llena `evaluaciones.curso_id`, vacía hasta entonces—, sus dos
preguntas y sus ocho opciones. **Y sembrar no alcanza: hay que ejercitarlo**, así que
`scripts/probar_aislamiento.mjs` ganó tres comprobaciones —las dos Prestadoras ven la misma oferta
general; la dueña ve lo suyo en los tres catálogos; ninguna ve una sola fila propia de la otra— y
pasó de 52 a 55. **La segunda se falsificó moviendo el curso a la otra Prestadora**: salió roja
nombrando `cursos`, y después se devolvió a su dueña. Las otras dos no se pueden falsificar
moviendo datos —sólo se ponen en rojo si la política pierde una de sus mitades, y una política no
se cambia a mano contra la base—; es la misma forma que ya tiene el bloque de las zonas de
cobertura, y se deja dicho en vez de hacerlo pasar por lo que no es. **No se prueba que nadie
escriba en estos catálogos**: la 0008 le quita a `authenticated` el permiso de escritura sobre la
tabla entera, así que una carga cruzada daría error igual con el aislamiento roto —sería una prueba
que no puede fallar—.

**La quinta no se cierra sembrando, porque no es un hueco de siembra.** `vocabularios.tenant_id`
sigue vacía a propósito: los **ítems** propios de una Prestadora ya existen —cinco en
`vocabulario_items`—, pero una **lista** entera propia es otra función, y antes de sembrarla hay que
contestar qué pasa cuando una Prestadora quiere su propia lista de patologías junto a la general:
si la reemplaza, si la extiende o si conviven. Sembrarla sin contestar eso es elegir la respuesta a
escondidas. Queda en el pendiente 110.

**Y dos de las catorce se cerraron sin sembrarlas, eximiéndolas —pero no por no poder—.**
`caregivers.user_id` y `avisos.familia_id` apuntan a `auth.users`, y la 0030 ya había escrito
por qué no las llena: dar de alta una cuenta desde una migración significa escribir una clave adentro
del repositorio. Eso solo no alcanza para eximir nada, porque «no se puede» y «no se mira» terminan
en el mismo lugar. Lo que las saca de la lista es lo otro: `probar_aislamiento.mjs` recorre los dos
caminos con cuentas de verdad y comprueba de quién quedó cada legajo y cada aviso. La siembra era el
lugar equivocado para probarlas, no un lugar donde faltaran.

**Y con el mismo criterio, una que tampoco se puede sembrar se quedó adentro.**
`verificaciones_asistente.verificado_por` dice quién comprobó un papel y apunta a `profiles`, que
existen sólo para quien se registró: una migración no la puede llenar, igual que las dos de arriba.
La diferencia es la que decide, y es toda la regla: **aquéllas las escribe algo, ésta no la escribe
nadie.** Recorriendo el proyecto entero el 31 de agosto de 2026 no aparece ni una pantalla, ni un
guion, ni una prueba que toque `verificaciones_asistente` fuera de las migraciones. O sea que el
producto no anota quién comprobó un papel, y eximirla lo hubiera tapado. Queda roja.

De las catorce quedan **siete**.

**Una de las catorce ninguna migración la puede llenar hoy**, y eso es un hallazgo aparte:
`verificaciones_asistente.verificado_por` dice quién comprobó un papel, y los perfiles los crea el
disparador de alta (`supabase/migrations/0005_acceso_por_sesion.sql:80`), o sea que existen sólo
para quien se registró. La siembra no tiene personal, así que no tiene a quién apuntar. La 0027
escribió `verificado_el` a propósito —«un papel comprobado sin fecha de comprobación es un dato a
medias del lado de la Prestadora»— y dejó ésta afuera sin decirlo.

**Y la medición a mano encontró nueve; el guion encontró catorce.** Las cinco que se habían pasado
son justo las cinco de los catálogos de dos escalones, porque leídas de a una parecen correctas: un
`tenant_id` nulo ahí **es** un valor válido y no un hueco. Lo que las delata es la pregunta
generalizada, no el ojo. Por eso quedó como prueba y no como informe:
`scripts/probar_coherencia_de_la_siembra.mjs`, en `probar_todo.mjs`, roja esperada contra los
pendientes 110 y 111 —el segundo es una cuarta comprobación que llegó después, y está más
abajo—.

Mira además dos cosas que ya estaban bien y conviene que sigan estando: que ninguna fila pertenezca
a una Prestadora que no existe, y que ninguna apunte a una fila de **otra** Prestadora. Es el
aislamiento visto desde los datos y no desde la sesión —una política perfecta sobre datos ya
mezclados no separa nada—, y el índice que lo resuelve se arma con todo lo leído, sin la lista de
claves foráneas, para que una columna que apunta a otra tabla sin declararlo también se mire.
**Comprobadas las tres en los dos sentidos**: eximiendo las catorce sale verde con 225 columnas
revisadas; colgando una fila de una Prestadora inventada sale roja la primera; y poniendo una
comprobación de una Prestadora sobre el legajo de otra sale roja la segunda, nombrando
`verificaciones_asistente.caregiver_id → cuidarnorte`. **Y el primer intento de esa tercera
falsificación no falló**, que era lo útil: había inventado la columna `avisos.caregiver_id`,
que no existe, y el guion la salteó por no estar en la lista de columnas declaradas. Una prueba de
que puede fallar tiene que romper algo que exista.

Antes de mirar nada se planta si el volcado vino vacío, si no entendió ni una fila, si faltan las
tres Prestadoras, o si el separador de valores no distingue lleno de vacío: ese último decide todo
lo demás, porque uno roto que devolviera siempre nulo pondría media base en rojo, y uno que no
devolviera ninguno la pondría toda en verde.

**Lo que esta prueba puede tapar, y no arregla sola.** Las filas que la máquina tenga fuera de las
migraciones se cuentan igual. No corre `db reset` —borrar datos se consulta— y lo dice en vez de
disimularlo: el sesgo va en una sola dirección, una fila de más sólo puede **tapar** un hueco y
nunca inventarlo, así que **lo que encuentra es real** y lo que no encuentra se lee limpio recién
después de un `supabase db reset --local`. Contra el servidor publicado directamente se niega a
correr: ahí una columna llena por alguien de verdad taparía justo lo que viene a mirar.

### Una comprobación de la prueba de aislamiento nunca había podido fallar

La prueba decía que una Familia no ve la conversación del aviso de otra, y era verdad que veía
cero mensajes. Lo que no era verdad es que hubiera algo escondido: **el mensaje que tenía que
esconder nunca se había escrito**. La carga salía sin `author_id` —esa columna no tiene valor por
omisión, a diferencia de `tenant_id`— y la política de la 0020 la rechazaba, porque pide ser
personal de la Prestadora o ser quien escribe. El resultado de la carga se descartaba, así que
nadie se enteraba. Leído desde la base, el síntoma estaba a la vista y nadie lo había mirado:
`messages` tenía cero filas después de cada corrida, y ninguna limpieza las borraba.

Esa comprobación **daba bien con el aislamiento roto**, que es la definición de no probar nada. La
corrección son las dos mitades juntas: se escribe el `author_id` y **se mira que el mensaje haya
quedado escrito**, con la misma forma que el bloque de los reportes ya tenía tres comprobaciones
más abajo —si no se pudo escribir, lo dice en vez de contar un cero por un acierto—. Falsificada
leyendo con la sesión de la propia autora: salió `MAL   Ni la conversación de ese aviso  — 1
filas`. Y la limpieza tuvo que crecer: `messages_aviso_id_fkey` borra con `set null` y no en
cascada, así que el mensaje sobrevive al aviso que lo llevaba —por eso se borra aparte, y antes
que el aviso—.

**Y después se revisó la prueba entera buscando la misma forma**, que es lo que había que hacer:
toda afirmación de «acá no se ve nada» cuyo «nada» lo pone la propia prueba. Aparecieron dos
más, y las dos estaban sanas por casualidad y no por diseño. El horario del aviso ajeno se
escribía de verdad —la carga funciona— pero el resultado se descartaba igual, así que el día que
esa carga se rompa la comprobación se pondría verde en vez de roja. Y la del directorio miraba que
la función no devolviera ninguna columna con dato personal, sin exigir que devolviera **alguna**
columna: sin una sola fila, «ninguna prohibida» es verdad porque no hay ninguna. Las dos llevan
ahora su control positivo —`franjaEscrita &&` y `columnas.length > 0 &&`— y siguen en verde, con
el detalle diciendo qué vio: 16 columnas, ninguna personal.

El resto de la prueba pasó la revisión con motivo escrito: los legajos y los avisos ajenos existen
porque los crea una comprobación anterior que sí se mira; las quince filas de la ponderación y los
trece legajos sembrados los pone una migración; y el examen y las carpetas del depósito se juzgan
por el código de respuesta, que no se puede vaciar.

### La prueba de la siembra no podía ver una tabla vacía

La comprobación de las columnas que nunca se llenan tenía un escalón más arriba que no miraba, y
no por descuido: **no lo podía mirar**. Trae los datos con `supabase db dump --local
--data-only`, y ese volcado **sólo nombra las tablas que tienen filas**. Una tabla entera sin
sembrar no aparece en ningún renglón, así que desde ahí «ninguna tabla vacía» es verdad porque
no hay ninguna a la vista. Es la misma forma que la de arriba: una afirmación que no puede
fallar.

La corrección es pedir un segundo volcado, el del esquema —el mismo comando sin `--data-only`—,
del que salen las 29 tablas por sus `CREATE TABLE`, y comparar. Eso trajo la cuarta
comprobación, `Toda tabla tiene alguna fila`, con su propio exento aparte,
`LA_SIEMBRA_NO_PUEDE_TABLA`, bajo el mismo criterio de dos mitades: que una migración no la pueda
llenar **y** que algo sí la recorra. Hoy no hay ninguna adentro. **Y la comprobación nueva trae
su propia guarda**, porque el segundo volcado también se puede romper: el esquema tiene que
traer al menos las tablas que el de datos ya nombró, o si no la lista quedaría vacía y volvería
a decir «ninguna vacía» sin haber mirado ninguna. Falsificada rompiendo el corte del nombre:
salió `ROTA ... 0 tablas en el esquema` y se plantó en vez de medir.

**Encontró cuatro tablas sin una sola fila, y no son todas el mismo hueco** —están separadas así
en el pendiente 111—. `messages` y `reportes` sí se recorren, con cuentas de verdad y pasando
por las políticas, y quedan vacías porque `probar_aislamiento.mjs` las borra al limpiar.
`clock_ins` no la escribía nadie, y tirar de ese hilo el mismo día encontró por qué: es la
sección de acá abajo. Hoy la recorren tres comprobaciones nuevas, y queda vacía por lo mismo
que las otras dos, que la limpieza se la lleva.

**Y la cuarta es un agujero del producto, no de la siembra.** A `documentos_asistente` no la
escribe nadie: ni una pantalla, ni un guion, ni una prueba. Lo que sí pasa es que
`registrar-asistente.html:996-1000` sube el documento de identidad, los antecedentes penales y el
título, y guarda **sólo los caminos** en la columna `documents` de `caregivers`
(`registrar-asistente.html:1057`, y de ahí a la base por `js/apiClient.js:1157`). O sea que hay
dos formas de guardar el mismo hecho y una está muerta, como ya pasó con `messages` y las
`conversaciones` heredadas. Y la que quedó viva es la pobre: la tabla dedicada tiene `tipo`,
`presentado_el`, `vencimiento` y `verificado`, y el objeto de `documents` no tiene ninguno de los
cuatro, así que **hoy el producto sube el papel y no anota qué papel es, cuándo se presentó ni
cuándo vence**. `docs/PLAN_VENCIMIENTOS.md:40` apoya el pendiente 98 justamente en
`documentos_asistente.vencimiento`, que es una columna de una tabla que no escribe nadie. Esa no
se cierra sembrando: primero hay que elegir cuál de las dos formas queda.

### Y la segunda de las cuatro era un agujero peor

`clock_ins` estaba vacía porque **la única pantalla que la escribe lo hacía mal**, y de una
manera que la base rechazaba siempre. `caregivers` tiene dos columnas de identificador que no
son la misma: `id` es el **legajo** y `user_id` es la **cuenta**. La función que resuelve el
permiso, `legajo_propio()`, devuelve el primero, y la clave foránea de la fichada también apunta
al primero. El teléfono mandaba el segundo. Contra eso hay dos paredes —la clave foránea y la
política—, así que no entraba nunca. **Y lo mismo pasaba con el reporte de cuidado**, que es la
otra cosa que ese teléfono escribe: `reportes.caregiver_id` apunta igual al legajo. O sea que
**ninguna de las dos cosas que escribe el teléfono del Asistente se pudo escribir nunca**.

En el mismo bloque había otras dos. **Un identificador escrito a mano** como valor de repuesto
para cuando no hay sesión —que sin sesión no escribe igual, porque `anon` no alcanza la tabla
desde la 0002—. Y **el texto visible guardado como dato**: el botón mandaba `'Entrada'`, que es
la traducción al castellano de `fichado.entrada`, así que la misma fichada marcada con la
pantalla en inglés habría quedado guardada como `Clock-in`. El comentario que había ahí
defendía eso diciendo que los fichados ya escritos decían «Entrada» —y no había ninguno
escrito, ni podía haberlo—. Es justo la distancia entre lo visible, que cambia con el idioma,
y lo guardado, que se nombra por su función y no cambia.

Las tres corregidas. El legajo se resuelve **una sola vez**, en `js/apiClient.js:540`, porque son
dos pantallas que necesitan el mismo dato; si no hay legajo lo dice y se planta, con una frase
nueva en los tres idiomas, en vez de inventar uno. Y `event_type` guarda `entrada` y `salida`,
que son las claves que el catálogo de frases **ya usaba** —no hace falta ninguna palabra nueva—,
emparejadas con su frase en un mapa literal y no armadas con un `+`, porque una clave construida
a pedazos no la ve `verificar_frases.mjs` desde afuera. Migrar no hay qué: la tabla está en cero.

**Lo que prueba esto y lo que no.** La prueba de aislamiento creció tres comprobaciones, de 55 a
58, y la del medio es la que decide: manda el identificador de la cuenta donde va el del legajo
—el pedido exacto que hacía el teléfono— y exige que lo rechacen. Sale `respuesta 403`. Al lado
va el control positivo, la misma fichada con el legajo bien puesto, que sí entra; sin él, un
403 no distinguiría «rechazó lo que tenía que rechazar» de «rechaza todo». Pero **eso prueba
la base, no el teléfono**: nadie había apretado todavía el botón con el arreglo puesto.

### Y entonces se apretó el botón

Esa mitad se cerró el mismo 31 de agosto de 2026, y para cerrarla hubo que construir con qué.
La aplicación del Asistente sólo sabe hablarle a la base publicada —la dirección está escrita en
`js/apiClient.js:8`, sin ninguna llave para cambiarla—, así que «fichar desde el teléfono»
significaba escribir en la base de verdad. `scripts/servidor_local.py --base-local` ya resolvía
la mitad: cambia la dirección **en el texto que sale por la red y nunca en el archivo**, para que
nadie se olvide de volverlo atrás. Faltaba una cuenta de Asistente **con legajo detrás**, que es
exactamente el dato que el arreglo empezó a mandar, y la dejó `scripts/preparar_asistente_local.mjs`:
toma la clave de una variable de entorno, se niega a correr contra cualquier base que no sea la de
esta máquina, y **engancha un legajo de la siembra en vez de inventar uno**, para que la pantalla
se mire con un legajo que tiene nombre, fichas y verificaciones y no con uno vacío hecho al paso.

Con eso, la pantalla andando: entró, guardó un reporte de cuidado y marcó una entrada y una salida.
Las tres filas quedaron, colgadas del **legajo** y con `presdemo` resuelto por la política, y
`event_type` guardado como `entrada` y `salida` y no como el texto visible. Fue el pendiente 112,
cerrado.

**Lo único que no se probó, y conviene decirlo en vez de que se note después:** el navegador de
esta herramienta niega la posición, así que la primera vez el botón contestó «Habilite los permisos
de GPS» —que es, de paso, ese camino de error funcionando— y para seguir hubo que **reemplazar el
sensor por una posición inventada**. El botón, la resolución del legajo, lo que viaja, la política
y las filas son de verdad; que un teléfono de verdad entregue una posición, no. Es la única
pieza del recorrido que sigue sin ejercitarse, y no la tapa ninguna prueba.

**Y de ahí salió algo que no se veía.** Con las tres filas escritas, la comprobación de la siembra
pasó a contestar que `clock_ins` y `reportes` tenían filas, y era cierto. Pero **ninguna migración
las repone**: la primera base armada desde cero volvía a tenerlas vacías. Verde hoy, rojo mañana,
sin que nadie hubiera tocado nada — y un verde intermitente se lee como «anda» las veces que anda,
que es peor que un rojo constante. Así que la fichada se sembró de verdad, en la migración 0049:
nueve filas en las dos Prestadoras que tienen gente cargada, cuatro turnos cerrados y **uno
abierto**, porque una entrada sin su salida es el estado normal de quien todavía está trabajando y
es justo el caso que hace fallar a la pantalla que sume horas restando una de otra. Cada fichada
cae en una zona que esa Asistente cubre según `zonas_asistente`: una entrada marcada donde esa
persona no trabaja es un dato falso aunque la persona sea inventada. Eso cierra el grupo (b) del
pendiente 111, y las tablas sin una sola fila pasaron de cuatro a tres.

Y lo escrito a mano se fue, por el mismo motivo: `scripts/soltar_asistente_local.mjs` borra las
filas que se escribieron apretando el botón y deja las sembradas. Las distingue sin ninguna lista
escrita a mano —**una fila cuyo identificador nombra alguna migración es de la siembra; una que no
lo nombra ninguna la escribió una persona**—, y el propio guion lo mostró funcionando: del mismo
legajo separó dos fichadas sembradas de dos escritas a mano. Después de limpiar, la comprobación
volvió a nombrar `reportes` entre las vacías, que es la verdad.

### Y la prueba que se veía limpia y no lo estaba

Un rato después apareció otra de la misma familia, y por una vía distinta: contando las cuentas
de la base de esta máquina. Había **87 sin nada detrás**, todas con correo `@ejemplo.invalid` y
prefijo `prueba.`. Diecinueve eran de `probar_sello_de_la_prestadora.mjs`, una por cada vez que
se había corrido.

Lo interesante es **por qué no se veía**. Esa prueba sí limpiaba: borraba el legajo ficticio, y
después preguntaba al directorio si había quedado y escribía «Limpieza: el legajo ficticio ya no
está en el directorio». O sea que tenía una comprobación de limpieza, la pasaba, y lo decía por
pantalla. **La comprobación miraba una cosa y la basura estaba en otra.** Una cuenta ficticia
sin dueño no aparece en ningún directorio: aparece en `auth.users`, que esa prueba no miraba.

El arreglo de la prueba es el de las hermanas —borrar también la cuenta, con la clave de
administración que el entorno local ya da—. **Pero arreglar la que se encontró no impide la
próxima**, y la de aislamiento ya había tenido la suya, tapada unos días antes por su cuenta.
Dos veces la misma forma es una regla, no una casualidad. Así que la guarda subió un piso:
**`probar_todo.mjs` cuenta `auth.users` antes y después del lote entero, y se planta si el
número creció**. Ninguna prueba puede taparlo, porque no lo mide ella. Y no lo perdona una roja
esperada: una prueba puede dar el rojo que tiene anotado y llevarse igual lo que creó.

Falsificada desactivando a propósito la limpieza recién puesta: salió `ATENCIÓN: la base pasó de
91 cuentas a 92` y la corrida terminó en rojo. Con la limpieza puesta dice `La base quedó con
las 91 cuentas que tenía`.

**Y lo viejo se barrió**, con la orden del Desarrollador del 31 de agosto de 2026 —era el
pendiente 113, cerrado ese mismo día—. `node scripts/limpiar_cuentas_de_prueba.mjs --borrar`
contestó `Borradas: 88` y `Quedan de prueba y sin legajo: 0`, sobre las 92 cuentas que tenía
la base: 68 `prueba.aislamiento.*`, 19 `prueba.sello.*` y 1 `prueba.entrada.*`, la que
dejó la medición del pendiente 119 esa misma noche. **Las 4 que quedan son las cuentas de
trabajo del entorno local**, que las tres condiciones del guion no rozan. Y la cuenta no la
escribió nadie a mano: la dice el guion al correr, porque el renglón que la tenía escrita
decía 87 cuando ya eran 88. De paso quedó comprobado que **los 13 legajos del directorio
están limpios**: son los sembrados por las migraciones y ninguno es residuo.

### Y un plan escrito el mismo día ya decía de más

Tirando del grupo (a) del pendiente 111 apareció que el plan de los vencimientos
—`docs/PLAN_VENCIMIENTOS.md`, escrito ese mismo 31 de agosto de 2026— arrancaba su inventario
diciendo, en negrita: **«el dato está, lo que falta es alguien que lo mire»**, arriba de una tabla
con las tres columnas de fecha en las que se apoya. Medido contra la base, es cierto en un tercio:

| Columna | Lo que hay adentro |
|---|---|
| `matriculas_asistente.vencimiento` | 3 filas y las tres con fecha. La escribe el producto de punta a punta |
| `documentos_asistente.vencimiento` | ni una fila: es la tabla que no escribe nadie, el grupo (a) del pendiente 111 |
| `verificaciones_asistente.plazo_vence_el` | 14 filas y ninguna con plazo: una de las siete columnas vacías del pendiente 110 |

**No es un detalle de redacción, es la misma trampa de siempre un escalón antes.** Un control de
vencimientos construido sobre esa frase mira las tres columnas por igual, encuentra cero papeles
vencidos en dos de las tres —siempre, en toda base, para siempre— y contesta «no hay nada que
avisar» con toda la razón aparente. Sale verde por el mismo motivo por el que saldría verde si
estuviera roto: no hay con qué distinguir un caso del otro. Una prueba que no puede fallar,
sembrada en el paso de inventario, que es donde menos se la busca.

Lo que salva al plan es que **la única de las tres que está cargada es justamente la que sostiene
la promesa**: la fecha de la Matrícula, que es la ficha donde el producto dice «se avisa antes de
que venza». Así que el control negativo que el propio plan pide —una matrícula vencida ayer que
**sí** aparece hoy en el directorio— tiene con qué hacerse. Corregida la sección 2.1 con lo
medido, y dicho ahí cuál de las tres puede aportar el caso y cuáles no.

Y de paso quedó comprobada la otra mitad, la que la búsqueda de la mañana había dado mal: **a
`matriculas_asistente` sí la escribe el producto**. `js/apiClient.js:378` la nombra en el mapa de
las cuatro fichas repetibles del legajo, y la ficha pide la fecha como obligatoria
(`data/catalogo-fichas.json:40`). La búsqueda que decía lo contrario había pasado a `scripts/listar.mjs` un patrón
con alternativas escrito como lo escribe grep, con `\|`. Ahí adentro el patrón es una expresión
regular de JavaScript, donde esa barra hace lo contrario: apaga en vez de encender. Así que no
buscó «esto o aquello», buscó el texto con los palitos adentro, que no está en ningún lado, y
contestó «Nada. Se revisaron 248 archivos». **Un buscador que no entiende el patrón no dice que
no entiende: dice que no hay.** Y eso se lee igual que un «no está», que es lo que se creyó.

Arreglado en la herramienta, no en la costumbre, que es de donde ya se había caído cuatro veces:
**cuando `listar.mjs` no encuentra nada y el patrón trae alguno de los siete escapes de grep, lo
vuelve a buscar leyéndolo como lo leería grep y avisa si así sí aparece**, diciendo cuántos
renglones. No avisa por sospecha: avisa habiendo encontrado los que la primera lectura no vio.
Falsificado con los tres casos que importan —el patrón que falló aquel día, que ahora contesta
«Pero puede que esto no sea un “no está”» y ofrece los 90 renglones; una alternativa bien escrita,
que sigue andando sin ruido; y una búsqueda de una barra de verdad que no encuentra nada, donde
el aviso **no** sale, porque la segunda lectura tampoco encuentra nada—. Esa tercera es la que
impide que la guarda se vuelva ruido.

---

---

### A las exenciones de las pruebas no las probaba nadie, y dos reglas baratas alcanzaron

La enfermedad ya estaba diagnosticada: **una exención que deja de eximir no queda inofensiva.**
Casi todas están escritas por archivo, así que el chequeo se saltea el archivo entero y con él todo
lo demás que hubiera mirado adentro. De ahí salió `scripts/probar_exenciones.mjs`, que las vacía de
a una y exige que el chequeo dueño se ponga rojo.

Esa prueba, sin embargo, sólo llega a los `verificar_*.mjs`. **Las exenciones que viven adentro de
las pruebas y de los medidores quedaban afuera**, porque vaciarlas obliga a correr la prueba dueña
y casi todas necesitan la base de esta máquina levantada. Eran cinco, y una de ellas no se puede
mirar a sí misma.

Mirando qué tenía cada una se ordenaron solas en dos montones. `ROJAS_ESPERADAS`, en
`scripts/probar_todo.mjs`, ya tenía guarda propia: se planta si nombra un pendiente que ya se
cerró, que es como esa lista se pudre. Y `DE_AFUERA`, en `scripts/medir_estado.mjs`, **no puede
pudrirse en silencio por cómo está escrita**: la frase que describe los servidores de afuera sale
de la lista sólo mientras la cuenta coincida, y el día que aparezca uno más el renglón pasa a
nombrarlos a todos y a pedir por escrito que alguien diga de qué es cada uno
(`scripts/medir_estado.mjs:253`). Comprobado corriéndolo con la cuenta cambiada: el renglón cambia
y el pedido sale. Eso no es una exención sin vigilancia; es una que avisa.

Las otras tres se cubrieron con **dos reglas nuevas en `scripts/verificar_red.mjs`**, que es el
chequeo que revisa a los chequeos. Son la forma barata de lo mismo y no necesitan la base, así que
se miran sobre **todos** los guiones de `scripts/`, no sólo sobre los chequeos:

- **La clave que nombra un archivo que ya no está.** Un archivo renombrado o borrado deja la
  exención hablando de un fantasma. Falsificada apuntando una clave real a un nombre que no existe:
  la red se pone roja y nombra el renglón.
- **La clave que nombra una columna que ninguna migración declara.** Es la misma enfermedad un
  escalón más adentro, y es la que faltaba para `LA_SIEMBRA_NO_PUEDE`, en
  `scripts/probar_coherencia_de_la_siembra.mjs`, que era la única lista del proyecto sin ninguna
  guarda **y la que más tapa**: cada renglón suyo apaga el hallazgo de una columna que nadie llena.
  Falsificada en las dos formas, con las claves de verdad: cambiándole la columna y cambiándole la
  tabla.

Qué columnas existen no se lee dos veces: sale de `columnasDeclaradas()`, en
`scripts/verificar_esquema.mjs`, que es donde ya vivía la lectura de las migraciones. Una segunda
copia de esa lectura se despega de la primera el día uno.

**Y una de las cinco se mira al revés en vez de apagarse.** `AJENOS`, en `scripts/citas.mjs`,
nombra archivos que viven en el repositorio de Careonys, así que la regla la habría acusado de
señalar un fantasma cuando ésa es exactamente su razón de ser. La salida no fue eximirla —eso es
volver a dejar de mirar— sino invertirle la pregunta: **los archivos que nombra no tienen que
aparecer nunca acá**, y si alguno aparece, la exención pasó a decir algo falso y hay que sacarla.
La lista que la declara la vigila `probar_exenciones.mjs`, que comprueba que vaciarla pone rojo a
`verificar_red.mjs`.

Escribir la segunda regla dejó además un hallazgo que vale por sí solo. La primera lectura de las
migraciones decía que `avisos.grid_schedule_7x3` no existía, y sí existe
(`supabase/migrations/0001_esquema_inicial.sql:70`). Lo que pasaba es que la 0016 escribió
`alter table public.avisos drop column grid_schedule_7x3;` **adentro de un comentario**, para
explicar lo que esa migración justamente **no** hacía (`supabase/migrations/0016_franjas_de_un_aviso.sql:34`).
Leída sin sacar los comentarios, la explicación de lo que no se hizo lo hace. Por eso
`columnasDeclaradas()` saca los comentarios de renglón entero antes de mirar, y por eso conviene
dejarlo escrito: es la única migración del proyecto con SQL comentado adentro, y alcanzó para
inventar una columna perdida.

**Lo que estas reglas no dicen.** No dicen que una exención siga eximiendo algo: dicen que lo que
nombra existe. Vaciarlas y exigir el rojo sigue siendo la prueba fuerte, y sigue necesitando la
base. La diferencia es que ahora ninguna de las cinco está sin nada.

---

### El aislamiento del depósito de archivos lo sostiene un índice de otra migración, y no lo decía nadie

La regla de la empresa es literal: «Los archivos se guardan privados por defecto… **La ruta empieza
por la Organización, y la política lo exige**». Acá el camino empieza por la **cuenta**:
`<cuenta>/<archivo>`. Las dos políticas propias del depósito comparan la primera carpeta contra
`auth.uid()` (`supabase/migrations/0006_archivos_del_legajo.sql:52` y `:63`), así que cada cuenta
llega a la suya y a ninguna otra, y **hacia afuera no hay agujero**. La pregunta que faltaba
contestar es otra: qué separa a una Prestadora de otra.

La respuesta estaba, pero en otro archivo. **Una cuenta tiene un solo legajo**, por el índice único
`idx_caregivers_user_unico` (`supabase/migrations/0005_acceso_por_sesion.sql:40`). La tercera
política, la que deja mirar al personal de la Prestadora
(`supabase/migrations/0006_archivos_del_legajo.sql:78`), llega a la carpeta **por ese legajo**. El
día que una misma cuenta tenga legajo en dos Prestadoras —que es justo a donde apunta un mercado—
las dos ven la carpeta entera, con los papeles que la persona subió para la otra. De las tres
menciones que ese índice tiene en todo el proyecto, **ninguna dice que el depósito de archivos
depende de él**.

De ahí salió **la séptima regla de `scripts/verificar_esquema.mjs`**: toda política sobre
`storage.objects` nombra la Organización en su condición. Es la única política que ese chequeo lee,
y por un motivo. En una tabla, si la política se equivoca, todavía queda la columna de la
Organización a la vista y las otras seis reglas la miran. En el depósito **no hay columna que
mirar** —el camino es una cadena de texto—, así que la condición es lo único que separa a una
Prestadora de otra.

Y la exención pide **dos cosas, no una**: el motivo, y **qué sostiene el aislamiento en su lugar**.
Esa segunda mitad es la que faltaba en el proyecto. Una política del depósito que no nombra la
Organización siempre está apoyada en algo que vive en otro archivo, y lo que no se escribe al lado
no se entera nadie el día que ese algo cambie. Ahora
`SIN_ORGANIZACION_EN_EL_DEPOSITO` es donde esa dependencia está escrita, y
`scripts/probar_exenciones.mjs` la tomó sola: vaciarla pone rojo al chequeo, comprobado.

El `avatares` es aparte y está bien: es público **a propósito** desde la 0006, porque la foto es lo
que el directorio muestra sin cuenta (`js/apiClient.js:805`). Ahí no hay nada que aislar hacia
afuera; lo que la condición cuida es la escritura, que nadie deje una foto en la carpeta de otro.

Mover el camino a `<Organización>/<cuenta>/<archivo>` no es sólo una migración: hay que mudar los
archivos ya subidos, y eso toca datos publicados. Queda como **pendiente 115**, con las dos salidas
escritas y con la honesta primero: hoy no es explotable, es latente y era silencioso.

---

### La Organización salía de la membresía porque estaba bien escrita, no porque algo lo exigiera

La regla de la empresa nombra el peligro con todas las letras: la política resuelve la Organización
por la membresía verificada de quien inició sesión, **nunca por un valor que venga en el pedido**
—encabezado, subdominio, parámetro—, porque esas fuentes las falsifica quien llama. Quien llama
arma el pedido entero: preguntarle a él de qué Organización es equivale a no preguntar nada.

Medido antes de escribir nada, el proyecto estaba limpio: **ninguna** de las 59 políticas lee del
pedido, y las 108 veces que aparece la Organización adentro de una condición salen de
`public.prestadora_actual()`, que la va a buscar a `profiles` por `auth.uid()`
(`supabase/migrations/0002_aislamiento_por_prestadora.sql:34`). Su comentario ya lo decía: «Sale de
su membresía, nunca del pedido»
(`supabase/migrations/0002_aislamiento_por_prestadora.sql:48`). Pero un comentario no obliga a
nadie. Lo que faltaba no era arreglar algo, era **impedir que entre**.

Eso es la **octava regla de `scripts/verificar_esquema.mjs`**: ninguna migración resuelve la
Organización leyendo `current_setting(...)`, `request.headers`, `request.jwt.claims` ni
`auth.jwt()`. Los tres primeros son literalmente el pedido. El cuarto entra aunque el token venga
firmado, y ése es el que más engaña: adentro del token viaja `user_metadata`, que en Supabase **la
escribe la propia cuenta**. Una política que sacara de ahí el `tenant_id` estaría dejando que cada
quien se declare de la Organización que quiera. `auth.uid()` no entra en la lista y no tiene por
qué: no es un valor del pedido, es quién inició sesión.

Falsificada de las dos maneras. Con las pruebas de adentro del propio archivo, que ya tenían la
forma —dos casos `MAL` que tienen que dar rojo y dos `BIEN` que tienen que pasar, y el chequeo se
planta si el detector deja de distinguirlos—, y **contra una migración de verdad**: agregándole un
`current_setting('request.headers', true)` se pone rojo y nombra el renglón; agregándole un
`auth.jwt()`, también.

**Y es la única regla del archivo sin lista de exenciones, a propósito.** Hoy no hay un solo caso,
así que la lista nacería vacía, y una lista vacía no la puede probar `scripts/probar_exenciones.mjs`:
vaciar lo que ya está vacío no pone rojo a nadie. Sería una exención sin ninguna guarda, que es la
enfermedad que estas dos noches se dedicaron a perseguir. El día que aparezca un caso legítimo se
crea la lista **con ese caso adentro**, y ahí sí la prueba la alcanza.

De paso salió otro número escrito a mano que ya estaba viejo: un comentario del mismo archivo
hablaba de leer «las quince juntas» cuando las migraciones son 49. Dice ahora «todas juntas», que
no envejece.

---

### El catálogo escrito a mano tenía regla, tenía historia y no tenía quien lo mirara

Dos reglas dicen lo mismo desde hace tiempo. La de la empresa: «Los catálogos salen de la base. Una
lista de opciones nunca se escribe adentro de una pantalla». La del producto, más filosa, porque
dice qué queda cuando no se cumple: «Cada lista de opciones que hoy esté escrita adentro de un
componente es una tabla que alguien no creó» (`CLAUDE.md:95`). Y hasta ahora no había nada que las
hiciera cumplir.

Medido antes de escribir nada, sobre las 17 pantallas: seis `<option>` en total. Uno vive adentro
de un comentario de `cursos.html` que explica algo que ya no está. Dos son el renglón vacío que
abre un desplegable —«Elija una opción…»—, que no es un catálogo. **Y tres son de verdad**: los
horarios de turno de `solicitar-asistente.html:197`, `:198` y `:199`. Las opciones que los guiones
arman con `createElement('option')` salen de datos, que es la forma correcta, y no se cuentan.

Esos tres no son un descuido suelto: son la misma enfermedad del **pendiente 31**.
`avisos.schedule_type` junta hoy cuatro formas de decir lo mismo —`turno_manana`,
`guardia_12`, `flexible`, `A coordinar`— porque cada pantalla escribió la suya, y ninguna es clave
de ningún vocabulario. Mientras la columna no tenga vocabulario, `scripts/verificar_claves.mjs` no
la puede mirar, así que el día que entre la quinta forma no se entera nadie. Lo que hace
`scripts/verificar_opciones.mjs` es impedir que entre la quinta.

La exención está escrita distinto de casi todas las del proyecto, y a propósito: **no perdona la
pantalla, perdona los tres valores exactos**. Perdonar el archivo entero apagaría el chequeo sobre
todo lo que ese archivo tenga después, que es exactamente la forma en que una exención deja de
eximir y pasa a tapar —lo que estas noches vinieron persiguiendo—. Una opción nueva en
`solicitar-asistente.html` se planta igual.

Falsificado de tres maneras. Con las pruebas de adentro del propio archivo, dos casos `MAL` y tres
`BIEN`. Vaciando la exención, que pone rojo los tres renglones reales —y eso lo comprueba solo
`scripts/probar_exenciones.mjs`, que lo tomó sin tocarle nada: van 12 exenciones en 29 chequeos—.
Y agregándole un `<option value="rcp">` a `cursos.html`, que lo nombra por su renglón.

**Y la red de chequeos lo corrigió mientras nacía.** La primera versión escribía la clave de la
exención como `solicitar-asistente.html`, con la extensión adentro; `scripts/verificar_red.mjs` se
plantó en el acto por las dos cosas que sabe mirar: que la extensión de las pantallas no se escriba
a mano ni siquiera escondida en la clave de una exención, y que la tabla del README nombre a todos
los chequeos. Las dos reglas se escribieron el 31 de agosto de 2026, y al día siguiente ya habían
atajado a un chequeo nuevo. Un guardarraíl que corrige al que lo escribió es la única prueba
convincente de que sirve.

---

### La regla que abría de verdad estaba escrita en una migración, y no la miraba nadie

La 0032 encontró un agujero y lo cerró. Lo dejó escrito con todas las letras: «`TRUNCATE`, que no
mira ninguna política. La RLS filtra filas; vaciar la tabla no es filtrar filas. Cualquiera con
sesión iniciada podía vaciar cualquiera de las diecisiete tablas. Es el agujero de verdad»
(`supabase/migrations/0032_los_permisos_de_tabla_al_minimo.sql:16`). Y en el mismo encabezado dejó
la consecuencia, con el título en mayúsculas: toda migración que cree algo tiene que conceder sus
permisos explícitamente, o la pantalla recibe `42501` con una sesión válida.

Lo que faltaba es lo de siempre: **esa regla vivía en la prosa de una migración**, que es el único
lugar del proyecto que nadie vuelve a leer. Un `grant all` en la migración de mañana devuelve
`TRUNCATE` a `authenticated`, y ninguna política se entera, porque `TRUNCATE` no pasa por las
políticas.

Medido antes de escribir nada: desde la 0032 hay **30 permisos de tabla**, ninguno con `all` ni con
`truncate`, y los verbos escritos uno por uno. Otra vez no había nada que arreglar; faltaba lo que
impide que entre el primero.

Esa es la **novena regla de `scripts/verificar_esquema.mjs`**. Y tiene una decisión que no es la
habitual: **empieza en la 0032 y no antes**. La 0001 es el volcado que dejó la instalación, con
veintiún `GRANT ALL ON TABLE` adentro —catorce de ellos a `anon` o a `authenticated`, que es
justamente lo que la 0032 vino a sacar—, y una migración aplicada no se edita. Ponerle rojo a esa historia sólo enseñaría a apagar el chequeo. El
límite **no es una exención**: es la migración que cerró la puerta, y desde ella la regla rige
entera, sin lista de perdonados y sin ninguna forma de agregar uno. `service_role` queda afuera
porque es la llave del servidor y tiene que poder todo, tal como lo dejó dicho la 0032.

Y mira **lo que abre de más, no lo que abre de menos**. Que una tabla nueva se olvide de conceder
sus permisos no se avisa: desde la 0032 nace sin ninguno, así que falla cerrada —`42501` en la
pantalla, ruidoso y del lado seguro—, y además hay casos legítimos, como una tabla que sólo tocan
funciones `security definer`. Lo que no tiene caso legítimo es `truncate`.

Falsificada de cuatro maneras, y la cuarta es la que importa. Con las pruebas de adentro del propio
archivo —dos casos `MAL` y tres `BIEN`, entre ellos el `grant all` a `service_role` y un `grant
execute`, que no es un permiso de tabla—. Agregándole un `grant all` a la 0041, que se pone rojo y
nombra el renglón. Agregándole un `grant select, truncate`, ídem. Y **agregándole el mismo
`GRANT ALL` a la 0001, donde tiene que seguir verde**: sin esa cuarta prueba, el límite entre la
historia y la regla sería una afirmación del encabezado en vez de una conducta comprobada.

De paso, la cuenta del renglón verde estuvo mal un rato y da un ejemplo chiquito de lo mismo: daba
31 en vez de 30 porque contaba un `grant` que la 0047 **cita adentro de un comentario** para
explicarlo. Un número que cuenta prosa es primo hermano de un número escrito a mano.

---

### Dos depósitos, uno público y otro privado, y nada que comprobara cuál era cuál

La regla de la empresa es de un renglón: los archivos se guardan privados y se sirven con dirección
firmada y vencimiento, nunca con dirección pública. Este producto tiene **dos** depósitos y uno es
público a propósito —`avatares`, porque la foto del directorio se ve sin cuenta—, así que acá la
regla no puede ser «ninguno es público». Es que **cada uno se use como fue declarado**, y que quién
es cuál salga de la migración que los crea y no de la memoria de quien escribe la pantalla.

Medido antes de escribir nada: dos depósitos declarados en
`supabase/migrations/0006_archivos_del_legajo.sql:27` y `:37`, diez nombres de depósito escritos en
el código y nueve llamadas a `.storage.from(`, las nueve adentro de las tres copias de `js/auth.js`.
Todo correcto. Otra vez no había nada que arreglar; faltaba lo que impide el primer error.

Y el primer error tiene dos tamaños muy distintos, que conviene no mezclar. **Equivocarse el nombre
falla callado**: el depósito no existe, `urlFirmada()` devuelve `null` y la pantalla no muestra el
archivo sin decir por qué. **Confundirse de depósito en la dirección pública publica un documento de
identidad**, que es el peor error posible de este producto. `js/apiClient.js:815` arma una dirección
pública a mano, con el nombre del depósito pegado adentro del texto de la dirección: cambiar ahí una
palabra por la otra es un renglón.

La tercera regla es la que no se ve venir. `.storage.from(` sólo puede salir del archivo que define
`urlPublica()` y `urlFirmada()`, porque ahí es donde está escrita **una sola vez** la diferencia
entre un enlace que vence y una dirección para siempre. Una llamada suelta la vuelve a decidir, y
ahí es donde se decide mal. El archivo no está nombrado por su ruta: se lo busca **por lo que
define**, así que las tres copias de `js/auth.js` —el pendiente 13— pasan sin figurar en ninguna
lista, y el día que se desdupliquen la regla sigue valiendo sin tocarla.

Falsificado de siete maneras. Con las pruebas de adentro del propio archivo, cuatro casos `MAL` y
cuatro `BIEN`. Y con tres sobre archivos de verdad, restaurándolos después: escribiéndole
`documentos_cuidadores` con guión bajo a `panel-prestadora.html`, que lo nombra por su renglón;
cambiando el depósito de la dirección pública de `js/apiClient.js` por el privado, que dice que un
enlace eterno a un documento de identidad **es** el documento; y agregándole un `.storage.from(` a
`js/catalogo.js`, que no define ninguna de las dos funciones.

**No tiene lista de exenciones, y es a propósito.** Hoy no hay ningún caso que la necesite, así que
nacería vacía; y una lista vacía no la puede probar `scripts/probar_exenciones.mjs`, porque vaciar
lo que ya está vacío no pone rojo a nadie. Sería una exención sin guarda, que es la enfermedad que
estas noches vinieron persiguiendo. Es la segunda regla del proyecto que se escribe así, después de
la octava de `scripts/verificar_esquema.mjs`.

---

### Una tabla que existe y contesta 404, y nada que lo impidiera

La regla de la empresa es de un renglón y estaba escrita sólo en prosa: todo cambio de esquema
termina con `NOTIFY pgrst, 'reload schema';`, porque sin eso PostgREST puede devolver 404 en tablas
que sí existen. Ningún chequeo la miraba. Se comprobó buscando la palabra en los 61 guiones de
`scripts/`: no aparecía en ninguno.

Conviene entender por qué el error es tan confuso. PostgREST no le pregunta a la base en cada
pedido: guarda una copia de qué tablas, qué columnas y qué funciones hay, y a quién le tocan. Una
migración que agrega algo y no avisa deja esa copia vieja. Entonces la pantalla pide una tabla
**que está creada**, recibe un 404, y quien lo mira sale a buscar un permiso, una política o un
nombre mal escrito. Lo que falta es un aviso.

Medido antes de escribir nada, sobre las 49 migraciones: **21 cambian el esquema y no avisan, y las
21 están entre la 0001 y la 0024**. Desde la 0025 hay 15 que cambian el esquema y **las 15 avisan,
y las 15 lo hacen en el último renglón**. La regla empezó a cumplirse sola en la 0025 y no se
rompió una sola vez desde entonces.

Eso decidió la forma del chequeo. Una lista de perdonados de veintiuna filas es exactamente la
enfermedad que estas noches vinieron persiguiendo, y además las veintiuna comparten un único
motivo: se escribieron antes y **una migración aplicada no se edita jamás**. Así que el límite se
escribe una vez, como ya lo hace la novena regla con la 0032: la décima rige desde la 0025. No es
una exención, es el renglón donde la regla empezó a cumplirse, y no se lo puede esquivar sin
querer, porque una migración nueva siempre lleva un número más alto.

Hay una segunda mitad que no se ve venir: **el aviso va al final, y eso no es prolijidad**. Recarga
lo que hay en ese momento, así que lo que se escriba detrás queda afuera de esa recarga —y encima
el aviso parece puesto—. El chequeo lo dice con otras palabras cuando pasa, y nombra el renglón
donde está el aviso suelto.

Sembrar filas no es cambiar el esquema, y por eso un `insert` solo no pide aviso: PostgREST no
guarda filas. Ocho migraciones avisan sin cambiar nada —la 0027, la 0028, la 0030, la 0031, la
0039, la 0040, la 0042 y la 0045— y eso no molesta a nadie. Recargar de más no rompe; lo que rompe
es no recargar. Las dos últimas, la 0048 y la 0049, escriben en un comentario «sin cambios de
esquema: no hace falta `NOTIFY pgrst`», que es la misma lectura hecha a mano.

Falsificada de cinco maneras. Con las pruebas de adentro del propio archivo: una migración nueva
que cambia el esquema y no avisa, la misma con el aviso puesto en el medio y un cambio detrás, y un
`grant` suelto —que también cambia lo que PostgREST tiene guardado— dan rojo; la que termina con el
aviso, la de datos que no lo necesita, el aviso nombrado adentro de un comentario y **la migración
vieja con el número anterior al límite** dan verde. Y con dos sobre un archivo de verdad,
restaurándolo después: sacándole el último renglón a la 0047, que la puso en rojo por lo que no
avisa, y volviéndoselo a poner con un `alter table` detrás, que la puso en rojo por avisar en el
medio.

Para poder probar las dos reglas que tienen límite hizo falta un cambio chico en el arnés: los
casos de prueba pueden traer un tercer valor, el nombre del archivo. Sin nombre no hay número, y
sin número no se puede probar desde cuándo rige una regla.

---

### Las dos puertas que guardan sin que nadie se lo pida

La regla de la empresa dice «nunca información sensible en registros, direcciones, parámetros ni
mensajes públicos». Son cuatro superficies y había una sola mirada: los mensajes públicos, por
`scripts/verificar_escapado.mjs`. Las otras tres —que en realidad son dos, porque «direcciones» y
«parámetros» son la misma barra— no las miraba nada.

Lo que las hace distintas de una pantalla es que **guardan sin que nadie se lo pida**. Una
dirección queda en el historial del navegador, en el «compartir» y en el registro de cualquier
intermediario que la vea pasar; nadie decidió guardarla. Un `console.log(legajo)` que quedó de
cuando se estaba arreglando algo imprime un documento de identidad en la consola de cualquiera que
abra esa pantalla, y no se ve en la pantalla, así que nadie lo nota.

Medido antes de escribir nada, sobre los 49 archivos del producto —sin `scripts/`, que es la
terminal de quien programa—:

- **La barra: ocho nombres de parámetro en uso** —`id`, `tenant`, `t`, `idioma`, `volver`,
  `evaluacion`, `error` y `error_code`—, veintiuna apariciones entre las que se escriben y las que
  se leen. Ninguno lleva un dato de una persona: `id` es un uuid, `tenant` y `t` son el nombre
  corto de la Prestadora, `evaluacion` es una clave del catálogo, y `error` y `error_code` los
  escribe Supabase al devolver a quien vino de un correo de recuperación con el enlace vencido.
- **El registro: 102 `console.*`**. Cien son `console.error` o `console.warn` con la forma
  `'contexto:', err`. Los dos `console.log` avisan que se registró el trabajador del navegador.
  Con la regla escrita —cada argumento lleva un texto o es un error— **fallan exactamente tres
  renglones**, que son el mismo renglón en las tres copias de `js/catalogo.js` (pendiente 13).

Esos tres comparten un motivo legítimo y por eso quedan como la única exención: imprimen el texto
crudo del atributo `data-huecos` cuando no es un JSON válido. Lo escribe quien programa el marcado,
no una persona que usa el producto, y sin verlo el aviso no sirve para arreglarlo. Es una exención
con un renglón, escrita como Map, así que `scripts/probar_exenciones.mjs` la puede vaciar y exigir
el rojo —y lo hace, igual que con el catálogo de parámetros—.

**La parte difícil no fue detectar, fue distinguir.** Que una dirección lleve `?algo=` no dice que
sea la barra: puede ser la fuente de letra o un `mailto:`. Dos intentos fallaron primero. Mirar
«lo que hay antes en el mismo renglón» dio dos rojos falsos, porque el `mailto:` del formulario de
consulta nombra el destino en un renglón y el asunto en el siguiente. Mirar hacia atrás hasta el
`;` más cercano dio diecisiete, porque la dirección de Google Fonts lleva `;` adentro
—`wght@400;500;600;700;800`— y el corte caía adentro de la propia dirección, escondiendo el `://`
del principio. Lo que funciona es mirar **la cadena de textos escritos pegados con `+`**: la
dirección de la fuente es un solo texto que contiene `://`, y `'?subject='` está a un eslabón de
`'mailto:'`. Las dos formas quedan como casos de prueba adentro del archivo, para que el próximo
intento de simplificar el detector se ponga rojo.

El chequeo **no juzga si un nombre de parámetro suena sensible**. No sabría: `t` no suena a nada y
`legajo` suena a todo, y el día que alguien mande el documento en un parámetro llamado `x` ningún
guion lo va a adivinar. Lo que hace es obligar a que cada nombre esté declarado con su motivo
escrito al lado, que es la única cosa que un guion puede sostener ahí: lo que viaje por la barra
hay que decidirlo, no descubrirlo.

Falsificado de cuatro maneras sobre archivos de verdad, restaurando cada uno después: cambiando
`?id=` por `?dni=` en `directorio.html`, cambiando el `volver` que lee `acceso.html` por un
`legajo`, agregando un `console.error(cual)` suelto en `js/catalogo.js` y agregando ahí mismo un
`console.error('Catálogo: ' + JSON.stringify(cual))`, que es justo la forma que un chequeo ingenuo
deja pasar porque lleva un texto adelante. Los cuatro dieron rojo, y ninguno quedó en el árbol.

### Tres reglas candidatas murieron al medirlas, y la cuarta encontró la asimetría

La búsqueda de esa noche era la de siempre: una regla de la empresa que esté escrita en prosa y
que no mire nadie. Aparecieron cuatro candidatas y **tres murieron al medirlas**, que es como
tiene que ser: un chequeo que naciera rojo no es un chequeo, es un pendiente disfrazado.

- **«Todo permiso de escritura nombra sus columnas.»** La primera medición dijo que faltaban
  pocas. Estaba mal: el `grep` estaba anclado en `^grant (insert|update|delete)`, y así no ve las
  veintidós escritas `grant select, insert, update, delete on table …`. Contadas bien, la regla
  nacía rojo casi entero. La respuesta honesta era **tirar la regla, no acomodarla**, y la
  corrección de mi propia medición vale tanto como el chequeo que sí salió.
- **«Las tablas que deciden un permiso sólo se escriben por columna.»** Roja en `caregivers`, que
  tiene el permiso de tabla entero —y que resulta estar bien protegida, por el `with check` de su
  propia política—.
- **«El `with check` nunca es más flojo que el `using`.»** Roja en dos de la 0020 que lo angostan
  **a propósito**: se puede leer un mensaje del aviso en el que uno participa y no se lo puede
  escribir como si fuera de otro.

La cuarta midió verde y quedó escrita: **toda política que deja escribir nombra la Organización
en la condición que gobierna la fila que queda escrita**.

**Qué agujero cierra.** Una política tiene dos condiciones y no dicen lo mismo. El `using` dice
**qué filas se pueden tocar**; el `with check`, **cómo pueden quedar después**. Una que pida la
Prestadora sólo en la primera deja tocar nada más que las propias —parece bien— y después deja
guardarlas **con la Prestadora de otro**. Leer sigue funcionando perfecto, la pantalla no cambia,
y la fila se fue. Cuando el `with check` no está escrito Postgres copia el `using`, así que
omitirlo es seguro: el agujero es escribirlo más flojo. Hoy hay dos así y las dos quedan verdes
por herencia.

**Las políticas muertas no se juzgan, y eso no es un límite escrito.** Siete de la 0001 escriben
`with check (true)`, que es el agujero entero, y una migración aplicada no se edita. La novena
regla y la décima resolvieron eso con una migración de corte —`0032`, `0025`—. Esta no hizo
falta: la regla **calcula** si alguna migración posterior borra la política por su nombre. Las
siete de la 0001 las borra la 0002, veintisiete de las cuarenta y siete están dadas de baja, y
quedan veinte en pie. Es más angosto que un límite y además se rearma solo: si alguien vuelve a
crear mañana una de esas siete con el mismo nombre, esta vez se juzga.

**Y las que crea un bucle se juzgan igual.** La 0005 y la 0012 escriben cuatro políticas adentro
de un `execute format`, una por cada tabla de un arreglo. El texto del `create policy` está ahí
entero y lo único que llega como hueco es el nombre de la tabla, `%I`. La primera versión las
leía igual pero les decía `public` de tabla, que es un nombre inventado; ahora dice «de las
tablas que arma el bucle». Un nombre equivocado en un mensaje de falla sólo se ve el día que la
regla se pone roja, que es justo el día en que tiene que estar bien.

**La única exención se comprueba en vez de creerse.** `profiles` no puede preguntar
`prestadora_actual()`: es la tabla de donde esa función saca la respuesta, así que una política
suya que la preguntara se estaría preguntando a sí misma. Lo que impide mudarse de Prestadora, o
hacerse `coordinador`, no es su política: es el **permiso por columna**, `grant update
(full_name)` y nada más. Una exención común diría eso y pediría que se le crea. Ésta manda a
mirar: el chequeo va y verifica que ningún permiso de escritura sobre `profiles` haya salido sin
lista de columnas. **No es una precaución teórica —la 0032 sacó ese permiso sin querer y la 0033
tuvo que devolverlo—**, así que es una regresión que ya pasó una vez y que no tenía quien la
mirara.

Falsificada sobre una migración de verdad, cambiando el `with check` de una política de la 0020
por `true` y restaurándola después: dio rojo con el archivo, el renglón y el nombre de la
política. Y diez casos nuevos adentro del banco de pruebas del propio chequeo, cuatro que tienen
que dar rojo y seis que tienen que pasar —entre ellos el `with check` más angosto, la política sin
`with check`, la que da de baja una migración posterior y el permiso por columna—. Uno de esos
seis salió rojo la primera vez y estaba bien que saliera: el banco de pruebas no le pasaba las
bajas al detector, así que la política dada de baja se juzgaba igual.

### La regla que nadie podía mirar leyendo los archivos, y la renumeración que encontró

`CLAUDE.md` de la empresa abre «La base de datos: sólo por migraciones» con tres renglones
numerados. El segundo —que la migración corra entera o no corra— lo mira `verificar_esquema.mjs`.
**El primero y el tercero no los miraba nadie**, y no por descuido: son las dos únicas reglas del
proyecto que **no se pueden mirar leyendo los archivos de hoy**. Una migración editada ayer se ve
exactamente igual que una que nunca se tocó. La única fuente que lo sabe es el historial.

**Lo que apareció al preguntarle a git.** Doce incumplimientos, todos del 24 y el 25 de agosto de
2026, y ninguno después. Diez ediciones, una baja —la 0011 vieja— y, la que nadie había
anotado, **una renumeración**: el 25 de agosto la `0015_franjas_de_una_busqueda.sql` pasó a
llamarse `0016_franjas_de_un_aviso.sql` para meterle una nueva 0015 adelante. Es exactamente la
reordenación que el tercer renglón prohíbe, hecha a propósito y sin que quedara escrito en
ningún lado. Quien hubiera corrido las migraciones el día anterior tiene una base que ningún
archivo de hoy explica.

**Por qué el límite no es un perdón.** Igual que la novena regla del chequeo de esquema y la
décima, éste lleva un límite —`SE_DEJARON_QUIETAS = '2026-08-25'`— en vez de doce exenciones. La
diferencia con un perdón se muerde la cola y por eso es honesta: **la única manera de poner en
verde a esos doce sería editar las migraciones o reescribir el historial, y las dos cosas son
justamente lo que esta regla prohíbe.** No es que se los disculpe: es que ya no se pueden
arreglar, y quien lo intente rompe la regla otra vez. Se cuentan igual y salen con `--detalle`,
para que el número no desaparezca.

**Doce, no catorce: mi propia medición contaba dos veces.** La primera cuenta dio catorce, con dos
altas «con un número que el árbol ya había pasado». Las dos eran el mismo hecho contado de nuevo:
la 0011 nueva entró en el commit que borra la 0011 vieja —mismo número, no se mueve nada—, y la
0015 nueva entró en el commit que renumera la 0015 anterior, que es justamente el hueco que le
hace lugar. Un hecho, un renglón. Se arregla midiendo el tope **sin contar los archivos que ese
mismo commit está moviendo**, y en cualquier otra forma sigue apretando igual: si el commit borra
la 0035 y trae una 0030, el tope baja a 0034 y la 0030 sigue dando rojo. Es la segunda vez en dos
noches que una medición propia sale mal antes que el chequeo; el orden —medir, y recién después
escribir— es lo que deja verlo.

**Y mira lo que todavía no es un commit.** Este chequeo corre en el gancho de antes de cada
commit, y ahí el commit no existe. Un chequeo que mirara sólo el historial avisaría **un commit
tarde**: la migración ya movida, ya cometida y, con el `push` a `main` que despliega solo, ya
publicada. Así que lo que está cambiado contra `HEAD` —preparado o no, y también lo que git
todavía no conoce— se juzga como un commit más, con la fecha de hoy.

**La falsificación encontró un error de verdad.** Seis pruebas contra archivos reales,
restaurándolos después: editar una migración cometida, borrarla, renumerarla sin preparar,
renumerarla con `git mv`, traer una 0040 cuando el árbol va por la 0049 —las cinco tienen que dar
rojo—, y dos que **tienen que pasar**: una 0050 legítima y un renombre que no toca el número. La
cuarta rompió el guion en vez de dar rojo: un renombre preparado ocupa **dos** campos en la salida
de `git status -z` —primero el nombre nuevo, después el viejo— y el lector tomaba el nombre viejo
como si fuera otro cambio, sacando su estado de las dos primeras letras del propio nombre. Una
falsificación que sólo prueba los casos que uno ya pensó no prueba nada; éste salió del único
caso que se probó de dos maneras.

### La regla que se defiende sola, y el error que encontró adentro de la anterior

La duodécima regla del chequeo de esquema hace cumplir un renglón de `CLAUDE.md` de la empresa que
hasta ahora vivía sólo en prosa: **cuando la plataforma no deja compartir código, el punto único de
verdad es una función SQL reutilizada por todas las políticas, nunca la misma condición copiada
política por política**. En Postgres una política no puede llamar a otra ni heredar de ninguna, así
que la única manera de no repetir la condición es que todas le pregunten a la misma función. Acá
esa función es `public.prestadora_actual()`, definida en la 0002 y en ningún otro lado.

**Se midió antes de escribir una línea, y salió verde entera.** Treinta y tres comparaciones contra
la columna de la Organización en las políticas que siguen en pie, las treinta y tres resueltas
llamando a la función; ninguna que rehaga la cuenta con un `select` propio, ni siquiera entre las
políticas ya dadas de baja; y ninguna segunda función que deduzca la Organización. Por eso este
chequeo **no lleva límite de migración ni lista de exenciones**: no hace falta perdonar nada, sólo
impedir el primero.

**Y la única que tiene derecho a deducirla no es una exención con otro nombre.** `LA_RESUELVE` no
está en un `Map` de exenciones porque no perdona: nombra el punto único de verdad que la regla
existe para proteger. Una lista de exenciones crece; esto es siempre una sola, y el día que la
resuelva otra función lo que cambia es ese renglón, no la regla.

**Por qué importa una copia que hoy contesta lo mismo.** Porque contesta lo mismo *hoy*. El día que
la función aprenda algo —que la membresía tenga que estar activa, que una sesión de soporte no
cuente, que una persona dada de baja deje de ver— la copia sigue contestando lo de antes. Y no lo
nota nadie, porque leer sigue funcionando igual: lo que cambia es a quién se le sigue dejando
entrar. Es la forma de siempre en este archivo, la que no se ve mientras anda.

**La falsificación encontró un agujero adentro de la undécima, que ya estaba publicada.** Para
probar que la regla nueva podía fallar se rompió una política real: se le hizo resolver la
Organización con un `select` propio, y el chequeo **pasó en verde**. La política estaba escrita
debajo de su propio `drop policy if exists` —que es como se escriben todas acá— y el chequeo la
daba por dada de baja. El motivo: las bajas se medían sobre el archivo tal como llega del disco y
las altas sobre el texto con los finales de renglón unificados. En Windows cada renglón ocupa dos
caracteres, así que **toda posición del archivo crudo viene corrida hacia adelante tantos
caracteres como renglones haya arriba**, y a partir de cierta altura del archivo la baja parece
estar *después* del alta que la precede.

**Ocho políticas vivas no las miraba nadie, y siete de ellas escriben.** Cuatro de la 0020 —los
mensajes, los reportes, las fichadas y el puntaje de la Prestadora— y las cuatro de la 0041. La
undécima regla llevaba desde que se publicó sin juzgarlas. Se comprobó de la única manera que
prueba algo: poniéndole `with check (true)` al puntaje de la Prestadora, que es el agujero entero,
y corriendo las dos versiones contra el mismo archivo roto. **La publicada pasó en verde; la de hoy
lo encuentra.**

**Y el contador iba por el otro carril.** La cuenta del renglón verde medía sobre el archivo crudo,
así que era correcta: decía veinte políticas de escritura en pie, y son veinte. Lo que se había
despegado no era el número sino el juicio: el renglón verde afirmaba que las veinte nombran la
Organización cuando sólo trece se habían mirado. El comentario que está justo encima de esa cuenta
dice «la cuenta sale del mismo lugar que la regla, para que no se despeguen», y se habían despegado
igual, un piso más abajo de donde ese comentario mira. Las dos mediciones se unificaron sobre el
mismo texto.

**Tres veces seguidas la falsificación encontró algo que no se estaba buscando**: el renombre
preparado en el chequeo de migraciones, la doble cuenta de mi propia medición, y ahora una regla
publicada que se salteaba ocho políticas sin decirlo. Ninguna de las tres apareció leyendo el
código; las tres aparecieron rompiendo un archivo real y mirando si el chequeo se daba cuenta.

### El nombre que ya se guardó, y por qué el costo no se paga una vez

La decimotercera regla del chequeo de esquema hace cumplir otro renglón de `CLAUDE.md` que hasta
ahora vivía sólo en prosa: **lo que se guarda para siempre se nombra por lo que hace, y no se
renombra**. Son tres capas y la regla existe para que no se mezclen. Lo **visible** puede cambiar
cuando cambia la marca. Lo **guardado** —tablas, columnas, claves, prefijos de archivo— se nombra
por su función y no cambia nunca. Y lo **histórico** ya quedó escrito y no se toca. Un renombre las
mezcla, y convierte lo que parecía un cambio de nombre en una migración de datos.

**El costo no se paga una vez, se paga siempre.** El nombre viejo no se va a ningún lado: queda en
las filas cargadas antes, queda en toda migración anterior —que por la regla de la empresa no se
puede editar— y queda adentro de los chequeos, que a partir de ese día tienen que seguirle el hilo
para saber de qué tabla se está hablando. La prueba está en el propio archivo que ahora hace
cumplir la regla: `nombreDeHoy()` existe en `scripts/verificar_esquema.mjs` únicamente para
recorrer la cadena de renombres viejos, y va a seguir existiendo aunque no se renombre nada más.

**Se midió antes de escribir una línea.** Hay dieciocho renombres en las cuarenta y nueve
migraciones, y están los dieciocho en cuatro archivos: la 0012, la 0015, la 0019 y la 0022. No son
dieciocho motivos: es uno solo. Los cuatro encabezados cuentan el mismo acomodamiento del glosario
—«bandera» que no era una casilla, `care_searches` que no guardaba una búsqueda, `logbook_entries`
que se llamaba de tres maneras a la vez, `peso` que se leía como dinero—, decidido por el
Desarrollador entre el 24 y el 25 de agosto de 2026. El encabezado de la 0022 dice incluso por qué
en ese momento salía barato: *«sale barato porque la base todavía no tiene datos reales»*. Ese es
justo el argumento que deja de valer el día que los tenga.

**Por eso el chequeo lleva una fecha y no una lista de perdones.** `NO_SE_RENOMBRA_DESDE = '0023'`
es la migración siguiente a la última que renombró; de ese lado del límite hay veintisiete
migraciones y ningún renombre. Una lista de exenciones habría dicho lo mismo hoy y habría crecido
mañana; un límite no crece: o la migración es anterior al día que se cerró el glosario, o la regla
la juzga.

**Las políticas entran también, y no por simetría.** Acá cada política se vuelve a crear con un
`drop policy if exists` que la busca por el nombre. Una política renombrada deja esos drops
apuntando a nada —y deja a la undécima y a la duodécima dándola por viva cuando ya no lo está—, que
es exactamente la clase de error que no se ve mientras el sistema anda.

**Y la falsificación se corrió contra un archivo real, no sólo contra el banco de pruebas.** Se le
agregó a la 0041 un `rename column` de verdad, puesto antes del `notify` para que ninguna otra
regla pudiera dispararse y confundir el resultado, y se corrieron las dos versiones contra el mismo
archivo roto: **la publicada pasó en verde y la de hoy lo encuentra**, con el renglón exacto.

### La migración entra entera, y los dos errores que encontró en sí misma

La decimocuarta regla hace cumplir el segundo punto de `CLAUDE.md` §9: **toda migración corre entera
o no corre, sin dejar la base a mitad de camino**. Es la regla de la que depende que el orden de los
archivos signifique algo: si una migración puede quedar aplicada por la mitad, el número de arriba
del archivo deja de decir en qué estado está la base, y reconstruirlo pasa a ser un trabajo aparte
—que es exactamente lo que le pasó a Careonys con sus 76 `.sql` sueltos, y el motivo por el que la
regla está escrita—.

**Son dos maneras de romperla, con consecuencias distintas, y por eso avisan cosas distintas.** Un
`commit`, un `rollback` o un `begin` en el medio cortan la transacción que envuelve a la migración:
lo que está arriba del corte queda aplicado aunque lo de abajo falle, y nadie avisa. Un `create
index concurrently`, un `vacuum` o un `alter system` no pueden correr adentro de una transacción, y
cada migración corre adentro de una: eso no falla al escribirlo, falla el día que se aplica, y falla
siempre, así que la migración entera se cae.

**Salió verde en las cuarenta y nueve.** Ni límite de migración ni lista de exenciones: no hay nada
que perdonar, sólo que impedir el primero.

**El banco de pruebas encontró un punto ciego antes de que el chequeo se publicara.** El primer caso
—una migración con un `commit;` en el medio— no se detectaba, porque la expresión estaba anclada al
principio del renglón y en el caso el `commit;` quedaba pegado a la sentencia de arriba. Eso es SQL
perfectamente válido: **una sentencia empieza donde termina la anterior, no donde empieza el
renglón**. Ahora el patrón acepta el `;` de la anterior como comienzo.

**Y esa misma corrección trajo el segundo error, que encontró la falsificación contra un archivo
real.** Al aceptar el `;` de la sentencia anterior, el comienzo de la coincidencia caía en el
renglón de arriba, y el aviso señalaba **dos renglones antes del problema**. El banco de pruebas no
lo podía ver: mira si hay rojo, no dónde apunta. Se arregló poniendo la palabra en el grupo 1 de
cada expresión y midiendo desde ahí; se comprobó rompiendo la 0041 de las dos maneras, y las dos
señalan el renglón 327, que es el renglón. La versión publicada pasaba en verde las dos veces.

### Una palabra que se decide y no se barre no se decidió

El glosario de la empresa dice a qué se aplica, y son seis superficies: «código, nombres de tablas
y columnas, claves de idioma, texto visible, documentación y mensajes de commit». Hasta el 31 de
agosto de 2026 había **una sola vigilada**. `verificar_vocabulario.mjs` mira el texto que ve una
persona, y por eso deja afuera a propósito `docs/`, `scripts/` y los comentarios del código.

Lo que se midió al escribir el chequeo que cubre las otras cinco: el 29 de agosto de 2026 se
aprobó `i18n` y quedaron prohibidas sus hermanas, y **dos días después la palabra vieja seguía
escrita 28 veces en once archivos** —la lista de pendientes, el alcance, el catálogo, tres guiones
de chequeo, el plan de las zonas y las tres copias de `js/catalogo.js`—, y además le daba nombre a
un documento entero, `docs/PLAN_I18N.md`, que hasta ese día se llamaba de la otra forma. Ninguna
aparición estaba mal escrita a propósito: **todas citaban la regla de la empresa con el nombre que
la regla tenía antes.** Están todas barridas, salvo la de una migración, que no se toca porque una
migración aplicada no se edita jamás.

**Sólo entran las palabras que no dependen del contexto.** El glosario prohíbe «app», «sistema» y
«plataforma» *cuando se habla de una unidad vendible*, y «paquete» *cuando nombra un Plan*: un
chequeo que no sabe distinguir el sentido avisa de más, y un chequeo que avisa de más se apaga.
Tampoco entra `tenant`, que parece la primera candidata: «Organización» es la palabra del glosario,
pero `tenants` y `tenant_id` son el nombre de una tabla y de una columna, y la regla «lo que se
guarda para siempre se nombra por lo que hace, y no se renombra» los deja donde están —medidas 300
apariciones, todas de esa forma—.

**Y los mensajes de commit son la única superficie que no se puede arreglar después.** Un mensaje
ya escrito es historia y no se reescribe, así que cada palabra se exige desde el commit en que dejó
de usarse. Los seis mensajes que usan la palabra vieja son todos del 26 de agosto de 2026, tres
días antes de que la palabra se decidiera.

### Una medición que contesta «no hay ninguna» cuando quería decir «no sé»

El 31 de agosto de 2026 salió publicado un mensaje de commit —`6f8dc03`— diciendo que la regla
«todo importe se guarda con su moneda» no tenía hoy a qué aplicarse, que en todo el esquema había
dos columnas numéricas y que ninguna era plata. **Las tres cosas son falsas**, y quedan escritas
para siempre, porque un mensaje de commit no se arregla después. La corrección está en el commit
siguiente.

Lo cierto es que la regla ya estaba vigilada, y desde antes: es la **cuarta** de
`verificar_esquema.mjs`, tiene su banco de pruebas y tiene hoy un incumplimiento conocido, anotado
ahí mismo con su motivo y su pendiente. La columna es `caregivers.hourly_rate`
(`supabase/migrations/0001_esquema_inicial.sql:102`), guarda un importe y su tabla no tiene columna
de moneda. El chequeo no lo tapa: lo deja a la vista y evita que entre uno nuevo.

**Por qué la medición dio otra cosa, que es lo que vale la pena guardar.** La búsqueda pedía el
nombre de la columna pegado a su tipo, y en la 0001 el nombre va entre comillas —`"hourly_rate"
numeric`—, así que no lo encontró. Un carácter de diferencia, y una búsqueda que no entendió lo que
miraba contestó **«no hay ninguna»** en vez de **«no sé»**. Es exactamente la forma del hallazgo
del 30 de agosto, cuando el buscador propio contestaba «nada» ante un patrón que no sabía leer: una
herramienta que no distingue «busqué y no está» de «no supe buscar» miente en la dirección más
cómoda, que es la que nadie revisa.

Y el error de fondo es anterior a la búsqueda. La regla de la empresa dice que **antes de agregar
algo que ya podría existir hay que buscarlo primero**, en el código real. `verificar_esquema.mjs`
ya cubría ésta, con su número y su banco de pruebas. Se lo leyó después de medir, no antes.

### El tope de 10 MB vivía en un solo lado, y era el lado tarde

La regla de la empresa lo dice con esas palabras: «Se valida en el servidor lo que entra, aunque
exista un control equivalente más abajo. **Un límite que sólo vive en el depósito de archivos actúa
después de que el archivo ya ocupó la memoria**» (`celtatech\CLAUDE.md`, «Seguridad, privacidad y
auditoría»). Hasta el 31 de agosto de 2026 este producto tenía el caso literal: los topes —10 MB
para los documentos del legajo, 5 MB para las fotos— y las listas de tipos aceptados existían
**solamente** en `supabase/migrations/0006_archivos_del_legajo.sql`. `Sesion.uploadFile` mandaba
cualquier cosa. Una foto de 30 MB viajaba entera para que el servidor contestara que no.

**De las dos salidas que el pendiente 118 planteaba se tomó la segunda**: declararlo de este lado y
que un chequeo comprueba que coincida, en vez de preguntárselo al depósito al arrancar. Dos motivos.
La regla de la empresa ya elige esa forma cuando la plataforma obliga a duplicar —«hay un original,
las copias se generan desde él, y una comprobación automática rompe la construcción si alguna se
despegó»—; y preguntar al arrancar agrega un pedido de red en cada carga para averiguar algo que
casi nunca cambia.

Así quedó repartido:

| Pieza | Dónde | Qué es |
|---|---|---|
| El original | `supabase/migrations/0006_…sql` | `file_size_limit` y `allowed_mime_types` |
| La lectura del original | `limitesDeclarados()`, en `scripts/verificar_esquema.mjs` | Ahí vive la lectura de las migraciones, y una segunda copia de esa lectura se despega el primer día |
| La copia | `DEPOSITOS`, en `js/auth.js` | En el mismo archivo que ya define `urlPublica()` y `urlFirmada()` |
| La decisión | `_porQueNoSeSube()`, en `js/auth.js` | Devuelve la clave del catálogo con el motivo, o `null` |
| La guarda | 4ª regla de `scripts/verificar_deposito.mjs` | Rompe la construcción si difieren |

**Que las dos listas digan lo mismo no prueba que el rechazo funcione**, así que la guarda no se
conforma con compararlas: saca `_porQueNoSeSube()` del archivo real y lo corre con nueve casos
armados a partir de los topes de la migración —de ahí que sigan valiendo si mañana el tope cambia—.
La decisión tiene nombre propio y no está escrita adentro de `uploadFile` justamente para eso: para
poder ejercerla.

Entre esos nueve está el que la regla de la empresa nombra por su nombre: «nunca dejar que una
comparación con un valor vacío decida un permiso: en JavaScript `undefined < 3` da falso». Si
`uploadFile` recibe algo que no es un archivo, `undefined > 10485760` da falso y **pasa de largo
justamente el caso que no entendió**. Por eso se pregunta que el tamaño sea un número antes de
compararlo, y por eso hay un caso que lo prueba.

**Falsificada de siete maneras**, cada una en su renglón: tres sobre la copia —un tope distinto, un
tipo de más, un tipo de menos, y el archivo sin `DEPOSITOS`— y cuatro sobre la decisión —sin el
control de tamaño, sin preguntar el tipo del dato, sin el control de tipo de archivo, y comparando
el tipo sin bajarlo a minúsculas, que rechazaría un `IMAGE/JPEG` legítimo—. Las siete dan rojo y
nombran el caso exacto; restaurado, verde.

**Lo que esto no cierra**, y queda en el pendiente 118: el `accept=` de los seis selectores de
archivo sigue escrito a mano y sigue sin coincidir —de menos en `js/fichas-legajo.js`, que deja
afuera el `heic` con que fotografía un iPhone; de más en los `image/*`, que dejan elegir un `gif`
para rechazarlo después—. Ya no es un agujero, porque el control real está antes de subir. Es una
molestia, y una mentira sobre lo que se puede elegir.

### Dos pantallas del mismo botón, juzgadas con distinta vara

La regla 4 de `scripts/verificar_frases.mjs` pide que en una pantalla ya convertida no quede texto
escrito a mano, y son en realidad dos: la **4a** mira el HTML y la **4b** mira el guión. Hasta el
31 de agosto de 2026 las dos abrían con el mismo portero —que la pantalla tuviera algún
`data-frase`— y ahí estaba el agujero: **son dos conversiones distintas y no siempre van juntas.**
El HTML se convierte marcando elementos; el guión se convierte pidiendo frases. Y lo primero que
se suele traducir de una pantalla son sus avisos, que viven en el guión.

`pwa-familia/index.html` tenía hecha la segunda y no la primera: siete llamadas al catálogo
adentro del guión y ningún `data-frase` en el marcado. Con un solo portero salía **entera exenta**,
y tenía tres textos escritos a mano al lado de los que sí salían del catálogo. Su gemela
`pwa-asistente/index.html` —el mismo programa, el mismo botón— sí entraba, y por eso estaba limpia.
Las dos pantallas del mismo botón se estaban juzgando con distinta vara, y la que quedaba afuera
era justamente la que peor estaba.

**Y el portero tenía un segundo agujero, más chico y más viejo.** La 4b buscaba lo que el guión
escribe en el documento —`textContent`, `innerHTML`, `innerText`, `placeholder`, `alert`— y no
miraba `confirm` ni `prompt`. Son las dos únicas ventanas del navegador que además **preguntan**,
así que su texto es de los que más importa que se lean en el idioma de quien contesta: ahí se
decide si algo se borra. Ahora las siete formas se miran igual.

**Lo que apareció al abrir el portero fueron cuatro renglones, no cuatrocientos**, y por eso se
arreglaron en el momento en vez de anotarse:

| Dónde | Qué decía a mano | Qué dice ahora |
|---|---|---|
| `pwa-familia/index.html` | la pregunta de cerrar la sesión | `comun.confirmar_salir` |
| `pwa-familia/index.html` | «Ingresando…» | `acceso.entrando` |
| `pwa-familia/index.html` | «Ingresar», repuesto al terminar | el rótulo que traía el botón |
| `registrar-asistente.html` | el aviso de campos obligatorios | `alta.faltan_obligatorios` |

El tercero no es sólo un texto sin traducir: reponer «Ingresar» a mano **le borraba al botón el
nombre del producto**, que la pantalla le pone al abrir. Es exactamente la corrección que su gemela
ya tenía hecha, con el comentario que la explica; la Familia se había quedado sin ella porque el
chequeo no la miraba.

Y la pregunta de cerrar la sesión estaba escrita **dos veces**: a mano en la Familia y en el
catálogo como `asistente.confirmar_salir`, palabra por palabra la misma en los tres idiomas. Ahora
es una sola clave para las dos, `comun.confirmar_salir`, que es lo que la pantalla de la Familia ya
hacía para el aviso de datos faltantes y explica en un comentario: «una sola clave para las dos
pantallas, no dos textos que se corrigen por separado».

### Lo único que el sistema operativo tapa solo

El chequeo de rutas verifica que toda dirección local escrita en una pantalla, una hoja de estilos
o un manifiesto llegue a algún lado **en el sitio publicado**. Son dos preguntas, y las dos dan que
sí en esta máquina y pueden dar que no allá.

**La primera es la caja de las letras.** Esta máquina es Windows y el sitio se sirve desde Linux.
Windows contesta que sí cuando se le pide `js/Auth.js` y el archivo es `js/auth.js`; Linux contesta
404. Es la regla de la empresa «compatibilidad multiplataforma obligatoria» en el único lugar donde
**el sistema operativo la tapa solo**: abrir la pantalla acá y verla andar no prueba nada, porque
anda siempre. Ninguna prueba corrida en esta máquina lo puede ver, y por eso hacía falta un lector
que compare tramo por tramo contra el listado de cada carpeta en vez de preguntarle al sistema.

**La segunda es que el archivo se publique.** Desde el 31 de agosto de 2026 el sitio ya no sube el
repositorio entero: `.vercelignore` deja afuera `docs/`, `scripts/`, `supabase/` y las cajas
fuertes. Un archivo que está acá y no allá se abre igual de bien en el navegador de esta máquina y
da 404 en el sitio. Hoy hay cinco pantallas que enlazan documentos de `docs/` —los dos textos
legales— y andan sólo porque alguien se acordó de escribir las dos líneas con `!` que los vuelven a
incluir. El lector de `.vercelignore` **se corta ante una forma de comodín que no sepa leer**, en
vez de seguir: entenderla mal daría por publicado un archivo que no se publica, que es exactamente
el error que este chequeo busca.

**Salió verde en las 404 direcciones**, y encontró un agujero en un chequeo que ya estaba.
`verificar_sinconexion.mjs` comprobaba con `existsSync` los archivos que guarda cada service
worker. Con `./js/Auth.js` puesto a mano en la lista de `pwa-familia`, **los treinta y tres
chequeos pasaron en verde** —y `cache.addAll()` es todo o nada, así que la copia sin conexión de
esa aplicación no se habría instalado entera—. Su propio mensaje dice «es todo o nada». Ahora los
dos leen el disco con la misma función, que vive en `scripts/recorrido.mjs` y no adentro de
ninguno de los dos.

### La primera vista que se lee sin sesión, y por qué no fue una política

El 31 de agosto de 2026 el Desarrollador decidió qué se hace público: *«La oferta de cursos, no el
contenido de los mismos, se hará disponible, así como cualquier otra característica de acuerdo a la
decisión comercial o de marketing, nada de injerencia tiene el sistema en estos temas»*. Con eso
`cursos.html` dejó de sacar la lista de `data/catalogo-oferta.json` y pasó a pedírsela a la base.

**No se abrió la tabla: se abrió una vista.** Una política para `anon` sobre `cursos` no habría
mostrado nada, porque desde la migración 0032 `anon` no tiene ningún permiso de tabla y Postgres
decide en dos pasos —primero si el rol puede tocar la tabla, y recién después qué filas ve—. Y
darle el permiso habría abierto la tabla entera, con `publicado`, `tenant_id` y la fecha de alta
adentro. La migración 0051 sigue el precedente del directorio: crea
`public.oferta_de_cursos`, que acota a las filas del catálogo general —`tenant_id is null`— que
están publicadas y expone sólo las doce columnas con las que se arma la tarjeta. **El contenido de
los cursos no sale por ahí**: ni lo que se estudia, ni sus evaluaciones, ni sus preguntas, ni sus
opciones. El comentario de la vista lo dice con la misma forma que usa la 0011: todo lo que se
agregue ahí queda a la vista de cualquiera.

**Medido contra la base de esta máquina, no supuesto.** Sin sesión, `oferta_de_cursos` devuelve las
seis filas generales —el curso propio de PresDemo, que la migración 0048 le carga, no aparece— y
`cursos`, `evaluaciones` y `preguntas_evaluacion` contestan **401** a la misma llave.

**La regla que no tenía excepción, y ahora la tiene escrita y comprobada.** La quinceava de
`scripts/verificar_esquema.mjs` exigía que a `anon` no le quedara ningún permiso neto sobre ninguna
tabla ni vista de `public`, y no tenía lista de exenciones porque no hacía falta ninguna. Ahora
tiene `VISTAS_AL_ALCANCE_ANONIMO`, con una sola entrada, **y estar en la lista no perdona nada**:
es la misma forma que la undécima usa con `profiles`. El chequeo va a leer el cuerpo de la vista y
señala cuatro cosas: que el permiso sea otra cosa que `select`; que ninguna migración la defina
como vista —una tabla no lleva condición adentro, así que sin cuerpo lo que queda abierto es la
tabla entera—; que el cuerpo haya dejado de acotar a `tenant_id is null`, que es lo único que la
separa de publicar las filas de cada Prestadora y, de paso, quiénes son los clientes; y que el
cuerpo escriba `tenant_id is null or`, porque una disyunción deja pasar todo lo que venga después.
Los cinco casos de mentira que lo prueban están en el corpus del propio chequeo, uno bien y cuatro
mal. `scripts/probar_permisos_en_vivo.mjs` importa esa misma lista y la mide contra la base: no la
vuelve a escribir, porque una lista repetida se despega y la que se despega es siempre la que nadie
mira.

**Y el archivo no se borró, porque sigue haciendo falta.** `data/catalogo-oferta.json` es todavía
la única fuente de los 9 servicios y de las evaluaciones de la oferta —no tienen tabla, y eso es lo
que queda abierto del pendiente 7—, los dos programas para el teléfono lo guardan para andar sin
conexión, y de ahí salen también los cursos cuando la base no está al alcance: sin conexión, o
contra una base donde la 0051 todavía no corrió. `js/catalogo.js` lo pide siempre y le reemplaza
sólo la lista de cursos cuando la base contesta, que es el mismo criterio con el que ya trataba a
los vocabularios.

**Lo que quedó a medias, anotado.** La 0051 le agregó a `cursos` las columnas `nombre_i18n` y
`descripcion_i18n`, con los tres idiomas, y dejó en pie las viejas `nombre` y `descripcion`, de
texto suelto y en uno solo. Sacarlas sin revisar quién las escribe y quién las lee pierde contenido
sin avisar, así que se dejaron y el trabajo quedó en la lista de pendientes.

## 6. Deuda del código actual

Está toda en `docs/PENDIENTES.md`, con condición de cierre para cada punto. Acá no se repite,
para que no haya dos listas que se contradigan.
