-- =====================================================================
-- 0044 — La fecha de revisión de una guía es una fecha, no un instante
--
-- La 0041 le dio a `guias_cuidado.revisada_el` el tipo marca de tiempo
-- con huso, que es el que usan todas las columnas `created_at`. Ahí es el
-- tipo correcto: `created_at` guarda **el momento en que pasó algo**, y
-- ese momento es el mismo en todo el mundo aunque cada lugar lo escriba
-- con otra hora.
--
-- Ésta no guarda un momento: guarda **el día que una persona declara**
-- haber revisado el texto, escrito a mano en un campo de fecha. Un día
-- no tiene huso horario. El 30 de agosto de 2026 es el 30 acá, en Tokio
-- y en Honolulu.
--
-- Guardarlo como instante lo convierte en uno. Se descubrió el 30 de
-- agosto de 2026, cargando la revisión de la primera guía escrita desde
-- la pantalla: se eligió el 30, se guardó `2026-08-30 00:00:00+00` y la
-- lista mostró «29/08/2026», porque medianoche en Greenwich son las
-- nueve de la noche del día anterior en Buenos Aires. El número que sale
-- es una fecha creíble, así que el error no se ve hasta que alguien
-- tiene que responder por esa fecha — y de eso se trata justamente esta
-- columna, que es la que dice quién firma el texto y cuándo.
--
-- El arreglo es el tipo, no la pantalla. Poniéndolo en la pantalla se
-- arregla la lista de hoy y se rompe la próxima que muestre lo mismo.
--
-- Lo ya guardado se pasa leyéndolo en Greenwich, que es como se escribió:
-- las fechas que entraron por la pantalla entraron a medianoche de ese
-- huso, así que `AT TIME ZONE 'UTC'` devuelve el día que la persona
-- eligió. Hoy hay una sola fila con valor —las diecinueve guías
-- generales están sin revisar, que es el pendiente 104— y aun así la
-- conversión se escribe entera, porque la migración corre igual sobre
-- una base que tenga cien.
--
-- Las políticas de la 0041 no se tocan: ninguna mira esta columna. La
-- restricción `la_publicada_dice_quien_la_reviso` sí, pero sólo pregunta
-- si está o si falta, y eso no cambia con el tipo.
-- =====================================================================

alter table public.guias_cuidado
  alter column revisada_el type date
  using (revisada_el at time zone 'UTC')::date;

comment on column public.guias_cuidado.revisada_el is
  'El día que se revisó el texto, tal como lo declaró quien lo revisó. Es una fecha y no un instante: no se convierte a ningún huso horario.';

notify pgrst, 'reload schema';
