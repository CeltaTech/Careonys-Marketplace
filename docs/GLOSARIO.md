# Glosario obligatorio — Careonys Marketplace

> **Copia del glosario de Careonys** (`productos/careonys/CLAUDE.md` §4), tomada el 2026-08-23.
> **El original manda.** Si los dos difieren, gana el de Careonys y esta copia se corrige.
> Nada de lo heredado se edita acá: los términos propios de este proyecto van al final,
> en "Términos nuevos", sin mezclarse con la tabla heredada.

Aplica a código, nombres de variables/tablas/componentes, claves de i18n, texto visible,
documentación y commits. Antes de usar un término de negocio nuevo: verificarlo contra esta
tabla; si no está, proponerlo para aprobación antes de usarlo.

---

## 1. Términos heredados de Careonys

Esta tabla **no se edita en este proyecto.** Se actualiza copiándola de nuevo desde el original.

| Usar siempre | Nunca decir |
|---|---|
| CeltaTech | nombres anteriores de la empresa; "software de CeltaTech" al referirse al producto |
| Careonys | "Aurevia", el nombre anterior del producto. Única excepción: la clave técnica `codigo: 'aurevia'` de `identidadProducto.js` y las claves de entitlements que se arman con ella (`aurevia.pacientes.activos_max`), que son inmutables por diseño y **no** se renombran |
| Prestadora, o **empresa prestadora** — las dos formas valen indistintamente (sinónimo aceptado además: "licenciataria", cuando el contexto es específicamente la relación de licenciamiento SaaS con CeltaTech). Es el caso específico de un cliente de CeltaTech que contrata Careonys — no todo cliente de CeltaTech es una Prestadora (podría contratar otro producto de CeltaTech sin dedicarse al cuidado de personas; ver `celtatech/docs/ARQUITECTURA_NIVELES.md`) | "empresa" a secas (ambigua: a nivel CeltaTech significa cualquier cliente, no una Prestadora), empresa cliente, organización comercial, empresa usuaria (fuera del sentido técnico del sistema) |
| Cliente (a secas, únicamente cuando se habla desde la perspectiva de CeltaTech/Nivel 1 sobre cualquier empresa que le contrata un producto, sea o no Careonys) | usar dentro del contexto de Careonys para referirse a la Familia o a la Prestadora — dentro de Careonys esos dos roles siempre llevan su propio nombre, nunca "cliente" genérico. Dentro de Careonys la única acepción válida es la forma corta de **Cliente Contratante** (ver la entrada siguiente) |
| Cliente Contratante — quien contrata un Servicio y a quien se le cobra: una Familia, una Obra Social, o cualquier otro que contrate. Es el término **completo**, el que se usa en documentos y donde pueda haber duda. **En pantalla y en la charla se dice "Cliente" a secas** — es la palabra que la gente usa, y no se pelea con ella. En el código y en la base el identificador es `contratante`, que nombra la función y no se confunde con el "Cliente" de CeltaTech | escribir "Cliente Contratante" en un botón, una etiqueta o un título de pantalla (ahí va "Cliente"); usarlo para la Familia cuando lo que se quiere decir es la Familia (ahí va "Familia"); confundirlo con el Paciente (quien recibe el cuidado) ni con quien paga (puede ser otro, si la Obra Social cubre una parte) |
| Organización | entidad técnica multi-tenant — no confundir con "Prestadora" en texto de negocio |
| Sandbox | empresa cliente, Prestadora real, organización comercial |
| Asistente — es el término **genérico**, el único que usan el código y las tablas. Cuidador/a, enfermero/a, kinesiólogo/a, médico/a, etc. no son otros nombres del Asistente: son **tipos** de Asistente (ver la entrada siguiente) | empleado/a, trabajador/a; usar el nombre de un tipo ("cuidador") como si fuera el término general |
| Tipo de Asistente — **qué es** un Asistente: cuidador/a, enfermero/a, kinesiólogo/a, médico/a, y los que cada Prestadora agregue. Vive en un catálogo de dos niveles (general de CeltaTech + propio de cada Prestadora). Cada tipo define sus Tareas y si requiere Matrícula | especialidad, categoría, puesto, rol (rol es del sistema, ver §5) |
| Tareas — **qué hace y qué no hace** un tipo de Asistente. Son siempre dos listas separadas, nunca un párrafo que las mezcle: las que le corresponden y las que no. La segunda existe porque es la que evita la confusión con las Familias, y por eso pesa igual que la primera | funciones, incumbencias, perfil del puesto, "descripción de tareas" como texto único |
| Familia | cliente, usuario |
| Paciente | adulto mayor (salvo contexto clínico específico) |
| Servicio — todo lo que la Prestadora acordó hacer por un Cliente y le cobra por eso: las horas de cuidado, la enfermería, la kinesiología, los traslados, la limpieza de la casa, lo que se haya acordado. Es el acuerdo entero. Cada cosa del acuerdo tiene sus propios días y horarios, y empieza y termina cuando le toca: una puede sumarse en mayo y otra terminarse en junio, y el Servicio sigue abierto igual. Un mismo Servicio puede cuidar a más de un Paciente, por ejemplo a un matrimonio | guardia, prestación, solicitud |
| Prestación — cada cosa del acuerdo, con su precio. El Servicio es el acuerdo entero; la prestación es cada cosa que hay adentro. Unas se cubren con guardias, como el cuidado por horas; otras se hacen y se cobran de una vez, como un traslado o una limpieza. **Siempre lleva su alcance escrito en dos listas separadas: qué incluye y qué no incluye** — la segunda es la que evita los malentendidos con la Familia | servicio, guardia, renglón de la lista de precios; un párrafo único que mezcle lo que incluye con lo que no |
| Cerrar un Servicio — la finalización definitiva de ese Servicio: se deja de prestar y se deja de cobrar, se dan de baja sus prestaciones, se cancelan sus guardias futuras y se avisa a los Asistentes que se quedan sin ese trabajo. Nada se borra. **Sinónimo aceptado, de la jerga del rubro: "levantar el servicio"**, que se usa sobre todo cuando la decisión de terminar la toma la Prestadora | confundirlo con cerrar una Guardia; confundirlo con dar de baja a un Paciente |
| Guardia — las horas seguidas que un Asistente pasa cuidando, desde que llega hasta que se va. En esas horas atiende a uno o a varios Pacientes: un matrimonio en su casa, o un grupo entero en una residencia. Cada Paciente atendido tiene su propio Reporte diario. La guardia es una parte de un Servicio | turno, jornada, servicio, visita |
| Check-in y check-out — el aviso de que el Asistente llegó al domicilio y el aviso de que se fue. El check-in marca el comienzo real de la guardia; el check-out, el final. Las dos palabras están en inglés y se dejan así a propósito: son las que usa todo el mundo, en este rubro y en cualquier aplicación de trabajo por turnos, y traducirlas confundiría más de lo que aclararía. Se escriben igual en los tres idiomas | fichar, marcar tarjeta; "entrada y salida" a secas, que no dice de qué entrada se habla; confundir el check-out con cerrar la guardia — el check-out dice que el Asistente se fue, y el cierre es el paso aparte donde se confirma que quedó todo hecho |
| Modalidad de trabajo — cómo la Prestadora hace llegar el trabajo. Son tres: prestación directa (la Prestadora asigna las guardias), marketplace (el Asistente elige cuáles toma) y subcontratación (el trabajo lo cubre otra empresa con su propio plantel). Cada Asistente está en una de las dos primeras, o en las dos; en la tercera nunca, porque esa gente no es nuestra | "canal" para nombrar esto — en este producto un canal es por dónde sale un aviso: WhatsApp, correo, notificación al celular. Usar la misma palabra para las dos cosas obliga a adivinar cuál se está nombrando |
| Subcontratación — la tercera **modalidad de trabajo** de una Prestadora, junto con prestación directa y marketplace: la Prestadora toma un servicio de un cliente (por ejemplo una Obra Social) y se lo deriva a otra empresa, que lo cubre con su propio plantel. Valor guardado: `subcontratacion` | "cooperativa" (nombra otra cosa: una forma de organizarse entre trabajadores, no una empresa que recibe trabajo derivado); tercerización; derivación |
| Empresa subcontratada — la otra empresa, la que pone su propio plantel y cubre el servicio derivado. No es una Prestadora (no tiene licencia de Careonys) ni un Asistente | proveedor a secas, contratista, "la cooperativa" |
| Coordinador (sinónimo aceptado: "supervisor" — hoy son la misma cosa con otro nombre; si en versiones futuras se separan, se separan acá. El rol en el código sigue llamándose `coordinador`) | jefe, encargado |
| Estado actual — la pantalla de entrada del Panel: arriba lo que no está bien hoy, abajo la semana entera. Se llama así porque eso es lo que contesta: *cómo está todo ahora mismo*. En el código: `pages/EstadoActual.jsx`, clave `estado_actual` | mostrador (nombra el mueble, no lo que la pantalla muestra), estatus (es "status" adaptado del inglés, ver la pregunta 3 más abajo), tablero, dashboard, home, inicio |
| Reporte diario | informe, planilla, parte |
| Vínculo / Cese | contrato de trabajo, despido (salvo causal literal de despido) |
| Proceso de Incorporación de Asistentes | selección, filtro, pipeline, reclutamiento |
| Certificado de Aptitud | certificado genérico, diploma, certificado propio de una Prestadora |
| Obra Social | IOMA (salvo que sea literalmente la obra social configurada por esa Familia/Paciente), obra social genérica no configurable |
| Número de afiliado | ioma_afiliado, afiliado IOMA |
| Ausente sin relevo previo | cualquier término en inglés o genérico para el caso de un Asistente que no se presenta a una Guardia cuando no había ningún otro Asistente cubriendo antes de él (ej. primera guardia del día para un Paciente) — distinto de un ausente con relevo, donde sí hay alguien saliente esperando |
| Documentación (vencimientos documentales de Asistentes, por Prestadora) | compliance, cumplimiento normativo |
| Indicación de medicación (medicamento/dosis/frecuencia/vía solicitados por la Familia para un Paciente, sujeta a aceptación del Panel) | medicación habitual, orden médica genérica |
| Matrícula — **qué autoriza legalmente** a ejercer a un Asistente, emitida por el colegio o el organismo que corresponda (número, vigencia, archivo). Los tipos de Asistente que la requieren no pueden atender a ningún Paciente sin ella vigente y verificada. Distinta de las Tareas (qué hace) y del Tipo (qué es) | habilitación (se lee como "habilidades del Asistente", lo contrario de lo que significa), certificación genérica, licencia, permiso |
| Desarrollador (quien dirige el desarrollo y aprueba las decisiones elevadas) | nombre propio de esa persona como estand-in genérico; no es un rol del sistema (ver §5) |
| multi-tenant, SaaS, RLS, MFA, Sandbox | — (términos técnicos permitidos tal cual) |

