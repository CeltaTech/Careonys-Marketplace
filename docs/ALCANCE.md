# Alcance — qué existe y qué no

> **Este archivo es la referencia única sobre el estado del producto.** Si otro documento dice que
> algo está terminado y acá figura como no construido, gana este. Verificado contra el código el
> 2026-08-24. La cuenta de lo que hay —pantallas, renglones, archivos— la mide sola
> `scripts/medir_estado.mjs` y sale publicada en `README.md`, que por eso no queda vieja.
>
> Acá va solo **qué existe**. Lo que queda abierto vive en `docs/PENDIENTES.md`, con su condición
> de cierre. Ninguna afirmación entra sin archivo y renglón.

---

## 1. Construido y funcionando

| Módulo | Estado |
|---|---|
| Autenticación con Supabase Auth | Funciona, y **el acceso lo decide la sesión**. `acceso.html` es la pantalla de inicio de sesión y manda a cada rol donde le toca; `panel-prestadora.html:941` llama a `Sesion.requireAuth()` y además comprueba el rol. Las políticas de `profiles` y de `caregivers` ponen el límite en la base, del lado que no se puede falsificar (`supabase/migrations/0001_base_del_esquema.sql:4953` y `:4890`). Probado con dos Prestadoras: `scripts/probar_aislamiento.mjs`. **El alta de Asistente exige confirmar el correo, y se queda así**: decidido por el Desarrollador el 2026-08-26 (pendiente 21 cerrado) — el alta es de dos pasos, pero nadie puede darse de alta con el correo de otra persona; `supabase/config.toml` tiene `mailer_autoconfirm: false` |
| Directorio de Asistentes con filtros | Maquetado y navegable |
| Perfil del Asistente | Maquetado |
| Portal de registro de Asistentes | Maquetado, con el legajo funcionando: `registrar-asistente.html` guarda las cuatro fichas repetibles y el consentimiento de publicación en sus tablas —`matriculas_asistente`, `estudios_asistente`, `experiencia_laboral_asistente`, `referencias_asistente` y `autorizaciones_asistente`—, y la disponibilidad horaria en `disponibilidad_asistente` y `franjas_asistente` |
| Archivos del legajo | Funcionan. La foto va al depósito público `avatares` y los papeles al privado `documentos-cuidadores`, cada uno en la carpeta de su cuenta; en la base queda el camino, y la dirección se firma al mostrarla (`js/auth.js:358`). Los dos depósitos se declaran en una migración y no a mano (`supabase/migrations/0001_base_del_esquema.sql:6038-6039`), con sus políticas al lado |
| Consentimiento de publicación | Funciona de punta a punta. El alta pregunta al cerrar (`data/catalogo-autorizaciones.json`, paso 7) y guarda la respuesta en `autorizaciones_asistente`; el directorio cruza contra ella y **no muestra a nadie que no haya dicho que sí**: la vista `directorio` exige `a.perfil_publicado` (`supabase/migrations/0001_base_del_esquema.sql:797-799`). Sin respuesta no se publica: la casilla arranca sin marcar. Y el directorio va con `noindex`, que es lo que ese mismo consentimiento promete |
| Evaluaciones de competencias | Funcionan, y **las corrige el servidor**. `examen.html` pide sesión, lista lo que la persona puede rendir y manda las respuestas a `rendir_evaluacion()`; la columna con la respuesta correcta no tiene permiso de lectura para nadie y las opciones salen de la vista `opciones_para_responder`, que no la incluye (`supabase/migrations/0001_base_del_esquema.sql:2868`). El intento no se puede escribir a mano: la tabla no tiene política de escritura y los permisos están revocados. `cursos.html` ya no tiene examen propio, enlaza a esta pantalla. Falta el contenido: ver `docs/PENDIENTES.md` punto 24 |
| Motor de fichas del legajo (`js/fichas-legajo.js`) | Funciona. Dibuja, valida y recolecta Matrícula, estudio, experiencia y referencia leyendo `data/catalogo-fichas.json` y `data/catalogo-vocabularios.json`. Ninguna de las cuatro está escrita en la pantalla |
| Formulario integral de datos del Paciente | Maquetado, paso a paso |
| Cliente de datos (`js/apiClient.js`) | Funciona en modo local y modo Supabase |
| Identidad del producto (`js/identidad.js`) | Funciona y está verificada. Ver abajo |
| Alta y baja de una Prestadora desde CeltaTech | Funciona, y **es lo único que este producto recibe de afuera**. La función de borde `supabase/functions/alta-y-baja/index.ts` verifica la firma del pedido y llama a las tres funciones que le dan el alta, le corrigen el nombre y le fijan el estado: `alta_de_prestadora()`, `corregir_prestadora()` y `fijar_estado_de_prestadora()` (`supabase/migrations/0001_base_del_esquema.sql:78`, `:295` y `:1202`). Probada contra el servidor desplegado: `scripts/probar_alta_y_baja.mjs`, doce comprobaciones |

**Maquetado** significa que la pantalla existe y se navega, no que la lógica detrás esté escrita.

### La única puerta que este producto le abre a CeltaTech

**Construida el 25 de agosto de 2026**, del lado de la base y con la función de borde
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

`status` ya hace algo por su cuenta: las funciones públicas exigen `activo`, así que una
Prestadora suspendida se queda sin puerta de calle —nadie ve su marca ni su directorio sin
sesión— mientras su personal, que sí tiene cuenta, sigue trabajando igual. **La puerta deja eso
exactamente como estaba.** Qué más se le corta a quien no paga cuando hay gente cuidando a una
persona es una pregunta abierta del Desarrollador, anotada en
`../../docs/SUGERENCIAS_DESDE_EL_MARKETPLACE.md`, y no se contesta desde acá.

### El límite entre Prestadoras lo pone la sesión

**Cerrado el 24 de agosto de 2026**, con las políticas que están hoy. Antes, la Prestadora salía
de la barra de direcciones y viajaba como un filtro más en cada consulta: eso no es aislamiento,
es una sugerencia, porque un filtro que viaja en el pedido lo cambia quien llama.

Cómo quedó:

- **Registrarse ya no decide nada.** El disparador de `auth.users` crea la fila de `profiles`
  (`supabase/migrations/0001_base_del_esquema.sql:333-335`) y valida la Prestadora contra `tenants`, pero **el rol no sale
  de los metadatos**: quien se registra solo queda siempre con un rol sin acceso a los datos de la
  Prestadora. Pedir ser coordinador de otra Prestadora no sirve de nada.
- **Pertenecer y poder ver son dos cosas distintas.** `public.es_personal_de_prestadora()` es el
  punto único de verdad, y las políticas de `caregivers`, de las siete tablas del legajo y de
  `verificaciones_asistente` preguntan por él y por `prestadora_actual()`.
- **La aplicación pregunta en el mismo orden que la base.** Con sesión, la Prestadora sale del
  perfil (`js/apiClient.js:60`); sin sesión, el enlace elige qué directorio se muestra y nada más.
- **Los archivos siguen la misma regla.** Ver la fila «Archivos del legajo» de arriba.

Probado con dos Prestadoras ficticias: `scripts/probar_aislamiento.mjs`, **ciento treinta y dos
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
  `mockup-app.html:835`, que lo escribe una persona y lo lee otra. El otro era
  `panel-prestadora.html`, la pantalla que el pendiente daba por arreglada: tenía el renglón de la
  tabla de Asistentes entero sin escapar —nombre, documento, teléfono, profesión y zona— y el
  único `onclick` escrito en el marcado de todo el proyecto.
- **Escapar no alcanzaba ahí, y por eso se sacó el `onclick`.** Adentro de un atributo el
  navegador deshace el escapado antes de leer el contenido como código, así que un `&#39;` vuelve
  a ser una comilla y cierra la cadena igual. El identificador ahora se pasa por
  `addEventListener` (`panel-prestadora.html:445`), que nunca vuelve a leer texto como programa.
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
  «metadata extra» — que es como se llama a un dato cuando no se le hizo lugar. Hoy la columna
  existe y el contacto tiene su lugar propio: `avisos.contact_info` es un `jsonb` con nombre,
  correo y teléfono (`supabase/migrations/0001_base_del_esquema.sql:2192`), y su comentario avisa
  que son datos de una persona real y que se vacían antes de producción
  (`supabase/migrations/0001_base_del_esquema.sql:2215`). El pendiente decía que ninguna pantalla
  mandaba contacto; sí lo mandaba, y era la pantalla pública.
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
  cualquier cosa. `js/catalogo.js:533` traduce la clave guardada a su etiqueta y, cuando no la
  encuentra, muestra la clave cruda: la ficha decía «enfermero» en minúscula y con guión bajo. Y
  el filtro por Tipo de Asistente busca por la clave que ofrece el catálogo, así que esa fila no
  aparecía nunca.
- **Se arregló por los dos caminos, y quedó arreglado.** La siembra ficticia escribe hoy las claves
  del catálogo y no las de nadie —`supabase/migrations/0002_siembra_ficticia.sql` pone
  `enfermero_universitario`, `solo_acompanamiento` y compañía—, y las filas que estaban cargadas se
  corrigieron una por una y por identificador, no buscando la clave vieja, para que una base creada
  desde cero y una que ya venía andando queden con exactamente los mismos valores. La base lo
  confirma: las cinco profesiones distintas que hay cargadas son todas claves del vocabulario
  `tipo_asistente`, sin ninguna forma suelta.
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
  además que ninguna pantalla escribe hoy una clave inventada en esa columna —ese día lo tomaban
  del catálogo `registrar-asistente.html:340` y `fuera de uso/formulario-integral.html:354`; desde el 9 de
  septiembre de 2026 la segunda salió de uso y queda sólo la primera—, y de la
  base misma no se puede afirmar nada desde acá, porque `caregivers` no se deja leer sin sesión.
- **Los cuatro filtros salen del catálogo** (`directorio.html:78`): zona, Tipo de Asistente,
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
  el nombre de una política, que ya estaba renombrada en el servidor.

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
  `docs/GLOSARIO.md`, `docs/MODULOS.md`, `data/catalogo-fichas.json` y un comentario de la base.
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
con su indicación adentro (`pwa-asistente/index.html:331` y `:335`,
`pwa-familia/index.html:595` y `:598`). Lo que falta para cerrar el pendiente 47 es la otra mitad:
que exista una cuenta de Asistente ficticia con la que se pueda entrar, y eso depende del tope de
correos del pendiente 45.

### Los dos archivos que hay son los dos que corren

`supabase/migrations/` tiene hoy dos archivos —`0001_base_del_esquema.sql`, que trae la
estructura entera, y `0002_siembra_ficticia.sql`, que trae los datos inventados y las cuentas con
las que se entra a mirarlos—, y son exactamente los dos que la base de esta máquina declara
aplicados. Que el número de archivos coincida con el número de migraciones corridas no es una
comodidad de la cuenta: es la única forma de que una base reconstruida desde cero dé lo mismo que
la que está andando, y es lo primero que se mira cuando algo no coincide.

Se comprueba y no se supone, porque el estado real manda sobre el documentado (la regla de la
empresa «el estado real está por encima del documentado»): un archivo en `supabase/migrations/`
describe lo que se quiso aplicar, no lo que corre, y las dos cosas se separaron más de una vez. El
caso peor fue una migración que el programa dio por terminada y que había fallado a la mitad, así
que el listado de archivos decía que estaba y la base no la tenía entera. Lo que lo destapó fue
preguntarle a la base, tabla por tabla, qué tiene, y ése sigue siendo el procedimiento:
`banderas_asistente` contesta que no existe; `autorizaciones_asistente`,
`disponibilidad_asistente` y `franjas_asistente` contestan que existen y que a un visitante sin
sesión no le muestran nada; y `directorio` devuelve la columna `reemplazos_urgentes` y ya no
devuelve `disponible_urgencias`.

### Las últimas listas escritas a mano se fueron de las pantallas

Quedaban dos, y eran las más visibles: las diez tarjetas del asistente de seis pasos de
`formulario-integral.html` —la hoja de muestra que el 9 de septiembre de 2026 salió de uso, así
que hoy esas dos grillas viven en `fuera de uso/formulario-integral.html:143` y no las dibuja
ninguna pantalla del portal—. Cada una traía su ícono, su título y su explicación escritos adentro
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

**Y el 9 de septiembre de 2026 el modo de dibujo se fue detrás de la hoja de muestra.** Retirada
la única pantalla que declaraba `tarjetas` y `tarjetas-una`, quedaron sin usar el método que las
dibujaba, la regla de estilo de la grilla y las dos constantes del ícono. Se sacaron, porque
código que no llama nadie hace creer que alguna pantalla lo usa. Pero no se tiraron: código que
sirve no se tira. Las tres piezas subieron tal como estaban, con un documento que dice qué son,
cómo funcionan, de qué dependen y cómo se vuelven a poner, al estante de códigos útiles de la
empresa, que está afuera de todos los productos porque el código es de CeltaTech y tiene que
quedar a mano de cualquiera de ellos. Y el original entero sigue además en el historial. Lo de
arriba sigue valiendo igual: el contenido de una lista sale del catálogo y no del HTML.

### Lo que una Familia pide ya tiene dónde guardarse

Tres pantallas le preguntan cosas a una Familia y `avisos` tenía siete columnas. Lo que
sobraba no daba error: se perdía en silencio un paso antes de la base. Una migración posterior le dio una columna
a cada cosa —`zone`, `description`, `consultation_reason`, `tasks_required`,
`profession_required`, `preferred_gender` y `frequency`— y las tres pantallas ya las usan.
Comprobado en el navegador, pantalla por pantalla, mirando la fila que sale hacia la base.

- **El motivo de la consulta salió de adentro de las patologías.** `solicitar-asistente.html`
  mandaba «quiero hacer un curso» en la columna donde van las patologías del paciente, que es la
  misma falla que ya se había arreglado con el teléfono. Ahora va a `consultation_reason`, y las
  filas que se hubieran escrito así quedaron rescatadas.
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
- **«Bandera» se fue de donde nombraba una casilla.** La palabra la había puesto la línea de comandos traduciendo
  *flag*, y el Desarrollador la sacó el 24 de agosto de 2026: «una bandera es una tela que
  identifica un país o un ejército, pero nunca es una casilla». La tabla es
  `autorizaciones_asistente`, el catálogo es `data/catalogo-autorizaciones.json`, y donde la
  palabra nombraba un interruptor de código —`useSupabase`— dice interruptor. Donde todavía se lee
  es en `patrones_de_contacto.banderas` (`supabase/migrations/0001_base_del_esquema.sql:2893`), que
  no guarda ninguna casilla marcada sino las letras `g` e `i` con que se lee una expresión regular
  y que `js/contacto.js:112` le pasa a `RegExp`. Es otra cosa con el mismo nombre, y queda anotado
  acá para que quien lo encuentre no crea que es un resto del renombre.
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
- **Las dos pantallas pasaron a preguntar la misma grilla de veintiún casilleros**, la misma que
  usa el Asistente desde el pendiente 23. Desde el 9 de septiembre de 2026 la pregunta la hace una
  sola: `formulario-integral.html` salió de uso, y del lado de la Familia queda
  `pwa-familia/index.html:1809`. No es una grilla nueva: `js/disponibilidad.js` ya sabía armarla
  desde el catálogo, y lo único que le faltaba era poder servir a los dos lados. Ahora recibe qué
  bloque del catálogo tiene que leer, y `data/catalogo-disponibilidad.json` declara dos: la del
  Asistente dice «¿Cuándo puede trabajar?» y marca «Disponible»; la de la búsqueda dice «¿Cuándo se
  necesita el cuidado?» y marca «Se necesita». El mismo casillero, dos preguntas distintas.
