# El catálogo del producto

Todas las listas cerradas del producto —los perfiles profesionales, las zonas, las patologías,
las modalidades de contratación, los servicios, los cursos— viven en dos archivos y en ningún
otro lado:

| Archivo | Qué guarda |
|---|---|
| `data/catalogo-vocabularios.json` | 22 listas de opciones, 134 opciones en total |
| `data/catalogo-oferta.json` | 9 servicios, 6 cursos y la evaluación con sus 2 preguntas |
| `data/catalogo-autorizaciones.json` | Lo que el Asistente autoriza al cerrar el alta |
| `data/catalogo-disponibilidad.json` | La grilla de días y turnos, y la pregunta de los reemplazos urgentes |
| `data/catalogo-fichas.json` | 4 fichas repetibles: matrícula, estudio, experiencia y referencia |
| `data/catalogo-verificaciones.json` | Qué bloquea el alta, qué bloquea la publicación, y con qué plazos |

Los dos primeros son listas de opciones. Los cuatro que siguen, del 24 de agosto de 2026, no
son listas: guardan preguntas de sí o no, la grilla horaria, formularios repetibles y plazos.
Todos están declarados con su texto en los tres idiomas, porque «multiidioma desde el día uno» no admite construir
en uno solo «para traducir después».

`catalogo-autorizaciones.json` se llamaba `catalogo-banderas.json` hasta el 24 de agosto de
2026. La palabra la había puesto la línea de comandos traduciendo *flag*, y el Desarrollador la
sacó: «una bandera es una tela que identifica un país o un ejército, pero nunca es una casilla».
La tabla se llama `autorizaciones_asistente` desde la migración 0012.

Antes estaban escritas a mano adentro del HTML, repetidas pantalla por pantalla. La mayoría
de las pantallas todavía no las lee: eso pasa al portar cada una.

**Los cursos y la evaluación dejaron de vivir solo en el archivo.** Desde el 24 de agosto de 2026 están además en la base, en las tablas `cursos`, `evaluaciones`, `preguntas_evaluacion` y `opciones_pregunta` (`supabase/migrations/0008_cursos_y_evaluaciones.sql`), sembradas desde `data/catalogo-oferta.json`. Tenían que estarlo: un examen que se corrige del lado del servidor necesita la respuesta correcta guardada donde el navegador no llegue. El archivo sigue siendo de dónde salió el contenido; la base es de dónde lo lee el producto. Las tablas admiten además cursos propios de una Prestadora: `tenant_id` vacío es la oferta general de CeltaTech, `tenant_id` cargado es la de esa Prestadora.

**La primera que sí las lee es `registrar-asistente.html`, desde el 24 de agosto de 2026.**
Su paso 5 dibuja las cuatro fichas repetibles desde `data/catalogo-fichas.json` con el motor
`js/fichas-legajo.js`, su paso 7 arma el cierre desde `data/catalogo-autorizaciones.json`, y el
Tipo de Asistente del paso 2 sale del vocabulario `tipo_asistente`. Nada de eso está
escrito en la pantalla, ni siquiera la regla de cuándo la Matrícula es obligatoria: eso lo
decide la propiedad `requiere_matricula` de cada tipo del vocabulario. Agregar un tipo
profesional que exija Matrícula hoy no toca una sola línea de código.

**Un ítem puede traer además `icono` y `bajada`, y los dos son optativos.** Salieron el 24 de
agosto de 2026 de las diez tarjetas que `formulario-integral.html` tenía escritas adentro: cada
una traía su ícono y su explicación de una línea, y ahora las trae el catálogo. Un ítem sin esos
campos se dibuja igual —con su etiqueta y un ícono neutro—, así que no hay que inventarle una
explicación a nada para que aparezca. La bajada cuelga por idioma, como todo el texto visible.

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

## El archivo de perfiles que había en `data/`

Había un `data/cuidadores.json` con cuatro perfiles con nombre de persona, inventados de punta a
punta. No era catálogo —eran datos de muestra— y no lo leía ninguna pantalla: los perfiles que se
ven siguen escritos adentro del HTML. Se borró el 24 de agosto de 2026, con el pendiente 14.

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

