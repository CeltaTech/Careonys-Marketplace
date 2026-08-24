-- =====================================================================
-- 0008 — Cursos, evaluaciones y un examen que se corrige del lado del
--         servidor
--
-- Qué estaba mal
-- --------------
-- El examen de `cursos.html` aprobaba siempre. Su formulario avisaba
-- «aprobado con 100%» sin mirar una sola respuesta, y de paso anunciaba
-- 250 puntos de reputación y una insignia de certificación acreditada.
-- Las dos respuestas correctas estaban además escritas en el HTML, con
-- `value="1"`, y eran siempre la primera opción.
--
-- Eso no es un examen flojo: es una credencial de confianza fabricada
-- sobre alguien que va a entrar a una casa a cuidar a una persona. Es el
-- pendiente 3.
--
-- Qué hace esta migración
-- -----------------------
-- Mueve la corrección al único lugar donde no la puede tocar quien
-- rinde. La respuesta correcta vive en `opciones_pregunta.es_correcta`,
-- una columna que **no tiene permiso de lectura para nadie**: ni para el
-- visitante anónimo ni para la sesión iniciada. El navegador lee las
-- preguntas por una vista que no la incluye, manda lo que contestó, y el
-- resultado se lo devuelve la base.
--
-- Y nadie puede escribir un intento aprobado a mano: `intentos_evaluacion`
-- no tiene política de inserción. La única puerta es
-- `public.rendir_evaluacion()`, que corrige antes de guardar.
--
-- Dónde encaja
-- ------------
-- «Cursos y certificaciones» es un módulo **compartido** (`docs/MODULOS.md`):
-- un curso aprobado dice algo de la persona, no de cómo consiguió el
-- trabajo, y vale igual en prestación directa. Por eso ninguna tabla de
-- acá sabe qué es un directorio, y por eso **no hay ninguna columna de
-- puntos de reputación**: cuánto vale un curso aprobado y en qué orden se
-- muestran los Asistentes es una decisión de esta modalidad y se queda
-- afuera del módulo compartido (`docs/MODULOS.md`, «El puntaje se parte en
-- dos»). Lo que se guarda acá es lo que la persona acreditó.
--
-- El catálogo tiene dos niveles, como el de tipos de Asistente: con
-- `tenant_id` nulo el curso es de la oferta general de CeltaTech y lo ven
-- todas las Prestadoras; con `tenant_id` cargado es propio de esa
-- Prestadora y no sale de ahí.
--
-- El contenido sale de `data/catalogo-oferta.json`, que hasta hoy no lo
-- leía ninguna pantalla ni ninguna tabla.
-- =====================================================================

