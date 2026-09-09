--
-- 0003 — Se reescriben los comentarios de tres tablas
--
-- Por qué existe: los comentarios de `avisos`, `cursos` y `oferta_comercial` se
-- escribieron definiendo esta modalidad por contraste con otra, y el
-- Desarrollador ordenó el 9 de septiembre de 2026 sacar del producto toda
-- mención a esa otra: el negocio ya está definido y la comparación sólo
-- confunde. Los comentarios de 0001 no se editan —una migración aplicada no se
-- toca nunca—, así que se vuelven a declarar acá sin esa frase. `COMMENT ON`
-- reemplaza el comentario anterior, así que esta migración corre entera y sola.
--

COMMENT ON TABLE public.avisos IS 'Lo que una Familia publica cuando necesita cuidado: qué hace falta, para quién, dónde y cuándo. Se llamaba care_searches hasta el 25 de agosto de 2026, y el nombre estaba mal: una búsqueda es el acto de buscar y no queda guardada; lo que queda guardado es el aviso. Esta tabla existe sólo en esta modalidad: donde el trabajo se asigna, nadie publica nada.';

COMMENT ON TABLE public.cursos IS 'Oferta de cursos. tenant_id nulo = oferta general de CeltaTech; cargado = curso propio de esa Prestadora. Módulo compartido: sirve igual independientemente de cómo llegó el trabajo.';

COMMENT ON TABLE public.oferta_comercial IS 'La oferta comercial de la portada (antes sólo en data/catalogo-oferta.json). tenant_id nulo = oferta general de CeltaTech. No es "Servicio" del glosario compartido: acá no hay Guardias.';

NOTIFY pgrst, 'reload schema';
