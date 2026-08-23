# Pendientes

> Lo que está abierto, con **condición de cierre** para cada punto. Sin condición de cierre un
> pendiente no se puede dar por resuelto, así que no entra sin ella.
>
> Cuando algo se cierra **se borra de acá**, no se tacha. Si era una afirmación de estado, pasa a
> `docs/ALCANCE.md` con archivo y renglón.

---

## Seguridad

| # | Pendiente | Se cierra cuando |
|---|---|---|
| 1 | **`panel-prestadora.html` no verifica sesión, y no puede.** `requireAuth()` está escrita en `js/auth.js:65` y no la llama nadie; su destino por defecto, `app.html`, no existe. **El sitio no tiene pantalla de inicio de sesión**: los únicos formularios de acceso están adentro de las dos PWAs. Lo único que hoy separa esos legajos de cualquiera que escriba la dirección son las políticas RLS | Exista una pantalla de acceso y el panel la exija. Hoy es tolerable **solo porque no hay datos reales**: se cierra antes de cargar el primero |
| 2 | **`caregivers` le muestra legajos a cualquiera que escriba la dirección.** Comprobado el 23 de agosto de 2026 con `node scripts/revisar_base.mjs`, sin sesión y con la clave que ya viaja al navegador. De las seis tablas que nombra el código, dos contestan con datos —`caregivers` y `tenants`— y cuatro contestan vacío, que **no es lo mismo que estar cerradas**: hoy no tienen filas. Las columnas que quedan a la vista en `caregivers` son `dni`, `cuit`, `phone`, `email`, `address`, `bank_info`, `birthdate`, `documents` y `hourly_rate`. Hoy hay **una sola fila y es ficticia**, y ésa es la única razón por la que esto todavía no le cuesta nada a nadie. Lo bueno de la misma medición: la lista entera de tablas ya **no** se puede pedir sin clave secreta (`/rest/v1/` contesta 401), así que el mapa de la base no se saca desde el navegador | Toda tabla tenga RLS estricta escrita en su migración —`supabase/migrations/`, regla 9— y la sonda vuelva a correr y dé `rechazan: 6`. **Antes de cargar el primer legajo de verdad.** Falta además medir si un anónimo puede *escribir*: la sonda es de sólo lectura a propósito, y esa prueba se corre aparte |
| 3 | **El examen de `cursos.html` aprueba siempre.** Su `onsubmit` (renglón 143) no mira las respuestas: avisa «aprobado con 100%» pase lo que pase, y anuncia +250 puntos de reputación y una insignia de certificación acreditada. La respuesta correcta va además escrita en el HTML, con `value="1"`, y es siempre la primera. Es la única pantalla del proyecto que fabrica una credencial de confianza sobre alguien que va a entrar a una casa a cuidar a una persona | El examen se corrija del lado del servidor y las respuestas dejen de viajar al navegador. Hasta entonces **no se muestra**: hoy no otorga nada porque no hay base detrás, y esa es la única razón por la que es tolerable |
| 4 | **La Prestadora se elige desde la dirección web, y eso es todo lo que la separa de otra.** `js/apiClient.js:23` toma el identificador de `?tenant=` o del subdominio, y las consultas lo mandan como un filtro más en la dirección (`js/apiClient.js:309`). Un filtro que viaja en el pedido lo cambia quien llama: eso no es aislamiento, es una sugerencia. **Decidido por el Desarrollador el 23 de agosto de 2026:** ninguna búsqueda mezcla Prestadoras, en ninguna modalidad, y el límite lo impone la sesión, no la barra de direcciones | La Organización salga de la membresía verificada de quien inició sesión y las políticas de la base la impongan, de modo que cambiar el parámetro no devuelva datos ajenos. La dirección puede seguir eligiendo **qué vidriera se muestra**; lo que no puede es autorizar el acceso a los datos |

---

## Antes de portar la primera pantalla

Se hacen una sola vez, y si no se hacen, la decisión la termina tomando quien porta.

