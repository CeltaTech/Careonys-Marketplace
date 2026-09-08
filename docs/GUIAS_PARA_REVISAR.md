# Las 19 Guías de cuidado generales, para revisar

**Qué es esto.** Las 19 Guías de cuidado que el producto trae de fábrica, una por cada patología
del catálogo general, puestas en castellano y en orden de lectura. Están escritas en la migración
`supabase/migrations/0042_las_diecinueve_guias_generales.sql`, que las carga como **borrador**: la
puerta `guias_de` sólo entrega las publicadas, así que hoy ninguna de estas llega a la aplicación
del Asistente.

**De qué día es.** 31 de agosto de 2026. Refleja la migración 0042 tal como está escrita hoy.

**Qué se espera de quien lo lee.** Leer cada guía entera y marcar lo que quiera corregir —sobre
este mismo archivo, o donde le resulte más cómodo—. Cada guía termina con el renglón de la
migración de donde salió cada bloque, para ir directo a corregirlo. Con esa primera revisión hecha,
las guías se publican, y **ésas son las válidas hasta que el proyecto se concluya**.

**Qué no está acá, a propósito.** El inglés y el portugués. La migración tiene los tres idiomas y
la revisión también los va a necesitar, pero este archivo es para leer, no para auditar traducciones.

**Por qué la firma no la puso la migración.** Para publicar, la 0041 exige quién revisó la guía y
cuándo (`la_publicada_dice_quien_la_reviso`, `supabase/migrations/0001_base_del_esquema.sql:2686`). Esa firma la pone
una persona que se hace responsable de lo que ahí dice; escribirla en una migración sería inventar
una revisión que no ocurrió.

**Cada Prestadora puede reemplazar la suya.** Estas son las generales. La Prestadora que quiera
decir otra cosa carga la suya para esa patología y la suya gana.

---

