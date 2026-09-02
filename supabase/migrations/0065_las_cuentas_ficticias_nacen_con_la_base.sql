-- =====================================================================
-- 0065 — Las cuentas ficticias nacen con la base
-- =====================================================================
--
-- Por qué hace falta
-- ------------------
-- La siembra deja trece legajos, veintiocho avisos y tres Prestadoras, y
-- **ninguna cuenta con la que entrar a mirarlos**. Medido contra la base de
-- esta máquina el 2 de septiembre de 2026: `auth.users` en cero y
-- `public.profiles` en cero, con todo lo demás cargado. Cada vez que la base
-- se rehace desde las migraciones —que es lo que este producto hace seguido,
-- a propósito— las cuentas que alguien había creado a mano desaparecen y no
-- queda forma de abrir el producto. Ése es el pendiente 47, y es más grande
-- de lo que decía su renglón: no faltaba la cuenta del Asistente, faltaban
-- todas.
--
-- De ahí sale un segundo agujero, que es el que de verdad rompe el producto.
-- `avisos.familia_id` apuntaba a una cuenta que no existía, así que los
-- veintiocho avisos estaban **sin autora**. Con la columna vacía:
--
--   * `avisos_abiertos()` no la mira, así que el Asistente ve los avisos y se
--     postula sin problema;
--   * pero las políticas de `postulaciones` y la vista
--     `postulaciones_de_mis_avisos` piden `a.familia_id = auth.uid()`, que
--     contra un nulo no da verdadero nunca.
--
-- O sea: el Asistente se postula, ve «postulado», y no hay ninguna sesión en
-- el mundo desde la que esa postulación se pueda leer. El circuito entero del
-- producto —publicar, postularse, contestar— quedaba cortado en el medio sin
-- un solo mensaje de error.
--
-- Lo que la 0030 dejó anotado, y por qué hoy se puede hacer
-- --------------------------------------------------------
-- La 0030 escribió por qué no creaba estas cuentas: «dar de alta una cuenta
-- desde una migración significa escribir una clave adentro del repositorio,
-- que es justo lo que el CLAUDE.md de la empresa prohíbe», y cerró con «el
-- día que haya cuentas de demostración, se les llena la columna y pasan a
-- verse también desde la sesión de cada Familia». Ese día es hoy, y el
-- argumento de la 0030 sigue en pie entero: **acá no hay ninguna clave.**
--
-- Las cuentas nacen sin clave (`encrypted_password` en nulo). Una cuenta sin
-- clave existe, tiene perfil, tiene Organización y sostiene todas las
-- referencias —el legajo del Asistente, la autoría de los avisos—, pero no
-- entra: GoTrue no tiene con qué comparar y contesta credenciales inválidas.
-- La clave la pone `scripts/abrir_cuentas_ficticias.mjs`, que la toma de la
-- variable de entorno `CLAVE_PRUEBA_LOCAL` y se niega a correr contra una
-- dirección que no sea la de esta máquina, igual que los dos guiones que ya
-- hacían eso.
--
-- Esto no es una vuelta larga por prolijidad. Las migraciones son las mismas
-- de los dos lados: una clave escrita acá abre estas seis cuentas también en
-- la base publicada, para cualquiera que lea el repositorio. Los datos son
-- inventados; la puerta no.
--
-- Qué crea
-- --------
-- Seis cuentas, en las dos Prestadoras ficticias que tienen avisos. Cuidar
-- Sur queda como está a propósito: estar casi vacía es lo que la hace útil
-- para probar el aislamiento.
--
--   PresDemo (la Organización ficticia de demostración)
--     * Marta Quiroga Ficticia — Asistente, atada al legajo que ya existe.
--     * Norma Bianchi Ficticia — Familia, autora de los catorce avisos.
--     * Cecilia Roldán Ficticia — personal de la Prestadora.
--   Cuidar Norte
--     * Silvia Ledesma Ficticia — Asistente, atada a su legajo.
--     * Raúl Ibarra Ficticio — Familia, autor de los catorce avisos.
--     * Marcos Ruiz Ficticio — personal de la Prestadora.
--
-- Las dos cuentas de Asistente usan el mismo correo que su legajo, porque son
-- la misma persona; las otras cuatro son personas nuevas, con la convención
-- de la 0003: nombre y apellido inventados, «Ficticia» o «Ficticio» adelante
-- de todo, y `@ejemplo.invalid`, que es un dominio que no puede existir.
--
-- Tres trampas que no avisan, y cómo se esquivan acá
-- --------------------------------------------------
--   1. El perfil lo arma solo el disparador `crear_perfil_al_registrarse`
--      leyendo `raw_user_meta_data`. Si ese jsonb no trae `tenant_slug`, el
--      perfil nace con la Organización en nulo, `prestadora_actual()`
--      devuelve nulo y todas las políticas niegan, sin un error que lo
--      explique. Por eso las tres claves van completas.
--   2. Ese mismo disparador acepta `caregiver` y `familiar`, y cualquier otra
--      palabra la convierte en `familiar` sin decir nada. Un `coordinador`
--      pedido al registrarse sale Familia. Por eso las dos cuentas del
--      personal se corrigen con un `update` después del insert: es lo que
--      mira `es_personal_de_prestadora()`, que compara literal contra
--      `'coordinador'`, y de eso dependen el panel y la validación de los
--      legajos. El `update` puede escribir el rol porque
--      `el_rol_y_la_prestadora_no_se_escriben_solos` se aparta cuando
--      `auth.uid()` es nulo, que es el caso de una migración.
--   3. `legajo_propio()` resuelve por `caregivers.user_id = auth.uid()`. Sin
--      esa columna atada, `avisos_abiertos()` devuelve cero filas —pide
--      `legajo_propio() is not null`— y la pantalla de avisos se ve vacía sin
--      ningún error.
--
-- Y la fila hermana de `auth.identities`
-- --------------------------------------
-- Sin ella la entrada por correo y clave falla aunque la cuenta esté bien
-- escrita: GoTrue busca la identidad del proveedor `email` antes de comparar
-- nada. `identities.email` es una columna generada a partir de
-- `identity_data`, así que no se escribe.
--
-- Se puede volver a correr
-- ------------------------
-- Todo mira antes de escribir: las cuentas por identificador y por correo,
-- las identidades por proveedor, el legajo sólo si está libre y los avisos
-- sólo los que están sin autora. Correrla dos veces no cambia nada, y no le
-- toca nada a ninguna cuenta de afuera de estas seis.
-- =====================================================================

