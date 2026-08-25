-- 0021: no hay lista de Prestadoras ni directorio suelto, hay puertas con nombre
--
-- Por qué
-- -------
-- El Desarrollador lo cerró el 25 de agosto de 2026, en dos frases que dicen lo
-- mismo desde dos lados:
--
--   * «Por el principio de aislamiento cada prestadora tiene su propio
--     directorio, sus propias familias, etc. No se mezcla nada. No existe un
--     registro público comunitario a varias prestadoras.»
--   * «No existe una lista de prestadoras que el cliente, familia, asistente o
--     vaya uno a saber quién pueda ver. Cada prestadora sólo puede verse y
--     habilitarse desde el panel de control de CeltaTech, que es al fin y al
--     cabo el dueño del software y con quien cada una contrata su uso.»
--
-- Hasta hoy las dos cosas se leían sin sesión:
--
--   | Qué | Qué devolvía al rol anónimo |
--   |---|---|
--   | `directorio` | los legajos publicados de **todas** las Prestadoras, mezclados |
--   | `tenants` | la lista entera de Prestadoras activas |
--
-- Y no es una sospecha: se preguntó contra el servidor de verdad antes de
-- escribir esto, con la clave publicable, sin ninguna sesión. Siete filas de
-- legajos y dos Prestadoras.
--
-- El rol anónimo es el de la clave que viaja adentro de cada pantalla y que
-- cualquiera lee del navegador. Que la pantalla filtrara bien no importa: la
-- regla 2 de `CLAUDE.md` pide aislamiento «en aplicación y base de datos, nunca
-- solo frontend», y una lista que sólo separa porque el que pregunta se porta
-- bien no separa nada.
--
-- Por qué funciones y no políticas
-- --------------------------------
-- Porque **ninguna política puede exigir un filtro**. Una política decide qué
-- filas puede ver quien pregunta; no puede obligar a que la pregunta traiga un
-- `where`. Y sin sesión la base no tiene a quién preguntarle de qué Prestadora
-- es la visita: no hay usuario, no hay perfil, no hay nada que consultar.
--
-- Lo único que resuelve las dos cosas a la vez es una función con un argumento
-- obligatorio: el nombre corto de la Prestadora, el mismo que ya viaja en `?t=`
-- y en el subdominio. Sin ese dato no devuelve nada; con ese dato devuelve una
-- sola. El filtro deja de ser una cortesía del que llama y pasa a ser la única
-- forma de entrar.
--
-- Después de esta migración el rol anónimo no lee **ninguna** tabla ni vista de
-- este esquema. Tiene tres puertas, y las tres piden el nombre de una
-- Prestadora.
--
-- Lo que esto deja de funcionar, a propósito
-- ------------------------------------------
-- **Entrar sin nombrar ninguna Prestadora deja de mostrar algo.** Hoy, cuando
-- la dirección no dice cuál es, la pantalla pide la primera Prestadora que
-- devuelva la base y muestra esa. Eso *es* leer la lista, así que se va con
-- ella. Quien entre sin enlace de su Prestadora va a ver que le falta el
-- enlace, que es exactamente lo que le pasa.
--
-- Lo que esta migración no construye
-- ----------------------------------
-- **El panel de control de CeltaTech no existe todavía.** El Desarrollador dijo
-- que ahí es donde una Prestadora se ve y se habilita, y hoy no hay ni pantalla
-- ni rol que lo haga: `status` se toca a mano contra la base. Careonys sí lo
-- tiene resuelto, con un rol por encima de las Prestadoras. Queda registrado
-- como pendiente y no se improvisa acá.
--
-- La excepción, dicha y no disimulada
-- -----------------------------------
-- `CLAUDE.md` §4 dice que ninguna función que se saltee la RLS queda al alcance
-- de quien no inició sesión, y estas tres quedan: el directorio y la pantalla de
-- ingreso se ven sin cuenta, así que la puerta se abre sin sesión o no hay ni
-- directorio ni ingreso. Lo que la excepción **no** relaja: ninguna devuelve una
-- columna que no estuviera publicada ya, ninguna toca datos de contacto, y las
-- tres exigen el nombre de una Prestadora. Quedan anotadas una por una, con su
-- motivo, en `scripts/verificar_esquema.mjs` — que sin esa anotación haría
-- fallar el chequeo, y tiene que hacerlo fallar, porque cualquier otra función
-- así sería un descuido.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. El rol anónimo deja de leer la lista de legajos ─────────────────────
-- Y el autenticado también. Una vista lee sus tablas con los permisos de quien
-- la creó y no con los de quien la consulta, así que la RLS de `caregivers` no
-- la frena: cualquier sesión que la pidiera sin filtro vería las dos empresas
-- igual que el anónimo. Nadie la consulta directo nunca más.
revoke select on public.directorio from anon;
revoke select on public.directorio from authenticated;


