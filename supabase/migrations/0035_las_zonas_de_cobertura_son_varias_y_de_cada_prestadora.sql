-- =====================================================================
-- 0035 — Las zonas de cobertura son varias, y la lista es de cada
--         Prestadora
--
-- Hasta acá el formulario de reclutamiento preguntaba «Barrio o zona de
-- cobertura» con un `select` de una sola opción, y la respuesta caía en
-- `caregivers.zone`, una columna de texto. Eso tenía tres problemas y el
-- tercero es el que manda:
--
--   1. **Una sola.** Quien trabaja en Morón y en Ramos Mejía tenía que
--      elegir uno de los dos, y el otro se perdía.
--   2. **Sin escalones.** Las veinte opciones se mostraban planas, con
--      «Zona Oeste» al lado de «Palermo», aunque el vocabulario `zona` de
--      `data/catalogo-vocabularios.json` ya tenía cada barrio colgado de
--      su región por la propiedad `region`. La agrupación existía y nadie
--      la usaba.
--   3. **La lista era argentina y estaba escrita en un archivo.** Le
--      mostraba Palermo y Quilmes a cualquier Prestadora, viviera donde
--      viviera. El Desarrollador lo planteó el 28 de agosto de 2026:
--      «esto es válido únicamente si la Prestadora es Buenos Aires o Gran
--      Buenos Aires, para el resto del país y otros países debe ser un
--      campo configurable por la Prestadora o en su defecto un campo
--      donde el/la postulante se expresa libremente».
--
-- Lo tercero es lo que decide la forma de todo lo demás: **la lista deja
-- de ser del producto y pasa a ser de cada Prestadora**. El Área
-- Metropolitana no queda como un caso especial escrito en el código; es
-- simplemente la lista que tienen cargada las Prestadoras ficticias de
-- Buenos Aires. Una Prestadora de Salta carga sus departamentos y usa
-- exactamente la misma pantalla.
--
-- **Y el modo no se elige: se deduce.** Si la Prestadora tiene zonas
-- cargadas hay lista para tildar; si no tiene ninguna, la persona
-- escribe con sus palabras dónde puede trabajar, y eso cae en
-- `caregivers.zonas_texto`. Un campo aparte que dijera «yo uso lista» es
-- un dato que se puede contradecir con la realidad, y el día que se
-- contradiga la pantalla queda vacía sin explicar por qué.
--
-- **Qué idioma tienen los nombres.** Los que carga una Prestadora, uno
-- solo: son datos de un cliente, como el nombre de una persona, y la
-- regla de multiidioma rige el texto que escribimos nosotros —el rótulo,
-- la ayuda, los mensajes—, no lo que carga quien usa el sistema. Por eso
-- la tabla guarda además una `clave` opcional: cuando la zona es una de
-- las que el producto ya conoce, la pantalla la traduce con el
-- vocabulario `zona`; cuando la escribió la Prestadora, la muestra como
-- la escribió. Casi ningún nombre de lugar se traduce —Palermo es
-- Palermo en los tres idiomas—; los que sí son las cuatro regiones.
--
-- Se sigue el patrón de aislamiento de la 0002 y la 0004: `tenant_id` en
-- cada tabla, política `using/with check (tenant_id =
-- public.prestadora_actual())`, nada visible para `anon` por tabla.
--
-- **La excepción, y por qué no es una excepción.** El formulario de
-- reclutamiento lo completa alguien que todavía no tiene cuenta, así que
-- la lista de zonas tiene que poder leerse sin sesión. No se resuelve
-- abriéndole la tabla a `anon`: se resuelve como ya lo resolvió la 0021
-- con `prestadora_por_slug`, con una función que exige el nombre corto y
-- devuelve las zonas de esa Prestadora y de ninguna otra.
-- =====================================================================

