-- =====================================================================
-- 0005 — El acceso lo decide la sesión
--
-- La 0002 dejó bien el lado del servidor: `public.prestadora_actual()`
-- resuelve la Prestadora leyendo `profiles`, y las políticas preguntan
-- ahí y en ningún otro lado. Faltaban cuatro cosas para que eso sirviera
-- de algo (`docs/PLAN_ACCESO.md`):
--
--   1. **Nada creaba la fila de `profiles`.** No hay disparador sobre
--      `auth.users` en ninguna migración anterior. Sin esa fila
--      `prestadora_actual()` devuelve nulo, y una política que compara
--      contra nulo nunca da verdadero: con sesión y todo, la aplicación
--      no puede leer ni escribir nada suyo. De ahí el
--      `42501 permission denied for table caregivers` del alta.
--   2. **`caregivers` no sabía de quién era cada legajo.** No hay
--      `user_id`, así que no se podía escribir "cada quien ve el suyo".
--   3. **La política "Own profile" de la 0001 dejaba escalar
--      privilegios.** Es `for all` con `using (id = auth.uid())` y sin
--      `with check`, y en ese caso Postgres usa la misma expresión para
--      la escritura: cualquiera podía actualizar su propio perfil,
--      ponerse `role = 'coordinador'` y el `tenant_id` de otra
--      Prestadora, y llevarse sus legajos. Se cierra acá.
--   4. **Pertenecer y poder ver eran la misma cosa.** Si el `tenant_id`
--      del perfil sale de lo que la persona escribe al registrarse —y
--      tiene que salir de ahí, porque quien se postula elige a qué
--      Prestadora—, entonces las políticas de la 0002 le entregan los
--      legajos de esa Prestadora. Cambiar `?tenant=` por un formulario
--      de registro no arregla nada. Por eso el acceso mira además el rol.
--
-- La regla que queda: **quien se registra solo nunca obtiene un rol con
-- acceso a los datos de la Prestadora.** Ve lo suyo y nada más. Los roles
-- con acceso los da alguien que ya está adentro.
-- =====================================================================

-- --- 1. De quién es cada legajo ---------------------------------------------
alter table public.caregivers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Una cuenta, un legajo. Parcial porque los perfiles de muestra no tienen cuenta.
create unique index if not exists idx_caregivers_user_unico
  on public.caregivers(user_id) where user_id is not null;

comment on column public.caregivers.user_id is
  'La cuenta dueña de este legajo. Nulo en los perfiles de muestra.';

-- --- 2. La fila de `profiles` se crea sola ----------------------------------
-- Toma el nombre y la Prestadora de los metadatos del registro, y el rol NO:
-- los metadatos los escribe quien se registra, así que un rol que viniera de
-- ahí sería un rol autoasignado. Se acepta sólo la lista de roles sin acceso;
-- cualquier otra cosa cae en el más restrictivo.
--
-- La Prestadora se valida contra `tenants`. Si no existe, la fila queda sin
-- Prestadora: es preferible una cuenta que no ve nada a una cuenta que ve lo
-- que no le toca.
create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $funcion$
declare
  meta       jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  rol_pedido text  := meta->>'role';
  rol_final  text;
  prestadora uuid;
begin
  -- Roles que puede tomar quien se registra por su cuenta. `coordinador` no
  -- está en la lista a propósito: ese lo da alguien que ya está adentro.
  rol_final := case when rol_pedido in ('caregiver', 'familiar')
                    then rol_pedido
                    else 'familiar'
               end;

  select t.id into prestadora
    from public.tenants t
   where t.id::text = (meta->>'tenant_id')
      or t.slug     = (meta->>'tenant_slug')
   limit 1;

  insert into public.profiles (id, tenant_id, full_name, role)
  values (new.id, prestadora, meta->>'full_name', rol_final)
  on conflict (id) do nothing;

  return new;
end;
$funcion$;

revoke all on function public.crear_perfil_al_registrarse() from public;
revoke all on function public.crear_perfil_al_registrarse() from anon;
revoke all on function public.crear_perfil_al_registrarse() from authenticated;

drop trigger if exists crear_perfil_al_registrarse on auth.users;
create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

comment on function public.crear_perfil_al_registrarse() is
  'Crea el perfil al registrarse. El rol nunca sale de los metadatos sin filtrar.';

-- --- 3. Puntos únicos de verdad ---------------------------------------------
-- Mismas precauciones que `prestadora_actual()` (0002 §1): `security definer`
-- para poder leer `profiles` y `caregivers` sin que sus propias políticas se
-- lo impidan, sin permiso para el anónimo, y **con** permiso para la sesión
-- autenticada, porque las políticas se evalúan con los permisos de quien
-- consulta y sin ese permiso fallarían en vez de devolver cero filas.
create or replace function public.es_personal_de_prestadora()
returns boolean
language sql
stable
security definer
set search_path = public
as $funcion$
  select coalesce(
    (select role = 'coordinador' from public.profiles where id = auth.uid()),
    false)
