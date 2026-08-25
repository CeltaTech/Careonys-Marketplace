# Las tablas que faltan

> **Qué es esto.** El material de diseño que sobrevivió a `CAREONYS_PRESDEMO_Plan_Tecnico.md`,
> borrado el 25 de agosto de 2026. Aquel archivo tenía 1.545 renglones y su propia advertencia
> decía que la arquitectura que proponía estaba descartada; lo único que seguía valiendo era el
> modelo de datos, y de ese modelo lo único que no está ya construido son las diez tablas de acá
> abajo. Eso es lo que quedó.
>
> **Qué NO es.** No es un plan, no está aprobado y no es un esquema. Es **entrada de diseño**:
> lo que alguien ya pensó, para no volver a pensarlo desde cero. Cada tabla de acá abajo lleva
> anotado qué hay que decidir antes de escribirla, y varias no se pueden escribir todavía.
>
> El estado real del producto lo cuenta `docs/ALCANCE.md`. El vocabulario manda desde
> `docs/GLOSARIO.md`. El reparto entre lo compartido y lo propio de esta modalidad está en
> `docs/MODULOS.md`.

---

## Lo que ya está construido, y por eso no está acá

El material heredado proponía 22 tablas. Doce ya existen, con otro nombre y a veces con otra
forma, y **manda lo que está en `supabase/migrations/`**, no lo que proponía el documento:

| Proponía | Existe hoy |
|---|---|
| `cuidadores` | `caregivers` |
| `profiles` | `profiles` |
| `especialidades` | el vocabulario `tipo_asistente` del catálogo |
| `disponibilidad` | `disponibilidad_asistente` y `franjas_asistente` |
| `certificaciones` | `matriculas_asistente`, `estudios_asistente` y `cursos` |
| `referencias_laborales` | `referencias_asistente` |
| documentos en Storage | `documentos_asistente` |
| `avisos` | `avisos`, con `franjas_aviso` para sus días y turnos |

Y hay cuatro que el material heredado no previó y existen igual: `tenants`, `clock_ins`,
`reportes` y las cuatro de la evaluación (`evaluaciones`, `preguntas_evaluacion`,
`opciones_pregunta`, `intentos_evaluacion`).

**Un caso que no es equivalencia sino conflicto.** El material proponía `conversaciones` +
`mensajes`, colgadas del vínculo entre una Familia y un Asistente. Lo que hay en la base es
`messages`, colgada de una búsqueda de cuidado. **No son la misma tabla con otro nombre**: son dos
modelos distintos del mismo hecho, y hay que elegir uno. Está anotado en los pendientes 6 y 46.

---

## Las cinco reglas que ninguna de estas tablas puede saltearse

Antes de escribir cualquiera de las diez, y sin excepción:

1. **RLS estricta en la misma migración que crea la tabla** (`CLAUDE.md` §4), nunca agregada
   después a mano desde el panel.
2. **`prestadora_id` en toda tabla con datos propios de una Organización** (`CLAUDE.md` §5.10),
   aunque hoy siempre valga lo mismo. Ninguna de las diez propuestas lo tiene: el material
   heredado fue escrito para una sola empresa. **Es la corrección más importante de esta página.**
3. **Clave primaria UUID** (`CLAUDE.md` §5.10). Las propuestas ya lo cumplen, salvo `favoritos`,
   que usa una clave compuesta, y `configuracion`, que usa un texto.
4. **Todo importe se guarda con su moneda** (`CLAUDE.md` §5.11). `pagos` lo cumple;
   `postulaciones.tarifa_propuesta` **no**, y es un número suelto.
5. **Ninguna palabra propia de esta modalidad entra en un módulo compartido**
   (`CLAUDE.md` §5.12). De las diez, ocho son propias de la modalidad de este producto y sólo dos
   son compartidas. La columna «De qué lado cae» de cada ficha lo dice.

**La colisión de vocabulario que había acá se decidió.** El material heredado llamaba `avisos`
a lo que publica una Familia, y este documento advertía que en el producto «aviso» se usaba
para otra cosa: el aviso de que el Asistente llegó, el aviso que sale por WhatsApp o por
correo. **El 25 de agosto de 2026 el Desarrollador eligió**: el **Aviso** es lo que la Familia
publica y queda guardado, y la tabla se llama `avisos`. Para el otro sentido queda
**notificación**, que es la palabra que el proyecto ya venía usando en `notificaciones`. Lo que
no es ninguna de las dos cosas es **búsqueda**: buscar es el acto, y el acto no se guarda.

