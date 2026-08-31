-- 0047: las columnas que ninguna política miraba
--
-- Cierra los pendientes 66, 74, 75 y 82. El plan está en
-- `docs/PLAN_SEGURIDAD_DE_COLUMNAS.md`, aprobado por el Desarrollador, que
-- eligió además la opción A del punto 5.
--
-- Qué estaba mal
-- --------------
-- Cuatro pendientes distintos que son el mismo defecto cuatro veces: **la
-- política decide por fila, y lo que importa es qué columna se toca.** Las dos
-- políticas de `caregivers` son `for all` y no nombran ninguna columna; la de
-- `profiles` dice «cada quien escribe su propia fila». Todas contestan bien la
-- pregunta que se les hace —«¿esta fila es suya?»—, y cuando la respuesta es
-- sí, quien pide escribe la fila **entera**, incluidas las columnas donde vive
-- el veredicto de otro:
--
--   * 66 — un Asistente se pone solo `verification_status`, que es el sello
--     que dice que la Prestadora lo revisó, y con eso entra al directorio
--     público como validado.
--   * 74 — el personal de una Prestadora se pasa a su nombre, o al de un
--     tercero, el `user_id` de un legajo ajeno.
--   * 82 — `role` y `tenant_id` de `profiles`, que es de donde salen
--     `es_personal_de_prestadora()` y `prestadora_actual()`, o sea las
--     expresiones sobre las que se apoyan las políticas de todas las tablas.
--   * 75 — con el sello puesto, cambiar `documents` deja el sello hablando de
--     papeles que ya no están.
--
-- Por qué un disparador y no un permiso por columna
-- -------------------------------------------------
-- Porque el permiso es por rol, y acá los dos lados son el mismo rol. El
-- personal de la Prestadora y el Asistente entran los dos como
-- `authenticated`: quitarle a ese rol la escritura de `verification_status`
-- se la quitaría también a quien tiene que ponerlo. Lo que los distingue no es
-- el permiso, es la política, y una política recibe la fila, no el cambio.
--
-- Un disparador `before` es lo único que ve el valor viejo y el nuevo a la vez.
--
-- El permiso por columna del 82 se conserva
-- -----------------------------------------
-- `grant update (full_name) on public.profiles to authenticated`, de la 0005,
-- es lo que hoy tapa el 82 y no se toca: sigue siendo la primera puerta. Esta
-- migración agrega la segunda, que es la que se lee donde se la busca. Ya pasó
-- una vez que ese permiso se perdiera sin querer —la 0032 se lo llevó puesto y
-- la 0033 lo repuso—, y ese día el agujero quedó abierto sin que nada avisara.
--
-- Lo que ya estaba tapado y no se toca
-- ------------------------------------
-- El `tenant_id` de `caregivers` no hace falta congelarlo: el `with check` de
-- las dos políticas exige `tenant_id = prestadora_actual()`, así que mudar un
-- legajo a la Prestadora ajena ya se rechaza. Lo mide
-- `scripts/probar_sello_de_la_prestadora.mjs`, en su comprobación de sostén, y
-- da 403 desde antes de esta migración.
--
-- Y sin sesión esto no interviene
-- -------------------------------
-- Cuando `auth.uid()` es nulo no hay a quién exigirle nada: es la base
-- hablando consigo misma —una migración, la siembra— o la puerta de
-- administración de CeltaTech, que ya la cuida quien tiene esa clave. Sin esta
-- salvedad, toda migración que siembre un legajo ya validado lo escribiría sin
-- sello y sin decirlo.
-- ---------------------------------------------------------------------------


-- ── 1. El legajo no se sella solo, no cambia de dueño, y el papel nuevo baja
--       el sello ────────────────────────────────────────────────────────────
--
-- La regla de la opción A, en una línea: **el sello siempre habla de los
-- papeles que están hoy.** Si los papeles cambian y quien los cambió no es
-- quien firma, el sello vuelve a «sin revisar» y el legajo sale del directorio
-- hasta que la Prestadora lo mire otra vez. Si los cambia el personal, no se
-- mueve nada: el personal es quien firma, y en el mismo acto ve lo que subió.
--
-- No es `security definer` a propósito: lo único que necesita saber se lo
-- pregunta a `es_personal_de_prestadora()`, que sí lo es y por eso puede leer
-- `profiles`. Mínimo privilegio: lo que no hace falta, no se pide.
create or replace function public.el_legajo_no_se_sella_solo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- El sello no se pide en el alta: el valor no se toma del pedido, se pone
    -- acá. El personal sí puede dar de alta un legajo ya revisado, que es el
    -- caso de la Prestadora que carga a alguien que ya conoce.
    if not public.es_personal_de_prestadora() then
      new.verification_status := 'en_revision';
    end if;
    return new;
  end if;

  -- De acá para abajo, UPDATE.

  -- Un legajo no cambia de dueño, para nadie. Hoy ninguna pantalla escribe
  -- `user_id` después del alta —se comprobó, buscando en todo `.js` y `.html`—,
  -- así que esto no le saca nada a nadie. El día que haga falta traspasar uno,
  -- va a ser por una puerta pensada para eso, que pida el motivo y lo deje
  -- auditado.
  if new.user_id is distinct from old.user_id then
    raise exception 'Un legajo no cambia de dueño.'
      using errcode = 'check_violation';
  end if;

  -- El sello lo escribe quien revisa.
  if new.verification_status is distinct from old.verification_status
     and not public.es_personal_de_prestadora() then
    raise exception 'El estado de revisión de un legajo lo escribe la Prestadora.'
      using errcode = 'check_violation';
  end if;

  -- Opción A, elegida por el Desarrollador: cambiar un papel baja el sello.
  -- Va después del rechazo de arriba y no antes, así el que intentó las dos
  -- cosas en el mismo pedido se lleva el rechazo, no el arreglo silencioso.
  if new.documents is distinct from old.documents
     and not public.es_personal_de_prestadora() then
    new.verification_status := 'en_revision';
  end if;

  return new;
