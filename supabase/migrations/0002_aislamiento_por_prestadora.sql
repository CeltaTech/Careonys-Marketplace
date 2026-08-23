-- =====================================================================
-- 0002 — Cerrar la base: nadie sin sesión, y cada quien sólo su Prestadora
--
-- Qué estaba mal el 23 de agosto de 2026, medido con `node scripts/revisar_base.mjs`
-- y confirmado en el volcado del esquema:
--
--   * `caregivers` le devolvía legajos a cualquiera —dni, cuit, domicilio, datos
--     bancarios— con la clave que viaja al navegador.
--   * Cuatro políticas dejaban INSERTAR sin sesión (`Anon insert ...`), una dejaba
--     MODIFICAR legajos ajenos (`Anon update caregivers`) y `messages` estaba
--     abierta para leer y escribir sin ninguna condición.
--   * Las seis tablas tenían GRANT ALL para el rol anónimo.
--
-- Qué hace esta migración:
--
--   1. Un único lugar decide cuál es la Prestadora de quien consulta.
--   2. `tenant_id` en las tres tablas que no lo tenían (regla 10).
--   3. Se borran todas las políticas permisivas.
--   4. Políticas nuevas: la Prestadora sale de la membresía verificada de la
--      sesión, nunca de un parámetro del pedido (CLAUDE.md §4).
--   5. La vidriera pública sigue funcionando, pero por una vista que sólo
--      muestra lo que puede ser público. Los datos personales no salen de ahí.
-- =====================================================================

-- --- 1. Punto único de verdad ----------------------------------------------
-- Toda política pregunta acá y en ningún otro lado (regla 7). Es SECURITY
-- DEFINER porque tiene que leer `profiles` sin que la política de `profiles`
-- se lo impida, y por eso mismo se le quita el permiso al anónimo.
--
-- Ojo con lo que NO se le quita: conserva `authenticated`. Una política evalúa
-- su expresión con los permisos de quien consulta, así que sacarle ese permiso
-- no devolvería cero filas — fallaría, y la aplicación no podría leer ni sus
-- propias tablas (CLAUDE.md §4).
create or replace function public.prestadora_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $funcion$
  select tenant_id from public.profiles where id = auth.uid()
$funcion$;

revoke all on function public.prestadora_actual() from public;
revoke all on function public.prestadora_actual() from anon;
grant execute on function public.prestadora_actual() to authenticated;

comment on function public.prestadora_actual() is
  'La Prestadora de quien inició sesión. Sale de su membresía, nunca del pedido.';

-- --- 2. La columna que faltaba en tres tablas -------------------------------
alter table public.clock_ins       add column if not exists tenant_id uuid;
alter table public.logbook_entries add column if not exists tenant_id uuid;
alter table public.messages        add column if not exists tenant_id uuid;

-- Lo que ya estaba cargado hereda la Prestadora de su Asistente o su búsqueda.
update public.clock_ins c
   set tenant_id = a.tenant_id
  from public.caregivers a
 where c.caregiver_id = a.id and c.tenant_id is null;

update public.logbook_entries l
   set tenant_id = b.tenant_id
  from public.care_searches b
 where l.search_id = b.id and l.tenant_id is null;

update public.messages m
   set tenant_id = b.tenant_id
  from public.care_searches b
 where m.search_id = b.id and m.tenant_id is null;

-- Al insertar, la Prestadora se pone sola desde la sesión: así ninguna pantalla
-- puede elegirla, ni por error ni a propósito.
alter table public.care_searches   alter column tenant_id set default public.prestadora_actual();
alter table public.caregivers      alter column tenant_id set default public.prestadora_actual();
alter table public.clock_ins       alter column tenant_id set default public.prestadora_actual();
alter table public.logbook_entries alter column tenant_id set default public.prestadora_actual();
alter table public.messages        alter column tenant_id set default public.prestadora_actual();

-- --- 3. Se van las políticas permisivas -------------------------------------
drop policy if exists "Anon insert caregivers"          on public.caregivers;
drop policy if exists "Anon update caregivers"          on public.caregivers;
drop policy if exists "Public read approved caregivers" on public.caregivers;
drop policy if exists "Anon insert clock_ins"           on public.clock_ins;
drop policy if exists "Anon insert logbook"             on public.logbook_entries;
drop policy if exists "Public read logbook"             on public.logbook_entries;
drop policy if exists "Anon insert searches"            on public.care_searches;
drop policy if exists "Public read searches"            on public.care_searches;
drop policy if exists "Public messages full"            on public.messages;
drop policy if exists "Public read tenants"             on public.tenants;

-- --- 4. Políticas nuevas -----------------------------------------------------
-- Todas dicen lo mismo: la fila es de la Prestadora de la sesión, o no se ve.

create policy "Legajos de la Prestadora" on public.caregivers
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Busquedas de la Prestadora" on public.care_searches
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Fichadas de la Prestadora" on public.clock_ins
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Bitacora de la Prestadora" on public.logbook_entries
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

create policy "Mensajes de la Prestadora" on public.messages
  for all to authenticated
  using (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

-- La Prestadora propia se lee para saber cómo pintar la pantalla. No guarda
-- datos de personas: nombre, colores y logotipo.
create policy "Su propia Prestadora" on public.tenants
  for select to authenticated
  using (id = public.prestadora_actual());

-- La vidriera necesita el nombre y el color antes de que nadie inicie sesión.
create policy "Vidriera de Prestadoras" on public.tenants
  for select to anon
  using (status = 'activo');

-- --- 5. La vidriera pública, sin datos personales ---------------------------
-- El directorio se ve sin iniciar sesión, y eso está bien: es una vidriera.
-- Lo que no puede es salir por ahí un documento o una cuenta bancaria. Esta
-- vista muestra sólo lo que una vidriera necesita, y sólo de quien ya está
-- validado. Es lo único que el rol anónimo puede leer de los legajos.
create or replace view public.caregivers_publicos as
  select id,
         tenant_id,
         full_name,
         profession,
         zone,
         pathologies,
         tasks,
         hourly_rate,
         gender,
         created_at
    from public.caregivers
   where verification_status in ('validado_prestadora', 'validado');

comment on view public.caregivers_publicos is
  'Vidriera pública. Nunca agregar acá una columna con datos personales.';

-- --- 6. Permisos: el anónimo pierde todo menos la vidriera ------------------
revoke all on table public.caregivers      from anon;
revoke all on table public.care_searches   from anon;
revoke all on table public.clock_ins       from anon;
revoke all on table public.logbook_entries from anon;
revoke all on table public.messages        from anon;
revoke all on table public.profiles        from anon;
revoke all on table public.tenants         from anon;

-- De los legajos, el anónimo sólo ve la vidriera.
grant select on public.caregivers_publicos to anon;
grant select on public.caregivers_publicos to authenticated;

-- Y de las Prestadoras, sólo el nombre y los colores.
grant select on table public.tenants to anon;