---

## Las diez

### 1. `postulaciones` — el Asistente se ofrece para una búsqueda

**Para qué.** Es la mitad que falta de la modalidad de este producto: hoy una Familia puede publicar
lo que necesita y **nadie puede contestarle**. Sin esta tabla el directorio muestra gente y las
búsquedas se guardan, pero las dos puntas nunca se tocan.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — módulo `avisos`. En prestación directa el trabajo se asigna, no se postula |
| **De qué depende** | De `avisos` y de `caregivers`, las dos ya existentes |
| **Qué hay que decidir antes** | Si la tarifa propuesta se guarda acá, y con qué moneda (regla 11). Y qué pasa cuando la búsqueda se cierra con varias postulaciones abiertas |

Columnas propuestas: búsqueda, Asistente, estado, mensaje, tarifa propuesta, fecha en que se vio,
fecha de respuesta, motivo del rechazo, fecha de creación. Una sola postulación por par de
búsqueda y Asistente. Estados propuestos: pendiente, vista, aceptada, rechazada, cancelada.

**Falta `prestadora_id`.** Y falta la moneda de la tarifa.

---

### 2 y 3. `conversaciones` y `mensajes` — el chat, colgado del vínculo

**Para qué.** Es la forma en que la Familia y el Asistente se comunican **antes** de contratar. Hoy
existe un chat en una sola pantalla (`mockup-app.html`) que lee la tabla `messages` sin ningún
filtro y sin sesión: es el pendiente 6.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — módulo `contacto` |
| **De qué depende** | De la decisión de arriba: `messages` cuelga de una búsqueda, esto cuelga del vínculo entre dos personas. **Son incompatibles** |
| **Qué hay que decidir antes** | Cuál de los dos modelos queda. Y con qué condiciones una Familia puede escribirle a alguien que no contestó ninguna búsqueda: eso es regla comercial, congelada por `docs/ALCANCE.md` §4 |

`conversaciones`: Familia, Asistente, búsqueda, último mensaje y su fecha, cuántos sin leer de cada
lado, si sigue activa. Una sola conversación por par de Familia y Asistente.

`mensajes`: conversación, autor, contenido, tipo —texto, imagen, archivo, del sistema—, archivo,
si se leyó y cuándo, si se editó, si se borró.

**La condición que no estaba escrita en ningún lado** y que recordó el Desarrollador el 24 de
agosto de 2026: **adentro del chat no se pueden filtrar datos de contacto**. Si se filtran, la
conversación sigue por afuera y la plataforma cobra una vez y nunca más, que es exactamente la
razón por la que el teléfono no se muestra. Ninguna de las dos tablas propuestas prevé eso: hace
falta algo que revise el contenido antes de guardarlo.

**Falta `prestadora_id`** en las dos.

---

### 4. `video_llamadas` — la entrevista antes de contratar

**Para qué.** Que la Familia y el Asistente se vean la cara antes de que alguien entre a una casa.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — depende del chat |
| **De qué depende** | De `conversaciones`, que todavía no existe |
| **Qué hay que decidir antes** | Con qué servicio se hace. El material heredado nombraba uno y guardaba su dirección de sala en la tabla, lo que ata el esquema a ese proveedor |

Columnas propuestas: conversación, quien llama, quien recibe, dirección de la sala, nombre de la
sala, duración en segundos, estado —creada, activa, finalizada, cancelada—, cuándo empezó, cuándo
terminó.

**Falta `prestadora_id`.** Y conviene sacar de la tabla lo que es propio de un proveedor: si mañana
se cambia de servicio, dos columnas de esta tabla quedan sin sentido.

---

### 5. `resenas` — la calificación que deja una Familia

**Para qué.** Es lo que hace que el directorio sirva para elegir y no sólo para mirar.

