-- =====================================================================
-- 0041 — Las Guías de cuidado
--
-- Hasta acá una patología era un nombre en tres idiomas y nada más:
-- «Alzheimer» y punto. El Asistente que llega al domicilio elige la
-- opción de una lista y el producto no le dice **nada** sobre qué va a
-- encontrar, qué tiene que mirar ni qué hacer si pasa algo.
--
-- Una Guía de cuidado es eso: lo que el Asistente necesita saber sobre
-- una opción del catálogo. Cuatro partes, decididas por el Desarrollador
-- el 29 de agosto de 2026:
--
--   1. `descripcion`       — qué es
--   2. `que_esperar`       — qué se ve en el domicilio
--   3. `senales_de_alarma` — qué mirar, y qué obliga a avisar
--   4. `en_emergencia`     — cómo actuar, en pasos y en orden
--
-- **Y lo que deliberadamente NO trae: tratamientos.** Escribir qué
-- tratamiento corresponde a una patología convierte al producto en fuente
-- de indicación clínica, y entonces alguien tiene que responder cuando un
-- Asistente lo siga y salga mal. Decisión del Desarrollador el mismo día:
-- se guarda qué mirar y cómo actuar, no qué recetar. Es la diferencia
-- entre avisar y prescribir, y es la misma línea que traza la regla del
-- riesgo legal: el producto avisa, no decide por quien tiene la
-- responsabilidad.
--
-- Cuelga de `vocabulario_items` y no de «patología»
-- ------------------------------------------------
-- Las discapacidades y las tareas de cuidado también van a querer guía, y
-- la lista de opciones ya es genérica desde la 0038. Colgarse del ítem
-- sirve para las tres sin escribir una tabla por cada una — que es
-- exactamente el patrón repetido que la 0038 vino a terminar.
--
-- Nada de esto es mecanismo nuevo: los dos escalones, las funciones de
-- i18n, el disparador que no deja cruzar Prestadoras, las cuatro
-- políticas por tabla y la puerta sin sesión son los mismos de la 0038.
-- =====================================================================


-- --- 1. Los tres idiomas, cuando el texto es una lista --------------------
-- `i18n_completo` mira que cada idioma traiga una cadena. Dos de las cuatro
-- partes de una guía no son una cadena sino una **lista**: las señales de
-- alarma se leen de un vistazo y los pasos de una emergencia tienen orden.
-- Meterlas en un solo párrafo obligaría al Asistente a buscar adentro del
-- texto justo cuando no tiene tiempo de buscar nada.
--
-- Van dos funciones y no una condición copiada en cada `check`, por el mismo
-- motivo que la 0038: es la misma decisión en cuatro lugares.
create or replace function public.i18n_lista_completa(p_texto jsonb)
  returns boolean
  language sql
  immutable
