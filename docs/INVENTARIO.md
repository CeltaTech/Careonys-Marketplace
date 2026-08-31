# Inventario de Careonys-Marketplace

Fecha del relevamiento: 22 de agosto de 2026.
Carpeta analizada: `F:\proyectos\celtatech\productos\Careonys-Marketplace`.
Método: lectura del código. No se modificó ningún archivo del proyecto.

> **Esto es una foto del 22 de agosto de 2026, no el estado de hoy.** Se deja como estaba a
> propósito: sirve para saber de dónde se partió. Lo que vale hoy está en `docs/ALCANCE.md`, y si
> los dos dicen cosas distintas, gana ése. Lo que ya cambió desde esta foto está anotado ahí, con
> fecha.

## Antes de leer: qué proyecto es éste y cuál es el otro

En `F:\proyectos\celtatech` conviven varios proyectos. El único hecho con HTML, CSS y
JavaScript plano es **Careonys-Marketplace**, y es el que se inventaría acá.

El "otro producto" cuyo stack se quiere igualar es **`productos\careonys`**, que ya está en
React 18 + Vite + Supabase + React Router, repartido en tres aplicaciones (`panel`,
`pwa-asistentes`, `pwa-familias`). Es decir: la migración no arranca de cero. Hay un destino
concreto, con convenciones ya elegidas, al que este proyecto tiene que llegar.

Un dato que conviene tener presente desde el principio: **los dos proyectos apuntan a Supabase
y cubren territorio parecido** (asistentes, familias, panel). Antes de migrar pantalla por
pantalla, vale la pena decidir si Careonys-Marketplace se convierte en una cuarta aplicación
del monorepo de `careonys` o si algunas de sus pantallas ya existen allá. Eso no se puede
resolver leyendo este proyecto solo, y queda señalado como pregunta abierta al final.

Este inventario se apoya en el código y en nada más. Cada afirmación cita archivo y renglón.

---

## 1. Inventario de pantallas

Son **12 páginas HTML** de aplicación, 7.082 renglones en total. No hay ruteo: cada pantalla es
un archivo `.html` y la navegación es un enlace común de una página a otra, con recarga completa
del navegador.

### 1.1 Sitio público (raíz del proyecto)

| Archivo | Renglones | Función |
|---|---:|---|
| `index.html` | 524 | Portada. Presentación del servicio, secciones informativas y formulario de contacto. |
| `directorio.html` | 550 | Listado de asistentes con buscador y cuatro filtros (zona, tipo, especialidad, verificación). |
| `perfil.html` | 654 | Ficha pública de un asistente. Se elige con `?id=` en la dirección. |
| `solicitar-asistente.html` | 407 | Página informativa para familias, con formulario de solicitud que sí graba en la base. |
| `registrar-asistente.html` | 1101 | Alta de asistentes. Asistente paso a paso de 5 pasos con carga de documentos. |
| `formulario-integral.html` | 514 | Asistente paso a paso de 6 pasos para publicar una búsqueda de cuidado. |
| `cursos.html` | 197 | Listado de cursos. Los seis cursos y el desplegable de inscripción salen del catálogo. |
| `soporte-remoto.html` | 195 | Página informativa de acompañamiento online. Contenido fijo salvo el desplegable, que sale del catálogo. |

### 1.2 Pantallas de aplicación

| Archivo | Renglones | Función |
|---|---:|---|
| `mockup-app.html` | 783 | Aplicación móvil simulada dentro de una sola página: ingreso, registro, inicio, reportes de cuidado, fichado por GPS y chat. Cambia de pantalla mostrando y ocultando bloques. |
| `panel-prestadora.html` | 309 | Panel interno. Tabla de postulantes, indicadores y ventana de auditoría de legajos con aprobar/rechazar. |
| `pwa-asistente/index.html` | 775 | Aplicación instalable para asistentes: ingreso, estado del legajo, fichado GPS, reportes de cuidado y postulación. |
| `pwa-familia/index.html` | 953 | Aplicación instalable para familias: ingreso, recomendados, reportes de cuidado y publicación de búsquedas. |

### 1.3 Cómo se navega

- **Barra de navegación repetida**: las ocho páginas del sitio público llevan el mismo menú
  copiado en el HTML de cada una (portada, directorio, solicitar, postulación, cursos, soporte).
  Está duplicado ocho veces.
- **De directorio a perfil**: `perfil.html?id=N`.
- **Dentro de las tres pantallas de aplicación** (`mockup-app`, `pwa-asistente`, `pwa-familia`)
  la navegación es interna: una función `navigate(screenId)` muestra un bloque y oculta los
  demás. Es un ruteo casero de una sola página, sin dirección propia por pantalla; el botón
  "atrás" del navegador no lo acompaña.
- **Redirecciones por código**: `main.js` manda a `formulario-integral.html` al enviar el
  formulario de contacto; `mockup-app.html` manda a `panel-prestadora.html`,
  `registrar-asistente.html` o `formulario-integral.html` según el rol o la elección.
- **Páginas huérfanas**: a `mockup-app.html` sólo se llega desde el botón "Contactar" del
  directorio. A `panel-prestadora.html` sólo se llega por redirección tras ingresar con rol
  administrativo: ningún enlace del sitio la menciona.
- **Las dos aplicaciones instalables están casi desconectadas** del sitio: sólo enlazan hacia
  afuera (`../cursos.html`, `../directorio.html`, `../soporte-remoto.html`) y ninguna página del
  sitio enlaza hacia ellas.

---

## 2. El JavaScript

### 2.1 Archivos propios

Hay **7 archivos JavaScript distintos** que corren en el navegador, pero cuatro de ellos están
copiados en tres carpetas, así que en disco se ven 17. Aparte están los service workers de cada
PWA y los guiones de línea de comandos.

| Archivo | Renglones | Qué hace |
|---|---:|---|
| `js/identidad.js` | 108 | El único lugar donde está escrito el nombre comercial. Resuelve los marcadores `{{producto}}`, `{{productoCorto}}`, `{{dominio}}` y `{{contacto}}` al cargar cada página. |
| `js/texto.js` | 99 | El único lugar donde se escapa un dato antes de meterlo en HTML, y el único que traduce una falla a una frase mostrable. Lo cargan las catorce pantallas. El clasificador de errores vivía en `js/auth.js` y se mudó acá: un mensaje de error es texto, no es sesión. |
| `js/apiClient.js` | 474 | Capa de acceso a datos. Resolución de inquilino (multi-cliente), y lectura y escritura contra Supabase con traducción de nombres de campos. Es la única fuente de datos de personas desde que se sacó el camino de imitación. |
| `js/auth.js` | 171 | Ingreso, registro, cierre de sesión, subida de archivos y suscripción en tiempo real, todo sobre el SDK de Supabase. |
| `js/catalogo.js` | 422 | Lee los archivos de `data/` y llena con ellos las listas, las grillas y los textos declarados en las pantallas. Pone los textos con `textContent`, nunca armando marcado. |
| `js/fichas-legajo.js` | 265 | Arma las fichas del legajo del asistente a partir de su definición en el catálogo. |
| `js/main.js` | 284 | Comportamiento global del sitio: menú, desplazamiento suave, validación de formularios, filtros del directorio, asistente de 6 pasos y ventana simulada de videollamada. |
| `pwa-asistente/service-worker.js` | 78 | Caché para uso sin conexión de la aplicación de asistentes. Guarda también `js/texto.js`: sin él las pantallas no dibujan nada. |
| `pwa-familia/service-worker.js` | 78 | Ídem para la de familias. |

Los guiones de línea de comandos.

<!-- guiones: lo escribe scripts/medir_estado.mjs, no se edita a mano -->

En `scripts/` hay **61 archivos `.mjs` y uno de Python**: 31 chequeos `verificar_*`, 13 pruebas `probar_*` y 17 herramientas sueltas —medidores, generadores, el módulo que comparten y el servidor de trabajo—.

<!-- fin de los guiones -->

Acá están los que conviene conocer para trabajar; los demás no hace falta recordarlos,
porque `verificar_todo.mjs` busca solo todo `verificar_*.mjs` de la carpeta y
`probar_todo.mjs` lleva la lista de las pruebas que corren contra la base de esta máquina.

**Esa cuenta no se escribe a mano**, y es la que muestra mejor por qué: la escrita a mano
decía «51 archivos `.mjs`» y «doce herramientas sueltas», con «Contado el 31 de agosto de
2026» al lado —el mismo día en que ya eran 52 y trece, porque `scripts/listar.mjs` se
agregó unas horas después de contar—. **Una fecha avisa de que el número pudo cambiar, no
de que cambió.** Ahora la escribe `node scripts/medir_estado.mjs --escribir` y la compara
antes de cada `commit` `scripts/verificar_estado.mjs`.