- **Se guarda como lo guarda un Asistente: una fila por casillero.** La tabla es
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
  pares; y al recorrer la grilla con el teclado, el programa que lee la pantalla en voz alta dice
  «Martes, Tarde, Se necesita», que es la pregunta de la búsqueda y no la del Asistente. La del
  Asistente sigue diciendo «Disponible» y conserva su pregunta de reemplazos urgentes.

**Lo que quedó abierto, y es una sola cosa.** La tabla existe y las franjas se guardan: la base
tiene `franjas_aviso` con su clave, su unicidad por `(aviso_id, dia, turno)` y su columna de
Organización. Lo que sigue en pie es que **`avisos.grid_schedule_7x3` no se fue**: ninguna
pantalla la escribe ni la lee, pero la columna está y tiene adentro las dos formas viejas. Sacarla
toca datos guardados, así que no la mueve la línea de comandos por su cuenta; es el pendiente 40, y
la línea que la saca es `alter table public.avisos drop column grid_schedule_7x3;`

### El alta del teléfono guarda el legajo entero, y no sólo la disponibilidad

Cierra el pendiente 36, el 25 de agosto de 2026.

Quien se registraba desde el teléfono quedaba dado de alta sin legajo y sin poder aparecer nunca en
el directorio: el directorio exige una fila en `autorizaciones_asistente` con un `join` y no con un
`left join` (`supabase/migrations/0001_base_del_esquema.sql:797`), y esa pantalla no
tenía el paso que la crea. Ahora manda lo mismo que el portal.

- **Los dos pasos que faltaban se dibujan desde el catálogo**, no están escritos en la pantalla.
  Matrícula y estudios en el paso 2, experiencia laboral en el paso 3 y referencias en el paso 5
  salen de `data/catalogo-fichas.json` a través de `js/fichas-legajo.js`
  (`pwa-asistente/index.html:2163`, `montarFichas`). El paso de cierre sale de
  `data/catalogo-autorizaciones.json`.
- **El paso de cierre pasó a ser un módulo.** Estaba escrito adentro de `registrar-asistente.html`,
  cuarenta renglones que traían el archivo y armaban las casillas. Ahora es `js/autorizaciones.js`,
  y las dos pantallas consumen el mismo («ningún patrón repetido sin punto único de verdad»). Copiarlo habría sido tener el mismo paso dos
  veces, con el precio de siempre: se arregla uno y el otro queda viejo.
- **Subir los archivos también dejó de estar en la pantalla.** `FichasLegajo.subirArchivos`
  (`js/fichas-legajo.js:305`) es el único lugar que sabe a qué depósito van la matrícula y el
  título, y devuelve la lista de los que no subieron para que quien llama avise una sola vez.
- **De paso arregló algo que estaba mal en el portal.** Cuando la ficha de estudio no traía archivo
  —es optativo—, la fila viajaba igual con una clave `archivo` en `null`. La columna se llama
  `archivo_url` (`supabase/migrations/0001_base_del_esquema.sql:2539`), así
  que esa fila no entraba y la persona no se enteraba.
- **Y el alta del teléfono creaba cuentas sin dueño.** `registrarAspirante` no escribía `user_id`,
  así que la persona quedaba con cuenta y con legajo, pero el legajo no era de nadie y no lo podía
  abrir. Se agrega en `guardarLegajo` (`pwa-asistente/index.html:2223`), que es donde ya se sabe
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
- **La base local estaba diez migraciones atrás** de lo que el servidor alojado ya tenía. Lo
  primero que devolvió la prueba fueron ocho fallos de «no encuentro la tabla» que no eran
  agujeros de aislamiento: eran tablas que en esa base no existían.
- **Y arrancaba pidiendo la lista de Prestadoras**, que se quitó a propósito. Con la base al día,
  la prueba se cortaba en el primer renglón: «hacen falta dos Prestadoras, hay 0». Ahora las pide
  de a una por su nombre corto, con `prestadora_por_slug`, que es la única puerta que quedó.

**El fallo que importó es el del directorio, y lo destapó la única comprobación positiva que
tenía.** La prueba leía `directorio` derecho, y ese permiso ya no lo tenía nadie:
las dos comprobaciones que esperan **no** ver a nadie seguían diciendo «bien», porque no veía a
nadie nunca. La tercera —la que exige que la persona **sí** aparezca después de autorizar— es la
que se puso en rojo. Sin ella, tres comprobaciones rotas habrían seguido pasando por años. Hoy el
directorio se pide por `directorio_de(<nombre corto>)` y el perfil por
`perfil_del_directorio(<nombre corto>, <id>)`.

**Y se le agregó la comprobación que faltaba:** que el legajo publicado de una Prestadora **no**
aparezca en el directorio de la otra. Es la razón de ser de esa puerta, y hasta ese día nada la
verificaba.

**Resultado: 49 comprobaciones, todas en verde**, contra las 24 migraciones. Cubren el perfil que
crea el registro, el legajo, los archivos de los dos depósitos, el directorio de cada Prestadora,
el examen, y la barrera entre dos Familias de una misma Prestadora —avisos, horarios, mensajes,
reportes y ponderaciones—.

**Y volvió a correr ese mismo día contra el esquema entero, con el mismo resultado: 49 de 49.**
Pero para que diera eso hubo que aplicarle a la base local dos migraciones que le faltaban, y ahí
está lo que conviene anotar. `supabase migration list --local` mostraba las dos últimas con el
archivo presente y el renglón de la base vacío, mientras que `--linked` las tenía completas: **la
base local se había vuelto a atrasar el mismo día en que se la había puesto al día**, lo cual dice
que no es un descuido sino la forma normal de las cosas. `supabase migration up --local` las
aplicó enteras las dos, que de paso es una comprobación de que corren o no corren, sin dejar la
base a mitad de camino.

**Lo que importa no es el atraso sino que la prueba no lo nota.** El 49 de 49 es el mismo número
que habría dado sin aplicar ninguna de las dos: una sólo reemplazaba la vista y la otra sólo
insertaba filas, ninguna creaba tabla ni columna, y la prueba no nombra en sus 828 renglones ni a
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

- **Lo trae `traerDelDirectorio` (`js/apiClient.js:978`)**, que pide una sola fila filtrando por
  identificador y por Prestadora. Un identificador que no tiene forma de identificador se contesta
  sin preguntarle a la base: la base devolvería un error de sintaxis, y un error en pantalla se lee
  como que el sistema se rompió, cuando lo que hay es un enlace viejo. Los hay: hasta el 25 de
  agosto de 2026 esta pantalla se abría con `?id=1`.
- **El filtro por Prestadora se puede desmentir, y se intentó.** La vista devuelve hoy 7 personas
  publicadas, repartidas entre las dos Prestadoras ficticias. Pidiendo desde el enlace de PresDemo
  el identificador de una persona de la otra Prestadora, la pantalla no la muestra: queda vacía. Sin
  ese filtro aparecería, que es exactamente la falla que se estaba buscando.
- **Los cuatro estados están** (`perfil.html:71`, `:72`, `:81` y `:92`): cargando, error con
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
(`perfil.html:161`) y ofrece las dos puertas que sí existen: entrar como Familia y publicar un aviso.
Lo que falta —empezar una conversación con esa persona en particular— quedó anotado como pendiente 46.

**Tres traducciones que estaban por escribirse dos veces subieron a los archivos compartidos**
(«ningún patrón repetido sin punto único de verdad»): el precio en pesos es `Texto.importe` (`js/texto.js:167`), la etiqueta de una lista es
`Catalogo.etiquetaSiExiste` (`js/catalogo.js:449`), y la de una tarea —que puede estar en cualquiera
de tres listas— es `Catalogo.etiquetaDeTarea` (`js/catalogo.js:462`). Vivían adentro de
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
- **El modelo de términos se llama `docs/terminos_y_condiciones_asistentes.md`** y adentro dice
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
  de una pastilla apoyada sobre color. **Hoy quedan siete**: el ícono decorativo sólo lo usaba el
  monigote de la sala de videollamada simulada, y se fue con ella el 2 de septiembre de 2026.
- **`scripts/verificar_paleta.mjs` es el chequeo que impide que vuelvan.** Es el octavo, y también
  entró solo: ni el corredor ni el gancho de commit se tocaron.
- **El chequeo encontró una cuarta puerta que el barrido no había mirado.** Los colores entran por
  los atributos `style=`, por los bloques `<style>`, por los `.css` — y por el JavaScript, que pinta
  con `elemento.style.background = '#ffebee'`. Había dieciséis ahí, invisibles para cualquiera que
  buscara en las hojas de estilo.
- **No queda ningún color escrito a mano, y ninguna exención.** Hasta el 2 de septiembre de 2026
  quedaban dos, el rojo de Google y el azul de Facebook, en los botones de ingresar con esas
  cuentas. Esos botones no hacían nada y se sacaron, así que la exención se fue con ellos: una
  exención que ya no exime nada sigue perdonando, y lo único que perdona es el aire.

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

1. **Letra blanca sobre `--azul-medio` llega a 3.21:1 y hace falta 4.5:1.** Se contaron cinco
   lugares, y desde el 9 de septiembre de 2026 quedan **cuatro** en el portal: el redondel del paso
   activo del formulario (`registrar-asistente.html`; el quinto era
   `formulario-integral.html`, que salió de uso), la banda con el nombre adentro del teléfono
   dibujado (`index.html` y `registrar-asistente.html`) y el botón de ingresar de
   `mockup-app.html`. **El
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

- El bloque `@media (prefers-color-scheme: dark)` (`css/tokens.css:270`), con los mismos valores
  que `:root[data-tema='oscuro']` (`css/tokens.css:227`).
- La guarda `:not([data-tema='claro'])` en ese bloque (`css/tokens.css:271`). Sin ella, quien
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
caso real que lo pedía: el grupo de una casilla del legajo (`js/fichas-legajo.js:110`) mide
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
qué lado del reparto de `docs/MODULOS.md` cae cada una —ocho son propias de esta modalidad
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

**Los documentos exentos, y por qué.** Hoy ninguno lo está por ser una foto fechada, y la lista que
guardaba a ésos ya no está en `scripts/citas.mjs`. Existió para los documentos que citan el código
de un día a propósito —a ésos corregirles los renglones sería falsear lo que decían—, y se fue
vaciando sola porque **una exención se borra junto con el archivo que eximía**: si no, queda
señalando a un documento que ya no está. Vacía no eximía a nadie, así que se borró también ella,
que es lo que se hace con cualquier cosa que ya cumplió su función: no hay depósito de listas
viejas, y una lista vacía que sigue escrita invita a volver a llenarla.

Las dos que quedan no perdonan una cita vieja sino una que el guion no tiene cómo abrir. `AJENOS`
tiene la migración
`supabase/migrations/20260820190000_el_canal_del_asistente_se_elige_y_se_respeta.sql`, que es de
Careonys y vive en su propio repositorio: la cita queda porque de ahí sale una frase que se
transcribe, y el archivo no está acá para comprobarla. `DE_OTRO_REPOSITORIO` tiene
`docs/APORTES_A_CAREONYS.md`, que compara lo que hay acá con lo que hay allá, y se le perdonan
**sólo** sus citas a archivos de Careonys: las que hace a este repositorio se comprueban igual que
las de cualquier otro documento, porque son justamente las que se despegan solas cuando alguien
mueve un renglón. Eximir el documento entero convertiría el permiso en un agujero.

Aparte de ésas hay una lista más, `AJENAS`, que no exime a ningún documento: nombra las carpetas de
trabajo de quien desarrolla, que no son documentación del proyecto y por eso no se recorren. Y cada
exención lleva su motivo escrito al lado, porque una exención sin motivo es una excepción que nadie
va a poder revisar después.

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
  pantalla leía la tabla `cursos`
  (`supabase/migrations/0001_base_del_esquema.sql:2359`). Filtra `publicado=eq.true` y ordena por
  `orden`. Ese filtro está en el pedido y no en la política de la tabla porque la
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
  —`<template id="molde-asistente">`, `directorio.html:128`— y el contenido llega de
  `directorio`. El archivo pasó de 534 renglones a 342.
- **Todo lo inventado se fue con las tarjetas.** No hay sistema de puntaje, no hay estrellas y no
  hay porcentaje de coincidencia, así que no se muestran. Lo que queda es lo que el consentimiento
  promete —nombre, foto, zona, qué atiende y precio por hora
  (`data/catalogo-autorizaciones.json`, `perfil_publicado`)—, más la insignia «Legajo validado por
  la Prestadora», que es la condición que la vista ya exige para devolver la fila, y la de
  reemplazos urgentes, que sale de `disponibilidad_asistente`.
- **El filtro por Prestadora vive en el cliente de datos y no es optativo**
  (`js/apiClient.js:814`). El resto del archivo filtra «si hay Prestadora resuelta», y eso no sirve
  para una pantalla que se ve sin cuenta: sin sesión, la que no filtra devuelve las dos mezcladas.
  Acá, si no hay Prestadora, no se pide nada.
- **Y si la dirección nombra una Prestadora que no existe, tampoco se muestra otra.** Comprobado
  en el navegador antes de tocar nada: `directorio.html?t=prestadora-que-no-existe` mostraba los
  cuatro Asistentes de PresDemo, porque el respaldo devuelve la primera Prestadora de la base. El
  respaldo sirve para una dirección que no nombra ninguna, no para una que nombra mal. Ahora se
  distingue un caso del otro (`js/apiClient.js:866`) y el segundo avisa. **Y el respaldo ya no
  existe**: mostrar la primera Prestadora de la base era leer la lista de clientes de CeltaTech, y
  esa lista no la ve nadie. Quien entra sin enlace ahora ve que le falta el enlace.
- **La base tenía el directorio vacío y nadie se enteraba.** `directorio` devolvía **cero
  filas**, y no por un problema de permisos: los legajos inventados estaban validados, pero nadie
  había contestado la autorización de publicación, que la vista exige. Con ocho tarjetas dibujadas
  encima, eso no se veía. La siembra de hoy la contesta, y **deja dos legajos validados y sin
  publicar a propósito** —Ester Villalba Ficticia y Ramiro Cáceres Ficticio, los dos de PresDemo—
  para que la condición del consentimiento se pueda comprobar: si aparecieran, la vista no estaría
  mirándola. Son dos de los once validados, y por eso el directorio publica nueve.
