# Careonys Marketplace

> Leer `CLAUDE.md` antes de tocar cualquier código. Protocolo de sesión completo ahí.

Mercado público donde una Familia busca, compara y contrata un Asistente para el cuidado de un
Paciente. Producto de **CeltaTech**, hermano de Careonys (`productos/careonys/`), que es la
plataforma de gestión que usan las Prestadoras.

**Proyecto exploratorio.** Se construye para ver si el resultado satisface y su base no tiene
datos reales. **Pero está publicado en internet**, en `careonys-marketplace.vercel.app`, que es
la dirección que sirve lo que hay en `main`. La que decía este renglón hasta el 26 de agosto de
2026 —`careonys-marketplace-nu.vercel.app`— es **otra**, quedó congelada en una versión vieja y
sigue abierta: pendiente 83.

**Si ese despliegue expone datos o no, no se puede saber leyendo el código.** Hay que consultarlo
contra la base real, no contra un documento. Hasta que esa consulta se haga, conviene bajar el
despliegue o protegerlo. Por qué esto no es una precaución exagerada: `docs/ESQUEMA.md` §1.

Comparte negocio y vocabulario con Careonys y en algún momento se integrará con él, pero hoy son
dos repositorios y dos proyectos de Supabase independientes.

**Careonys no se toca desde acá.** Ni sus archivos, ni su base, ni sus migraciones.

## Estado real

Sitio estático en HTML, CSS y JavaScript plano, en proceso de migración a React + Vite para
alinearse con el stack de Careonys.

Medido el 4 de septiembre de 2026 sobre el árbol de trabajo con `node scripts/medir_estado.mjs`, que es de
donde sale esta tabla: no se escribe a mano y no queda vieja.

| | |
|---|---|
| 18 pantallas HTML, 13.227 renglones | sin ruteo: cada pantalla es un archivo |
| 16.420 renglones de JavaScript propio, en 37 archivos | 9.933 de ellos son copias byte a byte de otro archivo (pendiente 13) |
| 6.497 renglones más metidos adentro del HTML | en 14 bloques `<script>` |
| 4.653 renglones de hojas de estilo, en 10 archivos | 63 tokens con nombre en `css/tokens.css`, sin framework |
| 951 declaraciones más, pegadas al HTML | en 242 atributos `style=` (fue el pendiente 8, cerrado) |
| Supabase Auth funcionando | 14 de las 18 pantallas rescatan la sesión al abrir |
| 5 servidores de afuera, sin `package.json` ni compilación | cdn.jsdelivr.net, cdnjs.cloudflare.com, fonts.googleapis.com, fonts.gstatic.com, www.openstreetmap.org — hay que decir de qué es cada uno |
| 36 tablas y 73 migraciones en el repositorio | 37 chequeos las miran antes de cada commit |

**Qué está construido y qué no lo dice `docs/ALCANCE.md`**, que es la referencia — no este archivo
ni ningún otro. Lo que queda abierto está en `docs/PENDIENTES.md`.

**Media base sigue nombrada en inglés** —`caregivers`, `tenants`, `clock_ins`—, contra el
glosario. El 25 de agosto de 2026 se renombró la parte de esta modalidad (`avisos`,
`franjas_aviso`, `directorio`) y el resto quedó como estaba, porque renombrar una
tabla ya guardada arrastra el código que la nombra y eso lo decide el Desarrollador.

## Qué documento manda sobre qué

Cuando dos digan cosas distintas, gana el de más arriba.

| | Documento | Autoridad sobre |
|---|---|---|
| 1 | **El código y la base** | Todo. Ningún documento sobrescribe lo que el código hace |
| 2 | `CLAUDE.md` | Las reglas propias de este producto. Arriba mandan `../../CLAUDE.md` y `../../docs/REGLAS_PRODUCTOS_CAREONYS.md` |
| 3 | `../../docs/GLOSARIO_PRODUCTOS_CAREONYS.md` | Cómo se llaman las cosas. Es el único y no se copia. Lo propio de acá está en `docs/GLOSARIO.md` |
| 4 | `docs/ALCANCE.md` | Qué está construido y qué no |
| 5 | `docs/PENDIENTES.md` | Lo abierto, con condición de cierre |
| 6 | `docs/ESQUEMA.md` | Cómo se diseña la base |
| 7 | `docs/DISENO.md` | Cómo se traduce el estilo actual al sistema de Careonys |
| 8 | `docs/INVENTARIO.md` | Anatomía del código actual |

