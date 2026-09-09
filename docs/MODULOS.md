# La línea de corte

> **Decidido por el Desarrollador el 24 de agosto de 2026.** El sistema se diseña por módulos
> desde el esquema, no se reordena después. `docs/ALCANCE.md` §3 ya dijo qué módulos existen del
> lado de Careonys y no se construyen acá. Esto dice **dónde pasa el corte** en todo lo demás.

> **Y desde el 25 de agosto de 2026 lo compartido no se queda acá.** El Desarrollador fijó como
> política central de CeltaTech que lo que sirve a más de un producto se escribe una sola vez y
> vive en `F:\proyectos\celtatech\Modulos\`, afuera de los productos, nombrado por su función y
> sin apellido. **`Octo` es otra cosa**: una pieza que además se vende sola, y por eso vive en
> `productos\`. El 26 de agosto agregó que **todo se usa por API, Octo y módulo por igual**, así
> que acá no se instala nada — una dirección se llama desde el navegador, que es lo que este
> producto ya hace con su base. La regla completa está en `..\..\..\docs\POLITICA_DE_MODULOS.md`.
> **Esta página no cambia**: sigue diciendo por dónde pasa el corte y qué queda de cada lado. Lo
> que agrega la política es dónde termina viviendo la columna de la izquierda. Todavía no hay
> ningún módulo creado.

## Por qué se corta

Por tres motivos, en este orden:

1. **Un módulo compartido sirve a las tres modalidades.** Las tres necesitan el mismo legajo de
   Asistente, el mismo catálogo, la misma documentación con vencimientos. Construirlo una vez es
   construirlo una vez.
2. **Una mejora se actualiza en un solo lugar.** Si el legajo está partido en dos copias, la
   mejora se hace dos veces o se hace una y la otra queda vieja. Es el pendiente 13 otra vez, que
   ya nos pasó con `apiClient.js` triplicado.
3. **Lo propio de esta modalidad no puede ensuciar lo compartido.** Si el módulo de legajo sabe
   qué es un directorio, las otras dos arrastran un concepto que no usan, y cada
   cambio del directorio obliga a tocar el legajo de todos.

## La regla

**De un lado va lo que es verdad sobre un Asistente, una Familia o un Paciente
independientemente de cómo llegó el trabajo. Del otro, lo que sólo existe porque el cliente
busca y elige en vez de recibir una asignación.**

La pregunta que decide cada caso: *¿esto seguiría siendo verdad independientemente de cómo llegó el
trabajo?* Si la respuesta es sí, es compartido. Si es no, se queda de este lado.

## El reparto

### Compartido — sirve a las tres modalidades

| Módulo | Qué guarda | Por qué es compartido |
|---|---|---|
| **Catálogo** | Tipos de Asistente con su Matrícula, tareas de cuidado, del hogar y de acompañamiento, patologías, discapacidades, zonas, modalidades | Un cuidador que sabe aplicar inyecciones lo sabe igual en las tres modalidades. Hoy en `data/catalogo-vocabularios.json`; su destino son las tablas de Careonys |
| **Legajo del Asistente** | Datos personales, estudios con su título y su archivo, matrícula con su vigencia, experiencia laboral, referencias | Es quién es la persona, no cómo consiguió el trabajo |
| **Documentación y vencimientos** | Qué papel hace falta, cuál bloquea, cuál vence y cuándo, quién lo validó | Un certificado vencido inhabilita en cualquier modalidad |
| **Verificación** | Qué se controló de un legajo y con qué resultado | Ídem |
| **Incorporación de Asistentes** | Por dónde entró la persona —se registró sola, la cargó una Prestadora, u otra vía—, en qué etapa del proceso está y qué le falta para cerrarla | El plantel es uno solo. El mismo Asistente sirve a las tres modalidades, así que reclutarlo de nuevo en cada una sería tener tres versiones distintas de la misma persona, cada una con sus papeles a medio controlar. El término está en `../../docs/GLOSARIO_PRODUCTOS_CAREONYS.md:40` |
| **Disponibilidad horaria** | Los días y las franjas en que la persona puede trabajar | Se usa para asignar igual que para mostrar |
| **Cursos y certificaciones** | La oferta de cursos, la evaluación y el resultado | Careonys registra el resultado pero no tiene la oferta: ver `docs/ALCANCE.md` §3 |
| **Calificaciones** | La calificación que deja quien recibió el trabajo, con su comentario y con la respuesta del Asistente | Quien fue cuidado puede opinar de quien lo cuidó, haya elegido a esa persona o se la hayan asignado. Es evidencia sobre la persona y va con la persona. **Cuánto pesa cada calificación y en qué orden ordena** no viene acá: eso es del directorio y se queda del otro lado |
| **Organización y aislamiento** | La Prestadora de cada dato y quién puede verlo | Es el aislamiento entre Organizaciones. Nunca puede vivir de un solo lado |
| **Motor de formularios** | Campos, etiquetas, validaciones y pasos declarados, no dibujados | «todo botón que dispara una operación se apaga».1. El motor es genérico; los formularios que carga, no |

### Propio de esta modalidad — se queda de este lado

Los módulos de este lado son seis: **directorio**, **filtros**, **avisos**, **orden**,
**visibilidad** y **contacto**. Se llaman por lo que hacen y ninguno lleva prefijo. **El nombre de
la modalidad no entra en el nombre de nada**, para que cambiarlo sea un trámite de treinta
segundos; el reparto de qué cae de cada lado lo dice el cuadro de acá abajo, que es el único lugar
donde está escrito.

| Módulo | Qué hace | Por qué no cruza |
|---|---|---|
| **Directorio y perfil** | Muestra Asistentes a quien todavía no es cliente | Existe sólo porque el cliente busca y elige: a quien le asignan el trabajo no le hace falta mirar un catálogo |
| **Filtros de búsqueda** | Deja combinar tipo, zona, patología, disponibilidad | Existe porque hay alguien buscando |
| **Aviso y postulación** | La Familia publica lo que necesita; el Asistente se ofrece | Cuando el trabajo se asigna no hay a qué postularse |
| **Orden de aparición** | Con qué criterio se ordena lo que el directorio muestra | Sin directorio no hay orden que decidir |
| **Interruptor de visibilidad** | Si el Asistente aparece en el directorio | Sin directorio nadie aparece en ningún lado. **No incluye el teléfono**: eso no se muestra nunca, en ninguna modalidad, y por eso no es un interruptor sino una regla —ver `docs/CATALOGO.md` |
| **Contacto y su costo** | Cómo una Familia llega a un Asistente y qué se cobra por eso | Y además: hasta que no se resuelva `docs/ALCANCE.md` §4, acá no se construye nada comercial |

## Los tres casos que limitan

**El consentimiento de visibilidad se parte en dos.** El interruptor —*¿aparezco en el directorio?*—
es de esta modalidad. El **registro de que la persona dio ese permiso** es del legajo, y va del
lado compartido. Si mañana otra aplicación publica algo de un Asistente, tiene que poder ver que
ya prestó consentimiento, en vez de pedirlo de nuevo o, peor, publicarlo sin preguntar.

**El puntaje se parte en dos.** Lo que un Asistente acredita —título validado, matrícula vigente,
antecedentes presentados, curso aprobado— es del legajo y es compartido. **Cuánto vale cada cosa
y en qué orden se muestran** es del directorio y se queda acá: es una decisión de esta modalidad,
y ordenar Asistentes por puntaje no significa nada cuando el trabajo llega asignado.
**Y ni siquiera es una decisión nuestra:** el 25 de agosto de 2026 quedó que cada
Prestadora pondera desde su panel cuánto suma cada comprobación, y que puede apagar el
puntaje entero si no quiere calificar a nadie. Lo que nosotros elegimos es sólo el valor
de fábrica —las cinco valiendo 20, que es 100 repartido en partes iguales—, y eso vive en
`ponderacion_comprobacion` y `puntaje_prestadora`, que caen de este lado.
**La calificación misma, en cambio, es compartida**, y la pregunta que decide lo contesta sola: una Familia que recibe una asignación puede opinar igual de quien vino a cuidar. Hasta el 25 de agosto de 2026 `docs/TABLAS_QUE_FALTAN.md` la ponía de este lado, que era exactamente la filtración que esta línea existe para evitar.

**El catálogo es compartido pero no todas sus listas se usan en las dos.** `retiro`,
`discapacidad` y `tarea_hogar` sirven igual en las dos modalidades. `genero_preferido` y
`motivo_consulta` sólo tienen sentido cuando alguien busca. Van igual del lado compartido: una
lista de opciones que una modalidad no consulta no le hace daño, y partir el catálogo por uso lo
volvería a romper en copias.

## Verificar un papel y incorporar a una persona son dos cosas

**Decidido por el Desarrollador el 25 de agosto de 2026.** Los dos repositorios tenían una tabla
llamada `verificaciones_asistente` y guardaban cosas distintas. Acá es una fila por control —qué se
miró de un legajo y con qué resultado, siete tipos, cada uno con su vencimiento—. En Careonys es
una fila por etapa del ingreso: postulación, identidad, penales, entrevista, capacitación.

**No son rivales: están a distinta altura**, y buena parte de una ya vive adentro de la otra. De
las cinco etapas de Careonys, cuatro ya tienen quién las guarde de este lado:

| Etapa | Quién la guarda ya |
|---|---|
| Postulación | el momento en que nace el legajo |
| Verificación de identidad | la verificación `dni` |
| Antecedentes penales | la verificación `penales` |
| Capacitación | un intento aprobado (`supabase/migrations/0001_base_del_esquema.sql:557`) |
| **Entrevista** | **nadie** |

Cómo queda:

1. **`verificaciones_asistente` se queda con este nombre y esta forma.** Es el módulo Verificación
   que este documento ya nombra, y tiene la columna que decide: **el vencimiento**. Un papel vence
   y hay que volver a pedirlo; una etapa del ingreso no vence nunca. Esa sola diferencia separa a
   las dos tablas mejor que cualquier explicación.
2. **La de Careonys pasa a llamarse `etapas_incorporacion`**, que es lo que su propio documento ya
   titulaba —«Proceso de Incorporación de Asistentes»—. El nombre no se inventó y además dice
   literalmente lo que pasa: *incorporar* es meter en el cuerpo, y el plantel es ese cuerpo. No
   lleva sufijo `_asistente` como sus vecinas porque sería redundante: a un papel no se lo
   incorpora, sólo a una persona.
3. **Esa tabla guarda sólo la entrevista.** Las otras cuatro etapas las lee de donde ya están. Si
   guardara las cinco tendría una segunda copia de un estado que también vive en otro lado, y dos
   copias del mismo dato terminan siempre diciendo cosas distintas — que es exactamente lo que
   pasó con `validado` y `validado_prestadora`: dos nombres para el mismo estado, y el corto no lo
   escribía nadie. Hoy queda uno solo, `validado_prestadora`, que es el que mira el directorio
   (`supabase/migrations/0001_base_del_esquema.sql:799`).

**La prueba de que la decisión es buena:** borra la duplicación en vez de repartirla. Dejar una
tabla de cada lado con nombres distintos también habría terminado el conflicto de nombres, y la
duplicación seguiría viva.

**Lo que falta y no se hace desde acá:** el renombre corre sobre el repositorio de Careonys y sobre
datos ya guardados. Se hace con la fusión, no desde este repositorio, que sólo lee los otros
proyectos.

## Cómo se comprueba que la línea está bien puesta

No con una revisión de código: con una pregunta que se puede contestar.

**Prueba:** apagar mentalmente todo lo de este lado y preguntar si las otras dos modalidades siguen
funcionando enteras. Si falta algo, ese algo estaba del lado equivocado.

**Prueba al revés, que es la que más se olvida:** buscar en lo compartido cualquier palabra que
sólo signifique algo acá —directorio, aviso, postulación, contacto, puntaje, destacado—.
Si aparece una, se filtró.

## Lo que esta línea no resuelve

- **Dónde viven físicamente los módulos compartidos** —repositorio propio, carpeta, paquete— no se
  decide acá. Se decide con la fusión, y hasta entonces la línea es conceptual: sirve para no
  escribir una tabla del lado equivocado, que es lo caro. **El Legajo del Asistente, la Documentación
  y vencimientos, y la Verificación ya tienen tabla propia** —`caregivers`, `documentos_asistente` y
  `verificaciones_asistente`, en `supabase/migrations/0001_base_del_esquema.sql:466`, `:2431` y
  `:567`—, escritas del lado compartido igual: sin ninguna columna que sepa qué es un directorio.
- **Nada de esto autoriza a construir lógica comercial.** Sigue frenado por `docs/ALCANCE.md` §4.
