-- =====================================================================
-- 0045 — Cada Prestadora ficticia con su propia Guía de cuidado
--
-- Por qué hace falta que esto esté en una migración
-- -------------------------------------------------
-- `scripts/verificar_guias.mjs:268` compara lo que la puerta `guias_de`
-- le devuelve a una Prestadora contra lo que le devuelve a otra, y para
-- que esa comparación signifique algo hacen falta **dos Prestadoras con
-- guía propia publicada**. Con menos, el chequeo no falla: informa que no
-- pudo probar nada, que es lo correcto y también lo inútil.
--
-- El 30 de agosto de 2026 las dos coordinadoras ficticias cargaron su
-- guía desde la pantalla, la comparación corrió y el aislamiento quedó
-- probado. Ese mismo día la base de esta máquina se volvió a levantar de
-- cero y las dos guías se fueron con ella: el chequeo volvió a decir que
-- no podía probar nada. **Una prueba que vive sólo en datos cargados a
-- mano es una foto, no un chequeo**, y la regla del producto ya lo decía
-- —«el seed carga siempre al menos dos Prestadoras con datos, porque sin
-- eso la prueba de aislamiento no se puede correr»—. Esto la cumple.
--
-- Las dos escriben sobre la MISMA patología, y es a propósito
-- ----------------------------------------------------------
-- Las dos guías cuelgan de `alzheimer`. Si colgaran de opciones
-- distintas, sus textos no podrían coincidir nunca y la comparación
-- pasaría siempre, incluso con el aislamiento roto. Sobre la misma
-- opción, con texto distinto cada una, el día que una Prestadora vea la
-- guía de la otra los dos textos van a ser idénticos y el chequeo lo va a
-- decir.
--
-- La tercera Prestadora ficticia se deja sin guía propia a propósito: es
-- el caso de quien no escribió ninguna, y por la puerta le tiene que
-- llegar la general.
--
-- La firma sí se escribe acá, y la 0042 no la escribió
-- ---------------------------------------------------
-- La 0042 dejó las 19 guías generales sin publicar porque publicar exige
-- decir quién revisó el texto, y esa firma la pone una persona que se
-- hace responsable. Sigue valiendo, y la línea que las separa es a quién
-- alcanza cada guía: **una general la lee el personal de cualquier
-- Prestadora, incluidas las reales; una propia no sale nunca de la
-- Prestadora que la escribió**. Éstas son propias de dos Prestadoras
-- ficticias, y quienes las firman son personas inventadas, igual que las
-- Familias y los Asistentes que esas mismas Prestadoras ya tienen
-- cargados. Ninguna guía general se publica acá.
--
-- El texto no prescribe nada
-- --------------------------
-- Misma línea que la 0041 y la 0042: qué es, qué se ve en el domicilio,
-- qué obliga a avisar y cómo actuar. Ningún medicamento, ninguna dosis,
-- ninguna maniobra clínica y ningún número de emergencia, que cambia por
-- país. Lo propio de cada Prestadora es **cómo trabaja ella**, no qué
-- tratamiento indica.
-- =====================================================================


-- --- Las dos guías ---------------------------------------------------
-- El ítem del catálogo se busca por su clave y la Prestadora por su
-- nombre corto, nunca por un identificador escrito a mano: los genera
-- cada base y copiarlos ataría esta migración a la base donde se
-- escribió. Y cuelgan del ítem GENERAL —`i.tenant_id is null`—, que es lo
-- que hace que la propia reemplace a la general en `guias_de` en vez de
-- aparecer al lado.

