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
| Autenticación con Supabase Auth | Funciona, y **el acceso lo decide la sesión**. `acceso.html` es la pantalla de inicio de sesión y manda a cada rol donde le toca; `panel-prestadora.html:367` llama a `Sesion.requireAuth()` y además comprueba el rol. Las migraciones 0005 y 0006 ponen el límite en la base, del lado que no se puede falsificar. Probado con dos Prestadoras: `scripts/probar_aislamiento.mjs`. **El alta de Asistente exige confirmar el correo, y se queda así**: decidido por el Desarrollador el 2026-08-26 (pendiente 21 cerrado) — el alta es de dos pasos, pero nadie puede darse de alta con el correo de otra persona; `supabase/config.toml` tiene `mailer_autoconfirm: false` |
| Directorio de Asistentes con filtros | Maquetado y navegable |
| Perfil del Asistente | Maquetado |
| Portal de registro de Asistentes | Maquetado, con el legajo funcionando: `registrar-asistente.html` guarda las cuatro fichas repetibles y el consentimiento de publicación en las tablas de la migración 0004, y la disponibilidad horaria en las de la 0012 |
| Archivos del legajo | Funcionan. La foto va al depósito público `avatares` y los papeles al privado `documentos-cuidadores`, cada uno en la carpeta de su cuenta; en la base queda el camino, y la dirección se firma al mostrarla (`js/auth.js:173`). Declarados en `supabase/migrations/0006_archivos_del_legajo.sql`, no a mano |
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
  perfil (`js/apiClient.js:43`); sin sesión, el enlace elige qué directorio se muestra y nada más.
- **Los archivos siguen la misma regla.** Ver la fila «Archivos del legajo» de arriba.

Probado con dos Prestadoras ficticias: `scripts/probar_aislamiento.mjs`, cuarenta y nueve
comprobaciones el 26 de agosto de 2026. Y falsificado a propósito para verificar que se pone en
rojo cuando corresponde.

### El nombre del producto salió del código

**Cerrado el 23 de agosto de 2026.** Estaba escrito a mano 273 veces. Hoy vive en un solo archivo,
`js/identidad.js:24-27`, y no aparece en ninguna otra parte del código.

Cómo quedó:

- **El texto visible usa marcadores** —`{{producto}}`, `{{productoCorto}}`, `{{dominio}}`,
  `{{contacto}}`— y `js/identidad.js` los resuelve al cargar la página. Hay 59 repartidos en las 12
  pantallas, y las 12 cargan el archivo.
- **Lo que persiste se nombra por su función**, según «lo que se guarda para siempre se nombra por lo que hace». El identificador
  técnico del producto es `plataforma` y no la marca (`js/identidad.js:35`); el logotipo es
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

Lo que **no** cierra esto: el nombre de la **Prestadora de ejemplo**, «PresDemo», sigue escrito a
mano 111 veces en 18 archivos. Es otro problema —el nombre de un cliente, no el del producto— y es
el pendiente 11.

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
  `mockup-app.html:775`, que lo escribe una persona y lo lee otra. El otro era
  `panel-prestadora.html`, la pantalla que el pendiente daba por arreglada: tenía el renglón de la
  tabla de Asistentes entero sin escapar —nombre, documento, teléfono, profesión y zona— y el
  único `onclick` escrito en el marcado de todo el proyecto.
- **Escapar no alcanzaba ahí, y por eso se sacó el `onclick`.** Adentro de un atributo el
  navegador deshace el escapado antes de leer el contenido como código, así que un `&#39;` vuelve
  a ser una comilla y cierra la cadena igual. El identificador ahora se pasa por
  `addEventListener` (`panel-prestadora.html:226`), que nunca vuelve a leer texto como programa.
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
  cualquier cosa. `js/catalogo.js:150` traduce la clave guardada a su etiqueta y, cuando no la
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
  además que ninguna pantalla escribe hoy una clave inventada en esa columna —`registrar-asistente.html:319`
  y `formulario-integral.html:352` toman las suyas del catálogo—, y de la
  base misma no se puede afirmar nada desde acá, porque `caregivers` no se deja leer sin sesión.