**Ningún otro documento afirma estado.** Los que quedan son material de diseño o legal, y cada uno
lo dice en su encabezado.

## Estructura

```
Careonys-Marketplace/
├── CLAUDE.md                   ← las reglas propias de este producto, leer primero
├── docs/
│   ├── GLOSARIO.md             ← los términos que nació este producto; el glosario está arriba
│   ├── ALCANCE.md              ← qué existe y qué no. Referencia única
│   ├── ESQUEMA.md              ← reglas de la base y el error que no se repite
│   ├── INVENTARIO.md           ← anatomía del código actual
│   ├── PENDIENTES.md           ← lo abierto, con condición de cierre
│   ├── DISENO.md               ← equivalencias de estilo con Careonys
│   ├── TABLAS_QUE_FALTAN.md     ← diseño de las siete tablas que todavía no existen
│   ├── modelo_de_negocios_*.md             ← material de diseño; decisión comercial abierta
│   ├── terminos_y_condiciones_*.md         ← modelos que la Prestadora adopta, cambia o descarta
│   └── politica_de_datos.md                ← modelo, con el mismo criterio; los tres sin revisión de abogado
├── *.html                      ← las 16 pantallas del sitio, una por archivo
├── css/                        ← tokens.css, styles.css, utilidades.css, mockup-app.css
├── js/                         ← apiClient.js, auth.js, main.js y doce más
├── assets/images/
├── data/                       ← los catálogos y las frases que leen las pantallas
├── pwa-asistente/              ← aplicación instalable para Asistentes
├── pwa-familia/                ← aplicación instalable para Familias
├── scripts/                    ← los chequeos y las pruebas que corren antes de cada commit
├── supabase/                   ← config, migraciones y funciones
└── vercel.json
```

**`supabase/migrations/` lleva 67 migraciones, aplicadas todas al 2 de septiembre de 2026.** Una
migración aplicada no se edita: se corrige con otra adelante.

`apiClient.js` y `auth.js` existen **tres veces** —raíz, `pwa-asistente/`, `pwa-familia/`—
idénticos byte a byte. La duplicación desaparece en la migración, cuando haya imports reales.

Las carpetas de la aplicación nueva se agregan cuando llegue su turno — no se anticipan carpetas
vacías.

## Entorno de desarrollo

El sitio actual es estático. Alcanza con servir la raíz:

```bash
npx serve .          # queda en http://localhost:3000
```

Para la base, con Docker Desktop abierto:

```bash
npx supabase start     # levanta la base local
npx supabase db reset  # aplica migraciones y carga datos de prueba
```

El seed carga **al menos dos Prestadoras con datos**, a propósito: es lo que permite comprobar el
aislamiento. Una prueba que devuelve una lista vacía no distingue "aislado" de "todo bloqueado".

### Las cuentas con las que se entra

La migración 0065 siembra seis cuentas ficticias junto con el resto de los datos, así que ya no se
pierden cuando la base se rehace. Nacen **sin clave**, y la clave la pone un guion, del único lado
donde eso no es un agujero:

```bash
CLAVE_PRUEBA_LOCAL=<la que elija> node scripts/abrir_cuentas_ficticias.mjs
```

La clave se elige en el momento, es la misma para las seis y **no queda escrita en ningún archivo**.
El guion corre sólo contra la base de esta máquina, y termina entrando con cada una para comprobar
que abren de verdad.

| Correo | Quién es | Prestadora |
|---|---|---|
| `norma.ficticia@ejemplo.invalid` | Familia — publicó los catorce avisos | PresDemo |
| `marta.ficticia@ejemplo.invalid` | Asistente — con su legajo detrás | PresDemo |
| `cecilia.ficticia@ejemplo.invalid` | Personal de la Prestadora — abre el panel | PresDemo |
| `raul.ficticio@ejemplo.invalid` | Familia — publicó los catorce avisos | Cuidar Norte |
| `silvia.ficticia@ejemplo.invalid` | Asistente — con su legajo detrás | Cuidar Norte |
| `marcos.ficticio@ejemplo.invalid` | Personal de la Prestadora — abre el panel | Cuidar Norte |

