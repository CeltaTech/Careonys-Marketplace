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
| 2 | **La base de este proyecto no responde.** Comprobado el 23 de agosto de 2026: la dirección no resuelve en el sistema de nombres, y el control contra `supabase.com` desde la misma máquina sí resuelve, así que no es falta de red. Los datos de acceso guardados por el Desarrollador coinciden exactamente con los del código —misma dirección, misma clave publicable—, o sea que no es un identificador viejo escrito en el código. Lo más probable es que el proyecto esté **pausado por inactividad**, que es lo que hace el plan gratuito y lo que borra el nombre. Consecuencia mientras tanto: **cada pantalla cae en el remiendo de `js/apiClient.js:53`**, que inventa una Prestadora con un identificador escrito a mano y sigue sin avisar | El Desarrollador reactive el proyecto desde el tablero de Supabase —verificando primero con cuál de sus cuentas entra— y se anote acá con qué se encontró: si las políticas RLS están puestas o la base quedó abierta. El remiendo se va igual: una pantalla sin base tiene que decirlo, no fingir |
| 3 | **El examen de `cursos.html` aprueba siempre.** Su `onsubmit` (renglón 143) no mira las respuestas: avisa «aprobado con 100%» pase lo que pase, y anuncia +250 puntos de reputación y una insignia de certificación acreditada. La respuesta correcta va además escrita en el HTML, con `value="1"`, y es siempre la primera. Es la única pantalla del proyecto que fabrica una credencial de confianza sobre alguien que va a entrar a una casa a cuidar a una persona | El examen se corrija del lado del servidor y las respuestas dejen de viajar al navegador. Hasta entonces **no se muestra**: hoy no otorga nada porque no hay base detrás, y esa es la única razón por la que es tolerable |
| 4 | **La Prestadora se elige desde la dirección web, y eso es todo lo que la separa de otra.** `js/apiClient.js:23` toma el identificador de `?tenant=` o del subdominio, y las consultas lo mandan como un filtro más en la dirección (`js/apiClient.js:309`). Un filtro que viaja en el pedido lo cambia quien llama: eso no es aislamiento, es una sugerencia. **Decidido por el Desarrollador el 23 de agosto de 2026:** ninguna búsqueda mezcla Prestadoras, en ninguna modalidad, y el límite lo impone la sesión, no la barra de direcciones | La Organización salga de la membresía verificada de quien inició sesión y las políticas de la base la impongan, de modo que cambiar el parámetro no devuelva datos ajenos. La dirección puede seguir eligiendo **qué vidriera se muestra**; lo que no puede es autorizar el acceso a los datos |

---

## Antes de portar la primera pantalla

Se hacen una sola vez, y si no se hacen, la decisión la termina tomando quien porta.

| # | Pendiente | Se cierra cuando |
|---|---|---|
| 5 | **Esta modalidad no tiene término técnico, y el obvio está ocupado.** la palabra `marketplace` ya está guardada como valor en `prestadora_modalidades`, `asistentes.canales` y `guardias.canal_modalidad`, donde nombra otra cosa —el régimen de trabajo del Asistente, dependencia o autónomo— y encima la nombra mal: ver `docs/ALCANCE.md` §3. Tres candidatos en `docs/GLOSARIO.md` §4, ninguno aprobado. El nombre comercial es aparte y no entra al código: ése se cambia cuando se quiera | El término pase las cinco preguntas de `docs/GLOSARIO.md` §2 y quede escrito en su §3. La regla 13 heredada dice que lo que persiste se nombra por su función y no se renombra nunca, así que elegir mal acá es caro |
| 6 | **El nombre del producto está escrito a mano adentro del código**, 135 veces fuera de la documentación: en identificadores (`CareonysAPI`, `CareonysAuth`), en los dos `manifest.json`, en los dos service workers y en los comentarios de `tokens.css`. La Prestadora de ejemplo, «PresDemo», aparece 35 veces más. Careonys ya pasó por esto: tenía 12 en julio y tres días después, sin que nadie los agregara a propósito, más de 30 | Ningún identificador, clave ni texto lleve el nombre escrito, y un chequeo lo verifique en cada compilación. El patrón está resuelto en Careonys: `identidadProducto.js` con marcadores `{{producto}}`, y `scripts/verificar_identidad.mjs` que rompe el build si aparece un literal |
| 7 | **`mockup-app.html` es el único lugar del proyecto donde existe un chat** (`screen-chat`, con suscripción en tiempo real y confirmación optimista) y la única pantalla de alta que sirve a una Familia: `pwa-familia` no tiene ninguna. Ninguna de las dos PWAs tiene chat. Su código **no se copia**: lee `messages?order=created_at.asc&limit=50` sin ningún filtro, se suscribe a la tabla entera sin filtro, inserta el texto recibido con `innerHTML`, evita `apiClient.js` y, sin sesión, escribe con la clave pública | Las dos capacidades estén anotadas como requisito para las PWAs y reescritas contra el esquema nuevo, y `css/mockup-app.css` haya pasado al sistema de diseño. Recién entonces se borran él y `mockup-app.html` |
| 8 | **El catálogo del producto todavía no lo lee ninguna pantalla.** Ya no está escrito a mano en el HTML: las 16 listas cerradas (91 opciones), los 8 servicios, los 6 cursos y la evaluación viven en `data/catalogo-vocabularios.json` y `data/catalogo-oferta.json`, explicados en `docs/CATALOGO.md`. Pero las pantallas siguen mostrando sus copias viejas, y esas copias no coinciden entre sí ni con el archivo nuevo | Cada pantalla lea del catálogo en vez de su copia, al portarla, y el catálogo viva en tablas — en las de Careonys, no en unas propias: ver `docs/ALCANCE.md` §3. Una pantalla portada contra una tabla vacía no da error: queda vacía y nadie se entera |