as $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and coalesce(
           (select bool_and(
                     jsonb_typeof(p_texto -> idioma) = 'array'
                     and jsonb_array_length(p_texto -> idioma) > 0
                     and not exists (
                           select 1
                             from jsonb_array_elements(p_texto -> idioma) as renglon
                            where jsonb_typeof(renglon) <> 'string'
                               or length(btrim(renglon #>> '{}')) = 0))
              from unnest(array['es-AR', 'en', 'pt-BR']) as idioma),
           false);
$$;

comment on function public.i18n_lista_completa(jsonb) is
  'Verdadero si el jsonb trae los tres idiomas del producto y cada uno es una lista con al menos un renglon, sin renglones vacios. Para el texto visible que se lee como lista y no como parrafo.';

-- Y el mínimo, para lo que carga una Prestadora: su texto, en su idioma.
create or replace function public.i18n_lista_minima(p_texto jsonb)
  returns boolean
  language sql
  immutable
as $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and jsonb_typeof(p_texto -> 'es-AR') = 'array'
     and jsonb_array_length(p_texto -> 'es-AR') > 0
     and not exists (
           select 1
             from jsonb_array_elements(p_texto -> 'es-AR') as renglon
            where jsonb_typeof(renglon) <> 'string'
               or length(btrim(renglon #>> '{}')) = 0);
$$;

comment on function public.i18n_lista_minima(jsonb) is
  'Verdadero si el jsonb trae al menos el es-AR como lista con al menos un renglon no vacio. Para lo que carga una Prestadora, que va en el idioma en que lo escribio.';

-- Las evalúan los `check` de la tabla de abajo, así que conservan
-- `authenticated`: quitárselo no devolvería cero filas, haría fallar el alta.
revoke all on function public.i18n_lista_completa(jsonb) from public, anon;
revoke all on function public.i18n_lista_minima(jsonb)   from public, anon;
grant execute on function public.i18n_lista_completa(jsonb) to authenticated;
grant execute on function public.i18n_lista_minima(jsonb)   to authenticated;


-- --- 2. La tabla ----------------------------------------------------------
-- `tenant_id` en nulo es la guía que trae el producto; cargado es la que
-- escribió esa Prestadora. Igual que en la 0038.
--
-- **`publicada` no es adorno.** El texto de una Guía de cuidado lo va a seguir
-- un Asistente en el domicilio, así que hasta que un profesional lo revise y lo
-- firme, la guía existe pero no sale por la puerta. Sin esta columna la única
-- forma de no publicar un borrador sería no cargarlo, y entonces el borrador
-- vive en un archivo suelto en la máquina de alguien.
create table if not exists public.guias_cuidado (
    id                  uuid primary key default gen_random_uuid(),
    tenant_id           uuid references public.tenants(id) on delete cascade,
    vocabulario_item_id uuid not null references public.vocabulario_items(id) on delete cascade,

    descripcion         jsonb not null,
    que_esperar         jsonb not null,
    senales_de_alarma   jsonb not null,
    en_emergencia       jsonb not null,

    publicada           boolean not null default false,
    revisada_por        text,
    revisada_el         timestamptz,

    activo              boolean not null default true,
    created_at          timestamptz not null default timezone('utc', now()),

    -- Los tres idiomas para lo que escribimos nosotros; el suyo para lo que
    -- escribe una Prestadora. Es la misma decisión que tomó la 0035 con los
    -- nombres de las zonas y la 0038 con las opciones: la regla de i18n rige
    -- el texto que escribe el producto, no el que carga el cliente.
    constraint la_descripcion_esta_en_los_idiomas check (
      case when tenant_id is null then public.i18n_completo(descripcion)
           else                        public.i18n_minimo(descripcion) end),
    constraint el_que_esperar_esta_en_los_idiomas check (
      case when tenant_id is null then public.i18n_completo(que_esperar)
           else                        public.i18n_minimo(que_esperar) end),
    constraint las_senales_estan_en_los_idiomas check (
      case when tenant_id is null then public.i18n_lista_completa(senales_de_alarma)
           else                        public.i18n_lista_minima(senales_de_alarma) end),
    constraint la_emergencia_esta_en_los_idiomas check (
      case when tenant_id is null then public.i18n_lista_completa(en_emergencia)
           else                        public.i18n_lista_minima(en_emergencia) end),

    -- Una guía publicada tiene que decir quién la revisó y cuándo. Publicar sin
    -- eso es justamente lo que esta columna existe para impedir.
    constraint la_publicada_dice_quien_la_reviso check (
      publicada = false
      or (revisada_por is not null and length(btrim(revisada_por)) > 0
          and revisada_el is not null)),

    -- Una guía por opción y por Prestadora. El índice parcial de abajo cubre el
    -- caso del catálogo general, porque en Postgres dos `null` no chocan y esta
    -- restricción sola dejaría cargar la guía general dos veces.
    constraint una_guia_por_item_y_prestadora unique (vocabulario_item_id, tenant_id)
);

create unique index if not exists idx_guia_general_unica
  on public.guias_cuidado (vocabulario_item_id)
  where tenant_id is null;

comment on table public.guias_cuidado is
  'Lo que el Asistente necesita saber sobre una opcion del catalogo: que es, que esperar, que mirar y como actuar en una emergencia. No guarda tratamientos, a proposito: el producto avisa, no prescribe. Cuelga de vocabulario_items, asi que sirve igual para patologias, discapacidades y tareas de cuidado.';

comment on column public.guias_cuidado.tenant_id is
  'Nulo es la guia que trae el producto. Cargado es la que escribio esa Prestadora, que reemplaza a la general para ella.';

comment on column public.guias_cuidado.senales_de_alarma is
  'Que mirar y que obliga a avisar. Lista por idioma, no parrafo: se lee de un vistazo.';

comment on column public.guias_cuidado.en_emergencia is
  'Como actuar, en pasos y en el orden en que se hacen. Lista por idioma; el orden del arreglo es dato.';

comment on column public.guias_cuidado.publicada is
  'Falso mientras el texto no lo reviso un profesional. La puerta no devuelve las que no estan publicadas.';

comment on column public.guias_cuidado.revisada_por is
  'Quien firmo el contenido. Obligatorio para publicar.';


-- --- 3. Lo que ninguna clave ajena puede impedir --------------------------
-- Una guía y su opción pueden tener `tenant_id` distinto, y ése es el caso
-- bueno: la Prestadora que escribe su propia guía para una patología del
-- catálogo general. Así que la clave ajena no alcanza y hace falta el
-- disparador, igual que en la 0038.
create or replace function public.la_guia_no_cruza_prestadoras()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_duenio_item uuid;
begin
  select tenant_id into v_duenio_item
    from public.vocabulario_items where id = new.vocabulario_item_id;

  -- 1. Una guía cuelga de una opción del catálogo general o de una de su
  --    propia Prestadora. Nunca de una de otra.
  if v_duenio_item is not null and v_duenio_item is distinct from new.tenant_id then
    raise exception 'Una guía sólo puede colgar de una opción del catálogo general o de una de su misma Prestadora.';
  end if;

  -- 2. Y el producto no escribe guías para las opciones privadas de un
  --    cliente: no sabe qué cargó ni le corresponde opinar sobre eso.
  if new.tenant_id is null and v_duenio_item is not null then
    raise exception 'El catálogo general no lleva guías de opciones propias de una Prestadora.';
  end if;

  return new;
end;
$$;

revoke all on function public.la_guia_no_cruza_prestadoras() from public, anon, authenticated;

drop trigger if exists guias_no_cruzan on public.guias_cuidado;
create trigger guias_no_cruzan
  before insert or update on public.guias_cuidado
  for each row execute function public.la_guia_no_cruza_prestadoras();


-- --- 4. RLS ---------------------------------------------------------------
-- Cuatro políticas y no una `for all`, por lo mismo que la 0038: la condición
-- que habilita a leer la guía general no puede ser la que habilita a borrarla.
--
-- **La lectura no es simétrica con la 0038, y es a propósito:** de lo general
-- se lee sólo lo publicado, porque un borrador nuestro no tiene por qué llegar
-- a nadie; de lo propio se lee todo, incluidos los borradores, porque si no la
-- Prestadora no podría editar lo que todavía no publicó.
alter table public.guias_cuidado enable row level security;

drop policy if exists "Guías que se pueden leer" on public.guias_cuidado;
create policy "Guías que se pueden leer" on public.guias_cuidado
  for select to authenticated
  using ((tenant_id is null and publicada)
         or tenant_id = public.prestadora_actual());

drop policy if exists "Guías propias: alta" on public.guias_cuidado;
create policy "Guías propias: alta" on public.guias_cuidado
  for insert to authenticated
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Guías propias: cambio" on public.guias_cuidado;
create policy "Guías propias: cambio" on public.guias_cuidado
  for update to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual())
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Guías propias: baja" on public.guias_cuidado;
create policy "Guías propias: baja" on public.guias_cuidado
  for delete to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual());

-- El permiso de tabla no es la RLS: sin esto la política perfecta bloquea con
-- `42501` en vez de proteger.
revoke all on table public.guias_cuidado from anon, authenticated;
grant select, insert, update, delete on table public.guias_cuidado to authenticated;

create index if not exists idx_guias_item   on public.guias_cuidado(vocabulario_item_id);
create index if not exists idx_guias_tenant on public.guias_cuidado(tenant_id);


-- --- 5. La puerta sin sesión ----------------------------------------------
-- Misma clase de puerta que `vocabularios_de`: se pide por el nombre corto y
-- se devuelve la guía general más la de esa Prestadora, de ninguna otra.
--
-- **Y acá la propia REEMPLAZA a la general, no se suma**, al revés de lo que
-- pasa con las opciones. Es deliberado: dos guías para la misma patología
-- dejarían al Asistente eligiendo cuál seguir, y en una emergencia eso es peor
-- que no tener ninguna. La Prestadora que escribe la suya está diciendo que la
-- suya es la que rige.
--
-- Devuelve sólo lo publicado. Un borrador no sale por la puerta ni con sesión.
create or replace function public.guias_de(p_slug text default null)
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
  with prestadora as (
    select t.id
      from public.tenants t
     where p_slug is not null
       and t.slug = p_slug
       and t.status = 'activo'
  ),
  visibles as (
    select v.clave as vocabulario, i.clave as opcion, g.*
      from public.guias_cuidado g
      join public.vocabulario_items i on i.id = g.vocabulario_item_id
      join public.vocabularios      v on v.id = i.vocabulario_id
     where g.activo
       and g.publicada
       and i.activo
       and v.activo
       and (g.tenant_id is null or g.tenant_id = (select id from prestadora))
       and (i.tenant_id is null or i.tenant_id = (select id from prestadora))
  ),
  elegidas as (
    select distinct on (vocabulario, opcion) *
      from visibles
     order by vocabulario, opcion, (tenant_id is not null) desc
  )
  select coalesce(
           jsonb_object_agg(x.vocabulario, x.opciones),
           '{}'::jsonb)
    from (
      select e.vocabulario,
             jsonb_object_agg(e.opcion, jsonb_build_object(
               'descripcion',       e.descripcion,
               'que_esperar',       e.que_esperar,
               'senales_de_alarma', e.senales_de_alarma,
               'en_emergencia',     e.en_emergencia,
               'propia',            e.tenant_id is not null
             )) as opciones
        from elegidas e
       group by e.vocabulario
    ) as x;
$$;

comment on function public.guias_de(text) is
  'Las Guias de cuidado publicadas: la general mas la propia de UNA Prestadora, por su nombre corto, sin sesion. La propia reemplaza a la general. Agrupadas por clave de vocabulario y clave de opcion, con los tres idiomas adentro.';

revoke all on function public.guias_de(text) from public;
grant execute on function public.guias_de(text) to anon;
grant execute on function public.guias_de(text) to authenticated;

notify pgrst, 'reload schema';
