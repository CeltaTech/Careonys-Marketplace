-- 0023: la puerta por donde se da de alta y de baja una Prestadora
--
-- Por qué
-- -------
-- Hoy una Prestadora se crea abriendo la consola de la base y escribiendo un
-- `insert` a mano. No hay otra forma: `tenants` tiene políticas de lectura y
-- ninguna de escritura, y eso es correcto —una política de escritura dejaría
-- que cualquiera con una cuenta creara Prestadoras—. Lo que falta no es un
-- permiso, es una puerta con llave.
--
-- El Desarrollador aprobó construirla el 25 de agosto de 2026, después de sacar
-- de este producto todo lo demás que se había propuesto: «una cosa es el
-- producto, y otra es su manejo comercial, no mezclemos o hacemos líos». De las
-- siete cosas que pedía el pendiente 58 quedaron dos, y son esta.
--
-- Lo que esta migración NO hace, y es a propósito
-- ----------------------------------------------
-- No guarda de qué contrato viene cada Prestadora, no guarda qué capacidades
-- tiene contratadas, y no le pregunta nada a CeltaTech. Todo eso es comercial y
-- vive del otro lado. De regalo, la regla que
-- `../../docs/MODELO_COMERCIAL_CELTATECH.md` §6.3 declara no negociable —«fallo
-- abierto con el último valor conocido»— queda cumplida sin escribir una línea:
-- un producto que no le pregunta nada a CeltaTech no se cae cuando CeltaTech se
-- cae.
--
-- Y no le agrega ni una consecuencia nueva a `status`. Suspender ya hacía algo
-- desde la 0021: las tres funciones públicas exigen `status = 'activo'`, así que
-- una Prestadora suspendida deja de tener puerta de calle —nadie ve su
-- directorio ni su marca sin sesión— mientras su personal, que sí tiene cuenta,
-- sigue trabajando igual. Eso es lo que hay hoy y esta migración lo deja como
-- está: qué más se le corta a quien no paga cuando hay gente cuidando a una
-- persona es una pregunta del Desarrollador, sin responder, y no se contesta
-- desde acá.
--
--
-- ── 1. `status` deja de aceptar cualquier palabra ──────────────────────────
-- Es texto libre desde la 0001, o sea que la base acepta 'activo', 'Activo',
-- 'activa' y 'cualquier cosa' con la misma cara. Mientras lo escribía una
-- persona mirando la pantalla, el error se veía; a partir de ahora lo escribe un
-- programa que llama otro programa, y ahí no lo ve nadie hasta que una
-- Prestadora entera desaparece de su propia dirección por una letra.
--
-- Tres valores y ninguno más. `cancelado` y `suspendido` se distinguen porque no
-- son lo mismo del lado de quien vende: suspendido vuelve, cancelado no.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_status_check
      check (status in ('activo', 'suspendido', 'cancelado'));
  end if;
end $$;

comment on column public.tenants.status is
  'En qué situación está la Prestadora frente a quien le vendió el software. activo, suspendido o cancelado, y nada más (0023). Quién lo escribe es CeltaTech, a través de la función de borde `alta-y-baja`; adentro del producto sólo lo leen las tres funciones públicas de la 0021, que exigen `activo`.';


-- ── 2. Cuándo se fijó ese estado ───────────────────────────────────────────
-- Existe por un motivo concreto y no por prolijidad. Los avisos de CeltaTech
-- viajan por internet y se reintentan cuando se pierden
-- (`../../docs/MODELO_COMERCIAL_CELTATECH.md` §6.2), así que pueden llegar dos
-- veces y pueden llegar al revés: primero el reintento de una cancelación vieja
-- y después el que la reactivaba. Aplicados en ese orden, la Prestadora queda
-- cancelada por un mensaje que ya no era verdad.
--
-- Con esta columna la regla es de una línea: sólo se aplica lo que se emitió
-- después de lo último aplicado. Un repetido no cambia nada y un atrasado
-- tampoco, sin necesidad de llevar una lista de mensajes ya atendidos.
--
-- Arranca en null a propósito: las Prestadoras que ya existen nunca recibieron
-- una orden de nadie, así que la primera que llegue se aplica.
alter table public.tenants
  add column if not exists estado_fijado_en timestamp with time zone;

comment on column public.tenants.estado_fijado_en is
  'Cuándo se emitió la orden que dejó `status` como está. No es cuándo se aplicó: es la fecha que trae el aviso de CeltaTech. Sirve para una sola cosa, y es descartar lo repetido y lo atrasado (0023).';


-- ── 3. El nombre corto, deducido del nombre ────────────────────────────────
-- El alta que describe §6.1 trae la razón social y no trae nombre corto, pero el
-- nombre corto es lo que este producto usa en la dirección (`?t=presdemo`) y es
-- lo único de `tenants` que ya era único desde la 0001.
--
-- Deducirlo del nombre le da al alta algo que no tenía: **repetirla no duplica
-- nada**. El mismo nombre da el mismo nombre corto, el mismo nombre corto choca
-- con la fila que ya está, y el alta devuelve la Prestadora que ya existía en
-- vez de crear una gemela. Un reintento de CeltaTech, que es lo normal cuando se
-- pierde una respuesta, no deja dos empresas donde había una.
--
-- Las tildes se sacan a mano y no con `unaccent`: esa extensión no está
-- instalada en esta base y pedirla para diez letras es traer una biblioteca
-- entera para saludar.
create or replace function public.nombre_corto_de(p_nombre text)
  returns text
  language sql
  immutable
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          lower(translate(p_nombre,
                          'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                          'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
          '[^a-z0-9]+', '-', 'g'),
        '-{2,}', '-', 'g')),
    '');