Tres cosas aparecieron en el relevamiento, hacen falta, y **no entran en `catalogo-vocabularios.json`**:
no son opciones para elegir, son campos del legajo. **Están declaradas en sus archivos propios, y
desde el 24 de agosto de 2026 además tienen tabla real**, aplicada contra la base con
`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql`: matrículas, estudios,
experiencia laboral, referencias, documentos con vencimiento, verificaciones y el consentimiento
de publicación. Lo que sigue explica qué son y por qué se decidieron así; el JSON sigue
siendo la fuente del texto en los tres idiomas, la tabla guarda los datos.

El nombre de ese archivo de migración todavía dice «banderas», y se deja así a propósito: el
programa de Supabase reconoce cada migración aplicada por su número **y su nombre**, así que
cambiarle el nombre a una que ya corrió obliga a repararlo a mano en el servidor. El contenido sí
está al día.

**Lo que el Asistente autoriza al cerrar el alta** — se responde con sí o no, no con una opción
de lista. Hoy hay una sola:

- **Publicar mi perfil**, que es el consentimiento para que se muestre.

Antes había una segunda, «disponible para reemplazos urgentes». **El Desarrollador decidió el 24
de agosto de 2026 que eso no es una autorización sino una disponibilidad**, y se mudó al paso de
disponibilidad horaria: hoy vive en `data/catalogo-disponibilidad.json` y se guarda en la tabla
`disponibilidad_asistente` (migración 0012). No es lo mismo permitir algo que estar disponible
para algo.

### Qué verificación bloquea qué (pendiente 20, resuelto el 24 de agosto de 2026)

De las siete verificaciones del legajo, sólo el **documento de identidad** frena el **alta**: sin saber quién es la persona, nada de lo demás significa nada. Las demás frenan recién la **publicación** —aparecer en la modalidad y poder ser contratado—, y no todas de la misma manera:

- **Antecedentes penales**: obligatorio para publicar, con **15 días de plazo** desde el alta para presentarlo. Si el plazo pasa sin presentarlo, **el legajo se bloquea**, no sólo la publicación. Vigencia de 6 meses, criterio de la Prestadora y no un plazo de ley.
- **Certificado de salud**: obligatorio para publicar. Anotado como libreta sanitaria (vigencia anual), **a confirmar con el Desarrollador** —puede ser también o en cambio un apto médico.
- **Matrícula y título**: obligatorios para publicar **sólo si el tipo de Asistente los exige** (`tipo_asistente.requiere_matricula`). Un cuidador no queda trabado por algo que no le corresponde.
- **Domicilio y referencia laboral**: no bloquean nada, suman al perfil.

Vive declarado en `data/catalogo-verificaciones.json`, con su razón de ser cada una. Los plazos y vigencias los tiene que vigilar el módulo de Documentación y vencimientos (`docs/MODULOS.md`): un plazo que nadie mira no es un plazo.

### Las dos que se propusieron y se descartaron

**Decidido por el Desarrollador el 24 de agosto de 2026.** El relevamiento trajo otras dos —aparecer
en los buscadores de internet, y compartir el teléfono al ser contactado— y las dos se sacaron.

**No por privacidad: porque regalan el negocio.** Si el perfil se indexa en un buscador, la Familia
llega al Asistente sin pasar por la plataforma. Si el teléfono se comparte, el segundo contacto
tampoco pasa. El competidor relevado tiene las dos encendidas, y por eso cobra el contacto una
sola vez y después mira.

De ahí salen dos reglas:

- **El teléfono no se muestra nunca, y no es una preferencia del Asistente.** Se guarda en el
  legajo, la Prestadora lo usa, y ninguna pantalla lo muestra a ninguna Familia. La Familia
  contacta por la plataforma.
- **El directorio no puede quedar abierto a los buscadores.** **Hecho el 24 de agosto
  de 2026:** `directorio.html` y `perfil.html` llevan `noindex, nofollow`. **Y decidido el
  mismo día (pendiente 2):** el directorio sí se ve sin iniciar sesión, con nombre y foto,
  porque es lo que convence a una Familia que todavía no es clienta. Lo que no se ve nunca
  son los datos de contacto, y comunicarse es sólo para Familias registradas.