| Archivo | Qué hace |
|---|---|
| `scripts/generar_manifiestos.mjs` | Escribe los dos `manifest.json` desde la identidad. Hacen falta generados porque el navegador los lee como archivo, sin pasar por ninguna página: ahí no hay JavaScript que resuelva un marcador. |
| `scripts/verificar_copias.mjs` | Compara byte a byte los ocho archivos que viven repetidos en dos o tres carpetas y falla si alguno se separó. Cuando encuentra una diferencia dice cuál de los dos es más nuevo, para no pisar el cambio bueno. |
| `scripts/revisar_base.mjs` | Sonda de solo lectura: pregunta qué tablas puede enumerar y leer alguien **sin sesión**, y si alguna le muestra dos Prestadoras distintas. Se corre en el momento en que la base vuelva a responder, antes de cargar el primer dato. No escribe ni borra nada, y se niega a correr contra una base que no sea la de este proyecto. |
| `scripts/verificar_estado.mjs` | Que **los cuatro bloques medidos** sean los que salen de medir los archivos, y no unos escritos a mano que quedaron viejos: la tabla de números del README, el reparto de estilos por pantalla de `docs/PENDIENTES.md`, las hojas de estilo del §5.1 de este archivo y la cuenta de guiones que abre esta misma lista, los tres últimos entre marcas. Compara contra `scripts/medir_estado.mjs`, sin la fecha —cambia todos los días—, y también se pone en rojo si alguien saca las marcas. Se arregla con `node scripts/medir_estado.mjs --escribir`. |
| `scripts/verificar_pendientes.mjs` | Falla si algún archivo del proyecto nombra «pendiente N» y ese N ya no es una fila abierta de `docs/PENDIENTES.md`, salvo que el texto diga ahí mismo que se cerró —basta el tiempo verbal: «eran el pendiente 15»—. Existe por lo del 31 de agosto de 2026: una prueba de seguridad estuvo en rojo cinco días y nadie la miró, porque su encabezado decía que el rojo era el pendiente 67 y ese pendiente ya estaba cerrado. **Una roja esperada contra un número que no existe es un permiso permanente para no mirar.** Deja afuera a propósito `docs/ALCANCE.md`, los `docs/PLAN_*.md` y las migraciones, que narran un momento con fecha. |
| `scripts/probar_aislamiento.mjs` | Las cincuenta y ocho comprobaciones de que una Prestadora no ve los datos de la otra, y de que dos Familias de la misma Prestadora tampoco se ven entre sí (la regla de la empresa «aislamiento entre Organizaciones»). Necesita las dos Prestadoras ficticias cargadas: con una sola, ver una sola no prueba nada. **Se corre con `--local`**: contra el servidor publicado el alta pide confirmar el correo y la prueba no llega a tener sesión (pendiente 45). **Y con `--local` borra las cuatro cuentas que crea, incluida la que asciende a coordinador**: hasta el 31 de agosto de 2026 las dejaba, y había diecisiete cuentas ficticias con rol `coordinador` sobre PresDemo, una por corrida. Lo que comprueba al final no es que borró las que anotó sino que la base quedó con **el mismo total de cuentas** que tenía al empezar, porque una cuenta creada por un camino que ninguna lista anotó daría igual el mensaje de éxito. |
| `scripts/probar_consulta_publica.mjs` | Pregunta si una visita del portal, sin sesión, puede dejar su consulta en `avisos`. Es el mismo alta que hacen los cinco formularios de consulta. Trae su sostén —la misma fila, con una cuenta recién creada—, sin el cual una tabla cerrada para todos daría el mismo rojo y la prueba no distinguiría nada. Contestó **401 sin sesión y 403 con cuenta nueva** el 26 de agosto de 2026, y de ahí salió lo que hace `js/formulario-consulta.js`. Lee la dirección y la clave pública de la base local por `supabase status` adentro del guion, sin mostrarlas. |
| `scripts/probar_coherencia_de_la_siembra.mjs` | Mira la siembra ficticia como si fuera de un cliente. Trae los datos con `supabase db dump --local --data-only` y el esquema con el mismo comando sin `--data-only`, y comprueba cuatro cosas: que ninguna fila pertenezca a una Prestadora que no existe, que ninguna apunte a una fila de **otra** Prestadora —el aislamiento visto desde los datos y no desde la sesión, porque una política perfecta sobre datos ya mezclados no separa nada— que **ninguna columna quede sin llenarse ni una vez**, y que **ninguna tabla quede sin una sola fila**. La tercera es la que importa: una columna que la siembra no llena nunca no se ve en ninguna pantalla, porque la pantalla se dibuja igual; lo que no se ve es que nada la está probando, y la consulta que la olvida y la que la trae contestan lo mismo. Es el argumento de la migración 0027 aplicado a la siembra entera. Los exentos viven en `LA_SIEMBRA_NO_PUEDE`, cada uno con el motivo por el que una migración no puede llenarlo —los dos `archivo_url`, que están en el depósito; `tenants.estado_fijado_en`; `experiencia_laboral_asistente.puesto_otro`; `tenants.referencia_celtatech`, que la 0025 dice que las ficticias nunca van a tener; `avisos.grid_schedule_7x3`, que la 0016 reemplazó por filas; y `caregivers.user_id` con `avisos.familia_id`, que apuntan a una cuenta y por eso las recorre `probar_aislamiento.mjs` y no la siembra—. **Para eximir no alcanza con que una migración no pueda: tiene que haber algo que sí la recorra**, y por eso `verificaciones_asistente.verificado_por` sigue contando aunque tampoco se pueda sembrar —a ésa no la escribe nadie—. Es el pendiente 110 y **hoy tiene que dar rojo**: el 31 de agosto de 2026 encontró catorce columnas vacías de las 225 que miró —entre ellas el `tenant_id` de cinco catálogos de dos escalones, que dejaba sin una sola fila que la ejercite a la mitad `tenant_id = prestadora_actual()` de cinco políticas de RLS—; **la migración 0048 cerró cinco el mismo día** y dos más quedaron exentas, con lo que quedan siete. **Y la cuarta comprobación es el pendiente 111**, agregado el mismo día: encontró cuatro tablas de las 29 del esquema sin una sola fila —`clock_ins`, `documentos_asistente`, `messages` y `reportes`— y **hoy quedan tres**, porque la migración 0049 sembró nueve fichadas. Esa migración salió de un tropiezo que conviene tener a la vista: apretar el botón de la aplicación del Asistente dejó filas de verdad en `clock_ins` y en `reportes`, la comprobación las contó y se puso verde, y **ninguna migración las repone**, así que la primera base armada desde cero volvía a tenerlas vacías. Verde hoy y rojo mañana sin que nadie tocara nada. Por eso lo escrito a mano se borra —`scripts/soltar_asistente_local.mjs`— y lo que queda es lo sembrado. Hace falta el segundo volcado para verlas, porque **el volcado de datos sólo nombra las tablas que tienen filas**: una tabla entera sin sembrar no aparece en ningún renglón, y sin el esquema «ninguna tabla vacía» sería verdad porque no habría ninguna a la vista. Sus exentos van aparte, en `LA_SIEMBRA_NO_PUEDE_TABLA`, con el mismo criterio de dos mitades; hoy no hay ninguna adentro. **Sólo corre contra la base de esta máquina, y con `--linked` se niega**: en la publicada una columna llena por alguien de verdad taparía justo el hueco. Antes de mirar nada se planta si el volcado vino vacío, si no entendió ni una fila, si el separador de valores no distingue lleno de vacío —uno roto pondría media base en rojo, o toda en verde— o si no están las tres Prestadoras. Lo que esta máquina tenga fuera de las migraciones se cuenta igual, y eso sólo puede **tapar** un hueco, nunca inventarlo: lo que encuentra es real, y lo que no encuentra se lee limpio recién después de un `db reset --local`. |
| `scripts/probar_perdida_de_corpus.mjs` | Le saca el corpus a la red entera y mira quién avisa, de dos maneras. **Se lo achica:** copia el proyecto a una carpeta temporal, le renombra todos los `.js` a `.ts` y corre la red de los dos lados. Cada chequeo cae en uno de tres lugares y sólo el tercero es un problema: se plantó —notó que le faltaban archivos y lo dijo—, dijo exactamente lo mismo —no mira los `.js`—, o **dijo ✔ con otro número**, que es revisar menos archivos y contarlo como éxito. Es el pendiente 91 y **hoy tiene que dar rojo**: el 31 de agosto de 2026 dio trece plantados, cinco que no miran los `.js` y nueve ciegos. Reemplaza a una medición hecha a mano ese mismo día, que había contado ocho —se le había pasado `estilos`—. Deja afuera a `verificar_todo.mjs`, que no es un chequeo sino el que los corre, y a `verificar_guias.mjs`, que sale a la red y cambia de texto según qué conteste el servidor. **Y deja afuera, sin lista escrita a mano, al que ya sale en rojo en la copia sin tocar**: la red corre en la copia antes de renombrar nada, y ese rojo no viene del corpus sino de algo que la copia no tiene. Hasta el 31 de agosto de 2026 se los acreditaba entre los que se plantaron, y eran tres: `deriva` y `sinconexion` le preguntan al historial de `git`, y `referencias` sigue citas que salen del proyecto. Un chequeo acreditado de más es un chequeo que nadie vuelve a mirar. **Se lo saca entero:** copia sólo `scripts/` —ningún `.html`, ningún `.css`, ningún `.js`, ningún `.md`— y corre la red ahí; el que diga ✔ sin un solo archivo que revisar no está diciendo que todo esté bien sino que no miró. Es el pendiente 69, cerrado el 28 de agosto de 2026, y **hoy da verde**: 26 plantados de 27, y el único verde es el exento. Existe porque `verificar_red.mjs` comprueba esa misma guarda **leyendo** —que el chequeo *nombre* a `hayArchivos` o a `seRevisaron`—, y nombrarlas no es plantarse: un chequeo puede llamarlas para un corpus y trabajar con otro. Se comprobó escribiendo uno así: la mitad que lee lo dejó pasar y ésta lo agarró. La lista de exentos **no se escribe acá**: sale de `ARMAN_SU_PROPIO_CORPUS`, en `scripts/recorrido.mjs`, pegada a la guarda de la que exime y compartida con `verificar_red.mjs`. Se planta si la copia salió vacía, si no hubo `.js` que renombrar, si ningún chequeo mira los `.js` o si alguno ya viene fallando acá: comparar contra una base en rojo no dice nada. |
| `scripts/probar_pisado_de_archivos.mjs` | Sube dos veces un papel ficticio al mismo camino y pregunta si el primero sigue estando. Es el pendiente 89, y **hoy tiene que dar rojo**: `Sesion.uploadFile` sube con `upsert: true` (`js/auth.js:182`) y las dos puntas arman siempre el mismo camino (`registrar-asistente.html:1012`, `js/fichas-legajo.js:307`), así que el papel anterior desaparece sin aviso —y puede ser el que la Prestadora miró para sellar el legajo—. Mide **las dos causas por separado** para no depender de cuál de las tres salidas se elija: si se prohíbe pisar, la segunda subida vuelve rechazada; si el camino pasa a llevar la fecha, la segunda cae en otro lado. Con que se corte una alcanza, y las dos se comprobaron en verde antes de dejarla. La tercera salida —que el depósito guarde versiones— no se mide desde acá y el guion lo dice. Mide además un segundo caso que no necesita subir el mismo papel dos veces: como `fichas-legajo.js` numera los archivos por posición en la lista, sacar una fila del medio y guardar pisa el papel de otra fila y deja un archivo suelto que ya no nombra nadie. |
| `scripts/probar_permisos_en_vivo.mjs` | Pregunta a la base, con una sesión y sin ella, qué funciones puede llamar cada quien, y falla si alguien alcanza una que no está en la lista de puertas abiertas a propósito. **No lleva la lista: la importa** de `AL_ALCANCE_ANONIMO` en `scripts/verificar_esquema.mjs`, donde cada puerta tiene escrito su motivo y la migración que la abrió. Tenía la suya, con tres, y cuando las migraciones 0035, 0038 y 0041 abrieron tres más —bien abiertas, con motivo— la prueba se puso en rojo y así se quedó cinco días, porque el rojo figuraba como esperado. Una lista repetida se despega, y la que se despega es la que nadie mira. |
| `scripts/comparar_bases.mjs` | Compara la base publicada contra la que arman las migraciones: reconstruye una local desde cero, vuelca las dos igual y las compara fila por fila y columna por columna. Rompe si una misma fila dice cosas distintas o si falta una que las migraciones cargan; muestra aparte, para que las mire una persona, las que están publicadas y ninguna migración carga, porque un guion no puede saber si son un desvío o alguien que usó el producto. Se llama a mano: necesita red. |
| `scripts/verificar_guiones.mjs` | Falla si algún bloque `<script>` escrito adentro de una pantalla, o algún archivo de `js/`, tiene un error de sintaxis. Existe porque el navegador, ante un error así, descarta el bloque entero y sigue: la pantalla se dibuja igual y no funciona nada, sin aviso. Encontró uno el 24 de agosto de 2026. |
| `scripts/verificar_trato.mjs` | Falla si el texto visible tutea a quien lo lee («trato de usted»). Mira el texto entre etiquetas, los atributos que se ven, las cadenas de los bloques `<script>`, las de `js/` y las del catálogo. No mira el imperativo en tú sin acento, que es idéntico a una tercera persona y necesita ojos. |
| `scripts/verificar_escapado.mjs` | Falla si una plantilla que arma HTML mete adentro un dato sin pasarlo por `Texto.escapar`, si el texto crudo de un error llega a la pantalla en vez de a la consola, o si un `onclick` escrito en el marcado interpola algo —ahí escapar no sirve, porque el navegador deshace el escapado del atributo antes de leerlo como código—. Deja pasar lo que el propio programa decide: un `condición ? 'esto' : 'aquello'` devuelve siempre uno de los dos textos escritos a la vista. No sigue el rastro de una variable, así que un dato copiado antes a una variable local se le escapa. |
| `scripts/verificar_claves.mjs` | Falla si una migración siembra, en una columna gobernada por un vocabulario, un valor que ese vocabulario no tiene. La base acepta cualquier texto; la pantalla no: `js/catalogo.js` muestra la clave cruda cuando no encuentra su etiqueta, y el filtro que ofrece el catálogo busca por la clave buena. |
| `scripts/verificar_identidad.mjs` | Falla —código de salida 1— si el nombre, el dominio o el correo aparecen escritos a mano fuera de `js/identidad.js`. Verifica además que los manifiestos estén al día, y le pide a `verificar_copias.mjs` la comparación de las tres copias del archivo de identidad, para no tener dos veces escrita la misma revisión. Ignora la documentación y los comentarios del código. |
| `scripts/verificar_clases.mjs` | Falla si el marcado nombra en un `class="…"` una clase que ninguna hoja `.css` declara, que ningún `<style>` de una pantalla declara y que ningún guion menciona entre comillas —esto último porque una clase también sirve de agarradera para el programa y ésas no se dibujan—. Nombrar una que no existe no rompe nada, y por eso dura: el marcado afirma que ese campo tiene estilo propio, y el día que haya que cambiarlo no está en la hoja. Font Awesome es la única familia exenta, por venir de afuera, y se saltea por prefijo. |
| `scripts/verificar_base.mjs` | Falla si la dirección de la base o su clave publicable aparecen escritas fuera de `js/apiClient.js` y sus dos copias registradas —la lista de dónde se permite sale de `scripts/verificar_copias.mjs:27`, no de una segunda lista escrita acá—. Mira además que `js/auth.js` las siga sacando de `ClienteDatos` con una asignación, que toda pantalla que carga `js/auth.js` cargue antes `js/apiClient.js`, y que en ningún archivo del proyecto haya una clave con forma de secreta ni un token con forma de JWT, esto último sin exentos. No escribe adentro ninguno de los valores que busca: los lee del proyecto, y los de su autoprueba los arma por pedazos. |
| `scripts/verificar_esquema.mjs` | Las nueve reglas que se escriben en una migración: RLS encendida en toda tabla nueva; permiso revocado a `PUBLIC` y a `anon` en toda función que se saltea la RLS; columna de la Organización; clave primaria `uuid`; moneda al lado de todo importe; siembra que recorre las Prestadoras con disparador sobre `tenants`; **política del depósito de archivos que nombre la Organización**; **la Organización resuelta por la membresía, nunca por un valor que venga en el pedido**; y **ningún permiso de tabla que conceda `all` ni `truncate`**. La séptima es la única política que este chequeo lee, y por un motivo: en una tabla, si la política se equivoca, todavía queda la columna de la Organización a la vista y las otras reglas la miran; en el depósito **no hay columna que mirar** —el camino es una cadena de texto—, así que la condición es lo único que separa a una Prestadora de otra. Por eso su exención pide dos cosas y no una: el motivo **y qué sostiene el aislamiento en su lugar**. La octava es la única regla del archivo **sin lista de exenciones, y a propósito**: hoy no hay ningún caso, así que la lista nacería vacía, y una lista vacía no la puede probar `scripts/probar_exenciones.mjs` —vaciar lo que ya está vacío no pone rojo a nadie—. Sería una exención sin guarda, que es justo la enfermedad que este proyecto viene persiguiendo. La novena viene del hallazgo de la 0032: `truncate` no mira ninguna política —la RLS filtra filas, y vaciar la tabla no es filtrar filas—, así que cualquiera con sesión podía vaciar diecisiete tablas. Rige **desde la 0032 y no antes**, porque la 0001 es el volcado de la instalación con veintiún `GRANT ALL ON TABLE` adentro, catorce de ellos a `anon` o a `authenticated`, y una migración aplicada no se edita: el límite no es una exención, es la migración que cerró la puerta. Mira lo que **abre de más**, no lo que abre de menos: que una tabla nueva se olvide de conceder sus permisos no se avisa, porque desde la 0032 nace sin ninguno y falla cerrada, que es la dirección segura. Es además de donde salen `columnasDeclaradas()`, la única lectura de las migraciones del proyecto, y `AL_ALCANCE_ANONIMO`, que importa `scripts/probar_permisos_en_vivo.mjs`. |
| `scripts/verificar_opciones.mjs` | Falla si una pantalla trae escrita adentro una opción de un desplegable con su `value` puesto a mano. La regla de la empresa es de un renglón —«los catálogos salen de la base; una lista de opciones nunca se escribe adentro de una pantalla»— y la del producto dice qué pasa cuando no se cumple: «cada lista de opciones que hoy esté escrita adentro de un componente es una tabla que alguien no creó» (`CLAUDE.md:42`). Lo que está en juego no es el texto sin traducir: es **un valor que se guarda en la base y que ningún vocabulario gobierna**, y `scripts/verificar_claves.mjs` no puede mirar una columna sin vocabulario. Así llegó `avisos.schedule_type` a tener cuatro formas de decir lo mismo, una por pantalla (pendiente 31); esto es lo que impide que entre la quinta. No cuenta el `value=""` que abre un desplegable, ni un `<option>` nombrado adentro de un comentario, ni las opciones que un guion arma desde datos, que son la forma correcta. La exención no perdona la pantalla entera sino **los valores exactos**: una opción nueva en el mismo archivo se planta igual. Hoy hay tres, los horarios de turno de `solicitar-asistente.html`, que salen de ahí el día que se cierre el pendiente 31. |
| `scripts/probar_exenciones.mjs` | Prueba que cada exención siga eximiendo algo. Una exención es un permiso escrito a mano —«este archivo no cumple la regla, y acá está el motivo»—, y cuando el motivo deja de valer no se apaga sola: sigue perdonando el aire. Y eso no es inofensivo, porque casi todas están escritas **por archivo** y el chequeo saltea el archivo entero, con todo lo demás que miraría adentro. No lee la exención para juzgarla: **la vacía y corre el chequeo**. Si se pone rojo, la exención contenía algo; si sigue verde, ya no exime nada. **Arranca por el control negativo**, con dos chequeos de mentira en una carpeta aparte —uno con una exención viva y otro con una muerta—, y si no encuentra exactamente la muerta se corta ahí y no informa nada del proyecto. Mira las escritas como `new Map` con al menos una entrada, en los chequeos y en los módulos que importan; el `Map` es la forma que este proyecto usa para guardar el permiso **con su motivo al lado**. Deja afuera las de las pruebas —necesitan la base—, `verificar_todo.mjs`, que no es un chequeo, y `verificar_guias.mjs`, que sale a la red. Toca los archivos y los restituye, y al terminar comprueba que hayan quedado idénticos. Existe por lo que apareció el 31 de agosto de 2026: `verificar_vocabulario.mjs` eximía a `soporte-remoto.html` por una palabra que esa pantalla ya no tenía —se la llevó el paso a i18n— y con eso la dejaba afuera también de las otras dos palabras que ese chequeo mira. Se comprobó que puede fallar volviendo a poner esa exención muerta: la nombró y salió en rojo. |
| `scripts/probar_todo.mjs` | Corre de una vez las pruebas que no entran en el gancho de `commit` y falla si falla alguna. La lista vive adentro del guion y acá no se copia, porque una lista escrita dos veces se arregla una sola. Casi todas van contra la base de esta máquina —registran cuentas ficticias, les hacen escribir y subir papeles, y preguntan quién ve qué—; **dos no necesitan ni base ni red y se miran a la red de chequeos a sí misma**: `probar_perdida_de_corpus`, que le saca el corpus, y `probar_exenciones`, que le vacía los permisos escritos a mano. Esas dos quedan afuera del gancho porque corren la red entera muchas veces. **Ninguna entra en `verificar_todo.mjs`**: el gancho de `commit` corre sin base, sin red y sin tiempo para eso. Lleva anotadas las rojas a propósito con el pendiente que las explica, y **falla igual si una de ésas pasa**, porque entonces el pendiente está cerrado y la lista quedó vieja. **Y antes de correr una sola prueba comprueba que ese pendiente siga abierto** en `docs/PENDIENTES.md`: sin eso una roja queda perdonada para siempre apuntando a un número que ya no existe, que es exactamente lo que pasó con `probar_permisos_en_vivo.mjs` y el pendiente 67, ya cerrado. Nombra las dos que deja afuera —`probar_alta_y_baja.mjs` y `probar_consulta_publica.mjs`, que van contra el servidor publicado— para que nadie cuente las de la lista y crea que están todas. Existe porque las dos cosas que se destaparon el 31 de agosto de 2026 fueron lo mismo: una herramienta que hay que acordarse de correr es una herramienta que no corre. |
| `scripts/verificar_todo.mjs` | Corre todos los chequeos de una vez y falla si falla alguno. No lleva la lista escrita adentro: busca en `scripts/` todo `verificar_*.mjs`, así que el próximo entra solo. Es lo que llama el gancho `pre-commit` |
| `.githooks/pre-commit` | El gancho que git corre antes de cada commit. Frena el commit si algún chequeo falla. Para que git lo use hay que decírselo una vez por máquina: `git config core.hooksPath .githooks` |
| `scripts/servidor_local.py` | El servidor para mirar las pantallas mientras se trabaja. Es `python -m http.server` con cuatro diferencias, y cada una es el motivo de que exista. **No deja guardar copias**, porque si no el navegador sigue mostrando la versión vieja de un archivo después de haberlo cambiado, sin avisar (fue el pendiente 42, cerrado). **No publica las cajas fuertes** ni `.git`: hasta el 30 de agosto de 2026 publicaba la carpeta entera, y adentro hay una. **Sabe apuntar a la base de esta máquina** con `--base-local`, cambiando la dirección en el texto que sale por la red y nunca en el archivo. **Y acepta 128 conexiones esperando** en vez de las 5 de fábrica: una pantalla pide nueve archivos a la vez y el sistema cortaba las que sobraban, que se veía como `js/auth.js` que no llegaba una recarga sí y otra no. |
| `scripts/preparar_coordinadores_locales.mjs` | Deja dos cuentas con rol `coordinador`, una en cada Prestadora ficticia, **sólo en la base de esta máquina**: se planta si la dirección no es local. Existen porque las pantallas del panel piden ese rol y ese rol no se puede pedir al registrarse —lo filtra el disparador de la migración 0005 a propósito—, así que sin ellas lo que se comprobaba era la política y nunca la pantalla. No inventa ninguna clave: la toma de `CLAVE_PRUEBA_LOCAL` y sin esa variable no corre. |
| `scripts/preparar_asistente_local.mjs` | Deja la cuenta `asistente.presdemo@ejemplo.com` **con un legajo de la siembra enganchado detrás**, sólo en la base de esta máquina. Hace falta porque las dos cosas que la aplicación del Asistente escribe —la fichada y el reporte— cuelgan del **legajo** y no de la cuenta, que son dos identificadores distintos: sin legajo detrás, esa pantalla no se puede mirar andando. Engancha uno que ya exista en vez de inventarlo, para mirarla con un legajo que tiene nombre, fichas y verificaciones. La clave sale de `CLAVE_PRUEBA_LOCAL` y no queda escrita en ningún lado; si falta, se planta. No le saca el legajo a nadie: si el que iba a tomar ya tiene cuenta, busca el siguiente libre. |
| `scripts/soltar_asistente_local.mjs` | Lo contrario del anterior: borra lo que se escribió mirando la pantalla, le suelta el legajo a la cuenta y después borra la cuenta, en ese orden. **No borra el legajo**, que es de la siembra. Sí borra la fichada y el reporte escritos a mano, y ahí está lo que costó entender: parecían inofensivos y no lo son, porque le contestan «sí» a la comprobación de tablas vacías sin que ninguna migración los reponga. Los distingue **sin ninguna lista escrita a mano**: una fila cuyo identificador nombra alguna migración es de la siembra y se queda; una que no la nombra ninguna la escribió una persona y se va. Lista y no toca nada; borra sólo con `--borrar`, y sólo contra la base de esta máquina. |
| `scripts/recorrido.mjs` | No es un guion: es lo que ningún chequeo abre —las cajas fuertes de la bóveda, las carpetas `Exclusivo <cliente>`, los archivos que anuncian una clave en el nombre, las dependencias, el estado de las herramientas—, la extensión de las pantallas y el recorrido que todos usan. Estaba copiada en cuatro archivos con cuatro contenidos distintos, y la mitad de la regla de la bóveda vivía en un quinto hasta el 31 de agosto de 2026. |
| `scripts/citas.mjs` | Tampoco es un guion: es qué cuenta como una cita —`archivo.ext:123`, y la forma corta `` `:407` `` que hereda el archivo de la de al lado— y qué documentos no se corrigen porque son una foto fechada. Lo comparten los dos chequeos de citas. Nació el 31 de agosto de 2026, cuando el segundo hizo falta: escrita dos veces, la lista de exentos se entera tarde. |
| `scripts/verificar_deriva.mjs` | El hermano de `verificar_referencias.mjs`, que pregunta otra cosa: aquél, si la cita apunta **a algo**; éste, si apunta **a lo que dice**. Le pregunta a `git blame` qué commit escribió el renglón de la cita, a `git cat-file` cómo era el archivo citado ese día, y busca el texto de aquel renglón en el archivo de hoy. Sin heurística: sólo avisa cuando el texto era único entonces y es único ahora. Con `--arreglar` corrige el número. El día que se escribió encontró 67 citas corridas con el otro chequeo en verde. |
| `scripts/verificar_red.mjs` | El chequeo que revisa a los chequeos, en cinco cosas: que ninguno pueda recorrer cero archivos y decir ✔ igual —tiene que llamar a `seRevisaron()` o a `hayArchivos()`, y leído sin comentarios, para que nombrarlas en el encabezado no cuente—; que ninguno escriba a mano la extensión de las pantallas en vez de pedirla a `recorrido.mjs`, ni la esconda adentro de la **clave** de una exención, que es la misma atadura donde la regla del literal suelto no la ve —así la tenía `verificar_estados.mjs` hasta el 31 de agosto de 2026—; que ninguna exención nombre un archivo que ya no está ni una columna que ninguna migración declara; y que la tabla `| Chequeo | Qué impide que vuelva |` del README los nombre a todos y a ninguno de más. Lo último se agregó el 31 de agosto de 2026, cuando esa tabla llevaba **cuatro chequeos de atraso**. Lo de las exenciones perdidas, el mismo día, y **son las únicas de las cinco que se miran sobre todos los guiones de `scripts/`, no sólo sobre los chequeos**: llegan así a las exenciones de las pruebas, que `scripts/probar_exenciones.mjs` no puede vaciar sin la base de esta máquina, que fue el pendiente 114, cerrado. Una exención que ya no exime nada no queda inofensiva: casi todas están escritas **por archivo**, así que el chequeo se saltea el archivo entero y todo lo que hubiera mirado adentro. Se miran sólo las claves con extensión o barra —las otras nombran una tabla, una columna o un color—, y hay una que se mira **al revés**: `AJENOS`, de `scripts/citas.mjs`, nombra archivos del repositorio de Careonys, así que ahí el error sería que aparecieran acá. Darla vuelta en vez de apagarla es la diferencia entre eximir y dejar de mirar. **Lo de las columnas es la misma enfermedad un escalón más adentro**: las exenciones de la base nombran `tabla.columna`, y una columna renombrada o sacada deja el renglón perdonando algo que no existe. Qué columnas hay sale de `columnasDeclaradas()`, de `scripts/verificar_esquema.mjs`, que es donde vive la lectura de las migraciones: una segunda copia de esa lectura se despega de la primera el día uno. |
| `scripts/limpiar_cuentas_de_prueba.mjs` | Las cuentas ficticias que dejaron las pruebas en la base de esta máquina. **Lista y no toca nada**; borra sólo con `--borrar`. Entra una cuenta únicamente si cumple las tres cosas a la vez: el correo empieza con `prueba.` y termina en `@ejemplo.invalid` —un dominio que por norma no existe—, y **no tiene ningún legajo detrás**. Los legajos los pide con la clave de servicio a propósito: con la anónima la RLS contestaría sólo una parte, y una cuenta con legajo escondido detrás de una política pasaría por vacía. Al terminar vuelve a contar en vez de creerle a la suma de los que dijeron que sí. Existe por las 87 que se habían juntado hasta el 31 de agosto de 2026 (pendiente 113); la fuga que las generaba ya está tapada. El residuo del servidor publicado es otra cosa y va por el pendiente 45. |
| `scripts/listar.mjs` | Los archivos del proyecto **sin las cajas fuertes**, para usar desde la línea de comandos en lugar de un `find` o un `grep -r` tecleados a mano. Recorre con `scripts/recorrido.mjs`, así que trae puesto el mismo guardián que los veintiocho chequeos y el que prueba `verificar_cajas.mjs`. Existe porque la regla de la bóveda ya falló cuatro veces —el 26 y el 28 de agosto de 2026, y dos más el 31—, y las cuatro por lo mismo: **la regla estaba en la cabeza de quien tecleaba y no en la herramienta**. `node scripts/listar.mjs .html` lista sólo ésas; `--buscar "patrón"` contesta `archivo:renglón: texto`, que es la forma en que este proyecto cita, y sale con 1 cuando no encontró nada, para que sirva adentro de una condición. **Y el patrón es una expresión regular de JavaScript, no de grep**, que se parecen hasta que dejan de parecerse: los siete escapes que en grep encienden algo —`\|`, `\(`, `\)`, `\{`, `\}`, `\+`, `\?`— acá apagan, así que `a\|b` no busca «a o b» sino el texto «a|b». Eso dio un falso negativo el 31 de agosto de 2026 y la respuesta parecía una respuesta: **un buscador que no entiende el patrón no dice que no entiende, dice que no hay.** Desde ese día, cuando no encuentra nada **y** el patrón trae alguno de esos escapes, lo vuelve a buscar leyéndolo como lo leería grep y avisa **sólo si así sí aparece**, diciendo cuántos renglones. Es un control positivo, no una sospecha: a quien busque de verdad un `|` suelto la segunda lectura tampoco le encuentra nada y el aviso no sale. |

