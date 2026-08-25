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
| Autenticación con Supabase Auth | Funciona, y **el acceso lo decide la sesión**. `acceso.html` es la pantalla de inicio de sesión y manda a cada rol donde le toca; `panel-prestadora.html:289` llama a `Sesion.requireAuth()` y además comprueba el rol. Las migraciones 0005 y 0006 ponen el límite en la base, del lado que no se puede falsificar. Probado con dos Prestadoras: `scripts/probar_aislamiento.mjs` |
| Directorio de Asistentes con filtros | Maquetado y navegable |
| Perfil del Asistente | Maquetado |
| Portal de postulación de Asistentes | Maquetado, con el legajo funcionando: `postulacion-asistente.html` guarda las cuatro fichas repetibles y las dos banderas en las tablas de la migración 0004 |
| Archivos del legajo | Funcionan. La foto va al depósito público `avatares` y los papeles al privado `documentos-cuidadores`, cada uno en la carpeta de su cuenta; en la base queda el camino, y la dirección se firma al mostrarla (`js/auth.js:176`). Declarados en `supabase/migrations/0006_archivos_del_legajo.sql`, no a mano |
| Consentimiento de publicación | Funciona de punta a punta. El alta pregunta al cerrar (`data/catalogo-banderas.json`, paso 7) y guarda la respuesta en `banderas_asistente`; el directorio cruza contra ella y **no muestra a nadie que no haya dicho que sí** (`supabase/migrations/0007_directorio_con_consentimiento.sql`). Sin respuesta no se publica: la casilla arranca sin marcar. Y el directorio va con `noindex`, que es lo que ese mismo consentimiento promete |
| Evaluaciones de competencias | Funcionan, y **las corrige el servidor**. `examen.html` pide sesión, lista lo que la persona puede rendir y manda las respuestas a `rendir_evaluacion()`; la columna con la respuesta correcta no tiene permiso de lectura para nadie y las opciones salen de la vista `opciones_para_responder`, que no la incluye (`supabase/migrations/0008_cursos_y_evaluaciones.sql`). El intento no se puede escribir a mano: la tabla no tiene política de escritura y los permisos están revocados. `cursos.html` ya no tiene examen propio, enlaza a esta pantalla. Falta el contenido: ver `docs/PENDIENTES.md` punto 24 |
| Motor de fichas del legajo (`js/fichas-legajo.js`) | Funciona. Dibuja, valida y recolecta Matrícula, estudio, experiencia y referencia leyendo `data/catalogo-fichas.json` y `data/catalogo-vocabularios.json`. Ninguna de las cuatro está escrita en la pantalla |
| Formulario integral de datos del Paciente | Maquetado, paso a paso |
| Cliente de datos (`js/apiClient.js`) | Funciona en modo local y modo Supabase |
| Identidad del producto (`js/identidad.js`) | Funciona y está verificada. Ver abajo |

**Maquetado** significa que la pantalla existe y se navega, no que la lógica detrás esté escrita.

### El límite entre Prestadoras lo pone la sesión

**Cerrado el 24 de agosto de 2026**, con las migraciones 0005 y 0006. Antes, la Prestadora salía
de la barra de direcciones y viajaba como un filtro más en cada consulta: eso no es aislamiento,
es una sugerencia, porque un filtro que viaja en el pedido lo cambia quien llama.

Cómo quedó:

- **Registrarse ya no decide nada.** El disparador de `auth.users` crea la fila de `profiles`
  (`0005_acceso_por_sesion.sql:93`) y valida la Prestadora contra `tenants`, pero **el rol no sale
  de los metadatos**: quien se registra solo queda siempre con un rol sin acceso a los datos de la
  Prestadora. Pedir ser coordinador de otra Prestadora no sirve de nada.
- **Pertenecer y poder ver son dos cosas distintas.** `public.es_personal_de_prestadora()` es el
  punto único de verdad, y las políticas de `caregivers`, de las siete tablas del legajo y de
  `verificaciones_asistente` preguntan por él y por `prestadora_actual()`.
- **La aplicación pregunta en el mismo orden que la base.** Con sesión, la Prestadora sale del
  perfil (`js/apiClient.js:43`); sin sesión, el enlace elige qué directorio se muestra y nada más.