- **Los cuatro filtros salen del catálogo** (`directorio.html:76`): zona, Tipo de Asistente,
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
- **El nombre bueno ya estaba escrito y no hubo que inventar nada:** `docs/GLOSARIO.md:27` dice
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
con su indicación adentro (`pwa-asistente/index.html:310` y `:313`,
`pwa-familia/index.html:571` y `:574`). Lo que falta para cerrar el pendiente 47 es la otra mitad:
que exista una cuenta de Asistente ficticia con la que se pueda entrar, y eso depende del tope de
correos del pendiente 45.

### Las trece migraciones ya corren en el servidor

Comprobado el 24 de agosto de 2026 contra el proyecto real: el servidor tiene aplicadas 0001 a
0013, las mismas trece que hay en `supabase/migrations/`. Antes tenía hasta la 0008, y esa
distancia costaba dos cosas que ya no cuestan:

- **La columna del contacto existe.** La 0009 agregó `avisos.contact_info`, que es donde
  `js/apiClient.js:461` escribe el contacto de una búsqueda. Mientras no estaba, el formulario
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
  (`pwa-asistente/index.html:986`, `montarFichas`). El paso de cierre sale de
  `data/catalogo-autorizaciones.json`.
- **El paso de cierre pasó a ser un módulo.** Estaba escrito adentro de `registrar-asistente.html`,
  cuarenta renglones que traían el archivo y armaban las casillas. Ahora es `js/autorizaciones.js`,
  y las dos pantallas consumen el mismo («ningún patrón repetido sin punto único de verdad»). Copiarlo habría sido tener el mismo paso dos
  veces, con el precio de siempre: se arregla uno y el otro queda viejo.
- **Subir los archivos también dejó de estar en la pantalla.** `FichasLegajo.subirArchivos`
  (`js/fichas-legajo.js:285`) es el único lugar que sabe a qué depósito van la matrícula y el
  título, y devuelve la lista de los que no subieron para que quien llama avise una sola vez.
- **De paso arregló algo que estaba mal en el portal.** Cuando la ficha de estudio no traía archivo
  —es optativo—, la fila viajaba igual con una clave `archivo` en `null`. La columna se llama
  `archivo_url` (`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:68`), así
  que esa fila no entraba y la persona no se enteraba.
- **Y el alta del teléfono creaba cuentas sin dueño.** `registrarAspirante` no escribía `user_id`,
  así que la persona quedaba con cuenta y con legajo, pero el legajo no era de nadie y no lo podía
  abrir. Se agrega en `guardarLegajo` (`pwa-asistente/index.html:1041`), que es donde ya se sabe
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

- **Lo trae `traerDelDirectorio` (`js/apiClient.js:486`)**, que pide una sola fila filtrando por
  identificador y por Prestadora. Un identificador que no tiene forma de identificador se contesta
  sin preguntarle a la base: la base devolvería un error de sintaxis, y un error en pantalla se lee
  como que el sistema se rompió, cuando lo que hay es un enlace viejo. Los hay: hasta el 25 de
  agosto de 2026 esta pantalla se abría con `?id=1`.
- **El filtro por Prestadora se puede desmentir, y se intentó.** La vista devuelve hoy 7 personas
  publicadas, repartidas entre las dos Prestadoras ficticias. Pidiendo desde el enlace de PresDemo
  el identificador de una persona de la otra Prestadora, la pantalla no la muestra: queda vacía. Sin
  ese filtro aparecería, que es exactamente la falla que se estaba buscando.
- **Los cuatro estados están** (`perfil.html:68`, `:72`, `:81` y `:91`): cargando, error con
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
(`perfil.html:148`) y ofrece las dos puertas que sí existen: entrar como Familia y publicar un aviso.
Lo que falta —empezar una conversación con esa persona en particular— quedó anotado como pendiente 46.

**Tres traducciones que estaban por escribirse dos veces subieron a los archivos compartidos**
(«ningún patrón repetido sin punto único de verdad»): el precio en pesos es `Texto.importe` (`js/texto.js:88`), la etiqueta de una lista es
`Catalogo.etiquetaSiExiste` (`js/catalogo.js:310`), y la de una tarea —que puede estar en cualquiera
de tres listas— es `Catalogo.etiquetaDeTarea` (`js/catalogo.js:323`). Vivían adentro de
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

