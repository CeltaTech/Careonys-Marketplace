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
| Autenticación con Supabase Auth | Funciona, y **el acceso lo decide la sesión**. `acceso.html` es la pantalla de inicio de sesión y manda a cada rol donde le toca; `panel-prestadora.html:367` llama a `Sesion.requireAuth()` y además comprueba el rol. Las migraciones 0005 y 0006 ponen el límite en la base, del lado que no se puede falsificar. Probado con dos Prestadoras: `scripts/probar_aislamiento.mjs` |
| Directorio de Asistentes con filtros | Maquetado y navegable |
| Perfil del Asistente | Maquetado |
| Portal de postulación de Asistentes | Maquetado, con el legajo funcionando: `postulacion-asistente.html` guarda las cuatro fichas repetibles y el consentimiento de publicación en las tablas de la migración 0004, y la disponibilidad horaria en las de la 0012 |
| Archivos del legajo | Funcionan. La foto va al depósito público `avatares` y los papeles al privado `documentos-cuidadores`, cada uno en la carpeta de su cuenta; en la base queda el camino, y la dirección se firma al mostrarla (`js/auth.js:173`). Declarados en `supabase/migrations/0006_archivos_del_legajo.sql`, no a mano |
| Consentimiento de publicación | Funciona de punta a punta. El alta pregunta al cerrar (`data/catalogo-autorizaciones.json`, paso 7) y guarda la respuesta en `autorizaciones_asistente`; el directorio cruza contra ella y **no muestra a nadie que no haya dicho que sí** (`supabase/migrations/0007_directorio_con_consentimiento.sql`). Sin respuesta no se publica: la casilla arranca sin marcar. Y el directorio va con `noindex`, que es lo que ese mismo consentimiento promete |
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
  (`supabase/migrations/0005_acceso_por_sesion.sql:93`) y valida la Prestadora contra `tenants`, pero **el rol no sale
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

  Lo corre git antes de cada commit, junto con los otros cinco, desde `.githooks/pre-commit`.
  Suelto sigue andando: `node scripts/verificar_identidad.mjs`.

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

- Un `await` adentro de una función que no era `async`, en `pwa-asistente/index.html`. Es un
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
  `mockup-app.html:775`, que lo escribe una persona y lo lee otra. El otro era
  `panel-prestadora.html`, la pantalla que el pendiente daba por arreglada: tenía el renglón de la
  tabla de Asistentes entero sin escapar —nombre, documento, teléfono, profesión y zona— y el
  único `onclick` escrito en el marcado de todo el proyecto.
- **Escapar no alcanzaba ahí, y por eso se sacó el `onclick`.** Adentro de un atributo el
  navegador deshace el escapado antes de leer el contenido como código, así que un `&#39;` vuelve
  a ser una comilla y cierra la cadena igual. El identificador ahora se pasa por
  `addEventListener` (`panel-prestadora.html:226`), que nunca vuelve a leer texto como programa.
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
  los cuatro la consumen (regla 7).

---

### El directorio dejó de traer sus listas escritas a mano

Cerró la parte del pendiente 20 que dependía del código, el 24 de agosto de 2026.

- **El pendiente decía que el problema estaba en la base y estaba en la pantalla.** Nombraba
  `caregivers.profession` y las claves `domiciliaria`, `enfermera`, `auxiliar` y `at`. Esas
  palabras no eran filas: eran los `<option>` y los `data-` de `directorio.html`. Se verificó
  además que ninguna pantalla escribe hoy una clave inventada en esa columna —`postulacion-asistente.html:319`
  y `formulario-integral.html:353` toman las suyas del catálogo—, y de la
  base misma no se puede afirmar nada desde acá, porque `caregivers` no se deja leer sin sesión.
- **Los cuatro filtros salen del catálogo** (`directorio.html:66`): zona, Tipo de Asistente,
  patología y verificación. Eran veinticinco opciones escritas a mano contra la regla 5.1; ahora
  son cuatro `data-catalogo`. Las zonas llegan agrupadas por región, que la lista escrita a mano
  no hacía.