- **El chat es la tercera puerta, y hay que cerrarla igual que las otras dos.** El chat existe
  para que la Familia y el Asistente se conozcan **antes** de la contratación. Si adentro del
  chat se puede escribir un teléfono, un correo o una dirección, las dos reglas de arriba no
  sirven de nada: la conversación se sigue por afuera, y la plataforma se entera del primer
  mensaje y de ninguno más. **Quien escriba el chat tiene que resolverlo dentro del chat**, y
  no alcanza con prohibirlo en un texto que nadie lee. Es el pendiente 6.
  **Hecho a medias el 26 de agosto de 2026.** El chat reconoce un teléfono, un correo o un
  domicilio y no manda el mensaje (`js/contacto.js`, reglas en `data/patrones-contacto.json`).
  Pero eso corre en el navegador de quien escribe, así que **no es un control**: lo saltea quien
  quiera saltearlo, que es justo quien tiene motivo. La otra mitad va del lado del servidor y
  todavía no se puede escribir, porque la tabla del chat no existe: pendiente 62.

Ninguna de las dos se vuelve a proponer como casilla de un formulario. Si alguna vez hay que
discutirlo, se discute como decisión comercial.

La primera es el consentimiento de la persona para ser publicada. Sin ellas, publicar un
legajo es una decisión que toma el sistema por alguien que no la tomó. Tocan directamente el
pendiente 2. El interruptor es de esta modalidad y el registro del consentimiento es del legajo:
ver `docs/MODULOS.md`.

**Se preguntan al terminar de cargar los datos, como último paso del alta.** No son una opción
escondida en el perfil: son la pregunta con la que se cierra la carga. Van al final porque
recién ahí la persona sabe qué está autorizando a publicar; si la pregunta va al principio,
contesta sobre datos que todavía no cargó.

**Las casillas arrancan sin marcar y así se guardan.** Quien cierra el alta sin tocarlas queda
sin publicar. Es a propósito: la falta de respuesta nunca puede terminar en un perfil
publicado.

**Fichas repetibles** — no es un campo con opciones, es una lista de registros que la persona
agrega de a uno. Son cuatro, no tres: la Matrícula es la que faltaba y la que bloqueaba.

- **Matrícula**: organismo que la emitió, número, vencimiento y archivo. Es obligatoria cuando el
  tipo de Asistente la exige, y ese dato ya lo guarda `tipo_asistente.requiere_matricula`.
  **Vence**, y vencida inhabilita para atender en cualquier modalidad.
- **Estudio o curso**: institución, título obtenido, año de finalización, qué perfil respalda y foto
  del título. `nivel_educativo` se conserva como nivel alcanzado, pero no alcanza para esto: en
  una lista cerrada de cuatro opciones no hay dónde poner un título con su respaldo. **La foto es
  obligatoria sólo cuando el estudio respalda un perfil que exige Matrícula**: sin el archivo, la
  verificación no tiene qué mirar.
- **Experiencia laboral**: puesto, desde, hasta y tareas realizadas. **Las tareas usan las mismas
  tres listas que el Asistente contesta sobre sí mismo**, a propósito: es lo que permite cruzar lo
  que dice saber hacer con lo que dice haber hecho. El competidor mantiene dos vocabularios
  paralelos que no se corresponden, y por eso no puede cruzarlos.
- **Referencia**: nombre, teléfono, de qué la conoce y comentarios. **Lleva su propia
  advertencia**, porque trae el dato de una persona que no está usando el sistema y no aceptó
  nada: se le avisa a quien carga que a esa persona hay que avisarle. No se muestra en el perfil
  público ni la ve ninguna Familia.

**Cuáles verificaciones bloquean el alta y cuáles son opcionales** es una decisión de negocio, no
un dato de catálogo. Está sin tomar.

## Lo que falta

Está en `docs/PENDIENTES.md`, pendiente 7. En resumen: estos dos archivos son la semilla, no el
destino. El destino son las tablas de Careonys, porque este proyecto es una modalidad suya y no un
producto aparte: ver `docs/ALCANCE.md` §3. Antes de escribirlas hay que ver cuánto de este
catálogo ya existe allá —`tipos_asistente` y `zonas_cobertura` seguro, y hay tabla de tareas—.