-- ---------------------------------------------------------------------
-- La lista, escrita una sola vez
-- ---------------------------------------------------------------------
create temporary table las_cuentas_ficticias (
  id          uuid primary key,
  correo      text not null,
  nombre      text not null,
  slug        text not null,
  rol_final   text not null,  -- el que tiene que quedar en `profiles`
  rol_de_alta text not null,  -- el que el disparador acepta sin cambiarlo
  legajo_id   uuid            -- sólo las de Asistente
);
-- Se borra a mano al final y no con `on commit drop`: si esto llegara a
-- correrse fuera de una transacción, `on commit drop` la borraría en el acto
-- y los cinco pasos de abajo no encontrarían nada.

insert into las_cuentas_ficticias values
  ('ccccccc1-0000-4000-8000-000000000001', 'norma.ficticia@ejemplo.invalid',
   'Norma Bianchi Ficticia',  'presdemo',    'familiar',    'familiar',
   null),
  ('ccccccc1-0000-4000-8000-000000000002', 'marta.ficticia@ejemplo.invalid',
   'Marta Quiroga Ficticia',  'presdemo',    'caregiver',   'caregiver',
   'aaaaaaa1-0000-4000-8000-000000000001'),
  ('ccccccc1-0000-4000-8000-000000000003', 'cecilia.ficticia@ejemplo.invalid',
   'Cecilia Roldán Ficticia', 'presdemo',    'coordinador', 'familiar',
   null),
  ('ccccccc2-0000-4000-8000-000000000001', 'raul.ficticio@ejemplo.invalid',
   'Raúl Ibarra Ficticio',    'cuidarnorte', 'familiar',    'familiar',
   null),
  ('ccccccc2-0000-4000-8000-000000000002', 'silvia.ficticia@ejemplo.invalid',
   'Silvia Ledesma Ficticia', 'cuidarnorte', 'caregiver',   'caregiver',
   'bbbbbbb2-0000-4000-8000-000000000001'),
  ('ccccccc2-0000-4000-8000-000000000003', 'marcos.ficticio@ejemplo.invalid',
   'Marcos Ruiz Ficticio',    'cuidarnorte', 'coordinador', 'familiar',
   null);

-- ---------------------------------------------------------------------
-- 1. Las cuentas. Sin clave: la pone el guion local, nunca el repositorio.
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  c.id, 'authenticated', 'authenticated', c.correo,
  null, now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', c.nombre, 'role', c.rol_de_alta,
                     'tenant_slug', c.slug),
  now(), now(),
  '', '', '', '', '', '', '', '', false, false
from las_cuentas_ficticias c
where not exists (
  select 1 from auth.users u
   where u.id = c.id or lower(u.email) = lower(c.correo)
);

