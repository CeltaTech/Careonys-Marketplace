# Inventario de Careonys-Marketplace

Fecha del relevamiento: 22 de agosto de 2026.
Carpeta analizada: `F:\proyectos\celtatech\productos\Careonys-Marketplace`.
Método: lectura del código. No se modificó ningún archivo del proyecto.

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
| `index.html` | 561 | Portada. Presentación del servicio, secciones informativas y formulario de contacto. |
| `directorio.html` | 589 | Listado de asistentes con buscador y cuatro filtros (zona, tipo, especialidad, verificación). |
| `perfil.html` | 644 | Ficha pública de un asistente. Se elige con `?id=` en la dirección. |
| `solicitar-asistente.html` | 438 | Página informativa para familias, con formulario de solicitud que sí graba en la base. |
| `postulacion-asistente.html` | 968 | Alta de asistentes. Asistente paso a paso de 5 pasos con carga de documentos. |
| `formulario-integral.html` | 581 | Asistente paso a paso de 6 pasos para publicar una búsqueda de cuidado. |
| `cursos.html` | 313 | Listado de cursos. Contenido fijo escrito en el HTML. |
| `soporte-remoto.html` | 196 | Página informativa de acompañamiento online. Contenido fijo. |

### 1.2 Pantallas de aplicación

| Archivo | Renglones | Función |
|---|---:|---|
| `mockup-app.html` | 777 | Aplicación móvil simulada dentro de una sola página: ingreso, registro, inicio, cuaderno de cuidado, fichado por GPS y chat. Cambia de pantalla mostrando y ocultando bloques. |
| `panel-prestadora.html` | 224 | Panel interno. Tabla de postulantes, indicadores y ventana de auditoría de legajos con aprobar/rechazar. |
| `pwa-asistente/index.html` | 809 | Aplicación instalable para asistentes: ingreso, estado del legajo, fichado GPS, cuaderno médico y postulación. |
| `pwa-familia/index.html` | 982 | Aplicación instalable para familias: ingreso, recomendados, cuaderno de cuidado y publicación de búsquedas. |

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
  `postulacion-asistente.html` o `formulario-integral.html` según el rol o la elección.
- **Páginas huérfanas**: a `mockup-app.html` sólo se llega desde el botón "Contactar" del
  directorio. A `panel-prestadora.html` sólo se llega por redirección tras ingresar con rol
  administrativo: ningún enlace del sitio la menciona.
- **Las dos aplicaciones instalables están casi desconectadas** del sitio: sólo enlazan hacia
  afuera (`../cursos.html`, `../directorio.html`, `../soporte-remoto.html`) y ninguna página del
  sitio enlaza hacia ellas.

---

## 2. El JavaScript

### 2.1 Archivos propios

Hay **5 archivos JavaScript distintos**, pero están copiados en tres carpetas, así que en disco
se ven 13. Aparte hay dos guiones que no corren en el navegador sino en la línea de comandos.

| Archivo | Renglones | Qué hace |
|---|---:|---|
| `js/identidad.js` | 108 | El único lugar donde está escrito el nombre comercial. Resuelve los marcadores `{{producto}}`, `{{productoCorto}}`, `{{dominio}}` y `{{contacto}}` al cargar cada página. |
| `js/apiClient.js` | 419 | Capa de acceso a datos. Resolución de inquilino (multi-cliente), lectura y escritura contra Supabase, traducción de nombres de campos y modo alternativo con almacenamiento local. |
| `js/auth.js` | 122 | Ingreso, registro, cierre de sesión, subida de archivos y suscripción en tiempo real, todo sobre el SDK de Supabase. |
| `js/main.js` | 307 | Comportamiento global del sitio: menú, desplazamiento suave, validación de formularios, filtros del directorio, asistente de 6 pasos y ventana simulada de videollamada. |
| `pwa-asistente/service-worker.js` | 73 | Caché para uso sin conexión de la aplicación de asistentes. |
| `pwa-familia/service-worker.js` | 73 | Ídem para la de familias. |

Los dos guiones de línea de comandos:

