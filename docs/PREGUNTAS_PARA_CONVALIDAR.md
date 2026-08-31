# Preguntas para convalidar

**Qué es esto.** Las veinte preguntas propuestas para las dos evaluaciones que hoy existen en la
base: diez para cada una. Está escrito el 31 de agosto de 2026 y sale del pendiente 24, que pide
que adivinar deje de ser un camino.

**Qué se espera de quien lo lee.** Leerlas, marcar arriba de este mismo archivo lo que quiera
cambiar —un enunciado, una opción, cuál es la correcta, o una pregunta entera— y devolverlo. Con
eso se escribe la migración que las carga. **Nada de esto está en la base todavía**, y no se
aplica ningún cambio hasta que estas preguntas estén convalidadas.

**Una advertencia sobre lo que ya está cargado.** Las cuatro preguntas sembradas hoy —dos en
`supabase/migrations/0008_cursos_y_evaluaciones.sql:373` y dos en
`supabase/migrations/0048_presdemo_arma_su_propio_curso.sql:68`— preguntan por posiciones,
maniobras y frecuencias, es decir, por tratamiento. Eso choca con la línea que trazan la
migración `0042` en su encabezado y la pantalla del Asistente
(`pwa-asistente/index.html:724`): «Estas guías dicen qué observar y cuándo avisar. No indican
tratamientos». La migración que cargue estas veinte tiene entonces que **reemplazar** aquellas
cuatro, no sumarse a ellas. Eso también entra en lo que hay que convalidar.

---

## Las reglas que estas preguntas cumplen

| Regla | Cómo queda |
|---|---|
| Cantidad de preguntas | 10 por evaluación |
| Opciones por pregunta | 4, marcadas a, b, c, d |
| Respuestas correctas | Una sola por pregunta |
| Para aprobar | 70 % — 7 preguntas de 10 |
| Dónde cae la correcta | Repartida entre las cuatro posiciones, nunca siempre en el mismo lugar |
| Tratamiento | Ninguno: ni medicamentos, ni dosis, ni maniobras, ni números de emergencia de ningún país |
| De qué tratan | Qué observar, cuándo avisar, cómo se usa el producto, confidencialidad y hasta dónde llega un Asistente |
| Opciones equivocadas | Creíbles. Una pregunta con tres opciones absurdas se acierta sin saber nada |

Hoy las dos evaluaciones piden **100 %** para aprobar
(`supabase/migrations/0008_cursos_y_evaluaciones.sql:370` y `supabase/migrations/0048_presdemo_arma_su_propio_curso.sql:60`). Con dos
preguntas eso tenía sentido; con diez, el 70 % es lo que pide el pendiente 24 y es además el
valor que la columna `porcentaje_para_aprobar` trae por defecto
(`supabase/migrations/0008_cursos_y_evaluaciones.sql:89`).

---

## Evaluación 1 — Cuidado gerontológico y primeros auxilios

- **Clave:** `gerontologico_primeros_auxilios`
- **De quién:** de la oferta general de CeltaTech, `tenant_id` nulo. La ven todas las Prestadoras.
- **De qué curso cuelga:** de ninguno. Es una prueba de competencias general, y por eso su
  `curso_id` está vacío a propósito (`supabase/migrations/0008_cursos_y_evaluaciones.sql:84`). Los seis cursos de la
  oferta general que están cargados desde `data/catalogo-oferta.json` —Introducción al cuidado
  de la persona mayor, Alzheimer y otras demencias, El bienestar de quien cuida, Administración de
  medicamentos y control de salud en el hogar, Comunicación empática con la persona cuidada y
  Cuidados avanzados— **no tienen hoy ninguna evaluación propia**. Si alguno tiene que tenerla, se
  escribe aparte.
- **Intentos:** 3 hoy. Con diez preguntas de cuatro opciones y 70 % para aprobar, tres intentos ya
  no alcanzan para aprobar de casualidad.

### 1. Durante la Guardia el Paciente se cae en el baño, dice que está bien y pide que no se avise a nadie. ¿Qué corresponde hacer?

- a) Ayudarlo a levantarse y no anotar nada, porque él mismo dijo que está bien.
- b) Dejarlo asentado en el Reporte al terminar la jornada y esperar a que la Familia lo lea.
- c) Avisar a la Prestadora en el momento y dejarlo asentado en el Reporte, aunque el Paciente
  haya pedido que no.
- d) Consultarlo con la Familia y hacer lo que la Familia decida.

**Correcta: c.** Una caída se avisa siempre y en el momento; el pedido del Paciente no suspende el
deber de informar, y el Reporte de la jornada no reemplaza al aviso.

