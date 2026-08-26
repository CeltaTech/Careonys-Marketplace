-- 0025: a cada Prestadora la nombra CeltaTech, y el Marketplace la reconoce por eso
--
-- Por qué
-- -------
-- Hasta la 0024, el alta reconocía a una Prestadora por el nombre corto que le
-- deducía a la razón social. Eso es adivinar. El Desarrollador lo cerró el 26 de
-- agosto de 2026 con dos frases: «los datos que son válidos son los que se
-- cargan en CeltaTech, el Marketplace no puede ni editar ni borrar ningún dato
-- de ningún cliente», y «CeltaTech registra a la empresa y le dice al
-- Marketplace lo que le tiene que decir; si necesita un número de cliente
-- interno para identificarlo, que lo haga».
--
-- Así que la identidad deja de deducirse: llega. CeltaTech manda su referencia,
-- este producto la guarda tal cual y no la interpreta nunca — es exactamente lo
-- mismo que hace CeltaTech con el identificador que este producto le devuelve
-- (`../../docs/MODELO_COMERCIAL_CELTATECH.md` §3), leído al revés.
--
-- Qué NO hace, a propósito
-- ------------------------
-- No guarda la identificación fiscal. Acá no se factura, así que no hace falta,
-- y además el CUIT sólo existe en Argentina: una columna así obligaría a
-- inventarle una forma a cada país el día que se venda afuera.
--
-- No renombra nada. `alta_de_prestadora`, `tenants` y `prestadora_id` se quedan
-- como están: son nombres guardados. Y «Prestadora» es la palabra correcta acá
-- adentro — `../../docs/GLOSARIO_PRODUCTOS_CAREONYS.md` reserva «Organización»
-- para la entidad técnica y avisa de no confundirlas en texto de negocio.
--
-- No decide nada comercial. Sigue sin preguntarle nada a CeltaTech.


-- ── 1. La referencia con la que CeltaTech nombra a esta Prestadora ─────────
-- Texto opaco. No se lee, no se le busca forma y no se le pide que sea un
-- número, ni un identificador único, ni nada: es de CeltaTech y CeltaTech decide
-- qué pone ahí. Acá sirve para una sola cosa, que es reconocer a quién se
-- refiere cada pedido que entra por la función de borde `alta-y-baja`.
--
-- Única, porque dos Prestadoras distintas no pueden ser la misma. Y admite nulo
-- porque las que ya están cargadas —las ficticias del seed— no las dio de alta
-- CeltaTech y nunca van a tener una.
alter table public.tenants
  add column if not exists referencia_celtatech text;

create unique index if not exists tenants_referencia_celtatech_key
  on public.tenants (referencia_celtatech)
  where referencia_celtatech is not null;

comment on column public.tenants.referencia_celtatech is
  'Con qué nombre conoce CeltaTech a esta Prestadora. Texto opaco: se guarda tal cual llega y no se interpreta nunca (0025). Es lo único por lo que el alta y las correcciones la reconocen. Nulo en las Prestadoras ficticias, que no vienen de ningún contrato.';


-- ── 2. El alta reconoce por la referencia, no por el nombre ────────────────
-- La de la 0024 se queda sin uso, y se saca en vez de dejarla al lado: dos
-- funciones con el mismo nombre y distinta cantidad de argumentos vuelven
-- ambigua cualquier llamada por nombre de parámetro, que es como llama
-- PostgREST.
drop function if exists public.alta_de_prestadora(text, text, text);