- **Las ocho tarjetas de muestra hablan el mismo idioma que los filtros.** Cada una lleva ahora
  `data-zone`, `data-type`, `data-patologia` y `data-verificacion` con claves del catálogo, y
  `filterCards()` en `js/main.js:120` compara clave contra clave.
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
  `postulacion-asistente.html` se borraron. Donde se escribe una contraseña vieja —el acceso— no se
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

Queda una contraseña de mentira en pantalla, y no es ésta: la de la pantalla de acceso viene
prellenada con seis dígitos para poder mostrar el producto sin tipear
(`pwa-asistente/index.html:310` y `pwa-familia/index.html:571`). Es un atajo de demostración y sale
antes de que haya una sola persona real.

### Las trece migraciones ya corren en el servidor

Comprobado el 24 de agosto de 2026 contra el proyecto real: el servidor tiene aplicadas 0001 a
0013, las mismas trece que hay en `supabase/migrations/`. Antes tenía hasta la 0008, y esa
distancia costaba dos cosas que ya no cuestan:

- **La columna del contacto existe.** La 0009 agregó `care_searches.contact_info`, que es donde
  `js/apiClient.js:461` escribe el contacto de una búsqueda. Mientras no estaba, el formulario
  público de `solicitar-asistente.html` mandaba una columna que la base no tenía.
- **Las filas de ejemplo hablan el idioma del catálogo.** La 0010 reemplazó las claves viejas de
  las cuatro filas ficticias —«enfermero» y compañía— por las que las pantallas esperan.
- **La 0011 armó el directorio**, que es lo que hoy se ve sin sesión.
- **La 0012 le dio lugar a la disponibilidad** y cambió el nombre de una tabla, abajo.
- **La 0013 le dio lugar a lo que pide una Familia**, que es lo que sigue.

Queda dicho porque el estado real manda sobre el documentado (`CLAUDE.md` §7): un archivo en
`supabase/migrations/` describe lo que se quiso aplicar, no lo que corre. Esto último se preguntó.
Para la 0012 se preguntó dos veces, porque la primera vez el programa dijo que había terminado y
la migración había fallado a la mitad: se le pidió a la base, tabla por tabla, que dijera qué
tiene. `banderas_asistente` contesta que no existe; `autorizaciones_asistente`,
`disponibilidad_asistente` y `franjas_asistente` contestan que existen y que a un visitante sin
sesión no le muestran nada; y `caregivers_publicos` devuelve la columna `reemplazos_urgentes` y
ya no devuelve `disponible_urgencias`.

### Las últimas listas escritas a mano se fueron de las pantallas

Quedaban dos, y eran las más visibles: las diez tarjetas del asistente de seis pasos de
`formulario-integral.html`. Cada una traía su ícono, su título y su explicación escritos adentro
del HTML —setenta y dos renglones—, que es exactamente lo que prohíbe la regla 5.1. Agregar una
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
justamente la falla que el catálogo existe para no tener (regla 5.3).

### Lo que una Familia pide ya tiene dónde guardarse

Tres pantallas le preguntan cosas a una Familia y `care_searches` tenía siete columnas. Lo que
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
avisar: *«la tabla care_searches no tiene dónde guardar «colorFavorito». Eso se pregunta en
pantalla y no se está guardando»*. Era el pendiente 37.

**Falta una sola cosa de las que se preguntan**, y se dejó afuera a propósito: la modalidad de
contratación iría a `schedule_type`, que hoy guarda cuatro formas distintas de nombrar lo mismo y
no tiene vocabulario que la gobierne. Es el pendiente 31 y lo decide el Desarrollador; hasta
entonces, escribir ahí una quinta forma sería empeorarlo.

### La grilla de disponibilidad dejó de tirarse, y las banderas se llaman autorizaciones

El último paso del alta preguntaba días y turnos —veintiún casilleros— y no los guardaba en
ningún lado: `caregivers` no tenía dónde ponerlos y el traductor del cliente de datos los
descartaba sin decir nada. Era el pendiente 23, y estaba abierto desde que la pantalla existe.