### 2. ¿Cuál de estas observaciones obliga a avisar de inmediato, y no puede quedar solamente anotada en el Reporte?

- a) Está más confundido que de costumbre y no reconoce la casa donde vive.
- b) Comió la mitad del almuerzo, como viene pasando desde hace tres semanas.
- c) Se quejó de dolor en las rodillas al levantarse, como todas las mañanas.
- d) Durmió dos horas de siesta, que es lo que duerme habitualmente.

**Correcta: a.** Lo que cambia de golpe se avisa; lo que ya se conocía se observa, se anota y se
sigue.

### 3. ¿Para qué sirve el Reporte de la jornada?

- a) Para dejar constancia de las horas trabajadas y que se liquide el pago.
- b) Para justificar ante la Familia por qué no se pudo cumplir alguna tarea.
- c) Para dejarle escritas al Paciente las indicaciones de los días que el Asistente no va.
- d) Para dejar escrito qué se observó y qué se hizo durante la Guardia, de manera que quien siga
  sepa cómo estuvo la persona.

**Correcta: d.** El Reporte lleva de vuelta lo que pasó en la jornada. Las horas las registra la
fichada, que es otra cosa.

### 4. Una vecina del Paciente pregunta qué enfermedad tiene y cómo viene evolucionando. ¿Qué corresponde?

- a) Contarle en general y sin detalles, porque es alguien del entorno cercano.
- b) No dar ninguna información y decirle que esas consultas las contesta la Familia.
- c) Contarle solamente lo que ya se ve a simple vista.
- d) Preguntarle al Paciente si autoriza y, si acepta, contarle.

**Correcta: b.** Lo que se sabe por trabajar en esa casa no sale de la Familia y de la Prestadora,
y no es el Asistente quien administra ese permiso.

### 5. El Asistente llega al domicilio y el teléfono no tiene señal para fichar la entrada. ¿Qué corresponde hacer?

- a) Empezar la Guardia, avisar a la Prestadora por el medio que funcione y fichar en cuanto haya
  señal.
- b) Esperar afuera hasta que haya señal, porque sin fichada la Guardia no queda registrada.
- c) Pedirle a la Familia que anote por escrito la hora de llegada, y con eso alcanza.
- d) Fichar la entrada y la salida juntas al terminar la jornada, poniendo la hora real de cada una.

**Correcta: a.** La persona cuidada no espera. La fichada registra el momento en que se ficha y no
se puede escribir hacia atrás; el hueco lo cubre el aviso a la Prestadora.

### 6. La Familia pide que se le cambie la medicación indicada porque «lo ven muy dormido». ¿Qué corresponde?

- a) Hacer el cambio, porque la Familia es quien decide en su casa.
- b) Hacer el cambio solamente si el Asistente hizo el curso de administración de medicamentos.
- c) No modificar nada, avisar a la Prestadora y dejar asentado el pedido y lo que se observó.
- d) Suspender lo indicado hasta que lo vea un médico.

**Correcta: c.** Cambiar una indicación no está entre las cosas que decide un Asistente, y ni el
pedido de la Familia ni haber hecho un curso lo habilitan.

### 7. ¿Cuál de estas situaciones hay que avisarle a la Prestadora aunque no haya pasado nada con el Paciente?

- a) Que la Familia haya corrido el horario de la merienda.
- b) Que la Familia pida que el Asistente se quede tres horas más de las acordadas.
- c) Que el Paciente haya estado de mal humor toda la tarde.
- d) Que se haya terminado el detergente de la cocina.

**Correcta: b.** Las condiciones del trabajo —horario, tareas, lugar— las acuerda la Prestadora y
no se arreglan entre el Asistente y la Familia.

### 8. En una persona que pasa la mayor parte del día en la cama, ¿qué corresponde observar y comunicar?

- a) Nada en particular mientras no se queje de dolor.
- b) Sólo aquello que la Familia haya pedido expresamente que se mire.
- c) El color de la piel una vez por semana, el día del baño.
- d) Cómo está la piel en las zonas de apoyo cada vez que se la higieniza, y avisar ante cualquier
  enrojecimiento que no desaparezca.

**Correcta: d.** El enrojecimiento que no cede en una zona de apoyo es una señal temprana y se
avisa. Qué hacer con ella lo indica el equipo de salud, no el Asistente.

### 9. El Paciente cuenta que un familiar le grita y le retiene el dinero de la jubilación, y pide que no se repita.

- a) Guardar el secreto, porque se lo confió en privado.
- b) Hablarlo directamente con el familiar señalado para aclarar la situación.
- c) Comunicárselo a la Prestadora, aunque el Paciente haya pedido que no.
- d) Anotarlo en el Reporte, que es donde queda registrado lo que pasa en la casa.

