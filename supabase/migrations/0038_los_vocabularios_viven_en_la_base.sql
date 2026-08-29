-- =====================================================================
-- 0038 — Los vocabularios dejan de vivir en un archivo y pasan a la base
--
-- «Los catálogos salen de la base» es una regla de la empresa, y hasta
-- acá el producto la cumplía a medias: ninguna pantalla escribía sus
-- opciones, pero las veinticuatro listas vivían en
-- `data/catalogo-vocabularios.json`. Un archivo servido al navegador no
-- es una base: nadie puede agregarle una opción sin publicar una versión
-- nueva del producto.
--
-- Lo que eso costaba, en concreto: una Prestadora que atiende una
-- patología que no está entre las diecinueve de la lista no tiene forma
-- de agregarla. Ni ella ni nadie. Hay que editar un archivo, hacer un
-- commit y desplegar. Y las Prestadoras ficticias se tratan como
-- clientes reales, así que ése es un agujero del producto y no una
-- comodidad de desarrollo.
--
-- **Dos tablas, no veinticuatro.** Un vocabulario es una lista con
-- nombre, y una lista con nombre no necesita una tabla propia. Con dos
-- tablas genéricas, agregar el vocabulario número veinticinco es una
-- fila y no una migración.
--
-- **Dos escalones, como los cursos de la 0008.** `tenant_id` en nulo es
-- el catálogo general, el que trae el producto y ve todo el mundo;
-- `tenant_id` cargado es lo que agregó esa Prestadora, que no ve ninguna
-- otra. Eso deja hecho el lugar donde la Prestadora carga lo suyo,
-- aunque la pantalla para hacerlo se construya después.
--
-- **Por qué esto convive con `zonas_cobertura` (0035) y no es lo mismo
-- dos veces.** El vocabulario `zona` es la tabla de traducciones —la
-- clave `palermo` dice «Palermo» en los tres idiomas— y
-- `zonas_cobertura` es qué zonas ofrece cada Prestadora para tildar. La
-- 0035 ya lo dice: cuando la zona es una de las que el producto conoce,
-- la pantalla la traduce con el vocabulario `zona`. Sacarlo de acá
-- dejaría a cinco pantallas sin cómo traducir.
--
-- **Y el archivo no desaparece: cambia de dueño.** Las dos PWA lo
-- guardan para trabajar sin red (`service-worker.js`, la lista de
-- archivos), así que borrarlo dejaría sin opciones a quien abre la
-- aplicación en la calle. Pasa a ser una copia **generada desde la
-- base** por `scripts/generar_vocabularios.mjs`, no un archivo que
-- alguien edita: la verdad es la base, la copia es el respaldo, y un
-- chequeo falla si se despegaron. Es el mismo trato que Careonys le da a
-- su código compartido con `verificar_identidad.mjs`.
--
-- Se sigue el patrón de la 0002 y la 0035: `tenant_id` en cada tabla, la
-- Organización la resuelve `prestadora_actual()` por la membresía de
-- quien inició sesión, nada visible para `anon` por tabla, y la lectura
-- sin sesión sale por una puerta que exige el nombre corto.
-- =====================================================================

-- --- 1. Un solo lugar que sabe qué es un texto completo --------------------
-- «i18n desde el día uno» es una regla, y una regla sin comprobación es una
-- intención. Ésta es la comprobación, y está una sola vez: la usan las dos
-- tablas de acá y la usará cualquier tabla nueva que guarde texto visible.
-- Copiar la misma condición en cada `check` sería el patrón repetido sin punto
-- único de verdad que la regla prohíbe.
--
-- Exige los tres idiomas y que ninguno esté vacío. Un texto con `en` en blanco
-- no falla al guardarse y falla en pantalla, que es la peor de las dos formas.
create or replace function public.i18n_completo(p_texto jsonb)
  returns boolean
  language sql
  immutable
as $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and coalesce(
           (select bool_and(jsonb_typeof(p_texto -> idioma) = 'string'
                            and length(btrim(p_texto ->> idioma)) > 0)
              from unnest(array['es-AR', 'en', 'pt-BR']) as idioma),
           false);
$$;

