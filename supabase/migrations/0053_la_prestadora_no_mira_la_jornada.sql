-- ---------------------------------------------------------------------------
-- La Prestadora deja de mirar la jornada
-- ---------------------------------------------------------------------------
--
-- Qué cambia
-- ----------
-- Ni la fichada ni el reporte de cuidado los ve el personal de la Prestadora.
-- Pasan a ser lo que son: la herramienta de la Familia y del Asistente.
--
-- Por qué
-- -------
-- Lo precisó el Desarrollador el 31 de agosto de 2026, y está escrito en el
-- `CLAUDE.md` de este producto, sección «Qué es este producto, y quién hace
-- qué». La modalidad de este producto existe para que la Prestadora quede
-- **completamente afuera** de la relación laboral y comercial entre la Familia
-- y el Asistente, de modo que nadie pueda alegar relación de dependencia con
-- ella. Lo operativo el producto sí lo acompaña, pero **en carácter
-- informativo y sin tomar ninguna decisión**.
--
-- Mirar a qué hora entra y sale una persona, y leer lo que hizo en cada
-- jornada, no es acompañar: es dirigir el trabajo. Es lo que distingue la
-- prestación directa de esta modalidad, y es exactamente la prueba que se
-- usaría para alegar lo que esta modalidad evita. Por eso el corte va en la
-- base y no en la pantalla.
--
-- La política de la 0020 le daba las dos tablas enteras a
-- `es_personal_de_prestadora()`. Esa condición se saca de las dos.
--
-- Y de paso se cierra un agujero que la 0020 dejaba abierto
-- --------------------------------------------------------
-- Su política de `reportes` era `for all`, así que la cláusula que le devuelve
-- a la Familia los reportes de su aviso también la habilitaba a **modificarlos
-- y borrarlos**. Un reporte lo escribe quien cuidó, y nadie más lo toca. Acá
-- quedan dos políticas separadas: el Asistente escribe los suyos, la Familia
-- **sólo lee** los de sus avisos.
--
-- Lo que esta migración no arregla, y hay que decirlo
-- --------------------------------------------------
-- **La Familia sigue sin ver ninguna fichada**, porque `clock_ins` no tiene
-- ninguna columna que la ate a un aviso ni a una Familia: la 0020 lo dice en
-- su propio comentario. Antes tampoco la veía, así que esta migración no le
-- saca nada; deja el hueco a la vista. Es el pendiente 136. Lo mismo con el
-- reporte, que sigue naciendo sin `aviso_id` (pendiente 52): la cláusula de
-- lectura de la Familia ya está escrita y hoy no encuentra ninguna fila.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. El reporte lo escribe quien cuidó ───────────────────────────────────
drop policy if exists "Reportes de la Prestadora" on public.reportes;
drop policy if exists "Reportes que escribe el Asistente" on public.reportes;
create policy "Reportes que escribe el Asistente" on public.reportes
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio())
  with check (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio());


-- ── 2. Y lo lee, sin tocarlo, la Familia del aviso ─────────────────────────
-- La subconsulta contra `avisos` la filtra la RLS de esa tabla, que
-- desde la 0020 sólo le devuelve a cada Familia los avisos que publicó. Así
-- que esto no necesita repetir la condición: si el aviso no es suyo, la
-- subconsulta no encuentra nada.
drop policy if exists "Reportes que lee la Familia del aviso" on public.reportes;
create policy "Reportes que lee la Familia del aviso" on public.reportes
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and exists (select 1 from public.avisos a
                      where a.id = reportes.aviso_id));

comment on table public.reportes is
  'El reporte de cuidado. Lo escribe el Asistente que cuidó y lo lee la Familia del aviso. El personal de la Prestadora no lo ve: en la modalidad de este producto la Prestadora no dirige el trabajo (migración 0053).';


-- ── 3. La fichada es del Asistente ─────────────────────────────────────────
drop policy if exists "Fichadas de la Prestadora" on public.clock_ins;
drop policy if exists "Fichadas del Asistente"    on public.clock_ins;
create policy "Fichadas del Asistente" on public.clock_ins
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio())
  with check (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio());

comment on table public.clock_ins is
  'La fichada de entrada y salida del Asistente, con su ubicación. Es suya. El personal de la Prestadora no la ve: mirar la jornada es dirigir el trabajo, y en esta modalidad no lo hace (migración 0053). La Familia todavía no la ve porque no hay columna que las ate: pendiente 136.';


notify pgrst, 'reload schema';