-- ---------------------------------------------------------------------
-- 2. La identidad del proveedor `email`. Sin esto la entrada falla igual.
-- ---------------------------------------------------------------------
insert into auth.identities (
  provider_id, user_id, identity_data, provider, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object(
    'sub', u.id::text, 'email', u.email,
    'email_verified', true, 'phone_verified', false
  ),
  'email', now(), now()
from auth.users u
join las_cuentas_ficticias c on c.id = u.id
where not exists (
  select 1 from auth.identities i
   where i.user_id = u.id and i.provider = 'email'
);

-- ---------------------------------------------------------------------
-- 3. El perfil. El disparador ya lo armó con lo que acepta; acá se completa
--    lo que él no puede escribir —el rol del personal de la Prestadora— y
--    queda la red por si alguna vez el disparador no estuviera.
-- ---------------------------------------------------------------------
insert into public.profiles (id, tenant_id, full_name, role)
select c.id, t.id, c.nombre, c.rol_final
  from las_cuentas_ficticias c
  join public.tenants t on t.slug = c.slug
on conflict (id) do nothing;

update public.profiles p
   set role      = c.rol_final,
       tenant_id = t.id,
       full_name = c.nombre
  from las_cuentas_ficticias c
  join public.tenants t on t.slug = c.slug
 where p.id = c.id
   and (p.role      is distinct from c.rol_final
     or p.tenant_id is distinct from t.id
     or p.full_name is distinct from c.nombre);

-- ---------------------------------------------------------------------
-- 4. El legajo del Asistente, atado a su cuenta. Sin esto la aplicación del
--    teléfono se abre y no muestra un solo aviso.
-- ---------------------------------------------------------------------
update public.caregivers cg
   set user_id = c.id
  from las_cuentas_ficticias c
  join public.tenants t on t.slug = c.slug
 where c.legajo_id is not null
   and cg.id        = c.legajo_id
   and cg.tenant_id = t.id
   and cg.user_id is null;

-- ---------------------------------------------------------------------
-- 5. Los avisos pasan a tener autora, cada uno en su propia Organización.
--    El `tenant_id` va en la condición además del identificador: es lo que
--    garantiza que ninguna Familia quede firmando un aviso ajeno.
-- ---------------------------------------------------------------------
update public.avisos a
   set familia_id = c.id
  from las_cuentas_ficticias c
  join public.tenants t on t.slug = c.slug
 where c.rol_final = 'familiar'
   and a.tenant_id = t.id
   and a.familia_id is null;

-- ---------------------------------------------------------------------
-- 6. Y que no vuelva a pasar.
--
--    `familia_id` nació aceptando nulos por dos motivos, y los dos se
--    revisaron antes de tocar nada:
--
--      * el histórico, que la 0030 escribió —no había cuentas—, y que esta
--        misma migración acaba de cerrar;
--      * el estructural, que es la llave foránea de la 0020:
--        `references auth.users(id) on delete set null`. Escribir nulos donde
--        no se aceptan nulos no es compatible, así que la llave cambia en el
--        mismo paso.
--
--    Queda `on delete cascade`, que es la forma que ya tiene la columna
--    hermana: `conversaciones.familia_id` nació `not null` y con
--    `on delete cascade` (0054), igual que `mensajes.autor_id`. O sea
--    que borrar una cuenta de Familia ya se lleva sus conversaciones y sus
--    mensajes; que se lleve también sus avisos es lo coherente, no una
--    excepción. Un aviso sin quien lo publicó no es un aviso: es exactamente
--    lo que venía rompiendo el circuito de postulaciones.
--
--    Se hace condicionado a que no quede ningún nulo. Si en alguna base
--    quedara un aviso sin autora —una Organización con avisos y sin ninguna
--    Familia, por ejemplo—, esto no se planta ni fuerza nada: avisa, sigue, y
--    la columna queda como estaba.
-- ---------------------------------------------------------------------
do $marca$
declare
  huerfanos integer;
begin
  select count(*) into huerfanos
    from public.avisos
   where familia_id is null;

  if huerfanos > 0 then
    raise notice
      'avisos.familia_id sigue aceptando nulos: hay % aviso(s) sin autora. '
      'Hace falta una cuenta de Familia en la Organización de esos avisos antes '
      'de poder exigir la columna.', huerfanos;
    return;
  end if;

  alter table public.avisos
    drop constraint if exists avisos_familia_id_fkey;

  alter table public.avisos
    add constraint avisos_familia_id_fkey
    foreign key (familia_id) references auth.users(id) on delete cascade;

  alter table public.avisos
    alter column familia_id set not null;
end
$marca$;

drop table las_cuentas_ficticias;

notify pgrst, 'reload schema';