- **Comprobado en el navegador, con las dos Prestadoras grandes.** Cada una muestra las suyas y
  ninguna de la otra: hoy la vista devuelve tres filas para PresDemo, cinco para Cuidar Norte y
  una para Cuidar Sur, y no hay sesión desde la que se vean las nueve juntas. Los tres filtros y
  la búsqueda libre funcionan sobre las tarjetas recién traídas —la búsqueda «ruben» encuentra a
  Rubén Ocampo Ficticio—, y los cuatro estados se probaron uno por uno, incluido el botón de
  reintentar. La respuesta de la base no trae documento, teléfono, correo ni domicilio.
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

- **Una sola quedaba muda de verdad.** En `panel-prestadora.html:1590`, una tabla sin legajos se ve
  igual esté rota o esté bien: es idéntica a la de una Prestadora que todavía no cargó ninguno.
  Ahora el fallo escribe en la propia tabla «No se pudo preparar la pantalla. Conviene volver a
  cargarla», que es el estado de error que faltaba.
- **Las otras tres caen en la pantalla de acceso**, y eso ya era la verdad: sin sesión rescatada,
  lo que corresponde mostrar es el acceso. Lo que se perdía era el rastro. Ahora
  `mockup-app.html:448` y `:956`, `pwa-asistente/index.html:1054` y `pwa-familia/index.html:1104`
  dejan el detalle técnico en la consola en lugar de tirarlo.
- **`js/auth.js:385` no avisa en pantalla, y es a propósito.** Corre en las once pantallas que
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

- **Toda tabla enciende su RLS en la misma migración que la crea** (§4). Las 36 lo hacen.
  Encenderla después, a mano desde el panel de Supabase, deja una ventana abierta entre las dos
  cosas y deja el repositorio diciendo algo que no es.
- **Toda función que se saltea la RLS le revoca el permiso a `PUBLIC` y a `anon`** (§4). Hay 28
  funciones `SECURITY DEFINER` y 22 lo hacen; las 6 que quedan al alcance de quien no inició
  sesión están ahí a propósito, y son las seis que atienden la puerta pública de una Prestadora
  —`directorio_de`, `guias_de`, `perfil_del_directorio`, `prestadora_por_slug`,
  `vocabularios_de` y `zonas_de`—: las seis exigen el nombre corto de la Prestadora, lo comparan
  contra `slug` y no dejan que el nulo las abra todas. Una función `SECURITY DEFINER` del esquema
  `public` es además una dirección web, porque PostgREST publica ese esquema, y por eso la lista de
  las que sí se abren se comprueba de a una en vez de contarse. El chequeo **no** mira
  `authenticated` a propósito: ahí los dos casos son legítimos, porque la que consumen las
  políticas tiene que conservarlo —sin él la aplicación no puede leer sus propias tablas— y la que
  dispara un `trigger` no lo necesita.
- **Toda tabla tiene la columna de la Organización** (§5.10). La tienen 34 de las 36, y las dos que
  faltan están exentas con el motivo escrito. `tenants`, porque es la Organización: su propio
  identificador es el que las demás copian. Y `patrones_de_contacto`, porque son las reglas del
  producto —qué cuenta como un teléfono, un correo o un domicilio adentro del chat— y no el dato de
  nadie: valen igual para todas las Prestadoras, y sólo se dejan leer.
- **Toda tabla tiene clave primaria `uuid`** (§5.10). Las 36 la tienen. Hoy las 36 están escritas
  de la misma forma, en un `alter table … add constraint … primary key` que va más abajo en el
  mismo archivo, porque así las escribe un volcado; el chequeo igual busca en las tres formas y no
  en una, y eso no sobra: la forma corta, al lado de la columna, vuelve apenas alguien escriba una
  tabla a mano. Es la otra mitad de la regla de la columna de Organización, y es por lo mismo: dos
  bases que se fusionan con claves correlativas chocan en el número 1, y hay que reasignarlas todas
  junto con cada referencia que las apunta. Con UUID no chocan.
- **Todo importe se guarda con su moneda** (§5.11). Fue el único incumplimiento del esquema y se
  cerró el 5 de septiembre de 2026. `caregivers.hourly_rate`
  (`supabase/migrations/0001_base_del_esquema.sql:488`) era un `numeric` a secas —el único importe
  del esquema— y la moneda vivía escrita adentro de `js/texto.js`, igual para todo el mundo. El
  Desarrollador decidió que la elige cada Prestadora, y hoy está donde va: el vocabulario `moneda`,
  la columna `tenants.moneda` que la Prestadora configura desde su panel, y
  `caregivers.moneda_valor_hora` (`supabase/migrations/0001_base_del_esquema.sql:491`), que el
  disparador `el_valor_hora_nace_con_su_moneda` (`:1053`) completa sola con la de su Prestadora y
  que la tabla exige cada vez que hay un valor por hora (`:486`). **La moneda se copia al legajo
  en vez de leerse de `tenants` cada vez**, por lo mismo que los cálculos económicos van «a la
  escala vigente a la fecha del hecho»: una Prestadora que pasara de peso a dólar le multiplicaría
  por mil el precio a todo el mundo. El chequeo se quedó sin ninguna exención de importes.

**El chequeo mira el neto y no cada archivo por separado, y eso no es un detalle de programación.**
La regla pide la columna, no el momento en que apareció: una tabla que nace sin ella y la recibe dos
migraciones después la tiene igual, y darla por incumplida sería medir la historia en vez del
estado. El momento sí lo pide la RLS, que es la regla de al lado, y por un motivo distinto —entre
crear la tabla y encenderla queda una ventana abierta—. Así que el chequeo lee las tres migraciones
juntas antes de juzgar ninguna, y las juzga por lo que dejan puesto al final.

Se mira a sí mismo con diecisiete casos, siete que tiene que encontrar y diez que tiene que dejar pasar
—entre ellos `numeric(10,2)`, que con un recorte ingenuo por el primer paréntesis que cierra parte
la tabla por la mitad—. Y para que no fuera una prueba que no puede fallar, se corrió una copia con
la lista de exenciones vacía: aparecen los dos casos conocidos, cada uno en su renglón exacto.

### La regla de los módulos se midió para hacerle un chequeo, y el chequeo no se escribió

**El reparto de módulos se queda sin chequeo automático, y conviene dejar escrito por qué**, porque parecía
la candidata más fácil: es la única que trae su propia lista de palabras. `docs/MODULOS.md`, «Cómo se comprueba que la línea está bien puesta»,
manda «buscar en lo compartido cualquier palabra que sólo signifique algo acá —directorio,
aviso, postulación, contacto, puntaje, destacado—». Se midió el 25 de agosto de 2026 y
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
  prueba.** Las dos tablas de esta modalidad se llamaban `care_searches` y `franjas_busqueda`, y
  ninguna de las dos contenía ninguna de las siete palabras. La prueba pasaba limpia con el
  problema adentro.

**Lo que falta es el reparto escrito tabla por tabla.** Un chequeo que quiera correr solo tiene
que saber de qué lado está cada tabla, y eso no se deduce del nombre: se lee de una lista. La
lista vive en `docs/PENDIENTES.md`, en el reparto de tabla por tabla, y es el único lugar donde
está escrito. `docs/MODULOS.md` reparte módulos, que es otra cosa.

**Y no se arregla poniéndole el nombre de la modalidad a las tablas.** Se probó, y salió mal: ese
nombre quedó escrito en más de cuatrocientos lugares, y el 9 de septiembre de 2026 hubo que
sacarlo de todos. Lo que se guarda se llama por lo que hace.

Quedó anotado como **pendiente 52** y el Desarrollador lo decidió ese mismo día: se renombran
las dos. Cómo quedó está en la sección de acá abajo.

### El cuadro «Estado real» se volvió a medir, y una cuenta estaba mal

El `README.md` abría con siete filas de números —pantallas, renglones, dependencias, tablas—
que eran del arranque del proyecto y que nadie había vuelto a medir. Decía «6 tablas en
Supabase, **sin migraciones en el repositorio**» cuando ese día había veintidós tablas y dieciséis
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

El renombre estaba escrito en dos migraciones y sin aplicar, y mientras tanto el código pedía
tablas que en el servidor todavía se llamaban como antes. **Se aplicaron el 25 de agosto de 2026
con `supabase db push`**, contra la base de este proyecto —`pfbvpncavvlgmmvqkgbo`, la misma que
nombra `js/apiClient.js:8`—, y no contra la de Careonys, que está en producción y no se toca desde
acá. Con eso desapareció la diferencia entre lo que corría en esta máquina y lo que corría en
el servidor.

**Y aplicarlas destapó un valor muerto.** `caregivers.verification_status` aceptaba dos palabras
para decir una sola cosa: `validado` y `validado_prestadora`. Lo que significa ya estaba escrito
cuando se creó la columna —«Validado quiere decir "la Prestadora revisó los papeles"»—, y es lo que
dice `validado_prestadora` con todas las letras. Los dos pasaban en todos lados, y **el corto no lo
escribía nadie**: el único lugar que asigna un estado validado es `panel-prestadora.html:770`, y
pone el largo. El corto sólo aparecía leído, y en una fila de ejemplo.

La corrección lo saca: pasó las filas que decían `validado` a decir `validado_prestadora`, y el
directorio dejó de nombrar el valor muerto. En el código quedaba un solo lugar que lo leía
—`pwa-asistente/index.html:1775`, un `||` defensivo— y también se fue. Hoy la base tiene once
legajos en `validado_prestadora`, dos en `en_revision` y ninguno con la palabra corta. **Lo que eso
no hace es cerrar la lista de estados con un `check`**, porque para eso hay que saber cuáles son
todos, y hoy el código nombra cuatro sin que ningún lugar diga que ésos son todos.

Esto cierra la mitad del pendiente 53. La otra mitad no la puede cerrar la línea de comandos: falta
**el nombre del segundo nivel de Asistente**, y un nombre no se inventa.

### Las dos tablas de esta modalidad pasaron a llamarse como lo que guardan

**Decidido por el Desarrollador el 25 de agosto de 2026**, sobre el pendiente 52 y con las tres
opciones a la vista: se renombran las dos, no una sola. El motivo que dio es el que cierra la
discusión —*no puede ser que tengamos distintos nombres para la misma cosa*—, y vale más que el
trabajo de arreglarlo.

**El problema era la palabra:** `care_searches` no guardaba búsquedas. Una búsqueda es el acto de
buscar y no deja nada guardado; lo que queda guardado es el aviso que publica la Familia.

**Cómo quedó.**

| Antes | Ahora | Qué pasó |
|---|---|---|
| `care_searches` | `avisos` | Un renombre de verdad, porque la tabla ya existía con datos adentro: se mudaron con ella la clave, la restricción, el índice y la política (`supabase/migrations/0001_base_del_esquema.sql:2183`) |
| `reportes.search_id` y `messages.search_id` | `aviso_id` | El mismo renombre, con sus dos restricciones |
| `caregivers_publicos` | `directorio` | El mismo renombre. El nombre no es nuevo: es el del módulo, decidido el 24 de agosto en `docs/MODULOS.md:58` |
| `franjas_busqueda` | `franjas_aviso` | No hubo renombre: `franjas_busqueda` no llegó a existir nunca en ninguna base. La tabla nació ya con el nombre nuevo (`supabase/migrations/0001_base_del_esquema.sql:2555`) |
| `franjas_busqueda.search_id` | `franjas_aviso.aviso_id` | Ídem |
| `grilla_busqueda`, `paso_de_franjas_busqueda` | `grilla_aviso`, `paso_de_franjas_aviso` | Claves del catálogo `data/catalogo-disponibilidad.json` y sus dos copias |
| `getBusquedasFamilia`, `crearBusquedaFamilia`, `crearBusqueda`, `guardarFranjasDeBusqueda`, `getFranjasDeBusqueda` | `getAvisosFamilia`, `crearAvisoFamilia`, `crearAviso`, `guardarFranjasDeAviso`, `getFranjasDeAviso` | `js/apiClient.js` y sus dos copias, más quien las llama. El 5 de septiembre de 2026 se borraron dos de esos nombres nuevos, `getAvisosFamilia` y `getFranjasDeAviso`: ninguna pantalla llegó a llamarlas y el camino vivo es `avisos_abiertos()` y `franjasDeAviso()` (pendiente 128) |
| `busqueda_sin_franjas` | `aviso_sin_franjas` | El error y su texto en `js/texto.js` |

**Lo que este renombre dejó a la vista y no arregló.** `reportes` y `messages` son tablas
compartidas y siguen apuntando a un objeto que sólo existe en esta modalidad. Antes la columna se
llamaba `search_id` y no se notaba; ahora se llama `aviso_id` y se nota. Es un problema de
reparto, no de nombres, y sigue anotado en el pendiente 52.

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
rechazar un legajo (`panel-prestadora.html:858`). No hay un solo `delete` contra la base en las
cuarenta y cuatro pantallas y guiones —lo único que se parece son dos `delete` de JavaScript sobre
un objeto en memoria, `js/apiClient.js:506` y `js/apiClient.js:617`, que no tocan nada guardado—, y
salir de la sesión no
destruye nada. La única que hay ya pregunta antes, y la pregunta dice qué queda después:
«Se va a rechazar este legajo. Queda cerrado y la persona no aparece en el directorio.
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

Así que los pesos iguales dejaron de ser la regla y pasaron a ser **el valor de fábrica**, y para
eso hay dos tablas, no una (`supabase/migrations/0001_base_del_esquema.sql:2413` y `:2937`):

| Tabla | Qué guarda |
|---|---|
| `puntaje_prestadora` | Una fila por Prestadora, con una sola llave: `califica`. En `false` desaparece el número de todas sus pantallas |
| `ponderacion_comprobacion` | Una fila por Prestadora y comprobación, con `ponderacion`. Arranca en 20 las cinco, que es 100 repartido en partes iguales |

**Apagar el puntaje no apaga el escudo.** Son cosas distintas: el escudo dice que el legajo está
validado, y eso es la puerta del directorio —no se entra sin eso—. El número dice cuánto acreditó
alguien de más. Se puede no querer lo segundo sin dejar de necesitar lo primero.

**Y una ponderación en cero no es lo mismo que apagar el puntaje.** Cero quiere decir «esta
comprobación a mí no me importa», y el resto sigue sumando. Por eso son dos tablas y no una: una tabla vacía
no dice «todas valen uno», dice «todavía nadie configuró esto», y esas dos cosas no se pueden
confundir. La migración siembra las filas de fábrica para las Prestadoras que ya existen,
justamente para que el valor de fábrica sea visible y no un supuesto escondido en el código.

