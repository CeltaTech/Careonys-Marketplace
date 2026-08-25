-- ---------------------------------------------------------------------------
-- 0012 — Las autorizaciones se llaman autorizaciones, y la disponibilidad
--        tiene dónde guardarse
-- ---------------------------------------------------------------------------
-- Dos cosas que decidió el Desarrollador el 24 de agosto de 2026, en la misma
-- conversación:
--
--   1. **«Bandera» se va.** Era la traducción palabra por palabra de *flag*,
--      que en inglés de programación quiere decir «interruptor de sí o no».
--      Traducirla así no la pasa al castellano: la deja como jerga disfrazada.
--      En sus palabras: *«una bandera es una tela que identifica un país o un
--      ejército, pero nunca es una casilla»*. El nombre que eligió es
--      **autorizaciones**, que es lo que las preguntas del cierre del alta son:
--      la persona autoriza, o no autoriza.
--   2. **«Disponible para reemplazos urgentes» no es una autorización, es una
--      disponibilidad.** Ya lo decía el propio catálogo —la nota de
--      `modalidad_contratacion` en `data/catalogo-vocabularios.json`— y era el
--      pendiente 26. Se muda al módulo de Disponibilidad horaria, que
--      `docs/MODULOS.md:40` da por compartido desde antes de que existiera.
--
-- Con eso, el último paso del alta queda con una sola pregunta —publicar el
-- perfil, que es un consentimiento— y la disponibilidad queda entera en un
-- lugar: los días y turnos que la persona puede trabajar, y si acepta que se le
-- avise de un reemplazo que empieza en pocas horas.
--
-- **Las dos tablas nuevas son módulo compartido** (regla 12): son verdad sobre
-- un Asistente independientemente de cómo consiguió el trabajo. Por eso ninguna
-- de las dos sabe qué es un directorio, una postulación ni un aviso.
--
-- **Sobre correr esto dos veces, y sobre la base que nace de cero.** La lección
-- es de la 0011: una migración de renombre escrita sin cuidado hace fallar toda
-- base nueva, porque busca un nombre viejo que ahí nunca existió. Así que las
-- 0004, 0005 y 0007 quedaron corregidas —una base levantada hoy desde cero nace
-- con el nombre bueno— y todo lo que acá renombra o muda está envuelto en un
-- `if exists`. Los dos caminos terminan en el mismo lugar.
--
-- La grilla de 7 días por 3 turnos que el alta pregunta desde siempre y tiraba
-- sin avisar —pendiente 23— es lo que va a `franjas_asistente`: una fila por
-- casillero marcado. `dia` y `turno` guardan claves de los vocabularios
-- `dia_semana` y `turno` de `data/catalogo-vocabularios.json`, nunca la etiqueta
-- que se muestra.
-- ---------------------------------------------------------------------------

-- --- 1. El renombre ---------------------------------------------------------
do $bloque$
begin
  if exists (
    select 1 from pg_class
     where relname = 'banderas_asistente'
       and relnamespace = 'public'::regnamespace
  ) then
    alter table public.banderas_asistente rename to autorizaciones_asistente;
  end if;
end;
$bloque$;

comment on table public.autorizaciones_asistente is
  'Lo que el Asistente autoriza al cerrar el alta. perfil_publicado en false es lo que impide que caregivers_publicos muestre a alguien que no dio permiso — pendiente 2. Se llamaba banderas_asistente hasta la migración 0012.';