comment on function public.i18n_completo(jsonb) is
  'Verdadero si el jsonb trae los tres idiomas del producto con texto no vacio. Punto unico de verdad de la regla i18n desde el dia uno; la usan los check de las tablas que guardan texto visible.';

-- Y el mínimo, para el único caso en que la traducción no depende de nosotros.
-- Ver el `check` de `vocabulario_items`, más abajo, que explica cuál es.
create or replace function public.i18n_minimo(p_texto jsonb)
  returns boolean
  language sql
  immutable
as $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and jsonb_typeof(p_texto -> 'es-AR') = 'string'
     and length(btrim(p_texto ->> 'es-AR')) > 0;
$$;

comment on function public.i18n_minimo(jsonb) is
  'Verdadero si el jsonb trae al menos el es-AR con texto no vacio. Solo vale acompanado de i18n_pendiente en verdadero, que deja anotado por que falta el resto.';

-- Son de las que evalúan los `check` de las tablas, así que conservan
-- `authenticated`: quitárselo no devolvería cero filas, haría fallar el alta.
revoke all on function public.i18n_completo(jsonb) from public, anon;
revoke all on function public.i18n_minimo(jsonb)  from public, anon;
grant execute on function public.i18n_completo(jsonb) to authenticated;
grant execute on function public.i18n_minimo(jsonb)  to authenticated;

-- --- 2. Los vocabularios ---------------------------------------------------
-- `cerrada` dice si la lista admite que una Prestadora le agregue opciones. No
-- lo consume ninguna pantalla todavía: lo consumirá la que permita agregarlas,
-- y viene del archivo, donde ya estaba declarado uno por uno.
create table if not exists public.vocabularios (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid references public.tenants(id) on delete cascade,
    clave       text not null,
    i18n        jsonb not null,
    cerrada     boolean not null default true,
    orden       integer not null default 0,
    activo      boolean not null default true,
    created_at  timestamp with time zone not null default timezone('utc'::text, now()),
    constraint la_clave_no_esta_vacia check (length(btrim(clave)) > 0),
    -- El título del producto va en los tres idiomas; el de un vocabulario que
    -- creó una Prestadora, en el idioma en que ella lo escribió. Mismo criterio
    -- que en los ítems, y el mismo que fijó la 0035 para las zonas.
    constraint el_titulo_esta_en_los_tres_idiomas check (
      case when tenant_id is not null then public.i18n_minimo(i18n)
           else public.i18n_completo(i18n) end),
    constraint un_vocabulario_una_vez_por_prestadora unique (tenant_id, clave)
);

-- El `unique` de arriba no alcanza para el catálogo general: en un índice único
-- dos nulos son distintos, así que dejaría entrar dos `patologia` generales sin
-- quejarse, y la puerta devolvería una sola sin decir cuál.
create unique index if not exists idx_vocabulario_general_unico
  on public.vocabularios(clave) where tenant_id is null;

comment on table public.vocabularios is
  'Las listas de opciones del producto. tenant_id en nulo es el catalogo general que ve todo el mundo; cargado es un vocabulario propio de esa Prestadora. Los items estan en vocabulario_items.';

comment on column public.vocabularios.cerrada is
  'Falso si una Prestadora puede agregarle opciones propias. Viene declarado uno por uno desde el catalogo que vivia en data/catalogo-vocabularios.json.';