**Verificación al cerrar cualquier tarea que tocó texto visible:** ¿se incorporó algún término nuevo no aprobado? Si sí, la tarea no está terminada hasta agregarlo al glosario o reemplazarlo.

---

## 2. Cómo se aprueba una palabra nueva

**Cómo se escribe una definición.** El glosario lo lee cualquiera —una Coordinadora, una Familia, alguien que entró ayer—, no quien programó el producto. Entonces: se dice **qué es** la cosa, no qué no es (para eso está la columna de al lado); sin nombres de tablas, de columnas, de archivos ni de números de pendiente; sin mandar a otro documento a buscar "la definición completa" — si hace falta un documento aparte para definir una palabra, la definición está mal escrita; y con un ejemplo de la vida real cuando ayude a entender. Si hay que explicarla cada vez que aparece, la definición no está funcionando.

**Cinco preguntas antes de proponer una palabra nueva.** La tabla dice qué palabras están aprobadas; esto dice contra qué se aprueba una que todavía no está. Solo si pasa las cinco se propone:

1. ¿Ya existe una palabra aprobada para esto? Si existe, no hace falta otra.
2. ¿La palabra es del negocio o de la tecnología? Ante la duda, la del negocio gana: el producto lo usan Coordinadoras, no programadores.
3. ¿Hay una equivalente clara en castellano? Si la hay, se usa esa.
4. Si es en inglés, ¿está tan aceptada en informática que traducirla confundiría más que aclarar? (`multi-tenant`, `SaaS`, `RLS` pasan esta prueba; casi ninguna otra.)
5. ¿La entiende alguien que no conoce el tema? Si hace falta explicarla cada vez que aparece, la palabra no está funcionando.

