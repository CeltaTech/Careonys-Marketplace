-- 0046: toda Prestadora nace con su configuración de puntaje, la cree quien la cree
--
-- Qué estaba mal
-- --------------
-- La 0018 sembró el valor de fábrica del puntaje —una fila en
-- `puntaje_prestadora` y cinco en la tabla de ponderaciones— y lo hizo
-- bien, con el motivo escrito ahí mismo: «una tabla vacía no dice "todas valen
-- uno", dice "todavía nadie configuró esto"».
--
-- Lo que faltaba es que ese `insert` corrió **una sola vez**, sobre las
-- Prestadoras que existían ese día. Toda Prestadora nacida después arranca sin
-- nada. Comprobado el 29 de agosto de 2026 contra la base de esta máquina:
-- `presdemo` y `cuidarnorte` tenían 1 y 5 filas; `cuidarsur`, que nace en la
-- 0035, tenía 0 y 0. Y le pasaba lo mismo a toda Prestadora que entrara por la
-- puerta de alta de CeltaTech, porque `alta_de_prestadora` (0025) crea la fila
-- de `tenants` y nada más.
--
-- Por qué un disparador y no un renglón adentro del alta
-- -----------------------------------------------------
-- Porque hay dos caminos por los que nace una Prestadora —la puerta de alta y
-- una migración— y el que falló fue el segundo. Ponerlo adentro del alta
-- arreglaría el camino que nunca se rompió y dejaría afuera al que sí. Sobre
-- `tenants` se atienden los dos de una vez, y también el tercero que aparezca.
--
-- Qué queda de fábrica
-- --------------------
-- Lo que ya decía la 0022: califica en verdadero, y 100 repartido en cinco
-- partes iguales, veinte cada una. Eso es el valor de fábrica y no la regla:
-- la Prestadora lo cambia cuando quiera, y la base sigue exigiendo que sus
-- ponderaciones sumen 100.
--
-- Por qué sólo se siembra la que no tiene ninguna
-- ----------------------------------------------
-- Una Prestadora con cinco filas ya configuró lo suyo y no se le toca nada. Una
-- con menos de cinco es un reparto que alguien dejó así a propósito —la 0022
-- deja borrar filas, y con cero filas no reparte nada—, y completárselo con
-- veintes le rompería el total de 100 sin avisarle. Se siembra la que no tiene
-- **ninguna**, que es la que nunca fue configurada.
--
-- Correr esto dos veces no falla, y se planta si no logró lo que dice.
-- ---------------------------------------------------------------------------


-- ── 1. La configuración de fábrica, en un solo lugar ───────────────────────
-- La escriben el disparador y el arreglo de más abajo, así que se escribe una
-- vez y la llaman los dos: si mañana el reparto de fábrica cambia, cambia acá.
create or replace function public.configuracion_de_fabrica_del_puntaje(p_tenant uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.puntaje_prestadora (tenant_id)
       values (p_tenant)
  on conflict (tenant_id) do nothing;

  -- Sólo la que no tiene ninguna. La que tiene algunas ya repartió sus 100 y
  -- agregarle veintes se lo rompería.
  if not exists (select 1 from public.ponderacion_comprobacion
                  where tenant_id = p_tenant) then
    insert into public.ponderacion_comprobacion (tenant_id, comprobacion)
    select p_tenant, c.comprobacion
      from (values ('domicilio'), ('referencia'), ('matricula'),
                   ('titulo'), ('curso_aprobado')) as c(comprobacion)
    on conflict (tenant_id, comprobacion) do nothing;
  end if;
end;
$$;

comment on function public.configuracion_de_fabrica_del_puntaje(uuid) is
  'Le deja a una Prestadora el puntaje de fábrica: califica en verdadero y 100 repartido en cinco partes iguales. No toca a la que ya tiene ponderaciones cargadas. Correrla dos veces no cambia nada.';

revoke all on function public.configuracion_de_fabrica_del_puntaje(uuid) from public, anon, authenticated;


-- ── 2. Y se corre sola cuando nace una Prestadora ──────────────────────────
create or replace function public.la_prestadora_nace_configurada()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  perform public.configuracion_de_fabrica_del_puntaje(new.id);
  return null;
end;
$$;

comment on function public.la_prestadora_nace_configurada() is
  'Deja el puntaje de fábrica a toda Prestadora recién creada, venga de la puerta de alta de CeltaTech o de una migración.';

revoke all on function public.la_prestadora_nace_configurada() from public, anon, authenticated;

-- Después de insertar, no antes: la fila de `tenants` tiene que existir para
-- que las dos tablas puedan apuntarle.
drop trigger if exists la_prestadora_nace_configurada on public.tenants;
create trigger la_prestadora_nace_configurada
  after insert on public.tenants
  for each row execute function public.la_prestadora_nace_configurada();


-- ── 3. Las que ya nacieron sin nada ────────────────────────────────────────
do $$
declare
  t record;
begin
  for t in select id from public.tenants loop
    perform public.configuracion_de_fabrica_del_puntaje(t.id);
  end loop;
end $$;


-- ── 4. Esta migración se planta si no logró lo que dice ────────────────────
-- Sin esto, «corrió» y «funcionó» se escriben igual.
do $$
declare
  sin_puntaje integer;
  sin_reparto integer;
begin
  select count(*) into sin_puntaje
    from public.tenants t
   where not exists (select 1 from public.puntaje_prestadora p
                      where p.tenant_id = t.id);

  select count(*) into sin_reparto
    from public.tenants t
   where not exists (select 1 from public.ponderacion_comprobacion c
                      where c.tenant_id = t.id);

  if sin_puntaje > 0 or sin_reparto > 0 then
    raise exception
      'Quedaron % Prestadoras sin fila de puntaje y % sin ninguna ponderación', sin_puntaje, sin_reparto;
  end if;

  if not exists (select 1 from pg_trigger
                  where tgname = 'la_prestadora_nace_configurada'
                    and tgrelid = 'public.tenants'::regclass
                    and not tgisinternal) then
    raise exception 'El disparador no quedó puesto sobre `tenants`, así que la próxima Prestadora vuelve a nacer sin nada';
  end if;
end $$;


notify pgrst, 'reload schema';
