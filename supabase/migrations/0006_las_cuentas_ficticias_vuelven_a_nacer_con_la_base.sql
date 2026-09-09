-- =====================================================================
-- 0006 — Las cuentas ficticias vuelven a nacer con la base
-- =====================================================================
--
-- Qué se rompió
-- -------------
-- El aplastamiento de las setenta y seis migraciones en tres archivos se hizo
-- con un volcado del esquema `public`, y las cuentas ficticias no viven en
-- `public`: viven en `auth`. Así que se fueron con el volcado y nadie lo notó,
-- porque la siembra entra con los disparadores apagados y las llaves foráneas
-- dormidas. Medido contra la base de esta máquina el 9 de septiembre de 2026:
--
--   auth.users 0, auth.identities 0, public.profiles 6, y los seis perfiles
--   apuntando a una cuenta que no existe.
--
-- O sea que el producto quedó otra vez como estaba antes de aquella migración:
-- trece legajos, doce avisos, tres Prestadoras, y **ninguna cuenta con la que
-- entrar a mirarlos**. Peor todavía, tres guiones del repositorio afirman lo
-- contrario. `scripts/abrir_cuentas_ficticias.mjs` empieza diciendo que «las
-- cuentas ficticias quedaron sembradas junto con el resto de los datos» y que
-- «existen, sostienen todas las referencias, y no entran»: lo primero dejó de
-- ser cierto, y el guion no tiene cómo avisarlo porque busca por correo y no
-- encuentra nada.
--
-- Qué repone esta migración, y qué no hace falta reponer
-- -----------------------------------------------------
-- Las seis cuentas y sus identidades, que es lo único que falta. El legajo
-- atado y la autoría de los avisos hoy ya vienen adentro de la siembra, y se
-- comprobó fila por fila antes de escribir esto: los dos legajos de Asistente
-- tienen su `user_id`, no queda ningún aviso sin autora, y
-- `avisos.familia_id` ya nace `not null` y con la llave hacia `auth.users`
-- en `on delete cascade`. Repetir todo eso sería escribir dos veces lo mismo.
-- El papel de los perfiles sí se repite, y se explica en el paso 3.
--
-- Acá no hay ninguna clave, y ése sigue siendo el punto
-- ----------------------------------------------------
-- Las cuentas nacen con `encrypted_password` en nulo. Una cuenta sin clave
-- existe, tiene perfil, tiene Organización y sostiene todas las referencias,
-- pero no entra: GoTrue no tiene con qué comparar y contesta credenciales
-- inválidas. La clave la pone `scripts/abrir_cuentas_ficticias.mjs`, que la
-- toma de la variable de entorno `CLAVE_PRUEBA_LOCAL` y se niega a correr
-- contra una dirección que no sea la de esta máquina.
--
-- No es una vuelta larga por prolijidad: las migraciones son las mismas de los
-- dos lados, así que una clave escrita acá abriría estas seis cuentas también
-- en la base publicada, para cualquiera que lea el repositorio. Los datos son
-- inventados; la puerta no.
--
-- Las seis, y por qué son seis
-- ----------------------------
-- Las dos Prestadoras ficticias que tienen avisos. Cuidar Sur queda sin
-- cuentas a propósito: estar casi vacía es lo que la hace útil para probar el
-- aislamiento.
--
--   PresDemo
--     * Norma Bianchi Ficticia  — Familia, autora de sus avisos.
--     * Marta Quiroga Ficticia  — Asistente, atada a su legajo.
--     * Cecilia Roldán Ficticia — personal de la Prestadora.
--   Cuidar Norte
--     * Raúl Ibarra Ficticio    — Familia, autor de sus avisos.
--     * Silvia Ledesma Ficticia — Asistente, atada a su legajo.
--     * Marcos Ruiz Ficticio    — personal de la Prestadora.
--
-- Los identificadores y los correos son los que la siembra ya usa: los seis
-- perfiles existen con esos `uuid`, y los dos legajos de Asistente llevan el
-- mismo correo que su cuenta porque son la misma persona.
--
-- Dos trampas que no avisan
-- -------------------------
--   1. El disparador `crear_perfil_al_registrarse` va a reaccionar a estos
--      `insert`. No molesta —cierra con `on conflict (id) do nothing` y los seis
--      perfiles ya están—, pero el `raw_user_meta_data` va igual completo, con
--      nombre, papel y Organización, porque es lo que ese disparador leería en
--      una base donde los perfiles no estuvieran. Y ese mismo disparador acepta
--      `caregiver` y `familiar` y convierte cualquier otra palabra en
--      `familiar` sin decir nada, así que un `coordinador` pedido al registrarse
--      sale Familia: por eso las dos cuentas del personal se piden como Familia
--      y el paso 3 las deja como tienen que quedar.
--   2. La fila hermana de `auth.identities` no es opcional. Sin ella la entrada
--      por correo y clave falla aunque la cuenta esté perfecta: GoTrue busca la
--      identidad del proveedor `email` antes de comparar nada. `identities.email`
--      es una columna generada a partir de `identity_data`, así que no se escribe.
--
-- Se puede volver a correr: las cuentas se miran por identificador y por correo,
-- las identidades por proveedor, y no se toca ninguna cuenta de afuera de estas
-- seis.
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
  rol_de_alta text not null   -- el que el disparador acepta sin cambiarlo
);
-- Se borra a mano al final y no con `on commit drop`: si esto llegara a
-- correrse fuera de una transacción, `on commit drop` la borraría en el acto y
-- los dos pasos de abajo no encontrarían nada.