-- --- 3. Los ítems ----------------------------------------------------------
-- `extra` guarda lo que sólo tienen algunos ítems y las pantallas leen: el
-- ícono y la bajada de las tarjetas, si el tipo de Asistente requiere
-- matrícula, el horario de un turno, y de qué región cuelga una zona. Son cinco
-- propiedades sobre ciento cuarenta y dos ítems: en columnas serían cinco casi
-- siempre vacías, y una migración el día que aparezca la sexta.
--
-- Que sea `jsonb` no lo vuelve tierra de nadie: lo que puede haber adentro está
-- escrito en `docs/CATALOGO.md`, y las pantallas leen propiedades con nombre,
-- no lo que venga.
create table if not exists public.vocabulario_items (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid references public.tenants(id) on delete cascade,
    vocabulario_id  uuid not null references public.vocabularios(id) on delete cascade,
    clave           text not null,
    i18n            jsonb not null,
    i18n_pendiente  boolean not null default false,
    nota            text,
    extra           jsonb not null default '{}'::jsonb,
    orden           integer not null default 0,
    activo          boolean not null default true,
    created_at      timestamp with time zone not null default timezone('utc'::text, now()),
    constraint la_clave_del_item_no_esta_vacia check (length(btrim(clave)) > 0),
    -- Tres casos, y el orden importa porque el primero es el que más se usa.
    --
    -- **Lo que carga una Prestadora va en el idioma en que lo escribió.** La
    -- regla de i18n rige el texto que escribimos nosotros —el rótulo, la ayuda,
    -- el mensaje—, no lo que carga quien usa el sistema. Es exactamente lo que
    -- ya decidió la 0035 para los nombres de las zonas, y pedirle tres idiomas
    -- a una Prestadora sería pedirle que traduzca sus propios datos.
    --
    -- **Lo que trae el producto va en los tres**, sin excepción posible.
    --
    -- **Salvo cuando la traducción no la decide quien carga la fila.** Hoy hay
    -- exactamente un caso: `guardia_12`. «Guardia» es palabra del glosario de
    -- los dos productos, no está traducida en ningún archivo del proyecto, y
    -- reusar «shift» o «turno» pisaría una distinción que el glosario define a
    -- propósito; la decide el Desarrollador. Eso vivía como comentario adentro
    -- del JSON, donde no lo encuentra nadie que no lea el archivo entero. Acá
    -- se pregunta: `select clave, nota from vocabulario_items where
    -- i18n_pendiente`. Un agujero que se puede consultar se cierra; uno
    -- anotado en un comentario se olvida. Y `nota` es obligatoria para que
    -- nadie use el permiso sin decir por qué.
    constraint el_item_esta_en_los_tres_idiomas check (
      case
        when tenant_id is not null then public.i18n_minimo(i18n)
        when i18n_pendiente        then public.i18n_minimo(i18n)
                                        and length(btrim(coalesce(nota, ''))) > 0
        else public.i18n_completo(i18n)
      end),
    constraint el_extra_es_un_objeto check (jsonb_typeof(extra) = 'object'),
    constraint un_item_una_vez_por_prestadora unique (vocabulario_id, tenant_id, clave)
);

create unique index if not exists idx_item_general_unico
  on public.vocabulario_items(vocabulario_id, clave) where tenant_id is null;

comment on table public.vocabulario_items is
  'Las opciones de cada vocabulario. tenant_id en nulo es la opcion que trae el producto; cargado es la que agrego esa Prestadora, y puede colgar de un vocabulario general.';

comment on column public.vocabulario_items.i18n_pendiente is
  'Solo para el catalogo general. Verdadero cuando la traduccion falta porque la decide el Desarrollador y todavia no la decidio, y obliga a escribir la nota. La lista se pide con: select clave, nota from vocabulario_items where i18n_pendiente. Lo que carga una Prestadora no lo usa: su texto va en el idioma en que lo escribio.';

comment on column public.vocabulario_items.nota is
  'Por que ese item tiene la traduccion pendiente. No la lee ninguna pantalla.';

comment on column public.vocabulario_items.extra is
  'Lo que solo tienen algunos items: icono, bajada (en los tres idiomas), requiere_matricula, horario, region. Lo que puede haber adentro esta escrito en docs/CATALOGO.md.';

-- --- 4. Lo que ninguna clave ajena puede impedir ---------------------------
-- Tres cosas, y las tres son de aislamiento o de ambigüedad. No se pueden pedir
-- con una clave ajena compuesta como hizo la 0035, porque acá el `tenant_id` de
-- un ítem **puede** ser distinto del de su vocabulario: ése es justamente el
-- caso bueno, la Prestadora que le agrega una patología a la lista general.
create or replace function public.el_vocabulario_no_cruza_prestadoras()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_duenio  uuid;
  v_cerrada boolean;
  v_clave   text;