Cuidar Sur queda sin cuentas a propósito: estar casi vacía es lo que la hace útil para probar el
aislamiento. Y el motivo de que la clave no viva en la migración es que **las migraciones son las
mismas de los dos lados**: una clave escrita ahí abriría estas seis cuentas también en la base
publicada, para cualquiera que lea el repositorio.

Copiar `.env.example` a `.env.local` y completar los valores antes de levantar nada. Los `.env`
nunca se suben (ver `.gitignore`).

**Para buscar adentro del proyecto**, `node scripts/listar.mjs` y no un `grep -r` desde la raíz:
acá al lado hay una caja fuerte y la regla de la bóveda dice que no se lista. El guion recorre
con el mismo guardián que los chequeos, así que la trae puesta.

```bash
node scripts/listar.mjs .html            # sólo las pantallas
node scripts/listar.mjs --buscar "TODO"  # archivo:renglón: texto
```

## Los chequeos, y el comando que hace falta una sola vez

Cada regla que se arregló una vez tiene un guion que impide que vuelva. Se corren todos juntos
en menos de un segundo:

```bash
node scripts/verificar_todo.mjs
```

Ese guion no tiene la lista escrita: busca los `scripts/verificar_*.mjs` de la carpeta, así que
un chequeo nuevo se suma solo con existir. Acá tampoco va la cuenta, por el mismo motivo: el
título decía trece cuando ya eran veinticuatro, y la tabla nombraba trece de esos veinticuatro.

