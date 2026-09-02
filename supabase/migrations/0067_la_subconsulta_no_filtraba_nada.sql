-- ---------------------------------------------------------------------------
-- 0067 — LA SUBCONSULTA NO FILTRABA LO QUE SU COMENTARIO DECÍA
--
-- Dos políticas dejaban entrar al personal de la Prestadora justo a las dos
-- cosas que la modalidad le prohíbe mirar. Las dos por el mismo motivo, y el
-- motivo estaba escrito al revés en el comentario de una de ellas.
--
-- **El error.** `0053_la_prestadora_no_mira_la_jornada.sql:62-65` afirma que la
-- subconsulta `exists (select 1 from public.avisos a where a.id =
-- reportes.aviso_id)` no necesita repetir la condición «el aviso es mío»,
-- porque «la RLS de esa tabla sólo le devuelve a cada Familia los avisos que
-- publicó». Eso es cierto para una Familia y **falso para el personal de la
-- Prestadora**: la política de `avisos`
-- (`0020_la_barrera_tambien_va_entre_familias.sql:77-82`) dice
-- `familia_id = auth.uid() or es_personal_de_prestadora()`. Para un coordinador
-- la subconsulta encuentra **todos** los avisos de su Organización, así que el
-- `exists` da verdadero para cualquier reporte con `aviso_id` cargado y la
-- política que se llama «Reportes que lee la Familia del aviso» se los muestra
-- enteros. Ninguna migración posterior a la 0053 vuelve a tocar `reportes`.
--
-- Es latente hoy —nada escribe todavía `reportes.aviso_id`, que es el pendiente
-- 52— y por eso no se ve: la política parece bien porque no devuelve nada. El
-- día que un reporte cuelgue de un aviso se abre sola, y quien haga ese cambio
-- va a estar mirando el pendiente 52, no esta subconsulta.
--
-- **El mismo agujero, ya abierto, en `messages`.** Ahí no hay que deducir nada:
-- `0020:99-107` le da al personal de la Prestadora `for all` sobre la
-- conversación entre la Familia y el Asistente, explícito y en primera cláusula.
-- Y la conversación es lo que menos puede mirar: `CLAUDE.md` §1 la nombra junto
-- con la fichada y el reporte como «la herramienta que usan ellos». La tabla
-- tiene **cero filas** y el único que la llama es la maqueta
-- (`mockup-app.html:811` y `:868`, por `js/apiClient.js:892` y `:909`); la
-- conversación de verdad vive en `mensajes` desde la 0063, que ya está
-- escrita como corresponde. Así que cerrarla no le saca nada a nadie.
--
-- **Qué hace esta migración.** Repite la condición adentro de las dos
-- subconsultas y le saca al personal de la Prestadora la cláusula de `messages`.
-- Es exactamente la forma que la `0056_la_fichada_es_del_vinculo.sql:98-106`
-- eligió para la fichada dos migraciones después: ahí la subconsulta **sí**
-- repite `c.familia_id = auth.uid()`. No mueve ninguna columna, no cuelga el
-- reporte de otro lado y no borra ninguna tabla: si mañana se decide que el
-- reporte cuelgue del vínculo como la fichada, eso es otra migración.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. El reporte lo lee la Familia de ese aviso, y nadie más ──────────────
drop policy if exists "Reportes que lee la Familia del aviso" on public.reportes;
create policy "Reportes que lee la Familia del aviso" on public.reportes
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and exists (select 1 from public.avisos a
                      where a.id = reportes.aviso_id
                        and a.familia_id = auth.uid()));

comment on table public.reportes is
  'El reporte de cuidado. Lo escribe el Asistente que cuidó y lo lee la Familia '
  'de ese aviso. El personal de la Prestadora no lo ve: en la modalidad de '
  'contrataciones la Prestadora no dirige el trabajo (migración 0053). La '
  'condición del aviso se repite adentro de la subconsulta a propósito: la RLS '
  'de avisos no alcanza para filtrarla, porque a ese personal le devuelve '
  'todos los avisos de la Organización (migración 0067).';


-- ── 2. La conversación es de las dos partes, no de la Prestadora ───────────
drop policy if exists "Mensajes de la Prestadora" on public.messages;
drop policy if exists "Mensajes de las dos partes" on public.messages;
create policy "Mensajes de las dos partes" on public.messages
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and (author_id = auth.uid()
                   or exists (select 1 from public.avisos a
                               where a.id = messages.aviso_id
                                 and a.familia_id = auth.uid())))
  with check (tenant_id = public.prestadora_actual()
              and author_id = auth.uid());

comment on table public.messages is
  'Mensajes colgados de un aviso. Los ve quien los escribió y la Familia que '
  'publicó ese aviso; el personal de la Prestadora no, porque la comunicación '
  'entre la Familia y el Asistente es la herramienta de ellos y no de ella '
  '(migración 0067). Hoy la tabla está vacía y sólo la llama la maqueta: la '
  'conversación de verdad vive en mensajes desde la migración 0063. Su '
  'destino se decide en el pendiente 139.';


notify pgrst, 'reload schema';