**Duplicación verificada por firma digital**: `js/apiClient.js`, `pwa-asistente/js/apiClient.js`
y `pwa-familia/js/apiClient.js` son **idénticos byte a byte**. Lo mismo pasa con las tres copias
de `auth.js`, con las tres de `identidad.js`, con las tres de `texto.js` y con las dos copias de `css/styles-pwa.css`. Ninguna de esas copias se puede
separar en silencio: `scripts/verificar_copias.mjs` las compara byte a byte y falla si alguna
cambió sola. Son 1.082 renglones de copias exactas
que hoy hay que mantener en tres lugares a la vez.

### 2.2 JavaScript escrito adentro del HTML

Además de los archivos anteriores hay **1.598 renglones de JavaScript metidos dentro de las
etiquetas `<script>` de las páginas**:

| Página | Renglones adentro |
|---|---:|
| `mockup-app.html` | 371 |
| `perfil.html` | 331 |
| `registrar-asistente.html` | 261 |
| `pwa-asistente/index.html` | 257 |
| `pwa-familia/index.html` | 177 |
| `panel-prestadora.html` | 90 |
| `directorio.html` | 68 |
| `solicitar-asistente.html` | 43 |

**Total de JavaScript propio: unos 2.500 renglones sin contar las copias** (1.061 en archivos
distintos más 1.598 adentro del HTML, menos el código muerto).