- **Dos tablas nuevas, y las dos son módulo compartido** (`CLAUDE.md` regla 12):
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
  postulaba desde el teléfono llenaba la grilla y no quedaba nada. Con el pendiente 36 cerrado
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

- **El problema no era la columna, era la pregunta.** `care_searches.grid_schedule_7x3` es una
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
  `franjas_busqueda`, espejo exacto de `franjas_asistente` —clave de `dia_semana`, clave de
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
  `busqueda_sin_franjas`).
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

1. **Aplicar la migración `supabase/migrations/0015_franjas_de_una_busqueda.sql`** pegándola en el
   panel de Supabase, en SQL Editor. Hasta que corra, publicar una búsqueda guarda la búsqueda pero
   no sus días y turnos, y la pantalla lo dice.
2. **Vaciar y sacar `care_searches.grid_schedule_7x3`.** Ya no la escribe ni la lee nadie, pero la
   columna existe y tiene adentro las dos formas viejas. La línea es
   `alter table public.care_searches drop column grid_schedule_7x3;`

### El alta del teléfono guarda el legajo entero, y no sólo la disponibilidad

Cierra el pendiente 36, el 25 de agosto de 2026.

Quien se postulaba desde el teléfono quedaba dado de alta sin legajo y sin poder aparecer nunca en
el directorio: el directorio exige una fila en `autorizaciones_asistente` con un `join` y no con un
`left join` (`supabase/migrations/0012_autorizaciones_y_disponibilidad.sql:186`), y esa pantalla no
tenía el paso que la crea. Ahora manda lo mismo que el portal.

- **Los dos pasos que faltaban se dibujan desde el catálogo**, no están escritos en la pantalla.
  Matrícula y estudios en el paso 2, experiencia laboral en el paso 3 y referencias en el paso 5
  salen de `data/catalogo-fichas.json` a través de `js/fichas-legajo.js`
  (`pwa-asistente/index.html:986`, `montarFichas`). El paso de cierre sale de
  `data/catalogo-autorizaciones.json`.
- **El paso de cierre pasó a ser un módulo.** Estaba escrito adentro de `postulacion-asistente.html`,
  cuarenta renglones que traían el archivo y armaban las casillas. Ahora es `js/autorizaciones.js`,
  y las dos pantallas consumen el mismo (regla 7). Copiarlo habría sido tener el mismo paso dos
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
  abrir. Se agrega en `guardarLegajo` (`pwa-asistente/index.html:1029`), que es donde ya se sabe
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
autorización en «sí», la persona aparece en `caregivers_publicos`; poniendo esa misma autorización
en «no», desaparece. Es exactamente el camino que antes no existía.


### La prueba de aislamiento vuelve a correr entera

Cierra el pendiente 39, el 25 de agosto de 2026.

La prueba de la que depende el `CLAUDE.md` §2 se había quedado sin poder arrancar: empieza creando
cuentas ficticias y el servidor alojado las rechaza. El propio pendiente proponía tres caminos y
dejaba el tercero sin probar. Es el que anda.

- **Corre contra la base local**, con `supabase start` y `node scripts/probar_aislamiento.mjs --local`.
  Ahí el registro no manda ningún correo, así que ni el tope ni la confirmación la frenan.
- **Pasaron las 36 comprobaciones**, dos corridas seguidas: las tablas, los archivos de los dos
  depósitos, el directorio con su consentimiento y el examen que corrige la base.
- **Y la base local está al día**: las catorce migraciones aplicadas desde cero, con las dos
  Prestadoras ficticias que la prueba necesita para distinguir «aislado» de «todo bloqueado».

Lo que no se arregla con esto es el correo del proyecto alojado, que sigue con el servicio de
fábrica y su tope bajo. Eso es el pendiente 45, y toca al alta de verdad, no sólo a las pruebas.


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
`caregivers_publicos`, la vista que sólo deja pasar a quien tiene el legajo validado por la
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
(`perfil.html:136`) y ofrece las dos puertas que sí existen: entrar como Familia y publicar un aviso.
Lo que falta —empezar una conversación con esa persona en particular— quedó anotado como pendiente 46.