- **Los archivos siguen la misma regla.** Ver la fila «Archivos del legajo» de arriba.

Probado con dos Prestadoras ficticias: `scripts/probar_aislamiento.mjs`, dieciséis
comprobaciones. Y falsificado a propósito para verificar que se pone en rojo cuando corresponde.

### El nombre del producto salió del código

**Cerrado el 23 de agosto de 2026.** Estaba escrito a mano 273 veces. Hoy vive en un solo archivo,
`js/identidad.js:24-27`, y no aparece en ninguna otra parte del código.

Cómo quedó:

- **El texto visible usa marcadores** —`{{producto}}`, `{{productoCorto}}`, `{{dominio}}`,
  `{{contacto}}`— y `js/identidad.js` los resuelve al cargar la página. Hay 59 repartidos en las 12
  pantallas, y las 12 cargan el archivo.
- **Lo que persiste se nombra por su función**, según la regla 13 heredada. El identificador
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

  Hoy se corre a mano —`node scripts/verificar_identidad.mjs`— porque este proyecto no tiene
  compilación: es HTML servido tal cual, sin `package.json`. **Un chequeo que hay que acordarse de
  correr no sostiene nada solo**: se engancha a la compilación en cuanto la migración a React la
  traiga. Está anotado en el pendiente 17.

Lo que **no** cierra esto: el nombre de la **Prestadora de ejemplo**, «PresDemo», sigue escrito a
mano 111 veces en 18 archivos. Es otro problema —el nombre de un cliente, no el del producto— y es
el pendiente 11.

---

### El texto visible dejó de tutear

Cerró el pendiente 10, el 24 de agosto de 2026. Las catorce pantallas hablan en forma impersonal,
y de *usted* cuando hay que dirigirse a alguien, como pide la regla 5.1 de `CLAUDE.md`.

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

- Un `await` adentro de una función que no era `async`, en `pwa-asistente/index.html:557`. Es un
  error de sintaxis, así que el navegador descartaba el bloque `<script>` entero: la aplicación
  del Asistente se dibujaba completa y no funcionaban ni el ingreso, ni el fichado, ni la
  bitácora, sin ningún aviso. Corregido, y ahora `scripts/verificar_guiones.mjs` lo vigila —era
  el único bloque roto de los veinticuatro del proyecto—.
- Un `á` guardado como carácter roto en `solicitar-asistente.html`, que hacía invisible esa frase
  a cualquier búsqueda. Corregido.

---

### Un dato ya no puede entrar como código en una pantalla

Cerró el pendiente 22, el 24 de agosto de 2026. Los sesenta y nueve lugares donde un dato guardado
se metía adentro del marcado ahora pasan por `Texto.escapar`, en seis archivos:
`panel-prestadora.html`, `perfil.html`, `mockup-app.html`, `postulacion-asistente.html`,
`pwa-familia/index.html` y `js/fichas-legajo.js`.

- **Cuál era el problema**: un nombre escrito como `<img src=x onerror=...>` no se veía como un
  nombre — se ejecutaba, y se ejecutaba en la pantalla de quien lo estaba leyendo. En este
  proyecto quien lee suele ser el personal de la Prestadora, o sea justo quien tiene los permisos,
  o una familia mirando el cuaderno de cuidado.
- **Los dos peores casos** no estaban donde decía el pendiente. Uno era el mensaje de chat de
  `mockup-app.html:692`, que lo escribe una persona y lo lee otra. El otro era
  `panel-prestadora.html`, la pantalla que el pendiente daba por arreglada: tenía el renglón de la
  tabla de Asistentes entero sin escapar —nombre, documento, teléfono, profesión y zona— y el
  único `onclick` escrito en el marcado de todo el proyecto.
- **Escapar no alcanzaba ahí, y por eso se sacó el `onclick`.** Adentro de un atributo el
  navegador deshace el escapado antes de leer el contenido como código, así que un `&#39;` vuelve
  a ser una comilla y cierra la cadena igual. El identificador ahora se pasa por
  `addEventListener` (`panel-prestadora.html:214`), que nunca vuelve a leer texto como programa.