| | |
|---|---|
| **De qué lado cae** | **Compartida**, corregido el 25 de agosto de 2026 —antes decía que era de esta modalidad—. La calificación es evidencia sobre la persona y la acompaña a donde trabaje: quien recibió el cuidado puede opinar lo haya elegido o se lo hayan asignado. Lo que se queda de este lado es cuánto pesa y en qué orden ordena, módulo `orden`, no la reseña |
| **De qué depende** | De que exista un trabajo terminado, que hoy no existe de ningún lado. **Y no puede colgar del aviso**: el aviso es de esta modalidad, y una tabla compartida que apunta a un objeto de un solo lado arrastra el lado entero con ella —es el mismo defecto que `logbook_entries.aviso_id` y `messages.aviso_id`, anotado en el pendiente 52—. Tiene que colgar del trabajo hecho, que en esta modalidad llega por un aviso y en prestación directa por una asignación |
| **Qué hay que decidir antes** | **Es lógica comercial y está congelada** por `docs/ALCANCE.md` §4. Además: quién puede calificar, si el Asistente puede responder, y quién puede esconder una reseña |

Columnas propuestas: Asistente, quién califica, el trabajo terminado que se califica, calificación
de 1 a 5, puntos otorgados, comentario, respuesta del Asistente, si es visible. Una sola reseña
por persona, Asistente y trabajo.

**Falta `prestadora_id`.** Y una reseña visible es dato de una persona: la RLS de esta tabla es de
las delicadas.

---

### 6. `historial_puntos` — de dónde salió cada punto

**Para qué.** Que el puntaje de un Asistente se pueda explicar renglón por renglón, en vez de ser
un número que aparece.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — módulo `orden` |
| **De qué depende** | De `resenas` y de las verificaciones, que sí existen |
| **Qué hay que decidir antes** | **Lógica comercial congelada** (`docs/ALCANCE.md` §4). El sistema de puntos completo que proponía el material heredado está más abajo |

Columnas propuestas: Asistente, puntos —pueden ser negativos—, concepto, referencia al hecho que
los generó.

**Falta `prestadora_id`.**

---

### 7. `notificaciones` — lo que le llega a una persona

**Para qué.** Que una postulación, un mensaje o una verificación aprobada no dependan de que
alguien vuelva a entrar a mirar.

| | |
|---|---|
| **De qué lado cae** | **Compartida.** Una notificación le sirve igual a la prestación directa: que el Asistente sepa que le asignaron una guardia es el mismo problema |
| **De qué depende** | De nada nuevo. Es de las dos que se podrían escribir hoy |
| **Qué hay que decidir antes** | Por dónde sale cada una —correo, WhatsApp, notificación al celular—, que es lo que en este producto se llama **canal** (`docs/GLOSARIO.md`). La tabla propuesta guarda la notificación pero no el canal |

Columnas propuestas: persona, tipo, título, mensaje, si se leyó y cuándo, a dónde lleva, datos
extra, fecha.

**Falta `prestadora_id`**, y falta el canal. **Y falta lo más importante para una tabla
compartida**: los tipos propuestos incluyen `postulacion`, que es una palabra propia de esta
modalidad y no puede aparecer en un módulo compartido (`CLAUDE.md` §5.12). El tipo tiene que salir
de un catálogo, no de una lista escrita adentro de la tabla.

---

### 8. `favoritos` — la Familia guarda un Asistente para después

**Para qué.** Mirar el directorio sin sesión y volver dos días después a la misma persona.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — sin directorio no hay nada que marcar |
| **De qué depende** | De nada nuevo. Es la otra que se podría escribir hoy |
| **Qué hay que decidir antes** | Casi nada. Es la más chica de las diez y la de menor riesgo |

Columnas propuestas: Familia, Asistente, fecha. La clave primaria es el par.

**Falta `prestadora_id`.** Y conviene revisar la regla 3 del `CLAUDE.md`: una clave primaria UUID
propia hace la tabla más fácil de referenciar después.

---

### 9. `pagos` — lo que cobra la plataforma

**Para qué.** Es la razón de ser comercial de todo esto.

| | |
|---|---|
| **De qué lado cae** | Propia de esta modalidad — módulo `contacto`, «Contacto y su costo» |
| **De qué depende** | De que esté decidido **qué se cobra, a quién y cuándo**, que es exactamente lo que está congelado |
| **Qué hay que decidir antes** | **Todo.** `docs/ALCANCE.md` §4 congela la lógica comercial, y esta tabla es la lógica comercial hecha columnas |

Columnas propuestas: Familia, Asistente, búsqueda, monto, moneda, estado, método, dos
identificadores del cobrador externo, comisión de la plataforma, monto del Asistente.