-- --- 1. La lista, que es de cada Prestadora --------------------------------
-- Dos escalones en una sola tabla: una región tiene `zona_padre_id` en nulo,
-- y un municipio o barrio apunta a su región. `orden` existe para que la
-- lista salga como la Prestadora la quiere y no en orden alfabético, que
-- pondría «Avellaneda» antes que «Zona Norte» sin que eso signifique nada.
--
-- La clave ajena compuesta `(zona_padre_id, tenant_id)` no es adorno: es lo
-- que impide que una zona de una Prestadora cuelgue de una región de otra.
-- Sin ella el aislamiento dependería de que ninguna consulta se equivoque.
create table if not exists public.zonas_cobertura (
    id             uuid primary key default gen_random_uuid(),
    tenant_id      uuid not null references public.tenants(id) on delete cascade,
    zona_padre_id  uuid,
    clave          text,
    nombre         text not null,
    orden          integer not null default 0,
    activa         boolean not null default true,
    created_at     timestamp with time zone default timezone('utc'::text, now()),
    constraint zona_unica_por_prestadora unique (id, tenant_id),
    constraint clave_unica_por_prestadora unique (tenant_id, clave),
    constraint el_padre_es_de_la_misma_prestadora
      foreign key (zona_padre_id, tenant_id)
      references public.zonas_cobertura(id, tenant_id) on delete cascade,
    constraint el_nombre_no_esta_vacio check (length(btrim(nombre)) > 0)
);

comment on table public.zonas_cobertura is
  'Las zonas que ofrece una Prestadora para tildar en el formulario de reclutamiento. Dos escalones: region con zona_padre_id en nulo, municipio o barrio colgado de ella. clave es la del vocabulario zona cuando el producto ya conoce ese lugar, y nula cuando el nombre lo escribio la Prestadora.';

comment on column public.zonas_cobertura.clave is
  'Clave del vocabulario zona de data/catalogo-vocabularios.json, si existe. Con clave la pantalla traduce el nombre a los tres idiomas; sin clave muestra la columna nombre tal como la escribio la Prestadora.';

-- Dos escalones, no tres. Un municipio no puede tener municipios adentro, y
-- sin esto nada lo impide: la tabla se apunta a sí misma y aceptaría una
-- cadena de cualquier largo. La pantalla dibuja exactamente dos niveles, así
-- que un tercero no se vería —quedaría cargado y sin mostrarse, que es la
-- peor de las dos formas de fallar—.
create or replace function public.la_zona_cuelga_de_una_region()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.zona_padre_id is not null then
    if exists (select 1 from public.zonas_cobertura z
                where z.id = new.zona_padre_id
                  and z.zona_padre_id is not null) then
      raise exception 'Una zona cuelga de una región, y una región no cuelga de nada: sólo hay dos escalones.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.la_zona_cuelga_de_una_region() from public, anon, authenticated;

drop trigger if exists zonas_cobertura_dos_escalones on public.zonas_cobertura;
create trigger zonas_cobertura_dos_escalones
  before insert or update on public.zonas_cobertura
  for each row execute function public.la_zona_cuelga_de_una_region();

-- --- 2. Qué zonas eligió cada Asistente ------------------------------------
-- Una fila por zona tildada. Es la tabla que convierte «una» en «varias».
--
-- Una región tildada se guarda como una fila más, sin sus municipios: «trabajo
-- en todo el Oeste» es una respuesta válida y distinta de «trabajo en Morón y
-- en Ramos Mejía», y guardarla como la lista de sus municipios perdería la
-- diferencia justo cuando aparezca un municipio nuevo.
create table if not exists public.zonas_asistente (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    caregiver_id  uuid not null references public.caregivers(id) on delete cascade,
    zona_id       uuid not null references public.zonas_cobertura(id) on delete cascade,
    created_at    timestamp with time zone default timezone('utc'::text, now()),
    constraint una_zona_una_vez_por_asistente unique (caregiver_id, zona_id)
);

comment on table public.zonas_asistente is
  'Las zonas de cobertura que tildo un Asistente. Una region tildada es una fila, y no equivale a tildar todos sus municipios.';

-- --- 3. Lo que escribe quien no tuvo lista para tildar ---------------------
alter table public.caregivers add column if not exists zonas_texto text;

comment on column public.caregivers.zonas_texto is
  'Donde puede trabajar, escrito con sus palabras. Se usa cuando la Prestadora no cargo zonas en zonas_cobertura, que es el caso de cualquier Prestadora fuera del Area Metropolitana mientras no arme su lista.';

comment on column public.caregivers.zone is
  'La zona principal, en clave del vocabulario zona. Queda para que el directorio siga mostrando un lugar de un vistazo; la respuesta completa esta en zonas_asistente.';

