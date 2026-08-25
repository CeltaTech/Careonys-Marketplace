-- 0024: el alta se tropezaba con su propio nombre
--
-- Qué pasaba
-- ----------
-- `alta_de_prestadora` de la 0023 no daba de alta a nadie. Contra el servidor
-- de verdad contestaba siempre lo mismo:
--
--     42702  column reference "slug" is ambiguous
--     It could refer to either a PL/pgSQL variable or a table column.
--
-- Y tenía razón. La función devuelve tres columnas —`id`, `slug`, `creada`— y en
-- PL/pgSQL los nombres de lo que se devuelve son variables como cualquier otra.
-- Así que adentro del cuerpo la palabra `slug` quería decir dos cosas a la vez:
-- la columna de `tenants` y la variable de salida. Donde se puede desambiguar
-- poniendo la tabla adelante no hubo problema; donde no se puede es justamente
-- en `on conflict (slug)`, que exige el nombre pelado de la columna. Ahí se
-- plantó.
--
-- Cómo se arregla
-- ---------------
-- Con un renglón: `#variable_conflict use_column` le dice a PL/pgSQL que cuando
-- un nombre pueda ser las dos cosas, gana la columna. Es exactamente lo que hace
-- falta acá, porque esas tres variables de salida no se leen nunca adentro del
-- cuerpo: lo que se devuelve se arma con `v_id` y `v_slug`, que tienen nombres
-- que no chocan con nada.
--
-- Por qué es una migración nueva y no un arreglo de la 0023
-- --------------------------------------------------------
-- Porque la 0023 ya está aplicada en el servidor. Corregirle el texto no cambia
-- nada de lo que está corriendo —la base no vuelve a ejecutar una migración que
-- ya ejecutó— y dejaría el repositorio diciendo algo distinto de lo que hay. El
-- archivo de al lado queda como se aplicó, con su error adentro, y este lo
-- corrige.
--
-- Cómo se encontró
-- ----------------
-- `scripts/probar_alta_y_baja.mjs`, en su primera corrida, contra la función de
-- borde desplegada. Cinco de doce comprobaciones pasaron y las siete que
-- fallaron colgaban todas de esta. Una prueba que hubiera hablado con un remedo
-- de la base en vez de con la base no habría visto nada: el error no está en la
-- lógica, está en cómo PL/pgSQL lee un nombre.

create or replace function public.alta_de_prestadora(
    p_nombre      text,
    p_slug        text default null,
    p_descripcion text default null)
  returns table (id uuid, slug text, creada boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
#variable_conflict use_column
declare
  v_slug text := coalesce(nullif(trim(p_slug), ''), public.nombre_corto_de(p_nombre));
  v_id   uuid;
begin
  if nullif(trim(p_nombre), '') is null then
    raise exception 'Una Prestadora no puede darse de alta sin nombre'
      using errcode = 'check_violation';
  end if;

  if v_slug is null then
    raise exception 'De «%» no sale ningún nombre corto: hay que mandarlo aparte', p_nombre
      using errcode = 'check_violation';
  end if;

  insert into public.tenants (slug, name, description, status, estado_fijado_en)
       values (v_slug, trim(p_nombre), p_descripcion, 'activo', now())
  on conflict (slug) do nothing
    returning tenants.id into v_id;

  if v_id is not null then
    return query select v_id, v_slug, true;
    return;
  end if;

  -- Ya estaba. Se devuelve la que hay: un reintento tiene que terminar igual que
  -- el intento que se perdió.
  return query
    select t.id, t.slug, false from public.tenants t where t.slug = v_slug;
end;
$$;

comment on function public.alta_de_prestadora(text, text, text) is
  'Da de alta una Prestadora y devuelve su identificador, que es el `tenant_ref` que CeltaTech guarda (§6.1 del modelo comercial). Repetir la llamada con el mismo nombre no crea una segunda: devuelve la que ya está, con `creada` en falso. Sólo la llama la función de borde `alta-y-baja` (0023, arreglada en la 0024).';

-- `create or replace` conserva los permisos que la función ya tenía, así que las
-- revocaciones de la 0023 §6 siguen puestas. Se repiten igual: si algún día esta
-- migración corre sobre una base donde la 0023 no pasó, la función no puede
-- nacer al alcance de cualquiera.
revoke all on function public.alta_de_prestadora(text, text, text) from public;
revoke all on function public.alta_de_prestadora(text, text, text) from anon;
revoke all on function public.alta_de_prestadora(text, text, text) from authenticated;
grant execute on function public.alta_de_prestadora(text, text, text) to service_role;
