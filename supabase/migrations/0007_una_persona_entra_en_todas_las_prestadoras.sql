--
-- Una persona entra en todas las Prestadoras que quiera
--
-- Lo ordenó el Desarrollador: «debe poder registrarse con el correo que quiera,
-- aunque sea siempre el mismo, en todas las prestadoras que quiera», y «lo que
-- no se puede es registrar 2 personas diferentes con el mismo correo dentro de
-- la misma prestadora».
--
-- Lo segundo no hace falta construirlo: se cumple solo. Un correo es una
-- cuenta, y de acá en más una cuenta tiene **una ficha por Prestadora**, así
-- que adentro de una misma Prestadora ese correo no puede aparecer dos veces.
-- Lo primero es lo que esta migración construye.
--
-- ---- Qué cambia ----
--
-- Hasta hoy la ficha era una sola por persona y llevaba adentro el nombre de su
-- Prestadora, así que pertenecer a una segunda era imposible: no había dónde
-- escribirlo. De acá en más la ficha se identifica por la persona **y** la
-- Prestadora juntas, y la misma cuenta puede tener una en cada una.
--
-- Eso abre una pregunta que antes no existía: **en cuál de todas está parada la
-- sesión**. La respuesta no puede venir adentro del pedido, porque eso lo
-- falsifica quien llama. Entonces se guarda, y se guarda recién después de
-- comprobar que esa cuenta tiene ficha ahí. Las políticas leen lo guardado, y
-- lo vuelven a comprobar contra la ficha cada vez que lo leen: si la ficha ya
-- no está, la sesión deja de estar parada en ningún lado y no ve nada. Falla
-- cerrado.
--
-- Mientras la persona tenga una sola ficha no hace falta que elija ni que se
-- guarde nada: no hay ambigüedad que resolver, y es el caso de todas las
-- cuentas que existen hoy.
--
-- ---- Las cuatro cosas que se rompían en silencio ----
--
-- No alcanzaba con la ficha. Cuatro lugares daban por sentado que de cada
-- persona había una sola, y con dos habrían empezado a contestar cualquier cosa
-- **sin dar ningún error**, que es la peor forma de romperse:
--
--   * el control de si alguien trabaja para la Prestadora miraba el papel de
--     «la» ficha, así que quien coordinara en una habría entrado como
--     coordinador en la otra;
--   * el que averigua cuál es el legajo propio tomaba el primero que
--     encontraba sin mirar de qué Prestadora era, y con él se habría llevado
--     las fichadas y las conversaciones de la que no era;
--   * y los dos informes de la Familia —sus alarmas y sus conversaciones— unen
--     contra la ficha, así que cada renglón habría aparecido repetido tantas
--     veces como Prestadoras tuviera esa persona.
--
-- Los cuatro quedan atados a la Prestadora del momento.
--
-- ---- Lo que no hace falta tocar, y por qué ----
--
-- Nada más. Las comparaciones contra la Organización que hay repartidas por
-- todas las políticas del producto le preguntan a una sola función, así que
-- cambiándole a ella de dónde saca la respuesta quedan todas al día de una vez.
-- Ése es el motivo de que este cambio, que parecía tocar el producto entero,
-- toque un puñado de renglones.
--
-- ---- Lo que esta migración deja igual a propósito ----
--
-- El legajo del Asistente sigue siendo **uno por cuenta**. No es un olvido: de
-- esa restricción depende hoy el aislamiento del depósito de archivos, porque
-- el camino de los papeles empieza por la cuenta y no por la Prestadora. El día
-- que una cuenta tenga legajo en dos, las dos Prestadoras verían la carpeta
-- entera. Sacarla es el pendiente 115, y va primero el camino del depósito.
--
-- ---- Antes de aplicarla ----
--
-- Usa `ON DELETE SET NULL` sobre una columna sola, que existe desde
-- PostgreSQL 15. La base de esta máquina es la 17, y ahí se probó.
--

-- ── 1. La ficha pasa a ser una por Prestadora ──────────────────────────────

ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.resoluciones_legajo
    DROP CONSTRAINT resoluciones_legajo_resuelto_por_fkey;
ALTER TABLE public.verificaciones_asistente
    DROP CONSTRAINT verificaciones_asistente_verificado_por_fkey;

ALTER TABLE public.profiles DROP CONSTRAINT profiles_pkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id, tenant_id);