### 2.3 Las tres capas que pidió separar

**Están mezcladas.** No hay separación por archivo; lo más cerca de una capa aislada es
`apiClient.js`, y aun así hace tres cosas a la vez.

**Lógica de negocio (cálculos, validaciones, transformaciones).** Es la capa más flaca del
proyecto y está desparramada:

- *Traducción de datos*: `_mapFromDatabase` y `_mapToDatabase` en `js/apiClient.js:305-400`
  convierten entre el vocabulario de la pantalla (`nombre`, `zona`, `patologias`) y el de la
  base (`full_name`, `zone`, `pathologies`). Es la única lógica de negocio que ya está en una
  función limpia, sin tocar el DOM.
- *Validaciones*: repartidas en tres implementaciones distintas que no se hablan.
  `js/main.js:52-66` valida campos obligatorios y correo pintando bordes en rojo directamente
  sobre el elemento; `registrar-asistente.html` tiene su propia `validatePane()` por paso; las
  aplicaciones instalables tienen la suya. La misma regla está escrita más de una vez.
- *Filtros del directorio*: `js/main.js:98-120`. La lógica de filtrado no trabaja sobre datos,
  trabaja leyendo `card.textContent` del HTML ya dibujado y escondiendo tarjetas con
  `style.display`. No es lógica de negocio separable: es manipulación del DOM disfrazada.