**Tres traducciones que estaban por escribirse dos veces subieron a los archivos compartidos**
(regla 7): el precio en pesos es `Texto.importe` (`js/texto.js:81`), la etiqueta de una lista es
`Catalogo.etiquetaSiExiste` (`js/catalogo.js:160`), y la de una tarea —que puede estar en cualquiera
de tres listas— es `Catalogo.etiquetaDeTarea` (`js/catalogo.js:173`). Vivían adentro de
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
  `postulacion-asistente.html`, `solicitar-asistente.html`, `cursos.html`, `formulario-integral.html`,
  `panel-prestadora.html`, `soporte-remoto.html`, las dos aplicaciones de teléfono y las notas del
  catálogo. Donde decía «cuidador» ahora dice **Asistente**.
- **`scripts/verificar_vocabulario.mjs` es el chequeo que impide que vuelva.** Falla el commit si la
  palabra aparece en el texto que ve una persona. Es el séptimo, y confirmó lo que prometía el
  renglón anterior de este documento: entró solo, sin tocar ni el corredor ni el gancho.
- **Antes de escribirlo se sacó `visible()` a `scripts/texto_visible.mjs`**, que ahora comparten el
  chequeo de trato y el de vocabulario. Copiarlo hubiera sido la octava lista repetida dos veces
  (regla 7 de `CLAUDE.md`).
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
   `postulacion-asistente.html`), la banda con el nombre adentro del teléfono dibujado
   (`index.html` y `postulacion-asistente.html`) y el botón de ingresar de `mockup-app.html`. **El
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

**El caso más claro de los que quedan.** De noche, el enlace «Postularse como Asistente» de la
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
—`cuidadores` es `caregivers`, `avisos` es `care_searches`, `certificaciones` son tres tablas
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
material fue escrito para una sola empresa, y la regla 10 del `CLAUDE.md` pide esa columna en toda
tabla con datos propios de una Organización aunque hoy siempre valga lo mismo —es lo que hace que
la fusión futura sea un update y no una migración—. Además: `postulaciones.tarifa_propuesta`
guarda un número sin moneda (regla 11); los tipos de `notificaciones` incluyen `postulacion`, que
es una palabra propia de esta modalidad y no puede aparecer en un módulo compartido (regla 12); y
`video_llamadas` y `pagos` tienen columnas que atan el esquema a un proveedor externo que todavía
no se eligió. Las cinco reglas que ninguna puede saltearse están al principio del documento nuevo.

**Una colisión de vocabulario que quedó anotada.** El material heredado llamaba `avisos` a lo que
publica una Familia, pero en este producto **un aviso es por dónde sale una notificación**
—WhatsApp, correo, notificación al celular—, y `docs/GLOSARIO.md:36` avisa expresamente de esa
colisión. En el documento nuevo se escribe **búsqueda de cuidado**, que es lo que ya guarda
`care_searches`. El módulo se sigue llamando `avisos`, así que la palabra convive con los
dos sentidos y alguna vez habrá que elegir. No se decidió nada: se dejó escrito.

**Lo que se descartó y no se trajo.** La arquitectura entera, el sistema de diseño propuesto
—superado por `css/tokens.css`, que existe y funciona—, seis proveedores externos elegidos de
antemano para funciones que no se construyeron, el panel de administración de una aplicación que
no existe, y el plan por fases en semanas. Nada de eso se archivó: se borró, y sigue en la
historia de git para quien lo necesite.

### Las citas de la documentación vuelven a apuntar donde dicen

El 25 de agosto de 2026.

**El problema.** `CLAUDE.md` §7 pide que toda afirmación sobre una decisión ya tomada cite
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
- **La pantalla nueva es `screen-capacitaciones`**, con los cuatro estados que pide la regla 5.3:
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
  `caregivers_publicos`, la misma vista que el directorio, que exige las dos cosas.

- **Quien no tenía foto llevaba la cara de otra persona.** El respaldo era
  `assets/images/perfil_maria.png`, una foto de banco de imágenes: cualquier Asistente sin retrato
  aparecía con esa cara. Ahora, sin foto, va la inicial del nombre en un círculo, igual que en el
  directorio.

