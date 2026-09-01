-- 0057: la alarma que ve la Familia, y que no decide nada
--
-- Qué cierra
-- ----------
-- El quinto y último eslabón de la cadena que arranca en entrar y sigue por
-- pedir, encontrarse y trabajar. Lo fijó el Desarrollador el 31 de agosto de
-- 2026, y está escrito en `CLAUDE.md` §1 de este producto: el producto ofrece
-- sus programas para llevar el servicio «en carácter informativo y sin tomar
-- ninguna decisión», y **avisa a la Familia cuando detecta que algo no está
-- bien**.
--
-- La 0056 ató la fichada al vínculo y la Familia ya la ve. Verla no es lo
-- mismo que enterarse: mirar una lista de marcas y darse cuenta sola de que
-- una jornada quedó abierta desde anteayer es justamente el trabajo que el
-- producto promete ahorrarle.
--
-- Qué detecta, y por qué sólo esto
-- --------------------------------
-- **El software no sabe de ningún trato** (`CLAUDE.md` §1): no guarda el
-- horario acordado, ni el precio, ni ninguna condición. Entonces no puede
-- decir «faltó», porque no sabe a qué hora tenía que estar. Todo lo que
-- detecte tiene que salir de las fichadas mismas y de nada más.
--
-- Quedan dos cosas, y las dos son estructurales:
--
--   1. `jornada_abierta`      una entrada que nunca cerró, más vieja que el
--                             tope de horas que configuró la Prestadora.
--   2. `salida_sin_entrada`   una salida que no tiene una entrada abierta
--                             delante.
--
-- Ninguna de las dos opina. No dicen que el Asistente hizo algo mal: dicen
-- que **la fichada quedó incompleta**, que es un hecho de la propia marca. La
-- causa puede ser un teléfono sin batería, y el producto no la adivina. Por
-- eso lo que se guarda en `clase` es una clave y no una frase: el texto sale
-- del catálogo, en los tres idiomas, y lo escribe la pantalla.
--
-- **Lo que no entra, y no por olvido.** «Hace días que no ficha» parece de la
-- misma familia y no lo es: para llamarlo raro hay que saber que se esperaba
-- una jornada, y eso es el trato. Un aviso así sería el software opinando
-- sobre un acuerdo que no conoce.
--
-- Por qué el tope va en una tabla
-- ------------------------------
-- Dieciséis horas es un valor de fábrica, no una regla. Una Prestadora de
-- internación nocturna y una de cuatro horas por la mañana no tienen el mismo
-- número, y escribirlo adentro de la función lo volvería un despliegue. Va a
-- la base, como el reparto del puntaje de la 0018, y por el mismo motivo que
-- dice aquella: una tabla vacía no dice «dieciséis», dice «todavía nadie
-- configuró esto». Así que toda Prestadora nace con su fila, la nueva por el
-- disparador de la 0046 y las de hoy por el arreglo del final.
--
-- Quién la lee y quién la escribe
-- ------------------------------
-- La alarma es de la Familia y del Asistente, igual que la fichada de la que
-- sale: **la Prestadora no la mira**, porque mirar si una jornada quedó
-- abierta es mirar los horarios que cumple una persona, y eso es dirigir el
-- trabajo. Lo que sí es de la Prestadora es **el tope**, que es configuración
-- de su espacio.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. El tope, una fila por Prestadora ────────────────────────────────────
create table if not exists public.alarmas_prestadora (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null unique
                              default public.prestadora_actual()
                              references public.tenants(id) on delete cascade,
  horas_jornada_abierta  integer not null default 16
                              check (horas_jornada_abierta between 1 and 168),
  created_at             timestamptz not null default now()
);

comment on table public.alarmas_prestadora is
  'El tope, en horas, a partir del cual una entrada sin salida se le avisa a la Familia. Es configuración del espacio de la Prestadora, no una regla del producto: una de internación nocturna y una de cuatro horas por la mañana no tienen el mismo número.';

comment on column public.alarmas_prestadora.horas_jornada_abierta is
  'De fábrica dieciséis. El límite de arriba, una semana, no es una opinión sobre el cuidado: es que más allá de ahí la alarma dejaría de avisar nunca y la columna quedaría apagada sin que se note.';

alter table public.alarmas_prestadora enable row level security;

-- El tope lo configura el personal de la Prestadora, que es dueño del espacio.
-- Nadie más lo lee ni lo escribe: la Familia no lo necesita —la función se lo
-- devuelve adentro de cada alarma— y el Asistente tampoco.
drop policy if exists "Topes de alarma de la Prestadora" on public.alarmas_prestadora;
create policy "Topes de alarma de la Prestadora" on public.alarmas_prestadora
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual()
              and public.es_personal_de_prestadora());

grant select, insert, update, delete on public.alarmas_prestadora to authenticated;


