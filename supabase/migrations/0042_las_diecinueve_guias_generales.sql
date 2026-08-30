-- =====================================================================
-- 0042 — Las 19 Guías de cuidado generales, como borrador
--
-- La 0041 dejó la tabla, las cuatro partes, los dos escalones y la puerta.
-- No dejó una sola guía escrita, así que el Asistente seguía eligiendo
-- «Alzheimer» de una lista sin que el producto le dijera nada. Eso es el
-- pendiente 104, y esto lo cierra: las 19 patologías del catálogo general
-- quedan con su guía, en los tres idiomas.
--
-- Entran como BORRADOR, y es a propósito
-- --------------------------------------
-- `publicada = false`. La puerta `guias_de` sólo devuelve publicadas, así
-- que ninguna de estas llega todavía a la aplicación del Asistente. Para
-- publicarse, la 0041 exige quién la revisó y cuándo
-- (`la_publicada_dice_quien_la_reviso`, 0041:145), y esa firma no la puede
-- poner una migración: la pone una persona que se hace responsable de lo
-- que ahí dice. Escribirla acá sería inventar una revisión que no ocurrió.
--
-- Qué dicen y qué no
-- ------------------
-- Qué es la patología, qué se ve en el domicilio, qué señales obligan a
-- avisar y cómo actuar en una emergencia, en pasos y en orden. **Ningún
-- tratamiento**: ni medicamentos, ni dosis, ni maniobras clínicas, ni
-- números de emergencia de ningún país —el número cambia por país y
-- escribirlo acá lo convierte en dato del producto en vez de dato de la
-- Prestadora—. Es la misma línea que traza la 0041: el producto avisa, no
-- prescribe.
--
-- El texto se escribió sin ningún dato de persona real, que es la regla, y
-- además no habría de dónde: describe patologías, no pacientes.
--
-- Cada Prestadora puede reemplazar la suya
-- ----------------------------------------
-- Estas son las generales —`tenant_id` nulo—. La Prestadora que quiera
-- decir otra cosa carga la suya y la suya gana, que es lo que resuelve la
-- puerta y no la pantalla. Escribirla desde el producto todavía no se
-- puede: eso es el pendiente 103.
-- =====================================================================


-- --- Las guías -------------------------------------------------------
-- Un solo literal, y la base lo reparte. Escribir 19 `insert` a mano
-- sería 19 oportunidades de que uno quede con una parte de menos: las
-- restricciones de la 0041 lo atajarían, pero recién al aplicar.
--
-- El ítem del catálogo se busca por su clave, nunca por un identificador
-- escrito a mano: los identificadores los genera cada base y copiarlos
-- ataría esta migración a la base donde se escribió.