-- --- 4. RLS: mismo patrón que la 0002 y la 0004 ----------------------------
alter table public.zonas_cobertura enable row level security;
alter table public.zonas_asistente enable row level security;

drop policy if exists "Zonas de la Prestadora" on public.zonas_cobertura;
create policy "Zonas de la Prestadora" on public.zonas_cobertura
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

drop policy if exists "Zonas del Asistente de la Prestadora" on public.zonas_asistente;
create policy "Zonas del Asistente de la Prestadora" on public.zonas_asistente
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

-- El permiso de tabla no es la RLS, y una política sobre una tabla sin permiso
-- no protege: bloquea. Se dan los dos, como hizo la 0032 con las demás.
revoke all on table public.zonas_cobertura from anon, authenticated;
revoke all on table public.zonas_asistente from anon, authenticated;

grant select, insert, update, delete on table public.zonas_cobertura to authenticated;
grant select, insert, update, delete on table public.zonas_asistente to authenticated;

create index if not exists idx_zonas_cobertura_tenant    on public.zonas_cobertura(tenant_id);
create index if not exists idx_zonas_cobertura_padre     on public.zonas_cobertura(zona_padre_id);
create index if not exists idx_zonas_asistente_caregiver on public.zonas_asistente(caregiver_id);
create index if not exists idx_zonas_asistente_zona      on public.zonas_asistente(zona_id);

-- --- 5. La puerta sin sesión ----------------------------------------------
-- Quien completa el formulario de reclutamiento todavía no tiene cuenta, así
-- que necesita ver la lista sin sesión. Exige el nombre corto y devuelve las
-- zonas activas de esa Prestadora: no hay forma de pedir «todas las zonas de
-- todas», igual que no hay forma de pedir la lista de Prestadoras (0021).
--
-- Devuelve vacío para una Prestadora que no cargó zonas, y eso no es un error:
-- es exactamente la señal de que hay que mostrar el campo de texto libre.
create or replace function public.zonas_de(p_slug text)
  returns table (id uuid, zona_padre_id uuid, clave text, nombre text, orden integer)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select z.id, z.zona_padre_id, z.clave, z.nombre, z.orden
    from public.zonas_cobertura z
    join public.tenants t on t.id = z.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
     and z.activa
   order by z.zona_padre_id nulls first, z.orden, z.nombre;
$$;

comment on function public.zonas_de(text) is
  'Las zonas de cobertura de UNA Prestadora, por su nombre corto, sin sesion, para el formulario de reclutamiento. Vacio significa que esa Prestadora no cargo lista y la pantalla tiene que preguntar en texto libre.';

revoke all on function public.zonas_de(text) from public;
grant execute on function public.zonas_de(text) to anon;
grant execute on function public.zonas_de(text) to authenticated;

-- --- 6. Una tercera Prestadora ficticia, sin zonas cargadas ----------------
-- No es relleno: es el único caso donde se puede probar el camino de texto
-- libre. Con dos Prestadoras que tienen lista, ese camino queda escrito y
-- nunca ejecutado, y una prueba que no puede fallar no prueba nada.
insert into public.tenants (slug, name, description, primary_color, accent_color, status)
values
  ('cuidarsur', 'Cuidar Sur',
   'Tercera Prestadora de ejemplo. Recién dada de alta y todavía sin zonas cargadas: existe para probar el camino de texto libre.',
   '#3B3A6B', '#D08C3C', 'activo')
on conflict (slug) do nothing;

-- --- 7. Las zonas de las dos Prestadoras que sí tienen lista ---------------
-- Listas distintas a propósito. Una prueba de aislamiento se hace con dos
-- Organizaciones con datos cargados: comprobar que una consulta devuelve vacío
-- no prueba nada, porque una RLS que niega todo devuelve lo mismo. Si las dos
-- tuvieran la misma lista, ver «Palermo» desde Cuidar Norte no distinguiría
-- entre leer lo propio y leer lo ajeno.
--
-- Los nombres son los del vocabulario `zona`, para que las claves casen y la
-- pantalla pueda traducir las cuatro regiones a los tres idiomas.

-- PresDemo: el Área Metropolitana entera.
insert into public.zonas_cobertura (tenant_id, zona_padre_id, clave, nombre, orden)
select (select id from public.tenants where slug = 'presdemo'),
       null, r.clave, r.nombre, r.orden
  from (values ('caba', 'Ciudad de Buenos Aires', 1),
               ('zona_norte', 'Zona Norte', 2),
               ('zona_oeste', 'Zona Oeste', 3),
               ('zona_sur', 'Zona Sur', 4)) as r(clave, nombre, orden)