with entrada as (
  select slug, guia
    from jsonb_each($guias$
{
  "presdemo": {
    "revisada_por": "Lic. Marta Quiroga, Enfermería · M.N. 999.999",
    "descripcion": {
      "es-AR": "Esta guía rige para el personal de esta Prestadora y reemplaza a la general. Sobre la enfermedad no dice nada distinto: la memoria de lo reciente se pierde primero, la orientación en el tiempo y en el lugar se va perdiendo después, y el ánimo y la conducta cambian junto con eso. Lo propio de esta Prestadora es cómo se cubre el domicilio: turnos fijos en la misma casa y con las mismas personas, para que quien vive ahí no tenga que reconocer una cara nueva cada día.",
      "en": "This guide applies to this provider's staff and replaces the general one. About the illness it says nothing different: recent memory goes first, orientation in time and place is lost later, and mood and behaviour change along with that. What belongs to this provider is how the home is covered: fixed shifts in the same house and with the same people, so that whoever lives there does not have to recognise a new face every day.",
      "pt-BR": "Este guia vale para a equipe desta prestadora e substitui o geral. Sobre a doença não diz nada diferente: a memória do recente se perde primeiro, a orientação no tempo e no lugar se perde depois, e o humor e o comportamento mudam junto com isso. O que é próprio desta prestadora é como o domicílio é coberto: turnos fixos na mesma casa e com as mesmas pessoas, para que quem mora ali não precise reconhecer um rosto novo a cada dia."
    },
    "que_esperar": {
      "es-AR": "Que la persona repita la misma pregunta muchas veces, que no reconozca a quien la acompaña, que confunda el día con la noche y que esté más inquieta al caer la tarde. Nada de eso es una falta de respeto ni una provocación: es la enfermedad. Acá se pide sostener el orden de la casa tal como está —los muebles donde están, los objetos donde ella los busca— y anotar en el reporte del turno todo lo que se salga de lo habitual, porque quien entra en el turno siguiente no vio nada de eso.",
      "en": "Expect the person to repeat the same question many times, not to recognise whoever is with them, to confuse day with night, and to be more restless as the afternoon ends. None of that is disrespect or provocation: it is the illness. Here the request is to keep the house exactly as it is —furniture where it stands, objects where they are looked for— and to write in the shift report anything out of the ordinary, because whoever comes in on the next shift saw none of it.",
      "pt-BR": "Espere que a pessoa repita a mesma pergunta muitas vezes, que não reconheça quem a acompanha, que confunda o dia com a noite e que fique mais inquieta no fim da tarde. Nada disso é falta de respeito nem provocação: é a doença. Aqui se pede manter a ordem da casa como está —os móveis onde estão, os objetos onde ela os procura— e anotar no relatório do turno tudo o que saia do habitual, porque quem entra no turno seguinte não viu nada disso."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Confusión que empeora de golpe, instalada en horas o en un solo día.",
        "Intento de salir del domicilio sin rumbo, o desorientación dentro de la propia casa.",
        "Agitación o miedo intenso que no cede acompañando a la persona.",
        "Somnolencia inusual, o dificultad para despertarla.",
        "Caídas, golpes o moretones sin explicación.",
        "Un día entero rechazando el alimento y el líquido.",
        "Fiebre, quejido o dolor que no se va."
      ],
      "en": [
        "Confusion that worsens abruptly, setting in over hours or a single day.",
        "An attempt to leave the home with no destination, or disorientation inside their own house.",
        "Agitation or intense fear that does not ease with company.",
        "Unusual drowsiness, or difficulty waking them.",
        "Falls, knocks or bruises with no explanation.",
        "A whole day refusing food and fluids.",
        "Fever, moaning or pain that does not go away."
      ],
      "pt-BR": [
        "Confusão que piora de repente, instalada em horas ou em um único dia.",
        "Tentativa de sair do domicílio sem rumo, ou desorientação dentro da própria casa.",
        "Agitação ou medo intenso que não cede com o acompanhamento.",
        "Sonolência incomum, ou dificuldade para acordá-la.",
        "Quedas, batidas ou hematomas sem explicação.",
        "Um dia inteiro recusando alimento e líquido.",
        "Febre, gemido ou dor que não passa."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Quedarse junto al Paciente y no dejarlo solo en ningún momento.",
        "Anotar la hora exacta en que empezó lo que se está viendo.",
        "Despejar el paso y apartar los objetos con los que pueda golpearse.",
        "Llamar al servicio de emergencias y seguir la indicación de quien atienda.",
        "Avisar a la coordinación de la Prestadora apenas la situación lo permita, y después a la Familia.",
        "Dejar escrito en el reporte qué se vio, qué se hizo y a quién se avisó, antes de terminar el turno."
      ],
      "en": [
        "Stay with the patient and do not leave them alone at any moment.",
        "Write down the exact time when what is being seen began.",
        "Clear the way and move aside objects they could hit themselves on.",
        "Call the emergency service and follow the instructions of whoever answers.",
        "Notify the provider's coordination as soon as the situation allows, and the family afterwards.",
        "Leave written in the report what was seen, what was done and who was notified, before the shift ends."
      ],
      "pt-BR": [
        "Ficar junto ao paciente e não deixá-lo sozinho em nenhum momento.",
        "Anotar a hora exata em que começou o que está sendo visto.",
        "Liberar a passagem e afastar os objetos com os quais possa se machucar.",
        "Ligar para o serviço de emergência e seguir a orientação de quem atender.",
        "Avisar a coordenação da prestadora assim que a situação permitir, e depois a família.",
        "Deixar escrito no relatório o que se viu, o que se fez e a quem se avisou, antes de terminar o turno."
      ]
    }
  },
  "cuidarnorte": {
    "revisada_por": "Lic. Rubén Ferreyra, Enfermería · M.N. 888.888",
    "descripcion": {
      "es-AR": "Esta guía rige para el personal de esta Prestadora y reemplaza a la general. La enfermedad es la misma que describe la guía general. Lo propio de acá es la distancia: muchos domicilios quedan lejos de la coordinación y de un centro de salud, y hay tramos del camino sin señal. Por eso todo lo que se decida en la casa hay que poder sostenerlo un rato solo, y todo lo que se observe hay que dejarlo escrito antes de salir, no cuando vuelva la señal.",
      "en": "This guide applies to this provider's staff and replaces the general one. The illness is the same one the general guide describes. What belongs here is distance: many homes are far from coordination and from a health centre, and there are stretches of road with no signal. So whatever is decided in the house has to hold on its own for a while, and whatever is observed has to be written down before leaving, not when the signal comes back.",
      "pt-BR": "Este guia vale para a equipe desta prestadora e substitui o geral. A doença é a mesma que o guia geral descreve. O que é próprio daqui é a distância: muitos domicílios ficam longe da coordenação e de um centro de saúde, e há trechos do caminho sem sinal. Por isso tudo o que for decidido na casa precisa se sustentar sozinho por um tempo, e tudo o que for observado precisa ficar escrito antes de sair, não quando o sinal voltar."
    },
    "que_esperar": {
      "es-AR": "Que la persona pregunte lo mismo muchas veces, que no reconozca a quien la acompaña y que esté más inquieta al caer la tarde. Acá se pide además dejar registrado el estado con el que se encontró la casa al llegar y el estado con el que se la deja, porque entre un turno y el siguiente pueden pasar días y nadie más va a haber pasado por ahí. Si algo cambió y no se pudo avisar en el momento, se avisa apenas haya señal, y de todos modos queda escrito.",
      "en": "Expect the person to ask the same thing many times, not to recognise whoever is with them, and to be more restless as the afternoon ends. Here it is also required to record the state in which the house was found on arrival and the state in which it is left, because days can pass between one shift and the next and nobody else will have been there. If something changed and it could not be reported at the time, it is reported as soon as there is signal, and it is written down either way.",
      "pt-BR": "Espere que a pessoa pergunte a mesma coisa muitas vezes, que não reconheça quem a acompanha e que fique mais inquieta no fim da tarde. Aqui também se pede registrar o estado em que a casa foi encontrada na chegada e o estado em que é deixada, porque entre um turno e o seguinte podem passar dias e mais ninguém terá estado ali. Se algo mudou e não foi possível avisar na hora, avisa-se assim que houver sinal, e de todo modo fica escrito."
    },
    "senales_de_alarma": {
      "es-AR": [
        "Confusión que empeora de golpe, en horas o en un solo día.",
        "Salir de la casa sin rumbo, con el riesgo agregado de que acá no hay a quién preguntarle en la vereda.",
        "Agitación o miedo intenso que no cede acompañando a la persona.",
        "Somnolencia inusual, o dificultad para despertarla.",
        "Caídas o golpes, aunque en el momento parezcan leves.",
        "Un día entero sin comer ni tomar líquido.",
        "Fiebre, quejido o dolor que no se va."
      ],
      "en": [
        "Confusion that worsens abruptly, over hours or a single day.",
        "Leaving the house with no destination, with the added risk that here there is nobody on the street to ask.",
        "Agitation or intense fear that does not ease with company.",
        "Unusual drowsiness, or difficulty waking them.",
        "Falls or knocks, even if they look minor at the time.",
        "A whole day without eating or drinking.",
        "Fever, moaning or pain that does not go away."
      ],
      "pt-BR": [
        "Confusão que piora de repente, em horas ou em um único dia.",
        "Sair de casa sem rumo, com o risco adicional de que aqui não há a quem perguntar na calçada.",
        "Agitação ou medo intenso que não cede com o acompanhamento.",
        "Sonolência incomum, ou dificuldade para acordá-la.",
        "Quedas ou batidas, mesmo que na hora pareçam leves.",
        "Um dia inteiro sem comer nem beber.",
        "Febre, gemido ou dor que não passa."
      ]
    },
    "en_emergencia": {
      "es-AR": [
        "Quedarse junto al Paciente y no dejarlo solo en ningún momento.",
        "Anotar la hora exacta en que empezó lo que se está viendo.",
        "Despejar el paso y apartar los objetos con los que pueda golpearse.",
        "Llamar al servicio de emergencias. Si no hay señal, ir hasta donde la haya sólo si el Paciente queda acompañado; si no queda acompañado, no se lo deja.",
        "Avisar a la coordinación de la Prestadora en cuanto haya señal, y después a la Familia.",
        "Dejar escrito qué se vio, qué se hizo, a qué hora y a quién se avisó, aunque el aviso todavía no haya salido."
      ],
      "en": [
        "Stay with the patient and do not leave them alone at any moment.",
        "Write down the exact time when what is being seen began.",
        "Clear the way and move aside objects they could hit themselves on.",
        "Call the emergency service. If there is no signal, go to where there is one only if the patient is left accompanied; if they are not, they are not left.",
        "Notify the provider's coordination as soon as there is signal, and the family afterwards.",
        "Leave written what was seen, what was done, at what time and who was notified, even if the notification has not gone out yet."
      ],
      "pt-BR": [
        "Ficar junto ao paciente e não deixá-lo sozinho em nenhum momento.",
        "Anotar a hora exata em que começou o que está sendo visto.",
        "Liberar a passagem e afastar os objetos com os quais possa se machucar.",
        "Ligar para o serviço de emergência. Se não houver sinal, ir até onde houver apenas se o paciente ficar acompanhado; se não ficar, não se o deixa.",
        "Avisar a coordenação da prestadora assim que houver sinal, e depois a família.",
        "Deixar escrito o que se viu, o que se fez, a que horas e a quem se avisou, mesmo que o aviso ainda não tenha saído."
      ]
    }
  }
}
$guias$)
       as t(slug, guia)
),
destino as (
  select t.id as tenant_id, i.id as item_id, e.guia
    from entrada e
    join public.tenants t on t.slug = e.slug
    join public.vocabularios v on v.clave = 'patologia' and v.tenant_id is null
    join public.vocabulario_items i
      on i.vocabulario_id = v.id and i.clave = 'alzheimer' and i.tenant_id is null
)
insert into public.guias_cuidado (
  tenant_id, vocabulario_item_id,
  descripcion, que_esperar, senales_de_alarma, en_emergencia,
  publicada, revisada_por, revisada_el)
