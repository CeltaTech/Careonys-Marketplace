-- ---------------------------------------------------------------------------
-- 0064 — EL MOTIVO DE LA RESOLUCIÓN QUEDA ESCRITO, Y NO EN EL LEGAJO
--
-- Era el pendiente 90. La pantalla de la Prestadora pide la nota de la
-- entrevista —el motivo por el que se otorga el aval o se rechaza el legajo—,
-- el cliente de datos la mandaba como `notaPrestadora`, y ahí se terminaba: no
-- había ninguna columna donde pudiera caer, así que se descartaba con un aviso
-- en la consola. La decisión más crítica del producto —la que publica a una
-- persona en el directorio, o la que le cierra la puerta— se guardaba **sin el
-- porqué**, y la pantalla le hacía creer a quien lo escribió que había quedado.
--
-- POR QUÉ UNA TABLA APARTE Y NO UNA COLUMNA EN `caregivers`
--
-- El motivo lo escribe el personal de la Prestadora **sobre** una persona, y esa
-- persona no lo tiene que poder leer. En `caregivers` no hay forma de sostener
-- eso: la política que le deja al Asistente ser dueño de su propio legajo le
-- deja ver su fila entera, y una columna nueva viaja adentro de esa fila el
-- mismo día que se crea. Acá el aislamiento es de la tabla: la lee y la escribe
-- el personal de su Prestadora, y nadie más — el Aspirante no le llega ni
-- pidiéndola por su identificador.
--
-- Y es historial, no un campo: un legajo puede resolverse más de una vez, y
-- cada resolución tiene su motivo, su fecha y su firma. Una columna guarda la
-- última y borra las anteriores.
--
-- TRES DECISIONES QUE NO SON OBVIAS
--
--   * **El motivo no puede estar vacío.** Es la mitad de la condición de cierre
--     del pendiente: «que no se pueda resolver un legajo sin dejarla». La otra
--     mitad la pone la pantalla, que no deja apretar el botón sin escribir; ésta
--     es la que sigue valiendo cuando alguien llama por afuera de la pantalla.
--   * **Quién resolvió lo escribe la base**, con `auth.uid()`, igual que la
--     huella de las verificaciones (0060). Lo que manda el navegador lo elige
--     quien llama: nada le impediría al personal dejarle a un compañero la firma
--     de una decisión que tomó otro.
--   * **Nadie modifica ni borra una resolución.** No se conceden `update` ni
--     `delete`, y no hay política que los ampare. El motivo de una decisión que
--     se puede reescribir después no explica nada; si la resolución cambia, se
--     resuelve otra vez y queda la nueva al lado de la vieja.
--
-- Y LAS DOS ESCRITURAS VAN JUNTAS O NO VAN
--
-- Resolver un legajo son dos cosas: el estado del legajo y el motivo. Hechas en
-- dos pedidos, la segunda puede fallar y dejar el legajo resuelto sin porqué,
-- que es exactamente el agujero que esta migración viene a tapar. Por eso las
-- hace una función, `resolver_legajo`, que corre adentro de una sola
-- transacción: entra entera o no entra.
--
-- **No es `security definer`, y es a propósito.** Corre con los permisos de
-- quien llama, así que las dos escrituras las siguen gobernando las políticas de
-- siempre: quien no es personal de esa Prestadora no resuelve nada, y el error
-- que recibe es el mismo que recibiría escribiendo derecho contra la tabla.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. La tabla ────────────────────────────────────────────────────────────
create table if not exists public.resoluciones_legajo (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null
                     default public.prestadora_actual()
                     references public.tenants(id) on delete cascade,
  caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
  estado        text not null check (length(btrim(estado)) > 0),
  motivo        text not null check (length(btrim(motivo)) > 0),
  resuelto_por  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table public.resoluciones_legajo is
  'Cada vez que la Prestadora resuelve un legajo —otorga el aval o lo rechaza— queda acá una fila con el motivo, la fecha y quién firmó. Es historial: la resolución nueva se agrega, no pisa a la anterior. La lee y la escribe sólo el personal de la Prestadora; el Asistente juzgado no le llega.';

comment on column public.resoluciones_legajo.estado is
  'El estado en el que quedó el legajo con esta resolución. Es el mismo valor que `caregivers.verification_status`, y lo escriben juntos `resolver_legajo` para que no puedan discrepar.';

comment on column public.resoluciones_legajo.motivo is
  'Lo que escribió el personal de la Prestadora al resolver. No puede quedar vacío: una resolución sin motivo es la falla que esta tabla vino a tapar.';

comment on column public.resoluciones_legajo.resuelto_por is
  'Quién firmó. Lo pone la base con `auth.uid()`, nunca el pedido.';

-- Lo que se pregunta siempre es «las resoluciones de este legajo, la última
-- primero», que es como las muestra la pantalla.
create index if not exists resoluciones_legajo_por_legajo
  on public.resoluciones_legajo (caregiver_id, created_at desc);


-- ── 2. El aislamiento ──────────────────────────────────────────────────────
alter table public.resoluciones_legajo enable row level security;

-- Leer: sólo el personal de la Prestadora dueña de la fila. El Asistente
-- juzgado no entra por ninguna puerta — no hay política que lo nombre.
drop policy if exists "Resoluciones del legajo, las lee la Prestadora" on public.resoluciones_legajo;
create policy "Resoluciones del legajo, las lee la Prestadora" on public.resoluciones_legajo
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and public.es_personal_de_prestadora());