on conflict (tenant_id, clave) do nothing;

insert into public.zonas_cobertura (tenant_id, zona_padre_id, clave, nombre, orden)
select p.tenant_id, p.id, h.clave, h.nombre, h.orden
  from (values ('palermo', 'Palermo', 'caba', 1),
               ('belgrano', 'Belgrano', 'caba', 2),
               ('recoleta', 'Recoleta', 'caba', 3),
               ('villa_urquiza', 'Villa Urquiza', 'caba', 4),
               ('nunez', 'Núñez', 'caba', 5),
               ('caballito', 'Caballito', 'caba', 6),
               ('flores', 'Flores', 'caba', 7),
               ('san_telmo', 'San Telmo', 'caba', 8),
               ('san_isidro', 'San Isidro', 'zona_norte', 1),
               ('vicente_lopez', 'Vicente López', 'zona_norte', 2),
               ('grand_bourg', 'Grand Bourg', 'zona_norte', 3),
               ('moron', 'Morón', 'zona_oeste', 1),
               ('ramos_mejia', 'Ramos Mejía', 'zona_oeste', 2),
               ('quilmes', 'Quilmes', 'zona_sur', 1),
               ('avellaneda', 'Avellaneda', 'zona_sur', 2),
               ('lomas', 'Lomas de Zamora', 'zona_sur', 3))
       as h(clave, nombre, padre, orden)
  join public.zonas_cobertura p
    on p.clave = h.padre
   and p.zona_padre_id is null
   and p.tenant_id = (select id from public.tenants where slug = 'presdemo')
on conflict (tenant_id, clave) do nothing;

-- Cuidar Norte: sólo donde trabaja su propia gente. Sin CABA, y sin los
-- municipios donde no tiene a nadie. Es una lista más corta y distinta, que es
-- justamente lo que hace falta para que la prueba de aislamiento signifique
-- algo.
insert into public.zonas_cobertura (tenant_id, zona_padre_id, clave, nombre, orden)
select (select id from public.tenants where slug = 'cuidarnorte'),
       null, r.clave, r.nombre, r.orden
  from (values ('zona_norte', 'Zona Norte', 1),
               ('zona_oeste', 'Zona Oeste', 2),
               ('zona_sur', 'Zona Sur', 3)) as r(clave, nombre, orden)
on conflict (tenant_id, clave) do nothing;

insert into public.zonas_cobertura (tenant_id, zona_padre_id, clave, nombre, orden)
select p.tenant_id, p.id, h.clave, h.nombre, h.orden
  from (values ('san_isidro', 'San Isidro', 'zona_norte', 1),
               ('vicente_lopez', 'Vicente López', 'zona_norte', 2),
               ('grand_bourg', 'Grand Bourg', 'zona_norte', 3),
               ('moron', 'Morón', 'zona_oeste', 1),
               ('ramos_mejia', 'Ramos Mejía', 'zona_oeste', 2),
               ('quilmes', 'Quilmes', 'zona_sur', 1))
       as h(clave, nombre, padre, orden)
  join public.zonas_cobertura p
    on p.clave = h.padre
   and p.zona_padre_id is null
   and p.tenant_id = (select id from public.tenants where slug = 'cuidarnorte')
on conflict (tenant_id, clave) do nothing;

-- --- 8. Los legajos que ya existían no se quedan sin zona ------------------
-- Cada uno tenía una zona en `caregivers.zone`. Pasa a ser la primera fila de
-- `zonas_asistente`, de la Prestadora a la que ese legajo pertenece. Sin esto
-- los legajos ficticios abrirían la pantalla nueva en blanco, y una base
-- desprolija hace desconfiar de todo lo demás que muestra.
insert into public.zonas_asistente (tenant_id, caregiver_id, zona_id)
select c.tenant_id, c.id, z.id
  from public.caregivers c
  join public.zonas_cobertura z
    on z.tenant_id = c.tenant_id
   and z.clave = c.zone
 where c.zone is not null
on conflict (caregiver_id, zona_id) do nothing;

notify pgrst, 'reload schema';