select d.tenant_id,
       d.item_id,
       d.guia -> 'descripcion',
       d.guia -> 'que_esperar',
       d.guia -> 'senales_de_alarma',
       d.guia -> 'en_emergencia',
       true,
       d.guia ->> 'revisada_por',
       date '2026-08-30'
  from destino d
    on conflict on constraint una_guia_por_item_y_prestadora
    do nothing;


-- --- Que hayan entrado las dos, y que digan cosas distintas -----------
-- Un `insert` por `join` que no encuentra a quién unir no falla: inserta
-- cero filas y termina bien. Y dos guías iguales pasarían el chequeo de
-- aislamiento sin probar nada, que es justo lo que esta migración viene a
-- evitar: si alguien copia y pega el texto de una en la otra, se entera
-- acá y no seis meses después.

do $comprobar$
declare
  cuantas integer;
  distintas integer;
begin
  select count(*), count(distinct g.descripcion) into cuantas, distintas
    from public.guias_cuidado g
    join public.vocabulario_items i on i.id = g.vocabulario_item_id
    join public.tenants t on t.id = g.tenant_id
   where i.clave = 'alzheimer'
     and t.slug in ('presdemo', 'cuidarnorte')
     and g.publicada;

  if cuantas <> 2 then
    raise exception 'Quedaron % guías propias publicadas de alzheimer y tenían que quedar 2.', cuantas;
  end if;

  if distintas <> 2 then
    raise exception 'Las dos guías propias de alzheimer dicen lo mismo, así que el chequeo de aislamiento no podría fallar nunca.';
  end if;
end
$comprobar$;


notify pgrst, 'reload schema';