- *Resolución del inquilino*: `initTenant()` en `js/apiClient.js:20-77`. Deduce a qué cliente
  corresponde la visita según el parámetro de la dirección o el subdominio. Es negocio puro y
  está pegado al arranque de la página.

**Cálculos numéricos: no hay.** Ver 2.4.

**Manipulación del DOM y manejo de eventos.** Es, de lejos, la mayor parte del código. Todo
`main.js`, todos los bloques adentro del HTML y buena parte de `apiClient.js`. El patrón que se
repite en todas partes es `document.getElementById(...)` seguido de armar HTML con plantillas de
texto y asignarlo a `innerHTML`. Aparece en el directorio, el panel de la prestadora, el perfil,
las dos aplicaciones instalables y el chat.

Dos casos donde la mezcla es especialmente marcada:

- `_applyBranding()` en `js/apiClient.js:79-118` está adentro del cliente de datos, pero lo que
  hace es tocar el DOM: cambia variables de color, reemplaza logotipos, reescribe textos e
  inyecta una insignia con estilos escritos a mano. Datos y presentación en la misma función.
- `js/main.js:298-306` crea una etiqueta `<style>` desde JavaScript y la agrega al documento
  para definir una animación de aparición.

**Llamadas a servicios externos.** Concentradas casi todas en `apiClient.js` y `auth.js`, con
dos excepciones. Detalle completo en la sección 3.

