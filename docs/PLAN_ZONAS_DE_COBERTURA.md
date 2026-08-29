# Plan — Zonas de cobertura

> **Escrito el 28 de agosto de 2026. La base está construida y probada; la pantalla no.** Las
> tres decisiones de la sección 7 las delegó el Desarrollador ese mismo día —«te dejo a tu criterio
> cómo armarlo»—, así que se tomaron las tres recomendaciones y quedan anotadas ahí como tomadas.
> **Lo hecho está en la sección 9**, y es el primer paso de la sección 5: la migración 0035 y su
> prueba de aislamiento. Del paso 3 en adelante no hay nada escrito todavía.

## 1. Qué pidió el Desarrollador

Textual, el 28 de agosto de 2026:

> «Barrio o zona de cobertura => Zonas de cobertura (tilde todas las que correspondan) (allí se le
> abre el desplegable con checklist donde dice CABA, Zona Norte, Zona Oeste y Zona Sur. De alguna
> manera dentro de cada zona debe poder elegir los municipios en los cuales aceptaría ofertas de
> trabajo. Te dejo a tu criterio cómo armarlo. Ojo, esto es válido únicamente si la Prestadora es
> Buenos Aires o Gran Buenos Aires, para el resto del país y otros países debe ser un campo
> configurable por la Prestadora o en su defecto un campo donde el/la postulante se expresa
> libremente.»

Son cuatro cosas, y la cuarta es la que manda sobre las otras tres:

1. El rótulo pasa a **«Zonas de cobertura»**, con la aclaración de que se tilda todo lo que
   corresponda.
2. Deja de ser una elección y pasa a ser **varias**.
3. Las zonas se muestran **agrupadas**: una región, y adentro sus municipios o barrios.
4. **Nada de eso vale fuera del Área Metropolitana de Buenos Aires.** Ahí la lista la pone la
   Prestadora, y si no la puso, la persona escribe libremente.

## 2. Qué hay hoy, medido

**La agrupación ya existe y nadie la usa.** El vocabulario `zona` de
`data/catalogo-vocabularios.json` tiene 20 ítems en dos escalones: cuatro regiones —Ciudad de
Buenos Aires, Zona Norte, Zona Sur y Zona Oeste— y dieciséis barrios o partidos colgados de
ellas por una propiedad `region`. La nota del propio vocabulario ya lo dice: «cada barrio queda
colgado de su región». **Lo que falta no es la lista: es la pantalla y el guardado.**

**La pantalla elige una sola.** `registrar-asistente.html:313` es un `<select>` común, obligatorio,
que muestra los veinte ítems planos —regiones y barrios mezclados en el mismo nivel—, así que hoy
alguien puede elegir «Zona Norte» o «Palermo» y no hay forma de decir las dos.

**La base guarda una sola, y como texto suelto.** `caregivers.zone` es una columna `text`
(`supabase/migrations/0001_esquema_inicial.sql:87`). La leen la vista del directorio
(`supabase/migrations/0002_aislamiento_por_prestadora.sql:141`) y la del directorio con
consentimiento (`supabase/migrations/0007_directorio_con_consentimiento.sql:52`), y del lado del
navegador la escribe `registrar-asistente.html:1004` y la traduce `js/apiClient.js:758`.

**No hay ninguna tabla de zonas.** La lista vive en un archivo `.json`, no en la base, que es lo
contrario de lo que pide la regla «los catálogos salen de la base».

**Y no hay nada que distinga a una Prestadora del Área Metropolitana de una de Salta.** La tabla de
Prestadoras no tiene ningún campo que diga qué lista de zonas le corresponde, así que hoy el
producto le muestra Palermo y Quilmes a cualquiera.

## 3. La idea que simplifica todo

Lo que pidió el Desarrollador parece tres casos —Área Metropolitana, resto del país, otros
países— y **son dos**:

| Modo | Qué ve quien se postula | Cuándo |
|---|---|---|
| **Lista** | Las regiones de su Prestadora, y adentro de cada una sus municipios, para tildar los que quiera | Cuando la Prestadora tiene su lista cargada |
| **Texto libre** | Un campo donde escribe con sus palabras dónde puede trabajar | Cuando no la tiene |

El Área Metropolitana no es un caso especial del producto: **es simplemente la lista que hoy
tienen cargada las Prestadoras ficticias**. Una Prestadora de Salta con su lista de departamentos
usa exactamente la misma pantalla. Eso evita que «Buenos Aires» quede escrito adentro del código,
que es justo lo que prohíbe la regla de no hardcodear.

**Y el modo no se elige: se deduce.** Si la Prestadora tiene zonas cargadas, hay lista; si no,
hay texto libre. Un campo aparte para decir «yo uso lista» es un dato que se puede contradecir con
la realidad, y el día que se contradiga la pantalla queda vacía sin explicar por qué.

## 4. Qué se construye

### 4.1 La base

**Dos tablas nuevas y una columna.** Las dos nacen con clave `uuid`, con su columna de
Organización y con la RLS escrita en la misma migración que las crea, como pide la regla.

- **`zonas_cobertura`** — la lista, que es de cada Prestadora. Dos escalones en una sola tabla:
  una región tiene `zona_padre_id` en nulo, y un municipio apunta a su región. Lleva además
  `orden`, para que la lista se muestre como la Prestadora la quiere y no en orden alfabético.
- **`asistente_zonas`** — qué zonas eligió cada Asistente. Es la tabla que convierte «una» en
  «varias»: una fila por zona elegida.
- **`caregivers.zonas_texto`** — lo que escribió quien no tuvo lista para tildar.

**Los nombres de las zonas los escribe la Prestadora, en un idioma solo, y está bien.** No es texto
del producto: es un dato de un cliente, como el nombre de una persona. La regla de multiidioma rige
el texto que escribimos nosotros —el rótulo, la ayuda, los mensajes—, no lo que carga quien usa el
sistema. Eso queda dicho en el comentario de la migración para que nadie lo «arregle» más adelante.

### 4.2 La pantalla

El `<select>` de una sola opción se reemplaza por un desplegable con casillas, agrupadas por
región, con el rótulo **«Zonas de cobertura»** y la ayuda **«Tilde todas las que correspondan»**.

Tres cosas que no son obvias y hay que resolver:

- **Tildar la región tilda sus municipios**, y destildar uno deja la región a medias. Es lo que
  espera cualquiera que haya usado una lista así, y sin eso alguien de Zona Norte tiene que tildar
  quince casillas.
- **Poder cubrir una región entera sin nombrar municipios.** «Trabajo en todo el Oeste» es una
  respuesta válida y hoy se pierde: si sólo se guardan municipios, esa persona figura en quince y
  no en la región. Se guarda la región tildada como una fila más.
- **Los cuatro estados.** La lista sale de la base, así que la pantalla tiene que mostrar
  *cargando*, *error*, *vacío* y *listo*. **El estado vacío es el que importa**, porque es
  exactamente el caso «la Prestadora no cargó zonas»: ahí no se muestra una lista vacía, se
  muestra el campo de texto libre.

### 4.3 Lo que se toca de arrastre

- `js/apiClient.js` deja de mandar `zona` como un texto y pasa a mandar la lista elegida.
- Las dos vistas del directorio leen hoy `c.zone`. Hay que decidir qué muestran cuando son varias
  —lo más razonable es la primera región, y el detalle en el perfil—, y eso está en la sección 7.
- `perfil.html` y `directorio.html` muestran la zona: pasan a mostrar las zonas.
- Las tres copias de `js/apiClient.js` (pendiente 13) hay que refrescarlas, porque están
  triplicadas byte a byte.

## 5. En qué orden, y por qué en ése

1. **La migración**, con las dos tablas, la columna, la RLS y las zonas del Área Metropolitana
   cargadas para las dos Prestadoras ficticias. Sin datos no se puede probar el aislamiento.
2. **La prueba de aislamiento con las dos Prestadoras**: cada una ve sus zonas y ninguna de la
   otra. Comprobar que devuelve vacío no prueba nada, así que las dos tienen que tener zonas
   distintas cargadas.
3. **La pantalla**, con sus cuatro estados y el camino de texto libre probado con una Prestadora
   sin zonas.
4. **El arrastre**: directorio, perfil y las copias.

## 6. Cómo se prueba, y qué prueba tiene que poder fallar

- **Dos Prestadoras con listas distintas**: la de Buenos Aires ve CABA, Norte, Sur y Oeste; una
  Prestadora ficticia nueva sin zonas ve el campo de texto libre. Contra el código de hoy las dos
  fallan, porque hoy las dos ven la misma lista escrita en un archivo.
- **Elegir tres zonas y volver a abrir el legajo**: vuelven las tres. Contra el código de hoy
  vuelve una sola.
- **Elegir una región entera sin municipios**: se guarda, y el perfil dice la región. Contra el
  código de hoy se guarda como si fuera un barrio más.
- **El aislamiento**: una Prestadora no puede leer ni escribir una zona de la otra, probado con
  las dos cargadas.

## 7. Las tres decisiones, tomadas por delegación

> El Desarrollador delegó las tres el 28 de agosto de 2026. **Se tomó la recomendación en los tres
> casos**, y por eso quedan escritas acá como decisión y no como pregunta.

**a. ¿La lista de zonas se muda entera a la base, o convive?**
La regla de la empresa dice que los catálogos salen de la base, y hoy `zona` vive en
`data/catalogo-vocabularios.json` junto con otros veintitrés vocabularios. Mudar sólo a `zona` deja
el catálogo partido en dos lugares por un tiempo; mudarlos a todos es un trabajo mucho más grande
que esto. **Recomiendo mudar sólo `zona`**, porque es el único que deja de ser una lista fija del
producto para pasar a ser un dato de cada Prestadora —los otros veintitrés no cambian de cliente a
cliente—, y dejar anotado que los demás siguen donde están.

**b. ¿Quién carga las zonas de una Prestadora nueva?**
Hace falta una pantalla para que la Prestadora arme su lista, y eso es un trabajo aparte del
formulario. **Recomiendo dejar el lugar hecho y no construir la pantalla todavía**: las tablas y la
RLS quedan escritas, las Prestadoras ficticias se cargan por migración, y quien no tenga lista cae
en el texto libre, que es el camino que el Desarrollador ya pidió. Así el formulario queda
terminado hoy sin esperar a la pantalla de administración.

**c. ¿Qué muestra el directorio cuando alguien cubre ocho zonas?**
Hoy muestra un texto y entra una sola. **Recomiendo mostrar las regiones —a lo sumo tres, y
«y N más»— y dejar el detalle completo para el perfil**, porque la tarjeta del directorio se lee de
un vistazo y ocho nombres la vuelven ilegible. La alternativa es mostrar sólo la primera, que es lo
que hace hoy sin decirlo.

## 8. Lo que este plan no resuelve

- **Los otros países.** Este plan hace que la lista deje de ser argentina por dentro, pero no
  investiga qué división territorial usa cada país. Eso es el pendiente 92, que el Desarrollador
  dejó fuera de la versión 1.
- **Qué zonas cubre el servicio de verdad.** La lista del Área Metropolitana que hay hoy salió de
  las pantallas de mockup, no de un mapa de cobertura real. Lo dice la propia nota del vocabulario,
  y sigue siendo cierto después de este plan.
- **La búsqueda por zona.** Que una Familia pueda filtrar el directorio por zona es otra cosa y no
  entra acá.

## 9. Qué se construyó, y las dos cosas que este plan no había previsto

**La migración `supabase/migrations/0035_las_zonas_de_cobertura_son_varias_y_de_cada_prestadora.sql`,
aplicada a las dos bases —la remota enlazada y la local— y verificada en las dos.** Trae las dos
tablas, la columna de texto libre, la RLS con sus permisos, la puerta sin sesión, una tercera
Prestadora ficticia y las zonas de las dos que ya existían.

**Y la prueba de aislamiento tiene tres comprobaciones nuevas** —las 41, 42 y 43 de
`scripts/probar_aislamiento.mjs`—, escritas para que puedan fallar: las dos Prestadoras tienen
listas de distinto largo, así que cada una tiene que ver un número que no es cero **y** que no es
el de la otra. Da `A: 20 zonas   B: 9 zonas`, ninguna zona ajena en ninguna de las dos, y el
intento de cargar una zona en la Prestadora del otro responde 403.

Dos cosas aparecieron construyéndolo y no estaban en el plan:

- **La lista tiene que leerse sin sesión**, y el plan no lo decía. Quien completa el formulario de
  reclutamiento todavía no tiene cuenta, así que la RLS sola dejaría la pantalla vacía para todo el
  mundo. La solución es la misma puerta que ya usan el directorio y la marca desde la migración
  0021: `zonas_de(p_slug)`, que exige el nombre corto de una Prestadora y por eso no puede devolver
  las zonas de todas. Queda anotada como excepción a propósito en `scripts/verificar_esquema.mjs`,
  que si no la rechaza.
- **Los dos escalones se defienden en la base, no en la pantalla.** Un disparador rechaza el tercer
  nivel y una clave foránea compuesta sobre `(zona_padre_id, tenant_id)` impide que una zona cuelgue
  de una región de otra Prestadora. Las dos negativas se probaron, y también se probó que una zona
  legítima de segundo nivel **sí** entra: sin eso, una tabla que rechazara todo pasaría la prueba
  igual.

## 10. La pantalla, el guardado y el arrastre: qué quedó hecho

**El campo del formulario está construido y probado en los dos caminos.** Lo dibuja `js/zonas.js`,
que deduce el modo en vez de preguntarlo: con lista cargada muestra las casillas en dos escalones,
y sin lista muestra el campo de texto libre. El estado vacío de ese módulo no es un cartel de
disculpa — es el otro camino, y funciona.

**Probado en el navegador de manera que pudiera fallar.** Con `presdemo` —20 zonas— salen las
cuatro regiones y sus municipios, y la prueba de interacción devolvió: al abrir, ninguna tildada;
tildando una región, sus municipios quedan tildados y apagados y se guarda **una sola** fila;
tildando dos municipios sueltos, la región queda a medias (`indeterminate`); y destildando la
región, sus municipios vuelven a encenderse y quedan vacíos. Con `cuidarsur` —cero zonas a
propósito— aparece «¿Dónde puede trabajar?» con el campo libre, y `hayRespuesta` pasa a verdadero
al escribir. Los rótulos salen del catálogo en los tres idiomas y los nombres de zona se traducen
por su `clave` cuando la tienen: en inglés «Coverage areas» y «City of Buenos Aires», en portugués
«Áreas de cobertura» y «Cidade de Buenos Aires».

**Un defecto real apareció acá, y no avisaba.** `Zonas.montar` corría antes de que terminara
`initTenant()`, así que `zonasDePrestadora()` no encontraba Prestadora y devolvía la lista vacía —y
la lista vacía significa, legítimamente, «mostrá el campo de texto libre». O sea: **todas las
Prestadoras se degradaban a texto libre en silencio**, sin un solo error en ninguna parte. Se
arregló con el mismo precedente que ya usaba `getPerfilDelDirectorio`: pedir la Prestadora y
esperarla si todavía no llegó.

### El arrastre: el directorio y el perfil (migraciones 0036 y 0037)

`directorio` seguía devolviendo una sola zona. La 0036 le agrega al final `zonas` —cada zona
con su nombre, su clave, si es una región y de qué región cuelga— y `zonas_texto`. La tarjeta
muestra **las regiones**, a lo sumo tres y después «y N más», que es la decisión 7c; el perfil
muestra el detalle completo, agrupado por región, en su propia sección «Dónde trabaja».

**Y el consentimiento se corrigió en el mismo movimiento.** Decía «su zona» en los tres idiomas, y
lo que se publica ahora son varias: pasa a decir «sus zonas de cobertura». Un consentimiento que
nombra menos de lo que se publica no es un consentimiento, y la propia vista lo tiene escrito al
lado: una columna que el consentimiento no nombre no puede salir por ahí.

**La 0037 nació de una prueba que falló.** Marta Quiroga cubre toda la Zona Norte —una sola fila, tal
como la 0035 decidió— y buscando «San Isidro» **no aparecía**. La respuesta era falsa. La columna
`zonas_claves` dice hasta dónde llega una respuesta, y es aparte de `zonas` a propósito: `zonas` es
lo que la persona contestó y es lo que se muestra; `zonas_claves` es su alcance y sólo sirve para
filtrar. Mezclarlas le pondría a Marta en el perfil tres municipios que no eligió. Ahora buscar
«San Isidro» la encuentra, buscar «Vicente López» también, y buscar «Lomas de Zamora» no encuentra a
nadie —que es lo que hace que la prueba signifique algo—.

**Los datos ficticios se repartieron para que la pantalla se ejercite.** Después de la 0035 cada
legajo tenía exactamente una zona, así que el directorio dibujaba lo mismo que antes y habría
pasado la prueba sin probar nada. Ahora hay quien cubre tres barrios de una región, quien cubre una
región entera, quien cubre dos regiones, y quien cubre cuatro —el que hace aparecer el «y 1 más»—.
Y Cuidar Sur, que no tiene lista, pasó a tener un legajo publicado: sin él, `zonas_texto` se podía
romper sin que ninguna prueba se enterara.

**Los 21 chequeos pasan.**

### Lo que queda abierto de este plan

- **La pantalla donde la Prestadora arma su lista de zonas.** Hoy las zonas se cargan por
  migración. Está en la lista de pendientes del producto.
- **`pwa-asistente/index.html` sigue preguntando una sola zona**, escrita a mano en el propio HTML
  (`pwa-asistente/index.html:451`). No se tocó en este plan y quedó anotada aparte.
