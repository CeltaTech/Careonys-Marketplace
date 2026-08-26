-- ===================================================
-- SE VAN LAS SOBRAS DE LA BASE PUBLICADA
--
-- POR QUÉ. Al comparar las dos bases el 26 de agosto de 2026 aparecieron once
-- filas que están publicadas y ninguna migración carga: seis legajos y cinco
-- perfiles. No son datos de nadie —esta base nunca tuvo datos reales—, son lo
-- que quedó de probar pantallas a mano antes de que existiera la regla de que
-- todo entra por una migración.
--
-- Y desprolijo no es sólo feo: es que la demostración los muestra. En el
-- directorio de la Organización de pruebas aparecían tres veces la misma
-- persona inventada, un legajo con todos los campos vacíos, y un correo con el
-- nombre anterior del producto adentro. El Desarrollador lo pidió el 26 de
-- agosto de 2026: aunque sean ficticios, los datos tienen que ser coherentes.
--
-- QUÉ SE BORRA, UNO POR UNO. Se nombran acá para que quede el rastro de qué
-- había, porque después de esta migración ya no se puede mirar:
--
--   Legajos (`caregivers`)
--     0b1c6a04-9cf8-4c9a-97c1-2089da1725d3  «Doña Pirulita»
--     6e0d7106-c23a-49f3-bc89-737b028b86ad  «Doña Pirulita»   (repetida)
--     90a0a666-5e8f-4be1-9a4a-f2ce521a0b7b  «Doña Pirulita»   (repetida)
--     0147b0f4-baa6-498d-99e9-6800dcf0fcfb  sin nombre, sin documento, sin nada
--     e9f291c4-05d7-46a2-8d64-cab6a26114be  «Ana Gomez»
--     44444444-4444-4444-4444-444444444444  «María González»
--
--   Perfiles (`profiles`)
--     11111111-1111-1111-1111-111111111111  «Admin CeltaTech»
--     22222222-2222-2222-2222-222222222222  «Carlos Coordinador»
--     33333333-3333-3333-3333-333333333333  «Ana Usuario»
--     2131fa86-418b-4e93-b347-3d68b2c98d43  «Carlos Coordinador» (repetido)
--     f7ddc0d6-db18-4c4a-82b7-47b4e794bca7  «Usuario Familiar»
--
--   Los tres primeros perfiles tienen identificador escrito a mano —unos y
--   dos y tres repetidos—, que ninguna cuenta de acceso genera. Los otros dos
--   se cargaron en la misma transacción, al mismo microsegundo, cosa que dos
--   altas separadas no hacen. Ninguno de los cinco lo escribió el disparador
--   que crea el perfil al registrarse alguien.
--
-- CÓMO SE BORRA. Doce tablas apuntan a un legajo, así que primero se va lo que
-- cuelga y recién después el legajo. El borrado va por identificador, uno por
-- uno: no se borra «lo que no cargó ninguna migración», porque una condición
-- así se lleva puesto también lo que cargue alguien mañana usando el producto.
--
-- QUÉ NO HACE, Y POR QUÉ SE DICE. Una cuenta de acceso que haya quedado sin su
-- perfil no la toca esta migración: `auth` no es de este esquema y borrar ahí
-- desde acá saldría del alcance de las migraciones del producto. Si quedara
-- alguna, es una cuenta ficticia que ya no podía entrar a ninguna parte.
--
-- EN LA BASE LOCAL NO HACE NADA. Ninguno de esos once identificadores existe
-- en una base recién construida, que es justamente de lo que se trata: después
-- de esta migración las dos bases dicen lo mismo.
-- ===================================================

do $$
declare
  -- Los once que se van, escritos una sola vez. El borrado va por
  -- identificador: no se borra «lo que no cargó ninguna migración», porque una
  -- condición así se lleva puesto también lo que cargue alguien mañana usando
  -- el producto.
  legajos uuid[] := array[
    '0b1c6a04-9cf8-4c9a-97c1-2089da1725d3',
    '6e0d7106-c23a-49f3-bc89-737b028b86ad',
    '90a0a666-5e8f-4be1-9a4a-f2ce521a0b7b',
    '0147b0f4-baa6-498d-99e9-6800dcf0fcfb',
    'e9f291c4-05d7-46a2-8d64-cab6a26114be',
    '44444444-4444-4444-4444-444444444444'
  ]::uuid[];
  perfiles uuid[] := array[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '2131fa86-418b-4e93-b347-3d68b2c98d43',
    'f7ddc0d6-db18-4c4a-82b7-47b4e794bca7'
  ]::uuid[];
begin
  -- 1. Lo que cuelga de un legajo. Las doce tablas que lo referencian, en
  --    orden alfabetico para que se pueda comprobar contra el catalogo de
  --    claves foraneas sin tener que confiar en que estan todas.
  delete from public.autorizaciones_asistente      where caregiver_id = any(legajos);
  delete from public.clock_ins                     where caregiver_id = any(legajos);
  delete from public.disponibilidad_asistente      where caregiver_id = any(legajos);
  delete from public.documentos_asistente          where caregiver_id = any(legajos);
  delete from public.estudios_asistente            where caregiver_id = any(legajos);
  delete from public.experiencia_laboral_asistente where caregiver_id = any(legajos);
  delete from public.franjas_asistente             where caregiver_id = any(legajos);
  delete from public.intentos_evaluacion           where caregiver_id = any(legajos);
  delete from public.matriculas_asistente          where caregiver_id = any(legajos);
  delete from public.referencias_asistente         where caregiver_id = any(legajos);
  delete from public.reportes                      where caregiver_id = any(legajos);
  delete from public.verificaciones_asistente      where caregiver_id = any(legajos);

  -- 2. El legajo.
  delete from public.caregivers where id = any(legajos);

  -- 3. Los perfiles.
  delete from public.profiles where id = any(perfiles);
end $$;

notify pgrst, 'reload schema';