**Correcta: c.** Una sospecha de maltrato no se resuelve entre el Asistente y la Familia, y no se
escribe en un lugar que lee justamente quien está señalado.

### 10. El Asistente se entera de que no va a poder llegar a la Guardia de mañana. ¿Qué corresponde?

- a) Avisar a la Prestadora lo antes posible, para que organice el reemplazo.
- b) Avisar a la Familia, que es la que lo está esperando.
- c) Conseguir por su cuenta a otro Asistente de confianza que lo cubra.
- d) Avisar a la hora de entrada, cuando ya se sepa con certeza.

**Correcta: a.** El reemplazo lo organiza la Prestadora y necesita tiempo. Avisar tarde, o traer a
alguien por fuera, deja al Paciente sin nadie comprobado.

**Dónde quedó la correcta, pregunta por pregunta:** 1 c · 2 a · 3 d · 4 b · 5 a · 6 c · 7 b ·
8 d · 9 c · 10 a — tres en a, dos en b, tres en c, dos en d.

---

## Evaluación 2 — RCP avanzada, evaluación final

- **Clave:** `rcp_avanzada`
- **De quién:** de PresDemo, con `tenant_id` cargado. Ninguna otra Prestadora la ve.
- **De qué curso cuelga:** del curso propio de PresDemo «RCP avanzada», de 10 horas, avanzado y
  **presencial**, que se cursa en la sede y se rinde al terminar
  (`supabase/migrations/0048_presdemo_arma_su_propio_curso.sql:45`).
- **Intentos:** 2 hoy.
- **Qué se rinde acá, y qué no.** La maniobra es presencial y la evalúa el instructor mirando
  hacerla; no se puede acreditar eligiendo una opción de una lista, y ninguna de estas diez
  preguntas lo intenta. Lo que se rinde por escrito es lo que rodea a la maniobra: reconocer,
  pedir ayuda, avisar, registrar y saber hasta dónde llega el Asistente. Esto es lo que hace que
  la evaluación no contradiga la regla de que el producto no indica tratamientos.

### 1. Durante la Guardia la persona se desploma y no responde ni cuando se la llama ni cuando se la toca del hombro. ¿Qué es lo primero que corresponde hacer?

- a) Llamar primero a la Familia para contarle lo que está pasando.
- b) Pedir ayuda en voz alta y dar aviso al servicio de emergencias que la Prestadora dejó
  indicado para ese domicilio.
- c) Buscar la carpeta con los antecedentes para poder informarlos cuando llegue la ayuda.
- d) Llevar a la persona a un lugar más cómodo antes de hacer cualquier otra cosa.

**Correcta: b.** Primero se activa la ayuda. La Familia y los antecedentes vienen después, y
mientras se los busca no se avisó a nadie.

### 2. ¿Qué tiene que poder decir el Asistente cuando da el aviso al servicio de emergencias?

- a) Qué le parece que está pasando, para que vengan preparados.
- b) El número de afiliado y la cobertura de salud del Paciente.
- c) El nombre y el teléfono del médico de cabecera.
- d) La dirección exacta y cómo se entra, qué se observó y desde cuándo, y quién está en el lugar.

**Correcta: d.** Quien atiende necesita llegar y saber qué está ocurriendo. El diagnóstico no lo
hace el Asistente, y los datos administrativos no hacen falta para que salga el móvil.

### 3. ¿Cuál de estas situaciones exige dar aviso al servicio de emergencias aunque la persona esté consciente y hablando?

- a) Que de golpe le cueste hablar o mover un lado del cuerpo.
- b) Que le duela una rodilla al caminar desde hace unos días.
- c) Que tenga un moretón en el brazo y no recuerde cómo se lo hizo.
- d) Que hace dos días esté comiendo menos de lo habitual.

**Correcta: a.** Lo que aparece de golpe en el habla o en el movimiento de un lado del cuerpo es
una urgencia aunque la persona esté lúcida. Las otras tres se observan, se anotan y se le avisan
a la Prestadora, pero no son una emergencia.

### 4. Mientras se espera a que llegue la ayuda, ¿qué corresponde hacer con el resto de la casa?

- a) Cerrar la puerta para que nadie interrumpa.
- b) Pedirle a la Familia que se retire y no vuelva hasta que todo termine.
- c) Dejar libre el paso y que alguien espere en la entrada para guiar al personal que llega.
- d) Empezar a juntar ropa y documentación por si hay que internarla.