| Archivo | Qué hace |
|---|---|
| `scripts/generar_manifiestos.mjs` | Escribe los dos `manifest.json` desde la identidad. Hacen falta generados porque el navegador los lee como archivo, sin pasar por ninguna página: ahí no hay JavaScript que resuelva un marcador. |
| `scripts/verificar_identidad.mjs` | Falla —código de salida 1— si el nombre, el dominio o el correo aparecen escritos a mano fuera de `js/identidad.js`. Verifica además que las tres copias de ese archivo sean iguales byte a byte y que los manifiestos estén al día. Ignora la documentación y los comentarios del código. |

**Duplicación verificada por firma digital**: `js/apiClient.js`, `pwa-asistente/js/apiClient.js`
y `pwa-familia/js/apiClient.js` son **idénticos byte a byte**. Lo mismo pasa con las tres copias
de `auth.js`, con las tres de `identidad.js` y con las dos copias de `css/styles-pwa.css`. Las de
`identidad.js` son el único caso donde la copia está verificada: `scripts/verificar_identidad.mjs`
falla si alguna se separa. Son 1.082 renglones de copias exactas
que hoy hay que mantener en tres lugares a la vez.

### 2.2 JavaScript escrito adentro del HTML

Además de los archivos anteriores hay **1.598 renglones de JavaScript metidos dentro de las
etiquetas `<script>` de las páginas**:

| Página | Renglones adentro |
|---|---:|
| `mockup-app.html` | 371 |
| `perfil.html` | 331 |
| `postulacion-asistente.html` | 261 |
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
  sobre el elemento; `postulacion-asistente.html` tiene su propia `validatePane()` por paso; las
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

Salen de cuatro lugares distintos a la vez, y conviven sin un criterio único:

**a) Supabase, por interfaz REST.** `js/apiClient.js:8` fija `useSupabase: true`, así que el
código la trata como fuente principal. **Pero esa base no contesta**: comprobado el 23 de agosto
de 2026, la dirección escrita en el código no resuelve en el sistema de nombres. Todo lo que
parece venir de la base viene en realidad del remiendo de `js/apiClient.js:53`, que inventa una
Prestadora y sigue sin avisar. Pendiente 2.

**b) Escritos adentro del HTML.** Es la fuente de la mayoría de lo que se ve:

- `perfil.html` lleva **8 fichas completas de asistentes escritas como objeto JavaScript adentro
  del HTML**: unos 230 renglones con nombre, edad, zona, biografía, estudios, especialidades,
  referencias y certificaciones. Esta página **nunca consulta Supabase**.
- `directorio.html` trae 8 tarjetas de asistentes escritas a mano en el HTML, que sólo se
  reemplazan si Supabase devuelve registros.
- `cursos.html` y `soporte-remoto.html` son enteramente contenido fijo.

**c) Archivos JSON locales en `data/`.** Ninguna página los lee todavía.

| Archivo | Registros | Qué es |
|---|---:|---|
| `data/catalogo-vocabularios.json` | 16 listas, 91 opciones | El catálogo del producto: perfiles profesionales, zonas, patologías, tareas, modalidades, niveles. Explicado en `docs/CATALOGO.md` |
| `data/catalogo-oferta.json` | 8 servicios, 6 cursos, 1 evaluación | Lo que el producto ofrece |
| `data/cuidadores.json` | 4 | Perfiles de muestra de PresDemo, la Prestadora de ejemplo. Datos y fotos inventados |

**d) Almacenamiento local del navegador**, como respaldo cuando Supabase está apagado — que
hoy es siempre. Ver sección 7.

Conviene notar que hay **tres modelos de datos distintos para la misma cosa**: el de
`data/cuidadores.json` (con `tarifaHora`, `puntos`, `valoracion`), el de `perfil.html` (con
`pts`, `starsCount`, `levelBar`) y el de la base traducido por `_mapFromDatabase` (con `estado`,
`documentos`, `valorHora`). No coinciden entre sí.

### 3.2 Direcciones de red

Todo va contra un mismo proyecto de Supabase, cuya dirección está escrita en el código en
`js/apiClient.js:9` y `js/auth.js:7`.

**Interfaz REST** — `{supabase}/rest/v1/{tabla}`:

| Tabla | Operaciones | Desde |
|---|---|---|
| `tenants` | GET (filtrado por `slug`) | `apiClient.js:52` |
| `caregivers` | GET, POST, PATCH | `getAspirantes`, `registrarAspirante`, `cambiarEstadoAspirante` |
| `care_searches` | GET, POST | `getBusquedasFamilia`, `crearBusquedaFamilia`, `crearBusqueda` |
| `clock_ins` | POST | `registrarFichadoGPS` |
| `logbook_entries` | GET (orden `created_at.desc`), POST | `getBitacoraDiaria`, `registrarBitacoraDiaria` |
| `messages` | GET (`?order=created_at.asc&limit=50`), POST | **fuera del cliente**, directo en `mockup-app.html:701` y `mockup-app.html:736` |

**Autenticación** — `{supabase}/auth/v1/*`, a través del SDK: `signInWithPassword`, `signUp`,
`signOut`, `getSession`, `onAuthStateChange`.

**Archivos** — `{supabase}/storage/v1/*`, a través del SDK. Dos depósitos: `documentos-cuidadores`
y `avatares`. Se usa en `postulacion-asistente.html:873-891` para subir documento de identidad,
antecedentes y título.

**Tiempo real** — conexión permanente del SDK, escuchando altas en la tabla `messages`
(`auth.js:99-112`, usada en `mockup-app.html:714`).

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
oficial cargado desde un CDN. Toda la implementación son los 122 renglones de `js/auth.js`.

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

- `postulacion-asistente.html:849` usa **el número de documento como contraseña inicial** de la
  cuenta que crea. Es un dato que el propio formulario acaba de mostrar en pantalla y que figura
  en el legajo.
- La dirección del proyecto y la llave pública de Supabase están escritas en el código, en
  `js/apiClient.js:9-10` y `js/auth.js:7-8`, y repetidas en las seis copias de esos archivos.
  Siendo llave publicable, no es una filtración; pero al migrar a Vite corresponde que pase a
  variables de entorno y quede en un solo lugar.

---

## 5. El CSS

### 5.1 Archivos y volumen

| Archivo | Renglones | Lo usa |
|---|---:|---|
| `css/styles.css` | 2.250 | Las 10 páginas de la raíz |
| `css/mockup-app.css` | 124 | Sólo `mockup-app.html` |
| `pwa-asistente/css/styles-pwa.css` | 104 | Sólo la aplicación de asistentes |
| `pwa-familia/css/styles-pwa.css` | 104 | Sólo la de familias (**copia idéntica de la anterior**) |

Más **767 renglones de CSS en bloques `<style>` adentro del HTML**: 519 en `pwa-familia/index.html`
y 248 en `pwa-asistente/index.html`. Las diez páginas del sitio público no tienen bloques `<style>`.

**Y 2.566 declaraciones más pegadas a las etiquetas**, en 772 atributos `style=`, repartidas por
los doce archivos. Ahí hay 430 colores escritos a mano, 66 distintos, y **38 no existen en
`css/styles.css`**. El reparto por archivo está en `docs/PENDIENTES.md`.

**Total: 2.582 renglones en hojas de estilo, 767 adentro del HTML y 2.566 declaraciones sueltas.**
Casi la mitad del diseño vive fuera de las hojas de estilo.

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

**Almacenamiento local (`localStorage`).** Cuatro claves, todas escritas y leídas **sólo por el
camino alternativo que hoy está apagado** (`useSupabase: true`), y por lo tanto hoy nunca se usan:

| Clave | Escrita en |
|---|---|
| `careonys_aspirantes` | `apiClient.js:132, 152, 166` |
| `careonys_searches` | `apiClient.js:181, 201` y `main.js:214, 223` |
| `careonys_clockins` | `apiClient.js:228, 235` |
| `careonys_bitacora` | `apiClient.js:251, 258, 271` |

A esas se suma la **clave de sesión que administra el SDK de Supabase**, que sí está en uso real
y es lo único que efectivamente persiste entre pantallas.

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
(cambiando `class` por `className` y cerrando las etiquetas sueltas).

**El catálogo de `data/`.** Los dos archivos de catálogo no dependen de nada y son la semilla
de las tablas: las pantallas nuevas leen de ahí en vez de traer sus opciones escritas a mano.

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
   `clock_ins`, `logbook_entries`, `messages` y `tenants`, pero no hay migraciones en este
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