| # | Pendiente | Se cierra cuando |
|---|---|---|
| 5 | **Esta modalidad no tiene término técnico, y el obvio está ocupado.** la palabra `marketplace` ya está guardada como valor en `prestadora_modalidades`, `asistentes.canales` y `guardias.canal_modalidad`, donde nombra otra cosa —el régimen de trabajo del Asistente, dependencia o autónomo— y encima la nombra mal: ver `docs/ALCANCE.md` §3. Tres candidatos en `docs/GLOSARIO.md` §4, ninguno aprobado. El nombre comercial es aparte y no entra al código: ése se cambia cuando se quiera | El término pase las cinco preguntas de `docs/GLOSARIO.md` §2 y quede escrito en su §3. La regla 13 heredada dice que lo que persiste se nombra por su función y no se renombra nunca, así que elegir mal acá es caro |
| 6 | **`mockup-app.html` es el único lugar del proyecto donde existe un chat** (`screen-chat`, con suscripción en tiempo real y confirmación optimista) y la única pantalla de alta que sirve a una Familia: `pwa-familia` no tiene ninguna. Ninguna de las dos PWAs tiene chat. Su código **no se copia**: lee `messages?order=created_at.asc&limit=50` sin ningún filtro, se suscribe a la tabla entera sin filtro, inserta el texto recibido con `innerHTML`, evita `apiClient.js` y, sin sesión, escribe con la clave pública | Las dos capacidades estén anotadas como requisito para las PWAs y reescritas contra el esquema nuevo, y `css/mockup-app.css` haya pasado al sistema de diseño. Recién entonces se borran él y `mockup-app.html` |
| 7 | **El catálogo del producto todavía no lo lee ninguna pantalla.** Ya no está escrito a mano en el HTML: las 16 listas cerradas (91 opciones), los 8 servicios, los 6 cursos y la evaluación viven en `data/catalogo-vocabularios.json` y `data/catalogo-oferta.json`, explicados en `docs/CATALOGO.md`. Pero las pantallas siguen mostrando sus copias viejas, y esas copias no coinciden entre sí ni con el archivo nuevo | Cada pantalla lea del catálogo en vez de su copia, al portarla, y el catálogo viva en tablas — en las de Careonys, no en unas propias: ver `docs/ALCANCE.md` §3. Una pantalla portada contra una tabla vacía no da error: queda vacía y nadie se entera |

---

## Se resuelve dentro de la migración a React

Nada de esto conviene arreglar antes: la migración reescribe cada pantalla y el arreglo se tiraría.

