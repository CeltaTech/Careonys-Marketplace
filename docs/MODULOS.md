# La línea de corte

> **Decidido por el Desarrollador el 24 de agosto de 2026.** El sistema se diseña por módulos
> desde el esquema, no se reordena después. `docs/ALCANCE.md` §3 ya dijo qué módulos existen del
> lado de Careonys y no se construyen acá. Esto dice **dónde pasa el corte** en todo lo demás.

## Por qué se corta

Por tres motivos, en este orden:

1. **Un módulo compartido sirve a las tres modalidades.** Prestación directa, esta modalidad y
   subcontratación necesitan el mismo legajo de Asistente, el mismo catálogo, la misma
   documentación con vencimientos. Construirlo una vez es construirlo una vez.
2. **Una mejora se actualiza en un solo lugar.** Si el legajo está partido en dos copias, la
   mejora se hace dos veces o se hace una y la otra queda vieja. Es el pendiente 13 otra vez, que
   ya nos pasó con `apiClient.js` triplicado.
3. **Lo propio de esta modalidad no puede ensuciar lo compartido.** Si el módulo de legajo sabe
   qué es una vidriera, prestación directa arrastra un concepto que no usa, y cada cambio de la
   vidriera obliga a tocar el legajo de todos.

## La regla

**De un lado va lo que es verdad sobre un Asistente, una Familia o un Paciente
independientemente de cómo llegó el trabajo. Del otro, lo que sólo existe porque el cliente
busca y elige en vez de recibir una asignación.**

La pregunta que decide cada caso: *¿esto seguiría teniendo sentido en prestación directa?* Si la
respuesta es sí, es compartido. Si es no, se queda de este lado.

## El reparto

### Compartido — sirve a las tres modalidades

| Módulo | Qué guarda | Por qué es compartido |
|---|---|---|
| **Catálogo** | Tipos de Asistente con su Matrícula, tareas de cuidado, del hogar y de acompañamiento, patologías, discapacidades, zonas, modalidades | Un cuidador que sabe aplicar inyecciones lo sabe igual en las tres modalidades. Hoy en `data/catalogo-vocabularios.json`; su destino son las tablas de Careonys |
| **Legajo del Asistente** | Datos personales, estudios con su título y su archivo, matrícula con su vigencia, experiencia laboral, referencias | Es quién es la persona, no cómo consiguió el trabajo |
| **Documentación y vencimientos** | Qué papel hace falta, cuál bloquea, cuál vence y cuándo, quién lo validó | Un certificado vencido inhabilita en cualquier modalidad |
| **Verificación** | Qué se controló de un legajo y con qué resultado | Ídem |
| **Disponibilidad horaria** | Los días y las franjas en que la persona puede trabajar | Se usa para asignar igual que para mostrar |
| **Cursos y certificaciones** | La oferta de cursos, la evaluación y el resultado | Careonys registra el resultado pero no tiene la oferta: ver `docs/ALCANCE.md` §3 |
| **Organización y aislamiento** | La Prestadora de cada dato y quién puede verlo | Es la regla 2 del `CLAUDE.md`. Nunca puede vivir de un solo lado |
| **Motor de formularios** | Campos, etiquetas, validaciones y pasos declarados, no dibujados | Regla 5.1. El motor es genérico; los formularios que carga, no |

### Propio de esta modalidad — se queda de este lado

| Módulo | Qué hace | Por qué no cruza |
|---|---|---|
| **Vidriera y perfil público** | Muestra Asistentes a quien todavía no es cliente | En prestación directa nadie mira un catálogo: recibe una asignación |
| **Filtros de búsqueda** | Deja combinar tipo, zona, patología, disponibilidad | Existe porque hay alguien buscando |
| **Aviso y postulación** | La Familia publica lo que necesita; el Asistente se ofrece | En prestación directa el trabajo se asigna, no se postula |
| **Orden de aparición** | Con qué criterio se ordena lo que la vidriera muestra | Sin vidriera no hay orden que decidir |
| **Interruptor de visibilidad** | Si el Asistente aparece en la vidriera | Nadie aparece en ningún lado en prestación directa. **No incluye el teléfono**: eso no se muestra nunca, en ninguna modalidad, y por eso no es un interruptor sino una regla —ver `docs/CATALOGO.md` |
| **Contacto y su costo** | Cómo una Familia llega a un Asistente y qué se cobra por eso | Y además: hasta que no se resuelva `docs/ALCANCE.md` §4, acá no se construye nada comercial |

## Los tres casos que limitan

**El consentimiento de visibilidad se parte en dos.** El interruptor —*¿aparezco en la vidriera?*—
es de esta modalidad. El **registro de que la persona dio ese permiso** es del legajo, y va del
lado compartido. Si mañana otra aplicación publica algo de un Asistente, tiene que poder ver que
ya prestó consentimiento, en vez de pedirlo de nuevo o, peor, publicarlo sin preguntar.

**El puntaje se parte en dos.** Lo que un Asistente acredita —título validado, matrícula vigente,
antecedentes presentados, curso aprobado— es del legajo y es compartido. **Cuánto vale cada cosa
y en qué orden se muestran** es de la vidriera y se queda acá: es una decisión de esta modalidad,
y en prestación directa ordenar Asistentes por puntaje no significa nada.

**El catálogo es compartido pero no todas sus listas se usan en las dos.** `retiro`,
`discapacidad` y `tarea_hogar` sirven igual en las dos modalidades. `genero_preferido` y
`motivo_consulta` sólo tienen sentido cuando alguien busca. Van igual del lado compartido: una
lista de opciones que una modalidad no consulta no le hace daño, y partir el catálogo por uso lo
volvería a romper en copias.

## Cómo se comprueba que la línea está bien puesta

No con una revisión de código: con una pregunta que se puede contestar.

**Prueba:** apagar mentalmente todo lo de este lado y preguntar si prestación directa sigue
funcionando entera. Si falta algo, ese algo estaba del lado equivocado.

**Prueba al revés, que es la que más se olvida:** buscar en lo compartido cualquier palabra que
sólo signifique algo acá —vidriera, aviso, postulación, contacto, puntaje, destacado—. Si aparece
una, se filtró.

## Lo que esta línea no resuelve

- **El término técnico de esta modalidad sigue sin elegir** (pendiente 5). Los módulos de este
  lado no se pueden nombrar hasta entonces, y por eso acá están descritos y no bautizados.
- **Dónde viven físicamente los módulos compartidos** —repositorio propio, carpeta, paquete— no se
  decide acá. Se decide con la fusión, y hasta entonces la línea es conceptual: sirve para no
  escribir una tabla del lado equivocado, que es lo caro.
- **Nada de esto autoriza a construir lógica comercial.** Sigue frenado por `docs/ALCANCE.md` §4.
