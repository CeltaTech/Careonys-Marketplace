-- =====================================================================
-- 0051 — La oferta de cursos se ve sin sesión
--
-- Decisión del Desarrollador del 31 de agosto de 2026, textual: «La
-- oferta de cursos, no el contenido de los mismos, se hará disponible,
-- así como cualquier otra característica de acuerdo a la decisión
-- comercial o de marketing, nada de injerencia tiene el sistema en estos
-- temas.» Con eso se cierra el pendiente 25 y con él la mitad de cursos
-- del 7: `cursos.html` deja de leer `data/catalogo-oferta.json` y lee de
-- la base.
--
-- **La oferta sale por una vista, no por una política para `anon`.** El
-- pendiente 25 proponía «agregar la política para `anon` restringida a
-- `tenant_id is null`», y eso hoy no alcanzaría: desde la 0032 `anon` no
-- tiene ni un permiso de tabla, y una política sin permiso de tabla no
-- deja ver nada —Postgres decide en dos pasos y el primero es el
-- permiso—. Además abrir la tabla la abre entera: la fila trae
-- `publicado`, `created_at` y `tenant_id`, y mañana traería lo que se le
-- agregue. La vista publica columna por columna lo que se decidió
-- publicar, y nada más.
--
-- LO QUE SALE POR ESTA VISTA Y LO QUE NO
-- --------------------------------------
-- Sale **la oferta**: cómo se llama el curso, de qué se trata, cuántas
-- horas dura, de qué nivel es, en qué modalidad se cursa, si otorga
-- certificado y con qué imagen se muestra.
--
-- **No sale el contenido del curso, bajo ninguna circunstancia**: ni lo
-- que se estudia, ni sus evaluaciones —`public.evaluaciones`—, ni sus
-- preguntas —`public.preguntas_evaluacion`—, ni las opciones de cada
-- pregunta —`public.opciones_pregunta`—, ni ninguna respuesta rendida.
-- Eso se cursa con sesión y se sigue pidiendo con sesión. Nunca agregar
-- acá una columna que venga de esas tablas, ni una que diga de qué
-- Prestadora es la fila: lo que se agregue a esta vista queda a la vista
-- de cualquiera, con la clave pública y sin iniciar sesión.
--
-- Y sale **sólo la oferta general del producto** —`tenant_id is null`—.
-- El curso que arma una Prestadora —la 0048 le hizo el suyo a PresDemo—
-- no sale por acá ni sale por ningún lado sin sesión: la decisión de
-- arriba es sobre la oferta que el producto publica, no sobre lo que
-- carga un cliente.
--
-- LO QUE LA TABLA TODAVÍA NO GUARDABA
-- -----------------------------------
-- La 0008 sembró los seis cursos con `nombre` y `descripcion` en un solo
-- idioma, y el archivo tenía además los tres idiomas de cada uno, la
-- etiqueta de la tarjeta y la imagen. Portar la pantalla contra la tabla
-- tal como estaba perdía todo eso sin avisar —«ninguna pantalla se porta
-- sin haber extraído antes su contenido»; una pantalla portada contra una
-- tabla incompleta no da error: muestra de menos—. Así que la migración
-- primero termina de guardar lo que la pantalla ya mostraba, y recién
-- después publica la vista.
--
-- `nombre` y `descripcion` quedan donde estaban y con lo que tenían: son
-- columnas ya guardadas, no se renombran ni se borran, y hoy las lee
-- `getCursos()` desde el programa del Asistente. El texto visible pasa a
-- salir de las columnas nuevas. Que las dos cosas convivan queda anotado
-- como pendiente.
-- =====================================================================


-- --- 1. Lo que la tabla todavía no guardaba -------------------------------
alter table public.cursos add column if not exists nombre_i18n      jsonb;
alter table public.cursos add column if not exists descripcion_i18n jsonb;
alter table public.cursos add column if not exists etiqueta         jsonb;
alter table public.cursos add column if not exists imagen           text;

comment on column public.cursos.nombre_i18n is
  'Como se llama el curso, en los idiomas del producto. Es el texto visible; la columna nombre queda como estaba, para lo que ya la leia.';

comment on column public.cursos.descripcion_i18n is
  'De que se trata el curso, en los idiomas del producto. Es la bajada de la tarjeta de la oferta.';

comment on column public.cursos.etiqueta is
  'El sello corto de la tarjeta, en los idiomas del producto. No es el nivel ni la modalidad, que salen de su vocabulario: es lo que la tarjeta destaca de ese curso.';

comment on column public.cursos.imagen is
  'Camino de la imagen de la tarjeta adentro del sitio. Relativo, nunca una direccion absoluta.';


