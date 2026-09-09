-- Las Guías de cuidado no llevan números de emergencia, y eso había dejado de
-- estar escrito en ningún lado.
--
-- La regla eran dos prohibiciones dichas juntas, en el encabezado de la
-- migración que cargó las diecinueve guías generales: ningún tratamiento —ni
-- medicamentos, ni dosis, ni maniobras clínicas— y ningún número de emergencia
-- de ningún país. La primera mitad sobrevivió, porque además estaba escrita en
-- el comentario de la tabla; la segunda vivía únicamente en ese encabezado, y
-- cuando las setenta y seis migraciones se juntaron en tres archivos, el
-- aplastamiento se quedó con el estado —las guías— y no con el camino, así que
-- se fue con él.
--
-- Que se haya perdido no la vuelve opinable, y el motivo sigue siendo el
-- mismo: **el número de emergencia cambia por país, y escribirlo adentro de una
-- guía lo convierte en dato del producto en vez de dato de la Prestadora**. La
-- guía la lee un Asistente que puede estar en cualquier lado; la Prestadora es
-- la que sabe dónde opera. Es la misma línea que el producto ya traza en todo
-- lo demás: avisa, no prescribe, y lo que depende del país sale del documento
-- de ese país o no sale.
--
-- Vuelve al comentario de la tabla y al de la columna donde se escribe cómo
-- actuar, que son los dos lugares donde la lee quien va a cargar una guía.
-- Ninguna de las diecinueve que están cargadas lleva un número, así que esto no
-- corrige datos: repone la regla donde tiene que estar para que la próxima
-- tampoco lo lleve. Y el chequeo de guías la comprueba, que es lo que la hace
-- algo más que una buena intención.

COMMENT ON TABLE public.guias_cuidado IS 'Lo que el Asistente necesita saber sobre una opción del catálogo: qué es, qué esperar, qué mirar y cómo actuar en una emergencia. No guarda tratamientos —ni medicamentos, ni dosis, ni maniobras clínicas— ni números de emergencia de ningún país, y las dos cosas son a propósito: el producto avisa, no prescribe, y el número que hay que marcar cambia por país, así que es dato de la Prestadora y no del producto. Cuelga de vocabulario_items, así que sirve igual para patologías, discapacidades y tareas de cuidado.';

COMMENT ON COLUMN public.guias_cuidado.en_emergencia IS 'Cómo actuar, en pasos y en el orden en que se hacen. Lista por idioma; el orden del arreglo es dato. Los pasos dicen qué hacer, nunca a qué número llamar: el número de emergencia cambia por país y escribirlo acá lo convertiría en dato del producto.';

NOTIFY pgrst, 'reload schema';