$funcion$;

revoke all on function public.es_personal_de_prestadora() from public;
revoke all on function public.es_personal_de_prestadora() from anon;
grant execute on function public.es_personal_de_prestadora() to authenticated;

comment on function public.es_personal_de_prestadora() is
  'Si quien inició sesión trabaja para la Prestadora. Sale del rol, nunca del pedido.';

create or replace function public.legajo_propio()
returns uuid
language sql
stable
security definer
set search_path = public
as $funcion$
  select id from public.caregivers where user_id = auth.uid() limit 1
$funcion$;

revoke all on function public.legajo_propio() from public;
revoke all on function public.legajo_propio() from anon;
grant execute on function public.legajo_propio() to authenticated;

comment on function public.legajo_propio() is
  'El legajo de quien inició sesión, para que un Asistente vea el suyo y ninguno más.';

-- --- 4. El perfil deja de ser autoeditable ----------------------------------
-- La política vieja permitía cambiarse el rol y la Prestadora. Se parte en
-- dos: leer el propio perfil sí, escribir el rol o la Prestadora no. El límite
-- se pone con permisos por columna, que es lo único que distingue "puede tocar
-- esta columna" de "puede tocar la fila".
drop policy if exists "Own profile" on public.profiles;

create policy "Su propio perfil, de lectura" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "Su propio perfil, de escritura" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on table public.profiles from authenticated;
grant select             on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
-- Nadie inserta a mano: la fila la crea el disparador de arriba.

-- --- 5. El legajo, en dos niveles -------------------------------------------
-- El personal de la Prestadora ve toda su Prestadora. Un Asistente ve el suyo.
-- Nadie ve nada de otra Prestadora, en ningún caso. Dos políticas permisivas
-- se combinan con "o", así que cada quien entra por la suya.
drop policy if exists "Legajos de la Prestadora" on public.caregivers;

create policy "Legajos de la Prestadora, para su personal" on public.caregivers
  for all to authenticated
  using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());

-- El alta pública entra por acá: puede crear su propio legajo, con su cuenta y
-- con la Prestadora de su perfil. No puede crear el de otro ni ponerlo en otra
-- Prestadora.
create policy "Su propio legajo" on public.caregivers
  for all to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid() and tenant_id = public.prestadora_actual());

-- --- 6. Las siete tablas del legajo, con el mismo criterio ------------------
drop policy if exists "Matriculas de la Prestadora"     on public.matriculas_asistente;
drop policy if exists "Estudios de la Prestadora"       on public.estudios_asistente;
drop policy if exists "Experiencia de la Prestadora"    on public.experiencia_laboral_asistente;
drop policy if exists "Referencias de la Prestadora"    on public.referencias_asistente;
drop policy if exists "Documentos de la Prestadora"     on public.documentos_asistente;
drop policy if exists "Verificaciones de la Prestadora" on public.verificaciones_asistente;
drop policy if exists "Banderas de la Prestadora"       on public.banderas_asistente;

do $bloque$
declare
  t text;
begin
  foreach t in array array[
    'matriculas_asistente',
    'estudios_asistente',
    'experiencia_laboral_asistente',
    'referencias_asistente',
    'documentos_asistente',
    'banderas_asistente'
  ] loop
    execute format($sql$
      create policy "Legajo de la Prestadora, para su personal" on public.%I
        for all to authenticated
        using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
        with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());
    $sql$, t);

    execute format($sql$
      create policy "Su propio legajo" on public.%I
        for all to authenticated
        using      (caregiver_id = public.legajo_propio())
        with check (caregiver_id = public.legajo_propio()
                    and tenant_id = public.prestadora_actual());
    $sql$, t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end;
$bloque$;

-- Las verificaciones son la excepción: las escribe la Prestadora, nunca la
-- persona verificada. Un Asistente puede leer las suyas y no tocarlas.
create policy "Verificaciones de la Prestadora, para su personal" on public.verificaciones_asistente
  for all to authenticated
  using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());

create policy "Sus propias verificaciones, de lectura" on public.verificaciones_asistente
  for select to authenticated
  using (caregiver_id = public.legajo_propio());

grant select, insert, update, delete on public.verificaciones_asistente to authenticated;
revoke all on table public.verificaciones_asistente from anon;

-- --- 7. Lo que sigue igual --------------------------------------------------
-- `caregivers_publicos` sigue siendo la única puerta sin sesión, y sigue sin
-- filtrar por `banderas_asistente.perfil_publicado`: eso es el pendiente 2 y
-- lo decide el Desarrollador, no esta migración.
grant select, insert, update, delete on public.caregivers to authenticated;
revoke all on table public.caregivers from anon;