-- Y las dos que colgaban de la ficha quedan mejor de lo que estaban: ahora
-- exigen además que quien resolvió o verificó sea de la misma Prestadora que
-- la fila que firmó.
ALTER TABLE public.resoluciones_legajo
    ADD CONSTRAINT resoluciones_legajo_resuelto_por_fkey
    FOREIGN KEY (resuelto_por, tenant_id) REFERENCES public.profiles(id, tenant_id)
    ON DELETE SET NULL (resuelto_por);
ALTER TABLE public.verificaciones_asistente
    ADD CONSTRAINT verificaciones_asistente_verificado_por_fkey
    FOREIGN KEY (verificado_por, tenant_id) REFERENCES public.profiles(id, tenant_id);

COMMENT ON TABLE public.profiles IS 'La ficha de una persona adentro de una Prestadora. La misma cuenta tiene una en cada Prestadora donde se haya registrado, y adentro de una Prestadora hay una sola por cuenta: eso es lo que impide que dos personas distintas queden registradas con el mismo correo en la misma Prestadora.';

-- ── 2. En cuál de todas está parada la sesión ──────────────────────────────

CREATE TABLE public.prestadora_de_la_sesion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    elegida_el timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.prestadora_de_la_sesion
    ADD CONSTRAINT prestadora_de_la_sesion_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prestadora_de_la_sesion
    ADD CONSTRAINT prestadora_de_la_sesion_usuario_unico UNIQUE (usuario_id);
ALTER TABLE ONLY public.prestadora_de_la_sesion
    ADD CONSTRAINT prestadora_de_la_sesion_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.prestadora_de_la_sesion
    ADD CONSTRAINT prestadora_de_la_sesion_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.prestadora_de_la_sesion ENABLE ROW LEVEL SECURITY;

-- Se lee la propia y ninguna otra. No lleva política de escritura, y no es un
-- olvido: acá no escribe una sesión, escriben las dos funciones de más abajo,
-- que antes comprueban que esa cuenta tenga ficha en esa Prestadora. Si se
-- pudiera escribir a mano, el valor volvería a venir del pedido y todo esto no
-- serviría para nada.
CREATE POLICY "La propia, de lectura" ON public.prestadora_de_la_sesion
    FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));

GRANT ALL ON TABLE public.prestadora_de_la_sesion TO service_role;
GRANT SELECT ON TABLE public.prestadora_de_la_sesion TO authenticated;

COMMENT ON TABLE public.prestadora_de_la_sesion IS 'En qué Prestadora está parada la sesión de cada cuenta. La escriben las funciones que antes comprueban la ficha, nunca el pedido, y lo guardado se vuelve a comprobar contra la ficha cada vez que se lo lee.';
COMMENT ON COLUMN public.prestadora_de_la_sesion.usuario_id IS 'La cuenta. Hay a lo sumo un renglón por cuenta: una sesión está parada en una Prestadora por vez.';
COMMENT ON COLUMN public.prestadora_de_la_sesion.tenant_id IS 'La Prestadora en la que está parada, comprobada contra la ficha antes de escribirla.';

-- ── 3. Cuál es la Prestadora del momento ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.prestadora_actual() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    -- Lo guardado, vuelto a comprobar contra la ficha en cada lectura: si la
    -- ficha ya no está, esto da nulo y la sesión no ve nada.
    (select s.tenant_id
       from public.prestadora_de_la_sesion s
       join public.profiles p on p.id = s.usuario_id
                             and p.tenant_id = s.tenant_id
      where s.usuario_id = auth.uid()),
    -- Y con una sola ficha no hay nada que elegir. Con dos o más sin haber
    -- elegido, tampoco: da nulo, y nulo no abre ninguna puerta.
    (select p.tenant_id
       from public.profiles p
      where p.id = auth.uid()
        and (select count(*) from public.profiles q where q.id = auth.uid()) = 1)
  )
$$;

COMMENT ON FUNCTION public.prestadora_actual() IS 'La Prestadora en la que está parada la sesión. Sale de la ficha y nunca del pedido: lo guardado se vuelve a comprobar contra la ficha en cada lectura, y con una sola ficha no hay nada que elegir. Sin ficha, nulo.';

CREATE OR REPLACE FUNCTION public.es_personal_de_prestadora() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select p.role = 'coordinador'
       from public.profiles p
      where p.id = auth.uid()
        and p.tenant_id = public.prestadora_actual()),
    false)
$$;

COMMENT ON FUNCTION public.es_personal_de_prestadora() IS 'Si quien inició sesión trabaja para la Prestadora en la que está parado. Sale del papel de esa ficha: coordinar en una Prestadora no es coordinar en otra.';

CREATE OR REPLACE FUNCTION public.legajo_propio() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select c.id
    from public.caregivers c
   where c.user_id = auth.uid()
     and c.tenant_id = public.prestadora_actual()
   limit 1