- **Un solo punto de verdad**, como pide la regla 7: `js/texto.js` (77 renglones) tiene
  `Texto.escapar` y `Texto.mensajeDeError`, y lo cargan las catorce pantallas. Antes de esto el
  único archivo que cargaban todas era `js/identidad.js`; ahora son dos. La copia local de
  `panel-prestadora.html` se borró. Hay copia idéntica en cada PWA, porque el service worker de
  cada una solo alcanza su propia carpeta, y `scripts/verificar_copias.mjs` compara las tres.
- **De paso cerró la otra mitad de la regla 5.1.** `Texto.mensajeDeError` clasifica la falla —sin
  red, sin permiso, dato repetido, no está, dato inválido— y devuelve la frase que corresponde; el
  texto crudo de la base, que nombra tablas y restricciones, queda en la consola. Reemplazó a los
  `alert('... ' + err.message)` de `mockup-app.html` y al aviso de la bitácora de
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

Cerró el pendiente 28, el 24 de agosto de 2026, y con él la mitad de la regla 5.1 que había
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
  decisión en dos lugares, que es justo lo que prohíbe la regla 7. Se unificaron en `js/texto.js`,
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
  (es el pendiente 21). Ahora no dice ningún número: el largo lo pone el servidor, y la regla 5.1
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
  cualquier cosa. `js/catalogo.js:121` traduce la clave guardada a su etiqueta y, cuando no la
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
  los cuatro la consumen (regla 7).

---

### El directorio dejó de traer sus listas escritas a mano

Cerró la parte del pendiente 20 que dependía del código, el 24 de agosto de 2026.

- **El pendiente decía que el problema estaba en la base y estaba en la pantalla.** Nombraba
  `caregivers.profession` y las claves `domiciliaria`, `enfermera`, `auxiliar` y `at`. Esas
  palabras no eran filas: eran los `<option>` y los `data-` de `directorio.html`. Se verificó
  además que ninguna pantalla escribe hoy una clave inventada en esa columna —`postulacion-`
  `asistente.html:315` y `formulario-integral.html:384` toman las suyas del catálogo—, y de la
  base misma no se puede afirmar nada desde acá, porque `caregivers` no se deja leer sin sesión.
- **Los cuatro filtros salen del catálogo** (`directorio.html:66`): zona, Tipo de Asistente,
  patología y verificación. Eran veinticinco opciones escritas a mano contra la regla 5.1; ahora
  son cuatro `data-catalogo`. Las zonas llegan agrupadas por región, que la lista escrita a mano
  no hacía.
- **Las ocho tarjetas de muestra hablan el mismo idioma que los filtros.** Cada una lleva ahora
  `data-zone`, `data-type`, `data-patologia` y `data-verificacion` con claves del catálogo, y
  `filterCards()` en `js/main.js:85` compara clave contra clave.
- **Antes comparaba contra el texto visible de la tarjeta, y fallaba de dos maneras.** La opción
  `medicos` no encontraba nunca a la tarjeta que decía «Médicos», porque la tilde no coincide;
  `parkinson` y `acv` no existían en ninguna tarjeta y devolvían cero sin explicar por qué. Y
  cualquier cambio de redacción rompía un filtro sin que nada avisara.
- **Cero resultados ahora se dice con una frase**, no con un «Mostrando 0» que se lee como si
  algo se hubiera roto: es el cuarto estado de la regla 5.3.
- **El contador vivía en dos lugares.** `directorio.html` tenía un observador que contaba las
  tarjetas visibles y escribía la misma frase que ya escribe `filterCards()`. Se sacó el
  observador (regla 7).
- **Y salió una palabra que el glosario prohíbe.** `docs/GLOSARIO.md:28` nombra «especialidad»
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
  los tres idiomas (`data/catalogo-banderas.json`, `perfil_publicado`) para decir lo que de verdad
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
- **El nombre bueno ya estaba escrito y no hubo que inventar nada:** `docs/GLOSARIO.md:105` dice
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
  la base la columna se llama `profession` y no se toca, porque la regla 5.1 dice que un
  identificador guardado no se renombra. Cuando el pendiente 7 lleve los catálogos a tablas, el
  mismo cambio habría sido una migración de datos.