**Los tres documentos exentos, y por qué.** Un documento que es **una foto fechada** cita el
código de ese día a propósito, y corregirle los renglones sería falsear lo que decía.
`docs/INVENTARIO.md` lo dice en su propio renglón 7; `docs/PLAN_ACCESO.md` y
`docs/PLAN_PRESTADORA.md` son planes escritos antes de tocar código, y sus citas muestran los
problemas que había ese día. Los tres están en la lista `FOTOS` del chequeo, cada uno con su
motivo escrito al lado —una exención sin motivo es una excepción que nadie va a poder revisar
después—. Había un cuarto, el plan técnico heredado, y se borró el mismo día.

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
  —`<template id="molde-asistente">`, `directorio.html:116`— y el contenido llega de
  `directorio`. El archivo pasó de 534 renglones a 342.
- **Todo lo inventado se fue con las tarjetas.** No hay sistema de puntaje, no hay estrellas y no
  hay porcentaje de coincidencia, así que no se muestran. Lo que queda es lo que el consentimiento
  promete —nombre, foto, zona, qué atiende y precio por hora
  (`data/catalogo-autorizaciones.json`, `perfil_publicado`)—, más la insignia «Legajo validado por
  la Prestadora», que es la condición que la vista ya exige para devolver la fila, y la de
  reemplazos urgentes, que sale de `disponibilidad_asistente`.
- **El filtro por Prestadora vive en el cliente de datos y no es optativo**
  (`js/apiClient.js:399`). El resto del archivo filtra «si hay Prestadora resuelta», y eso no sirve
  para una pantalla que se ve sin cuenta: sin sesión, la que no filtra devuelve las dos mezcladas.
  Acá, si no hay Prestadora, no se pide nada.
- **Y si la dirección nombra una Prestadora que no existe, tampoco se muestra otra.** Comprobado
  en el navegador antes de tocar nada: `directorio.html?t=prestadora-que-no-existe` mostraba los
  cuatro Asistentes de PresDemo, porque el respaldo devuelve la primera Prestadora de la base. El
  respaldo sirve para una dirección que no nombra ninguna, no para una que nombra mal. Ahora se
  distingue un caso del otro (`js/apiClient.js:73`) y el segundo avisa. **Y desde la
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

- **Una sola quedaba muda de verdad.** En `panel-prestadora.html:378`, una tabla sin legajos se ve
  igual esté rota o esté bien: es idéntica a la de una Prestadora que todavía no cargó ninguno.
  Ahora el fallo escribe en la propia tabla «No se pudo preparar la pantalla. Conviene volver a
  cargarla», que es el estado de error que faltaba.
- **Las otras tres caen en la pantalla de acceso**, y eso ya era la verdad: sin sesión rescatada,
  lo que corresponde mostrar es el acceso. Lo que se perdía era el rastro. Ahora
  `mockup-app.html:425` y `:889`, `pwa-asistente/index.html:643` y `pwa-familia/index.html:828`
  dejan el detalle técnico en la consola en lugar de tirarlo.
- **`js/auth.js:201` no avisa en pantalla, y es a propósito.** Corre en las once pantallas que
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
  `docs/GLOSARIO.md:19` aprobó para tablas el 24 de agosto, y ni `care_searches` ni
  `franjas_busqueda` —así se llamaban— contenían ninguna de las siete palabras. La prueba
  pasaba limpia con el problema adentro.

**Lo que falta no es el chequeo, es el prefijo.** La propia página lo dice en
`docs/MODULOS.md:50`: el prefijo «es lo que hace que la prueba de más abajo se pueda correr con
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
escribía nadie**: el único lugar que asigna un estado validado es `panel-prestadora.html:343`, y
pone el largo. El corto sólo aparecía leído, y en una fila de ejemplo.

La `0017` lo saca: pasa las filas que decían `validado` a decir `validado_prestadora`, y el
directorio deja de nombrar el valor muerto. En el código quedaba un solo lugar que lo leía
—`pwa-asistente/index.html:808`, un `||` defensivo— y también se fue. **Lo que la `0017` no hace es
cerrar la lista de estados con un `check`**, porque para eso hay que saber cuáles son todos, y hoy
el código nombra cuatro sin que ningún lugar diga que ésos son todos.

Esto cierra la mitad del pendiente 53. La otra mitad no la puede cerrar la línea de comandos: falta
**el nombre del segundo nivel de Asistente**, y un nombre no se inventa.

### Las dos tablas de esta modalidad pasaron a llamarse como lo que guardan