-- --- 2. El contenido que hasta hoy vivía en el archivo --------------------
-- Los mismos seis textos que mostraba `data/catalogo-oferta.json`, en los
-- tres idiomas y sin cambiar ni una palabra: lo que se está haciendo es
-- mudar el contenido, no reescribirlo.
update public.cursos c
   set nombre_i18n      = x.nombre,
       descripcion_i18n = x.descripcion,
       etiqueta         = x.etiqueta,
       imagen           = x.imagen
  from (values
    ('introduccion',
     '{"es-AR": "Introducción al cuidado del adulto mayor", "en": "Introduction to caring for older adults", "pt-BR": "Introdução ao cuidado da pessoa idosa"}'::jsonb,
     '{"es-AR": "Conceptos fundamentales del envejecimiento, necesidades básicas y cómo acompañar a un familiar en el día a día.", "en": "Core concepts of ageing, basic needs and how to accompany a relative day by day.", "pt-BR": "Conceitos fundamentais do envelhecimento, necessidades básicas e como acompanhar um familiar no dia a dia."}'::jsonb,
     '{"es-AR": "Nivel básico", "en": "Basic level", "pt-BR": "Nível básico"}'::jsonb,
     'assets/images/monitoreo_cuidado.png'),
    ('demencias',
     '{"es-AR": "Alzheimer y otras demencias: qué esperar y cómo actuar", "en": "Alzheimer''s and other dementias: what to expect and how to act", "pt-BR": "Alzheimer e outras demências: o que esperar e como agir"}'::jsonb,
     '{"es-AR": "Guía práctica para entender el deterioro cognitivo, manejar situaciones difíciles y sostener la calidad de vida de la persona cuidada.", "en": "A practical guide to understanding cognitive impairment, handling difficult situations and sustaining the quality of life of the person being cared for.", "pt-BR": "Guia prático para entender o declínio cognitivo, lidar com situações difíceis e sustentar a qualidade de vida da pessoa cuidada."}'::jsonb,
     '{"es-AR": "Intermedio", "en": "Intermediate", "pt-BR": "Intermediário"}'::jsonb,
     'assets/images/acompanamiento_online.png'),
    ('bienestar_cuidador',
     '{"es-AR": "El bienestar de quien cuida", "en": "The wellbeing of whoever cares", "pt-BR": "O bem-estar de quem cuida"}'::jsonb,
     '{"es-AR": "Herramientas para prevenir el síndrome del cuidador, manejar el estrés y sostener la propia salud emocional.", "en": "Tools to prevent caregiver burnout syndrome, manage stress and sustain one''s own emotional health.", "pt-BR": "Ferramentas para prevenir a síndrome do cuidador, lidar com o estresse e sustentar a própria saúde emocional."}'::jsonb,
     '{"es-AR": "Bienestar", "en": "Wellbeing", "pt-BR": "Bem-estar"}'::jsonb,
     'assets/images/vida_activa.png'),
    ('medicamentos',
     '{"es-AR": "Administración de medicamentos y control de salud en el hogar", "en": "Administration of medicines and health monitoring at home", "pt-BR": "Administração de medicamentos e controle de saúde em casa"}'::jsonb,
     '{"es-AR": "Organizar la medicación, reconocer señales de alerta y coordinar con el equipo médico.", "en": "Organising medication, recognising warning signs and coordinating with the medical team.", "pt-BR": "Organizar a medicação, reconhecer sinais de alerta e coordenar com a equipe médica."}'::jsonb,
     '{"es-AR": "Salud", "en": "Health", "pt-BR": "Saúde"}'::jsonb,
     'assets/images/gestor_medicamentos.png'),
    ('comunicacion',
     '{"es-AR": "Comunicación empática con un familiar mayor", "en": "Empathetic communication with an older relative", "pt-BR": "Comunicação empática com um familiar idoso"}'::jsonb,
     '{"es-AR": "Técnicas de comunicación adaptadas al envejecimiento, cómo dar malas noticias y cómo manejar conflictos familiares.", "en": "Communication techniques adapted to ageing, how to give bad news and how to handle family conflicts.", "pt-BR": "Técnicas de comunicação adaptadas ao envelhecimento, como dar más notícias e como lidar com conflitos familiares."}'::jsonb,
     '{"es-AR": "Comunicación", "en": "Communication", "pt-BR": "Comunicação"}'::jsonb,
     'assets/images/asistente_telefono.png'),
    ('cuidados_avanzados',
     '{"es-AR": "Cuidados avanzados: pacientes postrados y cuidados paliativos", "en": "Advanced care: bedbound patients and palliative care", "pt-BR": "Cuidados avançados: pacientes acamados e cuidados paliativos"}'::jsonb,
     '{"es-AR": "Movilización, prevención de escaras, cuidados al final de la vida y acompañamiento emocional.", "en": "Moving and handling, prevention of pressure sores, end-of-life care and emotional companionship.", "pt-BR": "Mobilização, prevenção de escaras, cuidados no fim da vida e acompanhamento emocional."}'::jsonb,
     '{"es-AR": "Avanzado", "en": "Advanced", "pt-BR": "Avançado"}'::jsonb,
     'assets/images/hero_cuidadores.png')
  ) as x(clave, nombre, descripcion, etiqueta, imagen)
 where c.tenant_id is null
   and c.clave = x.clave;