insert into las_cuentas_ficticias values
  ('ccccccc1-0000-4000-8000-000000000001', 'norma.ficticia@ejemplo.invalid',
   'Norma Bianchi Ficticia',  'presdemo',    'familiar',    'familiar'),
  ('ccccccc1-0000-4000-8000-000000000002', 'marta.ficticia@ejemplo.invalid',
   'Marta Quiroga Ficticia',  'presdemo',    'caregiver',   'caregiver'),
  ('ccccccc1-0000-4000-8000-000000000003', 'cecilia.ficticia@ejemplo.invalid',
   'Cecilia Roldán Ficticia', 'presdemo',    'coordinador', 'familiar'),
  ('ccccccc2-0000-4000-8000-000000000001', 'raul.ficticio@ejemplo.invalid',
   'Raúl Ibarra Ficticio',    'cuidarnorte', 'familiar',    'familiar'),
  ('ccccccc2-0000-4000-8000-000000000002', 'silvia.ficticia@ejemplo.invalid',
   'Silvia Ledesma Ficticia', 'cuidarnorte', 'caregiver',   'caregiver'),
  ('ccccccc2-0000-4000-8000-000000000003', 'marcos.ficticio@ejemplo.invalid',
   'Marcos Ruiz Ficticio',    'cuidarnorte', 'coordinador', 'familiar');
-- Dos papeles por cuenta porque el disparador no acepta el que hace falta: a
-- `coordinador` lo convierte en `familiar` sin decir nada, así que las dos
-- cuentas del personal se piden como Familia y se corrigen en el paso 3.

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
-- 3. El papel del personal de la Prestadora, que el disparador no sabe
--    escribir. Hoy no cambia nada —la siembra ya dejó los seis perfiles con su
--    papel y su Organización, y se comprobó fila por fila—, y está igual porque
--    sin esto el archivo dependería de que la siembra lo hubiera hecho antes.
--    Es lo que mira `es_personal_de_prestadora()`, que compara literal contra
--    `'coordinador'`, y de eso dependen el panel y la validación de los legajos.
--    Puede escribir el papel porque `el_rol_y_la_prestadora_no_se_escriben_solos`
--    se aparta cuando `auth.uid()` es nulo, que es el caso de una migración.
-- ---------------------------------------------------------------------
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
-- 4. Y que no vuelva a pasar sin que nadie se entere.
--
--    Las llaves foráneas hacia `auth.users` no atajan esto: la siembra entra
--    con `session_replication_role = replica`, que es lo que le permite
--    escribir las filas que los disparadores ya habían escrito, y de paso
--    duerme las llaves. Un perfil huérfano pasa sin una sola queja. Así que la
--    comprobación se hace acá, con la sesión ya normal.
--
--    Avisa y no se planta: una base de producción bien puede tener perfiles que
--    esta migración no conoce, y en ese caso el que tiene que mirar es quien la
--    corre. Lo que no puede volver a pasar es que se rompa en silencio.
-- ---------------------------------------------------------------------
do $marca$
declare
  huerfanos integer;
begin
  select count(*) into huerfanos
    from public.profiles p
   where not exists (select 1 from auth.users u where u.id = p.id);

  if huerfanos > 0 then
    raise notice
      'Quedan % perfil(es) sin cuenta en auth.users. Un perfil huérfano no puede '
      'iniciar sesión y sus políticas nunca dan verdadero.', huerfanos;
  end if;
end
$marca$;

drop table las_cuentas_ficticias;

notify pgrst, 'reload schema';