begin
  select tenant_id, cerrada, clave into v_duenio, v_cerrada, v_clave
    from public.vocabularios where id = new.vocabulario_id;

  -- 1. Un ítem cuelga del vocabulario general o del de su propia Prestadora.
  --    Nunca del de otra.
  if v_duenio is not null and v_duenio is distinct from new.tenant_id then
    raise exception 'Un ítem sólo puede colgar del vocabulario general o de uno de su misma Prestadora.';
  end if;

  -- 2. Una opción del producto no cuelga de un vocabulario de una Prestadora:
  --    quedaría cargada y no la vería nadie, porque la puerta no la devuelve.
  if new.tenant_id is null and v_duenio is not null then
    raise exception 'Una opción del catálogo general no puede colgar de un vocabulario de una Prestadora.';
  end if;

  -- 3. Una lista cerrada no admite opciones propias. Sin esto `cerrada` sería
  --    adorno: quedaría declarado en veinte vocabularios y no impediría nada,
  --    y la primera pantalla que permita agregar opciones tendría que
  --    acordarse de mirarlo. Una regla que depende de que la pantalla se
  --    acuerde no es una regla.
  --
  --    Por qué existen las cerradas: `genero` o `condicion_fiscal` no son
  --    preferencias de una Prestadora, son categorías que después se comparan
  --    entre Organizaciones y con la ley. Una lista abierta ahí rompe todo
  --    recuento y toda equivalencia el día de la fusión.
  if new.tenant_id is not null and v_cerrada then
    raise exception 'El vocabulario «%» es una lista cerrada y no admite opciones propias de una Prestadora.', v_clave;
  end if;

  -- 4. Una Prestadora no puede repetir una clave que ya trae el producto. Con
  --    las dos cargadas la pantalla mostraría la misma opción dos veces, y lo
  --    guardado no diría cuál de las dos se eligió.
  if new.tenant_id is not null and exists (
       select 1 from public.vocabulario_items i
        where i.vocabulario_id = new.vocabulario_id
          and i.tenant_id is null
          and i.clave = new.clave) then
    raise exception 'La clave «%» ya existe en el catálogo general de ese vocabulario.', new.clave;
  end if;

  return new;
end;
$$;

revoke all on function public.el_vocabulario_no_cruza_prestadoras() from public, anon, authenticated;

drop trigger if exists vocabulario_items_no_cruzan on public.vocabulario_items;
create trigger vocabulario_items_no_cruzan
  before insert or update on public.vocabulario_items
  for each row execute function public.el_vocabulario_no_cruza_prestadoras();

-- Lo mismo un escalón más arriba: una Prestadora no puede llamar a su
-- vocabulario propio como uno del producto. Si pudiera, la puerta tendría que
-- elegir entre dos listas con el mismo nombre.
create or replace function public.el_vocabulario_propio_no_pisa_al_general()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.tenant_id is not null and exists (
       select 1 from public.vocabularios v
        where v.tenant_id is null and v.clave = new.clave) then
    raise exception 'El vocabulario «%» ya existe en el catálogo general; para agregarle opciones no hace falta crear uno propio.', new.clave;
  end if;
  return new;
end;
$$;

revoke all on function public.el_vocabulario_propio_no_pisa_al_general() from public, anon, authenticated;

drop trigger if exists vocabularios_no_pisan_al_general on public.vocabularios;
create trigger vocabularios_no_pisan_al_general
  before insert or update on public.vocabularios
  for each row execute function public.el_vocabulario_propio_no_pisa_al_general();

-- --- 5. RLS ----------------------------------------------------------------
-- Se lee el general y lo propio; se escribe solamente lo propio. Van cuatro
-- políticas por tabla y no una sola `for all`, justamente por esa diferencia:
-- con `for all` la misma condición que habilita a leer el catálogo general
-- habilitaría a borrarlo, y una Prestadora dejaría a todas las demás sin
-- patologías.
alter table public.vocabularios      enable row level security;
alter table public.vocabulario_items enable row level security;

drop policy if exists "Vocabularios que se pueden leer" on public.vocabularios;
create policy "Vocabularios que se pueden leer" on public.vocabularios
  for select to authenticated
  using (tenant_id is null or tenant_id = public.prestadora_actual());

drop policy if exists "Vocabularios propios: alta" on public.vocabularios;
create policy "Vocabularios propios: alta" on public.vocabularios
  for insert to authenticated
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Vocabularios propios: cambio" on public.vocabularios;
create policy "Vocabularios propios: cambio" on public.vocabularios
  for update to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual())
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Vocabularios propios: baja" on public.vocabularios;
create policy "Vocabularios propios: baja" on public.vocabularios
  for delete to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Opciones que se pueden leer" on public.vocabulario_items;
