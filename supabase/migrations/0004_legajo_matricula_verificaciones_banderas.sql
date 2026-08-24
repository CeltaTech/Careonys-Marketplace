-- =====================================================================
-- 0004 — El legajo crece: matrícula, estudios, experiencia, referencias,
--         verificaciones y las dos banderas de consentimiento
--
-- Hasta acá `caregivers` guardaba el legajo entero en una sola fila. Le
-- faltaban cuatro cosas que `docs/CATALOGO.md` y `docs/MODULOS.md` ya
-- describieron y que hoy sólo existen como JSON declarado, sin tabla:
--
--   1. Las cuatro fichas repetibles (`data/catalogo-fichas.json`): un
--      Asistente puede tener más de una Matrícula, más de un estudio, más
--      de una experiencia laboral, más de una referencia. Una columna
--      jsonb en `caregivers` no alcanza para eso con integridad real.
--   2. Las siete verificaciones y qué bloquea cada una
--      (`data/catalogo-verificaciones.json`, pendiente 20 resuelto el 24
--      de agosto de 2026): quién las controló, con qué resultado, y desde
--      cuándo corre el plazo de 15 días de los antecedentes penales.
--   3. Las dos banderas de consentimiento (`data/catalogo-banderas.json`,
--      pendientes 18 y 2): si el Asistente autorizó publicarse y si acepta
--      reemplazos urgentes. Arrancan sin marcar y así se guardan.
--   4. Documentación con vencimiento, genérica: lo que hoy piden
--      Matrícula y certificado de salud son casos del mismo patrón —un
--      papel que vence y que hay que volver a pedir—, y conviene una sola
--      tabla en vez de repetir la fecha de vencimiento en cada ficha.
--
-- Todo esto es Legajo del Asistente, Documentación y vencimientos, y
-- Verificación: los tres son módulos **compartidos** (`docs/MODULOS.md`),
-- así que ninguna tabla de acá sabe qué es un directorio ni una
-- postulación. Es quién es la persona, no cómo consiguió el trabajo.
--
-- Se sigue el mismo patrón de aislamiento que dejó la 0002: `tenant_id`
-- en cada tabla, política `using/with check (tenant_id =
-- public.prestadora_actual())`, nada visible para `anon`.
-- =====================================================================