-- ── 2. El rol anónimo deja de leer la lista de Prestadoras ─────────────────
-- Esta política devolvía todas las activas a quien no inició sesión. Era lo que
-- hacía falta para resolver un nombre corto antes de tener cuenta, pero de paso
-- publicaba quiénes son los clientes de CeltaTech.
drop policy if exists "Directorio de Prestadoras" on public.tenants;
revoke all on table public.tenants from anon;

-- La política de la sesión iniciada no se toca: cada quien sigue viendo su
-- propia Prestadora y ninguna otra (migración 0002).


-- ── 3. Las tres puertas ────────────────────────────────────────────────────
-- El argumento es el nombre corto y no el identificador: es lo que la dirección
-- ya tiene, así que la pantalla no necesita haber leído nada antes de preguntar.
--
-- `stable` y no `volatile` para que la base las planifique como una consulta y
-- no como un procedimiento.

-- 3.1 Resolver una Prestadora por su nombre corto, para saber qué pintar.
-- Devuelve las columnas de marca y ni una más: `status` y la fecha de alta son
-- asunto entre CeltaTech y su cliente, no de quien abre la pantalla.
create or replace function public.prestadora_por_slug(p_slug text)
  returns table (id uuid, slug text, name text,
                 primary_color text, accent_color text, logo_url text)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select t.id, t.slug, t.name, t.primary_color, t.accent_color, t.logo_url
    from public.tenants t
   where t.slug = p_slug
     and t.status = 'activo'
   limit 1;
$$;

comment on function public.prestadora_por_slug(text) is
  'Resuelve UNA Prestadora por su nombre corto, sin sesión, para que la pantalla sepa qué nombre y qué colores mostrar. Es la única forma de leer tenants sin cuenta, y no hay ninguna que devuelva más de una: el Desarrollador decidió el 25 de agosto de 2026 que no existe una lista de Prestadoras visible para nadie fuera del panel de control de CeltaTech.';

-- 3.2 El directorio de esa Prestadora.
create or replace function public.directorio_de(p_slug text)
  returns setof public.directorio
  language sql
  stable
  security definer
  set search_path = public
as $$
  select d.*
    from public.directorio d
    join public.tenants t on t.id = d.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
   order by d.full_name;
$$;

comment on function public.directorio_de(text) is
  'El directorio de UNA Prestadora, la que nombra el argumento. Es la única forma de leer directorio: la vista no está concedida a nadie. Sin nombre corto no devuelve nada, así que no existe la respuesta que mezcla dos empresas.';

-- 3.3 Una sola persona de ese directorio.
-- Pide las dos cosas a propósito: con el identificador solo, un enlace escrito a
-- mano abriría el perfil de alguien de otra empresa.
create or replace function public.perfil_del_directorio(p_slug text, p_id uuid)
  returns setof public.directorio
  language sql
  stable
  security definer
  set search_path = public
as $$
  select d.*
    from public.directorio d
    join public.tenants t on t.id = d.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
     and d.id = p_id
   limit 1;
$$;

comment on function public.perfil_del_directorio(text, uuid) is
  'Una persona del directorio, dentro de la Prestadora que nombra el argumento.';


-- ── 4. Quién puede llamarlas ───────────────────────────────────────────────
-- `public` es todo el mundo, incluidos roles que ni existen todavía: se le
-- revoca siempre y primero. `anon` conserva el permiso porque el directorio y
-- la pantalla de ingreso se ven sin cuenta, y es la excepción explicada arriba.
revoke all on function public.prestadora_por_slug(text)         from public;
revoke all on function public.directorio_de(text)               from public;
revoke all on function public.perfil_del_directorio(text, uuid) from public;

grant execute on function public.prestadora_por_slug(text)         to anon;
grant execute on function public.prestadora_por_slug(text)         to authenticated;
grant execute on function public.directorio_de(text)               to anon;
grant execute on function public.directorio_de(text)               to authenticated;
grant execute on function public.perfil_del_directorio(text, uuid) to anon;
grant execute on function public.perfil_del_directorio(text, uuid) to authenticated;