**La palabra `peso` no sobrevivió al primer lector.** El Desarrollador leyó «el formulario de
pesos en el panel de la Prestadora» y preguntó si se estaba hablando de dinero. Esa es toda la
prueba que hacía falta: acá el peso es la moneda antes que cualquier otra cosa. Así que la tabla
se llama `ponderacion_comprobacion` y la columna, `ponderacion`, que es la palabra que ya
significa cuánto cuenta cada cosa dentro de un total. Se renombró el mismo día que se leyó mal.
Sale barato porque la base todavía no tiene datos reales; dentro de un año no salía. **La palabra
sí quedó en los nombres de las restricciones**, que nadie escribe ni lee: la clave primaria, la
unicidad, la clave foránea y las dos comprobaciones siguen llamándose `peso_comprobacion_…`,
porque renombrarlas no cambia ningún dato. Queda dicho para que quien lo vea en el esquema sepa
que es la misma tabla y no otra.

**Y con el sí vino una regla que cambia la tabla más que el nombre:** «lo que sí es importante
es que la suma de todos los ítems valorados dé 100%, así que si se agrega alguno la prestadora
tendrá que reacomodar las ponderaciones de cada ítem para que el total de todas ellas dé el
100%». Antes cada comprobación valía lo suyo y era independiente: subirle a una no le
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
| La base | `logbook_entries` pasó a `reportes`, con sus tres restricciones y su política |
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
| Prestadora ↔ Prestadora | `tenant_id = prestadora_actual()` (`supabase/migrations/0001_base_del_esquema.sql:423`) | entera |
| Asistente ↔ Asistente | `legajo_propio()` (`supabase/migrations/0001_base_del_esquema.sql:1614`); la carpeta propia en el depósito de archivos (`:6033`) | entera |
| Familia ↔ Familia | nada | **no existía** |

Las dos primeras separan cosas que están en tablas distintas o en carpetas distintas. La
tercera es más difícil justamente porque **las dos Familias están adentro de la misma
Prestadora**: ahí el `tenant_id` de las dos vale lo mismo, así que no separa nada. Cinco tablas
se conformaban con él, y eso quería decir que **una Familia, con sólo iniciar sesión, leía,
modificaba y borraba los avisos de las demás, y leía la presión, la glucemia y la medicación de
todos los Pacientes de la Prestadora**. Lo mismo un Asistente con sesión. Hoy las cinco políticas
nombran además a la persona, y la base lo confirma: la de `avisos` exige `familia_id =
auth.uid()` salvo para el personal de la Prestadora
(`supabase/migrations/0001_base_del_esquema.sql:4557`).

**Faltaba una pieza antes de poder escribir la regla: el aviso no sabía de quién era.**
`avisos` no tenía ninguna columna que lo atara a quien lo publicó, así que no había con qué
comparar. Ahora tiene `familia_id`, y el valor **sale del valor por omisión y nunca del pedido**
—igual que `tenant_id`, que también nace de `prestadora_actual()`—, que es lo que hace que nadie
pueda publicar un aviso a nombre de otra persona. Los horarios y la conversación no deciden nada
por su cuenta: cuelgan del aviso, y si el aviso no se ve, el `exists` de la política no encuentra
nada y ellos tampoco se ven.

**Y había un agujero recién hecho, propio, que se cerró en la misma pasada.** Las dos tablas de
la ponderación —cuánto pondera cada Prestadora su puntaje— tenían políticas que sólo miraban el
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
tabla vacía: **las filas existen porque las siembra `supabase/migrations/0002_siembra_ficticia.sql:183`**, así que ver cero ahí es la
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

**El rol anónimo no alcanza ni una tabla ni una vista que tenga datos de una Prestadora.** Lo
único que lee de este esquema son tres objetos abiertos a propósito, y ninguno de los tres los
tiene: las vistas `oferta_comercial_publica` (`supabase/migrations/0001_base_del_esquema.sql:2792`)
y `oferta_de_cursos` (`:2857`), que su propio cuerpo acota a la oferta general del producto
—`tenant_id is null`—, de modo que no sale por ahí ni un ítem de una Prestadora ni el nombre de
ninguna; y la tabla `patrones_de_contacto` (`:2928`), que son las reglas del producto sobre qué
cuenta como un dato de contacto y valen igual para todas. Los tres sólo dejan leer. Lo que sí
devuelve datos de una Prestadora son seis funciones, y las seis le piden nombrarla:
`prestadora_por_slug`, `directorio_de`, `perfil_del_directorio`, `guias_de`, `vocabularios_de` y
`zonas_de`. El barrido lo confirma contra el servidor real: 39 tablas y vistas con datos de una
Prestadora, 37 que ni dejan preguntar, **0 que contesten sin devolver nada** —que sería el caso
ambiguo, el que puede ser la política o puede ser una tabla vacía— y 2 que devuelven filas, que son
las dos vistas declaradas arriba, con su motivo escrito y comprobado de a una.

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
(`supabase/migrations/0001_base_del_esquema.sql:776`), con hasta cinco claves:
domicilio, referencia, matrícula, título y curso aprobado. Las cinco ya estaban restringidas en la
base, así que no hubo que inventar ninguna palabra.

| Qué se decidió no publicar | Por qué |
|---|---|
| Documento, antecedentes penales y certificado de salud | Son la puerta. Quien está publicado ya los pasó, así que nombrarlos no distingue a nadie, y son lo más sensible del legajo |
| Fechas y números | El consentimiento promete decir **qué** se comprobó, no cuándo ni con qué papel |
| Lo que **falta** | Decir qué falta es publicar el estado de los papeles de una persona, y eso no lo autorizó nadie |
| «Prefiero no decirlo», cuando es la respuesta de género | Escribirla en la tarjeta sería publicarla con otras palabras |

**Un papel presentado no es un papel comprobado.** La columna cuenta sólo las verificaciones en
estado `verificado`; el curso no viene de ahí sino de un intento aprobado, porque lo corrigió la
base al corregir la evaluación, y nunca fue un papel que alguien entregó.

**La primera prueba no probaba nada, y se rehízo.** Con la columna ya aplicada contra el servidor
real, las personas publicadas devolvían lista vacía: la siembra no tenía ni una comprobación
cargada, así que una consulta rota y una correcta contestaban lo mismo. La siembra reparte hoy las
comprobaciones a propósito —alguien con una matrícula sólo presentada, alguien con los
antecedentes penales comprobados de verdad—, y recién entonces la prueba pudo fallar. Es lo que se
ve en la base: Nadia Britos Ficticia tiene los seis papeles comprobados y su tarjeta publica
cuatro, porque los antecedentes penales y el certificado de salud no salen; Verónica Aguirre
Ficticia está publicada y su lista sale vacía, porque lo único que tiene comprobado es justamente
esos dos; y la matrícula que Ramiro Cáceres Ficticio presentó y nadie comprobó no aparece en
ninguna lista.

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
| Las reglas | la tabla `patrones_de_contacto` (`supabase/migrations/0001_base_del_esquema.sql:2889`) | Son una regla operativa, y una regla operativa no se escribe en el código. Quien quiera ajustar qué cuenta como teléfono agrega una fila y no toca ninguna pantalla ni despliega nada |
| La copia que ve el navegador | `data/patrones-contacto.json` | Generada desde la tabla con `node scripts/generar_patrones_contacto.mjs --escribir`. Existe porque el aviso previo tiene que poder avisar sin conexión, y `scripts/verificar_patrones_contacto.mjs` la compara contra la tabla en cada `commit` |
| El reconocedor | `js/contacto.js` | Un solo lugar. Es el aviso previo del navegador, no el control |
| La prueba | `scripts/verificar_contacto.mjs` | Entra sola al gancho de `pre-commit`, que busca los chequeos en la carpeta |
| El aviso, en tres idiomas | dentro del archivo de reglas | Un mensaje de error es texto visible, y no nace en un solo idioma |

**No se triplica.** Las copias de `js/` en cada PWA existen porque el trabajador de servicio de
cada una sólo alcanza su propia carpeta. Las dos PWAs sí tienen chat —`js/conversacion.js`,
montado en las dos—, pero ese chat no usa este archivo: se apoya derecho en la puerta del
servidor y muestra lo que ella conteste. El único que lo lee es `mockup-app.html`, que se va
cuando cierre el pendiente 6.

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
existe. **La mitad que importa va del lado del servidor**, y desde el 2 de septiembre de 2026 está
escrita: es la sección que sigue.

**Y el mismo día se sacó del HTML la consulta al chat.** Leer y mandar mensajes estaba escrito con
`fetch` a mano adentro de `mockup-app.html`, armando la dirección y los encabezados ahí mismo: era
el pendiente 15. No era una cuestión de prolijidad. Quien escribe la llamada a mano decide solo si
manda el token de quien inició sesión o la clave pública, y de ese renglón depende que la base
sepa quién está preguntando. Ahora son `ClienteDatos.getMensajes()` y
`ClienteDatos.enviarMensaje()` (`js/apiClient.js:931`), que arman el pedido una sola vez para
todos.

Se ganó algo que no se buscaba: la lectura vieja miraba `res.ok` y, si venía en falso, seguía de
largo con la lista vacía. `_supabaseRequest` convierte eso en un error. Hoy la tabla contesta
`42501 permission denied` a quien no inició sesión, y eso antes se veía igual que un chat sin
mensajes.

**Lo que no se decidió al mudarla.** La consulta se movió tal como estaba, con su tabla y sus
columnas de hoy, y sigue sin filtrar por conversación porque la tabla de hoy no tiene con qué.
Cuál es el modelo del chat —`messages`, o `conversaciones` y `mensajes`— sigue esperando decisión
en el §4 de este mismo documento, y mover una consulta de lugar no es elegirlo.

### La tercera puerta se cerró del lado del servidor

Hecho el 2 de septiembre de 2026. Cierra el pendiente 62.

**Qué hace.** Un disparador sobre `mensajes` revisa el texto **antes de guardarlo**. Si
adentro hay un dato de contacto, la fila no se escribe y la base contesta
`contacto_bloqueado:<clave de la regla>`. No hay consola de navegador que valga: quien manda el
pedido a mano recibe exactamente lo mismo que quien usa la pantalla.

**Las reglas son las mismas, y eso no es una promesa: se comprueba.** Viven en la tabla
`patrones_de_contacto`. El navegador las lee de `data/patrones-contacto.json`, que es una copia
generada desde esa tabla, y `scripts/verificar_patrones_contacto.mjs` entra solo al gancho de
`pre-commit` y pone rojo el día que las dos dejen de coincidir —regla por regla, y comparando la
expresión al carácter, porque una barra invertida de más es exactamente la clase de diferencia
que se busca—.

**Y las dos expresiones no se escriben dos veces.** Postgres y el navegador no escriben igual el
límite de palabra: uno lo dice `\y` y el otro `\b`, y en Postgres `\b` significa otra cosa —un
retroceso—, así que la misma expresión copiada tal cual no falla: **reconoce de menos, en
silencio**. La traducción la hace `patron_en_postgres`, una función, en un solo lugar y con el
motivo escrito arriba. Lo que la tabla no acepta es una expresión que Postgres no pueda entender
de ninguna manera —`\B`, una referencia hacia atrás, un mirador—: una restricción de la tabla la
rechaza al escribirla, y el chequeo la rechaza antes todavía.

**El rechazo se traduce, y no dice cuál regla saltó.** `js/texto.js` lo clasifica como
`error.contacto_bloqueado` y el catálogo de frases lo dice en los tres idiomas. Decir cuál de las
cinco reglas fue sería enseñar a esquivarla —«probá sin los puntos»—, que es lo contrario de para
qué está la puerta.

**La prueba pasa por la base y no por ninguna pantalla.**
`scripts/probar_la_tercera_puerta.mjs` abre una sesión de verdad e intenta guardar los mismos
veintiséis mensajes que usa el chequeo del navegador —trece que no pueden pasar y trece que no
pueden quedar bloqueados—, tomados los dos de `scripts/mensajes_de_contacto.mjs`, que es el único
lugar donde están escritos. Trece y trece: si mañana el disparador bloqueara todo, la mitad de
abajo se pone roja.

**La tabla se lee sin sesión, a propósito.** No guarda datos de nadie: guarda reglas del producto,
iguales para todas las Prestadoras, y no tiene columna de Organización. Se abre para que el
chequeo pueda comparar el archivo contra la tabla sin ninguna credencial. La exención está escrita
en `scripts/verificar_esquema.mjs`, en `TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO`, y **lo que la
sostiene se comprueba**: si alguien le agrega la columna de Organización, o le da permiso de
escribir, el chequeo se pone rojo.

**Lo que quedó abierto y no se decidió acá.** La regla nombra teléfono, correo y domicilio. Un
nombre de usuario de otra aplicación —«buscame en Instagram como…»— abre la misma puerta, y
bloquearlo puede cortar conversaciones legítimas. Es decisión del Desarrollador, y la migración
quedó escrita para que la respuesta cueste una fila y no una versión nueva.

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
está armado, porque nace después de que la pantalla se tradujo (`js/apiClient.js:169`). Es la misma
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
la llame, contra la base enlazada o contra la local con `--local`. Hoy da sus cinco comprobaciones
en verde, más las dos que están puestas para que la prueba pueda fallar. Se corre a mano y no
entra en los treinta y siete chequeos del `commit`, porque necesita hablar con la base.
**Aparecieron dos agujeros, que quedaron como pendientes 66 y 67 —los dos cerrados desde
entonces—, y siete cosas que están bien.** Se anotan las siete para que nadie las vuelva a
investigar:

- **Las 36 tablas tienen la RLS encendida.** Ninguna quedó afuera, y se comparó tabla por tabla
  contra la lista de las que la encienden, no por muestreo.
- **Ninguna política le abre a quien no inició sesión una tabla con datos de una Prestadora.** De
  las 64 que hay, 63 son `to authenticated` a secas. La que falta nombra además a `anon`, y es la
  de `patrones_de_contacto`: deja leer las reglas del producto sobre qué cuenta como un dato de
  contacto, que valen igual para todas y no son de ninguna. O sea que un visitante sin cuenta no
  llega a ninguna tabla de una Prestadora, y todo lo público del producto pasa por otra puerta.
- **Esa otra puerta son seis funciones, y son exactamente las seis previstas**: `directorio_de`,
  `perfil_del_directorio`, `prestadora_por_slug`, `guias_de`, `vocabularios_de` y `zonas_de`. De
  las 28 funciones que se saltean la RLS, las otras 22 están fuera del alcance anónimo, y las seis
  que quedan exigen el nombre corto de una Prestadora antes de contestar nada. Sin sesión se
  alcanzan dos funciones más, que no se saltean la RLS y no abren nada:
  `el_legajo_no_completa_el_alta_sin_sus_papeles` y `el_mensaje_no_lleva_datos_de_contacto`
  devuelven `trigger`, y Postgres se niega a llamarlas de otro modo que como disparador.
