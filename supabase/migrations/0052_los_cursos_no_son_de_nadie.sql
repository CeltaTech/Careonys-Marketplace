-- =====================================================================
-- 0052 — Los cursos no son de nadie
--
-- Decisión del Desarrollador del 31 de agosto de 2026, textual: «los
-- cursos son cursos, ni familias ni asistentes; después comercialmente
-- se les asignarán a las familias o no, y se pondrán disponibles para
-- los futuros asistentes». O sea que un curso no le pertenece a ninguna
-- punta: a quién se le asigna y si se cobra es una decisión comercial,
-- que se anota del lado de CeltaTech y no se construye acá.
--
-- Los seis cursos de la oferta general venían escritos desde una sola
-- punta: la 0008 los sembró y la 0051 los mudó a `nombre_i18n` y
-- `descripcion_i18n` «sin cambiar ni una palabra», que era lo correcto
-- ese día —mudar no es reescribir—. Con la decisión de arriba el texto
-- quedó hablándole a quien ya no es el único que cursa: «cómo acompañar
-- a un familiar en el día a día» y «Comunicación empática con un
-- familiar mayor» suponen que quien cursa es pariente de quien recibe
-- el cuidado, y a partir de ahora puede no serlo.
--
-- CÓMO SE ESCRIBE UN CURSO DE ACÁ EN ADELANTE
-- -------------------------------------------
-- Se nombra **la persona cuidada** y **quien cuida**, y no se dice el
-- vínculo entre las dos: ni pariente ni contratado. Las dos formas ya
-- estaban en uso en este mismo catálogo —«sostener la calidad de vida
-- de la persona cuidada», «El bienestar de quien cuida»—, así que no se
-- inventa ninguna palabra: se extiende la que ya servía.
--
-- Cuatro de los seis ya estaban escritos así y su texto no cambia. Se
-- actualizan igual los seis, en los tres idiomas, para que esta
-- migración diga entera lo que la oferta dice hoy y no haya que leer
-- dos archivos para saberlo.
--
-- La 0051 está aplicada acá y en la base publicada, así que no se toca:
-- se corrige con esta, que va adelante. Y los mismos textos, palabra
-- por palabra, están en `data/catalogo-oferta.json` y en las dos copias
-- que `scripts/verificar_copias.mjs` compara byte a byte.
--
-- Nada de esto cambia el esquema: no se agrega ni se saca ninguna
-- columna, y `public.oferta_de_cursos` sigue publicando exactamente lo
-- que publicaba. Lo único que cambia es el texto que muestra.
-- =====================================================================


update public.cursos c
   set nombre_i18n      = x.nombre,
       descripcion_i18n = x.descripcion
  from (values
    ('introduccion',
     '{"es-AR": "Introducción al cuidado de la persona mayor", "en": "Introduction to caring for an older person", "pt-BR": "Introdução ao cuidado da pessoa idosa"}'::jsonb,
     '{"es-AR": "Conceptos fundamentales del envejecimiento, necesidades básicas y cómo acompañar a la persona cuidada en el día a día.", "en": "Core concepts of ageing, basic needs and how to accompany the person being cared for day by day.", "pt-BR": "Conceitos fundamentais do envelhecimento, necessidades básicas e como acompanhar a pessoa cuidada no dia a dia."}'::jsonb),
    ('demencias',
     '{"es-AR": "Alzheimer y otras demencias: qué esperar y cómo actuar", "en": "Alzheimer''s and other dementias: what to expect and how to act", "pt-BR": "Alzheimer e outras demências: o que esperar e como agir"}'::jsonb,
     '{"es-AR": "Guía práctica para entender el deterioro cognitivo, manejar situaciones difíciles y sostener la calidad de vida de la persona cuidada.", "en": "A practical guide to understanding cognitive impairment, handling difficult situations and sustaining the quality of life of the person being cared for.", "pt-BR": "Guia prático para entender o declínio cognitivo, lidar com situações difíceis e sustentar a qualidade de vida da pessoa cuidada."}'::jsonb),
    ('bienestar_cuidador',
     '{"es-AR": "El bienestar de quien cuida", "en": "The wellbeing of whoever cares", "pt-BR": "O bem-estar de quem cuida"}'::jsonb,
     '{"es-AR": "Herramientas para prevenir el síndrome del cuidador, manejar el estrés y sostener la propia salud emocional.", "en": "Tools to prevent caregiver burnout syndrome, manage stress and sustain one''s own emotional health.", "pt-BR": "Ferramentas para prevenir a síndrome do cuidador, lidar com o estresse e sustentar a própria saúde emocional."}'::jsonb),
    ('medicamentos',
     '{"es-AR": "Administración de medicamentos y control de salud en el hogar", "en": "Administration of medicines and health monitoring at home", "pt-BR": "Administração de medicamentos e controle de saúde em casa"}'::jsonb,
     '{"es-AR": "Organizar la medicación, reconocer señales de alerta y coordinar con el equipo médico.", "en": "Organising medication, recognising warning signs and coordinating with the medical team.", "pt-BR": "Organizar a medicação, reconhecer sinais de alerta e coordenar com a equipe médica."}'::jsonb),
    ('comunicacion',
     '{"es-AR": "Comunicación empática con la persona cuidada", "en": "Empathetic communication with the person being cared for", "pt-BR": "Comunicação empática com a pessoa cuidada"}'::jsonb,
     '{"es-AR": "Técnicas de comunicación adaptadas al envejecimiento, cómo dar malas noticias y cómo manejar los conflictos que rodean al cuidado.", "en": "Communication techniques adapted to ageing, how to give bad news and how to handle the conflicts that surround care.", "pt-BR": "Técnicas de comunicação adaptadas ao envelhecimento, como dar más notícias e como lidar com os conflitos que cercam o cuidado."}'::jsonb),
    ('cuidados_avanzados',
     '{"es-AR": "Cuidados avanzados: pacientes postrados y cuidados paliativos", "en": "Advanced care: bedbound patients and palliative care", "pt-BR": "Cuidados avançados: pacientes acamados e cuidados paliativos"}'::jsonb,
     '{"es-AR": "Movilización, prevención de escaras, cuidados al final de la vida y acompañamiento emocional.", "en": "Moving and handling, prevention of pressure sores, end-of-life care and emotional companionship.", "pt-BR": "Mobilização, prevenção de escaras, cuidados no fim da vida e acompanhamento emocional."}'::jsonb)
  ) as x(clave, nombre, descripcion)
 where c.tenant_id is null
   and c.clave = x.clave;


notify pgrst, 'reload schema';