-- --- 1. Matrícula ------------------------------------------------------
-- Organismo, número, vencimiento, archivo. Obligatoria para publicar
-- cuando `caregivers.profession` corresponde a un tipo que la exige
-- (`perfil_profesional.requiere_matricula` en el catálogo). Vencida
-- inhabilita para atender, en cualquier modalidad.
create table if not exists public.matriculas_asistente (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
    organismo     text not null,
    numero        text not null,
    vencimiento   date not null,
    archivo_url   text,
    verificada    boolean not null default false,
    created_at    timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.matriculas_asistente is
  'Ficha repetible: un Asistente puede tener más de una Matrícula. Ver data/catalogo-fichas.json.';

-- --- 2. Estudios ---------------------------------------------------------
create table if not exists public.estudios_asistente (
    id                 uuid primary key default gen_random_uuid(),
    tenant_id          uuid not null references public.tenants(id),
    caregiver_id       uuid not null references public.caregivers(id) on delete cascade,
    institucion        text not null,
    titulo_obtenido    text not null,
    en_curso           boolean not null default false,
    anio_finalizacion  integer,
    respalda_perfil    text,
    archivo_url        text,
    created_at         timestamp with time zone default timezone('utc'::text, now()),
    constraint anio_o_en_curso check (en_curso or anio_finalizacion is not null)
);

comment on table public.estudios_asistente is
  'Ficha repetible: instituciones y títulos. El archivo es obligatorio en la aplicación cuando respalda_perfil exige Matrícula — ver data/catalogo-fichas.json.';

-- --- 3. Experiencia laboral ----------------------------------------------
create table if not exists public.experiencia_laboral_asistente (
    id             uuid primary key default gen_random_uuid(),
    tenant_id      uuid not null references public.tenants(id),
    caregiver_id   uuid not null references public.caregivers(id) on delete cascade,
    puesto         text not null,
    puesto_otro    text,
    inicio         date not null,
    trabajo_actual boolean not null default false,
    fin            date,
    tareas         jsonb,
    detalle        text,
    created_at     timestamp with time zone default timezone('utc'::text, now()),
    constraint fin_o_actual check (trabajo_actual or fin is not null)
);

comment on table public.experiencia_laboral_asistente is
  'Ficha repetible. tareas usa las mismas listas (tarea_cuidado, tarea_hogar, tarea_acompanamiento) que el Asistente contesta sobre sí mismo, a propósito: permite cruzar lo que dice saber hacer con lo que dice haber hecho.';

-- --- 4. Referencias --------------------------------------------------------
-- Trae el dato de un tercero que no usa el sistema y no aceptó nada.
-- Nunca se muestra en el perfil público ni la ve ninguna Familia.
create table if not exists public.referencias_asistente (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
    nombre        text not null,
    telefono      text not null,
    relacion      text not null,
    comentarios   text,
    contactada    boolean not null default false,
    created_at    timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.referencias_asistente is
  'Datos de un tercero. No se expone jamás vía caregivers_publicos ni ninguna otra vista pública.';

-- --- 5. Documentación con vencimiento, genérica ----------------------------
-- Matrícula y salud ya tienen su propia fecha en su propia tabla; ésta es
-- para lo que no tiene ficha propia (hoy: antecedentes penales, y el
-- certificado de salud si no termina teniendo tabla propia — pendiente
-- «a confirmar» en docs/CATALOGO.md).
create table if not exists public.documentos_asistente (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
    tipo          text not null,
    archivo_url   text,
    presentado_el date,
    vencimiento   date,
    verificado    boolean not null default false,
    created_at    timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.documentos_asistente is
  'Documentación genérica con vencimiento. tipo referencia la clave de data/catalogo-verificaciones.json (ej. "penales", "salud").';

-- --- 6. Verificaciones -----------------------------------------------------
-- Qué se controló de un legajo y con qué resultado. plazo_vence_el sólo se
-- usa en los tipos que llevan plazo (hoy: antecedentes penales, 15 días
-- desde el alta — data/catalogo-verificaciones.json).
create table if not exists public.verificaciones_asistente (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null references public.tenants(id),
    caregiver_id    uuid not null references public.caregivers(id) on delete cascade,
    tipo            text not null,
    estado          text not null default 'pendiente'
                    check (estado in ('pendiente', 'presentado', 'verificado', 'rechazado', 'vencido')),
    plazo_vence_el  date,
    verificado_por  uuid references public.profiles(id),
    verificado_el   timestamp with time zone,
    created_at      timestamp with time zone default timezone('utc'::text, now()),
    unique (caregiver_id, tipo)
);

comment on table public.verificaciones_asistente is
  'Una fila por tipo de verificación y Asistente. tipo referencia data/catalogo-verificaciones.json: dni, penales, matricula, titulo, salud, domicilio, referencia.';

-- --- 7. Banderas de consentimiento ------------------------------------------
-- Las dos que quedaron tras sacar las que regalaban el negocio (pendiente
-- 18, 24 de agosto de 2026). Arrancan sin marcar y así se guardan: quien
-- cierra el alta sin tocarlas queda sin publicar.
create table if not exists public.banderas_asistente (
    caregiver_id          uuid primary key references public.caregivers(id) on delete cascade,
    tenant_id             uuid not null references public.tenants(id),
    perfil_publicado      boolean not null default false,
    disponible_urgencias  boolean not null default false,
    respondido_el         timestamp with time zone,
    created_at            timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.banderas_asistente is
  'Consentimiento de publicación. perfil_publicado en false es lo que impide que caregivers_publicos muestre a alguien que no dio permiso — pendiente 2.';

-- --- 8. RLS: mismo patrón que la 0002 ---------------------------------------
alter table public.matriculas_asistente          enable row level security;
alter table public.estudios_asistente            enable row level security;
alter table public.experiencia_laboral_asistente enable row level security;
alter table public.referencias_asistente         enable row level security;
alter table public.documentos_asistente          enable row level security;
alter table public.verificaciones_asistente      enable row level security;
alter table public.banderas_asistente            enable row level security;

create policy "Matriculas de la Prestadora" on public.matriculas_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Estudios de la Prestadora" on public.estudios_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Experiencia de la Prestadora" on public.experiencia_laboral_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Referencias de la Prestadora" on public.referencias_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Documentos de la Prestadora" on public.documentos_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Verificaciones de la Prestadora" on public.verificaciones_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Banderas de la Prestadora" on public.banderas_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

-- Ninguna de estas siete es visible para el rol anónimo. El directorio
-- pública sigue resolviéndose sólo por caregivers_publicos (0002 §5), que
-- todavía no filtra por banderas_asistente.perfil_publicado — eso es la
-- otra mitad del pendiente 2 y se hace en una migración aparte, cuando
-- exista la pantalla que escribe esta tabla.
revoke all on table public.matriculas_asistente          from anon;
revoke all on table public.estudios_asistente             from anon;
revoke all on table public.experiencia_laboral_asistente  from anon;
revoke all on table public.referencias_asistente          from anon;
revoke all on table public.documentos_asistente           from anon;
revoke all on table public.verificaciones_asistente       from anon;
revoke all on table public.banderas_asistente              from anon;

-- --- 9. Índices para las consultas obvias -----------------------------------
create index if not exists idx_matriculas_caregiver     on public.matriculas_asistente(caregiver_id);
create index if not exists idx_estudios_caregiver        on public.estudios_asistente(caregiver_id);
create index if not exists idx_experiencia_caregiver      on public.experiencia_laboral_asistente(caregiver_id);
create index if not exists idx_referencias_caregiver       on public.referencias_asistente(caregiver_id);
create index if not exists idx_documentos_caregiver         on public.documentos_asistente(caregiver_id);
create index if not exists idx_documentos_vencimiento         on public.documentos_asistente(vencimiento) where vencimiento is not null;
create index if not exists idx_verificaciones_caregiver         on public.verificaciones_asistente(caregiver_id);
create index if not exists idx_verificaciones_plazo               on public.verificaciones_asistente(plazo_vence_el) where plazo_vence_el is not null;
