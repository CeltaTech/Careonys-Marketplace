-- ---------------------------------------------------------------------------
-- 0011 — La palabra «vidriera» sale de lo que está guardado en la base
-- ---------------------------------------------------------------------------
-- La palabra la había inventado la línea de comandos y nadie la había aprobado.
-- Al Desarrollador le resultó desagradable, con razón: deja al Asistente como un
-- maniquí en exhibición. El 24 de agosto de 2026 pidió cambiarla antes de que se
-- extendiera más. Estaba en 70 lugares de 20 archivos.
--
-- En su lugar va **directorio público**, que no es una palabra nueva: la pantalla
-- ya se llamaba `directorio.html`, la ficha ya se llamaba `perfil.html`, y la
-- casilla del consentimiento ya se llamaba `perfil_publicado`.
--
-- **Las migraciones ya aplicadas no se tocan.** Son el registro de lo que se
-- corrió, y reescribirlas sería cambiar lo que dijeron cuando corrieron. Ahí la
-- palabra vieja se queda. Esta migración cambia únicamente lo que está guardado
-- **adentro** de la base y se lee desde afuera: el nombre de una política y dos
-- comentarios.
--
-- No cambia ni una fila, ni una columna, ni un permiso. Renombrar una política
-- no altera lo que la política deja hacer: la regla, el rol y la condición
-- siguen siendo exactamente los mismos.
-- ---------------------------------------------------------------------------

-- --- 1. La política de Prestadoras -----------------------------------------
-- Creada en 0002. Deja que quien no inició sesión lea el nombre y el color de
-- las Prestadoras activas, que es lo que el directorio necesita para pintarse
-- antes de que nadie se identifique.
alter policy "Vidriera de Prestadoras" on public.tenants
  rename to "Directorio de Prestadoras";

-- --- 2. El comentario de la vista pública ----------------------------------
-- Lo escribió 0002 y lo reescribió 0007. Es la advertencia que lee quien vaya a
-- agregarle una columna, así que importa que se entienda.
comment on view public.caregivers_publicos is
  'Directorio público. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo, y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera.';