### 2.4 Funciones que la pantalla muestra y el código no tiene

Se buscaron una por una y no están:

- **Calculadora de presupuesto y horarios**: no existe. No hay ninguna operación aritmética de
  costo en todo el proyecto.
- **Algoritmo de match inteligente**: no existe. Los "98% Match", "95% Match" y "92% Match" son
  **texto fijo escrito a mano en el HTML** (`directorio.html:122`, `mockup-app.html:210`, `216`,
  `429`, `pwa-familia/index.html:840`).
- **Puntos reputacionales y niveles Bronce/Plata/Oro**: son texto fijo por perfil. No hay código
  que los calcule ni que los haga subir.
- **Botón de reemplazo urgente a menos de 5 km**: no hay cálculo de distancia en ninguna parte.

Esto importa para planificar: **la migración no tiene que portar esa lógica, porque no hay
lógica que portar. Hay que escribirla por primera vez**, y eso es trabajo de diseño de producto,
no de traducción de código.

---

## 3. Los datos

### 3.1 De dónde salen

Salen de dos lugares distintos a la vez. Eran cuatro: el 24 de agosto de 2026 se suprimieron el camino de imitación con almacenamiento del navegador y el último JSON suelto de perfiles (pendiente 14).

**a) Supabase, por interfaz REST.** Es la única fuente de datos de personas. `js/apiClient.js`
ya no tiene interruptor para apagarla: el que había (`useSupabase`) valía siempre `true` y cada método
llevaba detrás una copia que escribía en el navegador. Esa copia nunca corría, así que envejecía
sin que nadie lo notara, y en un caso sí corría y era peor: `js/main.js` guardaba la búsqueda de
la familia en el navegador y la pantalla anunciaba éxito. Se sacaron las dos cosas.

**b) Escritos adentro del HTML.** Ya no es la fuente de ninguna pantalla del directorio.
Hasta el 25 de agosto de 2026 lo era: `perfil.html` llevaba ocho fichas completas escritas como
objeto JavaScript —unos 230 renglones— y no consultaba nada, y `directorio.html` tenía ocho
tarjetas escritas a mano. **Las dos leen hoy de la base**: `directorio_de` y
`perfil_del_directorio`, que salen de `directorio` y no devuelven ningún dato de contacto.
Comprobado el 31 de agosto de 2026 leyendo las dos pantallas: cargan `js/apiClient.js`, dibujan
desde un molde `<template>` y no queda ni una ficha escrita adentro.

Lo que sí queda escrito a mano, y es el pendiente 65:

- `pwa-familia/index.html` y `mockup-app.html` traen un recuadro de verificaciones —«Email: ✓
  Validado | Celular: ⌛ Pendiente»— y una ficha de paciente entera que no escribe ningún guion.
  Quien entra lee un estado que nadie consultó.
- `panel-prestadora.html` muestra dos de sus cuatro recuadros con números fijos, que es el
  pendiente 100.
- `cursos.html` ya no: sus seis cursos y su desplegable salen del catálogo.
- `soporte-remoto.html` es contenido fijo salvo su desplegable, que sale del catálogo.

**c) Archivos JSON locales en `data/`.** Son catálogo declarado, no datos de personas, y las
pantallas ya los leen. `data/cuidadores.json` —cuatro perfiles de muestra que no leía nadie— se
borró el 24 de agosto de 2026.

| Archivo | Registros | Qué es |
|---|---:|---|
| `data/catalogo-vocabularios.json` | 24 listas, 142 opciones | El catálogo del producto: perfiles profesionales, zonas, patologías, tareas, modalidades, niveles. Explicado en `docs/CATALOGO.md` |
| `data/catalogo-oferta.json` | 9 servicios, 6 cursos, 1 evaluación | Lo que el producto ofrece |
| `data/catalogo-fichas.json`, `data/catalogo-autorizaciones.json`, `data/catalogo-verificaciones.json` | — | Definiciones de las fichas del legajo |
| `data/catalogo-disponibilidad.json` | 7 días × 3 turnos | La grilla horaria del alta y la pregunta de los reemplazos urgentes. Lo dibuja `js/disponibilidad.js` |

**Ya no quedan dos modelos de datos para la misma cosa.** Había uno propio de `perfil.html`
—con `pts`, `starsCount`, `levelBar`— al lado del que traduce `_mapFromDatabase` —con `estado`,
`documentos`, `valorHora`—, y no coincidían. El primero se fue con las fichas escritas a mano:
ninguno de esos tres nombres aparece hoy en ningún `.html` ni en ningún `.js` del proyecto.

### 3.2 Direcciones de red

Todo va contra un mismo proyecto de Supabase, cuya dirección está escrita en el código en un
solo lugar, `js/apiClient.js:8`, de donde la lee `js/auth.js` (`:31`). Que esté una sola vez lo
sostiene `scripts/verificar_base.mjs`.

**Interfaz REST** — `{supabase}/rest/v1/{tabla}`:

| Tabla | Operaciones | Desde |
|---|---|---|
| `tenants` | GET (filtrado por `slug`) | `apiClient.js:52` |
| `caregivers` | GET, POST, PATCH | `getAspirantes`, `registrarAspirante`, `cambiarEstadoAspirante` |
| `care_searches` | GET, POST | `getBusquedasFamilia`, `crearBusquedaFamilia`, `crearBusqueda` |
| `clock_ins` | POST | `registrarFichadoGPS` |
| `reportes` | GET (orden `created_at.desc`), POST | `getReportes`, `registrarReporte` |
| `messages` | GET (`?order=created_at.asc&limit=50`), POST | **fuera del cliente**, directo en `mockup-app.html:701` y `mockup-app.html:736` |

**Autenticación** — `{supabase}/auth/v1/*`, a través del SDK: `signInWithPassword`, `signUp`,
`signOut`, `getSession`, `onAuthStateChange`.

**Archivos** — `{supabase}/storage/v1/*`, a través del SDK. Dos depósitos: `documentos-cuidadores`
y `avatares`. Se usa en `registrar-asistente.html:873-891` para subir documento de identidad,
antecedentes y título.

**Tiempo real** — conexión permanente del SDK, escuchando altas en la tabla `messages`
(`auth.js:149-158`, usada en `mockup-app.html:721`).

**Fuera de Supabase**: el directorio usa `https://via.placeholder.com/70` como imagen de
reemplazo cuando falla una foto.

### 3.3 Dos problemas de datos que la migración va a chocar de frente

1. **El enlace del directorio al perfil está roto para los datos reales.** Las tarjetas que
   vienen de Supabase enlazan a `perfil.html?id=<identificador largo>` (`directorio.html`, dentro
   del bloque dinámico), pero `perfil.html` hace `parseInt(params.get('id')) || 1`. Un
   identificador largo de base no es un número: da un valor inválido y **siempre muestra la ficha
   número 1, la de un perfil de ejemplo**. Sólo funciona con los enlaces fijos `?id=1` a `?id=8`.
2. **`perfil.html` es la única pantalla del sitio que quedó totalmente afuera de la base.**

---

## 4. Autenticación

**Sí existe, y es real**: Supabase Auth versión 2, con correo y contraseña, a través del SDK
oficial cargado desde un CDN. Toda la implementación son los 171 renglones de `js/auth.js`.

**Cómo funciona.** `auth.js` crea el cliente con `persistSession: true`, `autoRefreshToken: true`
y `detectSessionInUrl: true`, es decir: la sesión sobrevive al cierre del navegador y el permiso
se renueva solo. Al cargar cualquier página, un bloque que se ejecuta de entrada recupera la
sesión y le pasa el permiso a `apiClient` con `setAuthToken()`, para que las consultas REST
viajen con la identidad del usuario y no con la llave anónima. Ése es el mecanismo del que
depende toda la seguridad por filas de la base.

**Sesiones**: las administra el SDK. Se guardan en el almacenamiento local del navegador, bajo
una clave propia de Supabase. El código del proyecto no las toca a mano.

**Roles**: existen, pero de forma rudimentaria. El rol se guarda como dato suelto del usuario y
se lee en `mockup-app.html` con `user.user_metadata?.role || 'familiar'`. Según lo que diga, se
redirige al panel de la prestadora o se queda en el tablero familiar. No hay lista de roles
declarada en ningún lado ni comprobación en el resto de las pantallas.