**Decidido por el Desarrollador el 25 de agosto de 2026**, sobre el pendiente 52 y con las tres
opciones a la vista: se renombran las dos, no una sola. El motivo que dio es el que cierra la
discusión —*no puede ser que tengamos distintos nombres para la misma cosa*—, y vale más que el
trabajo de arreglarlo.

**Eran dos problemas encimados.** El primero, el prefijo: `docs/GLOSARIO.md:19` había aprobado el
24 de agosto que lo que sólo existe en esta modalidad lo lleve en el nombre, y no lo llevaba
ninguna tabla. El segundo, la palabra: `care_searches` no guardaba búsquedas. Una búsqueda es el
acto de buscar y no deja nada guardado; lo que queda guardado es el aviso que publica la Familia.

**Cómo quedó.**

| Antes | Ahora | Qué pasó |
|---|---|---|
| `care_searches` | `avisos` | `supabase/migrations/0015_los_avisos_se_llaman_avisos.sql`, con su clave, su restricción, su índice y su política |
| `reportes.search_id` y `messages.search_id` | `aviso_id` | La misma migración, con sus dos restricciones |
| `caregivers_publicos` | `directorio` | La misma migración. El nombre no es nuevo: es el del módulo, decidido el 24 de agosto en `docs/MODULOS.md:47` |
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

### Los cuatro estados se midieron para hacerles un chequeo, y lo que salió es que ya se cumple

Los cuatro estados —cargando, error, vacío, listo— son una regla de la empresa, y eran lo último
no negociable de la sección 5 que no miraba nadie. Se midió el 25 de agosto de 2026 para escribirle
el chequeo catorce. **No se escribió, y el motivo es bueno: la regla se cumple, y el cumplimiento es
invisible para cualquier prueba automática.**

El detector buscó por estructura y no por palabras —toda `async function` que espera un pedido de
datos y además escribe en la pantalla—, porque la primera versión, que buscaba las palabras
«Cargando» y «vacío», señaló como incumplidora justo a la pantalla más cuidadosa de todas:
`panel-prestadora.html` dice «Buscando…» y `!data.length`, que es exactamente lo mismo con otras
palabras. El detector por estructura encontró catorce funciones y avisó de siete. **Las siete eran
falsas**, y cada motivo es distinto, que es lo que termina de decidir la cuestión:

- **El estado lo enciende una función auxiliar.** `panel-prestadora.html:169` llama a
  `estadoTabla('info', 'Buscando los legajos de la Prestadora...')` antes de pedir nada, y
  `mockup-app.html:473` y `pwa-familia/index.html:889` llaman a `recMostrar('cargando')`. El
  detector sólo ve lo que se escribe ahí mismo.
- **El fallo lo atrapa quien llama.** `examen.html:311` y `examen.html:376` no tienen `catch`, pero
  nunca se los llama fuera de uno: los envuelven `examen.html:368` y `examen.html:553`. Igual pasa
  con `armarAuditoria` (`panel-prestadora.html:251`), envuelta por `abrirAuditoria`
  (`panel-prestadora.html:237`).
- **El estado de carga está escrito en el HTML desde el principio.** `pwa-asistente/index.html:341`
  ya dice «Cargando estado...» antes de que corra una sola línea de JavaScript.

Y falta el caso que cierra la discusión: **la pantalla que mejor cumple la regla es la que el
detector no ve.** `directorio.html:298` tiene los cuatro paneles con nombre, un interruptor que
enciende uno y apaga los otros, y el `catch` que traduce el error a una frase legible; no aparece en
la medición porque espera un `Promise.all` y no una llamada suelta. Un chequeo que no distingue la
mejor pantalla del resto tampoco distinguiría una mala.

**Lo que sí encontró la medición fue otra cosa, y ésa se arregló el mismo día.** El mismo
interruptor está escrito ocho veces en ocho pantallas, y las copias no eran equivalentes: cuatro
encendían el panel con `display: 'block'` y dos con `display: ''`. No es lo mismo. `'block'` le
impone al panel una forma; `''` le devuelve la que le había dado el CSS. Y en este proyecto ya hay
un panel que no es `block`: `.directory-grid` es `display: grid` (`css/styles.css:1120`), y por eso
`directorio.html` tuvo que usar la forma vacía. Las otras cuatro —`acceso.html`, `examen.html`,
`nueva-clave.html` y `recuperar-clave.html`— andaban de casualidad, porque hoy ninguno de sus
paneles es grid ni flex, y el día que alguien agregara uno se habría aplastado sin avisar. Las seis
que conmutan `display` dicen ahora `''`, con el motivo escrito al lado para que nadie lo devuelva a
`'block'`. Que sigan siendo ocho copias es parte del pendiente 13.