$$;

COMMENT ON FUNCTION public.legajo_propio() IS 'El legajo de quien inició sesión, en la Prestadora en la que está parado. Hoy hay uno solo por cuenta, pero la condición de la Prestadora está puesta igual: sin ella, el día que haya dos, éste devolvería el que no era y con él las fichadas y las conversaciones de la otra Prestadora.';

-- ── 4. Pararse en una Prestadora, y registrarse en una nueva ───────────────

CREATE FUNCTION public.pararse_en_prestadora(p_nombre_corto text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  destino uuid;
begin
  -- Primero, cuál es la Prestadora que se pide por su nombre corto. Acá no
  -- interviene quién inició sesión: esto es traducir un nombre, no averiguar
  -- la Prestadora de nadie. La Prestadora del momento la resuelve una sola
  -- función en todo el producto, y no es ésta.
  select t.id into destino
    from public.tenants t
   where t.slug = p_nombre_corto
     and t.status = 'activo'
   limit 1;

  -- Y después, si esa cuenta tiene ficha ahí. No se le cree al pedido: sin
  -- ficha no se para, aunque sepa el nombre.
  if destino is null
     or not exists (select 1
                      from public.profiles p
                     where p.id = auth.uid()
                       and p.tenant_id = destino) then
    -- Contesta lo mismo si no tiene ficha, si la Prestadora está suspendida y
    -- si no existe: desde afuera no se puede averiguar en cuál de los tres
    -- casos se está.
    raise exception 'prestadora_desconocida:parada';
  end if;

  insert into public.prestadora_de_la_sesion (usuario_id, tenant_id, elegida_el)
  values (auth.uid(), destino, now())
      on conflict (usuario_id)
      do update set tenant_id = excluded.tenant_id, elegida_el = excluded.elegida_el;

  return destino;
end;
$$;

COMMENT ON FUNCTION public.pararse_en_prestadora(text) IS 'Para la sesión en una Prestadora donde esa cuenta ya tiene ficha. Si no la tiene, si la Prestadora está suspendida o si no existe, contesta lo mismo en los tres casos.';

CREATE FUNCTION public.registrarse_en_prestadora(p_nombre_corto text, p_papel text, p_nombre text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  destino uuid;
  papel   text;
begin
  if auth.uid() is null then
    raise exception 'prestadora_desconocida:alta';
  end if;

  -- Los mismos dos papeles que puede tomar quien se registra por su cuenta.
  -- `coordinador` no está a propósito: ése lo da alguien que ya está adentro.
  papel := case when p_papel in ('caregiver', 'familiar') then p_papel else 'familiar' end;

  select t.id into destino
    from public.tenants t
   where t.slug = p_nombre_corto
     and t.status = 'activo'
   limit 1;

  if destino is null then
    raise exception 'prestadora_desconocida:alta';
  end if;

  -- Si ya tenía ficha ahí, no se duplica y no se le pisa el papel que tenga.
  insert into public.profiles (id, tenant_id, full_name, role)
  values (auth.uid(), destino, p_nombre, papel)
      on conflict (id, tenant_id) do nothing;

  insert into public.prestadora_de_la_sesion (usuario_id, tenant_id, elegida_el)
  values (auth.uid(), destino, now())
      on conflict (usuario_id)
      do update set tenant_id = excluded.tenant_id, elegida_el = excluded.elegida_el;

  return destino;
end;
$$;

COMMENT ON FUNCTION public.registrarse_en_prestadora(text, text, text) IS 'Le abre ficha en una Prestadora a una cuenta que ya existe, y para la sesión ahí. Es el camino de quien entra por el enlace de una segunda Prestadora: el alta automática sólo ocurre cuando se crea la cuenta, y un correo que ya tiene cuenta no vuelve a crearla nunca.';

-- Se saltean la RLS, así que no quedan al alcance de quien no inició sesión.
-- Ninguna política las llama, así que no hace falta que conserven más que lo
-- que necesitan: quien ya tiene sesión, para poder pararse y registrarse.
REVOKE ALL ON FUNCTION public.pararse_en_prestadora(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrarse_en_prestadora(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pararse_en_prestadora(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrarse_en_prestadora(text, text, text) TO authenticated, service_role;

-- ── 5. El alta deja la sesión parada donde entró ───────────────────────────

CREATE OR REPLACE FUNCTION public.crear_perfil_al_registrarse() RETURNS trigger
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

  -- La Prestadora sale del enlace por el que entró, y tiene que estar activa.
  select t.id into prestadora
    from public.tenants t
   where (t.id::text = (meta->>'tenant_id')
       or t.slug     = (meta->>'tenant_slug'))
     and t.status = 'activo'
   limit 1;

  -- Sin Prestadora activa no hay alta. Falla cerrado y no deja cuenta muerta.
  if prestadora is null then
    raise exception 'prestadora_desconocida:alta';
  end if;

  insert into public.profiles (id, tenant_id, full_name, role)
  values (new.id, prestadora, meta->>'full_name', rol_final)
  on conflict (id, tenant_id) do nothing;

  insert into public.prestadora_de_la_sesion (usuario_id, tenant_id, elegida_el)
  values (new.id, prestadora, now())
      on conflict (usuario_id)
      do update set tenant_id = excluded.tenant_id, elegida_el = excluded.elegida_el;

  return new;
end;
$$;

COMMENT ON FUNCTION public.crear_perfil_al_registrarse() IS 'Crea la ficha al registrarse, en la Prestadora del enlace por el que entró, y deja la sesión parada ahí. El papel nunca sale de los metadatos sin filtrar, y si el enlace no resuelve una Prestadora activa el alta no se hace, para que no queden cuentas sin Prestadora ni adentro de una suspendida.';

-- ── 6. Los dos informes de la Familia, atados a la Prestadora ──────────────

CREATE OR REPLACE FUNCTION public.mis_alarmas() RETURNS TABLE(clase text, fichada_id uuid, conversacion_id uuid, otra_parte text, ocurrio_el timestamp with time zone, horas integer, tope_horas integer)
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
           f.marcada_en,
           cv.familia_id = auth.uid() as soy_la_familia,
           c.full_name                as nombre_del_asistente,
           pf.full_name               as nombre_de_la_familia,
           lead(f.event_type) over (partition by f.conversacion_id
                                        order by f.marcada_en) as sigue,
           lag(f.event_type)  over (partition by f.conversacion_id
                                        order by f.marcada_en) as venia
      from public.clock_ins f
      join public.conversaciones cv on cv.id = f.conversacion_id
      join public.caregivers c            on c.id  = cv.caregiver_id
      left join public.profiles pf        on pf.id = cv.familia_id
                                      and pf.tenant_id = cv.tenant_id
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
         m.marcada_en,
         (extract(epoch from (now() - m.marcada_en)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'entrada'
     and (m.sigue is null or m.sigue <> 'salida')
     and m.marcada_en < now() - make_interval(hours => t.horas)

  union all

  select 'salida_sin_entrada'::text,
         m.id,
         m.conversacion_id,
         case when m.soy_la_familia then m.nombre_del_asistente
              else m.nombre_de_la_familia end,
         m.marcada_en,
         (extract(epoch from (now() - m.marcada_en)) / 3600)::integer,
         t.horas
    from mias m cross join tope t
   where m.event_type = 'salida'
     and (m.venia is null or m.venia <> 'entrada')

   order by 5 desc;
$$;

CREATE OR REPLACE FUNCTION public.mis_conversaciones() RETURNS TABLE(id uuid, aviso_id uuid, caregiver_id uuid, created_at timestamp with time zone, soy_la_familia boolean, otra_parte text, otra_parte_foto text, ultimo_el timestamp with time zone, ultimo_texto text)
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
                                and pf.tenant_id = cv.tenant_id
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

-- ── 7. Los permisos de las cinco funciones que se reescribieron ────────────
--
-- Reescribir una función le deja los permisos que ya tenía, así que esto no
-- cambia nada. Se escribe igual, y a propósito: las cinco se saltean la RLS,
-- y quien lea esta migración tiene que ver acá mismo quién puede llamarlas,
-- sin ir a buscarlo a la migración donde nacieron.
--
-- Las tres primeras las llaman las políticas, y por eso conservan a quien
-- tiene sesión: una política evalúa su condición con los permisos de quien
-- consulta, y quitárselo no devuelve cero filas, **falla**, y deja a la
-- aplicación sin poder leer sus propias tablas. Los dos informes los llama la
-- Familia desde su teléfono. La del alta no la llama nadie desde afuera: la
-- dispara la base cuando se crea una cuenta.

REVOKE ALL ON FUNCTION public.prestadora_actual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prestadora_actual() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.es_personal_de_prestadora() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_personal_de_prestadora() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.legajo_propio() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legajo_propio() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mis_alarmas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_alarmas() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mis_conversaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_conversaciones() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crear_perfil_al_registrarse() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_perfil_al_registrarse() TO service_role;

notify pgrst, 'reload schema';