| # | Pendiente | Se cierra cuando |
|---|---|---|
| 8 | **2.566 declaraciones de estilo pegadas al HTML**, en 772 atributos `style=`. Incluye 304 colores escritos a mano, 48 distintos, ninguno de los cuales sale de un token — contra la regla 6. **Mientras quede alguno, el modo oscuro no se enciende solo**: los tokens están listos, pero un color escrito a mano no cambia con el modo. El motivo está en `css/tokens.css`, arriba del bloque del modo oscuro. Reparto por archivo abajo | Ningún archivo tenga atributos `style=` con colores fuera de la paleta. Se saca pantalla por pantalla, al portarla |
| 9 | **No hay multiidioma.** La regla 2 pide `es-AR`, `en` y `pt-BR` desde el primer día; en el código hay un solo `toLocaleDateString('es-AR')` en `js/main.js:221` y todo el texto visible está escrito a mano dentro del HTML | Exista el archivo de traducciones con los tres idiomas y las pantallas lean de ahí. **Cada pantalla nueva lo encarece** |
| 10 | **El texto tutea a quien lee** en todas las pantallas ("Mejorá tu calidad de vida", "Completá tus datos"), contra la regla 1 | El texto visible use forma impersonal o *usted*. Se corrige al portar cada pantalla |
| 11 | **La Prestadora de ejemplo está escrita a mano, 111 veces en 18 archivos.** «PresDemo» aparece en cada `<title>`, en cada encabezado, en cada pie, en los avisos legales de `panel-prestadora.html` y `postulacion-asistente.html`, y con tres grafías distintas —`PresDemo`, `PrestDemo`, `Presdemo`—. Su logotipo está enlazado como `assets/images/logo_presdemo.png` en 17 lugares, y su identificador y su UUID están escritos en el remiendo de `js/apiClient.js:55-58`. **Es la regla 2 del `CLAUDE.md`, no una prolijidad**: cuando haya cientos de Prestadoras, cada uno de esos 111 lugares muestra la Prestadora equivocada. El nombre del producto ya no es parte de este problema: se cerró | El nombre, el logotipo y el color de la Prestadora salgan de la Organización de la sesión, como ya hace `apiClient.js` con el logotipo del encabezado, y ninguna pantalla los tenga escritos. **El inventario y el plan ya están hechos**, en `docs/PLAN_PRESTADORA.md`: 32 de las 111 apariciones ya se reemplazan solas al cargar y 43 quedan sueltas. Falta que el Desarrollador apruebe, y decida las cuatro cosas de su sección 4 |
| 12 | **Las dos PWAs enlazan al directorio padre** para imágenes y para cuatro pantallas (`pwa-asistente/index.html:270, 277, 289, 315, 371`; `pwa-familia/index.html:540, 546, 548`). Su service worker no alcanza esas rutas, así que fuera de línea no cargan | Haya un solo service worker en la raíz del sitio, que es lo que emite `vite-plugin-pwa`. El problema se disuelve, no se parcha |
| 13 | **`apiClient.js` y `auth.js` están triplicados byte a byte** —1.082 renglones en tres lugares— y `styles-pwa.css` duplicado. `css/tokens.css` está en tres lugares por la misma razón: el service worker de cada PWA solo alcanza su propia carpeta, así que fuera de línea no puede leer el del padre | Existan imports reales. Desaparece solo al migrar. Mientras tanto `scripts/verificar_copias.mjs` compara las cinco copias byte a byte y falla si alguna se separó: no las une, pero avisa. Como se corre a mano, vale el pendiente 17 |
| 14 | **Tres fuentes de datos conviviendo**: Supabase, datos escritos en el HTML y almacenamiento del navegador. Los JSON sueltos de `data/` ya no son una cuarta: los tres obsoletos se borraron y los dos nuevos son semilla declarada. Queda `data/cuidadores.json`, que son cuatro perfiles de muestra de PresDemo, inventados de punta a punta | Quede una sola |
| 15 | **`messages` se consulta directo desde el HTML**, fuera del cliente de datos, en `mockup-app.html:702` y `:737` | Toda consulta pase por `apiClient.js` |
| 16 | **Las imágenes traen la paleta ajena adentro.** Las nueve ilustraciones de `assets/images/` están dibujadas con los colores del sitio de origen. Cambiar las variables CSS no cambia un `.png`: las pantallas van a quedar con la paleta de Careonys alrededor y la vieja en el medio | Cada ilustración se rehaga con la paleta propia o se reemplace. Va con el mapeo del sistema de diseño, no antes |
| 17 | **El chequeo de identidad se corre a mano.** `scripts/verificar_identidad.mjs` funciona y falla cuando tiene que fallar —se probó rompiendo las tres cosas que vigila—, pero este proyecto no tiene compilación: es HTML servido tal cual, sin `package.json`. Nadie lo corre solo. Un chequeo que hay que acordarse de correr protege hasta que alguien se olvida, que es exactamente como el nombre del producto llegó a 273 apariciones | Corra solo: enganchado a la compilación que traiga la migración a React, o antes en un `pre-commit`. **No se agrega un `package.json` ahora nada más que para esto**: el sitio se publica como archivos estáticos y meterle uno cambia cómo lo detecta el servicio de publicación |

### Reparto de los estilos pegados al HTML

Sirve para saber qué pantalla va a costar más y en qué orden conviene portar.

| Archivo | Atributos `style=` | Declaraciones |
|---|---:|---:|
| `postulacion-asistente.html` | 197 | 745 |
| `mockup-app.html` | 101 | 329 |
| `pwa-familia/index.html` | 94 | 293 |
| `formulario-integral.html` | 78 | 224 |
| `solicitar-asistente.html` | 58 | 229 |
| `index.html` | 56 | 240 |
| `pwa-asistente/index.html` | 47 | 122 |
| `perfil.html` | 42 | 120 |
| `directorio.html` | 37 | 108 |
| `panel-prestadora.html` | 32 | 85 |
| `cursos.html` | 27 | 66 |
| `soporte-remoto.html` | 3 | 5 |

Las dos PWAs tienen además 767 renglones de CSS en bloques `<style>` adentro del HTML.
