-- =====================================================================
-- 0010 — Las Prestadoras inventadas usan las claves del catálogo
--
-- La siembra de la 0003 escribió ocho valores que se parecían a una clave de
-- catálogo pero no lo eran: `enfermero` en vez de `enfermero_universitario`,
-- `cuidados_paliativos` en vez de `paliativos`, `acompanamiento` en vez de
-- `solo_acompanamiento`, y cuatro más que directamente no existían en ningún
-- vocabulario (`movilidad_reducida`, `traslados`, `curaciones`,
-- `estimulacion_cognitiva`).
--
-- Ninguno rompe la base: las columnas son texto libre y aceptan cualquier cosa.
-- Rompen la pantalla. `js/catalogo.js` traduce la clave a su etiqueta y, cuando
-- no la encuentra, muestra la clave cruda: la ficha de la enfermera dice
-- «enfermero» en minúscula y con guión bajo en lugar de «Enfermero/a
-- universitario/a». Un filtro por Tipo de Asistente tampoco la encuentra,
-- porque busca por la clave que ofrece el catálogo y esa fila tiene otra.
--
-- La 0003 ya quedó corregida, así que una base creada desde cero nace bien.
-- Esta migración es para la que ya está andando, que tiene las filas viejas.
--
-- Se actualiza fila por identificador y no por búsqueda de la clave vieja para
-- que las dos bases —la nueva y la reparada— queden con exactamente los mismos
-- valores. Los identificadores son los que fija la 0003 y no cambian.
--
-- Todo lo que se toca acá es inventado (CLAUDE.md §4): no hay una sola persona
-- real en estas cuatro filas.
--
-- Quedan afuera dos columnas que todavía no tienen vocabulario que las gobierne,
-- `schedule_type` y `nationality`: eso es el pendiente 31 y se decide aparte.
-- =====================================================================

update public.caregivers
   set profession = 'enfermero_universitario'
 where id = 'aaaaaaa1-0000-4000-8000-000000000001';

update public.caregivers
   set pathologies = '["acv"]'::jsonb,
       tasks       = '["movilizacion", "solo_acompanamiento"]'::jsonb
 where id = 'aaaaaaa1-0000-4000-8000-000000000002';

update public.caregivers
   set profession  = 'enfermero_universitario',
       pathologies = '["oncologico", "paliativos"]'::jsonb,
       tasks       = '["medicacion", "inyecciones"]'::jsonb
 where id = 'bbbbbbb2-0000-4000-8000-000000000001';

update public.caregivers
   set tasks = '["movilizacion", "solo_acompanamiento"]'::jsonb
 where id = 'bbbbbbb2-0000-4000-8000-000000000002';