## Índice

 1. [Alzheimer](#1-alzheimer)
 2. [Deterioro cognitivo](#2-deterioro-cognitivo)
 3. [Parkinson](#3-parkinson)
 4. [ACV](#4-acv)
 5. [Epilepsia o convulsiones](#5-epilepsia-o-convulsiones)
 6. [Patologías psiquiátricas](#6-patologías-psiquiátricas)
 7. [Diabetes](#7-diabetes)
 8. [Hipertensión](#8-hipertensión)
 9. [Pacientes anticoagulados](#9-pacientes-anticoagulados)
10. [Arritmias](#10-arritmias)
11. [Enfermedades coronarias](#11-enfermedades-coronarias)
12. [EPOC](#12-epoc)
13. [Síncope](#13-síncope)
14. [Obesidad](#14-obesidad)
15. [Ceguera](#15-ceguera)
16. [Amputaciones](#16-amputaciones)
17. [Pacientes postrados](#17-pacientes-postrados)
18. [Cuidados paliativos](#18-cuidados-paliativos)
19. [Paciente oncológico](#19-paciente-oncológico)

---

## 1. Alzheimer

### Qué es

El Alzheimer es una enfermedad del cerebro que avanza de a poco y va borrando la memoria, la orientación y la capacidad de resolver las cosas de todos los días. Al principio se olvida lo que acaba de pasar, y con el tiempo cuesta reconocer lugares, objetos y personas conocidas. Es una enfermedad que no retrocede, y el acompañamiento cambia según la etapa que atraviesa cada Paciente.

### Qué esperar en el domicilio

En el domicilio suele verse que se repiten las mismas preguntas muchas veces en el día y que se olvida lo que ocurrió hace un rato. Es habitual que se confundan los horarios, que quede a medias una tarea empezada o que aparezcan objetos guardados en lugares insólitos. Hacia el final de la tarde la inquietud puede aumentar, con ganas de salir a la calle o de volver a una casa donde ya no se vive. La rutina estable, los ambientes conocidos y las frases cortas suelen ayudar más que las explicaciones largas. Con el avance de la enfermedad, vestirse, higienizarse y comer requieren cada vez más acompañamiento del Asistente.

### Señales de alarma

- Cambio brusco de la confusión habitual, instalado en horas o en un solo día.
- Intento de salir del domicilio sin rumbo, o desorientación dentro de la propia casa.
- Agitación, agresividad o miedo intenso que no cede con el acompañamiento.
- Somnolencia inusual o dificultad para despertar a la persona.
- Caídas, golpes o moretones sin explicación.
- Rechazo del alimento y del líquido a lo largo de todo un día.
- Fiebre, quejido o dolor persistente, aunque no se pueda señalar dónde duele.

### Qué hacer en una emergencia

1. Mantener la calma y quedarse junto al Paciente, sin dejarlo solo en ningún momento.
2. Observar qué está ocurriendo y anotar la hora exacta en que empezó.
3. Apartar los objetos con los que pueda golpearse y despejar el paso.
4. Llamar al servicio de emergencias y seguir la indicación de quien atienda.
5. Avisar a la Prestadora y a la Familia apenas la situación lo permita.
6. Dejar registrado qué se observó, qué se hizo y a quién se avisó.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `alzheimer`, renglón 121. Qué es: 123. Qué esperar: 128. Señales de alarma: 133. Qué hacer en una emergencia: 162.

---

## 2. Deterioro cognitivo

### Qué es

El deterioro cognitivo es una pérdida de memoria, de atención o de claridad de pensamiento mayor que la esperable para la edad, que todavía permite manejarse en la vida diaria. Puede quedar estable durante años, mejorar cuando la causa se corrige, o avanzar hacia una demencia. Por eso importa observar los cambios y dejarlos registrados turno a turno.

### Qué esperar en el domicilio

Suele notarse que cuesta encontrar palabras comunes, que se pierde el hilo de una conversación o que se olvidan encargos y citas recientes. Las tareas con varios pasos, como cocinar algo conocido o manejar dinero, se vuelven lentas o quedan a medias. Es frecuente que la persona se dé cuenta de sus errores y se ponga irritable, triste o reservada. La autonomía se conserva en buena parte, así que el trabajo del Asistente pasa más por recordar y supervisar que por hacer en lugar del Paciente. El cansancio, el ruido y los cambios de ambiente empeoran el rendimiento de la jornada.

### Señales de alarma

- Empeoramiento rápido de la memoria o de la claridad mental en pocos días.
- Confusión nueva sobre el lugar donde se está, la fecha o las personas cercanas.
- Desorientación al regresar a casa por un recorrido conocido de siempre.
- Cambio marcado del carácter: apatía profunda, desconfianza o enojo desmedido.
- Descuido nuevo de la higiene, de la comida o del estado de la vivienda.
- Caídas repetidas, o cualquier golpe en la cabeza.
- Expresiones de desesperanza o de no querer seguir viviendo.

### Qué hacer en una emergencia

1. Quedarse junto al Paciente y hablarle con frases cortas y en tono tranquilo.
2. Anotar la hora en que empezó el cambio y describir exactamente qué se observó.
3. Retirar del alcance lo que pueda causar daño y despejar el paso.
4. Llamar al servicio de emergencias y seguir la indicación de quien atienda.
5. Avisar a la Prestadora y a la Familia.
6. Dejar registrado el episodio completo antes de terminar el turno.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `deterioro_cognitivo`, renglón 523. Qué es: 525. Qué esperar: 530. Señales de alarma: 535. Qué hacer en una emergencia: 564.

---

## 3. Parkinson

### Qué es

El Parkinson es una enfermedad del sistema nervioso que afecta el control del movimiento. Aparecen temblor en reposo, rigidez, lentitud y dificultad para sostener el equilibrio, y con los años pueden sumarse cambios en el ánimo, en el sueño y en la memoria. Avanza despacio, y cada persona lo transita de manera distinta.

### Qué esperar en el domicilio

En el domicilio se ve que iniciar un movimiento cuesta: levantarse de la silla, dar el primer paso o girar en un pasillo angosto. Los pies pueden quedar como pegados al piso durante unos segundos, sobre todo al cruzar puertas o al apurarse. La escritura se achica, la voz baja de volumen y el gesto de la cara se vuelve menos expresivo, aunque la persona entienda todo lo que se le dice. Vestirse, abrocharse y comer llevan más tiempo, y conviene ofrecer ayuda sin apurar el ritmo del Paciente. El estado cambia a lo largo del día: hay ratos de bastante soltura y ratos de mucha traba.

### Señales de alarma

- Caída, sobre todo si hubo golpe en la cabeza o queda dolor al moverse.
- Bloqueo prolongado al caminar, con imposibilidad de despegar los pies del piso.
- Atragantamiento, tos al tragar, o voz que suena húmeda después de las comidas.
- Confusión nueva, alucinaciones o ideas de daño que antes no aparecían.
- Rigidez o temblor mucho más intensos que lo habitual en ese Paciente.
- Mareo o desvanecimiento al incorporarse.
- Somnolencia marcada que se sostiene durante todo el día.

### Qué hacer en una emergencia

1. No mover al Paciente que cayó si hay dolor, deformidad o golpe en la cabeza.
2. Quedarse a su lado, hablarle con calma y no dejarlo solo.
3. Anotar la hora del episodio y describir qué se observó.
4. Despejar el piso y apartar lo que estorbe el paso o pueda causar más daño.
5. Llamar al servicio de emergencias y seguir la indicación de quien atienda.
6. Avisar a la Prestadora y a la Familia, y dejar el episodio registrado.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `parkinson`, renglón 1053. Qué es: 1055. Qué esperar: 1060. Señales de alarma: 1065. Qué hacer en una emergencia: 1094.

---

## 4. ACV

### Qué es

El ACV, o accidente cerebrovascular, ocurre cuando se interrumpe la llegada de sangre a una parte del cerebro y esa zona deja de funcionar. Según el área afectada quedan secuelas en la fuerza de un lado del cuerpo, en el habla, en la vista, en el equilibrio o en la memoria. Es una urgencia médica, y el tiempo que pasa desde el primer síntoma cambia el resultado.

### Qué esperar en el domicilio

En el domicilio suele encontrarse un lado del cuerpo más débil o más torpe, con dificultad para caminar, para sostener objetos o para vestirse sin ayuda. El habla puede salir arrastrada, o costar encontrar las palabras aun entendiendo todo lo que se dice alrededor. Es frecuente el cansancio rápido, la emoción a flor de piel y el llanto o la risa que aparecen sin motivo claro. Tragar puede resultar difícil, y eso lo define siempre el equipo de salud tratante, nunca el Asistente por su cuenta. La recuperación es lenta y desigual: hay semanas de avance visible y semanas sin ningún cambio.

### Señales de alarma

- Caída de un lado de la cara, notoria al hablar o al sonreír.
- Pérdida de fuerza en un brazo o en una pierna, aparecida de golpe.
- Habla arrastrada o confusa, o imposibilidad repentina de encontrar las palabras.
- Pérdida brusca de la visión, visión doble o desviación de la mirada.
- Pérdida del equilibrio o mareo intenso que impide sostenerse de pie.
- Dolor de cabeza muy fuerte y repentino, distinto de cualquier otro anterior.
- Somnolencia profunda, desmayo o dificultad para despertar a la persona.

### Qué hacer en una emergencia

1. Llamar al servicio de emergencias de inmediato ante cualquiera de estas señales.
2. Anotar la hora exacta en que se vio el primer síntoma e informarla a quien atienda.
3. No mover al Paciente más de lo necesario y no dejarlo solo en ningún momento.
4. No ofrecer alimento, líquido ni ninguna otra sustancia por la boca.
5. Despejar el ambiente y abrir el paso para que la ayuda llegue sin demora.
6. Avisar a la Prestadora y a la Familia, y dejar registrado todo lo observado.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `acv`, renglón 54. Qué es: 56. Qué esperar: 61. Señales de alarma: 66. Qué hacer en una emergencia: 95.

---

## 5. Epilepsia o convulsiones

### Qué es

La epilepsia es una condición del cerebro en la que, cada tanto, la actividad eléctrica se desordena y produce una crisis o convulsión. Durante esa crisis la persona puede perder el conocimiento, ponerse rígida o tener movimientos que no controla. Entre una crisis y otra, la mayoría de las personas hace una vida común.

### Qué esperar en el domicilio

En el domicilio suele encontrarse un Paciente que hace su vida habitual y que tiene un tratamiento ya indicado por un profesional, con horarios fijos. La Familia suele conocer cómo empiezan las crisis y qué las desencadena, por ejemplo dormir poco, las luces intermitentes o el estrés. Puede haber señales previas, como un olor raro, un malestar en el estómago o una sensación difícil de explicar. Después de una crisis es habitual un período de confusión, sueño o cansancio que dura un rato. Conviene mantener despejados los lugares de paso y saber de antemano a quién se avisa.

### Señales de alarma

- Una crisis que dura más de cinco minutos.
- Dos o más crisis seguidas sin que la persona recupere el conocimiento entre una y otra.
- Dificultad para respirar, o labios y cara azulados durante o después de la crisis.
- Un golpe en la cabeza, un corte o cualquier lesión ocurrida durante la crisis.
- Confusión que no cede después de un rato largo, o falta de respuesta al llamado.
- Una primera crisis en alguien que nunca había tenido, o una crisis distinta de las habituales.

### Qué hacer en una emergencia

1. Anotar la hora exacta en que empieza la crisis y medir cuánto dura.
2. Apartar los objetos duros o filosos que estén cerca y proteger la cabeza con algo blando.
3. No sujetar a la persona ni intentar frenar los movimientos, y no introducir nada en la boca.
4. Llamar al servicio de emergencias si la crisis pasa los cinco minutos, si se repite o si hay dificultad para respirar.
5. Acompañar hasta que recupere el conocimiento por completo, sin dejarla sola.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó, a qué hora y cuánto duró.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `epilepsia`, renglón 654. Qué es: 656. Qué esperar: 661. Señales de alarma: 666. Qué hacer en una emergencia: 692.

---

## 6. Patologías psiquiátricas

### Qué es

Las patologías psiquiátricas son condiciones de salud que afectan el ánimo, el pensamiento o la conducta, y que un profesional diagnostica y trata. Abarcan situaciones muy distintas entre sí, con períodos mejores y peores. Con el tratamiento indicado sostenido en el tiempo, la mayoría de las personas lleva adelante su vida cotidiana.

### Qué esperar en el domicilio

En el domicilio suele haber un tratamiento ya indicado por un profesional, con controles y horarios que conviene respetar tal como están escritos. El ánimo, el sueño y las ganas de hacer cosas pueden variar de un día para otro, y esa variación forma parte del acompañamiento. Algunos días el Paciente puede estar más callado, más irritable o menos dispuesto al contacto, sin que eso sea un rechazo personal. Ayuda mantener una rutina previsible, un trato tranquilo y respetuoso, y escuchar sin discutir ni corregir lo que la persona siente. La tarea del Asistente es observar, acompañar e informar, nunca opinar sobre el diagnóstico ni sobre el tratamiento.

### Señales de alarma

- Frases o gestos que sugieran intención de lastimarse o de terminar con su vida.
- Amenazas o conductas que pongan en riesgo a otras personas.
- Interrupción del tratamiento indicado, o controles que se dejan de cumplir.
- Cambio marcado del sueño: varias noches sin dormir, o somnolencia que no cede.
- Dejar de comer, de beber líquidos o de higienizarse durante varios días.
- Desorientación, agitación o dificultad para reconocer el lugar o a las personas.
- Aislamiento repentino, o abandono de actividades que antes sostenía.

### Qué hacer en una emergencia

1. Mantener la calma y hablar en voz baja, con frases cortas y claras.
2. Cuidar la seguridad de todos: dejar libre la salida y apartar objetos con los que alguien pueda lastimarse.
3. No discutir, no contradecir ni sujetar a la persona a la fuerza.
4. Llamar al servicio de emergencias si hay riesgo para la persona o para terceros.
5. Acompañar sin dejar sola a la persona, salvo que la propia seguridad esté en riesgo; en ese caso, ir a un lugar seguro y pedir ayuda.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y a qué hora.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `psiquiatricas`, renglón 1187. Qué es: 1189. Qué esperar: 1194. Señales de alarma: 1199. Qué hacer en una emergencia: 1228.

---

## 7. Diabetes

### Qué es

La diabetes es una condición en la que el azúcar de la sangre se mantiene más alto de lo que debería, porque el cuerpo no lo aprovecha bien. Se controla con el tratamiento y la alimentación que indicó un profesional, sostenidos todos los días. Tanto el azúcar muy alto como el muy bajo pueden causar malestar, y por eso se observa a la persona a lo largo de la jornada.

### Qué esperar en el domicilio

En el domicilio suele haber horarios establecidos de comidas y de tratamiento, indicados por un profesional, que conviene respetar tal como están escritos. Puede haber además controles ya indicados; si es así, se registra el resultado y se informa, sin tomar ninguna decisión a partir de ese número. Es frecuente que el Paciente tenga la piel seca, heridas que tardan en cerrar o menos sensibilidad en los pies, por lo que se los observa a diario y se avisa ante cualquier lastimadura. Sed intensa, orinar mucho, cansancio o visión borrosa suelen aparecer cuando el azúcar está alto, y temblor, sudor frío, palidez o confusión cuando está bajo. Cualquiera de esas dos situaciones se informa de inmediato.

### Señales de alarma

- Sudor frío, temblor, palidez o mareo que aparecen de golpe.
- Confusión, habla enredada, conducta extraña o dificultad para despertarse.
- Sed intensa, orinar mucho más de lo habitual y cansancio marcado.
- Aliento con olor dulce o afrutado, respiración rápida y profunda, náuseas o vómitos.
- Heridas, ampollas o zonas enrojecidas en los pies, sobre todo si no duelen.
- Una herida que no cierra, supura o tiene mal olor.
- Comidas salteadas o rechazo del alimento durante la jornada.

### Qué hacer en una emergencia

1. Llamar de inmediato al servicio de emergencias si la persona está confundida, no responde bien o tiene convulsiones.
2. No ofrecer alimentos, bebidas, azúcar ni ninguna sustancia por decisión propia: seguir sólo la indicación de quien atienda.
3. Acompañar sin dejar sola a la persona, observando cómo respira y si responde al llamado.
4. Anotar la hora en que empezó el malestar y qué se observó, junto con cualquier control ya indicado que se haya registrado.
5. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y qué indicación se recibió.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `diabetes`, renglón 590. Qué es: 592. Qué esperar: 597. Señales de alarma: 602. Qué hacer en una emergencia: 631.

---

## 8. Hipertensión

### Qué es

La hipertensión es una presión arterial que se mantiene más alta de lo que debería, de manera sostenida en el tiempo. Casi siempre no se siente nada, y por eso se controla con el tratamiento y los hábitos que indicó un profesional. Cuando permanece alta durante mucho tiempo, puede dañar el corazón, el cerebro y los riñones.

### Qué esperar en el domicilio

En el domicilio suele encontrarse un tratamiento ya indicado por un profesional, con horarios fijos, y a veces indicaciones sobre la sal, la actividad o el descanso. Muchos días el Paciente no siente ninguna molestia, y eso no significa que el problema haya desaparecido. Puede haber un control de presión ya indicado; si es así, se toma tal como está escrito, se registra el resultado con la hora y se informa, sin decidir nada a partir de ese número. Dolor de cabeza, zumbido en los oídos, mareo o hinchazón en los tobillos suelen ser motivo de aviso. Un valor alto nunca se presenta como algo esperable ni se deja pasar a ver si baja solo.

### Señales de alarma

- Dolor de cabeza intenso y repentino, distinto de los habituales.
- Dolor o presión en el pecho, que puede extenderse al brazo, al cuello o a la mandíbula.
- Falta de aire en reposo o ante un esfuerzo mínimo.
- Debilidad o adormecimiento de un lado del cuerpo, boca torcida o dificultad para hablar.
- Visión borrosa o doble, mareo intenso o pérdida del equilibrio.
- Sangrado por la nariz que no se detiene, o zumbido persistente en los oídos.
- Hinchazón de tobillos o piernas que aumenta de un día para otro.

### Qué hacer en una emergencia

1. Llamar al servicio de emergencias ante dolor en el pecho, falta de aire, debilidad de un lado del cuerpo o dificultad para hablar.
2. Anotar la hora exacta en que empezaron los síntomas, porque ese dato cambia la atención posterior.
3. Ayudar a que la persona quede en reposo, semisentada y con ropa holgada, sin moverla más de lo necesario.
4. No ofrecer alimentos, bebidas ni ninguna sustancia, y no repetir ni cambiar nada del tratamiento.
5. Acompañar sin dejar sola a la persona, observando si responde y cómo respira; registrar el control de presión sólo si ya estaba indicado.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y qué indicación se recibió.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `hipertension`, renglón 785. Qué es: 787. Qué esperar: 792. Señales de alarma: 797. Qué hacer en una emergencia: 826.

---

## 9. Pacientes anticoagulados

### Qué es

Un Paciente anticoagulado recibe un tratamiento indicado por su médico para que la sangre coagule más despacio y no se formen tapones dentro de los vasos. Ese mismo efecto hace que sangre con más facilidad y que tarde más en parar de sangrar. Por eso un corte chico, un moretón o un golpe pueden tener más importancia que en otra persona.

### Qué esperar en el domicilio

En el domicilio suelen verse moretones que aparecen sin que nadie recuerde un golpe, sobre todo en brazos y piernas. Es frecuente que las encías sangren un poco al cepillarse los dientes y que un corte al afeitarse tarde bastante en cerrar. Muchos Pacientes tienen controles de sangre periódicos y turnos que conviene no perder. La prevención de caídas ocupa buena parte del trabajo del Asistente: alfombras sueltas, pisos mojados, cables cruzados y baños sin agarraderas son los puntos que más pesan. Conviene revisar la casa con esa mirada desde el primer día y avisar a la Familia lo que haga falta corregir.

### Señales de alarma

- Sangrado por la nariz o por las encías que no se detiene después de varios minutos de presión.
- Un corte o una herida que sigue sangrando aunque se haya mantenido la presión.
- Moretones grandes, muy numerosos o que crecen rápido, sobre todo si aparecen solos.
- Orina de color rosado, rojo o amarronado, o materia fecal negra como el alquitrán.
- Vómito con sangre o con aspecto de borra de café.
- Cualquier golpe en la cabeza, aunque no se vea nada y la persona diga que está bien.
- Dolor de cabeza fuerte, confusión, somnolencia inusual, mareo o debilidad de un lado del cuerpo.

### Qué hacer en una emergencia

1. Mantener la calma y anotar la hora en que empezó lo que se observa.
2. Si hay una herida que sangra, presionar sobre ella con un paño limpio, de forma sostenida y sin levantarlo para mirar.
3. No mover a la persona si pudo haberse lastimado en una caída, y no dejarla sola en ningún momento.
4. Llamar al servicio de emergencias ante un golpe en la cabeza, un sangrado que no se detiene o cualquier cambio en la forma de estar o de responder.
5. Avisar a la Prestadora y a la Familia, e informar que se trata de una persona anticoagulada.
6. Dejar registrado qué pasó, a qué hora, qué se observó y qué se hizo.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `anticoagulados`, renglón 255. Qué es: 257. Qué esperar: 262. Señales de alarma: 267. Qué hacer en una emergencia: 296.

---

## 10. Arritmias

### Qué es

Una arritmia es una alteración del ritmo con que late el corazón: puede latir más rápido, más lento o de forma irregular. Algunas arritmias se sienten apenas y otras provocan mareos, cansancio o desmayos. Muchas personas conviven con una arritmia controlada durante años y llevan una vida normal, con controles médicos periódicos.

### Qué esperar en el domicilio

En la convivencia diaria suele escucharse al Paciente decir que siente el corazón acelerado, que le da un vuelco o que le salta un latido. Es frecuente que se canse antes de lo esperado al caminar, al subir escaleras o al bañarse, y que necesite descansos en el medio de tareas simples. Algunos Pacientes tienen un dispositivo colocado bajo la piel del pecho y una tarjeta o informe que lo identifica: conviene saber dónde está guardada esa documentación. Otros usan un aparato para medir la presión o el pulso en casa, con la frecuencia que su médico indicó. Vale la pena registrar cada episodio con la hora y con lo que la persona estaba haciendo, porque ese dato le sirve al médico en el próximo control.

### Señales de alarma

- Desmayo, o sensación de que se va a perder el conocimiento al pararse o al caminar.
- Latidos muy rápidos o muy lentos que no ceden después de varios minutos de reposo.
- Dolor, presión o peso en el pecho junto con el cambio de ritmo.
- Falta de aire que aparece de golpe o que no deja hablar de corrido.
- Mareo persistente, confusión o dificultad para mantenerse en pie.
- Piel muy pálida, gris o azulada, sobre todo en labios y uñas.
- Hinchazón nueva en pies, tobillos o piernas, o un aumento rápido de peso en pocos días.

### Qué hacer en una emergencia

1. Interrumpir lo que se esté haciendo y anotar la hora en que empezó el episodio.
2. Acompañar a la persona a sentarse o recostarse donde esté más cómoda para respirar, sin forzar ninguna posición, y aflojar la ropa ajustada.
3. No dejarla sola, hablarle con calma y observar si responde, si habla con normalidad y de qué color está su piel.
4. Llamar al servicio de emergencias ante un desmayo, un dolor en el pecho, falta de aire o cualquier cambio en la forma de responder.
5. Avisar a la Prestadora y a la Familia, y tener a mano la documentación del Paciente y la de su dispositivo si lo tiene.
6. Dejar registrado qué se observó, a qué hora, cuánto duró y qué se hizo.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `arritmias`, renglón 322. Qué es: 324. Qué esperar: 329. Señales de alarma: 334. Qué hacer en una emergencia: 363.

---

## 11. Enfermedades coronarias

### Qué es

Las enfermedades coronarias afectan a las arterias que llevan sangre al propio corazón. Cuando esas arterias se estrechan, el corazón recibe menos sangre de la que necesita y eso puede sentirse como un dolor o una presión en el pecho, sobre todo con el esfuerzo. Muchas personas viven con esta condición durante años, con controles médicos y con una rutina adaptada a lo que su corazón tolera.

### Qué esperar en el domicilio

En el domicilio se observa que el Paciente mide su esfuerzo: camina despacio, se detiene a mitad de una escalera o pide una pausa mientras se viste. Muchos ya conocen su propio límite y saben en qué momento del día se sienten mejor. Es frecuente que sigan un plan de comidas indicado por su médico y que tengan turnos de control que conviene ayudar a organizar. Algunos Pacientes tuvieron una internación o una cirugía y quedan con una cicatriz en el pecho o en una pierna, que se observa por si aparece enrojecimiento o secreción. Anotar cuánto puede caminar sin molestias y cómo cambia eso semana a semana le da información útil a la Prestadora y al médico.

### Señales de alarma

- Dolor, presión, ardor o peso en el centro del pecho que dura más de unos minutos o que vuelve.
- Dolor que se corre hacia el brazo izquierdo, el cuello, la mandíbula, la espalda o la boca del estómago.
- Falta de aire en reposo, o mucho más marcada que otros días con el mismo esfuerzo.
- Sudor frío, palidez, náuseas o vómitos junto con el malestar en el pecho.
- Molestia en el pecho que aparece estando quieto, sin haber hecho ningún esfuerzo.
- Cansancio nuevo y muy marcado que impide las tareas habituales del día.
- Hinchazón creciente en piernas o tobillos, o necesidad de dormir con más almohadas para respirar.

### Qué hacer en una emergencia

1. Detener toda actividad de inmediato y anotar la hora exacta en que empezó el dolor o la molestia.
2. Dejar a la persona sentada o recostada donde le resulte más cómodo respirar, sin forzarla a moverse, y aflojar la ropa ajustada.
3. Llamar al servicio de emergencias sin esperar a ver si el dolor cede solo.
4. Quedarse al lado, hablarle con calma y observar si responde, cómo respira y de qué color está su piel.
5. Avisar a la Prestadora y a la Familia, y preparar la documentación del Paciente para quien llegue a asistir.
6. Dejar registrado a qué hora empezó, dónde se ubicaba el dolor, cuánto duró y qué se hizo.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `coronarias`, renglón 456. Qué es: 458. Qué esperar: 463. Señales de alarma: 468. Qué hacer en una emergencia: 497.

---

## 12. EPOC

### Qué es

La EPOC es una enfermedad crónica de los pulmones que estrecha las vías por donde pasa el aire y hace que cueste más sacarlo al espirar. La consecuencia diaria es falta de aire, tos y expectoración, que empeoran con el esfuerzo y con el frío, el humo o el aire cargado. Es una condición que se acompaña durante años y que tiene períodos estables y períodos de agravamiento.

### Qué esperar en el domicilio

En el domicilio se nota que el Paciente organiza el día alrededor de la respiración: hace las cosas de a poco, descansa entre una tarea y otra y suele estar peor a la mañana temprano. La tos con expectoración es habitual y conviene observar el color y la cantidad, porque un cambio ahí es un dato importante. Muchos duermen semisentados o con varias almohadas, y evitan el humo, los aerosoles y los productos de limpieza fuertes. Algunos tienen oxígeno indicado por su médico, con equipos y tubos en la casa: el Asistente verifica que el equipo esté encendido y funcionando como fue indicado, mantiene los cables y las mangueras despejados y avisa ante cualquier falla, sin modificar ningún ajuste. Ventilar los ambientes y mantener una temperatura pareja ayuda bastante en el día a día.

### Señales de alarma

- Falta de aire mucho mayor que la habitual, o que aparece estando en reposo.
- Dificultad para completar una oración sin detenerse a tomar aire.
- Labios, uñas o cara con tono azulado o grisáceo.
- Respiración muy rápida, ruidosa o con hundimiento visible entre las costillas o en el cuello.
- Expectoración que cambia de color, se vuelve espesa, aumenta mucho o aparece con sangre.
- Confusión, somnolencia inusual, agitación o dificultad para despertarse.
- Fiebre, o hinchazón nueva en tobillos y piernas junto con más falta de aire.

### Qué hacer en una emergencia

1. Anotar la hora en que empezó la dificultad y suspender cualquier esfuerzo o traslado.
2. Dejar a la persona en la posición en la que respire con menos esfuerzo, habitualmente sentada e inclinada hacia adelante, sin forzarla, y aflojar la ropa ajustada.
3. Ventilar el ambiente, alejar humo o aerosoles y, si tiene oxígeno indicado, verificar que el equipo esté funcionando como fue indicado, sin modificar ningún ajuste.
4. Llamar al servicio de emergencias ante labios azulados, confusión, somnolencia o falta de aire que no mejora en reposo.
5. Quedarse al lado, sin dejarla sola, hablando poco y con calma, y observando cómo respira y cómo responde.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó, a qué hora y qué se hizo.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `epoc`, renglón 718. Qué es: 720. Qué esperar: 725. Señales de alarma: 730. Qué hacer en una emergencia: 759.

---

## 13. Síncope

### Qué es

El síncope es una pérdida breve del conocimiento que ocurre cuando llega menos sangre al cerebro durante unos segundos. La persona se desvanece, cae si estaba de pie y suele recuperarse sola en poco tiempo. Puede repetirse, y cada episodio conviene tratarlo como un hecho que se informa, nunca como algo esperable.

### Qué esperar en el domicilio

En el domicilio suele haber un antecedente conocido: ya pasó antes, y la Familia sabe en qué situaciones. Con frecuencia aparece al incorporarse rápido de la cama o de una silla, al estar mucho tiempo de pie, en ambientes calurosos o después de un baño con agua caliente. Muchas veces hay avisos previos de unos segundos: mareo, visión borrosa, sudor frío, palidez o zumbido en los oídos. Es común encontrar la casa adaptada, con apoyos en el baño y con la indicación de levantarse despacio y en dos tiempos. Después del episodio la persona puede quedar confundida, cansada o avergonzada, y necesita compañía tranquila.

### Señales de alarma

- Palidez repentina, sudor frío o mirada perdida mientras se está conversando.
- Aviso de mareo, visión borrosa o zumbido en los oídos al ponerse de pie.
- Desvanecimiento que dura más de un minuto o del que la persona no se recupera del todo.
- Caída con golpe en la cabeza, sangrado o dolor fuerte en algún miembro.
- Confusión, dificultad para hablar o debilidad de un lado del cuerpo después del episodio.
- Dolor en el pecho, falta de aire o latidos muy rápidos o muy lentos antes o después.
- Episodios que se repiten el mismo día o que aparecen sin ningún aviso previo.

### Qué hacer en una emergencia

1. Llamar al servicio de emergencias si la persona no responde, si tardó en despertarse o si se golpeó la cabeza.
2. No mover a la persona si pudo haberse lastimado en la caída, y despejar el paso a su alrededor.
3. Acompañar y no dejarla sola en ningún momento, hablándole con calma aunque parezca no escuchar.
4. Anotar la hora exacta del episodio, cuánto duró y qué se observó antes y después.
5. Avisar a la Prestadora y a la Familia apenas la situación esté contenida.
6. Dejar registrado qué pasó, qué se hizo y quién intervino.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `sincope`, renglón 1254. Qué es: 1256. Qué esperar: 1261. Señales de alarma: 1266. Qué hacer en una emergencia: 1295.

---

## 14. Obesidad

### Qué es

La obesidad es una condición de salud en la que el cuerpo acumula una cantidad de grasa que puede afectar el funcionamiento de las articulaciones, la respiración y la piel. No define a la persona ni dice nada sobre su voluntad ni sobre sus hábitos. Para el acompañamiento en el domicilio, lo que importa es cómo se mueve, cómo respira y cómo se cuida la piel.

### Qué esperar en el domicilio

En el domicilio suele haber cansancio al caminar distancias cortas, al subir escaleras o al levantarse de una silla baja. La respiración puede volverse más trabajosa al acostarse boca arriba, y por eso muchas personas descansan con la cabecera elevada o con varias almohadas. Es frecuente encontrar dolor en rodillas, caderas o zona lumbar, y movimientos más lentos al girar en la cama o al entrar y salir del baño. La piel de los pliegues necesita quedar seca y ventilada, porque la humedad la irrita con facilidad. Conviene revisar que el hogar tenga apoyos firmes, sillas resistentes y espacio libre de paso, y consultar a la Prestadora qué equipo de traslado está autorizado antes de moverlo.

### Señales de alarma

- Falta de aire en reposo, al hablar o al acostarse, que antes no aparecía.
- Labios o uñas de color azulado, o respiración ruidosa y muy trabajosa.
- Hinchazón nueva en piernas, tobillos o pies, sobre todo si es de un solo lado.
- Enrojecimiento, mal olor, grietas o heridas en los pliegues de la piel.
- Zonas de la piel rojas que no aclaran al dejar de apoyarlas, o ampollas por presión.
- Somnolencia marcada durante el día o ronquidos con pausas en la respiración de noche.
- Dolor articular que impide un movimiento que ayer se hacía sin ayuda.

### Qué hacer en una emergencia

1. Llamar al servicio de emergencias ante falta de aire intensa, dolor en el pecho o labios azulados.
2. Acompañar y no dejar sola a la persona, respetando la posición en la que respira mejor.
3. Pedir ayuda antes de intentar mover o levantar a la persona, y no forzar el traslado en soledad.
4. Despejar el paso y abrir el acceso a la vivienda para que el servicio de emergencias entre sin demora.
5. Anotar la hora en que empezó, qué se observó y qué se hizo.
6. Avisar a la Prestadora y a la Familia, y dejar registrado el episodio.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `obesidad`, renglón 852. Qué es: 854. Qué esperar: 859. Señales de alarma: 864. Qué hacer en una emergencia: 893.

---

## 15. Ceguera

### Qué es

La ceguera es la pérdida total o casi total de la visión, y puede ser de nacimiento o haber aparecido más tarde en la vida. Quien la tiene organiza su casa y su día con un orden propio, que reemplaza a la vista y funciona con precisión. Acompañar significa sostener ese orden y ofrecer información, no decidir por la persona ni adelantarse a sus movimientos.

### Qué esperar en el domicilio

La casa está armada como un mapa: cada objeto tiene un lugar exacto, y ese lugar es lo que permite encontrarlo sin ayuda. Por eso la indicación central es que nadie mueva los objetos de lugar, y que si algo se corrió por necesidad se avise en el momento y se devuelva a su sitio. La persona puede orientarse con bastón, con un animal guía, con referencias táctiles o simplemente con la memoria del recorrido, y suele desplazarse por la casa con soltura. Conviene presentarse en voz alta al entrar a una habitación, avisar antes de salir, y describir lo que está ocurriendo alrededor sin exagerar el detalle. Para acompañar al caminar, se ofrece el brazo y se espera a que la persona lo tome, en lugar de empujar o tirar.

### Señales de alarma

- Objetos, muebles o alfombras corridos de su lugar habitual por cualquier motivo.
- Cables sueltos, líquido derramado, puertas entornadas u obstáculos nuevos en el recorrido.
- Tropiezos, golpes contra muebles o caídas que antes no ocurrían en esa casa.
- Dolor de ojos, secreción, enrojecimiento o hinchazón en párpados o alrededor del ojo.
- Cambio referido en lo poco que se percibía: luces, sombras o bultos que ya no se distinguen.
- Desorientación dentro de la propia casa, o dificultad nueva para reconocer voces conocidas.
- Bastón dañado, animal guía enfermo o ayuda técnica que dejó de funcionar.

### Qué hacer en una emergencia

1. Hablar de inmediato y decir quién está presente, para que la persona sepa que no está sola.
2. Describir en voz alta lo que está pasando y lo que se va a hacer antes de cada paso.
3. Llamar al servicio de emergencias si hay una caída con golpe, dolor de ojos intenso o pérdida de conocimiento.
4. No mover a la persona si pudo haberse lastimado, y pedir ayuda antes de intentar levantarla.
5. Despejar el paso y avisar en voz alta cada objeto que se haya corrido, para devolverlo después a su lugar.
6. Avisar a la Prestadora y a la Familia, anotar la hora y dejar registrado qué pasó.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `ceguera`, renglón 389. Qué es: 391. Qué esperar: 396. Señales de alarma: 401. Qué hacer en una emergencia: 430.

---

## 16. Amputaciones

### Qué es

Una amputación es la ausencia de una parte del cuerpo, de nacimiento o por una cirugía posterior. La persona suele tener su propia manera de hacer las cosas, con o sin prótesis, y esa manera funciona: acompañar es sostenerla, no reemplazarla. Lo que cambia en el domicilio es el cuidado de la piel de la zona, la forma de apoyarse y el riesgo de caídas.

### Qué esperar en el domicilio

En el domicilio se ve una rutina propia para vestirse, higienizarse y desplazarse, muchas veces más rápida de lo que un observador supone. La prótesis, si la hay, se coloca y se retira en momentos determinados del día, y sólo la maneja la persona o quien ella indique; el Asistente no la ajusta ni la modifica. La piel de la zona y los puntos de apoyo se revisan a diario, porque el roce y la humedad marcan enseguida. Es frecuente encontrar bastón, muletas, andador o silla de ruedas, y conviene que queden siempre al alcance de la mano y en el mismo lugar. El riesgo mayor está en los traslados y en los pisos mojados, así que ayuda mantener el paso despejado y ofrecer ayuda antes de darla por descontada.

### Señales de alarma

- Enrojecimiento que no aclara, ampollas o heridas abiertas en la zona de apoyo.
- Hinchazón nueva, calor local, mal olor o secreción en la zona.
- Dolor que aumenta, cambia de carácter o impide colocarse la prótesis como todos los días.
- Piel pálida, azulada o muy fría en el miembro que queda.
- Prótesis floja, rota, que roza o que ya no calza como antes.
- Caídas, tropiezos o inestabilidad nueva al pararse o al hacer un traslado.
- Fiebre, decaimiento o confusión junto con cualquiera de las señales anteriores.

### Qué hacer en una emergencia

1. Ante una caída, no mover a la persona ni intentar levantarla en soledad: pedir ayuda primero.
2. Llamar al servicio de emergencias si hay golpe en la cabeza, sangrado, dolor intenso o pérdida de conocimiento.
3. Acompañar y no dejar sola a la persona, explicando qué se va a hacer antes de cada paso.
4. Despejar el paso y acercar el bastón, las muletas o la silla, sin colocar ni retirar la prótesis.
5. Anotar la hora, qué se observó en la zona de apoyo y cómo ocurrió el episodio.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `amputaciones`, renglón 188. Qué es: 190. Qué esperar: 195. Señales de alarma: 200. Qué hacer en una emergencia: 229.

---

## 17. Pacientes postrados

### Qué es

Un Paciente postrado es una persona que permanece la mayor parte del día en la cama y no puede cambiar de posición por sus propios medios. Al apoyar siempre las mismas zonas del cuerpo, la piel se lastima con facilidad y aparecen lesiones por presión. El cuidado diario se apoya en tres cosas: mover, higienizar y observar la piel.

### Qué esperar en el domicilio

En el domicilio se encuentra una cama que es el centro de la jornada, y buena parte del trabajo ocurre alrededor de ella. Los cambios de posición se repiten varias veces por día y siguen el plan que dejó indicado el equipo de salud. La higiene, el secado cuidadoso de los pliegues y la hidratación de la piel forman parte de la rutina, junto con el cambio de la ropa de cama cuando queda húmeda o arrugada. Se ofrecen líquidos con frecuencia, siempre que la persona pueda tomarlos sin dificultad. Cada revisión de la piel es una oportunidad de observar: talones, caderas, zona baja de la espalda, codos y orejas.

### Señales de alarma

- Una zona de piel enrojecida que no se aclara después de aliviar la presión.
- Piel abierta, ampollas, piel de color oscuro o violáceo sobre una zona de apoyo.
- Mal olor, líquido o supuración en cualquier zona de la piel.
- Dolor o queja al tocar o al mover una parte del cuerpo.
- Fiebre, escalofríos o piel muy caliente al tacto.
- Menos orina que lo habitual, orina muy oscura, boca seca o labios agrietados.
- Somnolencia mayor que lo habitual, confusión o dificultad para despertar a la persona.

### Qué hacer en una emergencia

1. Aliviar la presión sobre la zona afectada y no frotarla ni aplicarle nada.
2. Acompañar al Paciente y no dejarlo solo.
3. Llamar al servicio de emergencias si hay fiebre alta, dificultad para respirar o pérdida de conciencia.
4. Buscar y respetar lo que el equipo de salud dejó indicado por escrito en el domicilio.
5. Avisar a la Prestadora y a la Familia apenas la situación esté contenida.
6. Dejar registrado qué se observó, a qué hora y qué se hizo.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `postrados`, renglón 1120. Qué es: 1122. Qué esperar: 1127. Señales de alarma: 1132. Qué hacer en una emergencia: 1161.

---

## 18. Cuidados paliativos

### Qué es

Los cuidados paliativos acompañan a una persona con una enfermedad que ya no se puede curar. El objetivo no es curar sino que la persona esté cómoda, sin dolor evitable y acompañada, y que la Familia también reciba apoyo. Todo lo que un profesional dejó indicado por escrito en el domicilio se respeta tal como está.

### Qué esperar en el domicilio

En el domicilio suele haber un equipo de cuidados paliativos a cargo, con indicaciones escritas y un teléfono de contacto propio. El ritmo del día lo marca el bienestar del Paciente: se descansa mucho, se come poco y las visitas se acortan. Es habitual que la persona duerma más horas, hable menos y prefiera la penumbra y el silencio. La Familia atraviesa un momento difícil y puede pasar del enojo al llanto o al silencio en el mismo día; escuchar sin opinar sobre las decisiones que ya se tomaron es parte del cuidado. El trabajo del Asistente es la presencia, la comodidad y la observación atenta.

### Señales de alarma

- Dolor que aumenta, que no cede con la posición o que se ve en la cara y en los gestos.
- Dificultad para respirar, respiración ruidosa o agitada.
- Agitación, inquietud, angustia o confusión nuevas.
- Dificultad para tragar, o rechazo de todo alimento y de toda bebida.
- Cambio brusco en el estado de conciencia o imposibilidad de despertar a la persona.
- Náuseas o vómitos que se repiten, o falta de deposiciones u orina por un tiempo prolongado.
- Una Familia desbordada, sin descanso o sin saber qué hacer.

### Qué hacer en una emergencia

1. Acompañar al Paciente, hablarle con calma y no dejarlo solo.
2. Observar qué está pasando y anotar la hora en que empezó.
3. Buscar en el domicilio las indicaciones escritas por el equipo de cuidados paliativos y respetarlas tal como están.
4. Avisar de inmediato al equipo de cuidados paliativos a cargo, o al servicio de emergencias cuando así lo indique lo escrito en el domicilio.
5. Avisar a la Prestadora y a la Familia.
6. Dejar registrado qué pasó, a qué hora y a quién se avisó.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `paliativos`, renglón 986. Qué es: 988. Qué esperar: 993. Señales de alarma: 998. Qué hacer en una emergencia: 1027.

---

## 19. Paciente oncológico

### Qué es

Un Paciente oncológico es una persona en tratamiento por cáncer. El tratamiento actúa sobre la enfermedad, pero también baja las defensas del cuerpo y cambia el apetito, la fuerza y el ánimo, con días mejores y días peores. Por eso el cuidado se concentra en la higiene, en evitar el contacto con personas enfermas y en observar la fiebre, que en esta situación es una urgencia.

### Qué esperar en el domicilio

En el domicilio se nota que los días no son todos iguales: después de cada ciclo de tratamiento suele haber una etapa de más cansancio y menos apetito. Es frecuente encontrar náuseas, cambios en el gusto de la comida, caída del cabello, llagas en la boca y una fatiga que no se resuelve durmiendo. El lavado de manos, la limpieza de las superficies y la comida bien lavada y bien cocida son parte central de la jornada. Conviene mantener alejadas a las visitas que estén resfriadas o con cualquier cuadro contagioso, y avisar cuando alguien de la casa se enferma. El ánimo también cambia: hay días de silencio y días de conversación, y ambos se acompañan sin apurar a la persona.

### Señales de alarma

- Fiebre, aunque sea leve: en esta situación es una urgencia y se avisa siempre.
- Escalofríos, temblores o sudoración abundante.
- Sangrado que no se detiene, moretones nuevos sin golpe o pequeños puntos rojos en la piel.
- Llagas en la boca que impiden comer o beber, o dificultad para tragar.
- Vómitos o diarrea que se repiten, o falta de orina durante varias horas.
- Dificultad para respirar, dolor en el pecho o palpitaciones.
- Confusión, desorientación o una debilidad que impide sostenerse de pie.

### Qué hacer en una emergencia

1. Ante fiebre, llamar de inmediato al servicio de emergencias o al equipo tratante, según lo indicado en el domicilio.
2. Acompañar al Paciente y no dejarlo solo.
3. Anotar la hora, la temperatura y lo que se observó.
4. Apartar del ambiente a cualquier persona con síntomas de contagio y ventilar el lugar.
5. Buscar y respetar lo que el equipo tratante dejó indicado por escrito en el domicilio.
6. Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó.

> **De dónde sale.** `0042_las_diecinueve_guias_generales.sql`, clave `oncologico`, renglón 919. Qué es: 921. Qué esperar: 926. Señales de alarma: 931. Qué hacer en una emergencia: 960.

---

## Las dos prohibiciones que la migración se puso a sí misma

Están escritas en el encabezado de la 0042, renglones 19 a 30, y valen para cualquier corrección
que se le haga a estas guías y para cualquier guía nueva:

1. **Ningún tratamiento.** Ni medicamentos, ni dosis, ni maniobras clínicas. La guía dice qué es la
   patología, qué se ve en el domicilio, qué señales obligan a avisar y cómo actuar en una
   emergencia. No dice qué darle a nadie.
2. **Ningún número de emergencia de ningún país.** El número cambia por país, y escribirlo en la
   guía lo convierte en dato del producto en vez de dato de la Prestadora. Por eso todas dicen
   «el servicio de emergencias» y ninguna dice un número.

Es la misma línea que traza la 0041: **el producto avisa, no prescribe.**

**Y la pantalla ya avisa lo mismo.** La aplicación del Asistente lo dice arriba de la lista de
guías, antes de que se abra ninguna: «Estas guías dicen qué observar y cuándo avisar. No indican
tratamientos.» (`pwa-asistente/index.html:815`). Así que si una corrección cruza esa línea, la
pantalla queda diciendo una cosa y la guía otra.

---

## Lo que conviene mirar con más atención

Nada de esto se cambió: es una lista de lugares donde el texto roza el borde de las dos
prohibiciones, o donde la redacción quedó floja. La decisión es del Desarrollador.

**Números de emergencia:** no hay ninguno. Las diecinueve guías dicen «el servicio de emergencias»
y ninguna escribe un número, ni de Argentina ni de ningún otro país. Tampoco aparece ningún
medicamento por su nombre, ninguna dosis y ninguna vía de administración.

**Lo que sí roza el borde de «ninguna maniobra clínica»:**

1. **Pacientes anticoagulados, renglón 298.** «Si hay una herida que sangra, presionar sobre ella
   con un paño limpio, de forma sostenida y sin levantarlo para mirar.» Es la única instrucción de
   todas las guías que le pide al Asistente **actuar sobre el cuerpo del Paciente**, y no sólo
   acompañar, observar o avisar. Puede ser primeros auxilios y no tratamiento, pero conviene que la
   distinción quede decidida y escrita, porque es la que va a decidir todos los casos siguientes.
2. **Epilepsia o convulsiones, renglón 694.** «Apartar los objetos duros o filosos que estén cerca y
   proteger la cabeza con algo blando.» Apartar objetos es despejar el ambiente; poner algo bajo la
   cabeza es tocar al Paciente. Cae del mismo lado de la línea que el punto anterior y se decide
   junto con él.
3. **Pacientes postrados, renglón 1162.** «Aliviar la presión sobre la zona afectada y no frotarla
   ni aplicarle nada.» La segunda mitad es una prohibición y no ofrece dudas; la primera mitad es
   mover al Paciente por un motivo de cuidado de la piel.
4. **Cuatro guías indican una postura, y cada una con distinta mano.** EPOC (renglón 761) nombra
   la postura con precisión: «habitualmente sentada e inclinada hacia adelante». Hipertensión
   (renglón 829) también la nombra: «en reposo, semisentada y con ropa holgada». Enfermedades
   coronarias (renglón 499) y Arritmias (renglón 365) no nombran ninguna y dejan que la elija el
   Paciente: «donde le resulte más cómodo respirar», «sin forzar ninguna posición». Las cuatro
   aclaran que no se fuerza, así que ninguna es indefendible; lo que conviene decidir es si el
   producto puede nombrar una postura o sólo puede pedir que se respete la que el Paciente elija.
   Sea cual sea el criterio, las cuatro deberían decir lo mismo.
5. **EPOC, renglones 725 y 762.** El Asistente «verifica que el equipo esté encendido y funcionando
   como fue indicado». Es equipamiento de oxígeno, es decir un tratamiento en curso. El texto
   aclara dos veces «sin modificar ningún ajuste», que es lo que lo salva; vale confirmar que
   verificar sin tocar es lo que se quiere pedir.
6. **Diabetes, renglón 597, e Hipertensión, renglón 792.** Las dos hablan de controles «ya
   indicados» que el Asistente toma, registra e informa «sin tomar ninguna decisión a partir de
   ese número». Hipertensión dice cuál es el control —«un control de presión»—; Diabetes no lo
   nombra y dice sólo «controles ya indicados». Tomar una medición es un acto clínico aunque no se
   decida nada con el resultado, así que hay dos cosas para mirar: si el acto se permite, y si las
   dos guías deberían ser igual de explícitas sobre qué se mide.

**Lo que quedó flojo en la redacción, sin relación con las prohibiciones:**

7. **Pacientes anticoagulados, renglón 257.** «Un Paciente anticoagulado recibe un tratamiento
   indicado por su médico para que la sangre coagule más despacio.» Es la única descripción que
   define la patología **por el tratamiento** en vez de por la condición. No nombra ningún
   medicamento, así que no cruza la prohibición, pero se sale del molde de las otras dieciocho.
8. **Amputaciones, renglón 190.** «Una amputación es la ausencia de una parte del cuerpo, de
   nacimiento o por una cirugía posterior.» Una amputación es siempre la pérdida de algo que
   estuvo; lo que falta desde el nacimiento es otra cosa y tiene otro nombre. La guía acierta en
   cubrir los dos casos, pero la definición los mete a los dos bajo una palabra que sólo alcanza a
   uno.
9. **Diabetes, renglones 590 a 653.** Es la única guía con **cinco** pasos en «Qué hacer en una
   emergencia»; las otras dieciocho tienen seis. Epilepsia es la única con **seis** señales de
   alarma; las otras dieciocho tienen siete. No hay ninguna restricción que exija un número fijo,
   así que puede ser deliberado, pero conviene mirarlo antes de publicar.