**La «toda operación destructiva se confirma» se midió en el mismo rato y salió todavía más corta.** Pide confirmación explícita
ante toda operación destructiva, y la medición encontró que en este proyecto hay exactamente una:
rechazar un legajo (`panel-prestadora.html:349`). No hay un solo `delete` contra la base en las
cuarenta y cuatro pantallas y guiones —lo único que se parece es un `delete` de JavaScript sobre un
objeto en memoria, `js/apiClient.js:255`, que no toca nada guardado—, y salir de la sesión no
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
`ClienteDatos.enviarMensaje()` (`js/apiClient.js:454`), que arman el pedido una sola vez para
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
El inventario, el orden y lo que falta están en `docs/PLAN_MULTIIDIOMA.md`; acá está lo que existe.

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
además cuánto falta: hoy, **4 de 45 archivos**.

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

`scripts/recorrido.mjs` es por donde pasan los dieciséis chequeos para leer archivos, y era también
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
porque la línea de comandos ya está enlazada— y se revisó contra él. **Aparecieron dos agujeros,
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
| **La pantalla que carga las verificaciones del legajo** | La tabla, sus columnas de rastro, sus políticas y la vista que las publica están desde las migraciones 0004, 0005 y 0026; **falta dónde apretar**, así que hoy sólo tienen comprobaciones los legajos que sembró la migración 0027. Es el pendiente 70 |
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
`directorio.html:304`, que resuelve una Prestadora y muestra a los suyos.

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
`docs/INVENTARIO.md` porque ese archivo es una foto del 22 de agosto de 2026 y se deja como está. Hoy corren dieciséis
chequeos antes de cada `commit` (`.githooks/pre-commit` llama a `scripts/verificar_todo.mjs`), y
son los que impiden que vuelvan los colores a mano, el tuteo, las claves en el código, las
pantallas mudas y los textos escritos adentro del HTML. **Medido el 26 de agosto de 2026 leyendo
los dieciséis, no de memoria.**

**El hallazgo: nueve chequeos no se rompen, se callan.**

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
| `copias` | Compara 27 archivos que tienen que ser iguales byte a byte. También falla fuerte, porque la lista nombra caminos exactos. Y **la migración es la ocasión de que deje de hacer falta**: las tres copias existen porque hoy no hay forma de compartir código entre las tres aplicaciones, y con una herramienta de armado sí la hay |

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
`Contacto.revisarCon(...)` en `scripts/verificar_contacto.mjs:74`—, así que revientan en el acto y
el `commit` se frena. **Si alguno hubiera preguntado antes «¿tiene nombre?», habría pasado en
verde sin haber comprobado nada.** Es exactamente la trampa que la regla de la empresa describe:
`undefined < 3` da falso, y un control escrito así deja pasar justo el caso que no entendió.

**Qué hacer con esto, en orden.**

1. **Antes de la primera pantalla portada**, no después: agregar `.jsx`/`.tsx` a las listas de los
   nueve que sólo cambian de extensión, y darles a `paleta`, `temas`, `escapado` y `frases` la
   forma que esas cuatro cosas tienen en React.
2. **Que la red se pruebe a sí misma.** Hoy `cajas` y `referencias` ya lo hacen —se arman un
   ejemplo malo y comprueban que lo agarran—. Conviene que lo hagan todos los que se toquen, para
   que ninguno pueda quedar mirando cero archivos y decir ✔.
3. **`guiones` no se adapta: se jubila.** Comprueba la sintaxis de los guiones sueltos adentro del
   HTML, y esa categoría desaparece; de eso pasa a ocuparse la herramienta de armado, que no
   compila un componente con un error de sintaxis.
4. **`copias` se jubila también, pero recién cuando las tres copias dejen de existir**, no antes.


---

## 6. Deuda del código actual

Está toda en `docs/PENDIENTES.md`, con condición de cierre para cada punto. Acá no se repite,
para que no haya dos listas que se contradigan.