**Equivalencias de uso corriente.** No es prohibición de términos técnicos: es que, existiendo la forma en castellano, se escribe en castellano.

| En vez de | Escribir |
|---|---|
| Workflow engine | Motor de flujo de trabajo |
| Business intelligence | Análisis de información del negocio |
| Core engine | Motor principal del sistema |
| Deployment | Publicación de una nueva versión |
| Logging | Registro de actividades |
| CRUD | Alta, baja, modificación y consulta (o "administración de información") |

*Excepción:* los **nombres comerciales** —de un plan, de un módulo que se vende— son una decisión de marca y pueden quedar como estén. Esta tabla rige el texto que describe el producto, no cómo se llama lo que se vende.

---

## 3. Términos nuevos de este proyecto

Conceptos que el marketplace necesita y que **no existen en el glosario de Careonys**. Cada uno
se propone acá antes de usarlo en código. Cuando los productos se fusionen, esta lista es la que
se revisa para decidir cuáles suben al glosario común.

| Término propuesto | Qué es | Estado |
|---|---|---|
| **modalidad de este producto** — identificador: `modalidad` | La modalidad de trabajo en la que el Cliente Contratante busca entre los Asistentes de su Prestadora, compara, elige y contrata, en vez de recibir una asignación. Es una de las tres, junto con prestación directa y subcontratación. Ejemplo: una Familia entra, filtra por zona y por patología, mira tres perfiles y pide contratar a uno. No es el Vínculo: el Vínculo es la relación de un Asistente con su Prestadora, y existe igual en las tres modalidades | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |
| **Legajo** — identificador: `legajo` | Todo lo que la Prestadora guarda de un Asistente: sus datos, sus estudios, sus papeles, su experiencia y las verificaciones que le fue haciendo. Es el currículum con los respaldos adjuntos, y es lo que la Prestadora mira para decidir si esa persona puede trabajar. La persona lo completa una vez y después lo mantiene al día. Nadie de afuera lo ve entero, y hay partes que no salen nunca | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |
| **Perfil** | Lo que se muestra de un Asistente a quien lo está buscando: su nombre, su foto, su zona, qué atiende y su precio por hora. Sale del legajo pero no es el legajo: es la parte elegida para mostrar, y el Asistente decide si se publica o no. Es el mismo sentido que tiene la palabra en cualquier red social: el perfil es lo que se ve, y también dónde se elige qué se ve | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |

