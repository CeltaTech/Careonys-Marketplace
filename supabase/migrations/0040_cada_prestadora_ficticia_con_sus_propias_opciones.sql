-- =====================================================================
-- 0040 — Las Prestadoras ficticias cargan opciones propias
--
-- La 0038 dejó hecho el segundo escalón del catálogo: `tenant_id`
-- cargado es lo que agregó una Prestadora. Sin ninguna fila así, ese
-- escalón queda escrito y nunca ejecutado, y **una prueba que no puede
-- fallar no prueba nada**: comprobar que una Prestadora no ve opciones
-- ajenas no significa nada si no hay ninguna opción ajena que ver.
--
-- Por eso las dos Prestadoras que tienen actividad cargan listas
-- **distintas**, igual que hizo la 0035 con las zonas. Si las dos
-- cargaran lo mismo, ver «Esclerosis múltiple» desde Cuidar Norte no
-- distinguiría entre leer lo propio y leer lo ajeno.
--
-- **Cuidar Sur no carga ninguna**, y tampoco es un descuido: es la
-- Prestadora que prueba el camino de sólo tener el catálogo general, que
-- es el que va a tener cualquier cliente el día que se da de alta.
--
-- **Y esto deja a la vista un agujero del producto, no lo tapa.** Estas
-- filas entran por migración porque **no existe la pantalla** donde una
-- Prestadora agrega una opción. Las Prestadoras ficticias se tratan como
-- clientes reales, así que un dato que hoy sólo se puede cargar desde
-- una migración es una pantalla que falta. Queda anotado en
-- `docs/PENDIENTES.md`.
--
-- Los textos van en castellano solo, y eso es lo correcto: lo que carga
-- una Prestadora es dato suyo, en su idioma. La regla de i18n rige el
-- texto que escribimos nosotros. Es lo mismo que ya decidió la 0035 para
-- los nombres de las zonas, y lo que el `check` de la 0038 exige.
-- =====================================================================

-- --- PresDemo: dos patologías más y una certificación ---------------------
-- Es la Prestadora grande del Área Metropolitana, generalista. Atiende cosas
-- que la lista de diecinueve no trae.
insert into public.vocabulario_items (tenant_id, vocabulario_id, clave, i18n, orden)
select t.id, v.id, x.clave, x.i18n, x.orden
  from (values
    ('patologia',     'esclerosis_multiple', '{"es-AR": "Esclerosis múltiple"}'::jsonb, 101),
    ('patologia',     'insuficiencia_renal', '{"es-AR": "Insuficiencia renal en diálisis"}'::jsonb, 102),
    ('certificacion', 'rcp_avanzada',        '{"es-AR": "RCP avanzada"}'::jsonb,        101)
  ) as x(vocabulario, clave, i18n, orden)
  join public.vocabularios v on v.tenant_id is null and v.clave = x.vocabulario
  cross join public.tenants t
 where t.slug = 'presdemo'
on conflict (vocabulario_id, tenant_id, clave) do nothing;

-- --- Cuidar Norte: otra patología y una tarea de cuidado propia -----------
-- Lista distinta y más corta, que es lo que hace que la prueba de aislamiento
-- signifique algo.
insert into public.vocabulario_items (tenant_id, vocabulario_id, clave, i18n, orden)
select t.id, v.id, x.clave, x.i18n, x.orden
  from (values
    ('patologia',     'fibromialgia',           '{"es-AR": "Fibromialgia"}'::jsonb,           101),
    ('tarea_cuidado', 'traslado_a_turnos',      '{"es-AR": "Traslado a turnos médicos"}'::jsonb,  101)
  ) as x(vocabulario, clave, i18n, orden)
  join public.vocabularios v on v.tenant_id is null and v.clave = x.vocabulario
  cross join public.tenants t
 where t.slug = 'cuidarnorte'
on conflict (vocabulario_id, tenant_id, clave) do nothing;

notify pgrst, 'reload schema';
