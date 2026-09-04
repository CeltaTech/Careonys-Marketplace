-- =====================================================================
-- 0072 — La oferta comercial vive en la base
--
-- Pendiente 7, la mitad que quedaba después de la 0051: los nueve
-- servicios de `data/catalogo-oferta.json` —Busco Asistente,
-- Acompañamiento online, Cursos, Monitoreo, Asistente virtual, Vida
-- activa, Gestor del cuidado, Productos para el hogar y Home— seguían
-- sólo en el archivo, sin tabla. Los cursos ya habían migrado (0008 y
-- 0051); esto hace lo mismo con el resto de la tarjeta de la portada.
--
-- POR QUÉ EL NOMBRE NO ES «servicios»
-- -----------------------------------
-- `docs/GLOSARIO_PRODUCTOS_CAREONYS.md` ya define «Servicio» como el
-- vínculo de prestación directa entre una Prestadora y un Cliente, con
-- Guardias colgando —«Cerrar un Servicio», «La guardia es una parte de
-- un Servicio»—. Esta modalidad no es prestación directa (`CLAUDE.md` de
-- este producto, §1) y no usa esa palabra. Lo que hay acá es la oferta
-- comercial de la portada —lo que se ve en `index.html` y en
-- `solicitar-asistente.html`—, que no tiene relación con Guardias ni con
-- Pacientes. Para no reusar sin más una palabra de negocio ya cargada
-- del lado compartido, lo guardado se llama `oferta_comercial`: el JSON
-- de origen sigue diciendo `"servicios"` puertas adentro —eso es
-- contenido, no esquema— y no se toca.
--
-- EL PATRÓN ES EL DE LA 0051
-- --------------------------
-- Catálogo general (`tenant_id` nulo) con sesión, y una vista sin sesión
-- para lo que hoy ya se ve sin iniciar sesión en la portada: `anon` no
-- tiene permiso de tabla desde la 0032, así que sin la vista no hay cómo
-- publicar esto. La vista da la forma exacta que espera
-- `js/catalogo.js` —el nombre como tres columnas sueltas, porque
-- `Catalogo.texto()` lo busca en la raíz del ítem—.
-- =====================================================================