-- Qué cambia respecto de la anterior, una línea cada uno:
--
--   * La referencia es obligatoria. Sin ella no hay alta: es preferible que
--     CeltaTech vea un error a que este producto invente una Prestadora que
--     después nadie sabe de quién es.
--   * Un reintento devuelve la misma Prestadora, con `creada` en falso. Antes
--     eso lo resolvía el nombre corto; ahora lo resuelve la referencia, que es
--     lo único que no cambia aunque le corrijan la razón social.
--   * El nombre corto dejó de ser la identidad y pasó a ser sólo la dirección
--     web. Si el que sale del nombre ya está tomado por otra, se le agrega un
--     número al final. Nunca se juntan dos Prestadoras en una.
create or replace function public.alta_de_prestadora(
    p_referencia  text,
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
  v_referencia text := nullif(trim(p_referencia), '');
  v_base       text := coalesce(nullif(trim(p_slug), ''), public.nombre_corto_de(p_nombre));
  v_slug       text;
  v_id         uuid;
  v_intento    integer := 1;
begin
  if v_referencia is null then
    raise exception 'CeltaTech tiene que decir con qué referencia da de alta a esta Prestadora'
      using errcode = 'check_violation';
  end if;

  -- Si ya se dio de alta, es un reintento. Se devuelve la que hay y se termina:
  -- ni se crea otra, ni se le pisa nada a la que está.
  select t.id, t.slug into v_id, v_slug
    from public.tenants t
   where t.referencia_celtatech = v_referencia;
  if v_id is not null then
    return query select v_id, v_slug, false;
    return;
  end if;

  if nullif(trim(p_nombre), '') is null then
    raise exception 'Una Prestadora no puede darse de alta sin nombre'
      using errcode = 'check_violation';
  end if;
  if v_base is null then
    raise exception 'De «%» no sale ningún nombre corto: hay que mandarlo aparte', p_nombre
      using errcode = 'check_violation';
  end if;

  -- El nombre corto, hasta encontrar uno libre. El primero va sin número, que
  -- es el caso de siempre; el segundo es `-2`. La cota existe para que un error
  -- propio no se convierta en una vuelta infinita adentro de la base.
  loop
    v_slug := case when v_intento = 1 then v_base else v_base || '-' || v_intento end;

    insert into public.tenants (referencia_celtatech, slug, name, description, status, estado_fijado_en)
         values (v_referencia, v_slug, trim(p_nombre), p_descripcion, 'activo', now())
    on conflict (slug) do nothing
      returning tenants.id into v_id;

    exit when v_id is not null;

    v_intento := v_intento + 1;
    if v_intento > 50 then
      raise exception 'No se encontró una dirección libre parecida a «%»', v_base
        using errcode = 'check_violation';
    end if;
  end loop;

  return query select v_id, v_slug, true;
end;
$$;

comment on function public.alta_de_prestadora(text, text, text, text) is
  'Da de alta una Prestadora a pedido de CeltaTech, o devuelve la que ya existe con esa referencia (0025). La reconoce sólo por `p_referencia`; el nombre corto es la dirección web y nada más. Se llama únicamente desde la función de borde `alta-y-baja`.';


-- ── 3. Por dónde entra una corrección ──────────────────────────────────────
-- Faltaba, y es lo que sostiene la regla del Desarrollador: si el dato válido es
-- el que está cargado en CeltaTech, este producto tiene que poder recibir la
-- corrección cuando allá se corrige. Sin esto, una razón social mal escrita
-- queda mal escrita para siempre de este lado.
--
-- Corrige el nombre y nada más. El nombre corto no se toca aunque cambie la
-- razón social: es la dirección por la que ya entra gente, y cambiarla rompe
-- todo enlace anterior. Y la descripción tampoco, porque ésa no es de CeltaTech
-- —la escribe la Prestadora para su propia pantalla—, así que una corrección
-- comercial no tiene por qué borrarle lo que escribió.
--
-- Devuelve si encontró a quién corregir, en vez de fallar: que CeltaTech mande
-- una referencia que acá no está no es un error de nadie, es una Prestadora que
-- todavía no se dio de alta.
create or replace function public.corregir_prestadora(
    p_referencia text,
    p_nombre     text)
  returns table (id uuid, aplicado boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
#variable_conflict use_column
declare
  v_referencia text := nullif(trim(p_referencia), '');
  v_nombre     text := nullif(trim(p_nombre), '');
  v_id         uuid;
begin
  if v_referencia is null then
    raise exception 'Hay que decir a qué Prestadora corresponde la corrección'
      using errcode = 'check_violation';
  end if;
  if v_nombre is null then
    raise exception 'Una corrección sin nombre le borraría el que tiene'
      using errcode = 'check_violation';
  end if;

  update public.tenants t
     set name = v_nombre
   where t.referencia_celtatech = v_referencia
  returning t.id into v_id;

  return query select v_id, (v_id is not null);
end;
$$;

comment on function public.corregir_prestadora(text, text) is
  'Recibe de CeltaTech la corrección de la razón social de una Prestadora (0025). Corrige el nombre visible y nada más: el nombre corto es la dirección web y no se toca, y la descripción la escribe la Prestadora. Se llama únicamente desde la función de borde `alta-y-baja`.';


-- ── 4. Quién puede llamarlas ───────────────────────────────────────────────
-- Las dos se saltean la RLS, así que ninguna puede quedar al alcance de quien no
-- inició sesión. Y revocarle a `public` no alcanza: el permiso de `anon` es una
-- concesión aparte, y `public` es un esquema que PostgREST publica, o sea que
-- una función acá adentro es también una dirección web.
--
-- Ninguna de las dos la llama una política, así que `authenticated` tampoco las
-- necesita. Sólo la clave de servicio, que es la que tiene la función de borde.
revoke all on function public.alta_de_prestadora(text, text, text, text) from public, anon, authenticated;
revoke all on function public.corregir_prestadora(text, text)            from public, anon, authenticated;

grant execute on function public.alta_de_prestadora(text, text, text, text) to service_role;
grant execute on function public.corregir_prestadora(text, text)            to service_role;


-- ── 5. Y `tenants` deja de estar abierta de más ────────────────────────────
-- Encontrado el 26 de agosto de 2026 mirando la base en vivo: `authenticated`
-- tiene permiso de insertar, modificar, borrar y vaciar `tenants`. Hoy no hace
-- nada, porque la única política que hay es de lectura y sin política no se
-- escribe. Pero es permiso de más, y el día que alguien agregue una política de
-- escritura pensando en un caso chico, se lo encuentra ya concedido para todos.
--
-- Se le deja lo que usa y nada más. Escribir en `tenants` es de CeltaTech, y
-- CeltaTech entra por la clave de servicio.
revoke insert, update, delete, truncate, references, trigger
  on table public.tenants from authenticated;


notify pgrst, 'reload schema';
