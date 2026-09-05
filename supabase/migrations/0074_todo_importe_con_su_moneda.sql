-- 0074: todo importe se guarda con su moneda, y cuál es lo decide la Prestadora
--
-- Qué estaba mal
-- --------------
-- «Todo importe se guarda con su moneda. Nunca un número suelto», dice la regla
-- de desarrollo de la empresa. `caregivers.hourly_rate` era el único importe de
-- todo el esquema y era exactamente eso: un número suelto. La moneda vivía en la
-- pantalla —`js/texto.js`, `MONEDA_POR_OMISION = 'ARS'`—, así que el mismo
-- número se leía «$ 4.500» acá y en Brasil también, donde son reales.
--
-- El chequeo de esquema lo sabía y tenía la excepción escrita con nombre y
-- apellido (`scripts/verificar_esquema.mjs`, `SIN_MONEDA`), porque agregarle la
-- moneda a una columna ya escrita es una decisión de producto y no de la línea
-- de comandos. Esta migración la deja sin objeto, y esa exención se borra en el
-- mismo conjunto de cambios.
--
-- Quién decide cuál es
-- --------------------
-- El Desarrollador, el 5 de septiembre de 2026: para los movimientos de la
-- Prestadora con sus clientes «o dejamos todo en la moneda del país de cada
-- Prestadora, o ponemos todo en dólares estadounidenses. Yo creo que eso debe
-- poder configurarlo la Prestadora según sus preferencias».
--
-- O sea que la moneda **no** sale del país, ni del producto, ni de una tabla de
-- cambio: la elige cada Prestadora, y puede elegir el dólar aunque opere acá.
-- Por eso vive en `tenants` y hay una pantalla donde se cambia.
--
-- Por qué la moneda se copia al legajo y no se lee de `tenants` cada vez
-- ---------------------------------------------------------------------
-- Porque son dos cosas distintas. `tenants.moneda` es **con qué moneda trabaja
-- hoy** esta Prestadora; `caregivers.moneda_valor_hora` es **en qué moneda está
-- escrito este número**. El día que una Prestadora pase del peso al dólar, los
-- valores por hora ya cargados siguen siendo pesos hasta que cada Asistente los
-- vuelva a escribir: leerlos de `tenants` los convertiría en dólares de un
-- renglón para el otro, multiplicando por mil lo que dice que cobra cada
-- persona. Es la misma razón por la que un cálculo económico va «a la escala
-- vigente a la fecha del hecho, no a la de hoy».
--
-- Qué queda de fábrica, y qué no es
-- ---------------------------------
-- `ARS` para toda Prestadora que todavía no eligió. Es el valor de fábrica y no
-- la regla: es exactamente lo que la pantalla ya venía mostrando sin decirlo, así
-- que ningún importe cambia de significado al aplicar esto. Se cambia desde el
-- panel de la Prestadora cuando ella quiera.
--
-- La lista de monedas es abierta a propósito. El producto trae tres —peso
-- argentino, dólar estadounidense y real brasileño, que son los tres países que
-- hoy tienen idioma en el catálogo— y la Prestadora que necesite otra se la
-- agrega, igual que en cualquier otro vocabulario abierto.
--
-- Los códigos son los de ISO 4217 y van en mayúsculas, porque son un nombre que
-- impone un tercero y se escriben como el tercero los pide. Es además lo que
-- espera `Intl.NumberFormat`, que es quien decide si eso se muestra «$ 4.500» o
-- «ARS 4,500» según el idioma de la pantalla.
--
-- Correr esto dos veces no falla, y se planta si no logró lo que dice.
-- ---------------------------------------------------------------------------