with entrada as (
  select clave, guia
    from jsonb_each($guias$
{
  "acv": {
    "descripcion": {
      "es-AR": "El ACV, o accidente cerebrovascular, ocurre cuando se interrumpe la llegada de sangre a una parte del cerebro y esa zona deja de funcionar. Según el área afectada quedan secuelas en la fuerza de un lado del cuerpo, en el habla, en la vista, en el equilibrio o en la memoria. Es una urgencia médica, y el tiempo que pasa desde el primer síntoma cambia el resultado.",
      "en": "A stroke happens when the blood supply to part of the brain is interrupted and that area stops working. Depending on the region affected, it leaves consequences in the strength of one side of the body, in speech, in vision, in balance or in memory. It is a medical emergency, and the time elapsed since the first symptom changes the outcome.",
      "pt-BR": "O AVC, ou acidente vascular cerebral, acontece quando a chegada de sangue a uma parte do cérebro é interrompida e aquela área deixa de funcionar. Conforme a região afetada, ficam sequelas na força de um lado do corpo, na fala, na visão, no equilíbrio ou na memória. É uma urgência médica, e o tempo decorrido desde o primeiro sintoma muda o resultado."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele encontrarse un lado del cuerpo más débil o más torpe, con dificultad para caminar, para sostener objetos o para vestirse sin ayuda. El habla puede salir arrastrada, o costar encontrar las palabras aun entendiendo todo lo que se dice alrededor. Es frecuente el cansancio rápido, la emoción a flor de piel y el llanto o la risa que aparecen sin motivo claro. Tragar puede resultar difícil, y eso lo define siempre el equipo de salud tratante, nunca el Asistente por su cuenta. La recuperación es lenta y desigual: hay semanas de avance visible y semanas sin ningún cambio.",
      "en": "In the home one side of the body is usually weaker or clumsier, making it hard to walk, to hold objects or to get dressed without help. Speech may come out slurred, or words may be hard to find even when everything said around is understood. Quick tiredness is common, along with emotions close to the surface and crying or laughing that arrives for no clear reason. Swallowing may be difficult, and that is always decided by the treating health team, never by the Assistant alone. Recovery is slow and uneven: there are weeks of visible progress and weeks with no change at all.",
      "pt-BR": "No domicílio costuma-se encontrar um lado do corpo mais fraco ou mais desajeitado, com dificuldade para caminhar, segurar objetos ou se vestir sem ajuda. A fala pode sair arrastada, ou pode custar encontrar as palavras mesmo entendendo tudo o que se diz ao redor. É frequente o cansaço rápido, a emoção à flor da pele e o choro ou o riso que surgem sem motivo claro. Engolir pode ser difícil, e isso quem define é sempre a equipe de saúde responsável, nunca o Assistente por conta própria. A recuperação é lenta e desigual: há semanas de avanço visível e semanas sem nenhuma mudança."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Caída de un lado de la cara, notoria al hablar o al sonreír.",
        "Pérdida de fuerza en un brazo o en una pierna, aparecida de golpe.",
        "Habla arrastrada o confusa, o imposibilidad repentina de encontrar las palabras.",
        "Pérdida brusca de la visión, visión doble o desviación de la mirada.",
        "Pérdida del equilibrio o mareo intenso que impide sostenerse de pie.",
        "Dolor de cabeza muy fuerte y repentino, distinto de cualquier otro anterior.",
        "Somnolencia profunda, desmayo o dificultad para despertar a la persona."
      ],
      "en": [
        "Drooping on one side of the face, visible when speaking or smiling.",
        "Loss of strength in one arm or one leg, appearing all at once.",
        "Slurred or confused speech, or a sudden inability to find words.",
        "Abrupt loss of vision, double vision, or the gaze pulled to one side.",
        "Loss of balance or intense dizziness that makes standing impossible.",
        "A very severe, sudden headache, unlike any previous one.",
        "Deep drowsiness, fainting, or difficulty waking the person."
      ],
      "pt-BR": [
        "Queda de um lado do rosto, perceptível ao falar ou ao sorrir.",
        "Perda de força em um braço ou em uma perna, surgida de repente.",
        "Fala arrastada ou confusa, ou incapacidade súbita de encontrar as palavras.",
        "Perda brusca da visão, visão dupla ou desvio do olhar.",
        "Perda do equilíbrio ou tontura intensa que impede ficar de pé.",
        "Dor de cabeça muito forte e repentina, diferente de qualquer outra anterior.",
        "Sonolência profunda, desmaio ou dificuldade para despertar a pessoa."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Llamar al servicio de emergencias de inmediato ante cualquiera de estas señales.",
        "Anotar la hora exacta en que se vio el primer síntoma e informarla a quien atienda.",
        "No mover al Paciente más de lo necesario y no dejarlo solo en ningún momento.",
        "No ofrecer alimento, líquido ni ninguna otra sustancia por la boca.",
        "Despejar el ambiente y abrir el paso para que la ayuda llegue sin demora.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado todo lo observado."
      ],
      "en": [
        "Call the emergency service immediately at any of these signs.",
        "Write down the exact time the first symptom was seen and report it to the responder.",
        "Do not move the Patient more than necessary and do not leave the person alone at any moment.",
        "Do not offer food, drink or any other substance by mouth.",
        "Clear the room and open the way so that help can arrive without delay.",
        "Notify the Provider and the Family, and leave everything observed on record."
      ],
      "pt-BR": [
        "Ligar imediatamente para o serviço de emergência diante de qualquer um desses sinais.",
        "Anotar a hora exata em que o primeiro sintoma foi visto e informá-la a quem atender.",
        "Não mover o Paciente mais do que o necessário e não deixá-lo sozinho em nenhum momento.",
        "Não oferecer alimento, líquido nem qualquer outra substância pela boca.",
        "Liberar o ambiente e abrir a passagem para que a ajuda chegue sem demora.",
        "Avisar a Prestadora e a Família, e deixar registrado tudo o que foi observado."
      ]
    }
  },
  "alzheimer": {
    "descripcion": {
      "es-AR": "El Alzheimer es una enfermedad del cerebro que avanza de a poco y va borrando la memoria, la orientación y la capacidad de resolver las cosas de todos los días. Al principio se olvida lo que acaba de pasar, y con el tiempo cuesta reconocer lugares, objetos y personas conocidas. Es una enfermedad que no retrocede, y el acompañamiento cambia según la etapa que atraviesa cada Paciente.",
      "en": "Alzheimer's is a brain disease that advances slowly and gradually erases memory, orientation and the ability to handle everyday tasks. At first recent events are forgotten, and over time it becomes hard to recognise familiar places, objects and people. The disease does not reverse, and the support it calls for changes with the stage each Patient is going through.",
      "pt-BR": "O Alzheimer é uma doença do cérebro que avança devagar e vai apagando a memória, a orientação e a capacidade de resolver as coisas do dia a dia. No início se esquece o que acabou de acontecer e, com o tempo, fica difícil reconhecer lugares, objetos e pessoas conhecidas. É uma doença que não retrocede, e o acompanhamento muda conforme a etapa que cada Paciente atravessa."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele verse que se repiten las mismas preguntas muchas veces en el día y que se olvida lo que ocurrió hace un rato. Es habitual que se confundan los horarios, que quede a medias una tarea empezada o que aparezcan objetos guardados en lugares insólitos. Hacia el final de la tarde la inquietud puede aumentar, con ganas de salir a la calle o de volver a una casa donde ya no se vive. La rutina estable, los ambientes conocidos y las frases cortas suelen ayudar más que las explicaciones largas. Con el avance de la enfermedad, vestirse, higienizarse y comer requieren cada vez más acompañamiento del Asistente.",
      "en": "In the home the same questions tend to come up many times a day, and what happened a moment ago is often forgotten. Schedules get mixed up, tasks are left half finished, and objects turn up stored in unlikely places. Late in the afternoon restlessness may grow, with attempts to go outside or to return to a home where the person no longer lives. A steady routine, familiar surroundings and short sentences usually help more than long explanations. As the disease advances, dressing, washing and eating call for more and more support from the Assistant.",
      "pt-BR": "No domicílio costumam se repetir as mesmas perguntas muitas vezes por dia, e o que aconteceu há pouco é esquecido. É comum confundir horários, deixar pela metade uma tarefa iniciada ou encontrar objetos guardados em lugares inusitados. No fim da tarde a inquietação pode aumentar, com vontade de sair à rua ou de voltar a uma casa onde já não se mora. A rotina estável, os ambientes conhecidos e as frases curtas costumam ajudar mais do que as explicações longas. Com o avanço da doença, vestir-se, higienizar-se e comer exigem cada vez mais acompanhamento do Assistente."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Cambio brusco de la confusión habitual, instalado en horas o en un solo día.",
        "Intento de salir del domicilio sin rumbo, o desorientación dentro de la propia casa.",
        "Agitación, agresividad o miedo intenso que no cede con el acompañamiento.",
        "Somnolencia inusual o dificultad para despertar a la persona.",
        "Caídas, golpes o moretones sin explicación.",
        "Rechazo del alimento y del líquido a lo largo de todo un día.",
        "Fiebre, quejido o dolor persistente, aunque no se pueda señalar dónde duele."
      ],
      "en": [
        "A sudden change in the usual level of confusion, setting in within hours or a single day.",
        "Attempts to leave the home with no destination, or disorientation inside the house itself.",
        "Agitation, aggression or intense fear that does not settle with company and reassurance.",
        "Unusual drowsiness or difficulty waking the person.",
        "Falls, knocks or bruises with no explanation.",
        "Refusal of food and drink throughout a whole day.",
        "Fever, moaning or persistent pain, even when the person cannot point to where it hurts."
      ],
      "pt-BR": [
        "Mudança brusca da confusão habitual, instalada em horas ou em um único dia.",
        "Tentativa de sair de casa sem rumo, ou desorientação dentro do próprio domicílio.",
        "Agitação, agressividade ou medo intenso que não cede com o acompanhamento.",
        "Sonolência incomum ou dificuldade para despertar a pessoa.",
        "Quedas, batidas ou hematomas sem explicação.",
        "Recusa de alimento e de líquido ao longo de um dia inteiro.",
        "Febre, gemido ou dor persistente, mesmo sem conseguir apontar onde dói."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Mantener la calma y quedarse junto al Paciente, sin dejarlo solo en ningún momento.",
        "Observar qué está ocurriendo y anotar la hora exacta en que empezó.",
        "Apartar los objetos con los que pueda golpearse y despejar el paso.",
        "Llamar al servicio de emergencias y seguir la indicación de quien atienda.",
        "Avisar a la Prestadora y a la Familia apenas la situación lo permita.",
        "Dejar registrado qué se observó, qué se hizo y a quién se avisó."
      ],
      "en": [
        "Stay calm and remain beside the Patient, never leaving the person alone.",
        "Observe what is happening and write down the exact time it started.",
        "Move away objects the person could be hurt against and clear the way.",
        "Call the emergency service and follow the instructions given by the responder.",
        "Notify the Provider and the Family as soon as the situation allows.",
        "Leave a written record of what was observed, what was done and who was notified."
      ],
      "pt-BR": [
        "Manter a calma e permanecer junto ao Paciente, sem deixá-lo sozinho em nenhum momento.",
        "Observar o que está acontecendo e anotar a hora exata em que começou.",
        "Afastar os objetos contra os quais a pessoa possa se machucar e liberar a passagem.",
        "Ligar para o serviço de emergência e seguir a orientação de quem atender.",
        "Avisar a Prestadora e a Família assim que a situação permitir.",
        "Deixar registrado o que foi observado, o que foi feito e quem foi avisado."
      ]
    }
  },
  "amputaciones": {
    "descripcion": {
      "es-AR": "Una amputación es la ausencia de una parte del cuerpo, de nacimiento o por una cirugía posterior. La persona suele tener su propia manera de hacer las cosas, con o sin prótesis, y esa manera funciona: acompañar es sostenerla, no reemplazarla. Lo que cambia en el domicilio es el cuidado de la piel de la zona, la forma de apoyarse y el riesgo de caídas.",
      "en": "An amputation is the absence of a part of the body, either from birth or after surgery. The person usually has their own way of doing things, with or without a prosthesis, and that way works: support means backing it up, not replacing it. What changes at home is the care of the skin in the area, the way weight is supported, and the risk of falls.",
      "pt-BR": "Uma amputação é a ausência de uma parte do corpo, de nascimento ou por uma cirurgia posterior. A pessoa costuma ter seu próprio jeito de fazer as coisas, com ou sem prótese, e esse jeito funciona: acompanhar é sustentá-lo, não substituí-lo. O que muda no domicílio é o cuidado da pele da região, a forma de se apoiar e o risco de quedas."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se ve una rutina propia para vestirse, higienizarse y desplazarse, muchas veces más rápida de lo que un observador supone. La prótesis, si la hay, se coloca y se retira en momentos determinados del día, y sólo la maneja la persona o quien ella indique; el Asistente no la ajusta ni la modifica. La piel de la zona y los puntos de apoyo se revisan a diario, porque el roce y la humedad marcan enseguida. Es frecuente encontrar bastón, muletas, andador o silla de ruedas, y conviene que queden siempre al alcance de la mano y en el mismo lugar. El riesgo mayor está en los traslados y en los pisos mojados, así que ayuda mantener el paso despejado y ofrecer ayuda antes de darla por descontada.",
      "en": "At home there is a routine of the person's own for dressing, washing, and moving about, often faster than an onlooker would assume. The prosthesis, where there is one, goes on and comes off at set points in the day, and is handled only by the person or by whoever they name; the Assistant does not adjust or alter it. The skin of the area and the weight bearing points are checked daily, because friction and moisture leave marks quickly. A cane, crutches, a walker, or a wheelchair are commonly in use, and should always stay within reach and in the same place. The greatest risk lies in transfers and wet floors, so it helps to keep walkways clear and to offer help rather than assume it is wanted.",
      "pt-BR": "No domicílio observa-se uma rotina própria para vestir-se, higienizar-se e locomover-se, muitas vezes mais rápida do que um observador supõe. A prótese, quando existe, é colocada e retirada em momentos determinados do dia, e só é manuseada pela pessoa ou por quem ela indicar; o Assistente não a ajusta nem a modifica. A pele da região e os pontos de apoio são revisados diariamente, porque o atrito e a umidade marcam logo. É frequente encontrar bengala, muletas, andador ou cadeira de rodas, e convém que fiquem sempre ao alcance da mão e no mesmo lugar. O risco maior está nas transferências e nos pisos molhados, então ajuda manter a passagem livre e oferecer ajuda antes de dá-la como certa."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Enrojecimiento que no aclara, ampollas o heridas abiertas en la zona de apoyo.",
        "Hinchazón nueva, calor local, mal olor o secreción en la zona.",
        "Dolor que aumenta, cambia de carácter o impide colocarse la prótesis como todos los días.",
        "Piel pálida, azulada o muy fría en el miembro que queda.",
        "Prótesis floja, rota, que roza o que ya no calza como antes.",
        "Caídas, tropiezos o inestabilidad nueva al pararse o al hacer un traslado.",
        "Fiebre, decaimiento o confusión junto con cualquiera de las señales anteriores."
      ],
      "en": [
        "Redness that does not fade, blisters, or open wounds on the weight bearing area.",
        "New swelling, local warmth, bad odour, or discharge in the area.",
        "Pain that increases, changes in character, or prevents putting the prosthesis on as usual.",
        "Pale, bluish, or very cold skin on the remaining limb.",
        "A prosthesis that is loose, broken, rubbing, or no longer fitting as before.",
        "Falls, stumbles, or new unsteadiness when standing up or during a transfer.",
        "Fever, weakness, or confusion together with any of the signs above."
      ],
      "pt-BR": [
        "Vermelhidão que não clareia, bolhas ou feridas abertas na região de apoio.",
        "Inchaço novo, calor local, mau cheiro ou secreção na região.",
        "Dor que aumenta, muda de característica ou impede colocar a prótese como todos os dias.",
        "Pele pálida, azulada ou muito fria no membro remanescente.",
        "Prótese frouxa, quebrada, que atrita ou que já não encaixa como antes.",
        "Quedas, tropeços ou instabilidade nova ao ficar de pé ou ao fazer uma transferência.",
        "Febre, abatimento ou confusão junto com qualquer um dos sinais anteriores."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Ante una caída, no mover a la persona ni intentar levantarla en soledad: pedir ayuda primero.",
        "Llamar al servicio de emergencias si hay golpe en la cabeza, sangrado, dolor intenso o pérdida de conocimiento.",
        "Acompañar y no dejar sola a la persona, explicando qué se va a hacer antes de cada paso.",
        "Despejar el paso y acercar el bastón, las muletas o la silla, sin colocar ni retirar la prótesis.",
        "Anotar la hora, qué se observó en la zona de apoyo y cómo ocurrió el episodio.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó."
      ],
      "en": [
        "After a fall, do not move the person or try to lift them alone: ask for help first.",
        "Call the emergency service if there is a head injury, bleeding, severe pain, or loss of consciousness.",
        "Stay alongside and do not leave the person alone, explaining what will be done before each step.",
        "Clear the walkway and bring the cane, crutches, or chair closer, without fitting or removing the prosthesis.",
        "Note the time, what was observed on the weight bearing area, and how the episode happened.",
        "Notify the Provider and the Family, and leave a written record of what happened."
      ],
      "pt-BR": [
        "Diante de uma queda, não mover a pessoa nem tentar levantá-la sozinho: pedir ajuda primeiro.",
        "Ligar para o serviço de emergência se houver batida na cabeça, sangramento, dor intensa ou perda de consciência.",
        "Acompanhar e não deixar a pessoa sozinha, explicando o que será feito antes de cada passo.",
        "Liberar a passagem e aproximar a bengala, as muletas ou a cadeira, sem colocar nem retirar a prótese.",
        "Anotar a hora, o que se observou na região de apoio e como ocorreu o episódio.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu."
      ]
    }
  },
  "anticoagulados": {
    "descripcion": {
      "es-AR": "Un Paciente anticoagulado recibe un tratamiento indicado por su médico para que la sangre coagule más despacio y no se formen tapones dentro de los vasos. Ese mismo efecto hace que sangre con más facilidad y que tarde más en parar de sangrar. Por eso un corte chico, un moretón o un golpe pueden tener más importancia que en otra persona.",
      "en": "A patient on anticoagulants receives a doctor-prescribed treatment that makes the blood clot more slowly, so that clots do not form inside the blood vessels. That same effect means the person bleeds more easily and takes longer to stop bleeding. For this reason a small cut, a bruise or a knock can matter far more than it would in someone else.",
      "pt-BR": "Um Paciente anticoagulado recebe um tratamento indicado pelo médico para que o sangue coagule mais devagar e não se formem coágulos dentro dos vasos. Esse mesmo efeito faz com que a pessoa sangre com mais facilidade e demore mais para parar de sangrar. Por isso um corte pequeno, um roxo ou uma batida podem ter muito mais importância do que em outra pessoa."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suelen verse moretones que aparecen sin que nadie recuerde un golpe, sobre todo en brazos y piernas. Es frecuente que las encías sangren un poco al cepillarse los dientes y que un corte al afeitarse tarde bastante en cerrar. Muchos Pacientes tienen controles de sangre periódicos y turnos que conviene no perder. La prevención de caídas ocupa buena parte del trabajo del Asistente: alfombras sueltas, pisos mojados, cables cruzados y baños sin agarraderas son los puntos que más pesan. Conviene revisar la casa con esa mirada desde el primer día y avisar a la Familia lo que haga falta corregir.",
      "en": "At home it is common to see bruises that appear with no one remembering a knock, especially on the arms and legs. The gums often bleed a little during tooth brushing, and a shaving cut can take a long time to close. Many patients have regular blood tests and appointments that should not be missed. Fall prevention takes up a good part of the assistant's work: loose rugs, wet floors, trailing cables and bathrooms without grab bars are the points that matter most. It is worth walking through the home with that eye from day one and telling the family what needs fixing.",
      "pt-BR": "No domicílio costumam aparecer roxos sem que ninguém se lembre de uma batida, principalmente nos braços e nas pernas. É comum que as gengivas sangrem um pouco ao escovar os dentes e que um corte ao se barbear demore bastante para fechar. Muitos Pacientes fazem exames de sangue periódicos e têm consultas que não convém perder. A prevenção de quedas ocupa boa parte do trabalho do Assistente: tapetes soltos, piso molhado, fios atravessados e banheiros sem barras de apoio são os pontos que mais pesam. Vale percorrer a casa com esse olhar desde o primeiro dia e avisar a Família o que precisa ser corrigido."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Sangrado por la nariz o por las encías que no se detiene después de varios minutos de presión.",
        "Un corte o una herida que sigue sangrando aunque se haya mantenido la presión.",
        "Moretones grandes, muy numerosos o que crecen rápido, sobre todo si aparecen solos.",
        "Orina de color rosado, rojo o amarronado, o materia fecal negra como el alquitrán.",
        "Vómito con sangre o con aspecto de borra de café.",
        "Cualquier golpe en la cabeza, aunque no se vea nada y la persona diga que está bien.",
        "Dolor de cabeza fuerte, confusión, somnolencia inusual, mareo o debilidad de un lado del cuerpo."
      ],
      "en": [
        "Bleeding from the nose or gums that does not stop after several minutes of pressure.",
        "A cut or wound that keeps bleeding even after pressure has been held on it.",
        "Bruises that are large, very numerous or growing fast, especially if they appear on their own.",
        "Urine that looks pink, red or brownish, or stools that are black and tarry.",
        "Vomit containing blood or looking like coffee grounds.",
        "Any blow to the head, even if nothing shows and the person says they are fine.",
        "Severe headache, confusion, unusual drowsiness, dizziness or weakness on one side of the body."
      ],
      "pt-BR": [
        "Sangramento pelo nariz ou pela gengiva que não para depois de vários minutos de pressão.",
        "Um corte ou ferida que continua sangrando mesmo com a pressão mantida.",
        "Roxos grandes, muito numerosos ou que crescem rápido, principalmente se aparecem sozinhos.",
        "Urina de cor rosada, vermelha ou amarronzada, ou fezes pretas como piche.",
        "Vômito com sangue ou com aspecto de borra de café.",
        "Qualquer batida na cabeça, mesmo que nada apareça e a pessoa diga que está bem.",
        "Dor de cabeça forte, confusão, sonolência fora do comum, tontura ou fraqueza de um lado do corpo."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Mantener la calma y anotar la hora en que empezó lo que se observa.",
        "Si hay una herida que sangra, presionar sobre ella con un paño limpio, de forma sostenida y sin levantarlo para mirar.",
        "No mover a la persona si pudo haberse lastimado en una caída, y no dejarla sola en ningún momento.",
        "Llamar al servicio de emergencias ante un golpe en la cabeza, un sangrado que no se detiene o cualquier cambio en la forma de estar o de responder.",
        "Avisar a la Prestadora y a la Familia, e informar que se trata de una persona anticoagulada.",
        "Dejar registrado qué pasó, a qué hora, qué se observó y qué se hizo."
      ],
      "en": [
        "Stay calm and note the time when whatever is being observed started.",
        "If a wound is bleeding, press on it with a clean cloth, steadily and without lifting it to look.",
        "Do not move the person if they may have been injured in a fall, and do not leave them alone at any point.",
        "Call the emergency service for any blow to the head, any bleeding that will not stop, or any change in how the person seems or responds.",
        "Notify the provider and the family, and state that this person is on anticoagulants.",
        "Record what happened, at what time, what was observed and what was done."
      ],
      "pt-BR": [
        "Manter a calma e anotar a hora em que começou o que está sendo observado.",
        "Se houver ferida sangrando, pressionar sobre ela com um pano limpo, de forma contínua e sem levantar para olhar.",
        "Não mover a pessoa se ela puder ter se machucado em uma queda, e não deixá-la sozinha em nenhum momento.",
        "Ligar para o serviço de emergência diante de uma batida na cabeça, de um sangramento que não para ou de qualquer mudança no jeito de estar ou de responder.",
        "Avisar a Prestadora e a Família, e informar que se trata de uma pessoa anticoagulada.",
        "Deixar registrado o que aconteceu, a que horas, o que foi observado e o que foi feito."
      ]
    }
  },
  "arritmias": {
    "descripcion": {
      "es-AR": "Una arritmia es una alteración del ritmo con que late el corazón: puede latir más rápido, más lento o de forma irregular. Algunas arritmias se sienten apenas y otras provocan mareos, cansancio o desmayos. Muchas personas conviven con una arritmia controlada durante años y llevan una vida normal, con controles médicos periódicos.",
      "en": "An arrhythmia is a disturbance in the rhythm of the heartbeat: the heart may beat faster, slower or irregularly. Some arrhythmias are barely noticed, while others cause dizziness, tiredness or fainting. Many people live with a controlled arrhythmia for years and lead an ordinary life, with regular medical check-ups.",
      "pt-BR": "Uma arritmia é uma alteração no ritmo das batidas do coração: ele pode bater mais rápido, mais devagar ou de forma irregular. Algumas arritmias quase não são sentidas e outras provocam tontura, cansaço ou desmaio. Muitas pessoas convivem por anos com uma arritmia controlada e levam uma vida normal, com acompanhamento médico periódico."
    },
    "que_esperar": {
      "es-AR": "En la convivencia diaria suele escucharse al Paciente decir que siente el corazón acelerado, que le da un vuelco o que le salta un latido. Es frecuente que se canse antes de lo esperado al caminar, al subir escaleras o al bañarse, y que necesite descansos en el medio de tareas simples. Algunos Pacientes tienen un dispositivo colocado bajo la piel del pecho y una tarjeta o informe que lo identifica: conviene saber dónde está guardada esa documentación. Otros usan un aparato para medir la presión o el pulso en casa, con la frecuencia que su médico indicó. Vale la pena registrar cada episodio con la hora y con lo que la persona estaba haciendo, porque ese dato le sirve al médico en el próximo control.",
      "en": "In everyday care the patient often says that their heart is racing, that it skipped a beat or that it fluttered. They may tire sooner than expected when walking, climbing stairs or bathing, and may need rests in the middle of simple tasks. Some patients have a device implanted under the skin of the chest and a card or report identifying it: it helps to know where that paperwork is kept. Others use a home monitor for blood pressure or pulse, as often as their doctor indicated. It is worth recording each episode with the time and with what the person was doing, because that detail helps the doctor at the next appointment.",
      "pt-BR": "Na convivência diária é comum ouvir o Paciente dizer que sente o coração acelerado, que ele dá um pulo ou que falha uma batida. É frequente que se canse antes do esperado ao caminhar, ao subir escadas ou ao tomar banho, e que precise de pausas no meio de tarefas simples. Alguns Pacientes têm um dispositivo colocado sob a pele do peito e um cartão ou laudo que o identifica: convém saber onde essa documentação está guardada. Outros usam um aparelho para medir a pressão ou o pulso em casa, com a frequência indicada pelo médico. Vale registrar cada episódio com a hora e com o que a pessoa estava fazendo, porque esse dado ajuda o médico na próxima consulta."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Desmayo, o sensación de que se va a perder el conocimiento al pararse o al caminar.",
        "Latidos muy rápidos o muy lentos que no ceden después de varios minutos de reposo.",
        "Dolor, presión o peso en el pecho junto con el cambio de ritmo.",
        "Falta de aire que aparece de golpe o que no deja hablar de corrido.",
        "Mareo persistente, confusión o dificultad para mantenerse en pie.",
        "Piel muy pálida, gris o azulada, sobre todo en labios y uñas.",
        "Hinchazón nueva en pies, tobillos o piernas, o un aumento rápido de peso en pocos días."
      ],
      "en": [
        "Fainting, or the feeling of being about to black out when standing up or walking.",
        "A very fast or very slow heartbeat that does not settle after several minutes of rest.",
        "Chest pain, pressure or heaviness together with the change in rhythm.",
        "Shortness of breath that comes on suddenly or makes it hard to speak a full sentence.",
        "Persistent dizziness, confusion or difficulty staying on one's feet.",
        "Skin that is very pale, grey or bluish, especially on the lips and nails.",
        "New swelling in the feet, ankles or legs, or a rapid weight gain over a few days."
      ],
      "pt-BR": [
        "Desmaio, ou sensação de que vai perder a consciência ao levantar ou ao caminhar.",
        "Batimentos muito rápidos ou muito lentos que não melhoram após vários minutos de repouso.",
        "Dor, aperto ou peso no peito junto com a mudança de ritmo.",
        "Falta de ar que aparece de repente ou que não deixa falar uma frase inteira.",
        "Tontura persistente, confusão ou dificuldade para se manter em pé.",
        "Pele muito pálida, acinzentada ou azulada, principalmente nos lábios e nas unhas.",
        "Inchaço novo nos pés, tornozelos ou pernas, ou aumento rápido de peso em poucos dias."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Interrumpir lo que se esté haciendo y anotar la hora en que empezó el episodio.",
        "Acompañar a la persona a sentarse o recostarse donde esté más cómoda para respirar, sin forzar ninguna posición, y aflojar la ropa ajustada.",
        "No dejarla sola, hablarle con calma y observar si responde, si habla con normalidad y de qué color está su piel.",
        "Llamar al servicio de emergencias ante un desmayo, un dolor en el pecho, falta de aire o cualquier cambio en la forma de responder.",
        "Avisar a la Prestadora y a la Familia, y tener a mano la documentación del Paciente y la de su dispositivo si lo tiene.",
        "Dejar registrado qué se observó, a qué hora, cuánto duró y qué se hizo."
      ],
      "en": [
        "Stop whatever is being done and note the time the episode began.",
        "Help the person sit or lie down wherever breathing is most comfortable, without forcing any position, and loosen tight clothing.",
        "Do not leave them alone, speak calmly to them, and watch whether they respond, whether they speak normally, and what colour their skin is.",
        "Call the emergency service for fainting, chest pain, shortness of breath or any change in how the person responds.",
        "Notify the provider and the family, and keep the patient's paperwork and any device documentation at hand.",
        "Record what was observed, at what time, how long it lasted and what was done."
      ],
      "pt-BR": [
        "Interromper o que estiver sendo feito e anotar a hora em que o episódio começou.",
        "Acompanhar a pessoa até sentar ou deitar onde estiver mais confortável para respirar, sem forçar nenhuma posição, e afrouxar a roupa apertada.",
        "Não deixá-la sozinha, falar com calma e observar se responde, se fala normalmente e qual é a cor da pele.",
        "Ligar para o serviço de emergência diante de desmaio, dor no peito, falta de ar ou qualquer mudança no jeito de responder.",
        "Avisar a Prestadora e a Família, e deixar à mão a documentação do Paciente e a do dispositivo, se houver.",
        "Deixar registrado o que foi observado, a que horas, quanto durou e o que foi feito."
      ]
    }
  },
  "ceguera": {
    "descripcion": {
      "es-AR": "La ceguera es la pérdida total o casi total de la visión, y puede ser de nacimiento o haber aparecido más tarde en la vida. Quien la tiene organiza su casa y su día con un orden propio, que reemplaza a la vista y funciona con precisión. Acompañar significa sostener ese orden y ofrecer información, no decidir por la persona ni adelantarse a sus movimientos.",
      "en": "Blindness is the total or near total loss of sight, present from birth or acquired later in life. A person who is blind organises their home and their day through a system of their own, which replaces sight and works with precision. Supporting them means preserving that system and offering information, not deciding for the person or getting ahead of their movements.",
      "pt-BR": "A cegueira é a perda total ou quase total da visão, que pode ser de nascimento ou ter surgido mais tarde na vida. Quem a tem organiza sua casa e seu dia com uma ordem própria, que substitui a visão e funciona com precisão. Acompanhar significa sustentar essa ordem e oferecer informação, não decidir pela pessoa nem antecipar-se aos seus movimentos."
    },
    "que_esperar": {
      "es-AR": "La casa está armada como un mapa: cada objeto tiene un lugar exacto, y ese lugar es lo que permite encontrarlo sin ayuda. Por eso la indicación central es que nadie mueva los objetos de lugar, y que si algo se corrió por necesidad se avise en el momento y se devuelva a su sitio. La persona puede orientarse con bastón, con un animal guía, con referencias táctiles o simplemente con la memoria del recorrido, y suele desplazarse por la casa con soltura. Conviene presentarse en voz alta al entrar a una habitación, avisar antes de salir, y describir lo que está ocurriendo alrededor sin exagerar el detalle. Para acompañar al caminar, se ofrece el brazo y se espera a que la persona lo tome, en lugar de empujar o tirar.",
      "en": "The home is laid out like a map: every object has an exact place, and that place is what makes it findable without help. So the central instruction is that no one moves objects around, and that if something had to be shifted it is announced at once and put back. The person may navigate with a cane, a guide animal, tactile markers, or simply the memory of the route, and usually moves around the home with ease. It helps to announce oneself aloud when entering a room, to say when leaving it, and to describe what is going on nearby without overloading the detail. To walk together, offer an arm and wait for the person to take it, rather than pushing or pulling.",
      "pt-BR": "A casa está montada como um mapa: cada objeto tem um lugar exato, e esse lugar é o que permite encontrá-lo sem ajuda. Por isso a orientação central é que ninguém mude os objetos de lugar, e que, se algo foi deslocado por necessidade, isso seja avisado na hora e devolvido ao seu lugar. A pessoa pode se orientar com bengala, com um animal-guia, com referências táteis ou simplesmente com a memória do percurso, e costuma circular pela casa com desenvoltura. Convém anunciar-se em voz alta ao entrar num cômodo, avisar antes de sair e descrever o que está acontecendo ao redor sem exagerar no detalhe. Para acompanhar ao caminhar, oferece-se o braço e espera-se que a pessoa o tome, em vez de empurrar ou puxar."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Objetos, muebles o alfombras corridos de su lugar habitual por cualquier motivo.",
        "Cables sueltos, líquido derramado, puertas entornadas u obstáculos nuevos en el recorrido.",
        "Tropiezos, golpes contra muebles o caídas que antes no ocurrían en esa casa.",
        "Dolor de ojos, secreción, enrojecimiento o hinchazón en párpados o alrededor del ojo.",
        "Cambio referido en lo poco que se percibía: luces, sombras o bultos que ya no se distinguen.",
        "Desorientación dentro de la propia casa, o dificultad nueva para reconocer voces conocidas.",
        "Bastón dañado, animal guía enfermo o ayuda técnica que dejó de funcionar."
      ],
      "en": [
        "Objects, furniture, or rugs shifted from their usual place for any reason.",
        "Loose cables, spilled liquid, half open doors, or new obstacles along the walking route.",
        "Stumbles, bumps against furniture, or falls that did not happen in that home before.",
        "Eye pain, discharge, redness, or swelling of the eyelids or around the eye.",
        "A reported change in whatever little was perceived: light, shadows, or shapes no longer distinguished.",
        "Disorientation inside the person's own home, or new difficulty recognising familiar voices.",
        "A damaged cane, an unwell guide animal, or an assistive device that stopped working."
      ],
      "pt-BR": [
        "Objetos, móveis ou tapetes deslocados do seu lugar habitual por qualquer motivo.",
        "Fios soltos, líquido derramado, portas entreabertas ou obstáculos novos no percurso.",
        "Tropeços, batidas em móveis ou quedas que antes não aconteciam naquela casa.",
        "Dor nos olhos, secreção, vermelhidão ou inchaço nas pálpebras ou ao redor do olho.",
        "Mudança relatada no pouco que se percebia: luzes, sombras ou vultos que já não se distinguem.",
        "Desorientação dentro da própria casa, ou dificuldade nova para reconhecer vozes conhecidas.",
        "Bengala danificada, animal-guia doente ou recurso de apoio que deixou de funcionar."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Hablar de inmediato y decir quién está presente, para que la persona sepa que no está sola.",
        "Describir en voz alta lo que está pasando y lo que se va a hacer antes de cada paso.",
        "Llamar al servicio de emergencias si hay una caída con golpe, dolor de ojos intenso o pérdida de conocimiento.",
        "No mover a la persona si pudo haberse lastimado, y pedir ayuda antes de intentar levantarla.",
        "Despejar el paso y avisar en voz alta cada objeto que se haya corrido, para devolverlo después a su lugar.",
        "Avisar a la Prestadora y a la Familia, anotar la hora y dejar registrado qué pasó."
      ],
      "en": [
        "Speak up right away and say who is present, so the person knows they are not alone.",
        "Describe aloud what is happening and what is about to be done before each step.",
        "Call the emergency service if there is a fall with impact, severe eye pain, or loss of consciousness.",
        "Do not move the person if they may be injured, and ask for help before attempting to lift them.",
        "Clear the walkway and announce aloud every object that was shifted, so it can be put back afterwards.",
        "Notify the Provider and the Family, note the time, and leave a written record of what happened."
      ],
      "pt-BR": [
        "Falar de imediato e dizer quem está presente, para que a pessoa saiba que não está sozinha.",
        "Descrever em voz alta o que está acontecendo e o que será feito antes de cada passo.",
        "Ligar para o serviço de emergência se houver queda com batida, dor intensa nos olhos ou perda de consciência.",
        "Não mover a pessoa se ela pode ter se machucado, e pedir ajuda antes de tentar levantá-la.",
        "Liberar a passagem e avisar em voz alta cada objeto deslocado, para devolvê-lo depois ao seu lugar.",
        "Avisar a Prestadora e a Família, anotar a hora e deixar registrado o que aconteceu."
      ]
    }
  },
  "coronarias": {
    "descripcion": {
      "es-AR": "Las enfermedades coronarias afectan a las arterias que llevan sangre al propio corazón. Cuando esas arterias se estrechan, el corazón recibe menos sangre de la que necesita y eso puede sentirse como un dolor o una presión en el pecho, sobre todo con el esfuerzo. Muchas personas viven con esta condición durante años, con controles médicos y con una rutina adaptada a lo que su corazón tolera.",
      "en": "Coronary heart disease affects the arteries that carry blood to the heart itself. When those arteries narrow, the heart receives less blood than it needs, and that can feel like pain or pressure in the chest, especially during exertion. Many people live with this condition for years, with medical follow-up and a daily routine adapted to what their heart tolerates.",
      "pt-BR": "As doenças coronarianas afetam as artérias que levam sangue ao próprio coração. Quando essas artérias se estreitam, o coração recebe menos sangue do que precisa, e isso pode ser sentido como dor ou aperto no peito, principalmente durante o esforço. Muitas pessoas convivem anos com essa condição, com acompanhamento médico e uma rotina adaptada ao que o coração tolera."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se observa que el Paciente mide su esfuerzo: camina despacio, se detiene a mitad de una escalera o pide una pausa mientras se viste. Muchos ya conocen su propio límite y saben en qué momento del día se sienten mejor. Es frecuente que sigan un plan de comidas indicado por su médico y que tengan turnos de control que conviene ayudar a organizar. Algunos Pacientes tuvieron una internación o una cirugía y quedan con una cicatriz en el pecho o en una pierna, que se observa por si aparece enrojecimiento o secreción. Anotar cuánto puede caminar sin molestias y cómo cambia eso semana a semana le da información útil a la Prestadora y al médico.",
      "en": "At home the patient can be seen pacing their own effort: walking slowly, stopping halfway up the stairs, or asking for a pause while getting dressed. Many already know their own limit and which time of day they feel best. They often follow an eating plan set by their doctor and have follow-up appointments that are worth helping to organise. Some patients have had a hospital stay or surgery and are left with a scar on the chest or a leg, which should be checked for redness or discharge. Noting how far they can walk without discomfort, and how that changes week by week, gives useful information to the provider and the doctor.",
      "pt-BR": "No domicílio observa-se que o Paciente dosa o próprio esforço: caminha devagar, para no meio da escada ou pede uma pausa enquanto se veste. Muitos já conhecem o próprio limite e sabem em que momento do dia se sentem melhor. É comum que sigam um plano alimentar indicado pelo médico e que tenham consultas de acompanhamento que vale ajudar a organizar. Alguns Pacientes passaram por internação ou cirurgia e ficam com uma cicatriz no peito ou na perna, que se observa caso apareça vermelhidão ou secreção. Anotar quanto conseguem caminhar sem desconforto e como isso muda de semana a semana dá informação útil à Prestadora e ao médico."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Dolor, presión, ardor o peso en el centro del pecho que dura más de unos minutos o que vuelve.",
        "Dolor que se corre hacia el brazo izquierdo, el cuello, la mandíbula, la espalda o la boca del estómago.",
        "Falta de aire en reposo, o mucho más marcada que otros días con el mismo esfuerzo.",
        "Sudor frío, palidez, náuseas o vómitos junto con el malestar en el pecho.",
        "Molestia en el pecho que aparece estando quieto, sin haber hecho ningún esfuerzo.",
        "Cansancio nuevo y muy marcado que impide las tareas habituales del día.",
        "Hinchazón creciente en piernas o tobillos, o necesidad de dormir con más almohadas para respirar."
      ],
      "en": [
        "Pain, pressure, burning or heaviness in the centre of the chest lasting more than a few minutes, or coming back.",
        "Pain spreading to the left arm, the neck, the jaw, the back or the upper stomach.",
        "Shortness of breath at rest, or far worse than on other days with the same effort.",
        "Cold sweat, pallor, nausea or vomiting together with the chest discomfort.",
        "Chest discomfort that appears while sitting still, with no effort at all.",
        "New and marked exhaustion that prevents the usual activities of the day.",
        "Increasing swelling in the legs or ankles, or needing more pillows to breathe while sleeping."
      ],
      "pt-BR": [
        "Dor, aperto, queimação ou peso no meio do peito que dura mais de alguns minutos ou que volta.",
        "Dor que se espalha para o braço esquerdo, o pescoço, a mandíbula, as costas ou a boca do estômago.",
        "Falta de ar em repouso, ou muito mais forte do que em outros dias com o mesmo esforço.",
        "Suor frio, palidez, náusea ou vômito junto com o desconforto no peito.",
        "Desconforto no peito que aparece em repouso, sem nenhum esforço.",
        "Cansaço novo e muito intenso que impede as tarefas habituais do dia.",
        "Inchaço crescente nas pernas ou tornozelos, ou necessidade de dormir com mais travesseiros para respirar."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Detener toda actividad de inmediato y anotar la hora exacta en que empezó el dolor o la molestia.",
        "Dejar a la persona sentada o recostada donde le resulte más cómodo respirar, sin forzarla a moverse, y aflojar la ropa ajustada.",
        "Llamar al servicio de emergencias sin esperar a ver si el dolor cede solo.",
        "Quedarse al lado, hablarle con calma y observar si responde, cómo respira y de qué color está su piel.",
        "Avisar a la Prestadora y a la Familia, y preparar la documentación del Paciente para quien llegue a asistir.",
        "Dejar registrado a qué hora empezó, dónde se ubicaba el dolor, cuánto duró y qué se hizo."
      ],
      "en": [
        "Stop all activity at once and note the exact time the pain or discomfort started.",
        "Let the person sit or lie wherever breathing is most comfortable, without forcing them to move, and loosen tight clothing.",
        "Call the emergency service without waiting to see whether the pain eases on its own.",
        "Stay beside them, speak calmly, and watch whether they respond, how they are breathing and what colour their skin is.",
        "Notify the provider and the family, and have the patient's paperwork ready for whoever arrives to help.",
        "Record what time it started, where the pain was, how long it lasted and what was done."
      ],
      "pt-BR": [
        "Interromper toda atividade imediatamente e anotar a hora exata em que a dor ou o desconforto começou.",
        "Deixar a pessoa sentada ou deitada onde for mais confortável para respirar, sem forçá-la a se mover, e afrouxar a roupa apertada.",
        "Ligar para o serviço de emergência sem esperar para ver se a dor passa sozinha.",
        "Ficar ao lado, falar com calma e observar se responde, como respira e qual é a cor da pele.",
        "Avisar a Prestadora e a Família, e preparar a documentação do Paciente para quem chegar para atender.",
        "Deixar registrado a que horas começou, onde a dor estava, quanto durou e o que foi feito."
      ]
    }
  },
  "deterioro_cognitivo": {
    "descripcion": {
      "es-AR": "El deterioro cognitivo es una pérdida de memoria, de atención o de claridad de pensamiento mayor que la esperable para la edad, que todavía permite manejarse en la vida diaria. Puede quedar estable durante años, mejorar cuando la causa se corrige, o avanzar hacia una demencia. Por eso importa observar los cambios y dejarlos registrados turno a turno.",
      "en": "Cognitive impairment is a loss of memory, attention or mental clarity greater than expected for the person's age, yet still mild enough to allow daily life to go on. It may stay stable for years, improve when its cause is corrected, or progress towards dementia. That is why changes need to be observed and recorded shift by shift.",
      "pt-BR": "O declínio cognitivo é uma perda de memória, de atenção ou de clareza de pensamento maior do que a esperada para a idade, que ainda permite dar conta da vida diária. Pode ficar estável por anos, melhorar quando a causa é corrigida ou evoluir para uma demência. Por isso importa observar as mudanças e deixá-las registradas turno a turno."
    },
    "que_esperar": {
      "es-AR": "Suele notarse que cuesta encontrar palabras comunes, que se pierde el hilo de una conversación o que se olvidan encargos y citas recientes. Las tareas con varios pasos, como cocinar algo conocido o manejar dinero, se vuelven lentas o quedan a medias. Es frecuente que la persona se dé cuenta de sus errores y se ponga irritable, triste o reservada. La autonomía se conserva en buena parte, así que el trabajo del Asistente pasa más por recordar y supervisar que por hacer en lugar del Paciente. El cansancio, el ruido y los cambios de ambiente empeoran el rendimiento de la jornada.",
      "en": "Common words become hard to find, the thread of a conversation gets lost, and recent errands and appointments slip away. Tasks with several steps, such as cooking a familiar dish or handling money, become slow or are left half done. The person often notices these mistakes and turns irritable, low or withdrawn. Much of the independence is preserved, so the Assistant's work is mostly about reminding and supervising rather than doing things in the Patient's place. Tiredness, noise and changes of surroundings make the day's performance worse.",
      "pt-BR": "Costuma-se notar dificuldade para encontrar palavras comuns, perda do fio da conversa e esquecimento de recados e compromissos recentes. Tarefas com vários passos, como preparar um prato conhecido ou lidar com dinheiro, ficam lentas ou pela metade. É frequente que a pessoa perceba os próprios erros e fique irritada, triste ou retraída. A autonomia se conserva em boa parte, de modo que o trabalho do Assistente é mais lembrar e supervisionar do que fazer no lugar do Paciente. O cansaço, o barulho e as mudanças de ambiente pioram o desempenho do dia."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Empeoramiento rápido de la memoria o de la claridad mental en pocos días.",
        "Confusión nueva sobre el lugar donde se está, la fecha o las personas cercanas.",
        "Desorientación al regresar a casa por un recorrido conocido de siempre.",
        "Cambio marcado del carácter: apatía profunda, desconfianza o enojo desmedido.",
        "Descuido nuevo de la higiene, de la comida o del estado de la vivienda.",
        "Caídas repetidas, o cualquier golpe en la cabeza.",
        "Expresiones de desesperanza o de no querer seguir viviendo."
      ],
      "en": [
        "Rapid worsening of memory or mental clarity over just a few days.",
        "New confusion about where the person is, what day it is, or who the people around are.",
        "Getting lost on the way home along a route travelled for years.",
        "A marked change in temperament: deep apathy, suspicion or disproportionate anger.",
        "New neglect of personal hygiene, of meals or of the state of the home.",
        "Repeated falls, or any blow to the head.",
        "Expressions of hopelessness or of not wanting to go on living."
      ],
      "pt-BR": [
        "Piora rápida da memória ou da clareza mental em poucos dias.",
        "Confusão nova sobre o lugar onde se está, a data ou as pessoas próximas.",
        "Desorientação ao voltar para casa por um trajeto conhecido de sempre.",
        "Mudança marcante do temperamento: apatia profunda, desconfiança ou raiva desproporcional.",
        "Descuido novo da higiene, da alimentação ou do estado da moradia.",
        "Quedas repetidas, ou qualquer batida na cabeça.",
        "Falas de desesperança ou de não querer continuar vivendo."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Quedarse junto al Paciente y hablarle con frases cortas y en tono tranquilo.",
        "Anotar la hora en que empezó el cambio y describir exactamente qué se observó.",
        "Retirar del alcance lo que pueda causar daño y despejar el paso.",
        "Llamar al servicio de emergencias y seguir la indicación de quien atienda.",
        "Avisar a la Prestadora y a la Familia.",
        "Dejar registrado el episodio completo antes de terminar el turno."
      ],
      "en": [
        "Stay beside the Patient and speak in short sentences and a calm tone.",
        "Write down the time the change began and describe exactly what was observed.",
        "Move anything that could cause harm out of reach and clear the way.",
        "Call the emergency service and follow the instructions given by the responder.",
        "Notify the Provider and the Family.",
        "Leave the whole episode recorded before the shift ends."
      ],
      "pt-BR": [
        "Permanecer junto ao Paciente e falar com frases curtas e em tom calmo.",
        "Anotar a hora em que a mudança começou e descrever exatamente o que foi observado.",
        "Retirar do alcance o que possa causar dano e liberar a passagem.",
        "Ligar para o serviço de emergência e seguir a orientação de quem atender.",
        "Avisar a Prestadora e a Família.",
        "Deixar o episódio inteiro registrado antes de encerrar o turno."
      ]
    }
  },
  "diabetes": {
    "descripcion": {
      "es-AR": "La diabetes es una condición en la que el azúcar de la sangre se mantiene más alto de lo que debería, porque el cuerpo no lo aprovecha bien. Se controla con el tratamiento y la alimentación que indicó un profesional, sostenidos todos los días. Tanto el azúcar muy alto como el muy bajo pueden causar malestar, y por eso se observa a la persona a lo largo de la jornada.",
      "en": "Diabetes is a condition in which the sugar in the blood stays higher than it should, because the body does not use it properly. It is kept under control with the treatment and the diet prescribed by a professional, followed every day. Both very high and very low sugar can cause distress, which is why the person is observed throughout the day.",
      "pt-BR": "A diabetes é uma condição em que o açúcar do sangue se mantém mais alto do que deveria, porque o corpo não o aproveita bem. É controlada com o tratamento e a alimentação indicados por um profissional, mantidos todos os dias. Tanto o açúcar muito alto quanto o muito baixo podem causar mal-estar, e por isso a pessoa é observada ao longo do dia."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele haber horarios establecidos de comidas y de tratamiento, indicados por un profesional, que conviene respetar tal como están escritos. Puede haber además controles ya indicados; si es así, se registra el resultado y se informa, sin tomar ninguna decisión a partir de ese número. Es frecuente que el Paciente tenga la piel seca, heridas que tardan en cerrar o menos sensibilidad en los pies, por lo que se los observa a diario y se avisa ante cualquier lastimadura. Sed intensa, orinar mucho, cansancio o visión borrosa suelen aparecer cuando el azúcar está alto, y temblor, sudor frío, palidez o confusión cuando está bajo. Cualquiera de esas dos situaciones se informa de inmediato.",
      "en": "In the home there are usually set times for meals and for treatment, prescribed by a professional, to be kept exactly as written. There may also be checks already prescribed; where that is the case, the result is recorded and reported, without any decision being taken from that number. Dry skin, wounds that are slow to close and less feeling in the feet are common, so the feet are looked at daily and any injury is reported. Intense thirst, passing a lot of urine, tiredness or blurred vision tend to appear when sugar is high, and trembling, cold sweat, pallor or confusion when it is low. Either of those two situations is reported immediately.",
      "pt-BR": "No domicílio, costuma haver horários definidos de refeições e de tratamento, indicados por um profissional, que convém respeitar exatamente como estão escritos. Também pode haver controles já indicados; nesse caso, registra-se o resultado e informa-se, sem tomar nenhuma decisão a partir desse número. É frequente que o Paciente tenha a pele seca, feridas que demoram a fechar ou menos sensibilidade nos pés, por isso eles são observados todos os dias e qualquer machucado é comunicado. Sede intensa, urinar muito, cansaço ou visão embaçada costumam aparecer quando o açúcar está alto, e tremor, suor frio, palidez ou confusão quando está baixo. Qualquer uma dessas duas situações é informada de imediato."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Sudor frío, temblor, palidez o mareo que aparecen de golpe.",
        "Confusión, habla enredada, conducta extraña o dificultad para despertarse.",
        "Sed intensa, orinar mucho más de lo habitual y cansancio marcado.",
        "Aliento con olor dulce o afrutado, respiración rápida y profunda, náuseas o vómitos.",
        "Heridas, ampollas o zonas enrojecidas en los pies, sobre todo si no duelen.",
        "Una herida que no cierra, supura o tiene mal olor.",
        "Comidas salteadas o rechazo del alimento durante la jornada."
      ],
      "en": [
        "Cold sweat, trembling, pallor or dizziness coming on suddenly.",
        "Confusion, slurred speech, odd behaviour or difficulty waking up.",
        "Intense thirst, passing much more urine than usual and marked tiredness.",
        "Sweet or fruity smelling breath, fast and deep breathing, nausea or vomiting.",
        "Wounds, blisters or reddened areas on the feet, especially painless ones.",
        "A wound that does not close, oozes or smells bad.",
        "Meals skipped or food refused during the day."
      ],
      "pt-BR": [
        "Suor frio, tremor, palidez ou tontura que aparecem de repente.",
        "Confusão, fala arrastada, comportamento estranho ou dificuldade para acordar.",
        "Sede intensa, urinar muito mais do que o habitual e cansaço marcante.",
        "Hálito com cheiro doce ou de fruta, respiração rápida e profunda, náuseas ou vômitos.",
        "Feridas, bolhas ou áreas avermelhadas nos pés, sobretudo se não doem.",
        "Uma ferida que não fecha, tem secreção ou mau cheiro.",
        "Refeições puladas ou recusa do alimento ao longo do dia."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Llamar de inmediato al servicio de emergencias si la persona está confundida, no responde bien o tiene convulsiones.",
        "No ofrecer alimentos, bebidas, azúcar ni ninguna sustancia por decisión propia: seguir sólo la indicación de quien atienda.",
        "Acompañar sin dejar sola a la persona, observando cómo respira y si responde al llamado.",
        "Anotar la hora en que empezó el malestar y qué se observó, junto con cualquier control ya indicado que se haya registrado.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y qué indicación se recibió."
      ],
      "en": [
        "Call the emergency service immediately if the person is confused, does not respond properly or has seizures.",
        "Do not offer food, drink, sugar or any substance on own initiative: follow only the instruction of whoever attends.",
        "Stay alongside without leaving the person alone, watching the breathing and whether there is a response when called.",
        "Note the time the distress began and what was observed, together with any already prescribed check that was recorded.",
        "Notify the Provider and the Family, and leave a written record of what happened and what instruction was received."
      ],
      "pt-BR": [
        "Chamar imediatamente o serviço de emergência se a pessoa estiver confusa, não responder bem ou tiver convulsões.",
        "Não oferecer alimentos, bebidas, açúcar nem nenhuma substância por decisão própria: seguir apenas a indicação de quem atender.",
        "Acompanhar sem deixar a pessoa sozinha, observando como respira e se responde ao chamado.",
        "Anotar a hora em que o mal-estar começou e o que foi observado, junto com qualquer controle já indicado que tenha sido registrado.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu e qual indicação foi recebida."
      ]
    }
  },
  "epilepsia": {
    "descripcion": {
      "es-AR": "La epilepsia es una condición del cerebro en la que, cada tanto, la actividad eléctrica se desordena y produce una crisis o convulsión. Durante esa crisis la persona puede perder el conocimiento, ponerse rígida o tener movimientos que no controla. Entre una crisis y otra, la mayoría de las personas hace una vida común.",
      "en": "Epilepsy is a condition of the brain in which, from time to time, electrical activity becomes disordered and produces a seizure. During a seizure the person may lose consciousness, become stiff or make movements they cannot control. Between one seizure and the next, most people lead an ordinary life.",
      "pt-BR": "A epilepsia é uma condição do cérebro em que, de tempos em tempos, a atividade elétrica se desorganiza e provoca uma crise ou convulsão. Durante a crise, a pessoa pode perder a consciência, ficar rígida ou apresentar movimentos que não consegue controlar. Entre uma crise e outra, a maioria das pessoas leva uma vida comum."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele encontrarse un Paciente que hace su vida habitual y que tiene un tratamiento ya indicado por un profesional, con horarios fijos. La Familia suele conocer cómo empiezan las crisis y qué las desencadena, por ejemplo dormir poco, las luces intermitentes o el estrés. Puede haber señales previas, como un olor raro, un malestar en el estómago o una sensación difícil de explicar. Después de una crisis es habitual un período de confusión, sueño o cansancio que dura un rato. Conviene mantener despejados los lugares de paso y saber de antemano a quién se avisa.",
      "en": "In the home, the Patient usually follows an ordinary routine and has a treatment already prescribed by a professional, at fixed times. The Family often knows how seizures begin and what tends to set them off, such as too little sleep, flickering lights or stress. There may be early signs, such as an odd smell, an uneasy feeling in the stomach or a sensation that is hard to describe. After a seizure, a period of confusion, sleepiness or tiredness lasting a while is common. It helps to keep walkways clear and to know in advance who is to be notified.",
      "pt-BR": "No domicílio, costuma-se encontrar um Paciente com a vida habitual em andamento e com um tratamento já indicado por um profissional, em horários fixos. A Família em geral sabe como as crises começam e o que costuma desencadeá-las, como dormir pouco, luzes piscantes ou estresse. Pode haver sinais prévios, como um cheiro estranho, um mal-estar no estômago ou uma sensação difícil de explicar. Depois de uma crise, é comum um período de confusão, sono ou cansaço que dura algum tempo. Convém manter livres os espaços de passagem e saber de antemão quem deve ser avisado."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Una crisis que dura más de cinco minutos.",
        "Dos o más crisis seguidas sin que la persona recupere el conocimiento entre una y otra.",
        "Dificultad para respirar, o labios y cara azulados durante o después de la crisis.",
        "Un golpe en la cabeza, un corte o cualquier lesión ocurrida durante la crisis.",
        "Confusión que no cede después de un rato largo, o falta de respuesta al llamado.",
        "Una primera crisis en alguien que nunca había tenido, o una crisis distinta de las habituales."
      ],
      "en": [
        "A seizure lasting more than five minutes.",
        "Two or more seizures in a row without the person regaining consciousness in between.",
        "Difficulty breathing, or bluish lips and face during or after the seizure.",
        "A blow to the head, a cut or any injury that happened during the seizure.",
        "Confusion that does not clear after a long while, or no response when called.",
        "A first seizure in someone who never had one, or a seizure unlike the usual ones."
      ],
      "pt-BR": [
        "Uma crise que dura mais de cinco minutos.",
        "Duas ou mais crises seguidas sem que a pessoa recupere a consciência entre elas.",
        "Dificuldade para respirar, ou lábios e rosto arroxeados durante ou depois da crise.",
        "Uma pancada na cabeça, um corte ou qualquer lesão ocorrida durante a crise.",
        "Confusão que não passa depois de um bom tempo, ou ausência de resposta ao chamado.",
        "Uma primeira crise em quem nunca teve, ou uma crise diferente das habituais."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Anotar la hora exacta en que empieza la crisis y medir cuánto dura.",
        "Apartar los objetos duros o filosos que estén cerca y proteger la cabeza con algo blando.",
        "No sujetar a la persona ni intentar frenar los movimientos, y no introducir nada en la boca.",
        "Llamar al servicio de emergencias si la crisis pasa los cinco minutos, si se repite o si hay dificultad para respirar.",
        "Acompañar hasta que recupere el conocimiento por completo, sin dejarla sola.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó, a qué hora y cuánto duró."
      ],
      "en": [
        "Note the exact time the seizure starts and time how long it lasts.",
        "Move hard or sharp objects out of the way and cushion the head with something soft.",
        "Do not hold the person down or try to stop the movements, and do not put anything in the mouth.",
        "Call the emergency service if the seizure goes past five minutes, if it happens again or if there is difficulty breathing.",
        "Stay alongside until consciousness is fully regained, never leaving the person alone.",
        "Notify the Provider and the Family, and leave a written record of what happened, at what time and how long it lasted."
      ],
      "pt-BR": [
        "Anotar a hora exata em que a crise começa e medir quanto tempo dura.",
        "Afastar os objetos duros ou cortantes que estejam por perto e proteger a cabeça com algo macio.",
        "Não segurar a pessoa nem tentar conter os movimentos, e não colocar nada na boca.",
        "Chamar o serviço de emergência se a crise passar de cinco minutos, se voltar a ocorrer ou se houver dificuldade para respirar.",
        "Acompanhar até a recuperação completa da consciência, sem deixar a pessoa sozinha.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu, a que horas e quanto durou."
      ]
    }
  },
  "epoc": {
    "descripcion": {
      "es-AR": "La EPOC es una enfermedad crónica de los pulmones que estrecha las vías por donde pasa el aire y hace que cueste más sacarlo al espirar. La consecuencia diaria es falta de aire, tos y expectoración, que empeoran con el esfuerzo y con el frío, el humo o el aire cargado. Es una condición que se acompaña durante años y que tiene períodos estables y períodos de agravamiento.",
      "en": "COPD is a long-term lung disease that narrows the airways and makes it harder to push air out when breathing. Day to day this means shortness of breath, coughing and phlegm, all of which worsen with exertion and with cold, smoke or stale air. It is a condition managed over many years, with stable periods and periods of flare-up.",
      "pt-BR": "A DPOC é uma doença crônica dos pulmões que estreita as vias por onde passa o ar e faz com que custe mais expulsá-lo ao expirar. A consequência no dia a dia é falta de ar, tosse e catarro, que pioram com o esforço e com o frio, a fumaça ou o ar carregado. É uma condição acompanhada por anos, com períodos estáveis e períodos de piora."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se nota que el Paciente organiza el día alrededor de la respiración: hace las cosas de a poco, descansa entre una tarea y otra y suele estar peor a la mañana temprano. La tos con expectoración es habitual y conviene observar el color y la cantidad, porque un cambio ahí es un dato importante. Muchos duermen semisentados o con varias almohadas, y evitan el humo, los aerosoles y los productos de limpieza fuertes. Algunos tienen oxígeno indicado por su médico, con equipos y tubos en la casa: el Asistente verifica que el equipo esté encendido y funcionando como fue indicado, mantiene los cables y las mangueras despejados y avisa ante cualquier falla, sin modificar ningún ajuste. Ventilar los ambientes y mantener una temperatura pareja ayuda bastante en el día a día.",
      "en": "At home the patient clearly organises the day around breathing: doing things in small stages, resting between tasks, and often being at their worst early in the morning. A cough with phlegm is usual, and it is worth watching its colour and amount, because a change there is important information. Many sleep half-sitting or propped on several pillows, and avoid smoke, aerosols and strong cleaning products. Some have oxygen prescribed by their doctor, with equipment and tubing in the home: the assistant checks that the equipment is on and working as prescribed, keeps cables and tubing clear, and reports any fault, without altering any setting. Airing the rooms and keeping an even temperature helps a great deal day to day.",
      "pt-BR": "No domicílio percebe-se que o Paciente organiza o dia em torno da respiração: faz as coisas aos poucos, descansa entre uma tarefa e outra e costuma estar pior de manhã cedo. A tosse com catarro é habitual e convém observar a cor e a quantidade, porque uma mudança nisso é um dado importante. Muitos dormem semissentados ou com vários travesseiros, e evitam fumaça, aerossóis e produtos de limpeza fortes. Alguns têm oxigênio indicado pelo médico, com equipamentos e mangueiras em casa: o Assistente verifica que o equipamento esteja ligado e funcionando como foi indicado, mantém fios e mangueiras livres e avisa diante de qualquer falha, sem alterar nenhum ajuste. Arejar os ambientes e manter uma temperatura estável ajuda bastante no dia a dia."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Falta de aire mucho mayor que la habitual, o que aparece estando en reposo.",
        "Dificultad para completar una oración sin detenerse a tomar aire.",
        "Labios, uñas o cara con tono azulado o grisáceo.",
        "Respiración muy rápida, ruidosa o con hundimiento visible entre las costillas o en el cuello.",
        "Expectoración que cambia de color, se vuelve espesa, aumenta mucho o aparece con sangre.",
        "Confusión, somnolencia inusual, agitación o dificultad para despertarse.",
        "Fiebre, o hinchazón nueva en tobillos y piernas junto con más falta de aire."
      ],
      "en": [
        "Shortness of breath much greater than usual, or appearing while at rest.",
        "Difficulty finishing a sentence without stopping to take a breath.",
        "Lips, nails or face turning bluish or greyish.",
        "Very fast or noisy breathing, or visible pulling in between the ribs or at the neck.",
        "Phlegm that changes colour, becomes thick, increases sharply or appears with blood.",
        "Confusion, unusual drowsiness, agitation or difficulty waking up.",
        "Fever, or new swelling in the ankles and legs together with more breathlessness."
      ],
      "pt-BR": [
        "Falta de ar muito maior que a habitual, ou que aparece em repouso.",
        "Dificuldade para completar uma frase sem parar para respirar.",
        "Lábios, unhas ou rosto com tom azulado ou acinzentado.",
        "Respiração muito rápida, ruidosa ou com afundamento visível entre as costelas ou no pescoço.",
        "Catarro que muda de cor, fica espesso, aumenta muito ou aparece com sangue.",
        "Confusão, sonolência fora do comum, agitação ou dificuldade para acordar.",
        "Febre, ou inchaço novo nos tornozelos e pernas junto com mais falta de ar."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Anotar la hora en que empezó la dificultad y suspender cualquier esfuerzo o traslado.",
        "Dejar a la persona en la posición en la que respire con menos esfuerzo, habitualmente sentada e inclinada hacia adelante, sin forzarla, y aflojar la ropa ajustada.",
        "Ventilar el ambiente, alejar humo o aerosoles y, si tiene oxígeno indicado, verificar que el equipo esté funcionando como fue indicado, sin modificar ningún ajuste.",
        "Llamar al servicio de emergencias ante labios azulados, confusión, somnolencia o falta de aire que no mejora en reposo.",
        "Quedarse al lado, sin dejarla sola, hablando poco y con calma, y observando cómo respira y cómo responde.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó, a qué hora y qué se hizo."
      ],
      "en": [
        "Note the time the difficulty began and stop any exertion or moving about.",
        "Let the person stay in whatever position takes the least effort to breathe, usually sitting and leaning forward, without forcing them, and loosen tight clothing.",
        "Air the room, keep smoke and aerosols away and, if oxygen has been prescribed, check that the equipment is working as prescribed, without altering any setting.",
        "Call the emergency service for bluish lips, confusion, drowsiness or breathlessness that does not ease with rest.",
        "Stay beside them without leaving them alone, speaking little and calmly, and watching how they breathe and how they respond.",
        "Notify the provider and the family, and record what happened, at what time and what was done."
      ],
      "pt-BR": [
        "Anotar a hora em que a dificuldade começou e interromper qualquer esforço ou deslocamento.",
        "Deixar a pessoa na posição em que respire com menos esforço, normalmente sentada e inclinada para a frente, sem forçá-la, e afrouxar a roupa apertada.",
        "Arejar o ambiente, afastar fumaça ou aerossóis e, se houver oxigênio indicado, verificar que o equipamento esteja funcionando como foi indicado, sem alterar nenhum ajuste.",
        "Ligar para o serviço de emergência diante de lábios azulados, confusão, sonolência ou falta de ar que não melhora em repouso.",
        "Ficar ao lado, sem deixá-la sozinha, falando pouco e com calma, observando como respira e como responde.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu, a que horas e o que foi feito."
      ]
    }
  },
  "hipertension": {
    "descripcion": {
      "es-AR": "La hipertensión es una presión arterial que se mantiene más alta de lo que debería, de manera sostenida en el tiempo. Casi siempre no se siente nada, y por eso se controla con el tratamiento y los hábitos que indicó un profesional. Cuando permanece alta durante mucho tiempo, puede dañar el corazón, el cerebro y los riñones.",
      "en": "Hypertension is blood pressure that stays higher than it should, steadily over time. Most of the time nothing is felt, which is why it is kept under control with the treatment and the habits prescribed by a professional. When it stays high for a long time, it can damage the heart, the brain and the kidneys.",
      "pt-BR": "A hipertensão é uma pressão arterial que se mantém mais alta do que deveria, de forma sustentada ao longo do tempo. Quase sempre não se sente nada, e por isso é controlada com o tratamento e os hábitos indicados por um profissional. Quando permanece alta durante muito tempo, pode danificar o coração, o cérebro e os rins."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele encontrarse un tratamiento ya indicado por un profesional, con horarios fijos, y a veces indicaciones sobre la sal, la actividad o el descanso. Muchos días el Paciente no siente ninguna molestia, y eso no significa que el problema haya desaparecido. Puede haber un control de presión ya indicado; si es así, se toma tal como está escrito, se registra el resultado con la hora y se informa, sin decidir nada a partir de ese número. Dolor de cabeza, zumbido en los oídos, mareo o hinchazón en los tobillos suelen ser motivo de aviso. Un valor alto nunca se presenta como algo esperable ni se deja pasar a ver si baja solo.",
      "en": "In the home there is usually a treatment already prescribed by a professional, at fixed times, and sometimes instructions about salt, activity or rest. On many days the Patient feels no discomfort at all, and that does not mean the problem has gone away. There may be a blood pressure check already prescribed; where that is the case, it is taken exactly as written, the result is recorded with the time and reported, without anything being decided from that number. Headache, ringing in the ears, dizziness or swollen ankles are reasons to report. A high reading is never presented as something to be expected, nor is it left aside to see whether it comes down on its own.",
      "pt-BR": "No domicílio, costuma-se encontrar um tratamento já indicado por um profissional, em horários fixos, e às vezes orientações sobre o sal, a atividade ou o descanso. Em muitos dias o Paciente não sente incômodo algum, e isso não significa que o problema tenha desaparecido. Pode haver um controle de pressão já indicado; nesse caso, ele é feito exatamente como está escrito, o resultado é registrado com a hora e informado, sem decidir nada a partir desse número. Dor de cabeça, zumbido nos ouvidos, tontura ou inchaço nos tornozelos costumam ser motivo de aviso. Um valor alto nunca é apresentado como algo esperado nem é deixado de lado para ver se baixa sozinho."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Dolor de cabeza intenso y repentino, distinto de los habituales.",
        "Dolor o presión en el pecho, que puede extenderse al brazo, al cuello o a la mandíbula.",
        "Falta de aire en reposo o ante un esfuerzo mínimo.",
        "Debilidad o adormecimiento de un lado del cuerpo, boca torcida o dificultad para hablar.",
        "Visión borrosa o doble, mareo intenso o pérdida del equilibrio.",
        "Sangrado por la nariz que no se detiene, o zumbido persistente en los oídos.",
        "Hinchazón de tobillos o piernas que aumenta de un día para otro."
      ],
      "en": [
        "A severe, sudden headache, unlike the usual ones.",
        "Pain or pressure in the chest, which may spread to the arm, the neck or the jaw.",
        "Shortness of breath at rest or on the slightest effort.",
        "Weakness or numbness on one side of the body, a drooping mouth or difficulty speaking.",
        "Blurred or double vision, severe dizziness or loss of balance.",
        "A nosebleed that does not stop, or persistent ringing in the ears.",
        "Swelling of the ankles or legs that increases from one day to the next."
      ],
      "pt-BR": [
        "Dor de cabeça intensa e repentina, diferente das habituais.",
        "Dor ou pressão no peito, que pode se estender ao braço, ao pescoço ou à mandíbula.",
        "Falta de ar em repouso ou diante de um esforço mínimo.",
        "Fraqueza ou dormência de um lado do corpo, boca torta ou dificuldade para falar.",
        "Visão embaçada ou dupla, tontura intensa ou perda do equilíbrio.",
        "Sangramento pelo nariz que não para, ou zumbido persistente nos ouvidos.",
        "Inchaço dos tornozelos ou das pernas que aumenta de um dia para o outro."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Llamar al servicio de emergencias ante dolor en el pecho, falta de aire, debilidad de un lado del cuerpo o dificultad para hablar.",
        "Anotar la hora exacta en que empezaron los síntomas, porque ese dato cambia la atención posterior.",
        "Ayudar a que la persona quede en reposo, semisentada y con ropa holgada, sin moverla más de lo necesario.",
        "No ofrecer alimentos, bebidas ni ninguna sustancia, y no repetir ni cambiar nada del tratamiento.",
        "Acompañar sin dejar sola a la persona, observando si responde y cómo respira; registrar el control de presión sólo si ya estaba indicado.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y qué indicación se recibió."
      ],
      "en": [
        "Call the emergency service for chest pain, shortness of breath, weakness on one side of the body or difficulty speaking.",
        "Note the exact time the symptoms began, since that detail changes the care that follows.",
        "Help the person rest, half-sitting and with loose clothing, moving them no more than necessary.",
        "Do not offer food, drink or any substance, and do not repeat or change anything in the treatment.",
        "Stay alongside without leaving the person alone, watching for a response and how the breathing goes; record the blood pressure check only if it was already prescribed.",
        "Notify the Provider and the Family, and leave a written record of what happened and what instruction was received."
      ],
      "pt-BR": [
        "Chamar o serviço de emergência diante de dor no peito, falta de ar, fraqueza de um lado do corpo ou dificuldade para falar.",
        "Anotar a hora exata em que os sintomas começaram, porque esse dado muda o atendimento posterior.",
        "Ajudar a pessoa a ficar em repouso, semissentada e com roupa folgada, sem movimentá-la mais do que o necessário.",
        "Não oferecer alimentos, bebidas nem nenhuma substância, e não repetir nem alterar nada do tratamento.",
        "Acompanhar sem deixar a pessoa sozinha, observando se responde e como respira; registrar o controle de pressão apenas se já estivesse indicado.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu e qual indicação foi recebida."
      ]
    }
  },
  "obesidad": {
    "descripcion": {
      "es-AR": "La obesidad es una condición de salud en la que el cuerpo acumula una cantidad de grasa que puede afectar el funcionamiento de las articulaciones, la respiración y la piel. No define a la persona ni dice nada sobre su voluntad ni sobre sus hábitos. Para el acompañamiento en el domicilio, lo que importa es cómo se mueve, cómo respira y cómo se cuida la piel.",
      "en": "Obesity is a health condition in which the body carries an amount of fat that can affect how the joints, the breathing, and the skin work. It does not define the person and says nothing about their willpower or their habits. For home support, what matters is how the person moves, how they breathe, and how the skin is cared for.",
      "pt-BR": "A obesidade é uma condição de saúde em que o corpo acumula uma quantidade de gordura que pode afetar o funcionamento das articulações, da respiração e da pele. Não define a pessoa nem diz nada sobre sua vontade ou seus hábitos. Para o acompanhamento no domicílio, o que importa é como a pessoa se movimenta, como respira e como se cuida da pele."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele haber cansancio al caminar distancias cortas, al subir escaleras o al levantarse de una silla baja. La respiración puede volverse más trabajosa al acostarse boca arriba, y por eso muchas personas descansan con la cabecera elevada o con varias almohadas. Es frecuente encontrar dolor en rodillas, caderas o zona lumbar, y movimientos más lentos al girar en la cama o al entrar y salir del baño. La piel de los pliegues necesita quedar seca y ventilada, porque la humedad la irrita con facilidad. Conviene revisar que el hogar tenga apoyos firmes, sillas resistentes y espacio libre de paso, y consultar a la Prestadora qué equipo de traslado está autorizado antes de moverlo.",
      "en": "At home there is often fatigue when walking short distances, climbing stairs, or rising from a low chair. Breathing may become harder when lying flat, which is why many people rest with the head of the bed raised or with several pillows. Pain in the knees, hips, or lower back is common, along with slower movement when turning in bed or getting in and out of the bathroom. Skin folds need to be kept dry and aired, because moisture irritates them easily. It is worth checking that the home has firm supports, sturdy chairs, and clear walkways, and asking the Provider which transfer equipment is approved before moving it.",
      "pt-BR": "No domicílio costuma haver cansaço ao caminhar distâncias curtas, ao subir escadas ou ao levantar-se de uma cadeira baixa. A respiração pode ficar mais difícil ao deitar de costas, e por isso muitas pessoas descansam com a cabeceira elevada ou com vários travesseiros. É frequente encontrar dor nos joelhos, nos quadris ou na região lombar, e movimentos mais lentos ao virar na cama ou ao entrar e sair do banheiro. A pele das dobras precisa ficar seca e ventilada, porque a umidade a irrita com facilidade. Convém verificar se a casa tem apoios firmes, cadeiras resistentes e passagem livre, e consultar a Prestadora sobre qual equipamento de transferência está autorizado antes de movê-lo."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Falta de aire en reposo, al hablar o al acostarse, que antes no aparecía.",
        "Labios o uñas de color azulado, o respiración ruidosa y muy trabajosa.",
        "Hinchazón nueva en piernas, tobillos o pies, sobre todo si es de un solo lado.",
        "Enrojecimiento, mal olor, grietas o heridas en los pliegues de la piel.",
        "Zonas de la piel rojas que no aclaran al dejar de apoyarlas, o ampollas por presión.",
        "Somnolencia marcada durante el día o ronquidos con pausas en la respiración de noche.",
        "Dolor articular que impide un movimiento que ayer se hacía sin ayuda."
      ],
      "en": [
        "Shortness of breath at rest, while speaking, or when lying down, that was not there before.",
        "Bluish lips or nails, or noisy and very laboured breathing.",
        "New swelling in the legs, ankles, or feet, especially on one side only.",
        "Redness, bad odour, cracking, or open sores in the skin folds.",
        "Reddened skin areas that do not fade once pressure is off, or pressure blisters.",
        "Marked daytime sleepiness, or snoring with pauses in breathing at night.",
        "Joint pain that blocks a movement the person managed unaided the day before."
      ],
      "pt-BR": [
        "Falta de ar em repouso, ao falar ou ao deitar, que antes não aparecia.",
        "Lábios ou unhas de cor azulada, ou respiração ruidosa e muito difícil.",
        "Inchaço novo nas pernas, nos tornozelos ou nos pés, sobretudo se for de um lado só.",
        "Vermelhidão, mau cheiro, rachaduras ou feridas nas dobras da pele.",
        "Áreas da pele avermelhadas que não clareiam ao tirar o apoio, ou bolhas por pressão.",
        "Sonolência marcada durante o dia ou roncos com pausas na respiração à noite.",
        "Dor articular que impede um movimento que ontem era feito sem ajuda."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Llamar al servicio de emergencias ante falta de aire intensa, dolor en el pecho o labios azulados.",
        "Acompañar y no dejar sola a la persona, respetando la posición en la que respira mejor.",
        "Pedir ayuda antes de intentar mover o levantar a la persona, y no forzar el traslado en soledad.",
        "Despejar el paso y abrir el acceso a la vivienda para que el servicio de emergencias entre sin demora.",
        "Anotar la hora en que empezó, qué se observó y qué se hizo.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado el episodio."
      ],
      "en": [
        "Call the emergency service for severe shortness of breath, chest pain, or bluish lips.",
        "Stay alongside and do not leave the person alone, respecting the position in which they breathe best.",
        "Ask for help before attempting to move or lift the person, and never force a transfer alone.",
        "Clear the walkways and open access to the home so the emergency service can enter without delay.",
        "Note the time it started, what was observed, and what was done.",
        "Notify the Provider and the Family, and leave a written record of the episode."
      ],
      "pt-BR": [
        "Ligar para o serviço de emergência diante de falta de ar intensa, dor no peito ou lábios azulados.",
        "Acompanhar e não deixar a pessoa sozinha, respeitando a posição em que ela respira melhor.",
        "Pedir ajuda antes de tentar mover ou levantar a pessoa, e não forçar a transferência sozinho.",
        "Liberar a passagem e abrir o acesso à residência para que o serviço de emergência entre sem demora.",
        "Anotar a hora em que começou, o que se observou e o que foi feito.",
        "Avisar a Prestadora e a Família, e deixar o episódio registrado."
      ]
    }
  },
  "oncologico": {
    "descripcion": {
      "es-AR": "Un Paciente oncológico es una persona en tratamiento por cáncer. El tratamiento actúa sobre la enfermedad, pero también baja las defensas del cuerpo y cambia el apetito, la fuerza y el ánimo, con días mejores y días peores. Por eso el cuidado se concentra en la higiene, en evitar el contacto con personas enfermas y en observar la fiebre, que en esta situación es una urgencia.",
      "en": "A cancer patient is a person undergoing treatment for cancer. The treatment acts on the illness, but it also lowers the body's defences and changes appetite, strength and mood, with better days and worse days. Care therefore focuses on hygiene, on avoiding contact with people who are ill, and on watching for fever, which in this situation is an emergency.",
      "pt-BR": "Um Paciente oncológico é uma pessoa em tratamento contra o câncer. O tratamento age sobre a doença, mas também baixa as defesas do corpo e altera o apetite, a força e o ânimo, com dias melhores e dias piores. Por isso o cuidado se concentra na higiene, em evitar o contato com pessoas doentes e em observar a febre, que nessa situação é uma urgência."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se nota que los días no son todos iguales: después de cada ciclo de tratamiento suele haber una etapa de más cansancio y menos apetito. Es frecuente encontrar náuseas, cambios en el gusto de la comida, caída del cabello, llagas en la boca y una fatiga que no se resuelve durmiendo. El lavado de manos, la limpieza de las superficies y la comida bien lavada y bien cocida son parte central de la jornada. Conviene mantener alejadas a las visitas que estén resfriadas o con cualquier cuadro contagioso, y avisar cuando alguien de la casa se enferma. El ánimo también cambia: hay días de silencio y días de conversación, y ambos se acompañan sin apurar a la persona.",
      "en": "In the home it becomes clear that no two days are alike: after each treatment cycle there is usually a stretch of greater tiredness and less appetite. Nausea, changes in how food tastes, hair loss, mouth sores and a fatigue that sleep does not fix are all common. Handwashing, cleaning surfaces and serving well-washed, well-cooked food are a central part of the day. Visitors with a cold or any contagious illness should be kept away, and it is worth reporting when someone in the household falls ill. Mood shifts too: there are quiet days and talkative days, and both are accompanied without rushing the person.",
      "pt-BR": "No domicílio percebe-se que os dias não são todos iguais: depois de cada ciclo de tratamento costuma haver um período de mais cansaço e menos apetite. É frequente encontrar náuseas, mudanças no sabor da comida, queda de cabelo, feridas na boca e um cansaço que não passa com o sono. A lavagem das mãos, a limpeza das superfícies e a comida bem lavada e bem cozida são parte central do dia. Convém manter afastadas as visitas que estejam resfriadas ou com qualquer quadro contagioso, e avisar quando alguém da casa adoece. O ânimo também muda: há dias de silêncio e dias de conversa, e os dois se acompanham sem apressar a pessoa."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Fiebre, aunque sea leve: en esta situación es una urgencia y se avisa siempre.",
        "Escalofríos, temblores o sudoración abundante.",
        "Sangrado que no se detiene, moretones nuevos sin golpe o pequeños puntos rojos en la piel.",
        "Llagas en la boca que impiden comer o beber, o dificultad para tragar.",
        "Vómitos o diarrea que se repiten, o falta de orina durante varias horas.",
        "Dificultad para respirar, dolor en el pecho o palpitaciones.",
        "Confusión, desorientación o una debilidad que impide sostenerse de pie."
      ],
      "en": [
        "Fever, even a mild one: in this situation it is an emergency and is always reported.",
        "Chills, shivering or heavy sweating.",
        "Bleeding that does not stop, new bruises without a knock, or small red dots on the skin.",
        "Mouth sores that prevent eating or drinking, or difficulty swallowing.",
        "Repeated vomiting or diarrhoea, or no urine for several hours.",
        "Difficulty breathing, chest pain or a racing heartbeat.",
        "Confusion, disorientation, or weakness that makes standing impossible."
      ],
      "pt-BR": [
        "Febre, mesmo que leve: nessa situação é uma urgência e sempre se avisa.",
        "Calafrios, tremores ou suor abundante.",
        "Sangramento que não para, hematomas novos sem pancada ou pequenos pontos vermelhos na pele.",
        "Feridas na boca que impedem comer ou beber, ou dificuldade para engolir.",
        "Vômitos ou diarreia repetidos, ou ausência de urina durante várias horas.",
        "Dificuldade para respirar, dor no peito ou palpitações.",
        "Confusão, desorientação ou uma fraqueza que impede ficar de pé."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Ante fiebre, llamar de inmediato al servicio de emergencias o al equipo tratante, según lo indicado en el domicilio.",
        "Acompañar al Paciente y no dejarlo solo.",
        "Anotar la hora, la temperatura y lo que se observó.",
        "Apartar del ambiente a cualquier persona con síntomas de contagio y ventilar el lugar.",
        "Buscar y respetar lo que el equipo tratante dejó indicado por escrito en el domicilio.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó."
      ],
      "en": [
        "If there is fever, call the emergency service or the treating team at once, as instructed in the home.",
        "Stay with the Patient and do not leave the person alone.",
        "Note the time, the temperature and what was observed.",
        "Keep anyone with signs of a contagious illness away from the room and air the space.",
        "Find and follow what the treating team left in writing in the home.",
        "Notify the Provider and the Family, and record what happened."
      ],
      "pt-BR": [
        "Diante de febre, ligar imediatamente para o serviço de emergência ou para a equipe responsável, conforme o indicado no domicílio.",
        "Acompanhar o Paciente e não deixar a pessoa sozinha.",
        "Anotar a hora, a temperatura e o que foi observado.",
        "Afastar do ambiente qualquer pessoa com sintomas de contágio e ventilar o local.",
        "Procurar e respeitar o que a equipe responsável deixou indicado por escrito no domicílio.",
        "Avisar a Prestadora e a Família, e registrar o que aconteceu."
      ]
    }
  },
  "paliativos": {
    "descripcion": {
      "es-AR": "Los cuidados paliativos acompañan a una persona con una enfermedad que ya no se puede curar. El objetivo no es curar sino que la persona esté cómoda, sin dolor evitable y acompañada, y que la Familia también reciba apoyo. Todo lo que un profesional dejó indicado por escrito en el domicilio se respeta tal como está.",
      "en": "Palliative care accompanies a person with an illness that can no longer be cured. The goal is not to cure but to keep the person comfortable, free of avoidable pain and accompanied, and to support the Family as well. Whatever a professional has left in writing in the home is respected exactly as it stands.",
      "pt-BR": "Os cuidados paliativos acompanham uma pessoa com uma doença que já não tem cura. O objetivo não é curar, e sim que a pessoa fique confortável, sem dor evitável e acompanhada, e que a Família também receba apoio. Tudo o que um profissional deixou indicado por escrito no domicílio é respeitado exatamente como está."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele haber un equipo de cuidados paliativos a cargo, con indicaciones escritas y un teléfono de contacto propio. El ritmo del día lo marca el bienestar del Paciente: se descansa mucho, se come poco y las visitas se acortan. Es habitual que la persona duerma más horas, hable menos y prefiera la penumbra y el silencio. La Familia atraviesa un momento difícil y puede pasar del enojo al llanto o al silencio en el mismo día; escuchar sin opinar sobre las decisiones que ya se tomaron es parte del cuidado. El trabajo del Asistente es la presencia, la comodidad y la observación atenta.",
      "en": "The home usually has a palliative care team in charge, with written instructions and its own contact number. The rhythm of the day follows the Patient's comfort: there is a lot of rest, little food, and visits grow shorter. It is common for the person to sleep more hours, speak less, and prefer dim light and quiet. The Family is going through a hard time and may move from anger to tears to silence within the same day; listening without giving opinions on decisions already made is part of the care. The Assistant's work is presence, comfort and careful observation.",
      "pt-BR": "No domicílio costuma haver uma equipe de cuidados paliativos responsável, com orientações por escrito e um telefone de contato próprio. O ritmo do dia é dado pelo bem-estar do Paciente: descansa-se muito, come-se pouco e as visitas ficam mais curtas. É comum que a pessoa durma mais horas, fale menos e prefira a penumbra e o silêncio. A Família atravessa um momento difícil e pode passar da raiva ao choro ou ao silêncio no mesmo dia; escutar sem opinar sobre as decisões já tomadas faz parte do cuidado. O trabalho do Assistente é a presença, o conforto e a observação atenta."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Dolor que aumenta, que no cede con la posición o que se ve en la cara y en los gestos.",
        "Dificultad para respirar, respiración ruidosa o agitada.",
        "Agitación, inquietud, angustia o confusión nuevas.",
        "Dificultad para tragar, o rechazo de todo alimento y de toda bebida.",
        "Cambio brusco en el estado de conciencia o imposibilidad de despertar a la persona.",
        "Náuseas o vómitos que se repiten, o falta de deposiciones u orina por un tiempo prolongado.",
        "Una Familia desbordada, sin descanso o sin saber qué hacer."
      ],
      "en": [
        "Pain that increases, does not ease with a change of position, or shows in the face and gestures.",
        "Difficulty breathing, or noisy or laboured breathing.",
        "New agitation, restlessness, distress or confusion.",
        "Difficulty swallowing, or refusal of all food and all drink.",
        "A sudden change in level of consciousness, or being unable to wake the person.",
        "Repeated nausea or vomiting, or no bowel movements or urine for a long stretch.",
        "A Family that is overwhelmed, without rest, or unsure what to do."
      ],
      "pt-BR": [
        "Dor que aumenta, que não alivia com a mudança de posição ou que aparece no rosto e nos gestos.",
        "Dificuldade para respirar, respiração ruidosa ou ofegante.",
        "Agitação, inquietação, angústia ou confusão novas.",
        "Dificuldade para engolir, ou recusa de todo alimento e de toda bebida.",
        "Mudança brusca no estado de consciência ou impossibilidade de despertar a pessoa.",
        "Náuseas ou vômitos repetidos, ou ausência de evacuações ou de urina por tempo prolongado.",
        "Uma Família sobrecarregada, sem descanso ou sem saber o que fazer."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Acompañar al Paciente, hablarle con calma y no dejarlo solo.",
        "Observar qué está pasando y anotar la hora en que empezó.",
        "Buscar en el domicilio las indicaciones escritas por el equipo de cuidados paliativos y respetarlas tal como están.",
        "Avisar de inmediato al equipo de cuidados paliativos a cargo, o al servicio de emergencias cuando así lo indique lo escrito en el domicilio.",
        "Avisar a la Prestadora y a la Familia.",
        "Dejar registrado qué pasó, a qué hora y a quién se avisó."
      ],
      "en": [
        "Stay with the Patient, speak calmly, and do not leave the person alone.",
        "Observe what is happening and note the time it began.",
        "Find the written instructions left by the palliative care team in the home and follow them exactly as they stand.",
        "Notify the palliative care team in charge at once, or the emergency service when the written instructions in the home say so.",
        "Notify the Provider and the Family.",
        "Record what happened, at what time, and who was notified."
      ],
      "pt-BR": [
        "Acompanhar o Paciente, falar com calma e não deixar a pessoa sozinha.",
        "Observar o que está acontecendo e anotar a hora em que começou.",
        "Procurar no domicílio as orientações escritas pela equipe de cuidados paliativos e respeitá-las exatamente como estão.",
        "Avisar imediatamente a equipe de cuidados paliativos responsável, ou o serviço de emergência quando assim indicar o que está escrito no domicílio.",
        "Avisar a Prestadora e a Família.",
        "Registrar o que aconteceu, a que horas e quem foi avisado."
      ]
    }
  },
  "parkinson": {
    "descripcion": {
      "es-AR": "El Parkinson es una enfermedad del sistema nervioso que afecta el control del movimiento. Aparecen temblor en reposo, rigidez, lentitud y dificultad para sostener el equilibrio, y con los años pueden sumarse cambios en el ánimo, en el sueño y en la memoria. Avanza despacio, y cada persona lo transita de manera distinta.",
      "en": "Parkinson's is a disease of the nervous system that affects the control of movement. Tremor at rest, stiffness, slowness and trouble keeping balance appear, and over the years changes in mood, sleep and memory may be added. It advances slowly, and no two people go through it in the same way.",
      "pt-BR": "O Parkinson é uma doença do sistema nervoso que afeta o controle do movimento. Surgem tremor em repouso, rigidez, lentidão e dificuldade para manter o equilíbrio e, com os anos, podem se somar alterações do humor, do sono e da memória. Avança devagar, e cada pessoa o atravessa de um jeito diferente."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se ve que iniciar un movimiento cuesta: levantarse de la silla, dar el primer paso o girar en un pasillo angosto. Los pies pueden quedar como pegados al piso durante unos segundos, sobre todo al cruzar puertas o al apurarse. La escritura se achica, la voz baja de volumen y el gesto de la cara se vuelve menos expresivo, aunque la persona entienda todo lo que se le dice. Vestirse, abrocharse y comer llevan más tiempo, y conviene ofrecer ayuda sin apurar el ritmo del Paciente. El estado cambia a lo largo del día: hay ratos de bastante soltura y ratos de mucha traba.",
      "en": "In the home, starting a movement is the hard part: getting up from a chair, taking the first step, or turning in a narrow hallway. The feet may seem glued to the floor for a few seconds, especially in doorways or when hurrying. Handwriting shrinks, the voice drops in volume and the face becomes less expressive, even though the person understands everything being said. Dressing, fastening buttons and eating take longer, and help is best offered without rushing the Patient's pace. The condition shifts through the day: there are stretches of relative ease and stretches of heavy blocking.",
      "pt-BR": "No domicílio se percebe que iniciar um movimento custa: levantar-se da cadeira, dar o primeiro passo ou girar num corredor estreito. Os pés podem ficar como que colados ao chão por alguns segundos, sobretudo ao passar por portas ou ao se apressar. A letra diminui, a voz baixa de volume e a expressão do rosto fica menos viva, ainda que a pessoa entenda tudo o que lhe dizem. Vestir-se, abotoar e comer levam mais tempo, e convém oferecer ajuda sem apressar o ritmo do Paciente. O estado muda ao longo do dia: há períodos de bastante soltura e períodos de muito travamento."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Caída, sobre todo si hubo golpe en la cabeza o queda dolor al moverse.",
        "Bloqueo prolongado al caminar, con imposibilidad de despegar los pies del piso.",
        "Atragantamiento, tos al tragar, o voz que suena húmeda después de las comidas.",
        "Confusión nueva, alucinaciones o ideas de daño que antes no aparecían.",
        "Rigidez o temblor mucho más intensos que lo habitual en ese Paciente.",
        "Mareo o desvanecimiento al incorporarse.",
        "Somnolencia marcada que se sostiene durante todo el día."
      ],
      "en": [
        "A fall, especially if the head was struck or pain remains on moving.",
        "Prolonged freezing while walking, with the feet impossible to lift off the floor.",
        "Choking, coughing while swallowing, or a wet-sounding voice after meals.",
        "New confusion, hallucinations or fears of harm that were not there before.",
        "Stiffness or tremor far more intense than usual for that Patient.",
        "Dizziness or faintness on standing up.",
        "Marked drowsiness that lasts throughout the whole day."
      ],
      "pt-BR": [
        "Queda, sobretudo se houve batida na cabeça ou se resta dor ao se mover.",
        "Bloqueio prolongado ao caminhar, com impossibilidade de descolar os pés do chão.",
        "Engasgo, tosse ao engolir, ou voz que soa molhada depois das refeições.",
        "Confusão nova, alucinações ou ideias de perseguição que antes não apareciam.",
        "Rigidez ou tremor muito mais intensos do que o habitual naquele Paciente.",
        "Tontura ou desmaio ao se levantar.",
        "Sonolência acentuada que se mantém durante o dia inteiro."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "No mover al Paciente que cayó si hay dolor, deformidad o golpe en la cabeza.",
        "Quedarse a su lado, hablarle con calma y no dejarlo solo.",
        "Anotar la hora del episodio y describir qué se observó.",
        "Despejar el piso y apartar lo que estorbe el paso o pueda causar más daño.",
        "Llamar al servicio de emergencias y seguir la indicación de quien atienda.",
        "Avisar a la Prestadora y a la Familia, y dejar el episodio registrado."
      ],
      "en": [
        "Do not move a Patient who has fallen if there is pain, deformity or a blow to the head.",
        "Stay at the person's side, speak calmly and do not leave the Patient alone.",
        "Write down the time of the episode and describe what was observed.",
        "Clear the floor and move aside anything blocking the way or able to cause further harm.",
        "Call the emergency service and follow the instructions given by the responder.",
        "Notify the Provider and the Family, and leave the episode on record."
      ],
      "pt-BR": [
        "Não mover o Paciente que caiu se houver dor, deformidade ou batida na cabeça.",
        "Permanecer ao lado, falar com calma e não deixar a pessoa sozinha.",
        "Anotar a hora do episódio e descrever o que foi observado.",
        "Liberar o chão e afastar o que atrapalhe a passagem ou possa causar mais dano.",
        "Ligar para o serviço de emergência e seguir a orientação de quem atender.",
        "Avisar a Prestadora e a Família, e deixar o episódio registrado."
      ]
    }
  },
  "postrados": {
    "descripcion": {
      "es-AR": "Un Paciente postrado es una persona que permanece la mayor parte del día en la cama y no puede cambiar de posición por sus propios medios. Al apoyar siempre las mismas zonas del cuerpo, la piel se lastima con facilidad y aparecen lesiones por presión. El cuidado diario se apoya en tres cosas: mover, higienizar y observar la piel.",
      "en": "A bedbound Patient is a person who stays in bed most of the day and cannot change position without help. Because the same areas of the body carry the weight all the time, the skin breaks down easily and pressure injuries appear. Daily care rests on three things: repositioning, hygiene and watching the skin.",
      "pt-BR": "Um Paciente acamado é uma pessoa que permanece na cama a maior parte do dia e não consegue mudar de posição sozinha. Como as mesmas áreas do corpo ficam sempre apoiadas, a pele se machuca com facilidade e surgem lesões por pressão. O cuidado diário se apoia em três pontos: mudar de posição, higienizar e observar a pele."
    },
    "que_esperar": {
      "es-AR": "En el domicilio se encuentra una cama que es el centro de la jornada, y buena parte del trabajo ocurre alrededor de ella. Los cambios de posición se repiten varias veces por día y siguen el plan que dejó indicado el equipo de salud. La higiene, el secado cuidadoso de los pliegues y la hidratación de la piel forman parte de la rutina, junto con el cambio de la ropa de cama cuando queda húmeda o arrugada. Se ofrecen líquidos con frecuencia, siempre que la persona pueda tomarlos sin dificultad. Cada revisión de la piel es una oportunidad de observar: talones, caderas, zona baja de la espalda, codos y orejas.",
      "en": "In the home, the bed is the centre of the day, and much of the work happens around it. Repositioning is repeated several times a day, following the plan left by the health team. Hygiene, careful drying of skin folds and skin moisturising are part of the routine, along with changing bed linen whenever it is damp or wrinkled. Fluids are offered often, as long as the person can drink them without difficulty. Every skin check is a chance to observe: heels, hips, lower back, elbows and ears.",
      "pt-BR": "No domicílio, a cama é o centro do dia, e boa parte do trabalho acontece em torno dela. As mudanças de posição se repetem várias vezes ao dia e seguem o plano deixado pela equipe de saúde. A higiene, a secagem cuidadosa das dobras da pele e a hidratação fazem parte da rotina, junto com a troca da roupa de cama sempre que estiver úmida ou amassada. Oferecem-se líquidos com frequência, sempre que a pessoa consiga tomá-los sem dificuldade. Cada revisão da pele é uma oportunidade de observar: calcanhares, quadris, região lombar, cotovelos e orelhas."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Una zona de piel enrojecida que no se aclara después de aliviar la presión.",
        "Piel abierta, ampollas, piel de color oscuro o violáceo sobre una zona de apoyo.",
        "Mal olor, líquido o supuración en cualquier zona de la piel.",
        "Dolor o queja al tocar o al mover una parte del cuerpo.",
        "Fiebre, escalofríos o piel muy caliente al tacto.",
        "Menos orina que lo habitual, orina muy oscura, boca seca o labios agrietados.",
        "Somnolencia mayor que lo habitual, confusión o dificultad para despertar a la persona."
      ],
      "en": [
        "An area of reddened skin that does not fade after pressure is relieved.",
        "Broken skin, blisters, or dark or purplish skin over a weight-bearing area.",
        "Bad odour, fluid or discharge from any area of the skin.",
        "Pain or complaint when a part of the body is touched or moved.",
        "Fever, chills, or skin that feels very hot to the touch.",
        "Less urine than usual, very dark urine, dry mouth or cracked lips.",
        "More drowsiness than usual, confusion, or difficulty waking the person."
      ],
      "pt-BR": [
        "Uma área de pele avermelhada que não clareia depois de aliviar a pressão.",
        "Pele aberta, bolhas, ou pele escura ou arroxeada sobre uma área de apoio.",
        "Mau cheiro, líquido ou secreção em qualquer área da pele.",
        "Dor ou queixa ao tocar ou ao mover uma parte do corpo.",
        "Febre, calafrios ou pele muito quente ao toque.",
        "Menos urina que o habitual, urina muito escura, boca seca ou lábios rachados.",
        "Mais sonolência que o habitual, confusão ou dificuldade para despertar a pessoa."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Aliviar la presión sobre la zona afectada y no frotarla ni aplicarle nada.",
        "Acompañar al Paciente y no dejarlo solo.",
        "Llamar al servicio de emergencias si hay fiebre alta, dificultad para respirar o pérdida de conciencia.",
        "Buscar y respetar lo que el equipo de salud dejó indicado por escrito en el domicilio.",
        "Avisar a la Prestadora y a la Familia apenas la situación esté contenida.",
        "Dejar registrado qué se observó, a qué hora y qué se hizo."
      ],
      "en": [
        "Relieve pressure on the affected area and do not rub it or apply anything to it.",
        "Stay with the Patient and do not leave the person alone.",
        "Call the emergency service if there is high fever, difficulty breathing or loss of consciousness.",
        "Find and follow what the health team left in writing in the home.",
        "Notify the Provider and the Family as soon as the situation is under control.",
        "Record what was observed, at what time, and what was done."
      ],
      "pt-BR": [
        "Aliviar a pressão sobre a área afetada e não esfregar nem aplicar nada nela.",
        "Acompanhar o Paciente e não deixar a pessoa sozinha.",
        "Ligar para o serviço de emergência se houver febre alta, dificuldade para respirar ou perda de consciência.",
        "Procurar e respeitar o que a equipe de saúde deixou indicado por escrito no domicílio.",
        "Avisar a Prestadora e a Família assim que a situação estiver contida.",
        "Registrar o que foi observado, a que horas e o que foi feito."
      ]
    }
  },
  "psiquiatricas": {
    "descripcion": {
      "es-AR": "Las patologías psiquiátricas son condiciones de salud que afectan el ánimo, el pensamiento o la conducta, y que un profesional diagnostica y trata. Abarcan situaciones muy distintas entre sí, con períodos mejores y peores. Con el tratamiento indicado sostenido en el tiempo, la mayoría de las personas lleva adelante su vida cotidiana.",
      "en": "Psychiatric conditions are health conditions that affect mood, thinking or behaviour, and that a professional diagnoses and treats. They cover very different situations, with better and worse periods. When the prescribed treatment is kept up over time, most people carry on with everyday life.",
      "pt-BR": "As patologias psiquiátricas são condições de saúde que afetam o humor, o pensamento ou o comportamento, e que um profissional diagnostica e trata. Abrangem situações muito diferentes entre si, com períodos melhores e piores. Com o tratamento indicado mantido ao longo do tempo, a maioria das pessoas leva adiante a vida cotidiana."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele haber un tratamiento ya indicado por un profesional, con controles y horarios que conviene respetar tal como están escritos. El ánimo, el sueño y las ganas de hacer cosas pueden variar de un día para otro, y esa variación forma parte del acompañamiento. Algunos días el Paciente puede estar más callado, más irritable o menos dispuesto al contacto, sin que eso sea un rechazo personal. Ayuda mantener una rutina previsible, un trato tranquilo y respetuoso, y escuchar sin discutir ni corregir lo que la persona siente. La tarea del Asistente es observar, acompañar e informar, nunca opinar sobre el diagnóstico ni sobre el tratamiento.",
      "en": "In the home there is usually a treatment already prescribed by a professional, with check-ups and times to be kept exactly as written. Mood, sleep and willingness to do things may vary from one day to the next, and that variation is part of the accompaniment. On some days the Patient may be quieter, more irritable or less open to contact, without that being a personal rejection. A predictable routine, a calm and respectful manner, and listening without arguing or correcting what the person feels all help. The role of the Assistant is to observe, accompany and report, never to comment on the diagnosis or on the treatment.",
      "pt-BR": "No domicílio, costuma haver um tratamento já indicado por um profissional, com consultas e horários que convém respeitar exatamente como estão escritos. O humor, o sono e a disposição para fazer as coisas podem variar de um dia para o outro, e essa variação faz parte do acompanhamento. Em alguns dias o Paciente pode ficar mais calado, mais irritado ou menos disposto ao contato, sem que isso seja uma rejeição pessoal. Ajuda manter uma rotina previsível, um trato tranquilo e respeitoso, e escutar sem discutir nem corrigir o que a pessoa sente. A tarefa do Assistente é observar, acompanhar e informar, nunca opinar sobre o diagnóstico ou sobre o tratamento."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Frases o gestos que sugieran intención de lastimarse o de terminar con su vida.",
        "Amenazas o conductas que pongan en riesgo a otras personas.",
        "Interrupción del tratamiento indicado, o controles que se dejan de cumplir.",
        "Cambio marcado del sueño: varias noches sin dormir, o somnolencia que no cede.",
        "Dejar de comer, de beber líquidos o de higienizarse durante varios días.",
        "Desorientación, agitación o dificultad para reconocer el lugar o a las personas.",
        "Aislamiento repentino, o abandono de actividades que antes sostenía."
      ],
      "en": [
        "Words or gestures suggesting an intention to self-harm or to end their life.",
        "Threats or behaviour that put other people at risk.",
        "The prescribed treatment interrupted, or check-ups no longer kept.",
        "A marked change in sleep: several nights without sleeping, or drowsiness that does not lift.",
        "Not eating, not drinking fluids or not washing for several days.",
        "Disorientation, agitation or difficulty recognising the place or the people around.",
        "Sudden withdrawal, or giving up activities previously kept up."
      ],
      "pt-BR": [
        "Frases ou gestos que sugiram intenção de se machucar ou de acabar com a própria vida.",
        "Ameaças ou condutas que coloquem outras pessoas em risco.",
        "Interrupção do tratamento indicado, ou consultas que deixam de ser cumpridas.",
        "Mudança marcante do sono: várias noites sem dormir, ou sonolência que não passa.",
        "Deixar de comer, de beber líquidos ou de se higienizar durante vários dias.",
        "Desorientação, agitação ou dificuldade para reconhecer o lugar ou as pessoas.",
        "Isolamento repentino, ou abandono de atividades que antes eram mantidas."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Mantener la calma y hablar en voz baja, con frases cortas y claras.",
        "Cuidar la seguridad de todos: dejar libre la salida y apartar objetos con los que alguien pueda lastimarse.",
        "No discutir, no contradecir ni sujetar a la persona a la fuerza.",
        "Llamar al servicio de emergencias si hay riesgo para la persona o para terceros.",
        "Acompañar sin dejar sola a la persona, salvo que la propia seguridad esté en riesgo; en ese caso, ir a un lugar seguro y pedir ayuda.",
        "Avisar a la Prestadora y a la Familia, y dejar registrado qué pasó y a qué hora."
      ],
      "en": [
        "Stay calm and speak quietly, in short and clear sentences.",
        "Keep everyone safe: leave the exit clear and move away objects that could cause injury.",
        "Do not argue, do not contradict and do not restrain the person by force.",
        "Call the emergency service if there is risk to the person or to others.",
        "Stay alongside without leaving the person alone, unless own safety is at risk; in that case, move to a safe place and call for help.",
        "Notify the Provider and the Family, and leave a written record of what happened and at what time."
      ],
      "pt-BR": [
        "Manter a calma e falar em voz baixa, com frases curtas e claras.",
        "Cuidar da segurança de todos: deixar a saída livre e afastar objetos com os quais alguém possa se machucar.",
        "Não discutir, não contrariar nem segurar a pessoa à força.",
        "Chamar o serviço de emergência se houver risco para a pessoa ou para terceiros.",
        "Acompanhar sem deixar a pessoa sozinha, a menos que a própria segurança esteja em risco; nesse caso, ir para um lugar seguro e pedir ajuda.",
        "Avisar a Prestadora e a Família, e deixar registrado o que aconteceu e a que horas."
      ]
    }
  },
  "sincope": {
    "descripcion": {
      "es-AR": "El síncope es una pérdida breve del conocimiento que ocurre cuando llega menos sangre al cerebro durante unos segundos. La persona se desvanece, cae si estaba de pie y suele recuperarse sola en poco tiempo. Puede repetirse, y cada episodio conviene tratarlo como un hecho que se informa, nunca como algo esperable.",
      "en": "Syncope is a brief loss of consciousness that happens when the brain receives less blood for a few seconds. The person faints, falls if standing, and usually comes around on their own within a short time. It can happen again, and every episode should be treated as an event to report, never as something to be expected.",
      "pt-BR": "A síncope é uma perda breve da consciência que ocorre quando chega menos sangue ao cérebro por alguns segundos. A pessoa desmaia, cai se estiver de pé e costuma se recuperar sozinha em pouco tempo. Pode se repetir, e cada episódio deve ser tratado como um fato que se informa, nunca como algo esperado."
    },
    "que_esperar": {
      "es-AR": "En el domicilio suele haber un antecedente conocido: ya pasó antes, y la Familia sabe en qué situaciones. Con frecuencia aparece al incorporarse rápido de la cama o de una silla, al estar mucho tiempo de pie, en ambientes calurosos o después de un baño con agua caliente. Muchas veces hay avisos previos de unos segundos: mareo, visión borrosa, sudor frío, palidez o zumbido en los oídos. Es común encontrar la casa adaptada, con apoyos en el baño y con la indicación de levantarse despacio y en dos tiempos. Después del episodio la persona puede quedar confundida, cansada o avergonzada, y necesita compañía tranquila.",
      "en": "At home there is often a known history: it has happened before, and the Family knows in which situations. It frequently appears when getting up quickly from bed or a chair, when standing for a long time, in hot rooms, or after a hot shower. There are often warning signs a few seconds ahead: dizziness, blurred vision, cold sweat, paleness, or ringing in the ears. The home is commonly adapted, with grab supports in the bathroom and an instruction to stand up slowly and in two stages. After the episode the person may be confused, tired, or embarrassed, and needs calm company.",
      "pt-BR": "No domicílio costuma haver um histórico conhecido: já aconteceu antes, e a Família sabe em quais situações. Com frequência aparece ao levantar-se rápido da cama ou de uma cadeira, ao ficar muito tempo de pé, em ambientes quentes ou depois de um banho com água quente. Muitas vezes há avisos prévios de alguns segundos: tontura, visão embaçada, suor frio, palidez ou zumbido nos ouvidos. É comum encontrar a casa adaptada, com apoios no banheiro e com a orientação de levantar-se devagar e em duas etapas. Depois do episódio a pessoa pode ficar confusa, cansada ou envergonhada, e precisa de companhia tranquila."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Palidez repentina, sudor frío o mirada perdida mientras se está conversando.",
        "Aviso de mareo, visión borrosa o zumbido en los oídos al ponerse de pie.",
        "Desvanecimiento que dura más de un minuto o del que la persona no se recupera del todo.",
        "Caída con golpe en la cabeza, sangrado o dolor fuerte en algún miembro.",
        "Confusión, dificultad para hablar o debilidad de un lado del cuerpo después del episodio.",
        "Dolor en el pecho, falta de aire o latidos muy rápidos o muy lentos antes o después.",
        "Episodios que se repiten el mismo día o que aparecen sin ningún aviso previo."
      ],
      "en": [
        "Sudden paleness, cold sweat, or a blank stare in the middle of a conversation.",
        "A warning of dizziness, blurred vision, or ringing in the ears when standing up.",
        "Fainting that lasts more than a minute or from which the person does not fully recover.",
        "A fall with a blow to the head, bleeding, or severe pain in a limb.",
        "Confusion, trouble speaking, or weakness on one side of the body after the episode.",
        "Chest pain, shortness of breath, or a very fast or very slow heartbeat before or after.",
        "Episodes that repeat on the same day or that appear with no warning at all."
      ],
      "pt-BR": [
        "Palidez repentina, suor frio ou olhar perdido no meio de uma conversa.",
        "Aviso de tontura, visão embaçada ou zumbido nos ouvidos ao ficar de pé.",
        "Desmaio que dura mais de um minuto ou do qual a pessoa não se recupera por completo.",
        "Queda com batida na cabeça, sangramento ou dor forte em algum membro.",
        "Confusão, dificuldade para falar ou fraqueza de um lado do corpo depois do episódio.",
        "Dor no peito, falta de ar ou batimentos muito rápidos ou muito lentos antes ou depois.",
        "Episódios que se repetem no mesmo dia ou que aparecem sem nenhum aviso prévio."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Llamar al servicio de emergencias si la persona no responde, si tardó en despertarse o si se golpeó la cabeza.",
        "No mover a la persona si pudo haberse lastimado en la caída, y despejar el paso a su alrededor.",
        "Acompañar y no dejarla sola en ningún momento, hablándole con calma aunque parezca no escuchar.",
        "Anotar la hora exacta del episodio, cuánto duró y qué se observó antes y después.",
        "Avisar a la Prestadora y a la Familia apenas la situación esté contenida.",
        "Dejar registrado qué pasó, qué se hizo y quién intervino."
      ],
      "en": [
        "Call the emergency service if the person is unresponsive, took long to wake, or hit their head.",
        "Do not move the person if they may have been injured in the fall, and clear the space around them.",
        "Stay alongside and never leave them alone, speaking calmly even if they seem not to hear.",
        "Note the exact time of the episode, how long it lasted, and what was observed before and after.",
        "Notify the Provider and the Family as soon as the situation is under control.",
        "Leave a written record of what happened, what was done, and who took part."
      ],
      "pt-BR": [
        "Ligar para o serviço de emergência se a pessoa não responder, se demorou a acordar ou se bateu a cabeça.",
        "Não mover a pessoa se ela pode ter se machucado na queda, e liberar a passagem ao redor.",
        "Acompanhar e não deixá-la sozinha em nenhum momento, falando com calma mesmo que pareça não ouvir.",
        "Anotar a hora exata do episódio, quanto tempo durou e o que se observou antes e depois.",
        "Avisar a Prestadora e a Família assim que a situação estiver contida.",
        "Deixar registrado o que aconteceu, o que foi feito e quem participou."
      ]
    }
  }
}
$guias$::jsonb) as e(clave, guia)
),
destino as (
  select e.clave, e.guia, i.id as item
    from entrada e
    join public.vocabularios v
      on v.clave = 'patologia' and v.tenant_id is null
    join public.vocabulario_items i
      on i.vocabulario_id = v.id and i.tenant_id is null and i.clave = e.clave
)
insert into public.guias_cuidado
       (tenant_id, vocabulario_item_id, descripcion, que_esperar,
        senales_de_alarma, en_emergencia, publicada)
