--
-- El perfil que lee la pantalla es el de la Prestadora donde está parada la sesión
--
-- Es la consecuencia directa de la migración anterior, y no se puede dejar para
-- después: desde que una cuenta puede tener una ficha en cada Prestadora, la
-- pantalla que pedía «la» ficha de quien inició sesión empezó a recibir dos, y
-- la que espera una sola falla. La pantalla no puede elegir por su cuenta: la
-- Prestadora donde la sesión está parada la resuelve la base, y es la misma
-- respuesta que usan todas las políticas.
--
-- ---- Por qué una función y no una consulta con un filtro más ----
--
-- Porque el filtro sería la segunda copia de una decisión que ya está escrita.
-- Dónde está parada la sesión lo contesta `prestadora_actual()`: mira lo
-- guardado, lo comprueba contra la ficha, y cuando la persona tiene una sola
-- ficha contesta esa sin que nadie haya elegido nada. Si el navegador rehiciera
-- esa cuenta por su lado, el día que la regla cambie habría que cambiarla en
-- dos lugares, y uno de los dos se olvida.
--
-- Y hay una segunda razón, más simple: así la pantalla pregunta una sola vez.
-- Pidiendo primero la Prestadora y después la ficha, cada pantalla que arranca
-- pagaría dos viajes contra dos.
--
-- ---- Lo que esta función no hace ----
--
-- No elige Prestadora ni cambia nada: sólo lee. Elegir es de
-- `pararse_en_prestadora()`, que además exige tener ficha ahí.
--
-- Y no pregunta de quién es la sesión, a propósito. No se saltea la seguridad
-- de fila: corre con los permisos de quien la llama, y la política «Su propio
-- perfil, de lectura» ya deja ver una sola persona, la que está preguntando.
-- Repetir esa condición acá adentro no agregaría ninguna defensa —si la
-- política no estuviera, la tabla entera estaría abierta y esta función sería
-- el último de los problemas— y sí agregaría una segunda copia de quién es
-- cada quien. De las dos preguntas, la fila la contesta la política y la
-- Prestadora la contesta `prestadora_actual()`: cada una en su lugar y en uno
-- solo.
--
-- Igual se le revoca el permiso a quien no inició sesión: sin sesión no tiene
-- nada que contestar, y toda función de este esquema es además una dirección
-- web.
--

-- ── 1. La ficha de quien inició sesión, en la Prestadora donde está parada ──

CREATE OR REPLACE FUNCTION public.mi_perfil()
    RETURNS TABLE(id uuid, tenant_id uuid, role text, full_name text)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select p.id, p.tenant_id, p.role, p.full_name
    from public.profiles p
   where p.tenant_id = public.prestadora_actual()
$$;

COMMENT ON FUNCTION public.mi_perfil() IS 'La ficha de quien inició sesión, en la Prestadora donde la sesión está parada. Ninguna otra, y ninguna de otra persona.';

REVOKE ALL ON FUNCTION public.mi_perfil() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mi_perfil() FROM anon;
GRANT EXECUTE ON FUNCTION public.mi_perfil() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_perfil() TO service_role;

notify pgrst, 'reload schema';