- **`opciones_pregunta` tiene la RLS encendida y ni una política**, que es la forma correcta de
  sellar una tabla: no la lee nadie con sesión, y la respuesta correcta sale únicamente por la
  vista `opciones_para_responder`, que no la trae. La vista lleva escrito al lado que esa columna
  no se agrega nunca.
- **La vista del directorio no la puede consultar nadie de forma directa.** Ni `anon` ni
  `authenticated` tienen consulta sobre `directorio`: el esquema se la revoca a los
  dos, y en vivo sigue revocada. Importa porque la vista no es `security_invoker`, así que corre con
  los permisos de quien la creó y se saltearía el aislamiento entre Prestadoras; lo que la contiene
  es que sólo la leen las tres funciones, y las tres piden el nombre corto de una Prestadora.
- **La vista `caregivers_publicos` ya no existe.** No queda en el esquema. Quedan
  dos comentarios de tabla que todavía la nombran —en `autorizaciones_asistente` y en
  `referencias_asistente`—, que es documentación vieja adentro de la base y no un permiso abierto.
- **El camino de las verificaciones está protegido de punta a punta.** Lo que el directorio publica
  como comprobado sale de `verificaciones_asistente` y de `intentos_evaluacion`, y de las dos el
  Asistente tiene sola lectura. Ninguna de las dos se puede falsificar desde una sesión. El agujero
  del pendiente 66 no está en la evidencia sino en el veredicto que la resume.

**Y el del 66 se ejecutó esa misma noche, contra la base local y con una cuenta inventada.**
Hasta ahí salía de leer el texto de las políticas; con la base entera aplicada se hizo el
intento entero, y salió peor de lo que decía el papel: el legajo se puede **crear ya sellado**
—el `POST` con `verification_status` adentro contesta `201` y el valor queda—, o sea que ni
hace falta modificarlo después; el sello se baja y se vuelve a subir cuantas veces se quiera; y
la persona **apareció en el directorio público**, pedido sin ninguna sesión. Lo ficticio se borró
al terminar. **La prueba puede fallar:** la misma cuenta, en la misma corrida, intentó mudar su
legajo a la Prestadora ajena y recibió `403`. Y quedó a la vista un cruce con el que entonces era
el pendiente 70: la tarjeta del intruso salió con la lista `comprobaciones` vacía, que era lo mismo
que mostraba la de cualquiera, porque ninguna pantalla cargaba esas comprobaciones. **La única
señal que habría distinguido un legajo revisado de uno auto-sellado no distinguía nada** — hasta
que el panel estrenó la pantalla que las marca, el 1 de septiembre de 2026.

**Los dos depósitos de archivos también se midieron, y esa prueba sí se pudo hacer entera.**
Se pidieron las dos direcciones públicas contra el servidor real: `avatares` contesta «objeto no
encontrado», o sea que el depósito está ahí y es público; `documentos-cuidadores` contesta
«depósito no encontrado», o sea que por la puerta pública no existe. **Cada uno es el control del
otro**: si el privado se hubiera quedado público —que es lo que pasa cuando alguien lo crea a mano
desde el tablero—, habría contestado igual que el primero. En el esquema de depósitos, en vivo,
están las tres políticas que el esquema declara
(`supabase/migrations/0001_base_del_esquema.sql:6032-6036`), y ninguna más. La que le deja al
personal de la Prestadora mirar los papeles de su gente compara la Organización con un `join`
contra el legajo, así que el aislamiento no depende del camino del archivo.

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
`js/catalogo.js:463`, que busca una tarea en tres vocabularios seguidos.

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
`directorio.html:84` — o sea, se corrió todo lo de abajo un renglón. El chequeo se puso rojo y
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
(`js/identidad.js:164`, que llama `js/apiClient.js:158`). Mostrar el producto mientras la
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

**De paso apareció un error de etiqueta:** `panel-prestadora.html:26` decía «Organización» y
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
de tocar nada y salteando `<title>` en el paseo de textos (`js/identidad.js:120` y
`js/identidad.js:129`). Con eso, en el navegador: título, pie, descripción para los buscadores y
texto de la imagen pasan de «Careonys» a la Prestadora y vuelven.

**Probado de punta a punta contra la base publicada**, con las dos Prestadoras de ejemplo:
`directorio.html?t=presdemo` y `?t=cuidarnorte` resuelven cada una su nombre, su logotipo y su
color, y las dos pantallas se ven distintas entre sí y distintas del producto. Sin `?t=`, y en las
tres pantallas que no cargan el cliente de datos, se ve el producto, que es lo correcto.

En el camino se aclararon dos cosas que parecían defectos y no lo son. La base contesta `42501
permission denied` a quien le pida filas de `tenants` sin sesión, **y eso está bien**: la lista
de Prestadoras no la ve nadie, porque es la lista de clientes de CeltaTech.
La pantalla no la pide: llama a `prestadora_por_slug`, que exige el nombre corto y devuelve una
sola Prestadora con sus colores y su logotipo (`js/apiClient.js:97`). Y la portada no cambia de
marca porque no carga el cliente de datos —tampoco `cursos.html` ni `soporte-remoto.html`—, así que
en esas tres el marcador se queda en el nombre del producto y no hay nada que resolver.

**Y apareció algo que no se estaba buscando: la base publicada no era la que armaban las
migraciones.** PresDemo se llamaba ahí «PresDemo — Servicios de Cuidado» y tenía cargado su
logotipo; la migración que la creaba la cargaba con el nombre «PresDemo» y sin logotipo, y ninguna
escribía ninguna de las dos cosas. O sea que se pusieron a mano contra la base. Reconstruirla desde
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
   la base. Es el desvío, y ahora esa fila la escribe la siembra ficticia
   (`supabase/migrations/0002_siembra_ficticia.sql:58`), **sin condición**. La versión anterior
   escribía el logotipo sólo `where logo_url is null`, y contra
   la base publicada eso no hizo nada, porque el valor ya estaba puesto: una migración que no corre
   justo donde hace falta no arregla nada. Entre los dos textos ganó el de la base publicada, que
   es el que ya se había demostrado funcionando, con una corrección: su descripción decía
   «plataforma», que el glosario de la empresa no admite para nombrar una unidad vendible.
2. **Los identificadores y las fechas.** Cada base genera los suyos. No es un desvío y no hay nada
   que escribir.
3. **Once filas que están publicadas y ninguna migración carga.** Cinco son perfiles, y están
   bien: cuelgan de una cuenta de acceso, las crea el disparador `crear_perfil_al_registrarse` al
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
que hoy se llama `directorio`. No eran un desvío —estaban igual en las
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
registrarse alguien el disparador que crea el perfil. Contra eso se escribió acá que `profiles`
no tenía ninguna clave foránea hacia `auth.users`, así que una fila ahí no probaba que hubiera una
cuenta detrás. **Eso es falso.** El 26 de agosto de 2026, probando otra cosa contra la base local,
un `insert` en `profiles` con un identificador inventado lo rechazó `profiles_id_fkey`, que existe
desde la primera migración, apunta a `auth.users(id)` y borra en cascada
(`supabase/migrations/0001_base_del_esquema.sql:4398`). O sea que cada uno de los cinco perfiles
tuvo su cuenta de acceso: sin ella la fila no podía existir.

Lo que sigue en pie es lo otro: tres de los cinco tienen identificador escrito a mano —unos, dos y
tres repetidos—, que ninguna alta genera, y los otros dos se cargaron al mismo microsegundo. Con
la clave foránea a la vista eso significa que **también las cuentas de acceso se escribieron a
mano**, porque una fila de `profiles` con ese identificador exige una de `auth.users` con el
mismo. Lo que no resuelve es si las otras dos nacieron de un registro de verdad; y da igual, porque
el Desarrollador ya había dicho lo que decide: son datos inventados y se van.

**Con una salvedad que hoy hace falta decir, porque si no este párrafo choca con lo que se lee más
abajo.** La siembra ficticia escribe los seis perfiles con las claves foráneas apagadas
(`supabase/migrations/0002_siembra_ficticia.sql:43`), que es lo que hace cualquier volcado de datos
para no depender del orden en que se cargan las tablas, y la de `profiles` no dispara. Así que una
fila de `profiles` prueba que hubo una cuenta de acceso cuando la escribió una sesión, y no prueba
nada cuando la escribió la siembra: hoy hay seis perfiles sembrados y `auth.users` está vacía, que
es el agujero que se cuenta entero más abajo.

Las once se borraron, y cómo se borraron importa más que el hecho. **Quedaron nombradas una por
una** antes de tocarlas, para que hubiera rastro de qué había cuando ya no se pudiera mirar. Doce
tablas apuntan a un legajo, así que primero se fue lo que colgaba y recién después el legajo. Y el
borrado fue por identificador y no por una condición del tipo «lo que no cargó ninguna siembra»:
una condición así se lleva puesto también lo que cargue alguien mañana usando el producto. Contra
una base recién construida no hay nada que borrar, porque ninguno de esos once identificadores
existe ahí — que es exactamente de lo que se trata.

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
a un cliente. Lo escribe la siembra ficticia (`supabase/migrations/0002_siembra_ficticia.sql`), y
así quedan las dos:

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
   la regla de credenciales de la empresa. Los avisos quedan sin cuenta, y las políticas de
   `avisos` ya tenían previsto ese caso: son los que ve el personal de la Prestadora.
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

Al ampliar la siembra apareció que `scripts/verificar_claves.mjs` —el que comprueba que ninguna
migración escriba un valor que no esté en el catálogo de vocabularios— estaba mirando una sola
de las dos formas de cargar filas. Reconocía `insert into tabla (columnas) values (…)`, y no
reconocía la otra, `insert … select … from una lista de valores`, donde las columnas no se
declaran junto a la tabla sino después de la lista. **Veintisiete filas de franjas, treinta y
cinco de avisos y todo el contenido de los cuatro legajos pasaban sin que nadie les mirara los
valores.**

Un chequeo que no mira no es un chequeo que pasa: es un chequeo que no existe. Ahora reconoce las
dos formas (`scripts/verificar_claves.mjs:228`) y conoce cinco columnas más —modalidad y nivel de
un curso, día y turno de una franja, puesto de una experiencia—.

**Se probó que puede fallar**, que es la única forma de saber que sirve. Con dos valores
cambiados a mano adentro de la siembra —un turno que no existe y una profesión que no está en el
catálogo—, el chequeo denunció los dos, con su renglón, y cortó. Restaurados, vuelve a decir que
las migraciones del repositorio están limpias. Además quedaron cuatro casos nuevos en su
autoprueba, dos que tienen que romper y dos que tienen que pasar; uno de esos dos últimos es una
lista de valores **sin** nombres de columna, que el chequeo tiene que dejar pasar en vez de
adivinar a qué columna corresponde cada uno.

### Cualquiera con sesión podía vaciar las tablas de las dos Prestadoras

Era el pendiente 67, y resultó peor de lo que ese renglón decía. La base tenía escrito con
cuidado el segundo paso de los dos que hace Postgres —treinta y cuatro políticas, todas pidiendo
sesión— y el primero tal como venía de fábrica. Supabase deja puesto un permiso por omisión que
le concede *todo* a `anon` y a `authenticated` sobre cada tabla, secuencia y función nueva de
`public`, así que cada tabla nacía abierta sin que ninguna migración lo pidiera.

**Lo que eso abría no era teórico, y se midió.** Con una cuenta ficticia de coordinador de
PresDemo, contra la base local, con el esquema entero aplicado: esa cuenta **veía 6 avisos** —los
de su Prestadora, que es lo que la política le deja ver— y con un solo `truncate` **dejó la tabla
en 0**, borrando también los 6 de Cuidar Norte. La RLS no lo detuvo porque no puede: filtra filas,
y vaciar la tabla no es filtrar filas. `TRUNCATE` no mira ninguna política. El pendiente decía que
el permiso «está de más igual» aunque no hubiera daño; había daño, y alcanzaba a la Organización
ajena.

Hoy está al mínimo, y el arreglo **no concedió nada nuevo: sólo sacó.** Cada tabla tiene
exactamente los verbos que sus propias políticas ya permiten —alta, baja, modificación y consulta
donde la política dice `for all`; sólo consulta donde dice `for select`—, y `TRUNCATE`,
`REFERENCES` y `TRIGGER` no los tiene ningún rol, porque ninguna pantalla los usa y PostgREST no
sabe pedirlos. A `anon` le quedan tres consultas y nada más, sobre lo único que se publica sin
sesión. Y el permiso por omisión, que era el que reponía todo esto solo con cada tabla nueva, se
revoca antes de que exista una sola tabla (`supabase/migrations/0001_base_del_esquema.sql:63-64`),
con el motivo escrito al lado: `pg_dump` escribe lo que hay y no lo que falta, así que una base
reconstruida desde el volcado, sin ese renglón, volvería a nacer abierta.

**Consecuencia que hay que saber, porque cambia cómo se escribe una migración de acá en más:**
toda migración que cree una tabla, una vista o una función tiene que conceder sus permisos
explícitamente. Si no, la pantalla va a recibir `42501 permission denied` con una sesión válida, y
eso no se arregla tocando políticas.

**Y ese barrido se llevó de más un permiso que hacía falta, cosa que conviene saber porque vuelve
a pasar sola.** El renglón `revoke all on table public.profiles from anon, authenticated` se llevó
puesto también un permiso **por columna** escrito a propósito, `update (full_name)`: en Postgres,
`REVOKE ALL ON TABLE` no distingue el permiso sobre la tabla entera del permiso sobre una columna,
borra los dos. El permiso volvió, y es el que la base tiene hoy: `profiles` le da a
`authenticated` la consulta de la tabla y la escritura de una sola columna
(`supabase/migrations/0001_base_del_esquema.sql:5937-5939`). Ninguna pantalla lo usa —`js/auth.js:244`
sólo lee `profiles`, no le escribe—, así que mientras faltó no hubo síntoma visible; lo que se
había roto no era una función, era una defensa.

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
barrido es la prueba de que se pisa sin querer. Y el mensaje de Postgres sugiere literalmente el
arreglo equivocado: `HINT: Grant the required privileges to the current role with: GRANT UPDATE ON
public.profiles TO authenticated`, que es justo la línea que abre el agujero.