**Es la única de las diez que sí guarda la moneda** junto al importe, como pide la regla 11. Le
falta `prestadora_id`, y le sobran los dos identificadores del cobrador externo: eso ata el
esquema a un proveedor de cobro que todavía no se eligió.

---

### 10. `reportes` — alguien denuncia algo

**Para qué.** Que una persona pueda decir que un perfil, un mensaje o una conducta están mal, y que
quede registro de quién lo revisó.

| | |
|---|---|
| **De qué lado cae** | **Compartida.** Denunciar una conducta no depende de cómo llegó el trabajo |
| **De qué depende** | De que exista alguien que modere, que hoy no existe |
| **Qué hay que decidir antes** | Quién modera. Una tabla de denuncias que nadie lee es peor que no tenerla: promete algo que no pasa |

Columnas propuestas: quien reporta, tipo, entidad reportada, motivo, descripción, estado, quién lo
resolvió, resolución.

**Falta `prestadora_id`.** Y el tipo tiene que salir del catálogo, no de una lista escrita adentro
de la tabla — mismo problema que `notificaciones`.

---

### Y una que no es una tabla de negocio: `configuracion`

El material heredado proponía una tabla de clave y valor para los números que hoy estarían
escritos en el código: cuántos puntos vale cada cosa, a los cuántos días expira una búsqueda, qué
porcentaje cobra la plataforma.

**La idea es correcta y es la regla 5.1** —nada de eso se escribe adentro de una pantalla—, pero
la forma propuesta tiene dos problemas: guarda todo como texto con una columna que dice de qué
tipo es, y **no tiene `prestadora_id`**, cuando la mitad de esos valores son justamente lo que
puede variar de una Prestadora a otra. Eso es «configuración sobre programación» (`CLAUDE.md` §2)
al revés.

Los valores que traía escritos hablan de puntos, de niveles y de comisiones: todo congelado por
`docs/ALCANCE.md` §4.

---

## El sistema de puntos y niveles que proponía el material heredado

Se transcribe entero porque es una decisión de producto pensada, y perderla costaría volver a
pensarla. **No está aprobada**, y `docs/ALCANCE.md` §4 la tiene congelada.

| Hecho | Puntos |
|---|---:|
| Perfil completo | +200 |
| Teléfono verificado | +100 |
| Documento de identidad verificado | +300 |
| Antecedentes aprobados | +400 |
| Certificación verificada | +150 |
| Primera reseña recibida | +50 |
| Reseña de 5 estrellas | +100 |
| Reseña de 4 estrellas | +60 |
| Reseña de 3 estrellas | +30 |
| Reseña de 1 o 2 estrellas | 0 |
| Trabajo terminado y confirmado | +50 |
| Denuncia válida recibida | −200 |

| Nivel | Puntos mínimos | Qué da |
|---|---:|---|
| Bronce | 0 | Perfil básico |
| Plata | 500 | Aparece destacado en la búsqueda |
| Oro | 1.200 | Distintivo y primer lugar en la búsqueda |

**Tres cosas que hay que mirar antes de construir esto.** Que el nivel decida el orden de aparición
es el módulo `orden`, y hoy no está decidido con qué criterio se ordena. Que un documento de
identidad verificado dé más puntos que cinco reseñas es una decisión de producto, no un número.
Y que una denuncia válida reste 200 puntos convierte la moderación en algo que le cuesta plata a
alguien: es exactamente el tipo de regla que necesita que alguien modere de verdad.

---

## Lo que se borró y no se trajo

De los 1.545 renglones del material heredado, se descartaron:

- **La arquitectura entera** —monorepo, aplicación móvil con React Native, aplicación de Windows,
  servidor propio en Node, publicación en las tiendas de aplicaciones, integración continua,
  pruebas—. El propio documento decía que estaba descartada: el destino es React 18 con Vite,
  alineado con Careonys.
- **El sistema de diseño propuesto**, superado por `css/tokens.css`, que existe y funciona.
- **Los servicios externos** —correo, video, notificaciones al celular, cobros, verificación de
  identidad, mensajes de texto—: seis proveedores elegidos de antemano para funciones que todavía
  no se construyeron.
- **El plan por fases en semanas.** No se dan plazos.
- **El panel de administración** y sus secciones, que describen una aplicación que no existe.
- Las 12 tablas que ya están construidas, porque **manda `supabase/migrations/`**.

También traía escrito el nombre de otra empresa cliente en el comentario de una comisión. No se
traslada.