-- --- 1. La oferta de cursos ------------------------------------------
create table if not exists public.cursos (
    id            uuid primary key default gen_random_uuid(),
    -- Nulo a propósito: es la oferta general de CeltaTech, que no es de
    -- ninguna Prestadora. Cargado, el curso es propio de esa Prestadora.
    tenant_id     uuid references public.tenants(id) on delete cascade,
    clave         text not null,
    nombre        text not null,
    descripcion   text,
    horas         integer,
    nivel         text,
    modalidad     text,
    otorga_certificado boolean not null default false,
    publicado     boolean not null default true,
    orden         integer not null default 0,
    created_at    timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.cursos is
  'Oferta de cursos. tenant_id nulo = oferta general de CeltaTech; cargado = curso propio de esa Prestadora. Módulo compartido: sirve igual en prestación directa.';

-- La clave es única dentro de su nivel. `coalesce` porque en un índice
-- único dos nulos no chocan, y sin esto la oferta general admitiría dos
-- cursos con la misma clave.
create unique index if not exists idx_cursos_clave
  on public.cursos (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);

-- --- 2. La evaluación -------------------------------------------------
create table if not exists public.evaluaciones (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid references public.tenants(id) on delete cascade,
    -- Nulo mientras la evaluación no cuelgue de ningún curso, que es el
    -- caso de la única que hay hoy: es una prueba de competencias
    -- general, no el cierre de un curso.
    curso_id      uuid references public.cursos(id) on delete set null,
    clave         text not null,
    nombre        text not null,
    -- Cuánto hay que contestar bien para aprobar, en porcentaje. Es
    -- configuración, no una constante escondida en el código (regla 5.1).
    porcentaje_para_aprobar integer not null default 70
      constraint porcentaje_valido check (porcentaje_para_aprobar between 1 and 100),
    -- Cuántas veces se puede rendir. Nulo = sin tope. Importa: con pocas
    -- preguntas y pocas opciones, rendir sin límite es aprobar por
    -- insistencia, y entonces el resultado no acredita nada.
    intentos_maximos integer
      constraint intentos_positivos check (intentos_maximos is null or intentos_maximos > 0),
    publicado     boolean not null default true,
    created_at    timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.evaluaciones is
  'Evaluación de una competencia. Sin columna de puntos de reputación a propósito: cuánto vale aprobarla es decisión de la modalidad, no del legajo (docs/MODULOS.md).';

create unique index if not exists idx_evaluaciones_clave
  on public.evaluaciones (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);

-- --- 3. Preguntas y opciones -----------------------------------------
create table if not exists public.preguntas_evaluacion (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid references public.tenants(id) on delete cascade,
    evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
    clave         text not null,
    enunciado     text not null,
    orden         integer not null default 0
);

comment on table public.preguntas_evaluacion is
  'Enunciados de una evaluación. El enunciado sí viaja al navegador; la respuesta correcta no (ver opciones_pregunta).';

create table if not exists public.opciones_pregunta (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid references public.tenants(id) on delete cascade,
    pregunta_id   uuid not null references public.preguntas_evaluacion(id) on delete cascade,
    clave         text not null,
    texto         text not null,
    -- ESTA COLUMNA NO SALE DE LA BASE. Más abajo se le quita el permiso
    -- de lectura a todo el mundo y se publica una vista sin ella. Si
    -- alguna vez se agrega un `grant select` sobre esta tabla, el examen
    -- vuelve a ser el de antes: la respuesta escrita en el navegador.
    es_correcta   boolean not null default false,
    orden         integer not null default 0
);

comment on table public.opciones_pregunta is
  'Opciones de una pregunta. es_correcta no se lee desde la aplicación: se consulta sólo adentro de rendir_evaluacion(). Nunca dar select sobre esta tabla.';

create index if not exists idx_preguntas_evaluacion on public.preguntas_evaluacion(evaluacion_id);
create index if not exists idx_opciones_pregunta    on public.opciones_pregunta(pregunta_id);

-- --- 4. Los intentos --------------------------------------------------
create table if not exists public.intentos_evaluacion (
    id                   uuid primary key default gen_random_uuid(),
    tenant_id            uuid not null references public.tenants(id) on delete cascade,
    caregiver_id         uuid not null references public.caregivers(id) on delete cascade,
    evaluacion_id        uuid not null references public.evaluaciones(id) on delete cascade,
    -- Lo que contestó, tal cual. Sirve para revisar un reclamo sin tener
    -- que creerle al resultado.
    respuestas           jsonb not null,
    respuestas_correctas integer not null,
    preguntas_totales    integer not null,
    porcentaje           integer not null,
    aprobado             boolean not null,
    rendido_el           timestamp with time zone not null default timezone('utc'::text, now())
);

comment on table public.intentos_evaluacion is
  'Todos los intentos, aprobados y no. Se guardan todos a propósito: dos intentos fallidos antes del bueno son parte de lo que la Prestadora tiene que poder ver.';

create index if not exists idx_intentos_caregiver  on public.intentos_evaluacion(caregiver_id);
create index if not exists idx_intentos_evaluacion on public.intentos_evaluacion(evaluacion_id);

-- --- 5. Permisos y RLS ------------------------------------------------
alter table public.cursos               enable row level security;
alter table public.evaluaciones         enable row level security;
alter table public.preguntas_evaluacion enable row level security;
alter table public.opciones_pregunta    enable row level security;
alter table public.intentos_evaluacion  enable row level security;

-- El catálogo se lee con sesión iniciada, y cada quien ve la oferta
-- general más la de su Prestadora. Nunca la de otra.
create policy "Cursos generales y de la Prestadora" on public.cursos
  for select to authenticated
  using (tenant_id is null or tenant_id = public.prestadora_actual());

create policy "Evaluaciones generales y de la Prestadora" on public.evaluaciones
  for select to authenticated
  using (publicado and (tenant_id is null or tenant_id = public.prestadora_actual()));

create policy "Preguntas generales y de la Prestadora" on public.preguntas_evaluacion
  for select to authenticated
  using (tenant_id is null or tenant_id = public.prestadora_actual());

-- `opciones_pregunta` no lleva política de lectura, y además se le quita
-- el permiso: la RLS filtra filas, no columnas, así que una política
-- permisiva acá dejaría salir `es_correcta` igual.
revoke all on public.opciones_pregunta from anon;
revoke all on public.opciones_pregunta from authenticated;

-- Ver un intento: el propio Asistente el suyo, el personal de la
-- Prestadora los de su Prestadora. Nadie más, y de otra Prestadora nunca.
create policy "Intentos propios y de la Prestadora" on public.intentos_evaluacion
  for select to authenticated
  using (
    caregiver_id = public.legajo_propio()
    or (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  );

-- No hay política de inserción, de modificación ni de borrado, y es el
-- punto entero de esta migración: un intento aprobado no se escribe, se
-- gana. La única puerta es rendir_evaluacion().
--
-- Y además se le quita el permiso. Este proyecto tiene privilegios por
-- omisión que le dan todo sobre cada tabla nueva a `anon` y a
-- `authenticated` (`0001_esquema_inicial.sql`), así que sin esto la única
-- traba sería la RLS. Sobre la tabla que decide si alguien está
-- capacitado para cuidar a una persona, una traba sola es poca.
revoke insert, update, delete, truncate on public.cursos               from anon, authenticated;
revoke insert, update, delete, truncate on public.evaluaciones         from anon, authenticated;
revoke insert, update, delete, truncate on public.preguntas_evaluacion from anon, authenticated;
revoke insert, update, delete, truncate on public.intentos_evaluacion  from anon, authenticated;

-- --- 6. La vista que sí puede ver el navegador ------------------------
-- Las opciones sin la respuesta. Corre con los permisos del dueño, que es
-- lo que le deja leer una tabla a la que la sesión no tiene acceso; el
-- filtro por Prestadora va escrito adentro, porque una vista así no
-- hereda la RLS de la tabla de abajo.
create or replace view public.opciones_para_responder as
  select o.id,
         o.pregunta_id,
         o.clave,
         o.texto,
         o.orden
    from public.opciones_pregunta o
   where o.tenant_id is null or o.tenant_id = public.prestadora_actual();

comment on view public.opciones_para_responder is
  'Las opciones tal como las ve quien rinde: sin es_correcta. Nunca agregar esa columna acá.';

-- Se revoca a los dos antes de dar el permiso: los privilegios por
-- omisión ya le habían dado todo a `authenticated`, y lo único que tiene
-- que poder hacer con esta vista es leerla.
revoke all on public.opciones_para_responder from anon;
revoke all on public.opciones_para_responder from authenticated;
grant select on public.opciones_para_responder to authenticated;

-- --- 7. La corrección -------------------------------------------------
-- `security definer` porque tiene que leer `es_correcta`, que es
-- justamente lo que nadie más puede leer, y escribir en una tabla que no
-- acepta inserciones de nadie. Sin permiso para el anónimo: el esquema
-- `public` se publica como direcciones web, y una función así al alcance
-- de cualquiera con la clave pública sería una puerta abierta.
--
-- `p_respuestas` es un objeto: la clave es el identificador de la
-- pregunta y el valor el de la opción elegida. Lo que no esté contestado
-- cuenta como incorrecto, sin aviso especial: no contestar es no saber.
create or replace function public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $funcion$
declare
  v_legajo      uuid;
  v_prestadora  uuid;
  v_minimo      integer;
  v_tope        integer;
  v_rendidos    integer;
  v_total       integer;
  v_correctas   integer;
  v_porcentaje  integer;
  v_aprobado    boolean;
begin
  v_legajo     := public.legajo_propio();
  v_prestadora := public.prestadora_actual();

  -- Rinde una persona con legajo, no una cuenta cualquiera: el resultado
  -- se guarda contra el legajo y sin legajo no hay dónde guardarlo.
  if v_legajo is null then
    raise exception 'sin_legajo';
  end if;

  select e.porcentaje_para_aprobar, e.intentos_maximos
    into v_minimo, v_tope
    from public.evaluaciones e
   where e.id = p_evaluacion
     and e.publicado
     and (e.tenant_id is null or e.tenant_id = v_prestadora);

  if not found then
    raise exception 'evaluacion_inexistente';
  end if;

  if v_tope is not null then
    select count(*) into v_rendidos
      from public.intentos_evaluacion i
     where i.evaluacion_id = p_evaluacion
       and i.caregiver_id = v_legajo;
    if v_rendidos >= v_tope then
      raise exception 'sin_intentos';
    end if;
  end if;

  select count(*) into v_total
    from public.preguntas_evaluacion p
   where p.evaluacion_id = p_evaluacion;

  -- Una evaluación sin preguntas aprobaría a todo el mundo con un 0 de 0.
  -- Antes que eso, falla.
  if v_total = 0 then
    raise exception 'evaluacion_vacia';
  end if;

  select count(*) into v_correctas
    from public.preguntas_evaluacion p
    join public.opciones_pregunta o
      on o.pregunta_id = p.id
     and o.id::text = p_respuestas->>(p.id::text)
   where p.evaluacion_id = p_evaluacion
     and o.es_correcta;

  v_porcentaje := round(v_correctas * 100.0 / v_total);
  v_aprobado   := v_porcentaje >= v_minimo;

  insert into public.intentos_evaluacion
    (tenant_id, caregiver_id, evaluacion_id, respuestas,
     respuestas_correctas, preguntas_totales, porcentaje, aprobado)
  values
    (v_prestadora, v_legajo, p_evaluacion, p_respuestas,
     v_correctas, v_total, v_porcentaje, v_aprobado);

  -- Se devuelve el total y nada más. Decir cuáles estuvieron mal es, con
  -- dos opciones por pregunta, decir cuál era la correcta.
  return jsonb_build_object(
    'aprobado', v_aprobado,
    'porcentaje', v_porcentaje,
    'respuestas_correctas', v_correctas,
    'preguntas_totales', v_total,
    'porcentaje_para_aprobar', v_minimo
  );
end;
$funcion$;

revoke all on function public.rendir_evaluacion(uuid, jsonb) from public;
revoke all on function public.rendir_evaluacion(uuid, jsonb) from anon;
grant execute on function public.rendir_evaluacion(uuid, jsonb) to authenticated;

comment on function public.rendir_evaluacion(uuid, jsonb) is
  'Corrige y guarda el intento. Es la única forma de que aparezca una fila en intentos_evaluacion.';

-- --- 8. La oferta que hasta hoy vivía en un archivo -------------------
-- Los seis cursos y la evaluación de `data/catalogo-oferta.json`, con
-- `tenant_id` nulo: son de la oferta general y los ven todas las
-- Prestadoras. `on conflict do nothing` para que volver a aplicar la
-- migración no duplique nada.
insert into public.cursos (tenant_id, clave, nombre, descripcion, horas, nivel, modalidad, otorga_certificado, orden)
values
  (null, 'introduccion', 'Introducción al cuidado del adulto mayor',
   'Conceptos fundamentales del envejecimiento, necesidades básicas y cómo acompañar a un familiar en el día a día.',
   8, 'basico', 'online', true, 1),
  (null, 'demencias', 'Alzheimer y otras demencias: qué esperar y cómo actuar',
   'Guía práctica para entender el deterioro cognitivo, manejar situaciones difíciles y sostener la calidad de vida de la persona cuidada.',
   12, 'intermedio', 'online', true, 2),
  (null, 'bienestar_cuidador', 'El bienestar de quien cuida',
   'Herramientas para prevenir el síndrome del cuidador, manejar el estrés y sostener la propia salud emocional.',
   6, 'basico', 'online', true, 3),
  (null, 'medicamentos', 'Administración de medicamentos y control de salud en el hogar',
   'Organizar la medicación, reconocer señales de alerta y coordinar con el equipo médico.',
   5, 'intermedio', 'online', true, 4),
  (null, 'comunicacion', 'Comunicación empática con un familiar mayor',
   'Técnicas de comunicación adaptadas al envejecimiento, cómo dar malas noticias y cómo manejar conflictos familiares.',
   4, 'basico', 'online', true, 5),
  (null, 'cuidados_avanzados', 'Cuidados avanzados: pacientes postrados y cuidados paliativos',
   'Movilización, prevención de escaras, cuidados al final de la vida y acompañamiento emocional.',
   16, 'avanzado', 'online', true, 6)
on conflict do nothing;

-- Los 250 puntos de reputación que el archivo declara no se cargan acá:
-- no tienen columna en este módulo, y a propósito (ver el encabezado).
insert into public.evaluaciones (tenant_id, clave, nombre, porcentaje_para_aprobar, intentos_maximos)
values (null, 'gerontologico_primeros_auxilios',
        'Cuidado gerontológico y primeros auxilios', 100, 3)
on conflict do nothing;

insert into public.preguntas_evaluacion (tenant_id, evaluacion_id, clave, enunciado, orden)
select null, e.id, v.clave, v.enunciado, v.orden
  from public.evaluaciones e,
       (values
         ('posicion_alimentacion',
          '¿Cuál es la posición recomendada para alimentar a un paciente postrado?', 1),
         ('baja_presion',
          'Ante una baja repentina de presión en un adulto mayor, ¿qué corresponde hacer?', 2)
       ) as v(clave, enunciado, orden)
 where e.clave = 'gerontologico_primeros_auxilios'
   and e.tenant_id is null
   and not exists (select 1 from public.preguntas_evaluacion p
                    where p.evaluacion_id = e.id and p.clave = v.clave);

insert into public.opciones_pregunta (tenant_id, pregunta_id, clave, texto, es_correcta, orden)
select null, p.id, v.clave, v.texto, v.es_correcta, v.orden
  from public.preguntas_evaluacion p
  join public.evaluaciones e on e.id = p.evaluacion_id
       and e.clave = 'gerontologico_primeros_auxilios'
       and e.tenant_id is null,
       (values
         -- El orden no es el del archivo. En `data/catalogo-oferta.json` la
         -- correcta figura primera en las dos preguntas, y el examen viejo la
         -- mostraba así: la primera opción era siempre la buena. Acá se
         -- alterna, porque un patrón que se puede adivinar sin leer la
         -- pregunta convierte el examen en otra cosa.
         ('posicion_alimentacion', 'fowler', 'Posición Fowler (semisentado, 45 a 90°)', true, 1),
         ('posicion_alimentacion', 'acostado', 'Completamente acostado', false, 2),
         ('baja_presion', 'caminar', 'Hacerlo caminar rápidamente', false, 1),
         ('baja_presion', 'trendelenburg', 'Recostarlo y elevarle las piernas a 45° (Trendelenburg)', true, 2)
       ) as v(pregunta, clave, texto, es_correcta, orden)
 where p.clave = v.pregunta
   and not exists (select 1 from public.opciones_pregunta o
                    where o.pregunta_id = p.id and o.clave = v.clave);