| Chequeo | Qué impide que vuelva |
|---|---|
| `verificar_arranque` | Que el arranque de una pantalla falle sin que nadie lo diga, ni en pantalla ni en la consola |
| `verificar_base` | Que la dirección de la base o su clave publicable vuelvan a estar escritas fuera de `js/apiClient.js`, que dos afirmaciones sueltas del mismo hecho se contradigan en silencio, y que se suba al repositorio algo con forma de credencial de las que no tienen ningún uso legítimo |
| `verificar_botones` | Que un botón dispare una operación sin apagarse mientras corre, y dos toques sean dos escrituras |
| `verificar_cajas` | Que un chequeo entre a leer una caja fuerte por estar escrita con otra tipografía, o que cierre de más y deje de revisar código de verdad |
| `verificar_catalogo` | Que el archivo del catálogo se despegue de lo que dice la base |
| `verificar_clases` | Que el marcado nombre una clase que ninguna hoja declara, y el estilo que alguien vaya a buscar ahí no exista |
| `verificar_claves` | Que se guarde en la base una opción que el catálogo no tiene |
| `verificar_contacto` | Que el chat vuelva a dejar pasar un teléfono, un correo o un domicilio |
| `verificar_copias` | Que las copias byte a byte se separen sin que nadie se entere |
| `verificar_deposito` | Que el código nombre un depósito de archivos que ninguna migración declara —y entonces el archivo no aparece y nada avisa—, que sirva por dirección pública uno declarado privado, o que le hable al depósito por afuera de las dos funciones que saben la diferencia entre un enlace que vence y una dirección para siempre. Y que el tope de tamaño y los tipos de archivo que el navegador rechaza digan lo mismo que la migración —que es el original—, **ejerciendo la decisión con casos inventados** y no sólo leyendo la copia: un tope que sólo vive en el depósito actúa después de que el archivo ya viajó |
| `verificar_deriva` | Que una cita `archivo:renglón` apunte a un renglón que existe pero no es el que la frase dice: le pregunta al historial qué decía ese renglón el día en que se escribió la cita, y busca ese texto en el archivo de hoy |
| `verificar_escapado` | Que un texto de la base entre a la pantalla como si fuera HTML |
| `verificar_esquema` | Que una tabla nueva nazca sin RLS, que una función que se saltea la RLS quede al alcance de quien no inició sesión, que falte la columna de la Organización, que la clave primaria no sea `uuid`, que un importe se guarde sin moneda, que una política del depósito de archivos no nombre la Organización —que es lo único que ahí separa a una Prestadora de otra—, que la Organización se resuelva con un valor que venga en el pedido en vez de por la membresía de quien inició sesión, que un permiso de tabla conceda `all` o `truncate`, que se saltea la RLS entera y vacía la tabla, que una migración cambie el esquema sin terminar avisándole a PostgREST, que entonces sigue con la copia vieja y contesta 404 en una tabla que sí existe, o que una política que deja escribir pida la Organización sólo para leer: el `using` dice qué filas se pueden tocar y el `with check` cómo pueden quedar después, así que pedirla en el primero y no en el segundo deja **mudar la fila a otra Prestadora** mientras leer sigue funcionando perfecto, o que una política rehaga por su cuenta la cuenta de cuál es la Organización en vez de pedírsela a `public.prestadora_actual()`: una condición copiada contesta lo mismo hoy y **no aprende** lo que la función aprenda mañana, o que una migración nueva le cambie el nombre a algo ya guardado —tabla, columna, restricción, índice, política—: **el nombre viejo no se va**, queda en los datos de antes y en toda migración anterior, que no se puede editar; o que una migración corte su propia transacción con un `commit` en el medio —lo de arriba queda aplicado aunque lo de abajo falle— o traiga algo que no puede correr adentro de una, como un `create index concurrently`, que **no falla al escribirlo sino el día que se aplica**, o que a quien llega sin sesión le quede un permiso sobre una tabla o una vista de `public`, que es además una dirección web y sin condición que la acote a una Prestadora es el listado suelto que no existe —y lo que cuenta ahí es el **neto** de las 49 migraciones, siguiendo los renombres, porque un `grant` de la 0012 revocado en la 0021 no es un agujero y uno que nadie revocó lo es aunque su migración se vea prolija—, o que la función que sí se abre sin sesión no pida de verdad el nombre corto de una Prestadora: que no lo reciba, que lo reciba y no lo compare contra `slug`, o que escriba `is null or`, que con el nulo abre **todas** |
| `verificar_estado` | Que un número escrito en la documentación quede viejo sin que nada avise: los cuatro bloques que se miden salen del medidor y se comparan acá |
| `verificar_estados` | Que algo que carga datos se olvide de uno de sus cuatro estados: cargando, error, vacío, listo |
| `verificar_estilos` | Que se escriba a mano en un `style=` lo que ya dice una clase de utilidad |
| `verificar_frases` | Que quede texto visible escrito a mano en una pantalla ya convertida a los tres idiomas —en el marcado si tiene `data-frase`, y en el guión si el guión ya pide frases, que son dos conversiones distintas y no siempre van juntas |
| `verificar_glosario` | Que una palabra que el glosario sacó siga escrita en algún lado: **en la documentación, en un comentario o en un mensaje de commit**, que son las superficies que la regla nombra y que el chequeo del vocabulario deja afuera a propósito, porque ése mira sólo el texto que ve una persona |
| `verificar_guias` | Que una Guía de cuidado se vea sin estar publicada, o que se cruce entre dos Prestadoras |
| `verificar_guias_offline` | Que el archivo de guías sin conexión se despegue de lo que dice la base, o de sus copias |
| `verificar_guiones` | Que el JavaScript de una pantalla quede sin poder leerse |
| `verificar_identidad` | Que la marca vuelva a estar escrita a mano |
| `verificar_migraciones` | Que una migración que ya entró al historial se mueva de lugar, que es lo único que no se puede ver leyendo los archivos de hoy —uno editado ayer se ve igual que uno que nunca se tocó—, así que le pregunta al historial: editada, borrada, renumerada, o una nueva con un número que el árbol ya había pasado. Las cuatro rompen lo mismo, que la base se pueda reconstruir corriendo los archivos en orden desde cero. **Y mira también lo que todavía no es un commit**, porque corriendo en el gancho de antes del commit, mirar sólo el historial avisaría un commit tarde, con la migración ya movida y publicada |
| `verificar_organizacion` | Que una pantalla nombre a una Prestadora del seed, o escriba otro logotipo |
| `verificar_opciones` | Que una lista de opciones vuelva a escribirse adentro de una pantalla, y con ella un valor que ningún vocabulario gobierna |
| `verificar_paleta` | Que vuelva un color escrito con su número en vez de un token |
| `verificar_patrones_contacto` | Que las reglas con las que el chat reconoce un dato de contacto se despeguen entre la tabla de la base, que es la que aplica el servidor, y `data/patrones-contacto.json`, que es lo que el navegador avisa antes de mandar; y que una regla nueva use algo que Postgres no entiende, con lo que la puerta del servidor quedaría sin aplicarla |
| `verificar_pendientes` | Que un archivo siga diciendo en presente que un agujero está abierto después de haberse cerrado, y una roja esperada se vuelva un permiso para no mirar |
| `verificar_red` | Que un chequeo mire cero archivos, no encuentre nada y salga en verde igual; que la extensión de las pantallas vuelva a escribirse a mano —suelta, o metida adentro de la clave de una exención— en vez de pedirse a `scripts/recorrido.mjs`; que una exención de `scripts/` se quede nombrando un archivo que ya no está —o una columna que ninguna migración declara—, y siga apagando el chequeo sobre él; que esta misma tabla se quede atrás, nombrando un chequeo que ya no existe o callando uno que sí; y que un documento mande a correr `node scripts/X` sin que `X` exista o sin que `docs/INVENTARIO.md` diga qué hace, que es lo mismo un paso afuera de la red: los chequeos entran solos en `verificar_todo.mjs` y no hace falta recordarlos, pero una herramienta que hay que acordarse de correr y que además no dice en ninguna parte qué hace es una herramienta que no corre |
| `verificar_referencias` | Que una cita `archivo:renglón` de la documentación apunte a la nada |
| `verificar_rutas` | Que una pantalla, una hoja o un manifiesto pidan un archivo con la caja de las letras cambiada —que **acá anda siempre y publicado da 404**, porque esta máquina es Windows y el sitio se sirve desde Linux—, o que enlacen algo que existe acá y `.vercelignore` no sube |
| `verificar_sensibles` | Que un dato de una persona salga por las dos puertas que guardan sin que nadie se lo pida: la barra de direcciones —que queda en el historial del navegador, en el «compartir» y en el registro de cualquier intermediario— y el registro de actividades, que se ve en la consola de cualquiera que abra la pantalla y no se ve en la pantalla, así que nadie lo nota |
| `verificar_sinconexion` | Que la copia que el teléfono guarda para andar sin señal siga sirviendo un archivo viejo, o que guarde uno que no está con ese nombre exacto —y `cache.addAll()` es todo o nada, así que la copia entera no se instala— |
| `verificar_temas` | Que se rompa el modo oscuro: las dos copias separadas, o un token de letra pintando un fondo |
| `verificar_trato` | Que el texto visible tutee a quien lo lee |
| `verificar_usos` | Que el catálogo diga que una opción se usa en un renglón donde ya no se usa |
| `verificar_vocabulario` | Que «cuidador» vuelva a ser el término general, o que «búsqueda» nombre lo que una Familia publica |

**El comando que hace falta una sola vez por máquina**, para que se corran solos antes de cada
`git commit`:

```bash
git config core.hooksPath .githooks
```

**Son dos ganchos, y el mismo comando alcanza para los dos.** `.githooks/pre-commit` corre la
red entera antes de cada commit. `.githooks/commit-msg` mira el mensaje, y existe porque el
otro corre **antes de que el mensaje exista**: cuando `pre-commit` se ejecuta todavía no hay
nada que leer. Y un mensaje de commit es lo único de este repositorio que no se puede arreglar
después —una vez escrito es historia, y la historia no se reescribe—, así que ése es el único
momento en que todavía se puede cambiar.

Los dos viven en `.githooks/`, que sí se sube, porque `.git/hooks/` no se sube. Sin ese comando
los ganchos están en el repositorio y no los llama nadie. Para saltearlos en un commit puntual:
`git commit --no-verify`, y conviene que sea raro.

## Decisiones abiertas que bloquean el esquema

1. **Qué se construye acá y qué es de Careonys.** Reportes de cuidado, signos vitales, check-in y
   reportes diarios ya existen allá. Ver `docs/ALCANCE.md` §3.

No se resuelve escribiendo código.