**Cómo se comprobó, en tres capas, porque el volcado del esquema solo no alcanza.** Una:
`scripts/probar_permisos_en_vivo.mjs` da las cinco en verde contra las dos bases, sin que se
tocara la prueba, y sus dos comprobaciones de sostén siguen en pie —el volcado trae tablas y
políticas, y las seis puertas públicas siguen al alcance anónimo—. Dos: con una cuenta
ficticia y sesión simulada contra la base local se leyeron las tablas, se llamaron las funciones
del directorio, y se dio de alta, se modificó y se dio de baja un aviso, todo `1` fila; el
`truncate` que antes vaciaba la tabla ahora contesta `permission denied`; y el disparador de las
ponderaciones **sigue rechazando** aunque su función ya no se pueda llamar desde ninguna sesión,
porque el permiso de llamada se verifica al crear el disparador y no cada vez que se dispara.
Tres: `scripts/probar_aislamiento.mjs --local` pasó entero con los permisos recortados —registro
real, sesiones reales, archivos, examen, avisos y reportes—, que es la única capa que prueba que
no se rompió nada de lo que la aplicación hace de verdad; se volvió a correr después de reponer el
permiso, sobre la base local reconstruida desde cero con todas las migraciones en orden. Y cuatro,
que apareció después: la prueba por columna sobre `profiles`, la que encontró lo que el barrido
había sacado de
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

**Hoy no se veía en ninguna pantalla** —`js/apiClient.js:1360` la traduce a `fechaRegistro` y ese
nombre no aparece en ningún otro archivo del proyecto—, así que no había consecuencia visible. Se
arregló igual, porque la antigüedad es exactamente la clase de dato que después se usa para ordenar
un directorio o para decidir a quién se muestra primero, y ese día el agujero pasa a ser una
ventaja que alguien se dio a sí mismo.

**Lo arregla un disparador `before insert or update`**, `la_fecha_de_alta_del_legajo`
(`supabase/migrations/0001_base_del_esquema.sql:3966`): al dar de alta la fecha es la de ese
momento y se ignora lo que venga de afuera; al modificar, queda como estaba. Vale para todo el
mundo, incluido el servidor.

**Por qué un disparador y no un permiso por columna**, que era la otra herramienta disponible. Acá
las dos servían —a diferencia del veredicto de la Prestadora del pendiente 66, donde el permiso por
columna no sirve porque el personal y el Asistente son el mismo rol de base—. Se eligió el
disparador por dos razones. Una: el límite queda escrito en la tabla, donde lo lee quien lee el
esquema, y no en un `grant` a treinta renglones de distancia. Dos: un permiso por columna se pierde
sin que nadie se entere, y eso no es una hipótesis — es lo que pasó dos secciones más arriba, cuando
un `revoke all on table` se llevó puesto el `update (full_name)` de `profiles` y hubo que reponerlo.

**Cómo se comprobó, y por qué la prueba podía fallar.** Es el mismo guion corrido dos veces, antes
y después de la migración: la primera vez guardó 2015 y después 2010; la segunda ignoró las dos y
puso la hora real. Y trae su comprobación de sostén —que la persona sí pueda corregirse el
teléfono—, sin la cual cerrar la tabla entera habría dado el mismo verde sin arreglar nada.

**La siembra ficticia sí nombra esa fecha**, y no es una excepción sino una consecuencia de que
sea un volcado: `pg_dump` escribe todas las columnas de cada fila, `created_at` incluida. El
disparador se la ignora igual, así que las fechas de alta que quedan cargadas son las del momento
en que se sembró y no las que dice el archivo — que hoy coinciden sólo porque el volcado se tomó
después de sembrar. Si algún día hace falta traer legajos de otro sistema conservando sus fechas,
esa migración apaga el disparador mientras carga y lo vuelve a encender, y así queda dicho que la
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
- **con una cuenta recién creada contesta 403**, porque la política «Avisos de la Prestadora»
  exige `tenant_id = prestadora_actual()` (`supabase/migrations/0001_base_del_esquema.sql:4557`)
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
`consultation_reason`, que existe justamente para distinguir a quien busca cuidado
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
guardarlo. Y `formulario-integral.html` no se borró ese día: adentro tenía lo único que publicaba
un aviso de verdad —el paso a paso—, y ese paso a paso chocaba con exactamente la misma pared. Las
dos cosas quedaron en el pendiente 64. **El 9 de septiembre de 2026 la pantalla salió de uso**, y
lo que sigue explica por qué; el consentimiento de novedades sigue sin tabla.

### La hoja de muestra salió de uso, porque ya había cumplido su función

El 9 de septiembre de 2026 `formulario-integral.html` se apartó a la cuarentena: hoy vive en
`fuera de uso/formulario-integral.html`, la carpeta que `.gitignore:34` declara fuera del
repositorio y que `scripts/recorrido.mjs:91` deja afuera de todos los chequeos.

**No se saca una pantalla porque moleste, y ésta no era una pantalla.** Nació el 5 de agosto de
2026 como **hoja de muestra**: su título decía «Formularios Oficiales de la App» y venía con un
documento propio que la explicaba en esos términos —se hizo para replicar de manera idéntica la
maquetación, la hoja de estilos, los componentes y las imágenes de los formularios de la
aplicación real, con una sección de previsualización en vivo apuntando a un servidor local—. Eso
es un banco de pruebas visual, no una parte del portal.

**Que la función ya estaba cumplida se comprueba con cuatro hechos, no con una impresión.** El
documento que la explicaba se borró el 19 de agosto de 2026 (commit `3f00b2c`). La pantalla cuyo
formulario replicaba en segundo lugar ya no existe con ese nombre: `postulacion-asistente.html`
pasó a `registrar-asistente.html` el 25 de agosto (commit `f0fcf4b`). La previsualización suelta
la reemplazó el recorrido de punta a punta del 2 de septiembre (commit `5f104ac`). Y los tres
formularios que replicaba están vivos cada uno en su pantalla propia, con dos de las tres copias
muertas porque ningún guion las escuchaba.

**Y lo único propio que le quedaba —el asistente de seis pasos— publicaba un Aviso defectuoso.**
No preguntaba zona, y el comentario de la columna `avisos.zone`
(`supabase/migrations/0001_base_del_esquema.sql:2222`) dice que ahí nunca va texto libre porque el
directorio filtra por esa columna; no preguntaba patologías, que las mandaba como
lista vacía escrita a mano; mandaba `horarios` fijo en `'flexible'`; y preguntaba modalidad
(`w-modality`) y urgencia (`w-urgent`) sin mandarlas a ninguna parte. Un aviso publicado así no
aparecía en ningún filtro del directorio.

**Las hojas de estilo se copiaron, no se movieron.** `css/tokens.css`, `css/styles.css` y
`css/utilidades.css` no eran suyas, así que se dejó una copia en `fuera de uso/css/` para que la
hoja se siga abriendo sola desde la cuarentena, y las originales quedaron donde estaban.

**Lo que la reemplaza.** Los 21 enlaces «Publicar un Aviso» de ocho pantallas del portal y de la
maqueta —y el reenvío de `mockup-app.html:778`— apuntan ahora a `registrar-familia.html`, que a
quien ya tiene sesión lo manda derecho adonde le toca (`registrar-familia.html:206-212`); a una
Familia, a `pwa-familia/index.html`, donde `#form-nuevo-aviso`
(`pwa-familia/index.html:739`) sí publica de verdad: pregunta nombre del Paciente, edad, zona,
modalidad, franjas, patologías y descripción.

**Lo que no se resolvió y queda para el Desarrollador.** De lo que el asistente preguntaba,
`pwa-familia` no pregunta cinco cosas: tareas, Tipo de Asistente, género preferido, urgencia y
frecuencia. Cuatro tienen columna esperándolas en `avisos` —`tasks_required`,
`profession_required`, `preferred_gender` y `frequency`—; **urgencia y modalidad no tienen columna
en ninguna tabla**, igual que el consentimiento de novedades. Sigue abierto además el punto uno
del pendiente 64 —ese consentimiento— y el punto dos, si `avisos` se abre a quien no inició
sesión.

### Cuatro pantallas se convirtieron a la vez, y hacerlo a la vez mostró tres defectos del mecanismo

El 26 de agosto de 2026, con los carteles falsos ya cerrados, se convirtieron al i18n
`index.html`, `cursos.html`, `soporte-remoto.html` y `solicitar-asistente.html`: **205 frases
nuevas**, que dejan el catálogo en 460 y el chequeo en «10 de 46 archivos ya convertidos». La
quinta, `formulario-integral.html`, se dejó como estaba: eran 119 frases de una hoja de muestra
que el pendiente 64 ya daba por saliente, y traducirlas a tres idiomas era trabajo tirado. Lo que
falta bajó ese día de 665 frases distintas a 479.

**Esa apuesta se cobró el 9 de septiembre de 2026**, cuando la hoja salió del portal a la
cuarentena y sus 119 frases se fueron con ella: nunca hubo que traducirlas. Corrido ese mismo día,
`scripts/inventario_textos.mjs` no encuentra ya **ninguna** frase por convertir —«0 apariciones en
0 archivos»—, así que no queda ninguna pantalla sin convertir. La cuenta de este guion mide el
texto que todavía está escrito adentro de una pantalla; que dé cero no quiere decir que el
catálogo esté completo en los tres idiomas, que es lo que mide `scripts/verificar_frases.mjs` y se
comprueba aparte.

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
de `index.html`. Se agregó la llamada (`js/catalogo.js:594`) y se comprobó en el navegador, que
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
(`js/catalogo.js:430`) elige el idioma de cualquier texto que traiga sus tres idiomas colgando—;
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
título escrito a mano cuando el campo viene vacío. El título resultó ser de `formulario-integral.html`
—la hoja de muestra que el 9 de septiembre de 2026 salió de uso—; el hilo llevó a otra cosa.

**Dos navegadores de pasos escuchaban el mismo botón.** `registrar-asistente.html` tiene el suyo,
escrito adentro de la pantalla, que **valida el paso antes de dejar pasar al siguiente**
(`registrar-asistente.html:920`). Y `js/main.js` traía otro, el del asistente por pasos de
`formulario-integral.html`, que se enganchaba a `.btn-next-step` en cualquier pantalla que
cargara el archivo —y `registrar-asistente.html` lo carga— **sin validar nada**. Los dos corrían
en cada clic, en ese orden, así que el segundo deshacía lo que el primero acababa de decidir.

**El resultado se comprobó en el navegador, no se dedujo.** Con los catorce campos obligatorios
del paso 1 vacíos, la pantalla decía «Faltan completar campos o archivos obligatorios» **y pasaba
al paso 2 lo mismo**. Los siete pasos quedaban así: la validación existía, se ejecutaba, avisaba,
y no servía para nada. Lo único que la salvaba era el envío final, que revalida los siete
(`registrar-asistente.html:1131`), así que a la base nunca llegó un alta incompleta —pero quien
se anotaba se enteraba de lo que le faltaba recién al final, después de siete pasos.

**El arreglo de ese día fue pedir por la pantalla propia antes de enganchar nada.** Ese bloque de
`js/main.js` leía `w-title`, `summary-title` y `summary-desc`, que existían sólo en
`formulario-integral.html`, así que pasó a engancharse únicamente si ese formulario estaba.
Comprobado en el navegador de las dos maneras, que es lo que hace que la prueba pueda fallar: con
el paso 1 vacío avisa y **no** avanza; con el paso 1 completo avanza y no avisa. Y
`formulario-integral.html` seguía funcionando igual, resumen del paso 6 incluido.

**El 9 de septiembre de 2026 el bloque se fue del todo**, porque la hoja de muestra que lo
despertaba salió de uso y `wizard-care-search-form` no existe en ninguna otra pantalla: en su
lugar `js/main.js:157` deja escrito qué había ahí y adónde se mudó el que publica un aviso de
verdad. La precaución del 26 de agosto no se borró por sobrar: se cumplió, y dejó el bloque
apagado desde el día en que la pantalla se apartó.

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

**La regla que rompía ya estaba escrita**, en `js/catalogo.js:34`: «El idioma es uno solo para las
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

El 29 de agosto de 2026. Nace de una pregunta del Desarrollador —qué necesita
saber un Asistente antes de entrar a una casa— y de tres decisiones suyas: el alcance es
**descripción, señales de alarma y cómo actuar ante una emergencia**; la escriben **dos**, el
producto lo general y cada Prestadora lo suyo; y la palabra aprobada es **«Guía de cuidado»**.

**Los tratamientos quedan afuera a propósito.** Decir qué tratamiento corresponde convierte al
producto en fuente de indicación clínica, y entonces alguien tiene que responder cuando un
Asistente lo siga y salga mal. Avisar no es prescribir, y la pantalla lo dice arriba de todo en vez
de dejarlo supuesto: *«Estas guías dicen qué observar y cuándo avisar. No indican tratamientos.»*

- **La tabla es `guias_cuidado`** (`supabase/migrations/0001_base_del_esquema.sql:1285`), y cada
  guía cuelga de una opción del catálogo —hoy de una patología—, no de un texto suelto. Cuatro
  columnas de contenido: `descripcion`, `que_esperar`, `senales_de_alarma` y `en_emergencia`. Las
  dos primeras son texto, las dos últimas son listas, porque una señal se mira de a una y un paso
  de emergencia se sigue en orden.
- **Los dos escalones son el mismo patrón que ya usa el catálogo**: `tenant_id` en
  nulo es lo que trae el producto, `tenant_id` cargado es lo que agregó esa Prestadora. **Y acá lo
  propio reemplaza a lo general**, no se suma —al revés que las opciones del catálogo, que se
  suman—. El reemplazo lo resuelve la base con un `distinct on` que ordena por «tiene dueño
  primero», y no la pantalla: si lo decidiera la pantalla habría que decidirlo igual en la
  aplicación de la Familia y en el sitio, y tres decisiones iguales escritas en tres lados son tres
  oportunidades de que una quede vieja.
- **Los tres idiomas para lo que escribe el producto, el suyo para lo que escribe la clienta**
  (`:130`). Es la misma decisión que con las zonas y con las opciones del catálogo: la regla
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
  con su motivo en `scripts/verificar_esquema.mjs:465`, que es donde viven las funciones que llegan
  al alcance anónimo a propósito.
- **La pantalla nueva es `screen-guias`** en la aplicación del Asistente
  (`pwa-asistente/index.html:800`), con los cuatro estados y un buscador. **Es una biblioteca de
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
- **Las diecinueve guías generales están escritas y ninguna está publicada.** La siembra ficticia
  las trae, una por cada patología del catálogo, con sus cuatro partes en los tres idiomas y
  **como borrador** (`supabase/migrations/0002_siembra_ficticia.sql:527`), y la base lo confirma:
  diecinueve guías generales sin publicar, y dos de Prestadora publicadas. La base no deja
  publicar una guía sin que quede escrito quién la revisó y cuándo, y esa firma no la puede poner
  una migración: es una persona haciéndose responsable de lo que ahí dice, no un dato. Así que la
  puerta —que sólo devuelve publicadas— todavía no entrega ninguna, y la pantalla del Asistente
  muestra el estado «todavía no hay guías». **Eso es lo correcto y no es el final**: falta la
  revisión profesional (pendiente 104).