**Pantallas protegidas: ninguna.** Éste es el hallazgo más importante de esta sección.

`auth.js:66-74` define una función `requireAuth()` que redirige si no hay sesión. **Se buscó en
todo el proyecto y no la llama nadie.** Además, su destino por omisión es `app.html`, un archivo
que no existe.

La consecuencia concreta: **`panel-prestadora.html` no verifica sesión**. Su código arranca con
`document.addEventListener('DOMContentLoaded', cargarAspirantes)` y pide los legajos sin
preguntar quién es. Abrir esa dirección a mano carga el panel. Que se vean o no los datos depende
enteramente de que las reglas por filas de Supabase estén bien puestas del lado del servidor;
del lado del navegador no hay ninguna barrera. Eso no se puede verificar leyendo este código y
queda como punto a revisar contra la base.

**Dos cosas más que conviene mirar antes de migrar** (son decisiones del código actual, no
opiniones sobre el diseño):

- `registrar-asistente.html:849` usa **el número de documento como contraseña inicial** de la
  cuenta que crea. Es un dato que el propio formulario acaba de mostrar en pantalla y que figura
  en el legajo.
- La dirección del proyecto y la clave publicable de Supabase están escritas en el código, en
  `js/apiClient.js:8-9`, y repetidas en las dos copias registradas de ese archivo. Siendo clave
  publicable, no es una filtración; pero al migrar a Vite corresponde que pasen a variables de
  entorno. **Que estén en un solo lugar ya está hecho**: hasta el 30 de agosto de 2026 `js/auth.js`
  las declaraba por segunda vez, con el mismo valor y sin que ninguna mandara sobre la otra, y hoy
  las lee de `ClienteDatos` (`js/auth.js:31`). Lo sostiene `scripts/verificar_base.mjs`, que se
  planta si vuelven a aparecer escritas fuera del original.

---

## 5. El CSS

### 5.1 Archivos y volumen

Esta tabla la escribe `node scripts/medir_estado.mjs --escribir` y la compara antes de cada
`commit` `scripts/verificar_estado.mjs`. No se edita a mano: el 31 de agosto de 2026 se encontró
que la escrita a mano tenía **seis números equivocados** —decía que `css/styles.css` la usaban
«las 10 páginas de la raíz» cuando son 15, que `tokens.css` y `utilidades.css` las usaban «las 16
pantallas» cuando son 17, le daba 285 renglones a cada `styles-pwa.css` cuando tienen 287, y sumaba
4.638 donde el README, que sí sale de medir, decía 4.642—.

<!-- hojas: lo escribe scripts/medir_estado.mjs, no se edita a mano -->

| Archivo | Renglones | La enlazan |
|---|---:|---|
| `css/mockup-app.css` | 138 | Sólo `mockup-app.html` |
| `css/styles.css` | 2.274 | 15 de las 17 pantallas |
| `css/tokens.css` | 363 | 15 de las 17 pantallas |
| `css/utilidades.css` | 189 | 15 de las 17 pantallas |
| `pwa-asistente/css/styles-pwa.css` | 287 | Sólo `pwa-asistente/index.html` |
| `pwa-asistente/css/tokens.css` | 363 | Sólo `pwa-asistente/index.html`. Copia byte a byte de `css/tokens.css` |
| `pwa-asistente/css/utilidades.css` | 189 | Sólo `pwa-asistente/index.html`. Copia byte a byte de `css/utilidades.css` |
| `pwa-familia/css/styles-pwa.css` | 287 | Sólo `pwa-familia/index.html`. Copia byte a byte de `pwa-asistente/css/styles-pwa.css` |
| `pwa-familia/css/tokens.css` | 363 | Sólo `pwa-familia/index.html`. Copia byte a byte de `css/tokens.css` |
| `pwa-familia/css/utilidades.css` | 189 | Sólo `pwa-familia/index.html`. Copia byte a byte de `css/utilidades.css` |

En disco hay 10 archivos y 4.642 renglones, de los cuales 1.391 son copias byte a byte de otro: son las que `verificar_copias.mjs` compara.

Hay además 960 renglones de CSS en bloques `<style>` adentro del HTML: 516 en `pwa-familia/index.html`, 270 en `pwa-asistente/index.html`, 174 en `examen.html`. Las demás pantallas no tienen ninguno.

<!-- fin de las hojas -->

`css/utilidades.css` es donde viven las 125 clases de utilidad que cerraron el pendiente 8, y
`css/styles.css` es la hoja grande de la que todavía no se separó nada.

**Y 976 declaraciones más pegadas a las etiquetas**, en 247 atributos `style=`. Eran 2.199 en 694
atributos hasta el 26 de agosto de 2026: los colores escritos a mano se fueron el 25 y el resto
pasó a las 125 clases de `css/utilidades.css` el 26 —el pendiente 8, ya cerrado y contado entero en
`docs/ALCANCE.md`—. Lo que queda son las decisiones que aparecen una sola vez, que se dejaron a
propósito, y `scripts/verificar_estilos.mjs` impide que vuelvan a escribirse a mano las que ya
tienen clase.

**Total: 4.638 renglones en hojas de estilo —de los cuales 3.534 son originales distintos—,
963 adentro del HTML y 976 declaraciones sueltas.** Medido el 31 de agosto de 2026.

### 5.2 Framework

**No hay ninguno.** Nada de Tailwind, Bootstrap ni similar. Todo escrito a mano.

### 5.3 Sistema de diseño

**Sí hay uno, y es la mejor parte del proyecto.** `css/styles.css` abre con un bloque `:root` de
**32 variables CSS con nombre**, organizadas por familia:

- **Marca**: `--purple-dark`, `--purple-mid`, `--magenta`, `--magenta-dark`, `--yellow`, `--yellow-dark`
- **Texto**: cinco niveles, de `--text-dark` a `--text-subtle`
- **Fondos**: `--bg-white`, `--bg-light`, `--bg-surface`, `--bg-panel`
- **Bordes**: `--border-light`, `--border-color`
- **Estados**: pares claro/oscuro para verde, naranja y azul
- **Forma**: escala de redondeo de cuatro pasos (`--radius-sm` 8px a `--radius-xl` 32px)
- **Sombras**: tres niveles
- **Tipografía**: Public Sans, en `--font-display` y `--font-body`

Hay **componentes reconocibles y repetidos**, con nombres consistentes: `.navbar`, `.btn` con
variantes (`.btn-primario`, `.btn-secundario`, `.btn-atencion`, `.btn-sobre-oscuro`), `.caregiver-card` con sus partes
(`.card-header-strip`, `.card-body`, `.card-top`, `.card-meta`, `.card-footer`), `.specialty-tag`,
`.profile-tag`, `.wizard-step-pane`, `.wizard-step-node`, `.status-pill`, `.badge-match`,
`.insignia-validada`. Esto se traduce a componentes de React casi uno a uno.

**Pero el sistema tiene tres agujeros:**

1. **La pantalla del teléfono está escrita tres veces y las tres divergieron.** `mockup-app.css`
   comparte 60 nombres de regla con el CSS embebido de `pwa-familia/index.html` y **uno solo**
   tiene el mismo contenido; con `pwa-asistente` comparte 31, también uno solo igual.
2. **Las aplicaciones instalables no participan del sistema.** Sus 767 renglones de estilos
   adentro del HTML no usan las variables de `styles.css`; están escritos aparte.
3. **Hay estilos sueltos escritos en los atributos del HTML** en cantidad. Aparecen en el panel
   de la prestadora (colores y tamaños escritos a mano en cada celda de la tabla), en las
   plantillas de tarjeta del directorio, en la ventana de videollamada de `main.js` y en la
   insignia que inyecta `_applyBranding`. Son los que no se van a poder migrar por copia.

Un detalle a resolver en la migración: `_applyBranding()` cambia `--color-primary` y
`--color-accent`, **dos variables que no existen en `styles.css`** (que usa `--purple-dark` y
`--magenta`). O sea que el cambio de colores por cliente hoy no tiene efecto sobre los estilos
del sitio.

---

## 6. Dependencias externas

Son pocas y livianas. **No hay `package.json`, ni gestor de paquetes, ni proceso de compilación.**

