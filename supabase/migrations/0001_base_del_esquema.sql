--
-- 0001 — LA BASE DEL ESQUEMA
--
-- Este archivo y el 0002 reemplazan a las 74 migraciones que iban de la 0001 a
-- la 0074, y arman exactamente la misma base. No es una reescritura: es el
-- volcado de la base que esas 74 construían, comprobado contra ella con once
-- huellas de estructura y treinta y seis de contenido, una por tabla.
--
-- Por qué se aplastaron. Las 74 no eran 74 decisiones: eran una decisión y
-- setenta y tres correcciones de sí misma, y volver a pasar por cada tropiezo
-- para llegar al mismo lugar no le sirve a nadie que construya la base de
-- ahora en adelante. El relato de cómo se llegó acá vive en el historial del
-- repositorio, que lo guarda entero y no ocupa lugar en el escritorio.
--
-- Qué trae que un volcado de `public` no traería. Al final están las tres
-- políticas del depósito de archivos, que viven en `storage`; los dos
-- depósitos; y el disparador que crea el perfil al registrarse, que cuelga de
-- `auth.users`. Las tres cosas son esquema, y sin ellas la base reconstruida
-- desde cero no es la misma base.
--
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Toda base de Supabase nace concediéndoles a `anon` y a `authenticated` los
-- permisos por omisión de cada tabla y cada secuencia que se cree en `public`,
-- y entre ellos están TRUNCATE, REFERENCES y TRIGGER. Las 74 migraciones se los
-- sacaban. El volcado no lo reproduce solo, porque `pg_dump` escribe lo que hay
-- y no lo que falta, así que sin esto la base reconstruida le dejaría a quien no
-- inició sesión el permiso de vaciar cualquier tabla. Va antes de crear nada,
-- para que ninguna llegue a heredarlo.
--
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: alta_de_prestadora(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.alta_de_prestadora(p_referencia text, p_nombre text, p_slug text DEFAULT NULL::text, p_descripcion text DEFAULT NULL::text) RETURNS TABLE(id uuid, slug text, creada boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text) IS 'Da de alta una Prestadora a pedido de CeltaTech, o devuelve la que ya existe con esa referencia (0025). La reconoce sólo por `p_referencia`; el nombre corto es la dirección web y nada más. Se llama únicamente desde la función de borde `alta-y-baja`.';


--
-- Name: avisos_abiertos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.avisos_abiertos() RETURNS TABLE(id uuid, created_at timestamp with time zone, zona text, descripcion text, motivo_consulta text, profesion text, patologias jsonb, tareas jsonb, horarios text, frecuencia text, genero_preferido text, ya_me_postule boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select a.id,
         a.created_at,
         a.zone,
         a.description,
         a.consultation_reason,
         a.profession_required,
         a.pathologies_required,
         a.tasks_required,
         a.schedule_type,
         a.frequency,
         a.preferred_gender,
         exists (select 1
                   from public.postulaciones p
                  where p.aviso_id = a.id
                    and p.caregiver_id = public.legajo_propio())
    from public.avisos a
   where public.legajo_propio() is not null
     and a.tenant_id = public.prestadora_actual()
     and coalesce(a.status, 'activa') = 'activa'
   order by a.created_at desc;
$$;


--
-- Name: FUNCTION avisos_abiertos(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.avisos_abiertos() IS 'Los avisos activos de la Prestadora de quien inició sesión, para un Asistente con legajo. Devuelve sólo lo que hace falta para decidir si postularse: nunca contact_info, nunca familia_id y nunca el nombre del paciente. Sin legajo propio devuelve cero filas.';


--
-- Name: configuracion_de_fabrica_de_las_alarmas(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.configuracion_de_fabrica_de_las_alarmas(p_tenant uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.alarmas_prestadora (tenant_id)
       values (p_tenant)
  on conflict (tenant_id) do nothing;
$$;


--
-- Name: FUNCTION configuracion_de_fabrica_de_las_alarmas(p_tenant uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.configuracion_de_fabrica_de_las_alarmas(p_tenant uuid) IS 'Le deja a una Prestadora su fila de topes de alarma con los valores de fábrica. No pisa la que ya configuró.';


--
-- Name: configuracion_de_fabrica_del_puntaje(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.configuracion_de_fabrica_del_puntaje(p_tenant uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.puntaje_prestadora (tenant_id)
       values (p_tenant)
  on conflict (tenant_id) do nothing;

  -- Sólo la que no tiene ninguna. La que tiene algunas ya repartió sus 100 y
  -- agregarle veintes se lo rompería.
  if not exists (select 1 from public.ponderacion_comprobacion
                  where tenant_id = p_tenant) then
    insert into public.ponderacion_comprobacion (tenant_id, comprobacion)
    select p_tenant, c.comprobacion
      from (values ('domicilio'), ('referencia'), ('matricula'),
                   ('titulo'), ('curso_aprobado')) as c(comprobacion)
    on conflict (tenant_id, comprobacion) do nothing;
  end if;
end;
$$;


--
-- Name: FUNCTION configuracion_de_fabrica_del_puntaje(p_tenant uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.configuracion_de_fabrica_del_puntaje(p_tenant uuid) IS 'Le deja a una Prestadora el puntaje de fábrica: califica en verdadero y 100 repartido en cinco partes iguales. No toca a la que ya tiene ponderaciones cargadas. Correrla dos veces no cambia nada.';


--
-- Name: contacto_en_el_texto(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contacto_en_el_texto(p_texto text) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select r.clave
    from public.patrones_de_contacto r
   where r.activo
     and case when position('i' in r.banderas) > 0
              then coalesce(p_texto, '') ~* public.patron_en_postgres(r.patron)
              else coalesce(p_texto, '') ~  public.patron_en_postgres(r.patron)
         end
   order by r.orden, r.clave
   limit 1;
$$;


--
-- Name: FUNCTION contacto_en_el_texto(p_texto text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.contacto_en_el_texto(p_texto text) IS 'La clave de la primera regla de patrones_de_contacto que reconoce datos de contacto en ese texto, o nulo si no reconoce ninguna. Nunca devuelve el texto.';


--
-- Name: conversacion_propia(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.conversacion_propia(p_conversacion uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
      from public.conversaciones c
     where c.id        = p_conversacion
       and c.tenant_id = public.prestadora_actual()
       and (c.familia_id = auth.uid()
            or c.caregiver_id = public.legajo_propio()))
$$;


--
-- Name: FUNCTION conversacion_propia(p_conversacion uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.conversacion_propia(p_conversacion uuid) IS 'Si quien inició sesión es una de las dos partes de esa conversación. Punto único de verdad de las políticas de mensajes.';


--
-- Name: corregir_prestadora(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.corregir_prestadora(p_referencia text, p_nombre text) RETURNS TABLE(id uuid, aplicado boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION corregir_prestadora(p_referencia text, p_nombre text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.corregir_prestadora(p_referencia text, p_nombre text) IS 'Recibe de CeltaTech la corrección de la razón social de una Prestadora (0025). Corrige el nombre visible y nada más: el nombre corto es la dirección web y no se toca, y la descripción la escribe la Prestadora. Se llama únicamente desde la función de borde `alta-y-baja`.';


--
-- Name: crear_perfil_al_registrarse(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_perfil_al_registrarse() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: FUNCTION crear_perfil_al_registrarse(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.crear_perfil_al_registrarse() IS 'Crea el perfil al registrarse. El rol nunca sale de los metadatos sin filtrar.';


--
-- Name: i18n_completo(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.i18n_completo(p_texto jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and coalesce(
           (select bool_and(jsonb_typeof(p_texto -> idioma) = 'string'
                            and length(btrim(p_texto ->> idioma)) > 0)
              from unnest(array['es-AR', 'en', 'pt-BR']) as idioma),
           false);
$$;


--
-- Name: FUNCTION i18n_completo(p_texto jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.i18n_completo(p_texto jsonb) IS 'Verdadero si el jsonb trae los tres idiomas del producto con texto no vacio. Punto unico de verdad de la regla i18n desde el dia uno; la usan los check de las tablas que guardan texto visible.';


--
-- Name: i18n_minimo(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.i18n_minimo(p_texto jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and jsonb_typeof(p_texto -> 'es-AR') = 'string'
     and length(btrim(p_texto ->> 'es-AR')) > 0;
$$;


--
-- Name: FUNCTION i18n_minimo(p_texto jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.i18n_minimo(p_texto jsonb) IS 'Verdadero si el jsonb trae al menos el es-AR con texto no vacio. Solo vale acompanado de i18n_pendiente en verdadero, que deja anotado por que falta el resto.';


--
-- Name: prestadora_actual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prestadora_actual() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select tenant_id from public.profiles where id = auth.uid()
$$;


--
-- Name: FUNCTION prestadora_actual(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prestadora_actual() IS 'La Prestadora de quien inició sesión. Sale de su membresía, nunca del pedido.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: autorizaciones_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autorizaciones_asistente (
    caregiver_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    perfil_publicado boolean DEFAULT false NOT NULL,
    respondido_el timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE autorizaciones_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.autorizaciones_asistente IS 'Lo que el Asistente autoriza al cerrar el alta. perfil_publicado en false es lo que impide que directorio muestre a alguien que no dio permiso — pendiente 2. Se llamaba banderas_asistente hasta la migración 0012.';


--
-- Name: caregivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caregivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    dni text,
    phone text,
    email text,
    profession text,
    zone text,
    pathologies jsonb,
    tasks jsonb,
    documents jsonb,
    verification_status text DEFAULT 'en_revision'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    tenant_id uuid DEFAULT public.prestadora_actual(),
    cuit text,
    address text,
    bank_info text,
    reference_info jsonb,
    education_info jsonb,
    birthdate date,
    gender text,
    nationality text,
    hourly_rate numeric,
    user_id uuid,
    zonas_texto text,
    moneda_valor_hora text,
    CONSTRAINT no_hay_valor_hora_sin_moneda CHECK (((hourly_rate IS NULL) OR (moneda_valor_hora ~ '^[A-Z]{3}$'::text)))
);


--
-- Name: COLUMN caregivers.zone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.caregivers.zone IS 'Histórica y de sólo lectura desde el 2026-08-31 (migración 0050, pendiente 109). Guarda la zona de los legajos anteriores a la migración 0035, cuando la zona todavía era un texto suelto. Ninguna pantalla la escribe y el traductor de js/apiClient.js ya no la llena. La zona viva de un legajo está en zonas_asistente, y el texto para mostrar en caregivers.zonas_texto. No se borró porque los datos que tiene son de personas cargadas antes de esa migración y tres lectores se apoyan en ella para mostrarlos.';


--
-- Name: COLUMN caregivers.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.caregivers.user_id IS 'La cuenta dueña de este legajo. Nulo en los perfiles de muestra.';


--
-- Name: COLUMN caregivers.zonas_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.caregivers.zonas_texto IS 'Donde puede trabajar, escrito con sus palabras. Se usa cuando la Prestadora no cargo zonas en zonas_cobertura, que es el caso de cualquier Prestadora fuera del Area Metropolitana mientras no arme su lista.';


--
-- Name: COLUMN caregivers.moneda_valor_hora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.caregivers.moneda_valor_hora IS 'En qué moneda está escrito `hourly_rate`, en código ISO 4217. No se lee de `tenants` cada vez a propósito: el día que la Prestadora cambie de moneda, lo ya cargado sigue estando en la vieja hasta que cada persona lo vuelva a escribir (0074). La llena sola el disparador `el_valor_hora_nace_con_su_moneda`.';


--
-- Name: disponibilidad_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disponibilidad_asistente (
    caregiver_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    reemplazos_urgentes boolean DEFAULT false NOT NULL,
    respondido_el timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE disponibilidad_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.disponibilidad_asistente IS 'Módulo compartido: Disponibilidad horaria (docs/MODULOS.md). Lo general. Los días y turnos concretos están en franjas_asistente, una fila cada uno.';


--
-- Name: intentos_evaluacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intentos_evaluacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    evaluacion_id uuid NOT NULL,
    respuestas jsonb NOT NULL,
    respuestas_correctas integer NOT NULL,
    preguntas_totales integer NOT NULL,
    porcentaje integer NOT NULL,
    aprobado boolean NOT NULL,
    rendido_el timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE intentos_evaluacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.intentos_evaluacion IS 'Todos los intentos, aprobados y no. Se guardan todos a propósito: dos intentos fallidos antes del bueno son parte de lo que la Prestadora tiene que poder ver.';


--
-- Name: verificaciones_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verificaciones_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    tipo text NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    plazo_vence_el date,
    verificado_por uuid,
    verificado_el timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT verificaciones_asistente_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'presentado'::text, 'verificado'::text, 'rechazado'::text, 'vencido'::text])))
);


--
-- Name: TABLE verificaciones_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.verificaciones_asistente IS 'Una fila por tipo de verificación y Asistente. tipo referencia data/catalogo-verificaciones.json: dni, penales, matricula, titulo, salud, domicilio, referencia.';


--
-- Name: vocabulario_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocabulario_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    vocabulario_id uuid NOT NULL,
    clave text NOT NULL,
    i18n jsonb NOT NULL,
    i18n_pendiente boolean DEFAULT false NOT NULL,
    nota text,
    extra jsonb DEFAULT '{}'::jsonb NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT el_extra_es_un_objeto CHECK ((jsonb_typeof(extra) = 'object'::text)),
    CONSTRAINT el_item_esta_en_los_tres_idiomas CHECK (
CASE
    WHEN (tenant_id IS NOT NULL) THEN public.i18n_minimo(i18n)
    WHEN i18n_pendiente THEN (public.i18n_minimo(i18n) AND (length(btrim(COALESCE(nota, ''::text))) > 0))
    ELSE public.i18n_completo(i18n)
END),
    CONSTRAINT la_clave_del_item_no_esta_vacia CHECK ((length(btrim(clave)) > 0))
);


--
-- Name: TABLE vocabulario_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vocabulario_items IS 'Las opciones de cada vocabulario. tenant_id en nulo es la opcion que trae el producto; cargado es la que agrego esa Prestadora, y puede colgar de un vocabulario general.';


--
-- Name: COLUMN vocabulario_items.i18n_pendiente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vocabulario_items.i18n_pendiente IS 'Solo para el catalogo general. Verdadero cuando la traduccion falta porque la decide el Desarrollador y todavia no la decidio, y obliga a escribir la nota. La lista se pide con: select clave, nota from vocabulario_items where i18n_pendiente. Lo que carga una Prestadora no lo usa: su texto va en el idioma en que lo escribio.';


--
-- Name: COLUMN vocabulario_items.nota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vocabulario_items.nota IS 'Por que ese item tiene la traduccion pendiente. No la lee ninguna pantalla.';


--
-- Name: COLUMN vocabulario_items.extra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vocabulario_items.extra IS 'Lo que solo tienen algunos items: icono, bajada (en los tres idiomas), requiere_matricula, horario, region. Lo que puede haber adentro esta escrito en docs/CATALOGO.md.';


--
-- Name: vocabularios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocabularios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    clave text NOT NULL,
    i18n jsonb NOT NULL,
    cerrada boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    admite_guia boolean DEFAULT false NOT NULL,
    CONSTRAINT el_titulo_esta_en_los_tres_idiomas CHECK (
CASE
    WHEN (tenant_id IS NOT NULL) THEN public.i18n_minimo(i18n)
    ELSE public.i18n_completo(i18n)
END),
    CONSTRAINT la_clave_no_esta_vacia CHECK ((length(btrim(clave)) > 0))
);


--
-- Name: TABLE vocabularios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vocabularios IS 'Las listas de opciones del producto. tenant_id en nulo es el catalogo general que ve todo el mundo; cargado es un vocabulario propio de esa Prestadora. Los items estan en vocabulario_items.';


--
-- Name: COLUMN vocabularios.cerrada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vocabularios.cerrada IS 'Falso si una Prestadora puede agregarle opciones propias. Viene declarado uno por uno desde el catalogo que vivia en data/catalogo-vocabularios.json.';


--
-- Name: COLUMN vocabularios.admite_guia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vocabularios.admite_guia IS 'Verdadero si sobre las opciones de esta lista tiene sentido escribir una Guia de cuidado. Lo lee la pantalla que deja a una Prestadora escribir la suya, para no ofrecerle listas donde una guia no significa nada.';


--
-- Name: zonas_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zonas_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    zona_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE zonas_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zonas_asistente IS 'Las zonas de cobertura que tildo un Asistente. Una region tildada es una fila, y no equivale a tildar todos sus municipios.';


--
-- Name: zonas_cobertura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zonas_cobertura (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    zona_padre_id uuid,
    clave text,
    nombre text NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT el_nombre_no_esta_vacio CHECK ((length(btrim(nombre)) > 0))
);


--
-- Name: TABLE zonas_cobertura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zonas_cobertura IS 'Las zonas que ofrece una Prestadora para tildar en el formulario de reclutamiento. Dos escalones: region con zona_padre_id en nulo, municipio o barrio colgado de ella. clave es la del vocabulario zona cuando el producto ya conoce ese lugar, y nula cuando el nombre lo escribio la Prestadora.';


--
-- Name: COLUMN zonas_cobertura.clave; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.zonas_cobertura.clave IS 'Clave del vocabulario zona de data/catalogo-vocabularios.json, si existe. Con clave la pantalla traduce el nombre a los tres idiomas; sin clave muestra la columna nombre tal como la escribio la Prestadora.';


--
-- Name: directorio; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.directorio AS
 SELECT c.id,
    c.tenant_id,
    c.full_name,
    c.profession,
    c.zone,
    c.pathologies,
    c.tasks,
    c.hourly_rate,
    c.gender,
    (c.documents ->> 'foto'::text) AS foto,
    COALESCE(d.reemplazos_urgentes, false) AS reemplazos_urgentes,
    c.created_at,
    (( SELECT COALESCE(array_agg(v.tipo ORDER BY
                CASE v.tipo
                    WHEN 'domicilio'::text THEN 1
                    WHEN 'referencia'::text THEN 2
                    WHEN 'matricula'::text THEN 3
                    WHEN 'titulo'::text THEN 4
                    ELSE NULL::integer
                END), ARRAY[]::text[]) AS "coalesce"
           FROM public.verificaciones_asistente v
          WHERE ((v.caregiver_id = c.id) AND (v.estado = 'verificado'::text) AND (v.tipo = ANY (ARRAY['domicilio'::text, 'referencia'::text, 'matricula'::text, 'titulo'::text])))) ||
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.intentos_evaluacion i
              WHERE ((i.caregiver_id = c.id) AND i.aprobado))) THEN ARRAY['curso_aprobado'::text]
            ELSE ARRAY[]::text[]
        END) AS comprobaciones,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('clave', z.clave, 'nombre', z.nombre, 'es_region', (z.zona_padre_id IS NULL), 'region_clave', COALESCE(r.clave, z.clave), 'region_nombre', COALESCE(r.nombre, z.nombre)) ORDER BY COALESCE(r.orden, z.orden), r.nombre NULLS FIRST, z.orden, z.nombre), '[]'::jsonb) AS "coalesce"
           FROM ((public.zonas_asistente za
             JOIN public.zonas_cobertura z ON ((z.id = za.zona_id)))
             LEFT JOIN public.zonas_cobertura r ON ((r.id = z.zona_padre_id)))
          WHERE ((za.caregiver_id = c.id) AND z.activa)) AS zonas,
    c.zonas_texto,
    ( SELECT COALESCE(array_agg(DISTINCT cl.clave), ARRAY[]::text[]) AS "coalesce"
           FROM (((public.zonas_asistente za
             JOIN public.zonas_cobertura z ON (((z.id = za.zona_id) AND z.activa)))
             LEFT JOIN public.zonas_cobertura r ON ((r.id = z.zona_padre_id)))
             CROSS JOIN LATERAL ( SELECT z.clave
                UNION ALL
                 SELECT r.clave
                UNION ALL
                 SELECT h.clave
                   FROM public.zonas_cobertura h
                  WHERE ((h.zona_padre_id = z.id) AND h.activa)) cl(clave))
          WHERE ((za.caregiver_id = c.id) AND (cl.clave IS NOT NULL))) AS zonas_claves,
    c.moneda_valor_hora
   FROM ((public.caregivers c
     JOIN public.autorizaciones_asistente a ON ((a.caregiver_id = c.id)))
     LEFT JOIN public.disponibilidad_asistente d ON ((d.caregiver_id = c.id)))
  WHERE ((c.verification_status = 'validado_prestadora'::text) AND a.perfil_publicado AND (NOT (EXISTS ( SELECT 1
           FROM (public.vocabulario_items vi
             JOIN public.vocabularios vo ON ((vo.id = vi.vocabulario_id)))
          WHERE ((vo.clave = 'verificacion'::text) AND (vo.tenant_id IS NULL) AND ((vi.tenant_id IS NULL) OR (vi.tenant_id = c.tenant_id)) AND vi.activo AND ((vi.extra ->> 'puerta'::text) = 'publicacion'::text) AND
                CASE
                    WHEN (vi.extra ? 'condicional_a'::text) THEN
                    CASE (vi.extra ->> 'condicional_a'::text)
                        WHEN 'tipo_asistente.requiere_matricula'::text THEN (COALESCE(( SELECT (ti.extra ->> 'requiere_matricula'::text)
                           FROM (public.vocabulario_items ti
                             JOIN public.vocabularios tv ON ((tv.id = ti.vocabulario_id)))
                          WHERE ((tv.clave = 'tipo_asistente'::text) AND (tv.tenant_id IS NULL) AND (ti.clave = c.profession) AND ((ti.tenant_id IS NULL) OR (ti.tenant_id = c.tenant_id)))
                         LIMIT 1), 'true'::text) = 'true'::text)
                        ELSE true
                    END
                    ELSE true
                END AND (NOT (EXISTS ( SELECT 1
                   FROM public.verificaciones_asistente v
                  WHERE ((v.caregiver_id = c.id) AND (v.tipo = vi.clave) AND (v.estado = 'verificado'::text))))))))));


--
-- Name: VIEW directorio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.directorio IS 'Directorio de Asistentes. Tres condiciones, y las tres hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora); la persona marcó perfil_publicado; y el legajo tiene comprobado cada papel que el vocabulario `verificacion` marca con puerta `publicacion` —los condicionales sólo cuando el tipo de Asistente los exige—. Esa tercera es de la 0061: hasta entonces la vista prometía en este mismo comentario que los papeles de la puerta los habían pasado todos, y no los miraba nadie. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera. gender y comprobaciones están acá por decisión suya del 26 de agosto de 2026 (pendiente 43), y el consentimiento de publicación las nombra a las dos: una columna que el consentimiento no nombre no puede salir por acá.';


--
-- Name: COLUMN directorio.comprobaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.directorio.comprobaciones IS 'Qué se le comprobó a este legajo, de las cinco de ponderacion_comprobacion. Sin fechas y sin números, y sin las de la puerta —documento, antecedentes penales y salud—, que desde la 0061 las pasaron de verdad todos los que aparecen acá. Lista vacía cuando no se le comprobó ninguna de las cinco: eso no es un error, es que todavía no se le comprobó ninguna.';


--
-- Name: COLUMN directorio.zonas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.directorio.zonas IS 'Dónde trabaja, en la lista de la Prestadora. Cada elemento trae clave, nombre, es_region y la región de la que cuelga (region_clave y region_nombre, que apuntan a ella misma cuando es una región). Lista vacía cuando la Prestadora no armó su lista: ahí lo que dice dónde trabaja es zonas_texto. Sólo las zonas activas: una zona que la Prestadora dio de baja deja de mostrarse sin borrar lo que la persona respondió.';


--
-- Name: COLUMN directorio.zonas_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.directorio.zonas_texto IS 'Dónde puede trabajar, escrito con sus palabras. Sale por acá porque sin esto el Asistente de una Prestadora sin lista aparecería en el directorio sin decir dónde trabaja.';


--
-- Name: COLUMN directorio.zonas_claves; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.directorio.zonas_claves IS 'Hasta dónde llega lo que esa persona contestó, en claves del vocabulario zona. No es lo que contestó —eso es la columna zonas— sino su alcance: una región tildada entera trae acá todas sus zonas activas. Existe para que el filtro del directorio conteste bien, y no se muestra en ninguna pantalla.';


--
-- Name: COLUMN directorio.moneda_valor_hora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.directorio.moneda_valor_hora IS 'En qué moneda está el `hourly_rate` de esta fila. Sale del legajo y no de la Prestadora, así que un valor cargado antes de que ella cambiara de moneda sigue diciendo la vieja, que es la verdadera (0074). No es dato personal: es la unidad del número que ya se publicaba al lado.';


--
-- Name: directorio_de(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.directorio_de(p_slug text) RETURNS SETOF public.directorio
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select d.*
    from public.directorio d
    join public.tenants t on t.id = d.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
   order by d.full_name;
$$;


--
-- Name: FUNCTION directorio_de(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.directorio_de(p_slug text) IS 'El directorio de UNA Prestadora, la que nombra el argumento. Es la única forma de leer directorio: la vista no está concedida a nadie. Sin nombre corto no devuelve nada, así que no existe la respuesta que mezcla dos empresas.';


--
-- Name: el_legajo_no_completa_el_alta_sin_sus_papeles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_legajo_no_completa_el_alta_sin_sus_papeles() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_faltante text;
begin
  select vi.clave
    into v_faltante
    from public.vocabulario_items vi
    join public.vocabularios vo on vo.id = vi.vocabulario_id
   where vo.clave = 'verificacion'
     and vo.tenant_id is null
     -- La Prestadora puede agregar papeles suyos a esta lista, y si lo hace
     -- rigen para su gente y para nadie más. Misma condición que la 0061.
     and (vi.tenant_id is null or vi.tenant_id = new.tenant_id)
     and vi.activo
     and vi.extra->>'puerta' = 'alta'
     and coalesce(new.documents->>vi.clave, '') in ('', 'pendiente')
   order by vi.clave
   limit 1;

  if v_faltante is not null then
    -- El error lleva la clave del papel que falta y nada más: ni el nombre
    -- de la tabla ni el resto del legajo. La pantalla la traduce con
    -- `Texto.claveDeError`, igual que `contacto_bloqueado` desde la 0063.
    raise exception 'alta_sin_papel:%', v_faltante
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;


--
-- Name: FUNCTION el_legajo_no_completa_el_alta_sin_sus_papeles(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.el_legajo_no_completa_el_alta_sin_sus_papeles() IS 'Frena el alta de un Aspirante si a caregivers.documents le falta un papel de los que el vocabulario verificacion marca con puerta "alta" (hoy sólo dni). No mira si ese papel está aprobado por la Prestadora —eso es la validación, más adelante y con otra puerta— ni si venció —eso es el pendiente 98—: sólo si llegó. Corre antes del insert, que es cuando se termina de cargar el legajo.';


--
-- Name: el_legajo_no_se_sella_solo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_legajo_no_se_sella_solo() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION el_legajo_no_se_sella_solo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.el_legajo_no_se_sella_solo() IS 'Sobre `caregivers`: el sello de la Prestadora no se toma del pedido en el alta, no lo cambia quien no es personal, el legajo no cambia de dueño, y cambiar los papeles devuelve el sello a «sin revisar». Cierra los pendientes 66, 74 y 75.';


--
-- Name: el_mensaje_no_lleva_datos_de_contacto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_mensaje_no_lleva_datos_de_contacto() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_clave text;
begin
  v_clave := public.contacto_en_el_texto(new.contenido);
  if v_clave is not null then
    -- El error lleva una clave estable y nada más. No lleva el mensaje, no
    -- lleva la parte reconocida y no lleva nombres de tablas: es texto que
    -- llega al navegador, y ahí lo traduce el catálogo de frases.
    raise exception 'contacto_bloqueado:%', v_clave
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;


--
-- Name: FUNCTION el_mensaje_no_lleva_datos_de_contacto(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.el_mensaje_no_lleva_datos_de_contacto() IS 'Frena un mensaje del chat que lleve datos de contacto. Corre antes de guardar, así que no depende de ninguna pantalla. El error dice contacto_bloqueado:<clave de la regla> y nunca el contenido.';


--
-- Name: el_rol_y_la_prestadora_no_se_escriben_solos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION el_rol_y_la_prestadora_no_se_escriben_solos(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos() IS 'Sobre `profiles`: desde una sesión, `role` y `tenant_id` no cambian. De esas dos columnas salen `es_personal_de_prestadora()` y `prestadora_actual()`, o sea las políticas de todas las tablas. Cierra el pendiente 82, y no reemplaza al permiso por columna de la 0005: se suma.';


--
-- Name: el_valor_hora_nace_con_su_moneda(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_valor_hora_nace_con_su_moneda() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- Sin importe no hay moneda que guardar. Se limpia para que no quede colgada
  -- la de un valor por hora que se borró.
  if new.hourly_rate is null then
    new.moneda_valor_hora := null;
    return new;
  end if;

  -- Y si trae importe sin moneda, la que corresponde es la de su Prestadora al
  -- día de hoy. Si ya trae una, no se toca: quien la escribió sabe en qué está.
  if new.moneda_valor_hora is null then
    select t.moneda into new.moneda_valor_hora
      from public.tenants t
     where t.id = new.tenant_id;
  end if;

  -- Legajo sin Prestadora y con importe: no hay de dónde sacar la moneda, y
  -- adivinarla sería escribir un número que dice lo que no es. Se corta acá, con
  -- un mensaje que se entiende, en vez de dejar que la restricción hable de
  -- columnas.
  if new.moneda_valor_hora is null then
    raise exception
      'No se puede guardar un valor por hora sin saber en qué moneda está: el legajo no tiene Prestadora.';
  end if;

  return new;
end;
$$;


--
-- Name: FUNCTION el_valor_hora_nace_con_su_moneda(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.el_valor_hora_nace_con_su_moneda() IS 'Le pone al valor por hora la moneda de su Prestadora cuando quien escribe no la trajo, y la borra cuando se borra el importe. Existe para que la regla «todo importe con su moneda» no dependa de que cada pantalla se acuerde (0074).';


--
-- Name: el_vocabulario_no_cruza_prestadoras(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_vocabulario_no_cruza_prestadoras() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: el_vocabulario_propio_no_pisa_al_general(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.el_vocabulario_propio_no_pisa_al_general() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.tenant_id is not null and exists (
       select 1 from public.vocabularios v
        where v.tenant_id is null and v.clave = new.clave) then
    raise exception 'El vocabulario «%» ya existe en el catálogo general; para agregarle opciones no hace falta crear uno propio.', new.clave;
  end if;
  return new;
end;
$$;


--
-- Name: es_personal_de_prestadora(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_personal_de_prestadora() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select role = 'coordinador' from public.profiles where id = auth.uid()),
    false)
$$;


--
-- Name: FUNCTION es_personal_de_prestadora(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.es_personal_de_prestadora() IS 'Si quien inició sesión trabaja para la Prestadora. Sale del rol, nunca del pedido.';


--
-- Name: fijar_estado_de_prestadora(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone) RETURNS TABLE(estado text, aplicado boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone) IS 'Deja a una Prestadora activa, suspendida o cancelada por orden de CeltaTech. Descarta lo que se emitió antes de lo último aplicado, así que un aviso repetido o llegado tarde no pisa nada. Sólo la llama la función de borde `alta-y-baja` (0023).';


--
-- Name: franjas_de_aviso(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.franjas_de_aviso(p_aviso uuid) RETURNS TABLE(dia text, turno text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select f.dia, f.turno
    from public.franjas_aviso f
    join public.avisos a on a.id = f.aviso_id
   where a.id = p_aviso
     and a.tenant_id = public.prestadora_actual()
     and (public.legajo_propio() is not null or a.familia_id = auth.uid())
   order by f.dia, f.turno;
$$;


--
-- Name: FUNCTION franjas_de_aviso(p_aviso uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.franjas_de_aviso(p_aviso uuid) IS 'La grilla de días y turnos de un aviso, para un Asistente de esa misma Prestadora o para la Familia que lo publicó. Nada más de ese aviso viaja acá.';


--
-- Name: guias_de(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guias_de(p_slug text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with prestadora as (
    select t.id
      from public.tenants t
     where p_slug is not null
       and t.slug = p_slug
       and t.status = 'activo'
  ),
  visibles as (
    select v.clave as vocabulario, i.clave as opcion, g.*
      from public.guias_cuidado g
      join public.vocabulario_items i on i.id = g.vocabulario_item_id
      join public.vocabularios      v on v.id = i.vocabulario_id
     where g.activo
       and g.publicada
       and i.activo
       and v.activo
       and (g.tenant_id is null or g.tenant_id = (select id from prestadora))
       and (i.tenant_id is null or i.tenant_id = (select id from prestadora))
  ),
  elegidas as (
    select distinct on (vocabulario, opcion) *
      from visibles
     order by vocabulario, opcion, (tenant_id is not null) desc
  )
  select coalesce(
           jsonb_object_agg(x.vocabulario, x.opciones),
           '{}'::jsonb)
    from (
      select e.vocabulario,
             jsonb_object_agg(e.opcion, jsonb_build_object(
               'descripcion',       e.descripcion,
               'que_esperar',       e.que_esperar,
               'senales_de_alarma', e.senales_de_alarma,
               'en_emergencia',     e.en_emergencia,
               'propia',            e.tenant_id is not null
             )) as opciones
        from elegidas e
       group by e.vocabulario
    ) as x;
$$;


--
-- Name: FUNCTION guias_de(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.guias_de(p_slug text) IS 'Las Guias de cuidado publicadas: la general mas la propia de UNA Prestadora, por su nombre corto, sin sesion. La propia reemplaza a la general. Agrupadas por clave de vocabulario y clave de opcion, con los tres idiomas adentro.';


--
-- Name: i18n_lista_completa(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.i18n_lista_completa(p_texto jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and coalesce(
           (select bool_and(
                     jsonb_typeof(p_texto -> idioma) = 'array'
                     and jsonb_array_length(p_texto -> idioma) > 0
                     and not exists (
                           select 1
                             from jsonb_array_elements(p_texto -> idioma) as renglon
                            where jsonb_typeof(renglon) <> 'string'
                               or length(btrim(renglon #>> '{}')) = 0))
              from unnest(array['es-AR', 'en', 'pt-BR']) as idioma),
           false);
$$;


--
-- Name: FUNCTION i18n_lista_completa(p_texto jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.i18n_lista_completa(p_texto jsonb) IS 'Verdadero si el jsonb trae los tres idiomas del producto y cada uno es una lista con al menos un renglon, sin renglones vacios. Para el texto visible que se lee como lista y no como parrafo.';


--
-- Name: i18n_lista_minima(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.i18n_lista_minima(p_texto jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_texto is not null
     and jsonb_typeof(p_texto) = 'object'
     and jsonb_typeof(p_texto -> 'es-AR') = 'array'
     and jsonb_array_length(p_texto -> 'es-AR') > 0
     and not exists (
           select 1
             from jsonb_array_elements(p_texto -> 'es-AR') as renglon
            where jsonb_typeof(renglon) <> 'string'
               or length(btrim(renglon #>> '{}')) = 0);
$$;


--
-- Name: FUNCTION i18n_lista_minima(p_texto jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.i18n_lista_minima(p_texto jsonb) IS 'Verdadero si el jsonb trae al menos el es-AR como lista con al menos un renglon no vacio. Para lo que carga una Prestadora, que va en el idioma en que lo escribio.';


--
-- Name: la_fecha_de_alta_la_pone_la_base(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_fecha_de_alta_la_pone_la_base() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;


--
-- Name: FUNCTION la_fecha_de_alta_la_pone_la_base(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.la_fecha_de_alta_la_pone_la_base() IS 'La fecha de alta de un legajo la pone la base y no se puede escribir desde afuera. La política del legajo propio es `for all` y no nombra columnas, así que sin esto la persona se elige su propia antigüedad.';


--
-- Name: la_guia_no_cruza_prestadoras(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_guia_no_cruza_prestadoras() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_duenio_item uuid;
begin
  select tenant_id into v_duenio_item
    from public.vocabulario_items where id = new.vocabulario_item_id;

  -- 1. Una guía cuelga de una opción del catálogo general o de una de su
  --    propia Prestadora. Nunca de una de otra.
  if v_duenio_item is not null and v_duenio_item is distinct from new.tenant_id then
    raise exception 'Una guía sólo puede colgar de una opción del catálogo general o de una de su misma Prestadora.';
  end if;

  -- 2. Y el producto no escribe guías para las opciones privadas de un
  --    cliente: no sabe qué cargó ni le corresponde opinar sobre eso.
  if new.tenant_id is null and v_duenio_item is not null then
    raise exception 'El catálogo general no lleva guías de opciones propias de una Prestadora.';
  end if;

  return new;
end;
$$;


--
-- Name: la_ponderacion_suma_cien(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_ponderacion_suma_cien() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  afectada uuid := coalesce(new.tenant_id, old.tenant_id);
  cuantas  integer;
  total    numeric(8,2);
begin
  select count(*), coalesce(sum(ponderacion), 0)
    into cuantas, total
    from public.ponderacion_comprobacion
   where tenant_id = afectada;

  -- Una Prestadora que no tiene ni una fila no reparte nada, y eso es válido:
  -- es la que borró todo, no la que dejó el reparto a medias.
  if cuantas = 0 then
    return null;
  end if;

  if total <> 100 then
    raise exception
      'Las ponderaciones de una Prestadora tienen que sumar 100 y suman %', total
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;


--
-- Name: FUNCTION la_ponderacion_suma_cien(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.la_ponderacion_suma_cien() IS 'Comprueba, al cerrar la transacción y no en cada renglón, que las ponderaciones de la Prestadora que se tocó sumen 100. Diferido a propósito: reacomodar es mover varias filas y en el medio el total nunca da 100.';


--
-- Name: la_prestadora_nace_configurada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_prestadora_nace_configurada() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform public.configuracion_de_fabrica_del_puntaje(new.id);
  perform public.configuracion_de_fabrica_de_las_alarmas(new.id);
  return new;
end;
$$;


--
-- Name: FUNCTION la_prestadora_nace_configurada(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.la_prestadora_nace_configurada() IS 'Deja el puntaje de fábrica a toda Prestadora recién creada, venga de la puerta de alta de CeltaTech o de una migración.';


--
-- Name: la_resolucion_dice_quien_la_firmo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_resolucion_dice_quien_la_firmo() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.resuelto_por := auth.uid();
  return new;
end;
$$;


--
-- Name: FUNCTION la_resolucion_dice_quien_la_firmo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.la_resolucion_dice_quien_la_firmo() IS 'Sobre `resoluciones_legajo`: quién resolvió lo pone la base con `auth.uid()`, no el pedido. Con la sesión vacía —una siembra, o la llave del servidor— no toca nada, porque ahí no hay nadie a quien atribuirle la firma. Parte del pendiente 90.';


--
-- Name: la_verificacion_dice_quien_la_marco(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_verificacion_dice_quien_la_marco() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.estado = 'pendiente' then
    new.verificado_por := null;
    new.verificado_el  := null;
    return new;
  end if;

  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    new.verificado_por := auth.uid();
    new.verificado_el  := now();
  else
    new.verificado_por := old.verificado_por;
    new.verificado_el  := old.verificado_el;
  end if;

  return new;
end;
$$;


--
-- Name: FUNCTION la_verificacion_dice_quien_la_marco(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.la_verificacion_dice_quien_la_marco() IS 'Sobre `verificaciones_asistente`: la huella de quién marcó y cuándo la pone la base con `auth.uid()`, no el pedido. Vuelve a vacía si el estado vuelve a «pendiente», y no se refresca si el estado no cambió. Parte del pendiente 70.';


--
-- Name: la_zona_cuelga_de_una_region(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.la_zona_cuelga_de_una_region() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.zona_padre_id is not null then
    if exists (select 1 from public.zonas_cobertura z
                where z.id = new.zona_padre_id
                  and z.zona_padre_id is not null) then
      raise exception 'Una zona cuelga de una región, y una región no cuelga de nada: sólo hay dos escalones.';
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: legajo_propio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.legajo_propio() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select id from public.caregivers where user_id = auth.uid() limit 1
$$;


--
-- Name: FUNCTION legajo_propio(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.legajo_propio() IS 'El legajo de quien inició sesión, para que un Asistente vea el suyo y ninguno más.';


--
-- Name: mis_alarmas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mis_alarmas() RETURNS TABLE(clase text, fichada_id uuid, conversacion_id uuid, otra_parte text, ocurrio_el timestamp with time zone, horas integer, tope_horas integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with tope as (
    select coalesce(max(a.horas_jornada_abierta), 16) as horas
      from public.alarmas_prestadora a
     where a.tenant_id = public.prestadora_actual()
  ),
  mias as (
    select f.id,
           f.conversacion_id,
           f.event_type,
           f.created_at,
           cv.familia_id = auth.uid() as soy_la_familia,
           c.full_name                as nombre_del_asistente,
           pf.full_name               as nombre_de_la_familia,
           lead(f.event_type) over (partition by f.conversacion_id
                                        order by f.created_at) as sigue,
           lag(f.event_type)  over (partition by f.conversacion_id
                                        order by f.created_at) as venia
      from public.clock_ins f
      join public.conversaciones cv on cv.id = f.conversacion_id
      join public.caregivers c            on c.id  = cv.caregiver_id
      left join public.profiles pf        on pf.id = cv.familia_id
     where f.tenant_id  = public.prestadora_actual()
       and cv.tenant_id = public.prestadora_actual()
       and (cv.familia_id = auth.uid()
            or cv.caregiver_id = public.legajo_propio())
  )
  select 'jornada_abierta'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.created_at,
         (extract(epoch from (now() - m.created_at)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'entrada'
     and (m.sigue is null or m.sigue <> 'salida')
     and m.created_at < now() - make_interval(hours => t.horas)

  union all

  select 'salida_sin_entrada'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.created_at,
         (extract(epoch from (now() - m.created_at)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'salida'
     and (m.venia is null or m.venia <> 'entrada')

   order by 5 desc;
$$;


--
-- Name: FUNCTION mis_alarmas(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mis_alarmas() IS 'Lo que la aplicación detecta que quedó incompleto en las fichadas de los vínculos de quien inició sesión: una entrada que nunca cerró, o una salida sin entrada delante. No opina sobre la persona ni sobre el trato, que el software no conoce: dice que la marca quedó a medias. Devuelve una clave, no un texto: la frase sale del catálogo.';


--
-- Name: mis_conversaciones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mis_conversaciones() RETURNS TABLE(id uuid, aviso_id uuid, caregiver_id uuid, created_at timestamp with time zone, soy_la_familia boolean, otra_parte text, otra_parte_foto text, ultimo_el timestamp with time zone, ultimo_texto text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select cv.id,
         cv.aviso_id,
         cv.caregiver_id,
         cv.created_at,
         cv.familia_id = auth.uid(),
         case when cv.familia_id = auth.uid()
              then c.full_name
              else pf.full_name
         end,
         case when cv.familia_id = auth.uid()
              then c.documents->>'foto'
              else null
         end,
         m.created_at,
         m.contenido
    from public.conversaciones cv
    join public.caregivers c on c.id = cv.caregiver_id
    left join public.profiles pf on pf.id = cv.familia_id
    left join lateral (
      select mm.created_at, mm.contenido
        from public.mensajes mm
       where mm.conversacion_id = cv.id
       order by mm.created_at desc
       limit 1
    ) m on true
   where cv.tenant_id = public.prestadora_actual()
     and (cv.familia_id = auth.uid()
          or cv.caregiver_id = public.legajo_propio())
   order by coalesce(m.created_at, cv.created_at) desc;
$$;


--
-- Name: FUNCTION mis_conversaciones(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mis_conversaciones() IS 'Las conversaciones de quien inició sesión, sea la Familia o el Asistente, con el nombre de la otra parte y su último mensaje. No devuelve ningún dato de contacto: el canal es el canal, y sacar el trato de acá es justo lo que el producto no facilita.';


--
-- Name: nombre_corto_de(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nombre_corto_de(p_nombre text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
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


--
-- Name: FUNCTION nombre_corto_de(p_nombre text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.nombre_corto_de(p_nombre text) IS 'Convierte un nombre en el nombre corto que va en la dirección: minúsculas, sin tildes y con guiones. Es determinista a propósito —el mismo nombre da siempre el mismo resultado—, que es lo que hace que repetir un alta no duplique la Prestadora (0023).';


--
-- Name: patron_en_postgres(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.patron_en_postgres(p_patron text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select replace(p_patron, '\b', '\y');
$$;


--
-- Name: FUNCTION patron_en_postgres(p_patron text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.patron_en_postgres(p_patron text) IS 'Traduce una expresión escrita para el navegador a la sintaxis de Postgres. Hoy la única diferencia entre las dos, para las expresiones que usa el chat, es el borde de palabra: \b en JavaScript, \y en Postgres, donde \b significa retroceso. Lo que NO sabe traducir, y por eso la tabla no lo deja guardar: \B, la clase [\b], las miradas hacia adelante y hacia atrás ((?= (?! (?<= (?<!), y las referencias hacia atrás (\1). Ninguna de las cinco reglas de hoy las usa.';


--
-- Name: perfil_del_directorio(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) RETURNS SETOF public.directorio
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select d.*
    from public.directorio d
    join public.tenants t on t.id = d.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
     and d.id = p_id
   limit 1;
$$;


--
-- Name: FUNCTION perfil_del_directorio(p_slug text, p_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) IS 'Una persona del directorio, dentro de la Prestadora que nombra el argumento.';


--
-- Name: postulaciones_de_mis_avisos(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.postulaciones_de_mis_avisos(p_aviso uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, aviso_id uuid, caregiver_id uuid, mensaje text, vista_el timestamp with time zone, descartada_el timestamp with time zone, created_at timestamp with time zone, asistente_nombre text, asistente_profesion text, asistente_zona text, asistente_foto text, conversacion_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.id,
         p.aviso_id,
         p.caregiver_id,
         p.mensaje,
         p.vista_el,
         p.descartada_el,
         p.created_at,
         c.full_name,
         c.profession,
         c.zone,
         c.documents->>'foto',
         (select cv.id
            from public.conversaciones cv
           where cv.familia_id = auth.uid()
             and cv.caregiver_id = p.caregiver_id
           limit 1)
    from public.postulaciones p
    join public.avisos a on a.id = p.aviso_id
    join public.caregivers   c on c.id = p.caregiver_id
   where a.familia_id = auth.uid()
     and a.tenant_id = public.prestadora_actual()
     and (p_aviso is null or p.aviso_id = p_aviso)
   order by p.created_at desc;
$$;


--
-- Name: FUNCTION postulaciones_de_mis_avisos(p_aviso uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.postulaciones_de_mis_avisos(p_aviso uuid) IS 'Las postulaciones que recibieron los avisos de quien inició sesión. Sin argumento las trae todas; con uno, las de ese aviso. Del Asistente devuelve lo mismo que el directorio público y ningún dato de contacto. Sin sesión devuelve cero filas.';


--
-- Name: prestadora_por_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prestadora_por_slug(p_slug text) RETURNS TABLE(id uuid, slug text, name text, primary_color text, accent_color text, logo_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select t.id, t.slug, t.name, t.primary_color, t.accent_color, t.logo_url
    from public.tenants t
   where t.slug = p_slug
     and t.status = 'activo'
   limit 1;
$$;


--
-- Name: FUNCTION prestadora_por_slug(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prestadora_por_slug(p_slug text) IS 'Resuelve UNA Prestadora por su nombre corto, sin sesión, para que la pantalla sepa qué nombre y qué colores mostrar. Es la única forma de leer tenants sin cuenta, y no hay ninguna que devuelva más de una: el Desarrollador decidió el 25 de agosto de 2026 que no existe una lista de Prestadoras visible para nadie fuera del panel de control de CeltaTech.';


--
-- Name: rendir_evaluacion(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_legajo      uuid;
  v_prestadora  uuid;
  v_minimo      integer;
  v_tope        integer;
  v_rendidos    integer;
  v_total       integer;
  v_correctas   integer;
  v_porcentaje  integer;
  v_aprobado    boolean;
begin
  v_legajo     := public.legajo_propio();
  v_prestadora := public.prestadora_actual();

  -- Rinde una persona con legajo, no una cuenta cualquiera: el resultado
  -- se guarda contra el legajo y sin legajo no hay dónde guardarlo.
  if v_legajo is null then
    raise exception 'sin_legajo';
  end if;

  select e.porcentaje_para_aprobar, e.intentos_maximos
    into v_minimo, v_tope
    from public.evaluaciones e
   where e.id = p_evaluacion
     and e.publicado
     and (e.tenant_id is null or e.tenant_id = v_prestadora);

  if not found then
    raise exception 'evaluacion_inexistente';
  end if;

  if v_tope is not null then
    select count(*) into v_rendidos
      from public.intentos_evaluacion i
     where i.evaluacion_id = p_evaluacion
       and i.caregiver_id = v_legajo;
    if v_rendidos >= v_tope then
      raise exception 'sin_intentos';
    end if;
  end if;

  select count(*) into v_total
    from public.preguntas_evaluacion p
   where p.evaluacion_id = p_evaluacion;

  -- Una evaluación sin preguntas aprobaría a todo el mundo con un 0 de 0.
  -- Antes que eso, falla.
  if v_total = 0 then
    raise exception 'evaluacion_vacia';
  end if;

  select count(*) into v_correctas
    from public.preguntas_evaluacion p
    join public.opciones_pregunta o
      on o.pregunta_id = p.id
     and o.id::text = p_respuestas->>(p.id::text)
   where p.evaluacion_id = p_evaluacion
     and o.es_correcta;

  v_porcentaje := round(v_correctas * 100.0 / v_total);
  v_aprobado   := v_porcentaje >= v_minimo;

  insert into public.intentos_evaluacion
    (tenant_id, caregiver_id, evaluacion_id, respuestas,
     respuestas_correctas, preguntas_totales, porcentaje, aprobado)
  values
    (v_prestadora, v_legajo, p_evaluacion, p_respuestas,
     v_correctas, v_total, v_porcentaje, v_aprobado);

  -- Se devuelve el total y nada más. Decir cuáles estuvieron mal es, con
  -- dos opciones por pregunta, decir cuál era la correcta.
  return jsonb_build_object(
    'aprobado', v_aprobado,
    'porcentaje', v_porcentaje,
    'respuestas_correctas', v_correctas,
    'preguntas_totales', v_total,
    'porcentaje_para_aprobar', v_minimo
  );
end;
$$;


--
-- Name: FUNCTION rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb) IS 'Corrige y guarda el intento. Es la única forma de que aparezca una fila en intentos_evaluacion.';


--
-- Name: resoluciones_legajo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resoluciones_legajo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    caregiver_id uuid NOT NULL,
    estado text NOT NULL,
    motivo text NOT NULL,
    resuelto_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resoluciones_legajo_estado_check CHECK ((length(btrim(estado)) > 0)),
    CONSTRAINT resoluciones_legajo_motivo_check CHECK ((length(btrim(motivo)) > 0))
);


--
-- Name: TABLE resoluciones_legajo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resoluciones_legajo IS 'Cada vez que la Prestadora resuelve un legajo —otorga el aval o lo rechaza— queda acá una fila con el motivo, la fecha y quién firmó. Es historial: la resolución nueva se agrega, no pisa a la anterior. La lee y la escribe sólo el personal de la Prestadora; el Asistente juzgado no le llega.';


--
-- Name: COLUMN resoluciones_legajo.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resoluciones_legajo.estado IS 'El estado en el que quedó el legajo con esta resolución. Es el mismo valor que `caregivers.verification_status`, y lo escriben juntos `resolver_legajo` para que no puedan discrepar.';


--
-- Name: COLUMN resoluciones_legajo.motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resoluciones_legajo.motivo IS 'Lo que escribió el personal de la Prestadora al resolver. No puede quedar vacío: una resolución sin motivo es la falla que esta tabla vino a tapar.';


--
-- Name: COLUMN resoluciones_legajo.resuelto_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resoluciones_legajo.resuelto_por IS 'Quién firmó. Lo pone la base con `auth.uid()`, nunca el pedido.';


--
-- Name: resolver_legajo(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text) RETURNS public.resoluciones_legajo
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_resolucion public.resoluciones_legajo;
begin
  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'resolucion_sin_motivo';
  end if;
  if p_estado is null or length(btrim(p_estado)) = 0 then
    raise exception 'resolucion_sin_estado';
  end if;

  insert into public.resoluciones_legajo (caregiver_id, estado, motivo)
  values (p_caregiver_id, btrim(p_estado), btrim(p_motivo))
  returning * into v_resolucion;

  update public.caregivers
     set verification_status = btrim(p_estado)
   where id = p_caregiver_id;

  -- Si la política de `caregivers` no dejó tocar esa fila, el `update` no falla:
  -- no encuentra ninguna. Dar por resuelto un legajo que no se movió sería
  -- justo la mentira que este pendiente vino a sacar, así que se planta y la
  -- transacción entera se va atrás, resolución incluida.
  if not found then
    raise exception 'resolucion_sin_legajo';
  end if;

  return v_resolucion;
end;
$$;


--
-- Name: FUNCTION resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text) IS 'Resuelve un legajo: escribe el motivo en `resoluciones_legajo` y el estado en `caregivers`, las dos cosas en la misma transacción. Corre con los permisos de quien llama, así que el aislamiento lo siguen haciendo las políticas de las dos tablas. Cierra el pendiente 90.';


--
-- Name: vocabularios_de(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vocabularios_de(p_slug text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: FUNCTION vocabularios_de(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.vocabularios_de(p_slug text) IS 'El catalogo de vocabularios con la forma que espera js/catalogo.js: el general mas el propio de UNA Prestadora, por su nombre corto, sin sesion. Sin nombre corto devuelve solo el general.';


--
-- Name: zonas_de(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zonas_de(p_slug text) RETURNS TABLE(id uuid, zona_padre_id uuid, clave text, nombre text, orden integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select z.id, z.zona_padre_id, z.clave, z.nombre, z.orden
    from public.zonas_cobertura z
    join public.tenants t on t.id = z.tenant_id
   where t.slug = p_slug
     and t.status = 'activo'
     and z.activa
   order by z.zona_padre_id nulls first, z.orden, z.nombre;
$$;


--
-- Name: FUNCTION zonas_de(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.zonas_de(p_slug text) IS 'Las zonas de cobertura de UNA Prestadora, por su nombre corto, sin sesion, para el formulario de reclutamiento. Vacio significa que esa Prestadora no cargo lista y la pantalla tiene que preguntar en texto libre.';


--
-- Name: alarmas_prestadora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alarmas_prestadora (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    horas_jornada_abierta integer DEFAULT 16 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alarmas_prestadora_horas_jornada_abierta_check CHECK (((horas_jornada_abierta >= 1) AND (horas_jornada_abierta <= 168)))
);


--
-- Name: TABLE alarmas_prestadora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alarmas_prestadora IS 'El tope, en horas, a partir del cual una entrada sin salida se le avisa a la Familia. Es configuración del espacio de la Prestadora, no una regla del producto: una de internación nocturna y una de cuatro horas por la mañana no tienen el mismo número.';


--
-- Name: COLUMN alarmas_prestadora.horas_jornada_abierta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.alarmas_prestadora.horas_jornada_abierta IS 'De fábrica dieciséis. El límite de arriba, una semana, no es una opinión sobre el cuidado: es que más allá de ahí la alarma dejaría de avisar nunca y la columna quedaría apagada sin que se note.';


--
-- Name: avisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avisos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_name text NOT NULL,
    pathologies_required jsonb,
    schedule_type text,
    grid_schedule_7x3 jsonb,
    status text DEFAULT 'activa'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    tenant_id uuid DEFAULT public.prestadora_actual(),
    contact_info jsonb,
    zone text,
    description text,
    consultation_reason text,
    tasks_required jsonb,
    profession_required text,
    preferred_gender text,
    frequency text,
    familia_id uuid DEFAULT auth.uid() NOT NULL
);


--
-- Name: TABLE avisos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.avisos IS 'Lo que una Familia publica cuando necesita cuidado: qué hace falta, para quién, dónde y cuándo. Se llamaba care_searches hasta el 25 de agosto de 2026, y el nombre estaba mal: una búsqueda es el acto de buscar y no queda guardada; lo que queda guardado es el aviso. El prefijo de la modalidad dice que esta tabla existe sólo en la modalidad de este producto: en prestación directa el trabajo se asigna y nadie publica nada.';


--
-- Name: COLUMN avisos.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.contact_info IS 'Cómo volver a comunicarse con quien publicó la búsqueda: nombre, correo y teléfono. Son datos de una persona real, así que esta columna se vacía junto con el resto de los datos de personas antes de producción (CLAUDE.md §4).';


--
-- Name: COLUMN avisos.zone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.zone IS 'Dónde se necesita el cuidado. Guarda una clave del vocabulario `zona`, que tiene dos escalones: una región entera («zona_norte») o un barrio suelto («palermo»). Nunca texto libre: el directorio filtra por esta columna.';


--
-- Name: COLUMN avisos.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.description IS 'Lo que la Familia cuenta con sus palabras sobre la situación. Es la única columna de esta tabla que guarda texto libre, y por eso es la única que puede traer datos de una persona sin que nadie los haya pedido: se revisa junto con el resto antes de producción (CLAUDE.md §4).';


--
-- Name: COLUMN avisos.consultation_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.consultation_reason IS 'Para qué escribe quien escribe. Clave del vocabulario `motivo_consulta`. Hasta la 0013 se guardaba adentro de `pathologies_required`, que es la columna de las patologías; el rescate de más abajo lo mueve a su lugar.';


--
-- Name: COLUMN avisos.tasks_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.tasks_required IS 'Qué tareas de cuidado hace falta que haga el Asistente. Arreglo de claves del vocabulario `tarea_cuidado`. Es el espejo de `caregivers.tasks`: allá dice qué sabe hacer una persona, acá qué se necesita que se haga.';


--
-- Name: COLUMN avisos.profession_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.profession_required IS 'Qué tipo de Asistente se busca. Clave del vocabulario `tipo_asistente`, el mismo que llena `caregivers.profession`. Una sola: quien busca elige un tipo, no una lista.';


--
-- Name: COLUMN avisos.preferred_gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.preferred_gender IS 'Si la Familia prefiere que el Asistente sea de un género. Clave del vocabulario `genero_preferido`, que trae «indistinto» justamente para que no haya que dejarlo vacío cuando da igual.';


--
-- Name: COLUMN avisos.frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.frequency IS 'Si el cuidado es algo que se repite o algo de una vez. Clave del vocabulario `frecuencia`. No se confunde con `schedule_type`: aquélla dice bajo qué forma se contrata, ésta cada cuánto se necesita.';


--
-- Name: COLUMN avisos.familia_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avisos.familia_id IS 'Quién publicó el aviso. Sale del valor por omisión y nunca del pedido, igual que tenant_id: es lo que hace que nadie pueda publicar a nombre de otro. Los avisos anteriores a la 0020 lo tienen vacío, así que sólo los ve el personal de la Prestadora.';


--
-- Name: conversaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    familia_id uuid DEFAULT auth.uid() NOT NULL,
    caregiver_id uuid NOT NULL,
    aviso_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE conversaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversaciones IS 'El canal entre una Familia y un Asistente, y el hecho por el que la Prestadora cobra: quién contactó a quién y por cuál camino. Una sola por par, para que abrir dos ventanas no sea abrir dos contactos.';


--
-- Name: COLUMN conversaciones.familia_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversaciones.familia_id IS 'Quién abrió el contacto. Sale del valor por omisión y nunca del pedido, igual que en avisos: es lo que impide contactar a nombre de otro.';


--
-- Name: COLUMN conversaciones.aviso_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversaciones.aviso_id IS 'El aviso por el que se abrió, o nulo si la Familia llegó por el directorio. Ahí está guardado cuál de los dos caminos fue, sin una lista de valores escrita a mano.';


--
-- Name: franjas_aviso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.franjas_aviso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    aviso_id uuid NOT NULL,
    dia text NOT NULL,
    turno text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE franjas_aviso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.franjas_aviso IS 'Cuándo se necesita el cuidado. Una fila por casillero marcado de la grilla de días por turnos que pregunta la Familia. Es la tabla espejo de franjas_asistente (migración 0012): misma forma, mismos vocabularios, para que cruzar la necesidad de una Familia con la disponibilidad de un Asistente sea una consulta y no un recorrido. dia y turno guardan claves de dia_semana y turno, nunca la etiqueta. Lleva el prefijo de la modalidad porque cuelga del aviso, y el aviso sólo existe en esta modalidad.';


--
-- Name: COLUMN franjas_aviso.dia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.franjas_aviso.dia IS 'Clave del vocabulario dia_semana: lunes, martes, miercoles… Nunca «Lunes».';


--
-- Name: COLUMN franjas_aviso.turno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.franjas_aviso.turno IS 'Clave del vocabulario turno: manana, tarde, noche. Sin eñe, porque una clave con eñe se rompe en direcciones web y en nombres de columna.';


--
-- Name: mensajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensajes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    conversacion_id uuid NOT NULL,
    autor_id uuid DEFAULT auth.uid() NOT NULL,
    contenido text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT el_mensaje_no_esta_vacio CHECK ((length(btrim(contenido)) > 0))
);


--
-- Name: TABLE mensajes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mensajes IS 'Lo que se dicen las dos partes. No se edita y no se borra: un canal donde el mensaje se puede reescribir después no sirve para lo que las dos partes lo usan. El personal de la Prestadora no lo lee.';


--
-- Name: COLUMN mensajes.autor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mensajes.autor_id IS 'Quién lo escribió. Sale del valor por omisión y nunca del pedido.';


--
-- Name: ponderacion_comprobacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ponderacion_comprobacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    comprobacion text NOT NULL,
    ponderacion numeric(5,2) DEFAULT 20 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT peso_comprobacion_comprobacion_check CHECK ((comprobacion = ANY (ARRAY['domicilio'::text, 'referencia'::text, 'matricula'::text, 'titulo'::text, 'curso_aprobado'::text]))),
    CONSTRAINT peso_comprobacion_peso_check CHECK ((ponderacion >= (0)::numeric))
);


--
-- Name: TABLE ponderacion_comprobacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ponderacion_comprobacion IS 'Cuánto cuenta cada comprobación en el puntaje del legajo, por Prestadora. Las de una misma Prestadora suman 100 y la base no acepta otra cosa: es un reparto, no una lista de valores sueltos. Arranca en 20 las cinco, que es el reparto en partes iguales; eso es el valor de fábrica y no la regla. Sólo entra acá lo comprobado por alguien; lo que la persona declara y nadie miró se muestra en el perfil y no suma.';


--
-- Name: COLUMN ponderacion_comprobacion.ponderacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ponderacion_comprobacion.ponderacion IS 'Cuánto de los 100 se lleva esta comprobación. Cero quiere decir «esta no me importa», y ese cero se lo tiene que quedar otra comprobación para que el total siga dando 100. Para no calificar en absoluto está puntaje_prestadora.califica, que es otra cosa.';


--
-- Name: postulaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postulaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.prestadora_actual() NOT NULL,
    aviso_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    mensaje text,
    vista_el timestamp with time zone,
    descartada_el timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE postulaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.postulaciones IS 'Un Asistente se ofrece a un aviso. Guarda el hecho del contacto y nada del trato: sin tarifa propuesta, sin condiciones y sin aceptación, porque el trato lo cierran la Familia y el Asistente afuera del software (CLAUDE.md §1, migración 0054).';


--
-- Name: COLUMN postulaciones.mensaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.postulaciones.mensaje IS 'Lo que el Asistente escribe al ofrecerse. Lo lee la Familia del aviso, y nadie más: el personal de la Prestadora no lo ve.';


--
-- Name: COLUMN postulaciones.vista_el; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.postulaciones.vista_el IS 'Cuándo la Familia la vio. Junto con descartada_el reemplaza a una columna de estado: no hay «aceptada», porque aceptar sería guardar el trato.';


--
-- Name: puntaje_prestadora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puntaje_prestadora (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    califica boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE puntaje_prestadora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.puntaje_prestadora IS 'Una fila por Prestadora. califica en false esconde el número del legajo en todas sus pantallas; el escudo de legajo validado sigue viéndose, porque ése es la puerta de la modalidad y no es opcional.';


--
-- Name: clock_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clock_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caregiver_id uuid,
    latitude double precision,
    longitude double precision,
    event_type text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    tenant_id uuid DEFAULT public.prestadora_actual(),
    conversacion_id uuid
);


--
-- Name: TABLE clock_ins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clock_ins IS 'La fichada de entrada y salida del Asistente, con su ubicación. La marca él, y la ve él y la Familia del vínculo que haya marcado (migración 0056). El personal de la Prestadora no la ve: mirar la jornada es dirigir el trabajo, y en esta modalidad no lo hace (migración 0053).';


--
-- Name: COLUMN clock_ins.conversacion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clock_ins.conversacion_id IS 'El vínculo con la Familia para la que fue esta jornada, o vacío si el Asistente no lo dijo. Apunta a la conversación, que es el único lugar donde consta que esas dos partes se encontraron: no guarda ningún trato ni ninguna condición (migración 0056).';


--
-- Name: cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cursos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    clave text NOT NULL,
    horas integer,
    nivel text,
    modalidad text,
    otorga_certificado boolean DEFAULT false NOT NULL,
    publicado boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    nombre_i18n jsonb NOT NULL,
    descripcion_i18n jsonb,
    etiqueta jsonb,
    imagen text,
    CONSTRAINT el_nombre_del_curso_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(nombre_i18n)
    ELSE public.i18n_minimo(nombre_i18n)
END),
    CONSTRAINT la_descripcion_del_curso_esta_en_los_idiomas CHECK (((descripcion_i18n IS NULL) OR
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(descripcion_i18n)
    ELSE public.i18n_minimo(descripcion_i18n)
END)),
    CONSTRAINT la_etiqueta_del_curso_esta_en_los_idiomas CHECK (((etiqueta IS NULL) OR
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(etiqueta)
    ELSE public.i18n_minimo(etiqueta)
END))
);


--
-- Name: TABLE cursos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cursos IS 'Oferta de cursos. tenant_id nulo = oferta general de CeltaTech; cargado = curso propio de esa Prestadora. Módulo compartido: sirve igual en prestación directa.';


--
-- Name: COLUMN cursos.nombre_i18n; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cursos.nombre_i18n IS 'Como se llama el curso, en los idiomas del producto. Es el texto visible; la columna nombre queda como estaba, para lo que ya la leia.';


--
-- Name: COLUMN cursos.descripcion_i18n; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cursos.descripcion_i18n IS 'De que se trata el curso, en los idiomas del producto. Es la bajada de la tarjeta de la oferta.';


--
-- Name: COLUMN cursos.etiqueta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cursos.etiqueta IS 'El sello corto de la tarjeta, en los idiomas del producto. No es el nivel ni la modalidad, que salen de su vocabulario: es lo que la tarjeta destaca de ese curso.';


--
-- Name: COLUMN cursos.imagen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cursos.imagen IS 'Camino de la imagen de la tarjeta adentro del sitio. Relativo, nunca una direccion absoluta.';


--
-- Name: documentos_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    tipo text NOT NULL,
    archivo_url text,
    presentado_el date,
    vencimiento date,
    verificado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE documentos_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentos_asistente IS 'Documentación genérica con vencimiento. tipo referencia la clave de data/catalogo-verificaciones.json (ej. "penales", "salud").';


--
-- Name: estudios_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    institucion text NOT NULL,
    titulo_obtenido text NOT NULL,
    en_curso boolean DEFAULT false NOT NULL,
    anio_finalizacion integer,
    respalda_perfil text,
    archivo_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT anio_o_en_curso CHECK ((en_curso OR (anio_finalizacion IS NOT NULL)))
);


--
-- Name: TABLE estudios_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.estudios_asistente IS 'Ficha repetible: instituciones y títulos. El archivo es obligatorio en la aplicación cuando respalda_perfil exige Matrícula — ver data/catalogo-fichas.json.';


--
-- Name: evaluaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    curso_id uuid,
    clave text NOT NULL,
    nombre text NOT NULL,
    porcentaje_para_aprobar integer DEFAULT 70 NOT NULL,
    intentos_maximos integer,
    publicado boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT intentos_positivos CHECK (((intentos_maximos IS NULL) OR (intentos_maximos > 0))),
    CONSTRAINT porcentaje_valido CHECK (((porcentaje_para_aprobar >= 1) AND (porcentaje_para_aprobar <= 100)))
);


--
-- Name: TABLE evaluaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.evaluaciones IS 'Evaluación de una competencia. Sin columna de puntos de reputación a propósito: cuánto vale aprobarla es decisión de la modalidad, no del legajo (docs/MODULOS.md).';


--
-- Name: experiencia_laboral_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiencia_laboral_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    puesto text NOT NULL,
    puesto_otro text,
    inicio date NOT NULL,
    trabajo_actual boolean DEFAULT false NOT NULL,
    fin date,
    tareas jsonb,
    detalle text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fin_o_actual CHECK ((trabajo_actual OR (fin IS NOT NULL)))
);


--
-- Name: TABLE experiencia_laboral_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.experiencia_laboral_asistente IS 'Ficha repetible. tareas usa las mismas listas (tarea_cuidado, tarea_hogar, tarea_acompanamiento) que el Asistente contesta sobre sí mismo, a propósito: permite cruzar lo que dice saber hacer con lo que dice haber hecho.';


--
-- Name: franjas_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.franjas_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    dia text NOT NULL,
    turno text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE franjas_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.franjas_asistente IS 'Módulo compartido: Disponibilidad horaria (docs/MODULOS.md). Una fila por casillero marcado de la grilla del alta. dia y turno guardan claves de los vocabularios dia_semana y turno, nunca la etiqueta.';


--
-- Name: guias_cuidado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guias_cuidado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    vocabulario_item_id uuid NOT NULL,
    descripcion jsonb NOT NULL,
    que_esperar jsonb NOT NULL,
    senales_de_alarma jsonb NOT NULL,
    en_emergencia jsonb NOT NULL,
    publicada boolean DEFAULT false NOT NULL,
    revisada_por text,
    revisada_el date,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT el_que_esperar_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(que_esperar)
    ELSE public.i18n_minimo(que_esperar)
END),
    CONSTRAINT la_descripcion_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(descripcion)
    ELSE public.i18n_minimo(descripcion)
END),
    CONSTRAINT la_emergencia_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_lista_completa(en_emergencia)
    ELSE public.i18n_lista_minima(en_emergencia)
END),
    CONSTRAINT la_publicada_dice_quien_la_reviso CHECK (((publicada = false) OR ((revisada_por IS NOT NULL) AND (length(btrim(revisada_por)) > 0) AND (revisada_el IS NOT NULL)))),
    CONSTRAINT las_senales_estan_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_lista_completa(senales_de_alarma)
    ELSE public.i18n_lista_minima(senales_de_alarma)
END)
);


--
-- Name: TABLE guias_cuidado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.guias_cuidado IS 'Lo que el Asistente necesita saber sobre una opcion del catalogo: que es, que esperar, que mirar y como actuar en una emergencia. No guarda tratamientos, a proposito: el producto avisa, no prescribe. Cuelga de vocabulario_items, asi que sirve igual para patologias, discapacidades y tareas de cuidado.';


--
-- Name: COLUMN guias_cuidado.tenant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.tenant_id IS 'Nulo es la guia que trae el producto. Cargado es la que escribio esa Prestadora, que reemplaza a la general para ella.';


--
-- Name: COLUMN guias_cuidado.senales_de_alarma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.senales_de_alarma IS 'Que mirar y que obliga a avisar. Lista por idioma, no parrafo: se lee de un vistazo.';


--
-- Name: COLUMN guias_cuidado.en_emergencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.en_emergencia IS 'Como actuar, en pasos y en el orden en que se hacen. Lista por idioma; el orden del arreglo es dato.';


--
-- Name: COLUMN guias_cuidado.publicada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.publicada IS 'Falso mientras el texto no lo reviso un profesional. La puerta no devuelve las que no estan publicadas.';


--
-- Name: COLUMN guias_cuidado.revisada_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.revisada_por IS 'Quien firmo el contenido. Obligatorio para publicar.';


--
-- Name: COLUMN guias_cuidado.revisada_el; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guias_cuidado.revisada_el IS 'El día que se revisó el texto, tal como lo declaró quien lo revisó. Es una fecha y no un instante: no se convierte a ningún huso horario.';


--
-- Name: matriculas_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriculas_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    organismo text NOT NULL,
    numero text NOT NULL,
    vencimiento date NOT NULL,
    archivo_url text,
    verificada boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE matriculas_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.matriculas_asistente IS 'Ficha repetible: un Asistente puede tener más de una Matrícula. Ver data/catalogo-fichas.json.';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    content text NOT NULL,
    author_id uuid,
    aviso_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.prestadora_actual()
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Mensajes colgados de un aviso. Los ve quien los escribió y la Familia que publicó ese aviso; el personal de la Prestadora no, porque la comunicación entre la Familia y el Asistente es la herramienta de ellos y no de ella (migración 0067). Hoy la tabla está vacía y sólo la llama la maqueta: la conversación de verdad vive en mensajes desde la migración 0063. Su destino se decide en el pendiente 139.';


--
-- Name: oferta_comercial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oferta_comercial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    clave text NOT NULL,
    nombre_i18n jsonb NOT NULL,
    descripcion_i18n jsonb NOT NULL,
    estado text DEFAULT 'publicado'::text NOT NULL,
    imagen text,
    enlace text,
    ancla text,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT el_estado_de_la_oferta_es_valido CHECK ((estado = ANY (ARRAY['publicado'::text, 'proximamente'::text]))),
    CONSTRAINT el_nombre_de_la_oferta_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(nombre_i18n)
    ELSE public.i18n_minimo(nombre_i18n)
END),
    CONSTRAINT la_descripcion_de_la_oferta_esta_en_los_idiomas CHECK (
CASE
    WHEN (tenant_id IS NULL) THEN public.i18n_completo(descripcion_i18n)
    ELSE public.i18n_minimo(descripcion_i18n)
END)
);


--
-- Name: TABLE oferta_comercial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.oferta_comercial IS 'La oferta comercial de la portada (antes sólo en data/catalogo-oferta.json). tenant_id nulo = oferta general de CeltaTech. No es "Servicio" del glosario compartido: no hay Guardias ni prestación directa acá.';


--
-- Name: oferta_comercial_publica; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.oferta_comercial_publica AS
 SELECT clave,
    (nombre_i18n ->> 'es-AR'::text) AS "es-AR",
    (nombre_i18n ->> 'en'::text) AS en,
    (nombre_i18n ->> 'pt-BR'::text) AS "pt-BR",
    descripcion_i18n AS descripcion,
    estado,
    imagen,
    enlace,
    ancla,
    orden
   FROM public.oferta_comercial o
  WHERE ((tenant_id IS NULL) AND activo);


--
-- Name: VIEW oferta_comercial_publica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.oferta_comercial_publica IS 'La oferta comercial de la portada, la que se ve sin iniciar sesión. Misma condición que oferta_de_cursos: catálogo general (tenant_id is null) y activa. Nunca agregar acá una columna que diga de qué Prestadora es la fila.';


--
-- Name: oferta_de_cursos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.oferta_de_cursos AS
 SELECT clave,
    (nombre_i18n ->> 'es-AR'::text) AS "es-AR",
    (nombre_i18n ->> 'en'::text) AS en,
    (nombre_i18n ->> 'pt-BR'::text) AS "pt-BR",
    descripcion_i18n AS descripcion,
    etiqueta,
    horas,
    nivel,
    modalidad,
    otorga_certificado AS certificado,
    imagen,
    orden
   FROM public.cursos c
  WHERE ((tenant_id IS NULL) AND publicado);


--
-- Name: VIEW oferta_de_cursos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.oferta_de_cursos IS 'La oferta general de cursos del producto, la que se ve sin iniciar sesion. Dos condiciones, y las dos hacen falta: la fila es del catalogo general (tenant_id is null) y esta publicada. Nunca agregar aca una columna con el contenido del curso —lo que se estudia, sus evaluaciones, sus preguntas ni sus opciones—, ni una que diga de que Prestadora es la fila. El Desarrollador decidio el 31 de agosto de 2026 que la oferta de cursos se ve sin sesion, asi que todo lo que se agregue aca queda a la vista de cualquiera.';


--
-- Name: opciones_pregunta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opciones_pregunta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    pregunta_id uuid NOT NULL,
    clave text NOT NULL,
    texto text NOT NULL,
    es_correcta boolean DEFAULT false NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE opciones_pregunta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.opciones_pregunta IS 'Opciones de una pregunta. es_correcta no se lee desde la aplicación: se consulta sólo adentro de rendir_evaluacion(). Nunca dar select sobre esta tabla.';


--
-- Name: opciones_para_responder; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opciones_para_responder AS
 SELECT id,
    pregunta_id,
    clave,
    texto,
    orden
   FROM public.opciones_pregunta o
  WHERE ((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual()));


--
-- Name: VIEW opciones_para_responder; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.opciones_para_responder IS 'Las opciones tal como las ve quien rinde: sin es_correcta. Nunca agregar esa columna acá.';


--
-- Name: patrones_de_contacto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patrones_de_contacto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave text NOT NULL,
    patron text NOT NULL,
    banderas text DEFAULT ''::text NOT NULL,
    motivo jsonb NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT el_motivo_esta_en_los_tres_idiomas CHECK (public.i18n_completo(motivo)),
    CONSTRAINT el_patron_compila_en_postgres CHECK ((length(regexp_replace(''::text, public.patron_en_postgres(patron), ''::text)) = 0)),
    CONSTRAINT el_patron_lo_entienden_los_dos_lados CHECK (((patron !~ '\\[B1-9]'::text) AND (patron !~ '\(\?[=!<]'::text))),
    CONSTRAINT las_banderas_son_conocidas CHECK ((banderas ~ '^[gi]*$'::text))
);


--
-- Name: TABLE patrones_de_contacto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patrones_de_contacto IS 'Las reglas de la tercera puerta: qué cuenta como un teléfono, un correo o un domicilio adentro del chat. Es el original; data/patrones-contacto.json se genera desde acá con scripts/generar_patrones_contacto.mjs.';


--
-- Name: COLUMN patrones_de_contacto.patron; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patrones_de_contacto.patron IS 'La expresión tal como la escribe el navegador. La base la traduce al leerla con public.patron_en_postgres.';


--
-- Name: COLUMN patrones_de_contacto.motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patrones_de_contacto.motivo IS 'Por qué quedó bloqueado, en los tres idiomas. Lo muestra la pantalla; la base nunca lo devuelve, porque un mensaje de error del servidor no lleva texto visible.';


--
-- Name: COLUMN patrones_de_contacto.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patrones_de_contacto.activo IS 'Apagar una regla es de la empresa, no de una Prestadora: por eso esta tabla no tiene columna de Organización.';


--
-- Name: preguntas_evaluacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preguntas_evaluacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    evaluacion_id uuid NOT NULL,
    clave text NOT NULL,
    enunciado text NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE preguntas_evaluacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.preguntas_evaluacion IS 'Enunciados de una evaluación. El enunciado sí viaja al navegador; la respuesta correcta no (ver opciones_pregunta).';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    tenant_id uuid,
    full_name text,
    role text DEFAULT 'familiar'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referencias_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referencias_asistente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    nombre text NOT NULL,
    telefono text NOT NULL,
    relacion text NOT NULL,
    comentarios text,
    contactada boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: TABLE referencias_asistente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referencias_asistente IS 'Datos de un tercero. No se expone jamás vía directorio ni ninguna otra vista pública.';


--
-- Name: reportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reportes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aviso_id uuid,
    caregiver_id uuid,
    blood_pressure text,
    glycemia text,
    medications_administered jsonb,
    daily_notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    tenant_id uuid DEFAULT public.prestadora_actual()
);


--
-- Name: TABLE reportes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reportes IS 'El reporte de cuidado. Lo escribe el Asistente que cuidó y lo lee la Familia de ese aviso. El personal de la Prestadora no lo ve: en la modalidad de este producto la Prestadora no dirige el trabajo (migración 0053). La condición del aviso se repite adentro de la subconsulta a propósito: la RLS de avisos no alcanza para filtrarla, porque a ese personal le devuelve todos los avisos de la Organización (migración 0067).';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    primary_color text DEFAULT '#1A365D'::text,
    accent_color text DEFAULT '#E53E3E'::text,
    logo_url text,
    status text DEFAULT 'activo'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    estado_fijado_en timestamp with time zone,
    referencia_celtatech text,
    moneda text DEFAULT 'ARS'::text NOT NULL,
    CONSTRAINT la_moneda_es_un_codigo_iso CHECK ((moneda ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['activo'::text, 'suspendido'::text, 'cancelado'::text])))
);


--
-- Name: COLUMN tenants.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.status IS 'En qué situación está la Prestadora frente a quien le vendió el software. activo, suspendido o cancelado, y nada más (0023). Quién lo escribe es CeltaTech, a través de la función de borde `alta-y-baja`; adentro del producto sólo lo leen las tres funciones públicas de la 0021, que exigen `activo`.';


--
-- Name: COLUMN tenants.estado_fijado_en; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.estado_fijado_en IS 'Cuándo se emitió la orden que dejó `status` como está. No es cuándo se aplicó: es la fecha que trae el aviso de CeltaTech. Sirve para una sola cosa, y es descartar lo repetido y lo atrasado (0023).';


--
-- Name: COLUMN tenants.referencia_celtatech; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.referencia_celtatech IS 'Con qué nombre conoce CeltaTech a esta Prestadora. Texto opaco: se guarda tal cual llega y no se interpreta nunca (0025). Es lo único por lo que el alta y las correcciones la reconocen. Nulo en las Prestadoras ficticias, que no vienen de ningún contrato.';


--
-- Name: COLUMN tenants.moneda; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.moneda IS 'Con qué moneda trabaja esta Prestadora, en código ISO 4217 y en mayúsculas. La elige ella desde su panel; de fábrica es ARS, que es lo que la pantalla ya venía mostrando sin decirlo. Las opciones salen del vocabulario `moneda`, que es abierto: la Prestadora que necesite otra se la agrega (0074).';


--
-- Name: autorizaciones_asistente autorizaciones_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_asistente
    ADD CONSTRAINT autorizaciones_asistente_pkey PRIMARY KEY (caregiver_id);


--
-- Name: avisos aviso_unico_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT aviso_unico_por_prestadora UNIQUE (id, tenant_id);


--
-- Name: alarmas_prestadora alarmas_prestadora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarmas_prestadora
    ADD CONSTRAINT alarmas_prestadora_pkey PRIMARY KEY (id);


--
-- Name: alarmas_prestadora alarmas_prestadora_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarmas_prestadora
    ADD CONSTRAINT alarmas_prestadora_tenant_id_key UNIQUE (tenant_id);


--
-- Name: avisos avisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_pkey PRIMARY KEY (id);


--
-- Name: franjas_aviso franjas_aviso_aviso_id_dia_turno_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_aviso
    ADD CONSTRAINT franjas_aviso_aviso_id_dia_turno_key UNIQUE (aviso_id, dia, turno);


--
-- Name: franjas_aviso franjas_aviso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_aviso
    ADD CONSTRAINT franjas_aviso_pkey PRIMARY KEY (id);


--
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- Name: ponderacion_comprobacion peso_comprobacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ponderacion_comprobacion
    ADD CONSTRAINT peso_comprobacion_pkey PRIMARY KEY (id);


--
-- Name: ponderacion_comprobacion peso_comprobacion_tenant_id_comprobacion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ponderacion_comprobacion
    ADD CONSTRAINT peso_comprobacion_tenant_id_comprobacion_key UNIQUE (tenant_id, comprobacion);


--
-- Name: postulaciones postulaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT postulaciones_pkey PRIMARY KEY (id);


--
-- Name: puntaje_prestadora puntaje_prestadora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puntaje_prestadora
    ADD CONSTRAINT puntaje_prestadora_pkey PRIMARY KEY (id);


--
-- Name: puntaje_prestadora puntaje_prestadora_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puntaje_prestadora
    ADD CONSTRAINT puntaje_prestadora_tenant_id_key UNIQUE (tenant_id);


--
-- Name: caregivers caregivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_pkey PRIMARY KEY (id);


--
-- Name: zonas_cobertura clave_unica_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_cobertura
    ADD CONSTRAINT clave_unica_por_prestadora UNIQUE (tenant_id, clave);


--
-- Name: clock_ins clock_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_ins
    ADD CONSTRAINT clock_ins_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversacion_unica_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversacion_unica_por_prestadora UNIQUE (id, tenant_id);


--
-- Name: cursos cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_pkey PRIMARY KEY (id);


--
-- Name: disponibilidad_asistente disponibilidad_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidad_asistente
    ADD CONSTRAINT disponibilidad_asistente_pkey PRIMARY KEY (caregiver_id);


--
-- Name: documentos_asistente documentos_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_asistente
    ADD CONSTRAINT documentos_asistente_pkey PRIMARY KEY (id);


--
-- Name: estudios_asistente estudios_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_asistente
    ADD CONSTRAINT estudios_asistente_pkey PRIMARY KEY (id);


--
-- Name: evaluaciones evaluaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_pkey PRIMARY KEY (id);


--
-- Name: experiencia_laboral_asistente experiencia_laboral_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiencia_laboral_asistente
    ADD CONSTRAINT experiencia_laboral_asistente_pkey PRIMARY KEY (id);


--
-- Name: franjas_asistente franjas_asistente_caregiver_id_dia_turno_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_asistente
    ADD CONSTRAINT franjas_asistente_caregiver_id_dia_turno_key UNIQUE (caregiver_id, dia, turno);


--
-- Name: franjas_asistente franjas_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_asistente
    ADD CONSTRAINT franjas_asistente_pkey PRIMARY KEY (id);


--
-- Name: guias_cuidado guias_cuidado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guias_cuidado
    ADD CONSTRAINT guias_cuidado_pkey PRIMARY KEY (id);


--
-- Name: intentos_evaluacion intentos_evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_pkey PRIMARY KEY (id);


--
-- Name: caregivers legajo_unico_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT legajo_unico_por_prestadora UNIQUE (id, tenant_id);


--
-- Name: matriculas_asistente matriculas_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas_asistente
    ADD CONSTRAINT matriculas_asistente_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: oferta_comercial oferta_comercial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oferta_comercial
    ADD CONSTRAINT oferta_comercial_pkey PRIMARY KEY (id);


--
-- Name: opciones_pregunta opciones_pregunta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_pregunta
    ADD CONSTRAINT opciones_pregunta_pkey PRIMARY KEY (id);


--
-- Name: patrones_de_contacto patrones_de_contacto_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrones_de_contacto
    ADD CONSTRAINT patrones_de_contacto_clave_key UNIQUE (clave);


--
-- Name: patrones_de_contacto patrones_de_contacto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrones_de_contacto
    ADD CONSTRAINT patrones_de_contacto_pkey PRIMARY KEY (id);


--
-- Name: preguntas_evaluacion preguntas_evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas_evaluacion
    ADD CONSTRAINT preguntas_evaluacion_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referencias_asistente referencias_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referencias_asistente
    ADD CONSTRAINT referencias_asistente_pkey PRIMARY KEY (id);


--
-- Name: reportes reportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_pkey PRIMARY KEY (id);


--
-- Name: resoluciones_legajo resoluciones_legajo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_legajo
    ADD CONSTRAINT resoluciones_legajo_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: vocabulario_items un_item_una_vez_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulario_items
    ADD CONSTRAINT un_item_una_vez_por_prestadora UNIQUE (vocabulario_id, tenant_id, clave);


--
-- Name: vocabularios un_vocabulario_una_vez_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabularios
    ADD CONSTRAINT un_vocabulario_una_vez_por_prestadora UNIQUE (tenant_id, clave);


--
-- Name: conversaciones una_conversacion_por_par; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT una_conversacion_por_par UNIQUE (tenant_id, familia_id, caregiver_id);


--
-- Name: guias_cuidado una_guia_por_item_y_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guias_cuidado
    ADD CONSTRAINT una_guia_por_item_y_prestadora UNIQUE (vocabulario_item_id, tenant_id);


--
-- Name: postulaciones una_postulacion_por_aviso; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT una_postulacion_por_aviso UNIQUE (aviso_id, caregiver_id);


--
-- Name: zonas_asistente una_zona_una_vez_por_asistente; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_asistente
    ADD CONSTRAINT una_zona_una_vez_por_asistente UNIQUE (caregiver_id, zona_id);


--
-- Name: verificaciones_asistente verificaciones_asistente_caregiver_id_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_caregiver_id_tipo_key UNIQUE (caregiver_id, tipo);


--
-- Name: verificaciones_asistente verificaciones_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_pkey PRIMARY KEY (id);


--
-- Name: vocabulario_items vocabulario_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulario_items
    ADD CONSTRAINT vocabulario_items_pkey PRIMARY KEY (id);


--
-- Name: vocabularios vocabularios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabularios
    ADD CONSTRAINT vocabularios_pkey PRIMARY KEY (id);


--
-- Name: zonas_cobertura zona_unica_por_prestadora; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_cobertura
    ADD CONSTRAINT zona_unica_por_prestadora UNIQUE (id, tenant_id);


--
-- Name: zonas_asistente zonas_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_asistente
    ADD CONSTRAINT zonas_asistente_pkey PRIMARY KEY (id);


--
-- Name: zonas_cobertura zonas_cobertura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_cobertura
    ADD CONSTRAINT zonas_cobertura_pkey PRIMARY KEY (id);


--
-- Name: clock_ins_conversacion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clock_ins_conversacion_idx ON public.clock_ins USING btree (conversacion_id, created_at DESC);


--
-- Name: idx_avisos_familia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avisos_familia ON public.avisos USING btree (familia_id) WHERE (familia_id IS NOT NULL);


--
-- Name: idx_avisos_zona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avisos_zona ON public.avisos USING btree (tenant_id, zone);


--
-- Name: idx_franjas_aviso_aviso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_franjas_aviso_aviso ON public.franjas_aviso USING btree (aviso_id);


--
-- Name: idx_franjas_aviso_dia_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_franjas_aviso_dia_turno ON public.franjas_aviso USING btree (dia, turno);


--
-- Name: idx_ponderacion_comprobacion_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ponderacion_comprobacion_tenant ON public.ponderacion_comprobacion USING btree (tenant_id);


--
-- Name: idx_caregivers_user_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_caregivers_user_unico ON public.caregivers USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: INDEX idx_caregivers_user_unico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_caregivers_user_unico IS 'Una cuenta, un legajo. ATENCIÓN: de este índice depende además el aislamiento entre Prestadoras del depósito de archivos. El camino del depósito empieza por la cuenta y no por la Organización, así que la política «Documentos del legajo, para la Prestadora» (migración 0006) llega a la carpeta por el legajo: si una cuenta llegara a tener legajo en dos Prestadoras, las dos verían la carpeta entera. Antes de sacarlo hay que mover el camino a <Organización>/<cuenta>/, reescribir las tres políticas del depósito contra public.prestadora_actual() y mudar los archivos ya subidos. Está anotado en el pendiente 115.';


--
-- Name: idx_conversaciones_legajo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversaciones_legajo ON public.conversaciones USING btree (caregiver_id);


--
-- Name: idx_cursos_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cursos_clave ON public.cursos USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);


--
-- Name: idx_documentos_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_caregiver ON public.documentos_asistente USING btree (caregiver_id);


--
-- Name: idx_documentos_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_vencimiento ON public.documentos_asistente USING btree (vencimiento) WHERE (vencimiento IS NOT NULL);


--
-- Name: idx_estudios_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudios_caregiver ON public.estudios_asistente USING btree (caregiver_id);


--
-- Name: idx_evaluaciones_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_evaluaciones_clave ON public.evaluaciones USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);


--
-- Name: idx_experiencia_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_experiencia_caregiver ON public.experiencia_laboral_asistente USING btree (caregiver_id);


--
-- Name: idx_franjas_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_franjas_caregiver ON public.franjas_asistente USING btree (caregiver_id);


--
-- Name: idx_franjas_dia_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_franjas_dia_turno ON public.franjas_asistente USING btree (dia, turno);


--
-- Name: idx_guia_general_unica; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_guia_general_unica ON public.guias_cuidado USING btree (vocabulario_item_id) WHERE (tenant_id IS NULL);


--
-- Name: idx_guias_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guias_item ON public.guias_cuidado USING btree (vocabulario_item_id);


--
-- Name: idx_guias_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guias_tenant ON public.guias_cuidado USING btree (tenant_id);


--
-- Name: idx_intentos_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intentos_caregiver ON public.intentos_evaluacion USING btree (caregiver_id);


--
-- Name: idx_intentos_evaluacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intentos_evaluacion ON public.intentos_evaluacion USING btree (evaluacion_id);


--
-- Name: idx_item_general_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_item_general_unico ON public.vocabulario_items USING btree (vocabulario_id, clave) WHERE (tenant_id IS NULL);


--
-- Name: idx_items_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_tenant ON public.vocabulario_items USING btree (tenant_id);


--
-- Name: idx_items_vocabulario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_vocabulario ON public.vocabulario_items USING btree (vocabulario_id);


--
-- Name: idx_matriculas_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriculas_caregiver ON public.matriculas_asistente USING btree (caregiver_id);


--
-- Name: idx_mensajes_conversacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mensajes_conversacion ON public.mensajes USING btree (conversacion_id, created_at);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at DESC);


--
-- Name: idx_oferta_comercial_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_oferta_comercial_clave ON public.oferta_comercial USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), clave);


--
-- Name: idx_opciones_pregunta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opciones_pregunta ON public.opciones_pregunta USING btree (pregunta_id);


--
-- Name: idx_postulaciones_aviso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postulaciones_aviso ON public.postulaciones USING btree (aviso_id);


--
-- Name: idx_postulaciones_legajo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postulaciones_legajo ON public.postulaciones USING btree (caregiver_id);


--
-- Name: idx_preguntas_evaluacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preguntas_evaluacion ON public.preguntas_evaluacion USING btree (evaluacion_id);


--
-- Name: idx_referencias_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referencias_caregiver ON public.referencias_asistente USING btree (caregiver_id);


--
-- Name: idx_verificaciones_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verificaciones_caregiver ON public.verificaciones_asistente USING btree (caregiver_id);


--
-- Name: idx_verificaciones_plazo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verificaciones_plazo ON public.verificaciones_asistente USING btree (plazo_vence_el) WHERE (plazo_vence_el IS NOT NULL);


--
-- Name: idx_vocabulario_general_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vocabulario_general_unico ON public.vocabularios USING btree (clave) WHERE (tenant_id IS NULL);


--
-- Name: idx_vocabularios_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vocabularios_tenant ON public.vocabularios USING btree (tenant_id);


--
-- Name: idx_zonas_asistente_caregiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zonas_asistente_caregiver ON public.zonas_asistente USING btree (caregiver_id);


--
-- Name: idx_zonas_asistente_zona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zonas_asistente_zona ON public.zonas_asistente USING btree (zona_id);


--
-- Name: idx_zonas_cobertura_padre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zonas_cobertura_padre ON public.zonas_cobertura USING btree (zona_padre_id);


--
-- Name: idx_zonas_cobertura_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zonas_cobertura_tenant ON public.zonas_cobertura USING btree (tenant_id);


--
-- Name: resoluciones_legajo_por_legajo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resoluciones_legajo_por_legajo ON public.resoluciones_legajo USING btree (caregiver_id, created_at DESC);


--
-- Name: tenants_referencia_celtatech_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_referencia_celtatech_key ON public.tenants USING btree (referencia_celtatech) WHERE (referencia_celtatech IS NOT NULL);


--
-- Name: caregivers el_legajo_no_completa_el_alta_sin_sus_papeles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER el_legajo_no_completa_el_alta_sin_sus_papeles BEFORE INSERT ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.el_legajo_no_completa_el_alta_sin_sus_papeles();


--
-- Name: caregivers el_legajo_no_se_sella_solo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER el_legajo_no_se_sella_solo BEFORE INSERT OR UPDATE ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.el_legajo_no_se_sella_solo();


--
-- Name: mensajes el_mensaje_no_lleva_datos_de_contacto; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER el_mensaje_no_lleva_datos_de_contacto BEFORE INSERT ON public.mensajes FOR EACH ROW EXECUTE FUNCTION public.el_mensaje_no_lleva_datos_de_contacto();


--
-- Name: profiles el_rol_y_la_prestadora_no_se_escriben_solos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER el_rol_y_la_prestadora_no_se_escriben_solos BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos();


--
-- Name: caregivers el_valor_hora_nace_con_su_moneda; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER el_valor_hora_nace_con_su_moneda BEFORE INSERT OR UPDATE ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.el_valor_hora_nace_con_su_moneda();


--
-- Name: guias_cuidado guias_no_cruzan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guias_no_cruzan BEFORE INSERT OR UPDATE ON public.guias_cuidado FOR EACH ROW EXECUTE FUNCTION public.la_guia_no_cruza_prestadoras();


--
-- Name: caregivers la_fecha_de_alta_del_legajo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER la_fecha_de_alta_del_legajo BEFORE INSERT OR UPDATE ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.la_fecha_de_alta_la_pone_la_base();


--
-- Name: ponderacion_comprobacion la_ponderacion_suma_cien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER la_ponderacion_suma_cien AFTER INSERT OR DELETE OR UPDATE ON public.ponderacion_comprobacion DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.la_ponderacion_suma_cien();


--
-- Name: tenants la_prestadora_nace_configurada; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER la_prestadora_nace_configurada AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.la_prestadora_nace_configurada();


--
-- Name: resoluciones_legajo la_resolucion_dice_quien_la_firmo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER la_resolucion_dice_quien_la_firmo BEFORE INSERT ON public.resoluciones_legajo FOR EACH ROW EXECUTE FUNCTION public.la_resolucion_dice_quien_la_firmo();


--
-- Name: verificaciones_asistente la_verificacion_dice_quien_la_marco; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER la_verificacion_dice_quien_la_marco BEFORE INSERT OR UPDATE ON public.verificaciones_asistente FOR EACH ROW EXECUTE FUNCTION public.la_verificacion_dice_quien_la_marco();


--
-- Name: vocabulario_items vocabulario_items_no_cruzan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vocabulario_items_no_cruzan BEFORE INSERT OR UPDATE ON public.vocabulario_items FOR EACH ROW EXECUTE FUNCTION public.el_vocabulario_no_cruza_prestadoras();


--
-- Name: vocabularios vocabularios_no_pisan_al_general; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vocabularios_no_pisan_al_general BEFORE INSERT OR UPDATE ON public.vocabularios FOR EACH ROW EXECUTE FUNCTION public.el_vocabulario_propio_no_pisa_al_general();


--
-- Name: zonas_cobertura zonas_cobertura_dos_escalones; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zonas_cobertura_dos_escalones BEFORE INSERT OR UPDATE ON public.zonas_cobertura FOR EACH ROW EXECUTE FUNCTION public.la_zona_cuelga_de_una_region();


--
-- Name: autorizaciones_asistente autorizaciones_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_asistente
    ADD CONSTRAINT autorizaciones_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: autorizaciones_asistente autorizaciones_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizaciones_asistente
    ADD CONSTRAINT autorizaciones_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: alarmas_prestadora alarmas_prestadora_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarmas_prestadora
    ADD CONSTRAINT alarmas_prestadora_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: avisos avisos_familia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: avisos avisos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: conversaciones conversaciones_familia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: franjas_aviso franjas_aviso_aviso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_aviso
    ADD CONSTRAINT franjas_aviso_aviso_id_fkey FOREIGN KEY (aviso_id) REFERENCES public.avisos(id) ON DELETE CASCADE;


--
-- Name: franjas_aviso franjas_aviso_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_aviso
    ADD CONSTRAINT franjas_aviso_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mensajes mensajes_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mensajes mensajes_conversacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id) ON DELETE CASCADE;


--
-- Name: ponderacion_comprobacion peso_comprobacion_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ponderacion_comprobacion
    ADD CONSTRAINT peso_comprobacion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: puntaje_prestadora puntaje_prestadora_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puntaje_prestadora
    ADD CONSTRAINT puntaje_prestadora_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: caregivers caregivers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: caregivers caregivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: clock_ins clock_ins_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_ins
    ADD CONSTRAINT clock_ins_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: cursos cursos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: disponibilidad_asistente disponibilidad_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidad_asistente
    ADD CONSTRAINT disponibilidad_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: disponibilidad_asistente disponibilidad_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidad_asistente
    ADD CONSTRAINT disponibilidad_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: documentos_asistente documentos_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_asistente
    ADD CONSTRAINT documentos_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: documentos_asistente documentos_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_asistente
    ADD CONSTRAINT documentos_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: zonas_cobertura el_padre_es_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_cobertura
    ADD CONSTRAINT el_padre_es_de_la_misma_prestadora FOREIGN KEY (zona_padre_id, tenant_id) REFERENCES public.zonas_cobertura(id, tenant_id) ON DELETE CASCADE;


--
-- Name: estudios_asistente estudios_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_asistente
    ADD CONSTRAINT estudios_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: estudios_asistente estudios_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios_asistente
    ADD CONSTRAINT estudios_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: evaluaciones evaluaciones_curso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE SET NULL;


--
-- Name: evaluaciones evaluaciones_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: experiencia_laboral_asistente experiencia_laboral_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiencia_laboral_asistente
    ADD CONSTRAINT experiencia_laboral_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: experiencia_laboral_asistente experiencia_laboral_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiencia_laboral_asistente
    ADD CONSTRAINT experiencia_laboral_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: franjas_asistente franjas_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_asistente
    ADD CONSTRAINT franjas_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: franjas_asistente franjas_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_asistente
    ADD CONSTRAINT franjas_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: guias_cuidado guias_cuidado_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guias_cuidado
    ADD CONSTRAINT guias_cuidado_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: guias_cuidado guias_cuidado_vocabulario_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guias_cuidado
    ADD CONSTRAINT guias_cuidado_vocabulario_item_id_fkey FOREIGN KEY (vocabulario_item_id) REFERENCES public.vocabulario_items(id) ON DELETE CASCADE;


--
-- Name: intentos_evaluacion intentos_evaluacion_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: intentos_evaluacion intentos_evaluacion_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;


--
-- Name: intentos_evaluacion intentos_evaluacion_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: conversaciones la_conversacion_es_con_un_legajo_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT la_conversacion_es_con_un_legajo_de_la_misma_prestadora FOREIGN KEY (caregiver_id, tenant_id) REFERENCES public.caregivers(id, tenant_id) ON DELETE CASCADE;


--
-- Name: conversaciones la_conversacion_sale_de_un_aviso_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT la_conversacion_sale_de_un_aviso_de_la_misma_prestadora FOREIGN KEY (aviso_id, tenant_id) REFERENCES public.avisos(id, tenant_id) ON DELETE SET NULL;


--
-- Name: clock_ins la_fichada_es_de_un_vinculo_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_ins
    ADD CONSTRAINT la_fichada_es_de_un_vinculo_de_la_misma_prestadora FOREIGN KEY (conversacion_id, tenant_id) REFERENCES public.conversaciones(id, tenant_id) ON DELETE SET NULL;


--
-- Name: postulaciones la_postulacion_es_de_un_legajo_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT la_postulacion_es_de_un_legajo_de_la_misma_prestadora FOREIGN KEY (caregiver_id, tenant_id) REFERENCES public.caregivers(id, tenant_id) ON DELETE CASCADE;


--
-- Name: postulaciones la_postulacion_va_a_un_aviso_de_la_misma_prestadora; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT la_postulacion_va_a_un_aviso_de_la_misma_prestadora FOREIGN KEY (aviso_id, tenant_id) REFERENCES public.avisos(id, tenant_id) ON DELETE CASCADE;


--
-- Name: matriculas_asistente matriculas_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas_asistente
    ADD CONSTRAINT matriculas_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: matriculas_asistente matriculas_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas_asistente
    ADD CONSTRAINT matriculas_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: messages messages_aviso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_aviso_id_fkey FOREIGN KEY (aviso_id) REFERENCES public.avisos(id) ON DELETE SET NULL;


--
-- Name: oferta_comercial oferta_comercial_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oferta_comercial
    ADD CONSTRAINT oferta_comercial_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: opciones_pregunta opciones_pregunta_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_pregunta
    ADD CONSTRAINT opciones_pregunta_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.preguntas_evaluacion(id) ON DELETE CASCADE;


--
-- Name: opciones_pregunta opciones_pregunta_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_pregunta
    ADD CONSTRAINT opciones_pregunta_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: preguntas_evaluacion preguntas_evaluacion_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas_evaluacion
    ADD CONSTRAINT preguntas_evaluacion_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;


--
-- Name: preguntas_evaluacion preguntas_evaluacion_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas_evaluacion
    ADD CONSTRAINT preguntas_evaluacion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: referencias_asistente referencias_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referencias_asistente
    ADD CONSTRAINT referencias_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: referencias_asistente referencias_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referencias_asistente
    ADD CONSTRAINT referencias_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reportes reportes_aviso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_aviso_id_fkey FOREIGN KEY (aviso_id) REFERENCES public.avisos(id) ON DELETE CASCADE;


--
-- Name: reportes reportes_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: resoluciones_legajo resoluciones_legajo_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_legajo
    ADD CONSTRAINT resoluciones_legajo_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: resoluciones_legajo resoluciones_legajo_resuelto_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_legajo
    ADD CONSTRAINT resoluciones_legajo_resuelto_por_fkey FOREIGN KEY (resuelto_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: resoluciones_legajo resoluciones_legajo_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_legajo
    ADD CONSTRAINT resoluciones_legajo_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: verificaciones_asistente verificaciones_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: verificaciones_asistente verificaciones_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: verificaciones_asistente verificaciones_asistente_verificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_verificado_por_fkey FOREIGN KEY (verificado_por) REFERENCES public.profiles(id);


--
-- Name: vocabulario_items vocabulario_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulario_items
    ADD CONSTRAINT vocabulario_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vocabulario_items vocabulario_items_vocabulario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulario_items
    ADD CONSTRAINT vocabulario_items_vocabulario_id_fkey FOREIGN KEY (vocabulario_id) REFERENCES public.vocabularios(id) ON DELETE CASCADE;


--
-- Name: vocabularios vocabularios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabularios
    ADD CONSTRAINT vocabularios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: zonas_asistente zonas_asistente_caregiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_asistente
    ADD CONSTRAINT zonas_asistente_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES public.caregivers(id) ON DELETE CASCADE;


--
-- Name: zonas_asistente zonas_asistente_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_asistente
    ADD CONSTRAINT zonas_asistente_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: zonas_asistente zonas_asistente_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_asistente
    ADD CONSTRAINT zonas_asistente_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_cobertura(id) ON DELETE CASCADE;


--
-- Name: zonas_cobertura zonas_cobertura_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_cobertura
    ADD CONSTRAINT zonas_cobertura_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: avisos Avisos de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Avisos de la Prestadora" ON public.avisos TO authenticated USING (((tenant_id = public.prestadora_actual()) AND ((familia_id = auth.uid()) OR public.es_personal_de_prestadora()))) WITH CHECK (((tenant_id = public.prestadora_actual()) AND ((familia_id = auth.uid()) OR public.es_personal_de_prestadora())));


--
-- Name: cursos Cursos generales y de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cursos generales y de la Prestadora" ON public.cursos FOR SELECT TO authenticated USING (((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual())));


--
-- Name: mensajes El mensaje lo escribe una de las dos partes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "El mensaje lo escribe una de las dos partes" ON public.mensajes FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.prestadora_actual()) AND (autor_id = auth.uid()) AND public.conversacion_propia(conversacion_id)));


--
-- Name: mensajes El mensaje lo leen las dos partes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "El mensaje lo leen las dos partes" ON public.mensajes FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.conversacion_propia(conversacion_id)));


--
-- Name: evaluaciones Evaluaciones generales y de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Evaluaciones generales y de la Prestadora" ON public.evaluaciones FOR SELECT TO authenticated USING ((publicado AND ((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual()))));


--
-- Name: clock_ins Fichadas del Asistente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Fichadas del Asistente" ON public.clock_ins TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio()))) WITH CHECK (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio()) AND ((conversacion_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.conversaciones c
  WHERE ((c.id = clock_ins.conversacion_id) AND (c.tenant_id = public.prestadora_actual()) AND (c.caregiver_id = public.legajo_propio())))))));


--
-- Name: clock_ins Fichadas del vínculo, para la Familia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Fichadas del vínculo, para la Familia" ON public.clock_ins FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (conversacion_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.conversaciones c
  WHERE ((c.id = clock_ins.conversacion_id) AND (c.tenant_id = public.prestadora_actual()) AND (c.familia_id = auth.uid()))))));


--
-- Name: franjas_aviso Franjas de los avisos de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Franjas de los avisos de la Prestadora" ON public.franjas_aviso TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE (a.id = franjas_aviso.aviso_id))))) WITH CHECK (((tenant_id = public.prestadora_actual()) AND (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE (a.id = franjas_aviso.aviso_id)))));


--
-- Name: guias_cuidado Guías propias: alta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guías propias: alta" ON public.guias_cuidado FOR INSERT TO authenticated WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: guias_cuidado Guías propias: baja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guías propias: baja" ON public.guias_cuidado FOR DELETE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: guias_cuidado Guías propias: cambio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guías propias: cambio" ON public.guias_cuidado FOR UPDATE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual()))) WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: guias_cuidado Guías que se pueden leer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guías que se pueden leer" ON public.guias_cuidado FOR SELECT TO authenticated USING ((((tenant_id IS NULL) AND publicada) OR (tenant_id = public.prestadora_actual())));


--
-- Name: intentos_evaluacion Intentos propios y de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Intentos propios y de la Prestadora" ON public.intentos_evaluacion FOR SELECT TO authenticated USING (((caregiver_id = public.legajo_propio()) OR ((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())));


--
-- Name: tenants La Prestadora configura lo suyo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La Prestadora configura lo suyo" ON public.tenants FOR UPDATE TO authenticated USING (((id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: conversaciones La conversacion la abre la Familia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La conversacion la abre la Familia" ON public.conversaciones FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.prestadora_actual()) AND (familia_id = auth.uid())));


--
-- Name: conversaciones La conversacion la leen las dos partes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La conversacion la leen las dos partes" ON public.conversaciones FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND ((familia_id = auth.uid()) OR (caregiver_id = public.legajo_propio()))));


--
-- Name: postulaciones La postulacion la cancela quien la hizo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La postulacion la cancela quien la hizo" ON public.postulaciones FOR DELETE TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio())));


--
-- Name: postulaciones La postulacion la leen las dos partes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La postulacion la leen las dos partes" ON public.postulaciones FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND ((caregiver_id = public.legajo_propio()) OR (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE ((a.id = postulaciones.aviso_id) AND (a.familia_id = auth.uid())))))));


--
-- Name: postulaciones La postulacion la marca la Familia del aviso; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "La postulacion la marca la Familia del aviso" ON public.postulaciones FOR UPDATE TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE ((a.id = postulaciones.aviso_id) AND (a.familia_id = auth.uid())))))) WITH CHECK ((tenant_id = public.prestadora_actual()));


--
-- Name: patrones_de_contacto Las reglas del chat se leen y no se tocan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Las reglas del chat se leen y no se tocan" ON public.patrones_de_contacto FOR SELECT TO authenticated, anon USING (activo);


--
-- Name: autorizaciones_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.autorizaciones_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: disponibilidad_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.disponibilidad_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: documentos_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.documentos_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: estudios_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.estudios_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: experiencia_laboral_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.experiencia_laboral_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: franjas_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.franjas_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: matriculas_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.matriculas_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: referencias_asistente Legajo de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajo de la Prestadora, para su personal" ON public.referencias_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: caregivers Legajos de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Legajos de la Prestadora, para su personal" ON public.caregivers TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: messages Mensajes de las dos partes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mensajes de las dos partes" ON public.messages TO authenticated USING (((tenant_id = public.prestadora_actual()) AND ((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE ((a.id = messages.aviso_id) AND (a.familia_id = auth.uid()))))))) WITH CHECK (((tenant_id = public.prestadora_actual()) AND (author_id = auth.uid())));


--
-- Name: oferta_comercial Oferta comercial general y de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Oferta comercial general y de la Prestadora" ON public.oferta_comercial FOR SELECT TO authenticated USING (((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual())));


--
-- Name: vocabulario_items Opciones propias: alta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Opciones propias: alta" ON public.vocabulario_items FOR INSERT TO authenticated WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabulario_items Opciones propias: baja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Opciones propias: baja" ON public.vocabulario_items FOR DELETE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabulario_items Opciones propias: cambio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Opciones propias: cambio" ON public.vocabulario_items FOR UPDATE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual()))) WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabulario_items Opciones que se pueden leer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Opciones que se pueden leer" ON public.vocabulario_items FOR SELECT TO authenticated USING (((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual())));


--
-- Name: ponderacion_comprobacion Ponderaciones de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ponderaciones de la Prestadora" ON public.ponderacion_comprobacion TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: postulaciones Postulaciones que escribe el Asistente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Postulaciones que escribe el Asistente" ON public.postulaciones FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio())));


--
-- Name: preguntas_evaluacion Preguntas generales y de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Preguntas generales y de la Prestadora" ON public.preguntas_evaluacion FOR SELECT TO authenticated USING (((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual())));


--
-- Name: puntaje_prestadora Puntaje de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Puntaje de la Prestadora" ON public.puntaje_prestadora TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: reportes Reportes que escribe el Asistente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reportes que escribe el Asistente" ON public.reportes TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio()))) WITH CHECK (((tenant_id = public.prestadora_actual()) AND (caregiver_id = public.legajo_propio())));


--
-- Name: reportes Reportes que lee la Familia del aviso; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reportes que lee la Familia del aviso" ON public.reportes FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND (EXISTS ( SELECT 1
   FROM public.avisos a
  WHERE ((a.id = reportes.aviso_id) AND (a.familia_id = auth.uid()))))));


--
-- Name: resoluciones_legajo Resoluciones del legajo, las escribe la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resoluciones del legajo, las escribe la Prestadora" ON public.resoluciones_legajo FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora() AND (EXISTS ( SELECT 1
   FROM public.caregivers c
  WHERE ((c.id = resoluciones_legajo.caregiver_id) AND (c.tenant_id = public.prestadora_actual()))))));


--
-- Name: resoluciones_legajo Resoluciones del legajo, las lee la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resoluciones del legajo, las lee la Prestadora" ON public.resoluciones_legajo FOR SELECT TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: tenants Su propia Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propia Prestadora" ON public.tenants FOR SELECT TO authenticated USING ((id = public.prestadora_actual()));


--
-- Name: autorizaciones_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.autorizaciones_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: caregivers Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.caregivers TO authenticated USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: disponibilidad_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.disponibilidad_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: documentos_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.documentos_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: estudios_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.estudios_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: experiencia_laboral_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.experiencia_laboral_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: franjas_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.franjas_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: matriculas_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.matriculas_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: referencias_asistente Su propio legajo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio legajo" ON public.referencias_asistente TO authenticated USING ((caregiver_id = public.legajo_propio())) WITH CHECK (((caregiver_id = public.legajo_propio()) AND (tenant_id = public.prestadora_actual())));


--
-- Name: profiles Su propio perfil, de escritura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio perfil, de escritura" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles Su propio perfil, de lectura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Su propio perfil, de lectura" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: verificaciones_asistente Sus propias verificaciones, de lectura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sus propias verificaciones, de lectura" ON public.verificaciones_asistente FOR SELECT TO authenticated USING ((caregiver_id = public.legajo_propio()));


--
-- Name: alarmas_prestadora Topes de alarma de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Topes de alarma de la Prestadora" ON public.alarmas_prestadora TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: verificaciones_asistente Verificaciones de la Prestadora, para su personal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verificaciones de la Prestadora, para su personal" ON public.verificaciones_asistente TO authenticated USING (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())) WITH CHECK (((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora()));


--
-- Name: vocabularios Vocabularios propios: alta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vocabularios propios: alta" ON public.vocabularios FOR INSERT TO authenticated WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabularios Vocabularios propios: baja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vocabularios propios: baja" ON public.vocabularios FOR DELETE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabularios Vocabularios propios: cambio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vocabularios propios: cambio" ON public.vocabularios FOR UPDATE TO authenticated USING (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual()))) WITH CHECK (((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())));


--
-- Name: vocabularios Vocabularios que se pueden leer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vocabularios que se pueden leer" ON public.vocabularios FOR SELECT TO authenticated USING (((tenant_id IS NULL) OR (tenant_id = public.prestadora_actual())));


--
-- Name: zonas_cobertura Zonas de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Zonas de la Prestadora" ON public.zonas_cobertura TO authenticated USING ((tenant_id = public.prestadora_actual())) WITH CHECK ((tenant_id = public.prestadora_actual()));


--
-- Name: zonas_asistente Zonas del Asistente de la Prestadora; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Zonas del Asistente de la Prestadora" ON public.zonas_asistente TO authenticated USING ((tenant_id = public.prestadora_actual())) WITH CHECK ((tenant_id = public.prestadora_actual()));


--
-- Name: autorizaciones_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.autorizaciones_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: alarmas_prestadora; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alarmas_prestadora ENABLE ROW LEVEL SECURITY;

--
-- Name: avisos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

--
-- Name: conversaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: franjas_aviso; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.franjas_aviso ENABLE ROW LEVEL SECURITY;

--
-- Name: mensajes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

--
-- Name: ponderacion_comprobacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ponderacion_comprobacion ENABLE ROW LEVEL SECURITY;

--
-- Name: postulaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: puntaje_prestadora; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.puntaje_prestadora ENABLE ROW LEVEL SECURITY;

--
-- Name: caregivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;

--
-- Name: clock_ins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clock_ins ENABLE ROW LEVEL SECURITY;

--
-- Name: cursos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

--
-- Name: disponibilidad_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disponibilidad_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: estudios_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estudios_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: experiencia_laboral_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experiencia_laboral_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: franjas_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.franjas_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: guias_cuidado; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guias_cuidado ENABLE ROW LEVEL SECURITY;

--
-- Name: intentos_evaluacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;

--
-- Name: matriculas_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matriculas_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: oferta_comercial; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oferta_comercial ENABLE ROW LEVEL SECURITY;

--
-- Name: opciones_pregunta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opciones_pregunta ENABLE ROW LEVEL SECURITY;

--
-- Name: patrones_de_contacto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patrones_de_contacto ENABLE ROW LEVEL SECURITY;

--
-- Name: preguntas_evaluacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preguntas_evaluacion ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referencias_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referencias_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: reportes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

--
-- Name: resoluciones_legajo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resoluciones_legajo ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: verificaciones_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verificaciones_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: vocabulario_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vocabulario_items ENABLE ROW LEVEL SECURITY;

--
-- Name: vocabularios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vocabularios ENABLE ROW LEVEL SECURITY;

--
-- Name: zonas_asistente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zonas_asistente ENABLE ROW LEVEL SECURITY;

--
-- Name: zonas_cobertura; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zonas_cobertura ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text) TO service_role;


--
-- Name: FUNCTION avisos_abiertos(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.avisos_abiertos() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.avisos_abiertos() TO service_role;
GRANT ALL ON FUNCTION public.avisos_abiertos() TO authenticated;


--
-- Name: FUNCTION configuracion_de_fabrica_de_las_alarmas(p_tenant uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.configuracion_de_fabrica_de_las_alarmas(p_tenant uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.configuracion_de_fabrica_de_las_alarmas(p_tenant uuid) TO service_role;


--
-- Name: FUNCTION configuracion_de_fabrica_del_puntaje(p_tenant uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.configuracion_de_fabrica_del_puntaje(p_tenant uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.configuracion_de_fabrica_del_puntaje(p_tenant uuid) TO service_role;


--
-- Name: FUNCTION contacto_en_el_texto(p_texto text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.contacto_en_el_texto(p_texto text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.contacto_en_el_texto(p_texto text) TO service_role;
GRANT ALL ON FUNCTION public.contacto_en_el_texto(p_texto text) TO authenticated;


--
-- Name: FUNCTION conversacion_propia(p_conversacion uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.conversacion_propia(p_conversacion uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.conversacion_propia(p_conversacion uuid) TO service_role;
GRANT ALL ON FUNCTION public.conversacion_propia(p_conversacion uuid) TO authenticated;


--
-- Name: FUNCTION corregir_prestadora(p_referencia text, p_nombre text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.corregir_prestadora(p_referencia text, p_nombre text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.corregir_prestadora(p_referencia text, p_nombre text) TO service_role;


--
-- Name: FUNCTION crear_perfil_al_registrarse(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.crear_perfil_al_registrarse() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.crear_perfil_al_registrarse() TO service_role;


--
-- Name: FUNCTION i18n_completo(p_texto jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.i18n_completo(p_texto jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.i18n_completo(p_texto jsonb) TO service_role;
GRANT ALL ON FUNCTION public.i18n_completo(p_texto jsonb) TO authenticated;


--
-- Name: FUNCTION i18n_minimo(p_texto jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.i18n_minimo(p_texto jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.i18n_minimo(p_texto jsonb) TO service_role;
GRANT ALL ON FUNCTION public.i18n_minimo(p_texto jsonb) TO authenticated;


--
-- Name: FUNCTION prestadora_actual(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prestadora_actual() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.prestadora_actual() TO authenticated;
GRANT ALL ON FUNCTION public.prestadora_actual() TO service_role;


--
-- Name: TABLE autorizaciones_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.autorizaciones_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.autorizaciones_asistente TO authenticated;


--
-- Name: TABLE caregivers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.caregivers TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.caregivers TO authenticated;


--
-- Name: TABLE disponibilidad_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.disponibilidad_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.disponibilidad_asistente TO authenticated;


--
-- Name: TABLE intentos_evaluacion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intentos_evaluacion TO service_role;
GRANT SELECT ON TABLE public.intentos_evaluacion TO authenticated;


--
-- Name: TABLE verificaciones_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.verificaciones_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.verificaciones_asistente TO authenticated;


--
-- Name: TABLE vocabulario_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vocabulario_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vocabulario_items TO authenticated;


--
-- Name: TABLE vocabularios; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vocabularios TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vocabularios TO authenticated;


--
-- Name: TABLE zonas_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.zonas_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.zonas_asistente TO authenticated;


--
-- Name: TABLE zonas_cobertura; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.zonas_cobertura TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.zonas_cobertura TO authenticated;


--
-- Name: TABLE directorio; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.directorio TO service_role;


--
-- Name: FUNCTION directorio_de(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.directorio_de(p_slug text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.directorio_de(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.directorio_de(p_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.directorio_de(p_slug text) TO service_role;


--
-- Name: FUNCTION el_legajo_no_completa_el_alta_sin_sus_papeles(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.el_legajo_no_completa_el_alta_sin_sus_papeles() TO service_role;


--
-- Name: FUNCTION el_legajo_no_se_sella_solo(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.el_legajo_no_se_sella_solo() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.el_legajo_no_se_sella_solo() TO service_role;


--
-- Name: FUNCTION el_mensaje_no_lleva_datos_de_contacto(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.el_mensaje_no_lleva_datos_de_contacto() TO service_role;


--
-- Name: FUNCTION el_rol_y_la_prestadora_no_se_escriben_solos(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos() TO service_role;


--
-- Name: FUNCTION el_valor_hora_nace_con_su_moneda(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.el_valor_hora_nace_con_su_moneda() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.el_valor_hora_nace_con_su_moneda() TO service_role;


--
-- Name: FUNCTION el_vocabulario_no_cruza_prestadoras(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.el_vocabulario_no_cruza_prestadoras() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.el_vocabulario_no_cruza_prestadoras() TO service_role;


--
-- Name: FUNCTION el_vocabulario_propio_no_pisa_al_general(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.el_vocabulario_propio_no_pisa_al_general() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.el_vocabulario_propio_no_pisa_al_general() TO service_role;


--
-- Name: FUNCTION es_personal_de_prestadora(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.es_personal_de_prestadora() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.es_personal_de_prestadora() TO authenticated;
GRANT ALL ON FUNCTION public.es_personal_de_prestadora() TO service_role;


--
-- Name: FUNCTION fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone) TO service_role;


--
-- Name: FUNCTION franjas_de_aviso(p_aviso uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.franjas_de_aviso(p_aviso uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.franjas_de_aviso(p_aviso uuid) TO service_role;
GRANT ALL ON FUNCTION public.franjas_de_aviso(p_aviso uuid) TO authenticated;


--
-- Name: FUNCTION guias_de(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.guias_de(p_slug text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.guias_de(p_slug text) TO service_role;
GRANT ALL ON FUNCTION public.guias_de(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.guias_de(p_slug text) TO authenticated;


--
-- Name: FUNCTION i18n_lista_completa(p_texto jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.i18n_lista_completa(p_texto jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.i18n_lista_completa(p_texto jsonb) TO service_role;
GRANT ALL ON FUNCTION public.i18n_lista_completa(p_texto jsonb) TO authenticated;


--
-- Name: FUNCTION i18n_lista_minima(p_texto jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.i18n_lista_minima(p_texto jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.i18n_lista_minima(p_texto jsonb) TO service_role;
GRANT ALL ON FUNCTION public.i18n_lista_minima(p_texto jsonb) TO authenticated;


--
-- Name: FUNCTION la_fecha_de_alta_la_pone_la_base(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_fecha_de_alta_la_pone_la_base() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_fecha_de_alta_la_pone_la_base() TO service_role;


--
-- Name: FUNCTION la_guia_no_cruza_prestadoras(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_guia_no_cruza_prestadoras() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_guia_no_cruza_prestadoras() TO service_role;


--
-- Name: FUNCTION la_ponderacion_suma_cien(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_ponderacion_suma_cien() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_ponderacion_suma_cien() TO service_role;


--
-- Name: FUNCTION la_prestadora_nace_configurada(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_prestadora_nace_configurada() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_prestadora_nace_configurada() TO service_role;


--
-- Name: FUNCTION la_resolucion_dice_quien_la_firmo(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_resolucion_dice_quien_la_firmo() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_resolucion_dice_quien_la_firmo() TO service_role;


--
-- Name: FUNCTION la_verificacion_dice_quien_la_marco(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_verificacion_dice_quien_la_marco() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_verificacion_dice_quien_la_marco() TO service_role;


--
-- Name: FUNCTION la_zona_cuelga_de_una_region(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.la_zona_cuelga_de_una_region() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.la_zona_cuelga_de_una_region() TO service_role;


--
-- Name: FUNCTION legajo_propio(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.legajo_propio() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.legajo_propio() TO authenticated;
GRANT ALL ON FUNCTION public.legajo_propio() TO service_role;


--
-- Name: FUNCTION mis_alarmas(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mis_alarmas() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.mis_alarmas() TO service_role;
GRANT ALL ON FUNCTION public.mis_alarmas() TO authenticated;


--
-- Name: FUNCTION mis_conversaciones(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mis_conversaciones() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.mis_conversaciones() TO service_role;
GRANT ALL ON FUNCTION public.mis_conversaciones() TO authenticated;


--
-- Name: FUNCTION nombre_corto_de(p_nombre text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.nombre_corto_de(p_nombre text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.nombre_corto_de(p_nombre text) TO authenticated;
GRANT ALL ON FUNCTION public.nombre_corto_de(p_nombre text) TO service_role;


--
-- Name: FUNCTION patron_en_postgres(p_patron text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.patron_en_postgres(p_patron text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.patron_en_postgres(p_patron text) TO service_role;
GRANT ALL ON FUNCTION public.patron_en_postgres(p_patron text) TO authenticated;


--
-- Name: FUNCTION perfil_del_directorio(p_slug text, p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.perfil_del_directorio(p_slug text, p_id uuid) TO service_role;


--
-- Name: FUNCTION postulaciones_de_mis_avisos(p_aviso uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.postulaciones_de_mis_avisos(p_aviso uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.postulaciones_de_mis_avisos(p_aviso uuid) TO service_role;
GRANT ALL ON FUNCTION public.postulaciones_de_mis_avisos(p_aviso uuid) TO authenticated;


--
-- Name: FUNCTION prestadora_por_slug(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prestadora_por_slug(p_slug text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.prestadora_por_slug(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.prestadora_por_slug(p_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.prestadora_por_slug(p_slug text) TO service_role;


--
-- Name: FUNCTION rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.rendir_evaluacion(p_evaluacion uuid, p_respuestas jsonb) TO service_role;


--
-- Name: TABLE resoluciones_legajo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resoluciones_legajo TO service_role;
GRANT SELECT,INSERT ON TABLE public.resoluciones_legajo TO authenticated;


--
-- Name: FUNCTION resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text) TO service_role;
GRANT ALL ON FUNCTION public.resolver_legajo(p_caregiver_id uuid, p_estado text, p_motivo text) TO authenticated;


--
-- Name: FUNCTION vocabularios_de(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.vocabularios_de(p_slug text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.vocabularios_de(p_slug text) TO service_role;
GRANT ALL ON FUNCTION public.vocabularios_de(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.vocabularios_de(p_slug text) TO authenticated;


--
-- Name: FUNCTION zonas_de(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.zonas_de(p_slug text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.zonas_de(p_slug text) TO service_role;
GRANT ALL ON FUNCTION public.zonas_de(p_slug text) TO anon;
GRANT ALL ON FUNCTION public.zonas_de(p_slug text) TO authenticated;


--
-- Name: TABLE alarmas_prestadora; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.alarmas_prestadora TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.alarmas_prestadora TO authenticated;


--
-- Name: TABLE avisos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.avisos TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.avisos TO authenticated;


--
-- Name: TABLE conversaciones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.conversaciones TO service_role;
GRANT SELECT,INSERT ON TABLE public.conversaciones TO authenticated;


--
-- Name: TABLE franjas_aviso; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.franjas_aviso TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.franjas_aviso TO authenticated;


--
-- Name: TABLE mensajes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mensajes TO service_role;
GRANT SELECT,INSERT ON TABLE public.mensajes TO authenticated;


--
-- Name: TABLE ponderacion_comprobacion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ponderacion_comprobacion TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ponderacion_comprobacion TO authenticated;


--
-- Name: TABLE postulaciones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.postulaciones TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.postulaciones TO authenticated;


--
-- Name: COLUMN postulaciones.vista_el; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(vista_el) ON TABLE public.postulaciones TO authenticated;


--
-- Name: COLUMN postulaciones.descartada_el; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(descartada_el) ON TABLE public.postulaciones TO authenticated;


--
-- Name: TABLE puntaje_prestadora; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.puntaje_prestadora TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.puntaje_prestadora TO authenticated;


--
-- Name: TABLE clock_ins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clock_ins TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.clock_ins TO authenticated;


--
-- Name: TABLE cursos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cursos TO service_role;
GRANT SELECT ON TABLE public.cursos TO authenticated;


--
-- Name: TABLE documentos_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documentos_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.documentos_asistente TO authenticated;


--
-- Name: TABLE estudios_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estudios_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.estudios_asistente TO authenticated;


--
-- Name: TABLE evaluaciones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.evaluaciones TO service_role;
GRANT SELECT ON TABLE public.evaluaciones TO authenticated;


--
-- Name: TABLE experiencia_laboral_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.experiencia_laboral_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.experiencia_laboral_asistente TO authenticated;


--
-- Name: TABLE franjas_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.franjas_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.franjas_asistente TO authenticated;


--
-- Name: TABLE guias_cuidado; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.guias_cuidado TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.guias_cuidado TO authenticated;


--
-- Name: TABLE matriculas_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matriculas_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.matriculas_asistente TO authenticated;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.messages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.messages TO authenticated;


--
-- Name: TABLE oferta_comercial; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oferta_comercial TO service_role;


--
-- Name: TABLE oferta_comercial_publica; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oferta_comercial_publica TO service_role;
GRANT SELECT ON TABLE public.oferta_comercial_publica TO anon;
GRANT SELECT ON TABLE public.oferta_comercial_publica TO authenticated;


--
-- Name: TABLE oferta_de_cursos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.oferta_de_cursos TO service_role;
GRANT SELECT ON TABLE public.oferta_de_cursos TO anon;
GRANT SELECT ON TABLE public.oferta_de_cursos TO authenticated;


--
-- Name: TABLE opciones_pregunta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.opciones_pregunta TO service_role;


--
-- Name: TABLE opciones_para_responder; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.opciones_para_responder TO service_role;
GRANT SELECT ON TABLE public.opciones_para_responder TO authenticated;


--
-- Name: TABLE patrones_de_contacto; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patrones_de_contacto TO service_role;
GRANT SELECT ON TABLE public.patrones_de_contacto TO anon;
GRANT SELECT ON TABLE public.patrones_de_contacto TO authenticated;


--
-- Name: TABLE preguntas_evaluacion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preguntas_evaluacion TO service_role;
GRANT SELECT ON TABLE public.preguntas_evaluacion TO authenticated;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.full_name; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(full_name) ON TABLE public.profiles TO authenticated;


--
-- Name: TABLE referencias_asistente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.referencias_asistente TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.referencias_asistente TO authenticated;


--
-- Name: TABLE reportes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reportes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reportes TO authenticated;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenants TO service_role;
GRANT SELECT ON TABLE public.tenants TO authenticated;


--
-- Name: COLUMN tenants.moneda; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(moneda) ON TABLE public.tenants TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

--
-- Lo que no vive en `public`, y sin lo cual la base no es la misma.
--
set search_path = public, storage, extensions;

create policy "Avatar propio" on storage.objects as PERMISSIVE for ALL to authenticated using (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) with check (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "Documentos del legajo, los propios" on storage.objects as PERMISSIVE for ALL to authenticated using (((bucket_id = 'documentos-cuidadores'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) with check (((bucket_id = 'documentos-cuidadores'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "Documentos del legajo, para la Prestadora" on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'documentos-cuidadores'::text) AND es_personal_de_prestadora() AND (EXISTS ( SELECT 1
   FROM caregivers c
  WHERE (((c.user_id)::text = (storage.foldername(objects.name))[1]) AND (c.tenant_id = prestadora_actual()))))));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatares', 'avatares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('documentos-cuidadores', 'documentos-cuidadores', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']::text[]) on conflict (id) do nothing;

CREATE TRIGGER crear_perfil_al_registrarse AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_al_registrarse();

reset search_path;

notify pgrst, 'reload schema';