- **La Prestadora escribe la suya desde `guias-prestadora.html`**, que es una pantalla del panel y
  pide rol `coordinador`. Elige la lista y la opción del catálogo, escribe las cuatro partes,
  guarda como borrador, corrige, publica firmando quién la revisó y cuándo, y borra. La pantalla
  valida en castellano antes que la base —`guias-prestadora.html:467`—, así que quien intenta
  publicar sin firma lee «Para publicar una guía hay que dejar escrito quién la revisó y cuándo» y
  no el texto crudo de una restricción. Borrar avisa antes qué consecuencia tiene y se puede
  cancelar (`guias-prestadora.html:540`).
- **Se comprobó desde la pantalla, con las dos Prestadoras ficticias.** El 30 de agosto de 2026,
  con una coordinadora en cada una —las preparaba entonces un guion local, y hoy nacen con la
  base— y contra la base de esta máquina: cada una escribió la suya, la corrigió, la publicó y la
  vio en la lista; ninguna vio la de la otra; y a la ajena, pidiéndola por su identificador desde
  la sesión de la otra, no la pudo leer, ni cambiar, ni borrar. Contra la general, la coordinadora
  no pudo crear una, ni cambiar la que hay, ni borrarla; y sin sesión la pantalla manda a
  `acceso.html`. **La revisión se guarda como fecha y no como instante** —`revisada_el` es `date`
  (`supabase/migrations/0001_base_del_esquema.sql:2600`)—: guardada como instante, un día
  declarado acá se mostraba como el anterior.
- **Y el aislamiento de la puerta se compara en cualquier base**, incluida la publicada, porque la
  guía propia de cada una de las dos Prestadoras ficticias viene sembrada. Antes de eso, la prueba
  de la pantalla vivía sólo en datos cargados a mano y se perdía con la base.
- **La guía general ya llega al teléfono sin señal, desde el 4 de septiembre de 2026.**
  `scripts/generar_guias.mjs` arma `data/catalogo-guias.json` con el mismo mecanismo que el
  catálogo de vocabularios: llama a `guias_de(null)` y guarda lo que devuelve. El archivo se
  copia byte a byte a los dos programas para teléfono, y `scripts/verificar_guias_offline.mjs`
  comprueba que las copias coincidan entre sí y con la base. `Catalogo.cargarGuias()`
  (`js/catalogo.js`) intenta primero la base —general más la propia, si hay conexión— y si falla
  cae al archivo, que sólo trae la general; `pwa-asistente/index.html` la usa en `guiCargar()`.
  Que el archivo tenga hoy cero guías es un estado válido, no una falla: las 19 generales están
  cargadas como borrador sin publicar, a la espera del pendiente 104, y se suman solas al
  publicarse.
- **Lo demás que falta**: la guía **propia** de cada Prestadora no llega al teléfono sin señal
  (pendiente 102, la mitad que sigue abierta), que es justo cuando más se necesita.

### La Prestadora ya puede marcar cada verificación del legajo

**Fue el pendiente 70, y era un agujero entero.** El directorio prometía decir qué se le comprobó a
cada persona y no había dónde marcarlo: la tabla `verificaciones_asistente`
(`supabase/migrations/0001_base_del_esquema.sql:573`) está con sus columnas de rastro
—`verificado_por` y `verificado_el`— y la vista que las publica es `directorio` (`:742`), pero
lo único que la escribía eran las dos siembras de las Organizaciones ficticias. En una Prestadora
de verdad, por prolija que fuera revisando papeles, la tarjeta del directorio decía siempre que no
se le comprobó nada. **Construida el 1 de septiembre de 2026.**

**Está donde va, y el orden importa.** En el legajo que abre `panel-prestadora.html`, arriba del
cuadro donde se otorga o se rechaza el aval: primero se marca papel por papel y recién después se
resuelve el legajo entero. Se dibuja sola al abrir el legajo y sin hacerse esperar
(`panel-prestadora.html:552`), porque es otro pedido y tiene su propio cartel de estado
(`panel-prestadora.html:578`). Cada papel del catálogo trae su desplegable con los cinco estados,
y el bloque entero lo arma `dibujarVerificaciones()` (`panel-prestadora.html:602`) desde el catálogo
de frases y desde los dos vocabularios de la base, así que existe igual en `en` y en `pt-BR`.
Ninguna opción está escrita en la pantalla: los renglones se arman con `createElement`, que es lo
que `scripts/verificar_opciones.mjs` pide para un desplegable que sale de la base.

**Los cinco estados tienen nombre, y el nombre sale de la base.** El vocabulario cerrado
`estado_verificacion` tiene cargadas sus cinco claves —«Sin presentar», «Presentado, sin
comprobar», «Comprobado», «Rechazado» y «Vencido»—, en los tres idiomas
(`supabase/migrations/0002_siembra_ficticia.sql:358`). «Comprobado» dice exactamente lo mismo que
ya decía la tarjeta del directorio a la Familia, y es a propósito: dos palabras distintas para el
mismo hecho es como se empieza a tener dos catálogos.

**Quién marcó y cuándo lo escribe la base, no el pedido.** Un disparador,
`la_verificacion_dice_quien_la_marco` (`supabase/migrations/0001_base_del_esquema.sql:4001`), llena
`verificado_por` con `auth.uid()` y `verificado_el` con la hora del servidor. La pantalla podría
mandarlos en el pedido, y entonces cualquiera con la clave pública podría firmar con el nombre de
un compañero una comprobación que no hizo. También vuelve las dos columnas a vacío cuando el estado
regresa a «sin presentar» —la columna no puede seguir diciendo que alguien lo comprobó el martes si
ya no está comprobado— y no refresca la fecha cuando el estado no cambió.

**Y el cliente de datos aprendió a hacer un alta-o-modificación en un solo pedido.**
`_supabaseUpsert()` (`js/apiClient.js:1324`) se apoya en la restricción de unicidad de
`(legajo, tipo)` del esquema (`supabase/migrations/0001_base_del_esquema.sql:3554`), así que
marcar el mismo papel dos veces corrige el renglón que ya está en vez de agregar otro. No existía
en ninguna de las tres copias del archivo,
y `marcarVerificacion()` (`js/apiClient.js:600`) es la primera que la usa.

**Probado con las dos Organizaciones ficticias, y la prueba puede fallar.** Ocho comprobaciones
nuevas en `scripts/probar_aislamiento.mjs:924`, que llevaron la corrida de 119 a 127. Se hacen
sobre un legajo recién creado que arranca **sin ninguna comprobación cargada**, que es la condición
que pedía el pendiente: sobre uno ya sembrado, la pantalla rota y la sana contestan lo mismo. Quedó
comprobado que el personal de la Prestadora puede marcar; que la huella la escribe la base aunque
el pedido traiga una inventada; que lo marcado sale en su tarjeta del directorio; que ese mismo
personal recibe `403` sobre un legajo de la otra Prestadora y que no queda escrito nada; que el
Asistente recibe `403` marcándose sus propios papeles; y que volver a «sin presentar» borra la
huella y saca la comprobación de la tarjeta.

**Lo que esta pantalla no hace, dicho de frente.** Marca el estado y nada más. **No pone plazos**:
`plazo_vence_el` tiene su índice
(`supabase/migrations/0001_base_del_esquema.sql:3859-3861`) y sigue sin que nadie
lo escriba, así que «Vencido» hay que ponerlo a mano y nada avisa antes — es el mismo agujero que
el pendiente 98, con su plan escrito en `docs/PLAN_VENCIMIENTOS.md` y sin aprobar.

### La puerta de publicación se cerró, y ahora lo marcado decide

**Marcar un papel dejó de ser un dato de adorno el 2 de septiembre de 2026.** Hasta ese día
`data/catalogo-verificaciones.json` declaraba papel por papel qué frenaba cada uno —el alta, la
publicación, o nada— y **no lo leía ninguna pantalla ni ningún guion**: un legajo llegaba al
directorio sin un solo papel comprobado. Peor todavía, la vista ya lo prometía: el comentario de su
propia columna, desde `supabase/migrations/0001_base_del_esquema.sql:828-830`, decía
que esos papeles «las pasaron todos los que aparecen acá». No era cierto.

**Aparecer en el directorio pide ahora tres cosas, y las tres hacen falta.** La Prestadora validó
el legajo, la persona dijo que sí a publicarse, y **los papeles de la puerta están comprobados**:
antecedentes penales y certificado de salud siempre, más matrícula y título si el tipo de Asistente
los exige. La condición está adentro de la vista `directorio`
(`supabase/migrations/0001_base_del_esquema.sql:748`), que es donde el directorio se arma.

**La regla no está en el SQL: está en la base, como corresponde a un catálogo.** Cada verificación
lleva, en la columna `extra` de su fila de `vocabulario_items`, tres claves
—`puerta`, `condicional_a` y `suma_al_perfil`—, y la vista las lee. Exigir un papel más el día de
mañana es agregarle `{"puerta": "publicacion"}` a una fila, no publicar una versión nueva. El
detalle de las tres claves está en `docs/CATALOGO.md`.

**Y falla cerrada por los tres lados, que es lo que la hace confiable.** Si la profesión del legajo
no está en el vocabulario `tipo_asistente`, se pide el papel. Si `condicional_a` trae un valor que
la vista no conoce, se pide el papel. Si la verificación no tiene fila, no se comprobó. Nunca al
revés: ninguna comparación con un valor vacío deja entrar a nadie.

**La siembra tuvo que aprender a pasar por su propia puerta.** Con la condición puesta, el
directorio de las tres Prestadoras ficticias pasaba de diez publicados a **cero**: ninguno de los
trece legajos tenía el certificado de salud y los antecedentes penales los tenía uno solo. No era
un defecto de la puerta, era que los clientes ficticios nunca habían modelado el requisito de
entrada. La siembra los modela hoy, y lo hace dejando **cada condición aislada en una persona
distinta**, para que una prueba que se rompa diga cuál se rompió: **Ramiro Cáceres** tiene todo
menos la matrícula y queda afuera por exactamente un papel; **Diego Ferreyra**, de la misma
profesión, la tiene y publica —los dos al lado son la prueba—; y **Ester Villalba** tiene los
cuatro papeles y sigue afuera por lo suyo de siempre, que no dijo que sí. La base lo confirma:
`directorio` devuelve nueve de trece legajos. **Lo que ya no queda de ese arreglo es la
comprobación que lo sostenía**: vivía adentro de la migración —si alguien aflojaba la condición de
la vista, la migración dejaba de correr— y no sobrevivió a la unificación, porque la siembra de
hoy es un volcado de datos y un volcado no lleva comprobaciones. Quien la sostiene ahora es
`scripts/probar_aislamiento.mjs`, que no corre en cada `commit`.

**Probado con las dos Organizaciones ficticias, y la prueba puede fallar.** Dos comprobaciones
nuevas en `scripts/probar_aislamiento.mjs:872`, que llevaron la corrida de 127 a 129. Van sobre un
legajo recién creado, y en este orden: valida la Prestadora y no aparece; dice que sí la persona y
**tampoco** aparece; se le comprueba **un** papel de los dos y sigue sin aparecer —que es lo que
distingue «la puerta mira la lista entera» de «la puerta se conforma con encontrar algo»—; y recién
con los dos aparece.

**Dos pruebas hermanas dejaron de medir lo que medían, y se arreglaron en el mismo movimiento.**
`scripts/probar_sello_de_la_prestadora.mjs` comprobaba que un legajo que se autoselló no sale en el
directorio, y desde la puerta esa comprobación pasaba **por el motivo equivocado**: no salía por
falta de papeles. Ahora se le exige además que el directorio traiga a alguien, así que contra un
directorio vacío —o contra una función que dejó de contestar— la comprobación se pone roja en vez
de darse por buena. Y su limpieza final, que preguntaba por el directorio para saber si el legajo
ficticio había quedado, pregunta por la tabla, que es lo que de verdad quería saber.

### La puerta del alta se cerró, y no espera el juicio de la Prestadora

**El documento de identidad frena el alta desde el 4 de septiembre de 2026.** Hasta ese día
`data/catalogo-verificaciones.json` ya lo declaraba —«sin saber quién es la persona, nada de lo
demás significa nada»—, pero cerrarla tal como estaba escrita se mordía la cola: el alta es
«terminar de cargar el legajo», que hace el Aspirante, mientras que la verificación `dni` la marca
la Prestadora, que recién mira el legajo después. Era el pendiente 143.

**El Desarrollador contestó que no hace falta el juicio de la Prestadora para cerrar esta puerta.**
Alcanza con que el software compruebe, solo, lo rutinario —que el papel llegó—, y dejarle a la
Prestadora lo que sí es suyo —confirmar que la persona es quien dice ser, y todo lo demás que sea
análisis subjetivo— para la validación, más adelante y junto con las otras seis verificaciones,
antes de la puerta `publicacion`. Hasta que ese juicio llega, el legajo es de un **Aspirante**; con
el ok de la Prestadora pasa a integrar el directorio de **Asistentes**. Ninguna de las dos cosas es
una columna nueva: `verification_status` ya nace en `en_revision`
(`supabase/migrations/0001_base_del_esquema.sql:477`), y ahí es exactamente donde queda un
Aspirante hasta que la Prestadora lo pasa a `validado_prestadora`.

**La cierra el disparador `el_legajo_no_completa_el_alta_sin_sus_papeles`
(`supabase/migrations/0001_base_del_esquema.sql:3924`), del mismo lado de la base que la puerta de
publicación.** Es un `before insert` en `caregivers`: lee `extra.puerta` de `vocabulario_items`
—hoy sólo `dni` la tiene en `alta`— y exige que `caregivers.documents` traiga
esa clave con un valor que no sea vacío ni `pendiente`. No mira si el Prestadora ya lo aprobó —eso
sigue siendo la validación— ni si venció —eso sigue siendo el pendiente 98, con su plan aparte—:
sólo si llegó. El día que se agregue otro papel con esta puerta es una fila del vocabulario, no una
migración nueva.

**Probado con las dos Organizaciones ficticias, y la prueba puede fallar.**
`scripts/probar_la_puerta_del_alta.mjs` comprueba que un alta sin `dni` se rechaza con el motivo
`alta_sin_papel:dni`, que un alta con `dni` puesto se completa aunque falte un papel de la puerta
`publicacion`, que el legajo que pasó la puerta se puede seguir editando, y que la misma regla rige
en las dos Prestadoras ficticias. El mensaje que ve la persona sale del catálogo de frases —
`error.alta_sin_papel`, en los tres idiomas— y lo clasifica `Texto.claveDeError`, igual que
`contacto_bloqueado`.

### El panel de la Prestadora dejó de mostrar lo que nadie contó, y de prometer pantallas que no hay

Hecho el 2 de septiembre de 2026. Era el pendiente 100, cerrado ese día. La pantalla tenía cuatro
recuadros de números y seis entradas de menú; de los cuatro recuadros, **dos estaban escritos a
mano** —«Presentismo GPS Hoy 100%» y «Alertas Urgentes 0»—, y de las seis entradas, **cuatro eran
`href="#"`**. Un 100% fijo es peor que un hueco: el hueco se nota.

