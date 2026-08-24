# El catálogo del producto

Todas las listas cerradas del producto —los perfiles profesionales, las zonas, las patologías,
las modalidades de contratación, los servicios, los cursos— viven en dos archivos y en ningún
otro lado:

| Archivo | Qué guarda |
|---|---|
| `data/catalogo-vocabularios.json` | 21 listas de opciones, 130 opciones en total |
| `data/catalogo-oferta.json` | 8 servicios, 6 cursos y la evaluación con sus 2 preguntas |

Antes estaban escritas a mano adentro del HTML, repetidas pantalla por pantalla. Ninguna
pantalla las lee todavía: eso pasa al portarla.

## Por qué había que sacarlas de ahí

No es prolijidad. Cuando la misma lista está escrita en cuatro pantallas, las cuatro copias se
separan, y nadie se entera hasta que alguien las pone al lado. Al ponerlas al lado apareció
esto:

- **Se podía buscar lo que nadie podía ofrecer.** El filtro del directorio tenía «Paciente
  oncológico», pero el formulario donde un Asistente declara con qué patologías trabaja no lo
  tenía. Quien buscaba eso no encontraba a nadie, para siempre.
- **Y al revés.** «Guardia de 12 horas» sólo se podía pedir; ningún Asistente podía ofrecerla.
  «Reemplazo urgente» sólo se podía ofrecer; ninguna Familia podía pedirlo.
- **El mismo curso guardado con dos nombres.** El de nutrición se llamaba `nutricion_cocina` en
  el formulario del sitio y `nutricion` en la PWA. Quien se anotaba por un lado no figuraba
  anotado por el otro.
- **Quien estaba estudiando no tenía dónde marcarlo.** La lista de nivel educativo de la PWA se
  saltea «Universitario en curso», que sí está en el sitio.
- **Perfiles profesionales: cuatro pantallas, cuatro listas.** Dos incluían «Voluntario», dos
  no. Dos incluían «Otro», dos no. «Gerontólogo» aparecía con tres nombres distintos.
- **Género: tres listas.** Una sin «Prefiero no decirlo», otra que lo fusionaba con «Otro».

Cada una de esas diferencias es una persona que no aparece en una búsqueda.

## Cómo está armado

Cada opción tiene una **clave** —el nombre corto, invariable, que va a la base de datos— y un
texto en `es-AR`. La clave nunca cambia; el texto sí, y cuando llegue el multiidioma se
traduce el texto y la clave queda igual. Por eso las claves no llevan eñes, tildes ni guiones
medios: se usan en direcciones web y en nombres de columna, donde esos caracteres se rompen.

Dos cosas se normalizaron por ese motivo: los días de la semana estaban guardados como letras
sueltas (`L M X J V S D`, que no se traducen ni se ordenan solas) y los turnos tenían la clave
`mañana`, con eñe.

Cada lista dice además **dónde estaba** (archivo y renglón de cada pantalla que la tenía) y si
es **cerrada** —se elige una— o abierta —se marcan varias—.

## Las zonas son dos escalones, no dos listas

Una pantalla listaba barrios (Palermo, Belgrano, Villa Urquiza) y otra listaba regiones enteras
(Zona Norte, Zona Sur, Zona Oeste). No se contradicen: son dos niveles de la misma cosa, así que
cada barrio quedó colgado de su región, con `region` apuntando al de arriba.

**Lo que esa lista no es: un mapa de cobertura.** Son los veinte lugares que estaban escritos en
las pantallas. Qué barrios y qué partidos cubre el servicio de verdad no está escrito en ninguna
parte del proyecto, y no se puede deducir del código.

## El otro archivo de `data/`

`data/cuidadores.json` guarda cuatro perfiles con nombre de persona (el directorio muestra ocho:
los otros cuatro están escritos adentro del HTML). No es catálogo: son datos de muestra de
PresDemo, la Prestadora de ejemplo, inventados de punta a punta.

## Lo que se corrigió contra un competidor en actividad

