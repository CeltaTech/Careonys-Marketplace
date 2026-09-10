--
-- 0006 — Nadie nace adentro de una Prestadora que no está activa
--
-- Por qué existe: el Desarrollador fijó cómo se decide la pertenencia. Quien se
-- registra **no elige** a qué Prestadora pertenece: pertenece a la del enlace
-- por el que entró. Entrar por el enlace de una Prestadora no da ningún
-- privilegio —el rol sigue cerrado y nadie se hace coordinador solo—, así que
-- que el nombre corto esté a la vista no es una falla: es cómo funciona. Y
-- registrarse en varias Prestadoras está permitido.
--
-- Lo que sí faltaba es la otra mitad del pendiente 151: el alta **no miraba en
-- qué situación está esa Prestadora**. Buscaba el nombre corto en la lista y
-- listo. De ahí salían dos cuentas que no tendrían que existir:
--
-- **Una nacida adentro de una Prestadora suspendida o cancelada.** Con la
-- pantalla no pasa, porque la única puerta que resuelve un nombre corto sin
-- sesión ya exige que esté activa. Pero el aislamiento nunca depende de la
-- pantalla, y quien le hable a la base por otro camino se salteaba el control
-- entero.
--
-- **Y una nacida sin ninguna Prestadora**, cuando el nombre corto no existía:
-- la búsqueda no encontraba nada, el perfil se creaba igual con el lugar de la
-- Prestadora vacío, y esa cuenta quedaba muerta para siempre. Todas las
-- políticas resuelven la Prestadora de ese perfil, así que esa persona no ve
-- nada; y como el rol y la Prestadora no se pueden cambiar desde la propia
-- sesión, tampoco hay forma de arreglarla desde adentro. Fallaba en silencio,
-- que es la peor de las formas de fallar.
--
-- Ahora, si el nombre corto no resuelve una Prestadora activa, **el alta no se
-- hace**: se corta antes y no queda ninguna cuenta a medio nacer.
--
-- POR QUÉ LOS DOS CASOS CONTESTAN LO MISMO
--
-- «No existe» y «existe pero no está activa» devuelven el mismo aviso, el que
-- ya usa la pantalla cuando la dirección nombra una Prestadora que no encuentra.
-- No es comodidad: decirle a un desconocido que esa Prestadora está suspendida
-- le cuenta en qué situación comercial está un Cliente de CeltaTech. Es lo
-- mismo que hace la entrada, que no deja distinguir «esa persona no existe» de
-- «la clave está mal».
--
-- QUÉ NO CAMBIA
--
-- El rol sigue saliendo filtrado de la misma lista de dos, y `coordinador`
-- sigue sin poder pedirse. La cuenta que ya existe no se toca: esto mira
-- solamente el momento del alta.
--
-- LO QUE ESTA MIGRACIÓN NO CIERRA
--
-- Que una misma persona esté en dos Prestadoras a la vez. Hoy su cuenta queda
-- atada a la primera y la segunda alta con el mismo correo no la mueve ni la
-- suma. Eso espera una decisión del Desarrollador y queda anotado en el
-- pendiente 151.
--

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
  on conflict (id) do nothing;

  return new;
end;
$$;


COMMENT ON FUNCTION public.crear_perfil_al_registrarse() IS 'Crea el perfil al registrarse. El rol nunca sale de los metadatos sin filtrar, y la Prestadora sale del enlace por el que entró y tiene que estar activa: si no resuelve ninguna, el alta no se hace, para que no queden cuentas sin Prestadora ni adentro de una suspendida.';


-- Se saltea la RLS, así que no queda al alcance de quien no inició sesión.
-- Ninguna política la llama, así que tampoco conserva `authenticated`.
REVOKE ALL ON FUNCTION public.crear_perfil_al_registrarse() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.crear_perfil_al_registrarse() TO service_role;


NOTIFY pgrst, 'reload schema';