**Dos nombres, y a propósito.** En pantalla, en documentos y en la charla se dice **modalidad de
contrataciones**, que es lo que la gente entiende. En tablas, columnas, claves de traducción y
nombres de módulo va `modalidad`, corto y sin ruido. Es el mismo criterio que §1 ya usa con Cliente
Contratante, cuyo identificador es `contratante`.

**Por qué `modalidad` y no las otras.** Una modalidad de trabajo es, en castellano corriente, el lugar donde
una parte publica lo que ofrece, la otra lo que necesita, y se encuentran: es exactamente esto.
`contratacion` a secas se descartó porque se lee como si la plataforma contratara al Asistente, que
es justo lo que no pasa y lo que no conviene insinuar. `mercado` se descartó por ser la traducción
literal de `marketplace`, la palabra que en las tablas de Careonys nombra otra cosa. `directorio`
nombra una pantalla, no la modalidad.

**El legajo y el perfil no son la misma cosa, y confundirlos ya hizo daño.** El legajo es lo que la
persona entrega y la Prestadora audita; el perfil es la cara visible de una parte de eso, la que el
Asistente eligió mostrar. Quien completa un formulario largo con documentos y certificados
está completando su legajo, no su perfil, y decirle «complete su perfil» le hace esperar otra cosa. La línea de comandos
las mezcló durante meses, en pantalla y en documentos, hasta que el Desarrollador lo marcó el 24 de
agosto de 2026.