En agosto de 2026 se relevó a fondo un competidor que ya opera con volumen, y sus formularios
reales se pusieron al lado de estas listas. El informe está fuera del repositorio, en
`No commit\investigacion\`. No se copió su modelo: se usó su inventario de campos para ver qué
nos faltaba. Apareció esto, y ya está aplicado.

- **Las tareas eran una sola lista de seis y ahora son tres listas de diecisiete.** La lista
  vieja mezclaba higiene y medicación con cocina, y no tenía limpieza, lavado, planchado, paseos
  ni acompañamiento a turnos. No es una omisión de prolijidad: **la Ley 26.844 rige el trabajo en
  casas particulares y el cuidado de la salud no entra ahí.** Una lista que mezcla las dos cosas
  no permite saber qué se acordó, que es exactamente lo que después se discute.
- **Las patologías eran siete y ahora son diecinueve.** Faltaban hipertensión, anticoagulación,
  EPOC, arritmias y deterioro cognitivo, que están entre las más comunes del rubro. Cada una que
  faltaba era un Asistente que no podía declarar su experiencia y una Familia que no podía
  buscarla.
- **Apareció un eje que no teníamos: discapacidad.** Cinco opciones. No es una patología —una
  patología es un diagnóstico, una discapacidad es una condición de vida— y por eso es lista
  aparte.
- **Cada tipo de Asistente dice ahora si exige Matrícula.** El glosario ya lo pedía; la lista no
  lo guardaba. La regla estaba escrita y el dato no existía.
- **`modalidad_contratacion` mezclaba tres ejes y obligaba a elegir uno.** «Con retiro» y «sin
  retiro» salieron a su propia lista y no son excluyentes: quien trabaja de las dos formas antes
  no lo podía declarar.
- **Las verificaciones eran tres y ahora son siete.** Faltaban domicilio, matrícula, salud y
  referencias.

Cada lista nueva lleva un campo `origen` que dice de dónde salió. Las que no lo llevan salieron
de nuestras pantallas.

## Lo que no es una lista, y por eso no está acá

Tres cosas aparecieron en el relevamiento, hacen falta, y **no entran en este archivo**: no son
opciones para elegir, son campos del legajo. Se anotan acá para que no se pierdan al diseñar el
esquema.

**Banderas del legajo del Asistente** — se responden con sí o no, no con una opción de lista:

- Disponible para reemplazos urgentes.
- Visible para las Familias.
- Visible en la vidriera pública y para los buscadores.
- Comparte su teléfono con quien lo contacta.

Las tres últimas son el consentimiento de la persona para ser publicada. **Hoy no existen, y sin
ellas publicar un legajo es una decisión que toma el sistema por ella.** Tocan directamente el
pendiente 2. El interruptor es de esta modalidad y el registro del consentimiento es del legajo:
ver `docs/MODULOS.md`.

**Fichas repetibles** — no es un campo con opciones, es una lista de registros que la persona
agrega de a uno:

- **Estudio o curso**: institución, título obtenido, año de finalización, foto del título.
  `nivel_educativo` se conserva como nivel alcanzado, pero no alcanza para esto: **una Matrícula
  necesita número, vigencia y archivo**, y en una lista cerrada de cuatro opciones no hay dónde
  ponerlos.
- **Experiencia laboral**: puesto, inicio, finalización, tareas realizadas, referencia del
  empleador. El puesto sí tiene lista cerrada, `puesto_experiencia`.
- **Referencia**: nombre, teléfono, comentarios.

**Cuáles verificaciones bloquean el alta y cuáles son opcionales** es una decisión de negocio, no
un dato de catálogo. Está sin tomar.

## Lo que falta

Está en `docs/PENDIENTES.md`, pendiente 8. En resumen: estos dos archivos son la semilla, no el
destino. El destino son las tablas de Careonys, porque este proyecto es una modalidad suya y no un
producto aparte: ver `docs/ALCANCE.md` §3. Antes de escribirlas hay que ver cuánto de este
catálogo ya existe allá —`tipos_asistente` y `zonas_cobertura` seguro, y hay tabla de tareas—.