-- Escribir: lo mismo, y además el legajo resuelto tiene que ser de esa misma
-- Prestadora. Sin esa segunda condición, el personal de una podría dejar una
-- resolución con su propia Prestadora escrita encima del legajo de otra: la
-- fila quedaría bien aislada y hablando de alguien que no es suyo.
drop policy if exists "Resoluciones del legajo, las escribe la Prestadora" on public.resoluciones_legajo;
create policy "Resoluciones del legajo, las escribe la Prestadora" on public.resoluciones_legajo
  for insert to authenticated
  with check (tenant_id = public.prestadora_actual()
              and public.es_personal_de_prestadora()
              and exists (
                select 1
                  from public.caregivers c
                 where c.id = caregiver_id
                   and c.tenant_id = public.prestadora_actual()
              ));

-- Ni `update` ni `delete`: una resolución no se corrige, se vuelve a tomar.
-- Los verbos se escriben uno por uno, nunca `all` (0032).
grant select, insert on public.resoluciones_legajo to authenticated;


-- ── 3. La firma la pone la base ────────────────────────────────────────────
create or replace function public.la_resolucion_dice_quien_la_firmo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.resuelto_por := auth.uid();
  return new;
end;
$$;

comment on function public.la_resolucion_dice_quien_la_firmo() is
  'Sobre `resoluciones_legajo`: quién resolvió lo pone la base con `auth.uid()`, no el pedido. Con la sesión vacía —una siembra, o la llave del servidor— no toca nada, porque ahí no hay nadie a quien atribuirle la firma. Parte del pendiente 90.';

-- PostgREST no publica las funciones que devuelven `trigger`, pero Postgres le
-- concede la ejecución a `PUBLIC` por omisión, y revocarle a `PUBLIC` no alcanza
-- para sacársela a `anon`: es una concesión aparte. El disparador funciona
-- igual, porque el permiso de llamada se verifica al crearlo (0060).
revoke all on function public.la_resolucion_dice_quien_la_firmo() from public, anon, authenticated;

drop trigger if exists la_resolucion_dice_quien_la_firmo on public.resoluciones_legajo;

create trigger la_resolucion_dice_quien_la_firmo
  before insert on public.resoluciones_legajo
  for each row
  execute function public.la_resolucion_dice_quien_la_firmo();


-- ── 4. Resolver un legajo es una sola operación ────────────────────────────
create or replace function public.resolver_legajo(
  p_caregiver_id uuid,
  p_estado       text,
  p_motivo       text
)
returns public.resoluciones_legajo
language plpgsql
set search_path = public
as $$
declare
  v_resolucion public.resoluciones_legajo;
begin
  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'resolucion_sin_motivo';
  end if;
  if p_estado is null or length(btrim(p_estado)) = 0 then
    raise exception 'resolucion_sin_estado';
  end if;

  insert into public.resoluciones_legajo (caregiver_id, estado, motivo)
  values (p_caregiver_id, btrim(p_estado), btrim(p_motivo))
  returning * into v_resolucion;

  update public.caregivers
     set verification_status = btrim(p_estado)
   where id = p_caregiver_id;

  -- Si la política de `caregivers` no dejó tocar esa fila, el `update` no falla:
  -- no encuentra ninguna. Dar por resuelto un legajo que no se movió sería
  -- justo la mentira que este pendiente vino a sacar, así que se planta y la
  -- transacción entera se va atrás, resolución incluida.
  if not found then
    raise exception 'resolucion_sin_legajo';
  end if;

  return v_resolucion;
end;
$$;

comment on function public.resolver_legajo(uuid, text, text) is
  'Resuelve un legajo: escribe el motivo en `resoluciones_legajo` y el estado en `caregivers`, las dos cosas en la misma transacción. Corre con los permisos de quien llama, así que el aislamiento lo siguen haciendo las políticas de las dos tablas. Cierra el pendiente 90.';

revoke all on function public.resolver_legajo(uuid, text, text) from public;
revoke all on function public.resolver_legajo(uuid, text, text) from anon;
grant execute on function public.resolver_legajo(uuid, text, text) to authenticated;


notify pgrst, 'reload schema';
