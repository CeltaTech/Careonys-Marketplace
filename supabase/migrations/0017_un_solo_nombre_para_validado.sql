-- 0017: «validado» y «validado_prestadora» decían lo mismo, y una nadie la escribía
--
-- Qué estaba mal
-- --------------
-- `caregivers.verification_status` aceptaba dos valores para decir una sola
-- cosa. La 0007 ya había escrito qué significa: «Validado quiere decir "la
-- Prestadora revisó los papeles"» (0007:8). Eso es exactamente lo que dice
-- `validado_prestadora` con todas las letras.
--
-- Los dos pasaban en todos lados y **`validado` no lo escribía nadie**: el
-- único lugar que asigna un estado validado es `panel-prestadora.html:335`, y
-- pone `validado_prestadora`. El valor corto sólo aparecía leído, y en una
-- fila de ejemplo (0003:70).
--
-- Un valor que nada escribe y que significa lo mismo que otro no es un estado:
-- es una manera de que dos partes del sistema no se entiendan. Se queda el
-- nombre que dice quién validó.
--
-- Qué hace
-- --------
--   1. Las filas que dicen `validado` pasan a decir `validado_prestadora`.
--   2. El directorio deja de nombrar el valor muerto.
--
-- Qué NO hace: cerrar la lista de estados con un `check`. Para eso hace falta
-- saber cuáles son todos, y hoy el código nombra cuatro —`en_revision`,
-- `validado_prestadora`, `rechazado`, `pendiente`— sin que ningún lugar diga
-- que ésos son todos. Queda para cuando se decida la lista completa.
--
-- La política de la 0001:289 también lo nombraba, pero la 0002:83 ya la había
-- borrado: no queda nada que tocar ahí.


-- ── 1. Las filas ───────────────────────────────────────────────────────────
update public.caregivers
   set verification_status = 'validado_prestadora'
 where verification_status = 'validado';


-- ── 2. El directorio ───────────────────────────────────────────────────────
-- Mismo cuerpo que la 0012 §4, con una sola diferencia: el `where` nombra un
-- estado en lugar de dos. La vista se llama `directorio` desde la 0015.
create or replace view public.directorio as
  select c.id,
         c.tenant_id,
         c.full_name,
         c.profession,
         c.zone,
         c.pathologies,
         c.tasks,
         c.hourly_rate,
         c.gender,
         -- Camino dentro del depósito público `avatares`. Nunca una dirección
         -- firmada: esas vencen, y guardar una es guardar algo que deja de
         -- funcionar.
         c.documents->>'foto' as foto,
         coalesce(d.reemplazos_urgentes, false) as reemplazos_urgentes,
         c.created_at
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status = 'validado_prestadora'
     and a.perfil_publicado;

comment on view public.directorio is
  'Directorio de Asistentes. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora), y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera.';

grant select on public.directorio to anon;
grant select on public.directorio to authenticated;