---

## Se resuelve dentro de la migración a React

Nada de esto conviene arreglar antes: la migración reescribe cada pantalla y el arreglo se tiraría.

| # | Pendiente | Se cierra cuando |
|---|---|---|
| 9 | **2.566 declaraciones de estilo pegadas al HTML**, en 772 atributos `style=`. Incluye 304 colores escritos a mano, 48 distintos, ninguno de los cuales sale de un token — contra la regla 6. **Mientras quede alguno, el modo oscuro no se enciende solo**: los tokens están listos, pero un color escrito a mano no cambia con el modo. El motivo está en `css/tokens.css`, arriba del bloque del modo oscuro. Reparto por archivo abajo | Ningún archivo tenga atributos `style=` con colores fuera de la paleta. Se saca pantalla por pantalla, al portarla |
| 10 | **No hay multiidioma.** La regla 2 pide `es-AR`, `en` y `pt-BR` desde el primer día; en el código hay un solo `toLocaleDateString('es-AR')` en `js/main.js:221` y todo el texto visible está escrito a mano dentro del HTML | Exista el archivo de traducciones con los tres idiomas y las pantallas lean de ahí. **Cada pantalla nueva lo encarece** |
| 11 | **El texto tutea a quien lee** en todas las pantallas ("Mejorá tu calidad de vida", "Completá tus datos"), contra la regla 1 | El texto visible use forma impersonal o *usted*. Se corrige al portar cada pantalla |
| 12 | **La marca está escrita a mano.** Aparece en encabezados, pies y nombres de archivo de logo; en `perfil.html` sobrevive además la marca anterior, en los renglones 7, 20, 271, 272 y 303 | La marca salga del dato de la Prestadora de la sesión, no del HTML. La regla 1 incluye el nombre del producto |
| 13 | **Las dos PWAs enlazan al directorio padre** para imágenes y para cuatro pantallas (`pwa-asistente/index.html:270, 277, 289, 315, 371`; `pwa-familia/index.html:540, 546, 548`). Su service worker no alcanza esas rutas, así que fuera de línea no cargan | Haya un solo service worker en la raíz del sitio, que es lo que emite `vite-plugin-pwa`. El problema se disuelve, no se parcha |
| 14 | **`apiClient.js` y `auth.js` están triplicados byte a byte** —1.082 renglones en tres lugares— y `styles-pwa.css` duplicado. `css/tokens.css` está en tres lugares por la misma razón: el service worker de cada PWA solo alcanza su propia carpeta, así que fuera de línea no puede leer el del padre | Existan imports reales. Desaparece solo al migrar; hoy nada garantiza que las tres copias sigan iguales |
| 15 | **Tres fuentes de datos conviviendo**: Supabase, datos escritos en el HTML y almacenamiento del navegador. Los JSON sueltos de `data/` ya no son una cuarta: los tres obsoletos se borraron y los dos nuevos son semilla declarada. Queda `data/cuidadores.json`, que es el pendiente 3 | Quede una sola |
| 16 | **`messages` se consulta directo desde el HTML**, fuera del cliente de datos, en `mockup-app.html:702` y `:737` | Toda consulta pase por `apiClient.js` |
| 17 | **Las imágenes traen la paleta ajena adentro.** Las nueve ilustraciones de `assets/images/` están dibujadas con los colores del sitio de origen. Cambiar las variables CSS no cambia un `.png`: las pantallas van a quedar con la paleta de Careonys alrededor y la vieja en el medio | Cada ilustración se rehaga con la paleta propia o se reemplace. Va con el mapeo del sistema de diseño, no antes |

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
