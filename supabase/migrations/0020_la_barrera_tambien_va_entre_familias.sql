-- 0020: la barrera no era una sola, eran tres
--
-- Por qué
-- -------
-- El Desarrollador lo puso el 25 de agosto de 2026 en una sola frase: una
-- Familia no puede ver a la otra, una Prestadora no puede ver a la otra, y un
-- Asistente no puede ver al otro.
--
-- Se auditaron las políticas vivas de todas las tablas y el resultado fue
-- desparejo:
--
--   * **Entre Prestadoras la barrera está entera.** Todas las tablas filtran
--     por `tenant_id = prestadora_actual()` desde la 0002.
--   * **Entre Asistentes también.** Las tablas del legajo filtran por
--     `legajo_propio()` desde la 0005 y la 0012, y el depósito de documentos
--     por la carpeta de cada uno desde la 0006.
--   * **Entre Familias no existía.** Cinco tablas se conformaban con el
--     `tenant_id`, y adentro de una misma Prestadora eso no separa a nadie.
--
-- Qué podía hacer una Familia hasta esta migración, con sólo iniciar sesión:
--
--   | Tabla | Qué veía o podía hacer de más |
--   |---|---|
--   | `avisos` | Leer, modificar y borrar los avisos de las demás Familias: la política era `for all` |
--   | `franjas_aviso` | Lo mismo con los horarios de esos avisos |
--   | `reportes` | Presión, glucemia y medicación de todos los Pacientes |
--   | `messages` | Todas las conversaciones |
--   | `clock_ins` | Las entradas y salidas de todos los Asistentes |
--
-- Y lo mismo valía para un Asistente con sesión, que tampoco tenía por qué ver
-- nada de eso.
--
-- **Las dos tablas de la 0018 tenían el mismo agujero**, recién hecho: los pesos
-- del puntaje se podían cambiar desde cualquier sesión de esa Prestadora, no
-- sólo desde su personal. Se cierra acá, en la misma pasada.
--
-- La pieza que faltaba
-- --------------------
-- La barrera entre Familias no se podía escribir porque **el aviso no sabía de
-- quién era**: `avisos` no tenía ninguna columna que lo atara a quien lo
-- publicó. Se agrega `familia_id`, con el mismo mecanismo que ya usa
-- `tenant_id`: sale del valor por omisión y no del pedido, así que nadie puede
-- publicar un aviso a nombre de otro.
--
-- Lo que esta migración deja peor a propósito
-- -------------------------------------------
-- **La pantalla de reportes de la Familia va a quedar vacía**, y hay que decirlo
-- sin adornos. Hasta hoy mostraba los reportes de todos los Pacientes de la
-- Prestadora, que es peor que vacía: un reporte no guarda para qué Familia es
-- —`aviso_id` existe pero el código nunca lo llena— así que no hay forma de
-- darle los suyos y ninguna otra. Entre mostrarle de más y no mostrarle nada,
-- se elige no mostrarle nada. **La cláusula que se lo va a devolver ya está
-- escrita acá** y hoy no encuentra ninguna fila: empieza a funcionar sola el
-- día que un reporte cuelgue de algo, que es el pendiente 52.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. El aviso pasa a saber de quién es ───────────────────────────────────
alter table public.avisos
  add column if not exists familia_id uuid references auth.users(id) on delete set null;

alter table public.avisos
  alter column familia_id set default auth.uid();

comment on column public.avisos.familia_id is
  'Quién publicó el aviso. Sale del valor por omisión y nunca del pedido, igual que tenant_id: es lo que hace que nadie pueda publicar a nombre de otro. Los avisos anteriores a la 0020 lo tienen vacío, así que sólo los ve el personal de la Prestadora.';

create index if not exists idx_avisos_familia
  on public.avisos(familia_id) where familia_id is not null;


-- ── 2. El aviso y sus horarios: de quien lo publicó, o del personal ────────
drop policy if exists "Busquedas de la Prestadora" on public.avisos;
drop policy if exists "Avisos de la Prestadora"    on public.avisos;
create policy "Avisos de la Prestadora" on public.avisos
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and (familia_id = auth.uid() or public.es_personal_de_prestadora()))
  with check (tenant_id = public.prestadora_actual()
              and (familia_id = auth.uid() or public.es_personal_de_prestadora()));

-- La franja no decide nada por su cuenta: sigue al aviso del que cuelga, y si
-- el aviso no se ve, el `exists` no encuentra nada y la franja tampoco.
drop policy if exists "Franjas de los avisos de la Prestadora" on public.franjas_aviso;
create policy "Franjas de los avisos de la Prestadora" on public.franjas_aviso
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and exists (select 1 from public.avisos a
                           where a.id = franjas_aviso.aviso_id))
  with check (tenant_id = public.prestadora_actual()
              and exists (select 1 from public.avisos a
                           where a.id = franjas_aviso.aviso_id));


-- ── 3. Los mensajes: de quien es el aviso, o del personal ──────────────────
-- `messages` cuelga del aviso, así que la conversación se hereda entera: quien
-- ve el aviso ve su chat. No hace falta una columna de destinatario.
drop policy if exists "Mensajes de la Prestadora" on public.messages;
create policy "Mensajes de la Prestadora" on public.messages
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora()
                   or author_id = auth.uid()
                   or exists (select 1 from public.avisos a
                               where a.id = messages.aviso_id)))
  with check (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora() or author_id = auth.uid()));


-- ── 4. Los reportes y las fichadas: del Asistente que los hizo ─────────────
-- Tres puertas, y hoy la tercera está cerrada porque nadie llena `aviso_id`:
-- el Asistente ve lo suyo, el personal ve todo lo de su Prestadora, y la
-- Familia va a ver lo de su aviso el día que un reporte cuelgue de algo.
drop policy if exists "Reportes de la Prestadora" on public.reportes;
create policy "Reportes de la Prestadora" on public.reportes
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora()
                   or caregiver_id = public.legajo_propio()
                   or exists (select 1 from public.avisos a
                               where a.id = reportes.aviso_id)))
  with check (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora()
                   or caregiver_id = public.legajo_propio()));

-- La fichada no cuelga de ningún aviso: es del Asistente y de su Prestadora.
drop policy if exists "Fichadas de la Prestadora" on public.clock_ins;
create policy "Fichadas de la Prestadora" on public.clock_ins
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora()
                   or caregiver_id = public.legajo_propio()))
  with check (tenant_id = public.prestadora_actual()
              and (public.es_personal_de_prestadora()
                   or caregiver_id = public.legajo_propio()));


-- ── 5. La configuración del puntaje es del personal, no de cualquiera ──────
-- Agujero de la 0018, cerrado antes de que nadie lo use: cómo pondera una
-- Prestadora lo decide la Prestadora, y ni una Familia ni un Asistente con
-- sesión tienen nada que hacer ahí.
drop policy if exists "Puntaje de la Prestadora" on public.puntaje_prestadora;
create policy "Puntaje de la Prestadora" on public.puntaje_prestadora
  for all to authenticated
  using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());

drop policy if exists "Pesos de la Prestadora" on public.peso_comprobacion;
create policy "Pesos de la Prestadora" on public.peso_comprobacion
  for all to authenticated
  using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());