$$;

comment on function public.nombre_corto_de(text) is
  'Convierte un nombre en el nombre corto que va en la dirección: minúsculas, sin tildes y con guiones. Es determinista a propósito —el mismo nombre da siempre el mismo resultado—, que es lo que hace que repetir un alta no duplique la Prestadora (0023).';


-- ── 4. El alta ─────────────────────────────────────────────────────────────
-- Devuelve dos cosas y la segunda importa: `creada` dice si esta llamada la
-- creó o si ya estaba. Sin ese dato, quien llama no puede distinguir «tu
-- reintento llegó bien» de «hay otra empresa que se llama igual», y son dos
-- situaciones que se resuelven distinto.
--
-- El nombre corto se puede mandar aparte, y es justamente para esa segunda: dos
-- clientes distintos con la misma razón social existen, y el que llama los
-- separa nombrándolos.
create or replace function public.alta_de_prestadora(
    p_nombre      text,
    p_slug        text default null,
    p_descripcion text default null)
  returns table (id uuid, slug text, creada boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
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
  'Da de alta una Prestadora y devuelve su identificador, que es el `tenant_ref` que CeltaTech guarda (§6.1 del modelo comercial). Repetir la llamada con el mismo nombre no crea una segunda: devuelve la que ya está, con `creada` en falso. Sólo la llama la función de borde `alta-y-baja` (0023).';


-- ── 5. El cambio de estado ─────────────────────────────────────────────────
-- Lo mismo del otro lado: devuelve si aplicó o no, para que quien llama sepa la
-- diferencia entre «hecho» y «esto ya no era noticia».
create or replace function public.fijar_estado_de_prestadora(
    p_id         uuid,
    p_estado     text,
    p_emitido_en timestamp with time zone)
  returns table (estado text, aplicado boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_actual  text;
  v_fijado  timestamp with time zone;
begin
  select t.status, t.estado_fijado_en into v_actual, v_fijado
    from public.tenants t where t.id = p_id
     for update;

  if not found then
    raise exception 'No hay ninguna Prestadora con el identificador %', p_id
      using errcode = 'no_data_found';
  end if;

  -- Lo repetido y lo atrasado se descartan acá, y es todo lo que hace falta para
  -- que los reintentos de CeltaTech no puedan dejar un estado viejo pisando uno
  -- nuevo.
  if v_fijado is not null and p_emitido_en <= v_fijado then
    return query select v_actual, false;
    return;
  end if;

  update public.tenants
     set status = p_estado, estado_fijado_en = p_emitido_en
   where tenants.id = p_id;

  return query select p_estado, true;
end;
$$;

comment on function public.fijar_estado_de_prestadora(uuid, text, timestamp with time zone) is
  'Deja a una Prestadora activa, suspendida o cancelada por orden de CeltaTech. Descarta lo que se emitió antes de lo último aplicado, así que un aviso repetido o llegado tarde no pisa nada. Sólo la llama la función de borde `alta-y-baja` (0023).';


-- ── 6. Quién puede llamarlas ───────────────────────────────────────────────
-- `public` es todo el mundo, incluidos roles que todavía no existen: se le
-- revoca siempre y primero. Y acá, a diferencia de la 0021, `anon` no conserva
-- nada: dar de alta una empresa no es algo que se haga sin cuenta, ni con
-- cuenta. Lo hace la función de borde, que entra con la llave de servicio.
revoke all on function public.alta_de_prestadora(text, text, text)          from public;
revoke all on function public.alta_de_prestadora(text, text, text)          from anon;
revoke all on function public.alta_de_prestadora(text, text, text)          from authenticated;

revoke all on function public.fijar_estado_de_prestadora(uuid, text, timestamp with time zone) from public;
revoke all on function public.fijar_estado_de_prestadora(uuid, text, timestamp with time zone) from anon;
revoke all on function public.fijar_estado_de_prestadora(uuid, text, timestamp with time zone) from authenticated;

revoke all on function public.nombre_corto_de(text) from public;
revoke all on function public.nombre_corto_de(text) from anon;

grant execute on function public.alta_de_prestadora(text, text, text)       to service_role;
grant execute on function public.fijar_estado_de_prestadora(uuid, text, timestamp with time zone) to service_role;
grant execute on function public.nombre_corto_de(text)                      to service_role;


-- ── 7. Las dos que ya estaban ──────────────────────────────────────────────
-- Nunca recibieron una orden de nadie: se crearon a mano en la 0003. Se les deja
-- `estado_fijado_en` en null para que la primera orden que llegue se aplique sin
-- discutir, que es lo correcto.
--
-- No hace falta tocarlas: la columna nace en null.
