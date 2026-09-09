-- La fichada vale por la hora en que se marcó, no por la hora en que llegó
--
-- POR QUÉ HACE FALTA ESTO ANTES QUE LA COLA
-- Hasta hoy la fichada se manda en el momento y, si no hay señal, se pierde:
-- no hay reintento, no hay copia en el teléfono y nadie se entera. Se va a
-- construir la cola que la guarda y la manda después. Pero apenas exista esa
-- cola, la hora de llegada deja de ser la hora del hecho, y hay dos cosas de
-- acá adentro que hoy se apoyan en que son la misma:
--
--   1. La lista que ve la Familia se ordena por la hora de llegada.
--   2. Las dos alarmas —jornada abierta y salida sin entrada— miran la fichada
--      anterior y la siguiente **en ese mismo orden**.
--
-- El caso que rompe, y no es rebuscado: el Asistente marca la entrada a las 8
-- en una casa sin señal, marca la salida a las 16 con señal, y la entrada
-- recién sale del teléfono a las 18. Ordenadas por llegada, la salida queda
-- primero. La alarma lee «una salida sin entrada delante» y le avisa a la
-- Familia de un problema que no existe, mientras la jornada real de ocho horas
-- pasa como si nada. Un aviso falso enseña a ignorar los avisos.
--
-- Así que la columna se agrega antes de que exista la cola, no después.
--
-- QUÉ SE GUARDA, Y POR QUÉ SON DOS HORAS Y NO UNA
-- `marcada_en` es cuándo la persona apretó el botón, según el teléfono que
-- tenía en la mano. `created_at` sigue siendo cuándo llegó a la base. Las dos
-- se guardan porque son dos hechos distintos y ninguna reemplaza a la otra: la
-- primera es cuándo pasó, la segunda es cuándo se supo. Con las dos juntas, una
-- fichada que estuvo diez horas en el teléfono se puede reconocer; con una
-- sola, no.
--
-- QUÉ NO HACE ESTO, A PROPÓSITO
-- No rechaza ninguna hora, ni la corrige. Un teléfono con la fecha mal puesta
-- va a mandar una hora rara, y la tentación es rechazarla o acomodarla. Las dos
-- están mal: rechazarla le hace perder la fichada a quien la marcó, y
-- acomodarla es inventar una hora que nadie vivió, que después se le muestra a
-- la Familia como si fuera cierta. Se guardan las dos horas tal cual llegaron y
-- la diferencia entre ellas queda a la vista de quien mire. Corregir la forma
-- es ayudar; inventar el contenido es mentir.

-- 1. La columna. Nace vacía, se llena con lo que ya había, y recién ahí se
--    exige. Al revés —con el valor por omisión puesto desde el arranque— toda
--    fichada vieja quedaría marcada a la hora de correr esta migración, que es
--    una hora en la que no pasó nada.
alter table public.clock_ins add column marcada_en timestamptz;

update public.clock_ins set marcada_en = created_at where marcada_en is null;

alter table public.clock_ins
  alter column marcada_en set default timezone('utc', now()),
  alter column marcada_en set not null;

comment on column public.clock_ins.marcada_en is
  'Cuándo apretó el botón la persona, según su teléfono. Es la hora del hecho, y es la que se muestra y la que ordena. `created_at` guarda aparte cuándo llegó a la base, que con la fichada guardada sin señal ya no es la misma (migración 0009).';

-- 2. El índice que sostiene la lista, ahora por la hora que la ordena. El
--    anterior queda: la hora de llegada se sigue consultando para reconocer una
--    fichada que estuvo demorada.
create index clock_ins_conversacion_marcada_idx
  on public.clock_ins (conversacion_id, marcada_en desc);

-- 3. Las alarmas, mirando la hora del hecho.
--
--    Es la misma consulta de antes con una sola diferencia, y esa diferencia es
--    todo el punto: donde decía la hora de llegada ahora dice la hora de la
--    marca. Se rehace entera porque una función se reemplaza entera; lo demás
--    —el tope de horas configurable por Prestadora, quién ve qué, los dos tipos
--    de alarma— queda exactamente como estaba.
create or replace function public.mis_alarmas()
  returns table(clase text, fichada_id uuid, conversacion_id uuid, otra_parte text,
                ocurrio_el timestamptz, horas integer, tope_horas integer)
  language sql stable security definer
  set search_path to 'public'
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
           f.marcada_en,
           cv.familia_id = auth.uid() as soy_la_familia,
           c.full_name                as nombre_del_asistente,
           pf.full_name               as nombre_de_la_familia,
           lead(f.event_type) over (partition by f.conversacion_id
                                        order by f.marcada_en) as sigue,
           lag(f.event_type)  over (partition by f.conversacion_id
                                        order by f.marcada_en) as venia
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
         m.marcada_en,
         (extract(epoch from (now() - m.marcada_en)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'entrada'
     and (m.sigue is null or m.sigue <> 'salida')
     and m.marcada_en < now() - make_interval(hours => t.horas)

  union all

  select 'salida_sin_entrada'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.marcada_en,
         (extract(epoch from (now() - m.marcada_en)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'salida'
     and (m.venia is null or m.venia <> 'entrada')

   order by 5 desc;
$$;

comment on function public.mis_alarmas() is
  'Las dos alarmas de jornada que ve cada parte de un vínculo, ordenadas y medidas por la hora en que se marcó la fichada y no por la hora en que llegó a la base (migración 0009).';

/* `create or replace` conserva los permisos que ya tenía la función, así que
   este renglón no cambia nada hoy: la migración que la creó ya le había sacado
   el permiso a `PUBLIC` y a `anon`, y `authenticated` queda como estaba porque
   es con quien la llama la aplicación. Se escribe igual porque la regla mira
   cada migración sola: quien lea ésta dentro de un año no tiene por qué salir a
   revisar las anteriores para saber si la función quedó al alcance de quien no
   inició sesión. */
revoke all on function public.mis_alarmas() from public, anon;

notify pgrst, 'reload schema';
