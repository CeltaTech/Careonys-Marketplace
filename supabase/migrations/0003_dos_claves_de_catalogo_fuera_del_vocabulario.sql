-- =====================================================================
-- 0003 — Dos claves de catálogo que quedaron fuera del vocabulario
--
-- La siembra de la Prestadora del directorio escribía, en la única fila que
-- agregaba, dos valores que no son claves de ningún vocabulario:
-- `movilidad_reducida` en «patologia» y `acompanamiento` en «tarea_cuidado»,
-- que ahí se llama `solo_acompanamiento`.
--
-- No rompen la base: las columnas son texto libre y aceptan cualquier cosa.
-- Rompen la pantalla. `js/catalogo.js` traduce la clave guardada a su etiqueta
-- y, cuando no la encuentra, muestra la clave cruda; y el filtro busca por la
-- clave que ofrece el catálogo, así que esa fila no aparece nunca. El dato no
-- está mal escrito: está invisible.
--
-- Es exactamente lo que se arregló en su momento para otras ocho claves. Ésta
-- se escapó porque la sembraba un `insert ... select` y el chequeo de claves
-- sólo entendía la forma con `values`. Ya entiende las dos.
--
-- La siembra de la 0002 sale corregida, así que una base creada desde cero nace
-- bien. Esta migración es para la que ya está andando. Se actualiza por
-- identificador y no buscando la clave vieja, para que las dos bases —la nueva
-- y la reparada— queden con exactamente los mismos valores.
--
-- `movilidad_reducida` no tiene equivalente literal en «patologia»: la entrada
-- que nombra lo mismo es `postrados`. Todo lo que se toca acá es inventado: no
-- hay una sola persona real en esta fila.
-- =====================================================================

update public.caregivers
   set pathologies = '["diabetes", "postrados"]'::jsonb,
       tasks       = '["higiene", "medicacion", "solo_acompanamiento"]'::jsonb
 where id = 'bbbbbbb3-0000-4000-8000-000000000001';