select null,
       d.item,
       d.guia -> 'descripcion',
       d.guia -> 'que_esperar',
       d.guia -> 'senales_de_alarma',
       d.guia -> 'en_emergencia',
       false
  from destino d
    on conflict (vocabulario_item_id) where tenant_id is null
    do nothing;


-- --- Que hayan entrado las 19 ----------------------------------------
-- Una migración que inserta por `join` y no encuentra el ítem no falla:
-- inserta cero filas y termina bien. Eso es exactamente lo que hay que
-- atajar, porque el síntoma aparece mucho después, en una pantalla vacía
-- que no avisa por qué.

do $comprobar$
declare
  cuantas integer;
  esperadas integer;
begin
  select count(*) into esperadas
    from public.vocabulario_items i
    join public.vocabularios v on v.id = i.vocabulario_id
   where v.clave = 'patologia' and v.tenant_id is null and i.tenant_id is null;

  select count(*) into cuantas
    from public.guias_cuidado g
    join public.vocabulario_items i on i.id = g.vocabulario_item_id
    join public.vocabularios v on v.id = i.vocabulario_id
   where g.tenant_id is null and v.clave = 'patologia';

  if cuantas <> esperadas then
    raise exception 'Quedaron % guías generales de patología y el catálogo tiene % opciones.', cuantas, esperadas;
  end if;
end
$comprobar$;


notify pgrst, 'reload schema';