-- ── 2. Toda Prestadora nace con su tope ────────────────────────────────────
-- La 0046 dejó escrito por qué esto va en un disparador sobre `tenants` y no
-- adentro del alta: hay dos caminos por los que nace una Prestadora y el que
-- se rompió fue el otro. Se cuelga de la misma función que ya corre ahí.
create or replace function public.configuracion_de_fabrica_de_las_alarmas(p_tenant uuid)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  insert into public.alarmas_prestadora (tenant_id)
       values (p_tenant)
  on conflict (tenant_id) do nothing;
$$;

comment on function public.configuracion_de_fabrica_de_las_alarmas(uuid) is
  'Le deja a una Prestadora su fila de topes de alarma con los valores de fábrica. No pisa la que ya configuró.';

revoke all on function public.configuracion_de_fabrica_de_las_alarmas(uuid) from public, anon, authenticated;

create or replace function public.la_prestadora_nace_configurada()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  perform public.configuracion_de_fabrica_del_puntaje(new.id);
  perform public.configuracion_de_fabrica_de_las_alarmas(new.id);
  return new;
end;
$$;

revoke all on function public.la_prestadora_nace_configurada() from public, anon, authenticated;

-- Y las que ya existen, que el disparador no alcanza.
insert into public.alarmas_prestadora (tenant_id)
     select t.id from public.tenants t
on conflict (tenant_id) do nothing;

do $$
declare faltan integer;
begin
  select count(*) into faltan
    from public.tenants t
   where not exists (select 1 from public.alarmas_prestadora a
                      where a.tenant_id = t.id);
  if faltan > 0 then
    raise exception 'Quedaron % Prestadoras sin su tope de alarma', faltan;
  end if;
end $$;


-- ── 3. Las alarmas de quien mira ───────────────────────────────────────────
-- `security definer` por lo mismo que las cuatro de la 0055: la RLS decide qué
-- filas se ven, no qué columnas, y acá hay que cruzar `clock_ins` con
-- `conversaciones` y con el tope de la Prestadora, que la Familia no
-- lee. La función acota adentro: sólo los vínculos de quien llama, sea la
-- Familia o el Asistente, y de su propia Prestadora.
--
-- Devuelve `clase` como clave, no como frase. El texto visible sale del
-- catálogo y se traduce; una frase armada en la base no se traduce, no se
-- revisa y no la ve ningún chequeo.
create or replace function public.mis_alarmas()
  returns table (
    clase           text,
    fichada_id      uuid,
    conversacion_id uuid,
    otra_parte      text,
    ocurrio_el      timestamptz,
    horas           integer,
    tope_horas      integer
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  with tope as (
    select coalesce(max(a.horas_jornada_abierta), 16) as horas
      from public.alarmas_prestadora a
     where a.tenant_id = public.prestadora_actual()
  ),
  mias as (
    select f.id,
           f.conversacion_id,
           f.event_type,
           f.created_at,
           cv.familia_id = auth.uid() as soy_la_familia,
           c.full_name                as nombre_del_asistente,
           pf.full_name               as nombre_de_la_familia,
           lead(f.event_type) over (partition by f.conversacion_id
                                        order by f.created_at) as sigue,
           lag(f.event_type)  over (partition by f.conversacion_id
                                        order by f.created_at) as venia
      from public.clock_ins f
      join public.conversaciones cv on cv.id = f.conversacion_id
      join public.caregivers c            on c.id  = cv.caregiver_id
      left join public.profiles pf        on pf.id = cv.familia_id
     where f.tenant_id  = public.prestadora_actual()
       and cv.tenant_id = public.prestadora_actual()
       and (cv.familia_id = auth.uid()
            or cv.caregiver_id = public.legajo_propio())
  )
  select 'jornada_abierta'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.created_at,
         (extract(epoch from (now() - m.created_at)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'entrada'
     and (m.sigue is null or m.sigue <> 'salida')
     and m.created_at < now() - make_interval(hours => t.horas)

  union all

  select 'salida_sin_entrada'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.created_at,
         (extract(epoch from (now() - m.created_at)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'salida'
     and (m.venia is null or m.venia <> 'entrada')

   order by 5 desc;
$$;

comment on function public.mis_alarmas() is
  'Lo que la aplicación detecta que quedó incompleto en las fichadas de los vínculos de quien inició sesión: una entrada que nunca cerró, o una salida sin entrada delante. No opina sobre la persona ni sobre el trato, que el software no conoce: dice que la marca quedó a medias. Devuelve una clave, no un texto: la frase sale del catálogo.';


-- ── 4. Quién puede llamarla ────────────────────────────────────────────────
-- `security definer` del esquema `public`, así que PostgREST la publica como
-- dirección web. `public` es todo el mundo, incluidos roles que todavía no
-- existen, y `anon` es una concesión aparte que se revoca aparte. Ninguna
-- política la usa, así que `authenticated` sale de este `grant` y de ningún
-- otro lado.
revoke all on function public.mis_alarmas()    from public;
revoke all on function public.mis_alarmas()    from anon;
grant execute on function public.mis_alarmas() to authenticated;


notify pgrst, 'reload schema';
