-- 0026: el directorio dice qué se le comprobó a cada legajo
--
-- Por qué
-- -------
-- Cierra la parte (b) del pendiente 43, decidida por el Desarrollador el 26 de
-- agosto de 2026. Su argumento, en dos partes: la publicidad del producto ya
-- promete «qué controlamos a cada Asistente», y quien no pasó el control ni
-- siquiera aparece acá —es Aspirante, no Asistente publicado, y ninguna Familia
-- lo ve—. O sea que decir qué se comprobó de los que sí aparecen no expone a
-- nadie que no haya querido exponerse.
--
-- Qué devuelve, y por qué justo eso
-- ---------------------------------
-- Las cinco comprobaciones que la 0018 ya había fijado y la 0022 conservó, con
-- las mismas claves guardadas: `domicilio`, `referencia`, `matricula`, `titulo`
-- y `curso_aprobado`. No se inventa ninguna palabra: son las que ya acepta el
-- `check` de `ponderacion_comprobacion`.
--
-- Qué NO devuelve, a propósito
-- ----------------------------
-- 1. **Ni fechas ni números.** Una lista de qué se comprobó, y nada más. Con la
--    fecha entra cuánto hace que esa persona está, y con el número entra
--    comparar personas por un puntaje que ni siquiera es el mismo en dos
--    Prestadoras (la ponderación la fija cada una, 0022).
-- 2. **Ni documento, ni antecedentes penales, ni certificado de salud.** Son la
--    puerta: quien está publicado ya los pasó, así que decirlo no distingue a
--    nadie, y son además los tres datos más sensibles del legajo. El pendiente
--    56 ya los había dejado afuera del puntaje por el primer motivo; acá pesa
--    también el segundo.
-- 3. **Ni qué falta.** La lista dice lo que se comprobó. Lo que no está no se
--    nombra: nombrarlo sería publicar el estado de un trámite ajeno.
--
-- Dónde queda el permiso
-- ----------------------
-- No se abre nada nuevo. `directorio` no está concedida a nadie desde la
-- 0021 y se sigue leyendo únicamente por las tres funciones de esa migración,
-- que piden el nombre corto de la Prestadora. Una columna más en la vista viaja
-- por las mismas tres puertas y por ninguna otra.


-- ── 1. La vista, con la lista de lo comprobado ────────────────────────────
-- Mismo cuerpo que la 0017, con una columna agregada al final. Se agrega al
-- final porque `create or replace view` no deja reordenar ni renombrar lo que
-- ya está, y porque las tres funciones de la 0021 devuelven `setof` esta vista:
-- si el orden cambiara, cambiaría lo que ellas devuelven.
--
-- Las dos mitades se concatenan en vez de unirse con `union`: una subconsulta
-- del `select` puede mirar la fila de afuera, pero una tabla derivada adentro
-- de ella ya no, y ésa es la forma en que esto se escribe mal.
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
         c.created_at,
         (
           select coalesce(
                    array_agg(v.tipo order by case v.tipo
                                                when 'domicilio'  then 1
                                                when 'referencia' then 2
                                                when 'matricula'  then 3
                                                when 'titulo'     then 4
                                              end),
                    array[]::text[])
             from public.verificaciones_asistente v
            where v.caregiver_id = c.id
              and v.estado = 'verificado'
              and v.tipo in ('domicilio', 'referencia', 'matricula', 'titulo')
         )
         ||
         -- El curso no es un papel que alguien presentó: es una evaluación que
         -- corrigió la base (0008), así que no vive en `verificaciones_asistente`.
         -- Alcanza con uno aprobado, y no se dice cuántos: el pendiente 56 pide
         -- que el legajo no se vuelva una carrera de cursos.
         case when exists (select 1
                             from public.intentos_evaluacion i
                            where i.caregiver_id = c.id
                              and i.aprobado)
              then array['curso_aprobado']
              else array[]::text[]
         end
         as comprobaciones
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status = 'validado_prestadora'
     and a.perfil_publicado;


-- ── 2. Lo que la vista promete, escrito al lado ───────────────────────────
comment on view public.directorio is
  'Directorio de Asistentes. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora), y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera. `gender` y `comprobaciones` están acá por decisión suya del 26 de agosto de 2026 (pendiente 43), y el consentimiento de publicación las nombra a las dos: una columna que el consentimiento no nombre no puede salir por acá.';

comment on column public.directorio.comprobaciones is
  'Qué se le comprobó a este legajo, de las cinco de ponderacion_comprobacion. Sin fechas y sin números, y sin las tres de la puerta —documento, antecedentes penales y salud—, que las pasaron todos los que aparecen acá. Lista vacía cuando no se le comprobó ninguna: eso no es un error, es que todavía no se le comprobó ninguna.';


notify pgrst, 'reload schema';