- **Donde se completa un legajo ya no dice perfil.** Cambiaron `index.html`, `postulacion-asistente.html`
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
  (regla 7). El largo mínimo y las frases de aviso viven ahí y en ningún otro lado.
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
  botón de enviar se esconde; el botón se deshabilita mientras está en curso (regla 5.5); con el
  correo sin confirmar el aviso sale en rojo y no se pierde ni un dato; con el correo confirmado se
  guardan la ficha y las cuatro secciones del legajo, la pantalla vuelve a su estado normal y la
  contraseña desaparece de la memoria y de la pantalla.

### Las once migraciones ya corren en el servidor

Comprobado el 24 de agosto de 2026 con `supabase migration list` contra el proyecto real: el
servidor tiene aplicadas 0001 a 0011, las mismas once que hay en `supabase/migrations/`. Antes
tenía hasta la 0008, y esa distancia costaba dos cosas que ya no cuestan:

- **La columna del contacto existe.** La 0009 agregó `care_searches.contact_info`, que es donde
  `js/apiClient.js:461` escribe el contacto de una búsqueda. Mientras no estaba, el formulario
  público de `solicitar-asistente.html` mandaba una columna que la base no tenía.
- **Las filas de ejemplo hablan el idioma del catálogo.** La 0010 reemplazó las claves viejas de
  las cuatro filas ficticias —«enfermero» y compañía— por las que las pantallas esperan.
- **La 0011 armó el directorio**, que es lo que hoy se ve sin sesión.

Queda dicho porque el estado real manda sobre el documentado (`CLAUDE.md` §7): un archivo en
`supabase/migrations/` describe lo que se quiso aplicar, no lo que corre. Esto último se preguntó.

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
| **Bitácora de salud y signos vitales** | Maquetado sin persistencia — y ver §3 |
| **Asesoría de reintegros de Obra Social** | Maquetado sin lógica — y ver §3 |

---

## 3. Esto no es otro producto: es una modalidad de Careonys

**Decidido por el Desarrollador el 23 de agosto de 2026.** Cierra las dos decisiones que
bloqueaban el arranque.

Lo que se estaba construyendo acá como producto aparte es **una modalidad más de Careonys**: no
una cuarta aplicación ni un sistema hermano. Una misma Prestadora puede tener las dos encendidas
a la vez, con unos clientes de atención directa y otros que eligen del catálogo.

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
`directorio.html:528`, que resuelve una Prestadora y muestra a los suyos.

**Ninguna búsqueda, en ninguna modalidad, mezcla Asistentes de dos Prestadoras.** Mezclarlas sería
abandonar el aislamiento entre Organizaciones —la regla 2— para conseguir un desorden general. No
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
   legales ya usan para lo mismo. Pero es un valor **guardado**, y la regla 13 dice que lo que
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

Los cuatro módulos que estaban duplicados —bitácora de salud, signos vitales, check-in con
ubicación, reportes diarios, Obra Social— no se construyen de nuevo acá: existen y funcionan del
otro lado, y si alguna pantalla de acá los resuelve mejor, eso se lleva allá.

---

## 4. Decisión abierta: la lógica comercial

**Esto se resuelve antes de escribir la primera tabla.**

Los dos documentos de modelo de negocio de `docs/` ponen planes, comisiones, precios y facturación
**adentro del producto**: niveles de suscripción, comisión por transacción, canon de licencia.

El `CLAUDE.md` de Careonys decidió lo contrario en su §1.bis: nada comercial vive del lado del
producto, eso pertenece al panel de CeltaTech, y *"si una tarea parece pedir que el producto sepa
cuánto paga un cliente, la tarea está mal planteada: se para y se consulta"*.

Un dato nuevo que conviene tener a la vista al decidir: Careonys ya tiene dos tablas llamadas
`cobros_marketplace` y `suscripciones_marketplace`. O sea que parte de lo comercial de esta
modalidad ya está construido allá, aunque ninguna de las dos tablas tiene comentario que explique
qué guarda. Antes de escribir nada comercial acá conviene abrirlas.

**Hasta entonces no se construye lógica comercial en este proyecto.**

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

---

## 6. Deuda del código actual

Está toda en `docs/PENDIENTES.md`, con condición de cierre para cada punto. Acá no se repite,
para que no haya dos listas que se contradigan.