-- Y el curso que carga una Prestadora: su texto, en su idioma. Es el mismo
-- reparto de la 0035, la 0038 y la 0041 —los tres idiomas para lo que
-- escribimos nosotros, el suyo para lo que escribe un cliente—, así que el
-- que ya estaba cargado entra por el mínimo y no queda afuera del `check`
-- de acá abajo.
update public.cursos
   set nombre_i18n      = jsonb_build_object('es-AR', nombre),
       descripcion_i18n = case when descripcion is null then null
                               else jsonb_build_object('es-AR', descripcion) end
 where tenant_id is not null
   and nombre_i18n is null;


-- --- 3. Y de acá en adelante no entra ninguno sin nombre ------------------
-- Las mismas dos funciones de la 0038: los tres idiomas para el catálogo
-- general, el suyo para el de una Prestadora.
alter table public.cursos alter column nombre_i18n set not null;

alter table public.cursos
  add constraint el_nombre_del_curso_esta_en_los_idiomas check (
    case when tenant_id is null then public.i18n_completo(nombre_i18n)
         else                        public.i18n_minimo(nombre_i18n) end);

alter table public.cursos
  add constraint la_descripcion_del_curso_esta_en_los_idiomas check (
    descripcion_i18n is null
    or case when tenant_id is null then public.i18n_completo(descripcion_i18n)
            else                        public.i18n_minimo(descripcion_i18n) end);

alter table public.cursos
  add constraint la_etiqueta_del_curso_esta_en_los_idiomas check (
    etiqueta is null
    or case when tenant_id is null then public.i18n_completo(etiqueta)
            else                        public.i18n_minimo(etiqueta) end);


-- --- 4. La vista que se ve sin sesión -------------------------------------
-- Corre con los permisos de quien la creó y no con los de quien la
-- consulta, que es lo que le deja mostrar las filas sin abrirle `cursos` a
-- `anon`. Por eso la condición va acá adentro y no en una política: es lo
-- único que separa lo que se publica de lo que no. Si algún día corriera
-- con los permisos de quien consulta, la vista devolvería cero filas y la
-- pantalla quedaría vacía —falla cerrada, que es la dirección segura—.
--
-- Las columnas tienen la forma que espera `js/catalogo.js`, igual que
-- `vocabularios_de` en la 0038: el nombre viaja como tres columnas porque
-- `Catalogo.texto()` lo busca en la raíz del ítem, y la descripción y la
-- etiqueta viajan enteras porque `Catalogo.campo()` ya resuelve el idioma
-- de un valor que trae sus tres idiomas colgando.
create or replace view public.oferta_de_cursos as
  select c.clave,
         c.nombre_i18n ->> 'es-AR' as "es-AR",
         c.nombre_i18n ->> 'en'    as "en",
         c.nombre_i18n ->> 'pt-BR' as "pt-BR",
         c.descripcion_i18n        as descripcion,
         c.etiqueta,
         c.horas,
         c.nivel,
         c.modalidad,
         c.otorga_certificado      as certificado,
         c.imagen,
         c.orden
    from public.cursos c
   where c.tenant_id is null
     and c.publicado;

comment on view public.oferta_de_cursos is
  'La oferta general de cursos del producto, la que se ve sin iniciar sesion. Dos condiciones, y las dos hacen falta: la fila es del catalogo general (tenant_id is null) y esta publicada. Nunca agregar aca una columna con el contenido del curso —lo que se estudia, sus evaluaciones, sus preguntas ni sus opciones—, ni una que diga de que Prestadora es la fila. El Desarrollador decidio el 31 de agosto de 2026 que la oferta de cursos se ve sin sesion, asi que todo lo que se agregue aca queda a la vista de cualquiera.';

revoke all on public.oferta_de_cursos from anon, authenticated;
grant select on public.oferta_de_cursos to anon;
grant select on public.oferta_de_cursos to authenticated;


notify pgrst, 'reload schema';
