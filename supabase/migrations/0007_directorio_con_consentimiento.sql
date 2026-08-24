-- ============================================================================
-- 0007 — El directorio muestra sólo a quien dio permiso
-- ============================================================================
--
-- Qué estaba mal
-- --------------
-- `caregivers_publicos` (0002 §5) mostraba a todo el que tuviera el legajo
-- validado. Validado quiere decir «la Prestadora revisó los papeles»: es una
-- comprobación de la Prestadora, no una respuesta de la persona. Publicar un
-- legajo porque los papeles están en orden es tomarle la decisión a alguien
-- que nunca la tomó.
--
-- La respuesta existe desde la migración 0004: `banderas_asistente`, con
-- `perfil_publicado` arrancando en `false`. Hasta hoy nadie la miraba. El
-- comentario de esa tabla ya decía que el directorio tenía que preguntarle;
-- esta migración es el otro extremo de esa frase.
--
-- Y arranca en `false` a propósito: **la falta de respuesta nunca puede
-- terminar en un perfil publicado**. Por eso el cruce es un `join` común y no
-- un `left join` — quien no tiene fila de banderas, no dio permiso, y no se
-- muestra. Los cuatro perfiles de muestra, que son anteriores a la 0004 y no
-- tienen banderas, desaparecen del directorio. Está bien que desaparezcan:
-- son inventados, y ninguno contestó nada.
--
-- La foto
-- -------
-- El directorio no tenía dónde sacar una cara. `caregivers` no tiene columna de
-- foto: el camino vive adentro de `documents`, junto con los del documento de
-- identidad, los antecedentes y el título. Acá se saca **sólo** la clave
-- `foto`, que es la única que apunta al depósito público `avatares`
-- (migración 0006). Las otras tres apuntan al depósito privado y no salen de
-- esta vista bajo ninguna circunstancia.
--
-- Lo que esta migración NO decide
-- -------------------------------
-- Si el directorio se ve sin iniciar sesión, y si muestra una Prestadora o
-- todas, sigue abierto: es el pendiente 2 y lo decide el Desarrollador. Lo de
-- acá vale igual en las tres salidas posibles, porque ninguna de las tres
-- incluye mostrar a quien dijo que no.
-- ============================================================================

-- Se rehace en vez de reemplazarse: `create or replace view` no deja cambiar
-- el orden ni el nombre de las columnas, y acá aparecen dos nuevas en el medio.
-- Al borrarla se van también los permisos, así que se vuelven a dar abajo.
drop view if exists public.caregivers_publicos;

create view public.caregivers_publicos as
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
         b.disponible_urgencias,
         c.created_at
    from public.caregivers c
    join public.banderas_asistente b on b.caregiver_id = c.id
   where c.verification_status in ('validado_prestadora', 'validado')
     and b.perfil_publicado;

comment on view public.caregivers_publicos is
  'Directorio de Asistentes. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo, y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado.';

grant select on public.caregivers_publicos to anon;
grant select on public.caregivers_publicos to authenticated;