-- --- 1. La tabla -----------------------------------------------------
create table if not exists public.oferta_comercial (
    id               uuid primary key default gen_random_uuid(),
    -- Nulo a propósito, igual que en cursos: es la oferta general de
    -- CeltaTech, no la de una Prestadora.
    tenant_id        uuid references public.tenants(id) on delete cascade,
    clave            text not null,
    nombre_i18n      jsonb not null,
    descripcion_i18n jsonb not null,
    estado           text not null default 'publicado'
      constraint el_estado_de_la_oferta_es_valido check (estado in ('publicado', 'proximamente')),
    imagen           text,
    enlace           text,
    -- El ancla del scroll en solicitar-asistente.html. Sólo la usan tres
    -- de los nueve.
    ancla            text,
    activo           boolean not null default true,
    orden            integer not null default 0,
    created_at       timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.oferta_comercial is
  'La oferta comercial de la portada (antes sólo en data/catalogo-oferta.json). tenant_id nulo = oferta general de CeltaTech. No es "Servicio" del glosario compartido: no hay Guardias ni prestación directa acá.';

create unique index if not exists idx_oferta_comercial_clave
  on public.oferta_comercial (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);

alter table public.oferta_comercial
  add constraint el_nombre_de_la_oferta_esta_en_los_idiomas check (
    case when tenant_id is null then public.i18n_completo(nombre_i18n)
         else                        public.i18n_minimo(nombre_i18n) end);

alter table public.oferta_comercial
  add constraint la_descripcion_de_la_oferta_esta_en_los_idiomas check (
    case when tenant_id is null then public.i18n_completo(descripcion_i18n)
         else                        public.i18n_minimo(descripcion_i18n) end);

-- --- 2. Los nueve, con el mismo texto que ya mostraba el archivo -----
insert into public.oferta_comercial
  (clave, nombre_i18n, descripcion_i18n, estado, imagen, enlace, ancla, orden)
values
  ('busco_asistente',
   '{"es-AR": "Busco Asistente", "en": "Looking for a Caregiver", "pt-BR": "Procuro um Assistente"}'::jsonb,
   '{"es-AR": "Acceso a Asistentes calificados, con herramientas para buscar y para gestionar el día a día del cuidado de un ser querido.", "en": "Access to qualified Caregivers, with tools to search for and to manage the day-to-day care of a loved one.", "pt-BR": "Acesso a Assistentes qualificados, com ferramentas para buscar e para gerenciar o dia a dia do cuidado de um ente querido."}'::jsonb,
   'publicado', 'assets/images/hero_cuidadores.png', 'solicitar-asistente.html', null, 0),

  ('acompanamiento_online',
   '{"es-AR": "Acompañamiento online", "en": "Online companionship", "pt-BR": "Acompanhamento online"}'::jsonb,
   '{"es-AR": "Orientación especializada para mejorar la calidad de vida de la persona cuidada y de su familia.", "en": "Specialised guidance to improve the quality of life of the person being cared for and of their family.", "pt-BR": "Orientação especializada para melhorar a qualidade de vida da pessoa cuidada e da sua família."}'::jsonb,
   'publicado', 'assets/images/acompanamiento_online.png', 'soporte-remoto.html', null, 1),

  ('cursos',
   '{"es-AR": "Cursos de cuidado", "en": "Care courses", "pt-BR": "Cursos de cuidado"}'::jsonb,
   '{"es-AR": "Cursos sobre el cuidado de personas mayores, con herramientas para entender el momento vital y para cuidar adecuadamente a quien lo necesita.", "en": "Courses on the care of older people, with tools to understand this stage of life and to care properly for whoever needs it.", "pt-BR": "Cursos sobre o cuidado de pessoas idosas, com ferramentas para entender este momento da vida e para cuidar adequadamente de quem precisa."}'::jsonb,
   'publicado', 'assets/images/cursos_familias.png', 'cursos.html', null, 2),

  ('monitoreo',
   '{"es-AR": "Monitoreo del cuidado", "en": "Monitoring of care", "pt-BR": "Monitoramento do cuidado"}'::jsonb,
   '{"es-AR": "Organización diaria del cuidado, para que no se lleve el tiempo que hace falta para lo esencial.", "en": "Day-to-day organisation of care, so that it does not take up the time needed for what matters most.", "pt-BR": "Organização diária do cuidado, para que não tome o tempo necessário para o essencial."}'::jsonb,
   'publicado', 'assets/images/monitoreo_cuidado.png', 'solicitar-asistente.html#monitoreo', 'monitoreo', 3),

  ('asistente_virtual',
   '{"es-AR": "Asistente virtual", "en": "Virtual assistant", "pt-BR": "Assistente virtual"}'::jsonb,
   '{"es-AR": "Respuestas a las dudas de quien cuida o acompaña a alguien.", "en": "Answers to the questions of whoever cares for or accompanies someone.", "pt-BR": "Respostas às dúvidas de quem cuida ou acompanha alguém."}'::jsonb,
   'publicado', 'assets/images/asistente_telefono.png', 'solicitar-asistente.html#asistente', 'asistente', 4),

  ('vida_activa',
   '{"es-AR": "Vida activa", "en": "Active life", "pt-BR": "Vida ativa"}'::jsonb,
   '{"es-AR": "Bienestar físico, psíquico y social de la persona mayor.", "en": "Physical, mental and social wellbeing of the older person.", "pt-BR": "Bem-estar físico, psíquico e social da pessoa idosa."}'::jsonb,
   'publicado', 'assets/images/vida_activa.png', 'solicitar-asistente.html#vida-activa', 'vida-activa', 5),

  ('gestor_cuidado',
   '{"es-AR": "Gestor del cuidado", "en": "Care manager", "pt-BR": "Gestor do cuidado"}'::jsonb,
   '{"es-AR": "Un especialista que ayuda a gestionar y monitorear todo el cuidado en el domicilio.", "en": "A specialist who helps to manage and monitor all the care at the home.", "pt-BR": "Um especialista que ajuda a gerenciar e monitorar todo o cuidado no domicílio."}'::jsonb,
   'publicado', 'assets/images/gestor_medicamentos.png', 'solicitar-asistente.html#gestor', null, 6),

  ('productos_hogar',
   '{"es-AR": "Productos para el hogar", "en": "Products for the home", "pt-BR": "Produtos para a casa"}'::jsonb,
   '{"es-AR": "Provisión de alimentos y servicios en el domicilio.", "en": "Supply of food and services at the home.", "pt-BR": "Fornecimento de alimentos e serviços no domicílio."}'::jsonb,
   'proximamente', null, null, null, 7),

  ('home',
   '{"es-AR": "Home", "en": "Home", "pt-BR": "Home"}'::jsonb,
   '{"es-AR": "Circuito de dispositivos integrados para el monitoreo en el domicilio.", "en": "A circuit of connected devices for monitoring at the home.", "pt-BR": "Circuito de dispositivos integrados para o monitoramento no domicílio."}'::jsonb,
   'proximamente', null, null, null, 8)
on conflict do nothing;

-- --- 3. Permisos y RLS -------------------------------------------------
alter table public.oferta_comercial enable row level security;

create policy "Oferta comercial general y de la Prestadora" on public.oferta_comercial
  for select to authenticated
  using (tenant_id is null or tenant_id = public.prestadora_actual());

revoke insert, update, delete, truncate on public.oferta_comercial from anon, authenticated;
revoke all on public.oferta_comercial from anon;

-- --- 4. La vista que se ve sin sesión -----------------------------------
-- Es la misma tarjeta que hoy dibuja index.html leyendo el JSON: corre
-- con los permisos de quien la creó, así que puede mostrar la tabla sin
-- abrírsela a `anon` (mismo motivo que `oferta_de_cursos`, 0051).
create or replace view public.oferta_comercial_publica as
  select o.clave,
         o.nombre_i18n ->> 'es-AR' as "es-AR",
         o.nombre_i18n ->> 'en'    as "en",
         o.nombre_i18n ->> 'pt-BR' as "pt-BR",
         o.descripcion_i18n        as descripcion,
         o.estado,
         o.imagen,
         o.enlace,
         o.ancla,
         o.orden
    from public.oferta_comercial o
   where o.tenant_id is null
     and o.activo;

comment on view public.oferta_comercial_publica is
  'La oferta comercial de la portada, la que se ve sin iniciar sesión. Misma condición que oferta_de_cursos: catálogo general (tenant_id is null) y activa. Nunca agregar acá una columna que diga de qué Prestadora es la fila.';

revoke all on public.oferta_comercial_publica from anon, authenticated;
grant select on public.oferta_comercial_publica to anon;
grant select on public.oferta_comercial_publica to authenticated;


notify pgrst, 'reload schema';
