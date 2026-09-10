--
-- 0005 — La configuración de la Prestadora la escribe su personal, y no cualquier miembro
--
-- Por qué existe: al comparar cómo protege cada lado lo que guarda —la segunda
-- pasada de la fusión, `docs/FUSION_TEMA_POR_TEMA.md`— apareció que cinco
-- tablas de configuración de la Prestadora las podía cambiar y borrar
-- **cualquiera que tuviera sesión adentro de esa Prestadora**: un Asistente,
-- una Familia, cualquiera. Las cinco son `zonas_cobertura`, `zonas_asistente`,
-- `guias_cuidado`, `vocabularios` y `vocabulario_items`.
--
-- El control de que sea personal de la Prestadora existía y funcionaba, pero
-- vivía **solamente en la pantalla** —`guias-prestadora.html:585` y
-- `panel-prestadora.html:1564`—, y la regla de la empresa dice que el
-- aislamiento nunca depende de la pantalla: quien le hable a la base por
-- cualquier otro camino se lo saltea entero. Es el pendiente 152.
--
-- Y de paso se cierra la mitad que sobraba del otro lado: `zonas_asistente` no
-- separaba leer de escribir, así que cualquier miembro de la Prestadora veía
-- dónde trabaja cada Asistente.
--
-- QUÉ NO CAMBIA, Y POR QUÉ NO PODÍA CAMBIAR
--
-- **Leer los catálogos sigue igual.** Las opciones, los vocabularios y las
-- guías las lee todo el mundo: son las listas con las que se llenan los
-- formularios. Tocar eso rompería cada pantalla del producto.
--
-- **Y el Asistente sigue pudiendo escribir sus propias zonas.** El alta de un
-- Asistente —`registrar-asistente.html`— guarda las zonas tildadas con su
-- legajo recién creado, y en ese momento esa persona todavía no es personal de
-- la Prestadora ni lo va a ser nunca. Si esta migración pidiera nada más que
-- `es_personal_de_prestadora()`, el alta dejaría de funcionar sin decir por
-- qué. Por eso la condición tiene dos ramas: el personal de la Prestadora, o el
-- dueño del legajo. La segunda sale de `legajo_propio()`, que resuelve por la
-- sesión y nunca por el pedido.
--
-- QUÉ NO ARREGLA ESTA MIGRACIÓN
--
-- No toca el otro agujero que apareció en la misma pasada, y que es el más
-- grave: **al crearse la cuenta, la pertenencia a una Prestadora se declara
-- sola**. Ése es el pendiente 151 y no se arregla acá porque la respuesta no es
-- técnica —invitación, lista de autorizados o cuenta que nace esperando que la
-- admitan— y la decide el Desarrollador.
--
-- Tampoco pide un rol más fino que «personal de la Prestadora». Quién hace qué
-- adentro de una Prestadora no se fija en el código: va al catálogo de
-- permisos, que es de Careonys y llega con la mudanza.
--

-- ---------------------------------------------------------------------------
-- 1. Las zonas de cobertura: las lee cualquier miembro, las escribe el personal
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Zonas de la Prestadora" ON public.zonas_cobertura;

CREATE POLICY "Zonas de la Prestadora: lectura" ON public.zonas_cobertura
  FOR SELECT TO authenticated
  USING ((tenant_id = public.prestadora_actual()));

CREATE POLICY "Zonas de la Prestadora: alta" ON public.zonas_cobertura
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora());

CREATE POLICY "Zonas de la Prestadora: cambio" ON public.zonas_cobertura
  FOR UPDATE TO authenticated
  USING ((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora())
  WITH CHECK ((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora());

CREATE POLICY "Zonas de la Prestadora: baja" ON public.zonas_cobertura
  FOR DELETE TO authenticated
  USING ((tenant_id = public.prestadora_actual()) AND public.es_personal_de_prestadora());

-- ---------------------------------------------------------------------------
-- 2. Las zonas de cada Asistente: el personal de la Prestadora, o el dueño del
--    legajo. Y ahora leer y escribir son dos cosas distintas.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Zonas del Asistente de la Prestadora" ON public.zonas_asistente;

CREATE POLICY "Zonas del Asistente: lectura" ON public.zonas_asistente
  FOR SELECT TO authenticated
  USING ((tenant_id = public.prestadora_actual())
         AND (public.es_personal_de_prestadora() OR caregiver_id = public.legajo_propio()));

CREATE POLICY "Zonas del Asistente: alta" ON public.zonas_asistente
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = public.prestadora_actual())
              AND (public.es_personal_de_prestadora() OR caregiver_id = public.legajo_propio()));

CREATE POLICY "Zonas del Asistente: cambio" ON public.zonas_asistente
  FOR UPDATE TO authenticated
  USING ((tenant_id = public.prestadora_actual())
         AND (public.es_personal_de_prestadora() OR caregiver_id = public.legajo_propio()))
  WITH CHECK ((tenant_id = public.prestadora_actual())
              AND (public.es_personal_de_prestadora() OR caregiver_id = public.legajo_propio()));

CREATE POLICY "Zonas del Asistente: baja" ON public.zonas_asistente
  FOR DELETE TO authenticated
  USING ((tenant_id = public.prestadora_actual())
         AND (public.es_personal_de_prestadora() OR caregiver_id = public.legajo_propio()));

-- ---------------------------------------------------------------------------
-- 3. Las guías de cuidado propias: las escribe el personal de la Prestadora
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Guías propias: alta" ON public.guias_cuidado;
DROP POLICY IF EXISTS "Guías propias: baja" ON public.guias_cuidado;
DROP POLICY IF EXISTS "Guías propias: cambio" ON public.guias_cuidado;

CREATE POLICY "Guías propias: alta" ON public.guias_cuidado
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Guías propias: cambio" ON public.guias_cuidado
  FOR UPDATE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora())
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Guías propias: baja" ON public.guias_cuidado
  FOR DELETE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora());

-- ---------------------------------------------------------------------------
-- 4. Los vocabularios propios: los escribe el personal de la Prestadora
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Vocabularios propios: alta" ON public.vocabularios;
DROP POLICY IF EXISTS "Vocabularios propios: baja" ON public.vocabularios;
DROP POLICY IF EXISTS "Vocabularios propios: cambio" ON public.vocabularios;

CREATE POLICY "Vocabularios propios: alta" ON public.vocabularios
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Vocabularios propios: cambio" ON public.vocabularios
  FOR UPDATE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora())
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Vocabularios propios: baja" ON public.vocabularios
  FOR DELETE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora());

-- ---------------------------------------------------------------------------
-- 5. Las opciones propias: las escribe el personal de la Prestadora
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Opciones propias: alta" ON public.vocabulario_items;
DROP POLICY IF EXISTS "Opciones propias: baja" ON public.vocabulario_items;
DROP POLICY IF EXISTS "Opciones propias: cambio" ON public.vocabulario_items;

CREATE POLICY "Opciones propias: alta" ON public.vocabulario_items
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Opciones propias: cambio" ON public.vocabulario_items
  FOR UPDATE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora())
  WITH CHECK ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
              AND public.es_personal_de_prestadora());

CREATE POLICY "Opciones propias: baja" ON public.vocabulario_items
  FOR DELETE TO authenticated
  USING ((tenant_id IS NOT NULL) AND (tenant_id = public.prestadora_actual())
         AND public.es_personal_de_prestadora());

NOTIFY pgrst, 'reload schema';