**Los dos recuadros se sacaron y no se reemplazaron**, y el motivo no es que falte trabajo sino que
ninguno de los dos tiene una versión correcta que construir. El presentismo es la fichada, y la
fichada la miran la Familia y el Asistente, nunca la Prestadora (`CLAUDE.md` §1): mirar los
horarios que cumple una persona es dirigir el trabajo, que es justo lo que esta modalidad evita.
Las alarmas son de esos mismos dos; de ellas, lo único de la Prestadora es el tope de horas, que ya
tiene su propio bloque en la misma pantalla. El número que sí sería suyo —cuántos contactos hubo,
que es el hecho por el que cobra— espera a que se descongele la lógica comercial (§4). Quedan los
dos que salen de la base, en `panel-prestadora.html:95`.

**Y apareció un tercer número inventado que el pendiente no nombraba**: los dos recuadros que sí
consulta la base arrancaban diciendo «1» cada uno, escrito en el marcado. Mientras la consulta
viaja se veía un número que nadie contó, y las ramas de error no volvían a tocarlos, así que un
fallo de la consulta —o quien mira sin ser coordinador— dejaba el «1» en pantalla como si fuera la
cuenta. Ahora arrancan en raya, y quien la pone y la saca es `ponerNumeros()`
(`panel-prestadora.html:381`), que llaman las tres ramas que pueden dejarlos a la vista: listo,
vacío y error. **Sin cuenta va la raya y no el cero**, porque cero es un dato —«no hay ningún
legajo en revisión»— y no sirve para decir «no se sabe».

**De las cuatro entradas del menú, dos no vuelven nunca y dos quedaron anotadas.** «Entrevistas de
Selección» no necesita pantalla propia: la entrevista ya se registra adentro de la auditoría del
legajo, en la misma pantalla, y de ahí sale la resolución. «Presentismo GPS Vivo» es la fichada
otra vez, y no la va a tener. «Avisos de Familias» y «Facturación & Liquidación» esperan cada una
una decisión que no está tomada, y son el pendiente 145. El menú quedó en dos entradas
(`panel-prestadora.html:59`), las dos con pantalla.

**Y la hoja de estilos pedía cuatro columnas fijas.** Con dos recuadros quedaban apretados contra
la izquierda y media fila vacía al lado, así que `.kpi-grid` pasó a `auto-fit`
(`css/styles.css:1889`): reparte los que haya, y se acomoda solo el día que aparezca el tercero. Es
la única regla del proyecto que usa esa clase, comprobado antes de tocarla.

### Los avisos tienen autora, y las cuentas con las que se entra hoy faltan

**El agujero que importa es el de la autora, y conviene entenderlo antes que el otro.**
`avisos.familia_id` dice quién publicó el aviso. Cuando esa columna no señala a nadie,
`avisos_abiertos()` no se entera —no la mira—, así que el Asistente ve los avisos y se postula sin
problema; pero las políticas de `postulaciones` y la función `postulaciones_de_mis_avisos()`
piden `a.familia_id = auth.uid()`, que contra un nulo no da verdadero nunca. El Asistente se
postula, ve «postulado», y **no hay ninguna sesión en el mundo desde la que esa postulación se
pueda leer**. Sin un solo mensaje de error.

**Contra eso la columna quedó cerrada en el esquema, y es lo que hoy lo sostiene.**
`avisos.familia_id` es `not null` y su valor por omisión es `auth.uid()`
(`supabase/migrations/0001_base_del_esquema.sql:2200`), así que un aviso sin autora no se puede
guardar. La llave foránea va con `on delete cascade`
(`supabase/migrations/0001_base_del_esquema.sql:4054`), la misma forma que tienen
`conversaciones.familia_id` y `mensajes.autor_id`: borrar una cuenta de Familia se
lleva sus conversaciones, sus mensajes y también sus avisos. Los doce avisos sembrados tienen su
autora, y cada Familia lo es sólo de los seis de su propia Organización, nunca de los de la otra.

**Lo que hoy falta son las cuentas, y falta de verdad.** La base reconstruida trae los seis
perfiles ficticios —Familia, Asistente y personal de la Prestadora en PresDemo y en Cuidar Norte
(`supabase/migrations/0002_siembra_ficticia.sql:631`)— y **ninguna cuenta de acceso detrás**:
`auth.users` queda vacía, porque ninguna migración escribe una sola fila ahí. Cuidar Sur está sin
cuentas a propósito —estar casi vacía es lo que la hace útil para probar el aislamiento—, pero las
otras dos quedaron sin ellas sin que nadie lo decidiera. La consecuencia práctica es que **al
producto no se entra con datos ficticios**: no hay a quién abrirle la puerta, y
`scripts/abrir_cuentas_ficticias.mjs`, que es el guion que les pone la clave, no encuentra ninguna
cuenta a la que ponérsela. Y el ida y vuelta que es lo único que prueba algo acá —entrar como la
Familia y ver sus avisos, entrar como su Asistente y postularse, volver como la Familia y ver esa
postulación— hoy no se puede correr.

**Por qué la clave no puede ir adentro de una migración**, que es lo que hace que esto no se
arregle escribiendo un renglón. Las migraciones son las mismas de los dos lados, así que una clave
escrita ahí abre esas cuentas también en la base publicada, para cualquiera que lea el repositorio.
La forma que funciona es sembrar las cuentas con `encrypted_password` en nulo —existen, tienen
perfil y Organización, sostienen todas las referencias, y no entran— y ponerles la clave desde
afuera, con `scripts/abrir_cuentas_ficticias.mjs`, que la toma de `CLAVE_PRUEBA_LOCAL` y se planta
si la dirección no es la de esta máquina. Eso sigue siendo lo correcto; lo que falta es la mitad
sembrada.

**Y las dos columnas que apuntan a una cuenta ya no están eximidas** de
`probar_coherencia_de_la_siembra.mjs`. `avisos.familia_id` se llena en los doce avisos;
`caregivers.user_id`, en los dos legajos que tienen Asistente con perfil, y queda vacío en los
otros once. Sacar la exención fue parte del trabajo y se deja sacada: una exención que sobra vuelve
verde para siempre una columna que después se puede vaciar sin que nadie se entere, que es
exactamente lo que acaba de pasar del otro lado, con las cuentas.

### Las cuatro columnas que ninguna política miraba

*(31 de agosto de 2026 — cerró los pendientes 66, 74, 75 y 82)*

**Eran cuatro pendientes y era un solo defecto cuatro veces:** la política decide por fila, y lo
que importaba era qué columna se toca. Las dos políticas de `caregivers` son `for all` y no
nombran ninguna columna —«Su propio legajo»
(`supabase/migrations/0001_base_del_esquema.sql:4890`) y «Legajos de la Prestadora, para su
personal» (`supabase/migrations/0001_base_del_esquema.sql:4765`)—, y la de `profiles` dice «cada
quien escribe su propia fila» (`supabase/migrations/0001_base_del_esquema.sql:4946`). Las tres
contestan bien la pregunta que se les hace —«¿esta fila es suya?»— y ninguna contesta la que hacía
falta. Cuando la respuesta es sí, quien pide escribe la fila **entera**, incluidas las columnas
donde vive el veredicto de otro:

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

**Cómo quedó.** Dos disparadores, uno por tabla. Los escribió una migración que hoy no está en
disco —el aplastamiento dejó el estado al que llevaba, no el camino—, así que lo que se lee es el
resultado:

- Sobre `caregivers`, `before insert or update`
  (`supabase/migrations/0001_base_del_esquema.sql:3931`, función en `:935`): en el alta el sello
  **no se toma del pedido**, lo pone el disparador; en la modificación, si cambia y quien pide no
  es personal, se rechaza. El `user_id` no cambia después del alta, para nadie. Y el papel nuevo
  baja el sello, que es la opción A.
- Sobre `profiles`, `before update`
  (`supabase/migrations/0001_base_del_esquema.sql:3945`, función en `:1028`): `role` y
  `tenant_id` no cambian desde una sesión. **Acá no hay excepción para el personal, y es a
  propósito:** la política de `profiles` no le deja a nadie alcanzar el perfil de otra persona, así
  que lo único que un permiso al personal habilitaría es ascenderse a sí mismo y mudarse solo de
  Prestadora, que es justo el agujero.

Lo que cada uno hace está además escrito en la base, en su propio comentario
(`supabase/migrations/0001_base_del_esquema.sql:990` y `:1052`), así que aparece al mirar la
función y no hay que venir hasta acá.

**Y sin sesión el disparador no interviene.** Cuando `auth.uid()` es nulo no hay a quién exigirle
nada: es la base hablando consigo misma —una migración, una siembra— o la puerta de administración
de CeltaTech, que ya la cuida quien tiene esa clave. Sin esa salvedad, toda migración que sembrara
un legajo ya validado lo habría escrito sin sello y sin decirlo.

**El permiso por columna del 82 se conservó, no se reemplazó.**
`grant update (full_name) on public.profiles to authenticated`
(`supabase/migrations/0001_base_del_esquema.sql:5939`) sigue siendo la primera puerta; el
disparador es la segunda, que es la que se lee donde se la busca. El 82 nunca fue un agujero
abierto sino una trampa armada: la protección no vivía donde se la lee, y ya se había perdido una
vez sin que nadie se enterara —una migración se la llevó puesta y la siguiente tuvo que
reponerla—. Por eso el chequeo del esquema no se cree esa exención: va y mira que el permiso siga
nombrando sus columnas, y se planta si alguna migración futura vuelve a conceder `update` sobre
`profiles` sin nombrarlas (`scripts/verificar_esquema.mjs:1472`).

**Sobre el pendiente 75, el Desarrollador eligió la opción A: el papel nuevo baja el sello.** Había
tres defendibles —bajarlo, prohibir el cambio mientras el sello esté puesto, o permitirlo y
anotarlo para que la Prestadora lo revise después— y la elegida es la que hace que el sello
signifique siempre lo mismo: **habla de los papeles que están hoy**. La tercera era la única que
dejaba el sello mintiendo, porque mientras nadie revisara, el directorio seguía diciendo
«validado» sobre un papel que nadie miró. El costo de la A —volver a revisar tras un cambio de
papel— cae sobre la Prestadora, que es quien firma, y no sobre la Familia, que es quien no tiene
cómo saber.

**Con una excepción, y también a propósito: cuando el papel lo cambia el personal, el sello no se
mueve.** Es quien firma, y está viendo lo que sube en el mismo acto; bajárselo a sí misma
obligaría a la Prestadora a sellar dos veces cada corrección, que es burocracia inventada por el
sistema.

**Las cuatro pruebas viven en el repositorio y no se corrieron a mano:**
`scripts/probar_sello_de_la_prestadora.mjs` (66), `scripts/probar_de_quien_es_el_legajo.mjs` (74),
`scripts/probar_el_rol_y_la_prestadora_del_perfil.mjs` (82) y
`scripts/probar_el_papel_nuevo_baja_el_sello.mjs` (75). Dos arrancaron en rojo a propósito y las
cuatro dan verde sin que se las haya tocado. **Y cada una lleva su comprobación de sostén, que es
lo que la hace poder fallar**: sin eso, cerrar la tabla entera dejaría todos los rechazos en verde
sin haber arreglado nada. Que la persona pueda corregirse el teléfono y el nombre; que la
coordinadora pueda editar un legajo de su Prestadora y no alcance el de la ajena; que cambiar un
papel de un legajo **sin** sellar salga bien y no mueva nada.

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

**Y lo que la opción A todavía le debe a quien la sufre.** Que la persona vea, **antes** de cambiar
un papel, que hacerlo le baja el sello. Hoy no se puede escribir: ninguna pantalla cambia
`documents` —el mapeo existe en `js/apiClient.js:1423` y no lo usa nadie— y el chequeo de frases se
pone en rojo con toda frase de catálogo que ninguna pantalla nombre. La frase entra el día que
entre la pantalla; es el **pendiente 108**.

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
| **Reportes de salud y signos vitales** | Maquetado sin persistencia — y ver §3 |
| **Asesoría de reintegros de Obra Social** | Maquetado sin lógica — y ver §3 |
| **Videollamada de entrevista** | No existe, y ya no se anuncia adentro de la aplicación. Hasta el 2 de septiembre de 2026 `js/main.js` armaba una sala simulada que anunciaba «sala segura 8x8 Encryption» —un cifrado que el producto no hace— y que no abría ningún botón: se borró entera, con sus estilos y con el token que sólo ella usaba. Lo que sigue prometiéndola es el texto de venta de las pantallas (`index.html:204`, `solicitar-asistente.html:235`, `soporte-remoto.html:90`). La ventana simulada que `solicitar-asistente.html` tenía para agendarla con un Gestor salió el mismo día, junto con el resto de lo que esa pantalla prometía y este producto no hace |
| **Entrar con la cuenta de Google o de Facebook** | No existe. Hasta el 2 de septiembre de 2026 `mockup-app.html` ofrecía los dos botones y ninguno de los dos hacía nada: se sacaron. `supabase/config.toml` no tiene encendido ningún proveedor de acceso externo, y encender uno es una decisión, no una tarea |

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
`js/apiClient.js:958`, que resuelve una Prestadora y le muestra los suyos a `directorio.html`.

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

1. **Acá no se usa la palabra `marketplace` en ningún identificador.** Lo ordenó el Desarrollador,
   y además el valor guardado ya la usa y colisionaría. **Y la modalidad no nombra nada de lo
   guardado**: cada tabla y cada módulo se llaman por lo que hacen, y el nombre de la modalidad
   vive en un solo renglón del glosario del producto, para que cambiarlo sea un trámite de treinta
   segundos. El nombre comercial «Careonys Marketplace» no cambia: es decisión de marca y no entra
   al código.
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
| Asistentes | `asistentes`, `tipos_asistente`, `matriculas_asistente`, `documentos_asistente` |
| Incorporación de Asistentes | `postulaciones`, `etapas_incorporacion_asistente`, `verificaciones_asistente` |
| Cursos y certificaciones | `certificados`, `calificaciones_asistente` |
| Clientes | `familias`, `pacientes`, `miembros_familia` |
| Zonas de cobertura | `zonas_cobertura` |

**El reparto completo, módulo por módulo, está en `docs/MODULOS.md`** (24 de agosto de
2026), que traza la línea de corte también para lo que no existe todavía de ningún lado.

Lo propio de esta modalidad es lo que la distingue: que el cliente **busca y elige** en vez de
recibir una asignación. Eso es el directorio, el perfil, el filtro y la solicitud.

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

## 6. Deuda del código actual

Está toda en `docs/PENDIENTES.md`, con condición de cierre para cada punto. Acá no se repite,
para que no haya dos listas que se contradigan.