-- ── 1. La moneda es una opción del catálogo, no una lista escrita en el código ──
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'moneda', '{"en": "Currency the Provider works in", "es-AR": "Moneda con la que trabaja la Prestadora", "pt-BR": "Moeda com que a Prestadora trabalha"}'::jsonb, false, 26)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('ARS', '{"en": "Argentine peso", "es-AR": "Peso argentino", "pt-BR": "Peso argentino"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('USD', '{"en": "US dollar", "es-AR": "Dólar estadounidense", "pt-BR": "Dólar americano"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('BRL', '{"en": "Brazilian real", "es-AR": "Real brasileño", "pt-BR": "Real brasileiro"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'moneda' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;


-- ── 2. Cada Prestadora elige la suya ───────────────────────────────────────
alter table public.tenants
  add column if not exists moneda text not null default 'ARS';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'la_moneda_es_un_codigo_iso') then
    alter table public.tenants
      add constraint la_moneda_es_un_codigo_iso check (moneda ~ '^[A-Z]{3}$');
  end if;
end $$;

comment on column public.tenants.moneda is
  'Con qué moneda trabaja esta Prestadora, en código ISO 4217 y en mayúsculas. La elige ella desde su panel; de fábrica es ARS, que es lo que la pantalla ya venía mostrando sin decirlo. Las opciones salen del vocabulario `moneda`, que es abierto: la Prestadora que necesite otra se la agrega (0074).';


-- ── 3. Y el importe guarda en cuál está escrito ────────────────────────────
-- La columna se agrega sin la exigencia todavía: primero se llena lo que ya
-- estaba escrito, y recién con todo lleno se pone la regla. Al revés, la regla
-- no dejaría agregar la columna.
alter table public.caregivers
  add column if not exists moneda_valor_hora text;

comment on column public.caregivers.moneda_valor_hora is
  'En qué moneda está escrito `hourly_rate`, en código ISO 4217. No se lee de `tenants` cada vez a propósito: el día que la Prestadora cambie de moneda, lo ya cargado sigue estando en la vieja hasta que cada persona lo vuelva a escribir (0074). La llena sola el disparador `el_valor_hora_nace_con_su_moneda`.';


-- ── 4. Que se llena sola, para que nadie tenga que acordarse ───────────────
create or replace function public.el_valor_hora_nace_con_su_moneda()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Sin importe no hay moneda que guardar. Se limpia para que no quede colgada
  -- la de un valor por hora que se borró.
  if new.hourly_rate is null then
    new.moneda_valor_hora := null;
    return new;
  end if;

  -- Y si trae importe sin moneda, la que corresponde es la de su Prestadora al
  -- día de hoy. Si ya trae una, no se toca: quien la escribió sabe en qué está.
  if new.moneda_valor_hora is null then
    select t.moneda into new.moneda_valor_hora
      from public.tenants t
     where t.id = new.tenant_id;
  end if;

  -- Legajo sin Prestadora y con importe: no hay de dónde sacar la moneda, y
  -- adivinarla sería escribir un número que dice lo que no es. Se corta acá, con
  -- un mensaje que se entiende, en vez de dejar que la restricción hable de
  -- columnas.
  if new.moneda_valor_hora is null then
    raise exception
      'No se puede guardar un valor por hora sin saber en qué moneda está: el legajo no tiene Prestadora.';
  end if;

  return new;
end;
$$;

comment on function public.el_valor_hora_nace_con_su_moneda() is
  'Le pone al valor por hora la moneda de su Prestadora cuando quien escribe no la trajo, y la borra cuando se borra el importe. Existe para que la regla «todo importe con su moneda» no dependa de que cada pantalla se acuerde (0074).';

revoke all on function public.el_valor_hora_nace_con_su_moneda() from public, anon, authenticated;

drop trigger if exists el_valor_hora_nace_con_su_moneda on public.caregivers;
create trigger el_valor_hora_nace_con_su_moneda
  before insert or update on public.caregivers
  for each row execute function public.el_valor_hora_nace_con_su_moneda();


-- ── 5. Los importes que ya estaban escritos ────────────────────────────────
-- Se les pone la moneda de su Prestadora, que hoy es ARS para todas: es la que
-- la pantalla les venía mostrando, así que ninguno cambia de significado.
update public.caregivers c
   set moneda_valor_hora = t.moneda
  from public.tenants t
 where t.id = c.tenant_id
   and c.hourly_rate is not null
   and c.moneda_valor_hora is null;

-- Y recién ahora la regla, con todo lleno.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'no_hay_valor_hora_sin_moneda') then
    alter table public.caregivers
      add constraint no_hay_valor_hora_sin_moneda
      check (hourly_rate is null or moneda_valor_hora ~ '^[A-Z]{3}$');
  end if;
end $$;


-- ── 6. El directorio la devuelve ───────────────────────────────────────────
-- La vista se repite entera porque `create or replace view` no admite otra cosa,
-- y la columna nueva va **al final**: cambiar el orden de las que ya están es lo
-- único que esa orden no perdona. Lo demás es idéntico a la 0061.
create or replace view public.directorio as
  select c.id,
         c.tenant_id,
         c.full_name,
         c.profession,
         c.zone,
         c.pathologies,
         c.tasks,
         c.hourly_rate,
         c.gender,
         c.documents->>'foto' as foto,
         coalesce(d.reemplazos_urgentes, false) as reemplazos_urgentes,
         c.created_at,
         (
           select coalesce(
                    array_agg(v.tipo order by case v.tipo
                                                when 'domicilio'  then 1
                                                when 'referencia' then 2
                                                when 'matricula'  then 3
                                                when 'titulo'     then 4
                                              end),
                    array[]::text[])
             from public.verificaciones_asistente v
            where v.caregiver_id = c.id
              and v.estado = 'verificado'
              and v.tipo in ('domicilio', 'referencia', 'matricula', 'titulo')
         )
         ||
         case when exists (select 1
                             from public.intentos_evaluacion i
                            where i.caregiver_id = c.id
                              and i.aprobado)
              then array['curso_aprobado']
              else array[]::text[]
         end
         as comprobaciones,
         -- Las zonas que tildó, cada una con su región al lado. Una región
         -- tildada entera se devuelve como su propia región: así la pantalla
         -- junta las regiones sin preguntar dos veces.
         (
           select coalesce(
                    jsonb_agg(
                      jsonb_build_object(
                        'clave',         z.clave,
                        'nombre',        z.nombre,
                        'es_region',     z.zona_padre_id is null,
                        'region_clave',  coalesce(r.clave,  z.clave),
                        'region_nombre', coalesce(r.nombre, z.nombre))
                      -- Por región, y adentro de cada una la región entera
                      -- primero: `r.nombre` es nulo justo en esa fila.
                      order by coalesce(r.orden, z.orden), r.nombre nulls first,
                               z.orden, z.nombre),
                    '[]'::jsonb)
             from public.zonas_asistente za
             join public.zonas_cobertura z on z.id = za.zona_id
             left join public.zonas_cobertura r on r.id = z.zona_padre_id
            where za.caregiver_id = c.id
              and z.activa
         ) as zonas,
         c.zonas_texto,
         -- Todas las claves que esa respuesta alcanza: la zona tildada, la
         -- región de la que cuelga, y —cuando lo tildado es una región
         -- entera— cada una de sus zonas activas. Sólo para filtrar: esto no
         -- se muestra en ninguna pantalla.
         (
           select coalesce(array_agg(distinct cl.clave), array[]::text[])
             from public.zonas_asistente za
             join public.zonas_cobertura z on z.id = za.zona_id and z.activa
             left join public.zonas_cobertura r on r.id = z.zona_padre_id
             cross join lateral (
                          select z.clave
                          union all select r.clave
                          union all select h.clave
                                      from public.zonas_cobertura h
                                     where h.zona_padre_id = z.id
                                       and h.activa
                        ) as cl(clave)
            where za.caregiver_id = c.id
              and cl.clave is not null
         ) as zonas_claves,
         -- Agregada por la 0074, y va acá al final porque `create or replace
         -- view` no deja meter una columna en el medio.
         c.moneda_valor_hora
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status = 'validado_prestadora'
     and a.perfil_publicado
     -- Tercera condición: ningún papel de la puerta `publicacion` sin
     -- comprobar. Se pregunta al revés —«que no exista uno que falte»—
     -- porque así la lista de papeles la decide el vocabulario y no este
     -- renglón, y agregar uno más no vuelve a tocar la vista.
     and not exists (
           select 1
             from public.vocabulario_items vi
             join public.vocabularios vo on vo.id = vi.vocabulario_id
            where vo.clave = 'verificacion'
              and vo.tenant_id is null
              -- La Prestadora puede agregar papeles suyos a esta lista, y si
              -- lo hace rigen para su gente y para nadie más.
              and (vi.tenant_id is null or vi.tenant_id = c.tenant_id)
              and vi.activo
              and vi.extra->>'puerta' = 'publicacion'
              -- El condicional no es opcional: exige sólo cuando el tipo de
              -- Asistente lo pide. Ante cualquier duda, exige.
              and case
                    when vi.extra ? 'condicional_a' then
                      case vi.extra->>'condicional_a'
                        when 'tipo_asistente.requiere_matricula' then
                          coalesce(
                            (select ti.extra->>'requiere_matricula'
                               from public.vocabulario_items ti
                               join public.vocabularios tv on tv.id = ti.vocabulario_id
                              where tv.clave = 'tipo_asistente'
                                and tv.tenant_id is null
                                and ti.clave = c.profession
                                and (ti.tenant_id is null
                                     or ti.tenant_id = c.tenant_id)
                              limit 1),
                            -- Tipo de Asistente que el vocabulario no conoce:
                            -- se exige el papel.
                            'true') = 'true'
                        -- Condición que este código no sabe contestar: se
                        -- exige el papel.
                        else true
                      end
                    else true
                  end
              and not exists (select 1
                                from public.verificaciones_asistente v
                               where v.caregiver_id = c.id
                                 and v.tipo = vi.clave
                                 and v.estado = 'verificado')
         );

comment on column public.directorio.moneda_valor_hora is
  'En qué moneda está el `hourly_rate` de esta fila. Sale del legajo y no de la Prestadora, así que un valor cargado antes de que ella cambiara de moneda sigue diciendo la vieja, que es la verdadera (0074). No es dato personal: es la unidad del número que ya se publicaba al lado.';


-- ── 7. Y la Prestadora la puede cambiar, sin poder cambiar nada más ────────
-- `tenants` hasta hoy era de sólo lectura para la sesión (0032:155). La
-- protección no es la política sino **el permiso por columna**: con
-- `grant update (moneda)` y nada más, ni el nombre, ni el color, ni `status`
-- —que lo escribe CeltaTech desde su puerta de alta y baja— quedan al alcance de
-- nadie desde adentro del producto. Es el mismo recurso que sostiene `profiles`,
-- donde `grant update (full_name)` es lo que impide mudarse de Prestadora.
drop policy if exists "La Prestadora configura lo suyo" on public.tenants;
create policy "La Prestadora configura lo suyo" on public.tenants
  for update to authenticated
  using      (id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (id = public.prestadora_actual() and public.es_personal_de_prestadora());

grant update (moneda) on table public.tenants to authenticated;


-- ── 8. Esta migración se planta si no logró lo que dice ────────────────────
-- Sin esto, «corrió» y «funcionó» se escriben igual.
do $$
declare
  monedas          integer;
  sin_moneda       integer;
  prestadoras_mal  integer;
  columnas_vista   integer;
begin
  select count(*) into monedas
    from public.vocabulario_items i
    join public.vocabularios v on v.id = i.vocabulario_id
   where v.clave = 'moneda' and v.tenant_id is null and i.tenant_id is null;
  if monedas < 3 then
    raise exception 'El vocabulario `moneda` quedó con % opciones y tiene que traer al menos las tres del producto', monedas;
  end if;

  select count(*) into sin_moneda
    from public.caregivers
   where hourly_rate is not null and moneda_valor_hora is null;
  if sin_moneda > 0 then
    raise exception 'Quedaron % valores por hora sin moneda', sin_moneda;
  end if;

  select count(*) into prestadoras_mal
    from public.tenants where moneda !~ '^[A-Z]{3}$';
  if prestadoras_mal > 0 then
    raise exception 'Quedaron % Prestadoras con una moneda que no es un código ISO', prestadoras_mal;
  end if;

  if not exists (select 1 from pg_trigger
                  where tgname = 'el_valor_hora_nace_con_su_moneda'
                    and tgrelid = 'public.caregivers'::regclass
                    and not tgisinternal) then
    raise exception 'El disparador no quedó puesto sobre `caregivers`, así que el próximo valor por hora vuelve a nacer sin moneda';
  end if;

  select count(*) into columnas_vista
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'directorio'
     and column_name  = 'moneda_valor_hora';
  if columnas_vista <> 1 then
    raise exception 'El directorio no devuelve la moneda, así que la pantalla sigue adivinándola';
  end if;

  -- Y que el permiso por columna sea **sólo** el de la moneda: si mañana alguien
  -- agrega otro `grant update` sobre `tenants`, esta migración deja de ser
  -- cierta y hay que enterarse acá y no en producción.
  if exists (select 1 from information_schema.column_privileges
              where table_schema  = 'public'
                and table_name    = 'tenants'
                and grantee       = 'authenticated'
                and privilege_type = 'UPDATE'
                and column_name  <> 'moneda') then
    raise exception 'La sesión puede escribir en `tenants` alguna columna que no es la moneda';
  end if;
end $$;


notify pgrst, 'reload schema';