-- --- 2. Disponibilidad: una fila por Asistente -------------------------------
-- Lo general de su disponibilidad. Hoy guarda una sola cosa —si acepta
-- reemplazos urgentes— y por eso podría haber sido una columna de `caregivers`;
-- no lo es porque la Disponibilidad horaria es un módulo aparte y va a crecer
-- (preaviso mínimo, semanas de licencia, zona en la que acepta viajar).
create table if not exists public.disponibilidad_asistente (
    caregiver_id         uuid primary key references public.caregivers(id) on delete cascade,
    tenant_id            uuid not null references public.tenants(id),
    reemplazos_urgentes  boolean not null default false,
    respondido_el        timestamp with time zone,
    created_at           timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.disponibilidad_asistente is
  'Módulo compartido: Disponibilidad horaria (docs/MODULOS.md). Lo general. Los días y turnos concretos están en franjas_asistente, una fila cada uno.';

-- --- 3. Disponibilidad: una fila por día y turno -----------------------------
-- La grilla del paso 6 del alta. Una fila por casillero marcado, no un jsonb:
-- el día que haya que preguntar «quién puede los martes a la tarde», una fila
-- se busca con un índice y un jsonb se recorre entero.
create table if not exists public.franjas_asistente (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
    dia           text not null,
    turno         text not null,
    created_at    timestamp with time zone default timezone('utc'::text, now()),
    unique (caregiver_id, dia, turno)
);

comment on table public.franjas_asistente is
  'Módulo compartido: Disponibilidad horaria (docs/MODULOS.md). Una fila por casillero marcado de la grilla del alta. dia y turno guardan claves de los vocabularios dia_semana y turno, nunca la etiqueta.';

-- --- 4. La mudanza del dato --------------------------------------------------
-- Primero se aparta la vista del directorio. Postgres no deja sacar una columna
-- que algo esté mirando, y `caregivers_publicos` mira `disponible_urgencias`
-- desde la migración 0007. La vista se rehace entera en el punto 6, unas líneas
-- más abajo, así que borrarla acá no deja nada sin devolver: entre este renglón
-- y aquél no hay nadie consultando, porque toda la migración corre adentro de
-- una sola transacción.
drop view if exists public.caregivers_publicos;

-- Se copia antes de borrar, y sólo si la columna vieja todavía está. Lo que hay
-- hoy son respuestas de personas inventadas, pero el orden es el mismo que si
-- fueran reales: primero se guarda en el destino, después se saca del origen.
do $bloque$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'autorizaciones_asistente'
       and column_name  = 'disponible_urgencias'
  ) then
    insert into public.disponibilidad_asistente
           (caregiver_id, tenant_id, reemplazos_urgentes, respondido_el)
    select a.caregiver_id, a.tenant_id, a.disponible_urgencias, a.respondido_el
      from public.autorizaciones_asistente a
     on conflict (caregiver_id) do nothing;

    alter table public.autorizaciones_asistente drop column disponible_urgencias;
  end if;
end;
$bloque$;

-- --- 5. RLS con el mismo criterio que el resto del legajo --------------------
alter table public.disponibilidad_asistente enable row level security;
alter table public.franjas_asistente        enable row level security;

do $bloque$
declare
  t text;
begin
  foreach t in array array['disponibilidad_asistente', 'franjas_asistente'] loop
    -- `create policy` no admite «si no existe», así que se borra primero: es lo
    -- que hace que correr esta migración dos veces no falle.
    execute format('drop policy if exists "Legajo de la Prestadora, para su personal" on public.%I', t);
    execute format('drop policy if exists "Su propio legajo" on public.%I', t);

    execute format($sql$
      create policy "Legajo de la Prestadora, para su personal" on public.%I
        for all to authenticated
        using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
        with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());
    $sql$, t);

    execute format($sql$
      create policy "Su propio legajo" on public.%I
        for all to authenticated
        using      (caregiver_id = public.legajo_propio())
        with check (caregiver_id = public.legajo_propio()
                    and tenant_id = public.prestadora_actual());
    $sql$, t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end;
$bloque$;

create index if not exists idx_franjas_caregiver on public.franjas_asistente(caregiver_id);
create index if not exists idx_franjas_dia_turno on public.franjas_asistente(dia, turno);

-- --- 6. El directorio, con las dos tablas ------------------------------------
-- La vista se rehace porque cambian el nombre de una tabla y el de una columna.
-- `perfil_publicado` sigue siendo un `join` que exige la fila: sin respuesta no
-- hay publicación. La disponibilidad entra con `left join`, porque no haberla
-- contestado no puede esconder a nadie del directorio: se muestra como «no».
-- (La vista vieja ya se borró en el punto 4, porque estorbaba para sacar la
-- columna.)
create view public.caregivers_publicos as
  select c.id,
         c.tenant_id,
         c.full_name,
         c.profession,
         c.zone,
         c.pathologies,
         c.tasks,
         c.hourly_rate,
         c.gender,
         -- Camino dentro del depósito público `avatares`. Nunca una dirección
         -- firmada: esas vencen, y guardar una es guardar algo que deja de
         -- funcionar.
         c.documents->>'foto' as foto,
         coalesce(d.reemplazos_urgentes, false) as reemplazos_urgentes,
         c.created_at
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status in ('validado_prestadora', 'validado')
     and a.perfil_publicado;

comment on view public.caregivers_publicos is
  'Directorio de Asistentes. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo, y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera.';

grant select on public.caregivers_publicos to anon;
grant select on public.caregivers_publicos to authenticated;