**Correcta: c.** Los minutos que la ayuda pierde buscando el timbre, el piso o el departamento son
minutos de la emergencia.

### 5. ¿Qué sigue quedando fuera de lo que un Asistente puede decidir, aun habiendo aprobado este curso?

- a) Pedir ayuda antes de estar seguro de lo que está pasando.
- b) Avisar a la Prestadora fuera del horario de su Guardia.
- c) Quedarse con la persona hasta que llegue la ayuda.
- d) Evaluar la gravedad del cuadro y resolver, en función de eso, que no hace falta llamar a nadie.

**Correcta: d.** Aprobar el curso no convierte al Asistente en quien decide si algo es grave. Ante
la duda se pide ayuda, y eso es lo contrario de un exceso.

### 6. Pasada la emergencia y ya con la persona atendida, ¿qué corresponde dejar registrado?

- a) Nada: de la emergencia queda constancia en el servicio que asistió.
- b) Qué se observó, a qué hora, a quién se le avisó y qué se hizo, en el Reporte de esa jornada,
  además del aviso a la Prestadora que se dio en el momento.
- c) Un resumen en el grupo de mensajes de la Familia, que es donde lo leen todos.
- d) Solamente la hora en que llegó la ayuda.

**Correcta: b.** El registro tiene que permitir reconstruir qué pasó y cuándo. El aviso en el
momento y el Reporte son dos cosas distintas, y van las dos.

### 7. La Familia pide que no se llame a nadie porque «ya le pasó otras veces y se le pasa solo». ¿Qué corresponde?

- a) Aceptar, porque la Familia conoce los antecedentes mejor que nadie.
- b) Aceptar y dejarlo anotado en el Reporte para que quede constancia.
- c) Dar el aviso igual y comunicarle de inmediato a la Prestadora que la Familia se opuso.
- d) Esperar quince minutos y, si no mejora, recién ahí llamar.

**Correcta: c.** La decisión de no pedir ayuda no la puede tomar el Asistente ni delegarla en la
Familia. La oposición se comunica y queda registrada.

### 8. Al día siguiente, una compañera de la misma Prestadora que no trabaja en ese domicilio pregunta qué pasó. ¿Qué corresponde?

- a) No contarle: lo que pasa en un domicilio se comunica por la vía de la Prestadora y no entre
  compañeros.
- b) Contarle, porque es de la misma Prestadora y la alcanza la misma confidencialidad.
- c) Contarle sin nombrar al Paciente.
- d) Contarle sólo si ella también hizo el curso.

**Correcta: a.** Pertenecer a la Prestadora no da acceso a lo que pasa en una casa donde no se
trabaja.

### 9. Termina la Guardia y el Asistente que tenía que relevar no llegó. ¿Qué corresponde?

- a) Retirarse a horario, porque la Guardia terminó.
- b) Dejar a la persona con un familiar y retirarse.
- c) Esperar media hora y, si no llega, retirarse dejando anotado en el Reporte que no vino.
- d) Avisar de inmediato a la Prestadora y no dejar sola a la persona hasta que la Prestadora
  indique cómo sigue.

**Correcta: d.** El relevo lo organiza la Prestadora. Hasta que resuelva, la persona no queda sin
cuidado.

### 10. Por la emergencia el Asistente se fue con la ambulancia y no fichó la salida. ¿Qué corresponde hacer después?

- a) Fichar la salida al llegar a su casa, poniendo la hora en que realmente salió.
- b) Avisarle a la Prestadora qué pasó y con qué horas, para que la Guardia quede registrada como
  fue.
- c) Dejarlo así: la fichada no cambia lo que se trabajó.
- d) Pedirle a la Familia que confirme por escrito el horario de salida.

**Correcta: b.** La fichada registra el momento en que se ficha y no se escribe hacia atrás. El
hueco lo corrige la Prestadora a partir del aviso.

**Dónde quedó la correcta, pregunta por pregunta:** 1 b · 2 d · 3 a · 4 c · 5 d · 6 b · 7 c ·
8 a · 9 d · 10 b — dos en a, tres en b, dos en c, tres en d.

---

## El reparto, de un vistazo

| Evaluación | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | a | b | c | d |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cuidado gerontológico y primeros auxilios | c | a | d | b | a | c | b | d | c | a | 3 | 2 | 3 | 2 |
| RCP avanzada, evaluación final | b | d | a | c | d | b | c | a | d | b | 2 | 3 | 2 | 3 |

Ninguna posición se repite en más de tres preguntas de una evaluación, y las dos evaluaciones
tienen repartos distintos entre sí: quien rinda las dos tampoco encuentra un patrón cruzado.