create policy "Opciones que se pueden leer" on public.vocabulario_items
  for select to authenticated
  using (tenant_id is null or tenant_id = public.prestadora_actual());

drop policy if exists "Opciones propias: alta" on public.vocabulario_items;
create policy "Opciones propias: alta" on public.vocabulario_items
  for insert to authenticated
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Opciones propias: cambio" on public.vocabulario_items;
create policy "Opciones propias: cambio" on public.vocabulario_items
  for update to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual())
  with check (tenant_id is not null and tenant_id = public.prestadora_actual());

drop policy if exists "Opciones propias: baja" on public.vocabulario_items;
create policy "Opciones propias: baja" on public.vocabulario_items
  for delete to authenticated
  using (tenant_id is not null and tenant_id = public.prestadora_actual());

-- El permiso de tabla no es la RLS. Una política perfecta sobre una tabla sin
-- permiso no protege: bloquea, con `42501` y una sesión válida.
revoke all on table public.vocabularios      from anon, authenticated;
revoke all on table public.vocabulario_items from anon, authenticated;

grant select, insert, update, delete on table public.vocabularios      to authenticated;
grant select, insert, update, delete on table public.vocabulario_items to authenticated;

create index if not exists idx_vocabularios_tenant on public.vocabularios(tenant_id);
create index if not exists idx_items_vocabulario   on public.vocabulario_items(vocabulario_id);
create index if not exists idx_items_tenant        on public.vocabulario_items(tenant_id);

-- --- 6. La puerta sin sesión ----------------------------------------------
-- El catálogo lo necesitan pantallas que se abren sin cuenta: el formulario de
-- reclutamiento, el directorio, la solicitud de una Familia. Así que no se
-- resuelve abriéndole las tablas a `anon` —eso le mostraría a cualquiera las
-- opciones propias de todas las Prestadoras— sino con la misma clase de puerta
-- que la 0021 y la 0035: se pide por el nombre corto y se devuelve el general
-- más el de esa Prestadora, de ninguna otra.
--
-- **Sin nombre corto devuelve el catálogo general**, y eso es correcto, no un
-- descuido: hay pantallas que se abren sin Prestadora en la dirección, y el
-- catálogo general no es de nadie.
--
-- Devuelve el objeto ya armado con la forma que espera `js/catalogo.js`, para
-- que el cambio del lado del navegador sea una función y no nueve pantallas.
create or replace function public.vocabularios_de(p_slug text default null)
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
    select v.*
      from public.vocabularios v
     where v.activo
       and (v.tenant_id is null or v.tenant_id = (select id from prestadora))
  ),
  -- Los disparadores ya impiden que una Prestadora repita una clave del
  -- general. Esto lo vuelve a asegurar acá porque `jsonb_object_agg` con dos
  -- claves iguales no falla: se queda con una y no dice cuál.
  elegidos as (
    select distinct on (clave) *
      from visibles
     order by clave, (tenant_id is not null) desc
  )
  select coalesce(
           jsonb_object_agg(e.clave, jsonb_build_object(
             'titulo',  e.i18n,
             'cerrada', e.cerrada,
             'items',   coalesce((
               select jsonb_agg(
                        jsonb_build_object('clave', i.clave) || i.i18n || i.extra
                        order by i.orden, i.clave)
                 from public.vocabulario_items i
                where i.vocabulario_id = e.id
                  and i.activo
                  and (i.tenant_id is null
                       or i.tenant_id = (select id from prestadora))
             ), '[]'::jsonb)
           )),
           '{}'::jsonb)
    from elegidos e;
$$;

comment on function public.vocabularios_de(text) is
  'El catalogo de vocabularios con la forma que espera js/catalogo.js: el general mas el propio de UNA Prestadora, por su nombre corto, sin sesion. Sin nombre corto devuelve solo el general.';

revoke all on function public.vocabularios_de(text) from public;
grant execute on function public.vocabularios_de(text) to anon;
grant execute on function public.vocabularios_de(text) to authenticated;

notify pgrst, 'reload schema';