end;
$$;

comment on function public.el_legajo_no_se_sella_solo() is
  'Sobre `caregivers`: el sello de la Prestadora no se toma del pedido en el alta, no lo cambia quien no es personal, el legajo no cambia de dueño, y cambiar los papeles devuelve el sello a «sin revisar». Cierra los pendientes 66, 74 y 75.';

-- PostgREST no publica las funciones que devuelven `trigger`, pero Postgres le
-- concede la ejecución a `PUBLIC` por omisión, y revocarle a `PUBLIC` no
-- alcanza para sacársela a `anon`: es una concesión aparte. El disparador
-- funciona igual, porque el permiso de llamada se verifica al crearlo y no cada
-- vez que se dispara.
revoke all on function public.el_legajo_no_se_sella_solo() from public, anon, authenticated;

drop trigger if exists el_legajo_no_se_sella_solo on public.caregivers;

create trigger el_legajo_no_se_sella_solo
  before insert or update on public.caregivers
  for each row
  execute function public.el_legajo_no_se_sella_solo();


-- ── 2. El rol y la Prestadora del perfil no se los escribe uno mismo ───────
--
-- Acá no hay excepción para el personal, y es a propósito. La política de
-- `profiles` dice «cada quien escribe su propia fila», así que ninguna sesión
-- alcanza el perfil de otra persona: lo único que un permiso al personal
-- habilitaría es ascenderse a sí mismo y mudarse solo de Prestadora, que es
-- justo el agujero. Desde una sesión, estas dos columnas no cambian nunca.
--
-- Los caminos legítimos no pasan por acá: el alta la escribe el disparador de
-- `auth.users`, que corre con otros privilegios, y CeltaTech entra por la
-- puerta de administración, donde `auth.uid()` es nulo.
--
-- Sólo en UPDATE: en el alta la fila la crea ese disparador, y ponerle esto
-- encima le trabaría el trabajo que tiene que hacer.
create or replace function public.el_rol_y_la_prestadora_no_se_escriben_solos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id then
    raise exception 'El rol y la Prestadora de un perfil no se escriben desde la propia sesión.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.el_rol_y_la_prestadora_no_se_escriben_solos() is
  'Sobre `profiles`: desde una sesión, `role` y `tenant_id` no cambian. De esas dos columnas salen `es_personal_de_prestadora()` y `prestadora_actual()`, o sea las políticas de todas las tablas. Cierra el pendiente 82, y no reemplaza al permiso por columna de la 0005: se suma.';

revoke all on function public.el_rol_y_la_prestadora_no_se_escriben_solos() from public, anon, authenticated;

drop trigger if exists el_rol_y_la_prestadora_no_se_escriben_solos on public.profiles;

create trigger el_rol_y_la_prestadora_no_se_escriben_solos
  before update on public.profiles
  for each row
  execute function public.el_rol_y_la_prestadora_no_se_escriben_solos();


-- ── 3. Esta migración se planta si no logró lo que dice ───────────────────
-- Sin esto, «corrió» y «funcionó» se escriben igual.
do $$
declare
  faltan text[] := '{}';
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'el_legajo_no_se_sella_solo'
                    and tgrelid = 'public.caregivers'::regclass
                    and not tgisinternal) then
    faltan := faltan || 'el disparador de `caregivers`';
  end if;

  if not exists (select 1 from pg_trigger
                  where tgname = 'el_rol_y_la_prestadora_no_se_escriben_solos'
                    and tgrelid = 'public.profiles'::regclass
                    and not tgisinternal) then
    faltan := faltan || 'el disparador de `profiles`';
  end if;

  -- El permiso por columna de la 0005 es la primera puerta del 82 y tiene que
  -- seguir en pie: `full_name` sí, y ninguna otra columna.
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update') then
    faltan := faltan || 'el permiso de escribir `full_name`, que la 0005 concedió y algo se llevó puesto';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'role', 'update')
     or has_column_privilege('authenticated', 'public.profiles', 'tenant_id', 'update') then
    faltan := faltan || 'que `role` y `tenant_id` no tengan permiso de escritura por columna: alguna migración escribió un `grant update` sin nombrar columnas';
  end if;

  if array_length(faltan, 1) > 0 then
    raise exception 'La migración 0047 no logró lo que dice. Falta: %',
      array_to_string(faltan, '; ');
  end if;
end $$;


notify pgrst, 'reload schema';