**El perfil va sin adjetivo.** Se escribió «perfil público» un tiempo, para separarlo de la parte que
no se muestra. No hace falta: esa parte no es un perfil privado, es el legajo. Lo que está en el
perfil está para mostrarse, y con eso alcanza.

**Cuidado con una tercera cosa que hoy también se llama perfil.** En el código, `perfil` nombra
además la ficha de la cuenta: quién es la persona que inició sesión, con qué rol entra y de qué
Prestadora es. Está guardada así desde el principio y no se renombra, porque la regla 5.1 dice que
un identificador guardado se queda como está. En texto visible, entonces, «perfil» es siempre lo que
se muestra de un Asistente; la ficha de la cuenta no se nombra en pantalla.

**Cómo se agrega uno:** pasa las cinco preguntas de §2, se escribe acá con su definición según
los criterios de §2, y recién entonces se usa en código.

---

## 4. Conflicto abierto: la palabra "marketplace"

**Esto se resuelve antes de escribir la primera tabla.**

**Aviso sobre §1: la definición heredada de "Modalidad de trabajo" está equivocada, y el error
viene de Careonys.** Dice que en marketplace *"el Asistente elige cuáles toma"*. Eso no distingue
nada: aceptar o rechazar una guardia es un derecho del Asistente y vale en las tres modalidades.
La tabla donde se ejerce, `ofertas_guardia`, **no tiene columna de canal**. La fila de §1 se deja
como está porque es copia y el original manda; se corrige del lado de Careonys.

**Qué separa de verdad esos valores en Careonys: el régimen de trabajo.** Su propia migración lo
dice —*"en prestación directa la Prestadora dirige el trabajo; en marketplace el Asistente elige
qué toma y mantiene su independencia operativa"*— y de ahí cuelgan las siete advertencias del
artículo 23 de la LCT y las dos versiones del consentimiento, cuyos valores son `dependencia` y
`autonomo`. O sea: ese valor debería llamarse `autonomo`, y `marketplace` está mal puesto.

**Un mercado es otra cosa:** un lugar donde alguien publica lo que necesita o mira lo que hay
ofrecido, la otra parte acepta o no, y si coinciden empieza la prestación. Eso es lo que
construyen las pantallas de este proyecto —directorio con filtros, perfil, solicitud de
contratación, postulación—.

**Conclusión: la palabra igual no se puede usar acá.** No porque el significado esté tomado —el
significado es éste—, sino porque el valor `marketplace` ya está **guardado** en
`prestadora_modalidades`, `asistentes.canales` y `guardias.canal_modalidad`. Dos usos de la misma
palabra dentro del mismo sistema es exactamente lo que el glosario existe para impedir, y el
problema aparecería recién en la fusión, cuando ya es caro. Detalle completo en
`docs/ALCANCE.md` §3.

## Resuelto el 24 de agosto de 2026: el término es `modalidad`

**El nombre comercial no cambia.** «Careonys Marketplace» puede seguir diciéndose en la web, en el
material de venta y en la charla: §1 admite que los nombres comerciales son decisión de marca.
Lo que se eligió acá es el término técnico, el que va a tablas, columnas, claves de traducción y
módulos, y que casi nadie ve.

**El término es `modalidad`, y el nombre visible es «modalidad de este producto».** La definición
completa está en §3, con las razones por las que se descartaron `contratacion`, `mercado` y
`directorio`.

**La prohibición sobre `marketplace` queda firme y deja de ser provisoria.** No se usa en ningún
identificador de este proyecto —ni sola, ni como parte de una palabra compuesta— porque el valor
ya está guardado en tres tablas de Careonys nombrando otra cosa, y dos usos de la misma palabra en
un mismo sistema es lo que este glosario existe para impedir. El problema aparecería en la
fusión, cuando ya es caro.

**Lo que sigue abierto, y no es de este lado:** en Careonys ese valor debería llamarse `autonomo`,
la palabra que sus propias tablas legales ya usan para lo mismo. Es un valor guardado en
producción, así que cambiarlo es una migración y una decisión del Desarrollador del lado de
Careonys. Acá sólo queda anotado.