- **A quien no dijera su tipo se le ponía «Cuidadora».** Una palabra inventada por la pantalla, y
  encima en femenino. Se fue: el tipo y la zona salen del catálogo, y si no hay ninguno de los dos
  el renglón no se dibuja en vez de rellenarse con algo.

- **La tira ahora tiene los cuatro estados de la regla 5.3** —buscando, error con su botón de
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
devuelve `caregivers_publicos` —nombres inventados, tipo y zona traducidos por el catálogo, precio
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
  `caregivers_publicos`. El archivo pasó de 534 renglones a 342.
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
  distingue un caso del otro (`js/apiClient.js:74`, `:85` y `:468`) y el segundo avisa.
- **La base tenía el directorio vacío y nadie se enteraba.** `caregivers_publicos` devolvía **cero
  filas**, y no por un problema de permisos: los legajos inventados de la migración 0003 están
  validados, pero nadie había contestado la autorización de publicación, que la vista exige. Con
  ocho tarjetas dibujadas encima, eso no se veía. La migración 0014 pone cinco legajos inventados
  más y contesta las autorizaciones, y **deja una validada y sin publicar a propósito** —Ester
  Villalba Ficticia— para que la condición del consentimiento se pueda comprobar: si apareciera,
  la vista no estaría mirándola.
- **Comprobado en el navegador, con las dos Prestadoras.** PresDemo muestra cuatro y Cuidar Norte
  muestra tres; nunca siete, que es el total. Los tres filtros y la búsqueda libre funcionan sobre
  las tarjetas recién traídas —la búsqueda «ruben» encuentra a Rubén Ocampo Ficticio—, y los
  cuatro estados de la regla 5.3 se probaron uno por uno, incluido el botón de reintentar. La
  respuesta de la base no trae documento, teléfono, correo ni domicilio.
- **Se sacó el filtro «Verificación»**, que la pantalla ofrecía y nada podía contestar: lo que se
  controló de un legajo vive en `verificaciones_asistente`, que no es pública. Es el pendiente 43.
- **`perfil.html` quedó a mitad de camino y por eso se lo frenó.** Sus datos estaban escritos a
  mano, indexados del 1 al 8, y tomaba el identificador con `parseInt(...) || 1`: con el
  identificador de la base —que es un UUID— daba NaN, caía en el 1 y mostraba a otra persona sin
  avisar. Ese día un enlace que no reconocía pasó a decir lo que pasa y a ofrecer la vuelta al
  directorio. **Se cerró el 25 de agosto de 2026**, y con él el pendiente 44: hoy la pantalla lee
  de `caregivers_publicos`, como cuenta «El perfil muestra a la persona que dice la dirección, y
  nada más que eso» más arriba.

### Un botón que opera se apaga mientras opera, y lo que no se puede deshacer se pregunta antes

El 25 de agosto de 2026.

Las reglas 3, 4 y 5 de `CLAUDE.md` —cuatro estados, confirmar lo destructivo, apagar el botón
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
la bitácora se apaga y dice «Guardando...». Abrir una evaluación desde un botón en `examen.html`
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
`directorio.html:304`, que resuelve una Prestadora y muestra a los suyos.

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

**Cuándo se arranca el punto 4, decidido por el Desarrollador el 24 de agosto de 2026.** El
esqueleto de React se levanta **recién cuando el catálogo esté entero en tablas y los estilos
afuera del HTML**, no antes. El motivo es de costo: portar antes obliga a escribir cada pantalla
dos veces —una en HTML plano para que funcione hoy, otra en React—, y ese trabajo duplicado es
exactamente el que la regla 12 quiere evitar. Mientras tanto, cada pantalla que se toca deja el
contenido en su catálogo y los colores en las variables, que es preparar el terreno para el punto
4 sin escribir nada dos veces.

---

## 6. Deuda del código actual

Está toda en `docs/PENDIENTES.md`, con condición de cierre para cada punto. Acá no se repite,
para que no haya dos listas que se contradigan.