| Qué | De dónde | Dónde se usa |
|---|---|---|
| **SDK de Supabase v2** | `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | Las 12 páginas. Versión sin fijar: toma la última de la rama 2. |
| **Font Awesome 6.5.0** | `cdnjs.cloudflare.com` | 11 páginas. Iconos. |
| **Font Awesome 6.4.0** | `cdnjs.cloudflare.com` | Sólo `panel-prestadora.html`: quedó una versión atrás. |
| **Inter** | Google Fonts, por `@import` | `styles.css` y las dos copias de `styles-pwa.css`. |
| **via.placeholder.com** | placeholder externo | Imagen de reemplazo en el directorio. |

**Interfaces del navegador que se usan y hay que tener en cuenta al migrar**: Geolocalización
(fichado GPS), IntersectionObserver (aparición al desplazar), MutationObserver (conteo del
directorio), Service Worker y manifiesto de aplicación instalable (las dos PWA).

**Configuración de publicación**: `vercel.json` (35 renglones) con direcciones limpias, cabeceras
de alcance para los tres service workers y tres cabeceras de seguridad (`X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`).

---

## 7. Estado entre pantallas

**Casi no hay estado compartido, y ése es el punto.** Como cada pantalla es una carga completa
del navegador, todo lo que vive en memoria se pierde al cambiar de página.

**Almacenamiento local (`localStorage`).** El proyecto ya no escribe ninguna clave propia. Había
cuatro (`aspirantes`, `busquedas`, `fichadas`, `bitacora`), todas del camino de imitación que se
suprimió el 24 de agosto de 2026 junto con el interruptor `useSupabase`.

Queda la **clave de sesión que administra el SDK de Supabase**, que sí está en uso real y es lo
único que efectivamente persiste entre pantallas.

**Almacenamiento de sesión (`sessionStorage`): no se usa.** Se buscó y no aparece.

**Cookies: el proyecto no las toca.** No hay una sola aparición de `document.cookie`.

**Variables globales.** Son el mecanismo real de comunicación entre archivos, y hay cinco:
`window.CareonysAPI`, `window.CareonysAuth`, `window._sb` (el cliente crudo, expuesto para el
tiempo real), `window.CareonysDataService` (muerto) y `CareonysAPI.currentTenant` /
`currentAuthToken` como estado mutable adentro del objeto. No hay módulos ni importaciones: todo
depende del orden en que estén las etiquetas `<script>` en cada página.

**Estado dentro de una pantalla.** En las tres pantallas de aplicación hay variables sueltas que
hacen de estado: `aspiranteSeleccionadoId` en el panel, `currentWStep` en el asistente de
postulación, `chatConversacionId` y `chatChannel` en el chat, `selectedRole` en el registro. Todo
esto se pierde al recargar.

**Lo que se pierde hoy al cambiar de página**: los filtros del directorio, el paso en el que iba
un asistente paso a paso, cualquier formulario a medio llenar, y el inquilino resuelto (se vuelve
a pedir a la base en cada carga). Nada de eso se conserva.

---

## 8. Lectura: qué se porta tal cual y qué hay que reescribir

### 8.1 Se porta casi tal cual

**El sistema de diseño de `styles.css`.** Las 32 variables `:root` pasan a un archivo de tokens
sin tocar nada. Vite sirve CSS con variables sin ninguna gestión especial. Es la parte más
rentable del proyecto: ya está hecha y está bien hecha.

**Las clases de componentes.** `.caregiver-card`, `.btn` y sus variantes, `.status-pill`,
`.specialty-tag`, `.wizard-step-node`: cada una tiene un componente de React esperándola. Los
estilos se copian; lo que cambia es quién los aplica.

**Los traductores de datos.** `_mapFromDatabase` y `_mapToDatabase` (`apiClient.js:305-400`) son
funciones puras que no tocan el DOM. Se mueven a un archivo aparte y se usan igual. Son el único
pedazo de lógica de negocio del proyecto que ya está bien separado.

**El HTML de las páginas informativas.** `soporte-remoto.html`, `cursos.html` y las secciones de
contenido de la portada son marcado con contenido fijo: se convierten a JSX casi mecánicamente
(cambiando `class` por `className` y cerrando las etiquetas sueltas). Lo que ahí sale del catálogo
—las listas, las tarjetas de servicio y las de curso— no se convierte: se declara igual, porque un
componente que recibe una lista y la dibuja es lo mismo de un lado y del otro.

**El catálogo de `data/`.** Los cinco archivos de catálogo no dependen de nada y son la semilla
de las tablas: las pantallas ya leen de ahí en vez de traer sus opciones escritas a mano.

**La configuración de publicación.** Las cabeceras de seguridad de `vercel.json` se conservan;
las reglas de service worker cambian porque Vite genera los suyos.

### 8.2 Hay que reescribir

**Todo el manejo del DOM. Sin excepción.** Cada `getElementById`, cada `innerHTML` con
plantillas, cada `style.display = 'none'`. Son unos 1.800 de los 2.500 renglones de JavaScript
propio. En React el estado dibuja la pantalla; no hay traducción posible de este patrón, hay
reemplazo. Es el grueso del trabajo.

**La navegación entera.** El menú copiado ocho veces pasa a un componente de disposición único.
Los enlaces `.html` pasan a rutas de React Router. Y las tres `navigate(screenId)` caseras de las
pantallas de aplicación pasan a rutas de verdad, lo cual además **arregla el botón "atrás"**, que
hoy no funciona ahí adentro.

**Los filtros del directorio.** Hoy filtran leyendo el texto del HTML dibujado y escondiendo
elementos. Hay que rehacerlos como filtrado sobre los datos antes de dibujar. El
`MutationObserver` que cuenta resultados desaparece: en React el número sale de la longitud de
la lista.

**Los dos asistentes paso a paso** (6 pasos en `formulario-integral`, 5 en `postulacion`) y sus
tres validaciones separadas. Se unifican en un solo componente con una sola definición de reglas.

**Las tres copias idénticas de `apiClient.js` y `auth.js`.** Pasan a ser un módulo importado.
1.082 renglones de copias se convierten en 541 de fuente única. Es la ganancia más limpia de toda
la migración.

**Toda la autenticación, en lo que hace a protección de pantallas.** El SDK de Supabase se
conserva —esa parte funciona—, pero `requireAuth()` no sirve como está: nadie la llama y apunta a
un archivo inexistente. Hay que hacer un componente de ruta protegida de verdad y aplicarlo, como
mínimo, al panel de la prestadora. **Esto no es una mejora opcional: hoy esa pantalla se abre
escribiendo la dirección.**

**Los 765 renglones de estilos adentro de las aplicaciones instalables** y todos los estilos
escritos en atributos del HTML. Hay que llevarlos al sistema de diseño en vez de arrastrarlos.

**Las dos aplicaciones instalables.** El `vite-plugin-pwa` reemplaza los dos service workers
escritos a mano. Los tres proyectos de `productos\careonys` ya lo usan: hay convención que seguir
y no hay que inventarla.

**Los datos escritos adentro del HTML.** Las 8 fichas de `perfil.html` y las 8 tarjetas de
`directorio.html` no se portan: se reemplazan por consultas a la base. En el camino se arregla el
enlace roto de la sección 3.3, porque en React el identificador es un parámetro de ruta y no pasa
por `parseInt`.

### 8.3 No hay que portarlo: hay que escribirlo

Esto es lo que conviene tener presente al armar el plan, porque es donde el esfuerzo se subestima
más fácil: **la calculadora de presupuesto, el algoritmo de match, el puntaje reputacional y la
búsqueda de reemplazo por cercanía no existen en el código.** En la pantalla son texto fijo. No es
migración; es desarrollo nuevo, con decisiones de producto que todavía no están tomadas.

### 8.4 Cuentas

| | Hoy | Después |
|---|---:|---|
| Páginas HTML | 12 archivos, 7.082 renglones | ~12 rutas |
| JavaScript propio (sin copias) | 2.600 renglones | de los cuales ~1.800 se reescriben |
| JavaScript copiado | 1.082 renglones | 541, importados |
| CSS | 2.582 en hojas + 767 adentro del HTML | más 2.566 declaraciones sueltas que hay que sacar |
| Dependencias externas | 4, todas por CDN | por gestor de paquetes, con versión fijada |

### 8.5 Lo que no se puede saber leyendo este código

Se señala en vez de suponerlo:

1. **Si las reglas por filas de Supabase están bien puestas.** De eso depende que el panel sin
   protección exponga datos o no. Hay que mirarlo en la base, no acá.
2. **La forma real de las tablas.** El código sugiere columnas de `caregivers`, `care_searches`,
   `clock_ins`, `reportes`, `messages` y `tenants`, pero no hay migraciones en este
   repositorio. La definición verdadera está en la base y hay que leerla de ahí.
3. **Qué valores de rol existen.** Sólo se ve que se compara contra un rol administrativo y que
   `'familiar'` es el valor por omisión. La lista completa está en los datos de los usuarios.
4. **Si el proyecto está publicado y en uso.** Hay `vercel.json` y una carpeta `.vercel`, pero
   eso no dice si hay alguien usándolo ni si hay datos reales en esa base.
5. **Si Careonys-Marketplace se solapa con `productos\careonys`.** Ambos tienen panel, aplicación
   de asistentes y aplicación de familias, y ambos van contra Supabase. Si apuntan al mismo
   proyecto de base de datos, parte de esta migración podría ser fusión y no traducción. Es la
   pregunta que más cambia el plan y conviene resolverla antes de escribirlo.

Nota sobre el alcance de este relevamiento: no se abrió la carpeta `No commit\`, según la regla
del proyecto. La carpeta `docs\` contiene documentación de negocio y planes que no se
inventariaron acá por no ser código.
