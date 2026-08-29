-- =====================================================================
-- 0037 — Quien cubre toda una región aparece al buscar un municipio
--         de adentro
--
-- Apareció probando el filtro del directorio, el mismo día que se aplicó
-- la 0036. Marta Quiroga cubre **toda** la Zona Norte —tildó la región
-- entera, que es una sola fila—, y buscando «San Isidro» no aparecía.
-- La respuesta era falsa: cubre San Isidro, y el directorio decía que
-- no.
--
-- El motivo es que el filtro compara la clave elegida contra las claves
-- que la persona tildó, y «zona_norte» y «san_isidro» son dos claves
-- distintas. Lo que faltaba no era una zona más en la respuesta de nadie
-- —la 0035 decidió a propósito que una región entera se guarde como una
-- sola fila, y eso no cambia—: faltaba decir **qué alcanza** esa fila.
--
-- Por eso la columna nueva es aparte de `zonas` y no la reemplaza. Son
-- dos preguntas distintas y se contestan distinto:
--
--   * `zonas` es **lo que la persona contestó**, y es lo que se muestra.
--     Marta contestó «toda la Zona Norte», y el perfil dice eso.
--   * `zonas_claves` es **hasta dónde llega esa respuesta**, y es contra
--     lo que se filtra. La de Marta incluye San Isidro, Vicente López y
--     Grand Bourg sin que ella los haya nombrado.
--
-- Mezclarlas sería volver atrás la decisión de la 0035 por la puerta de
-- servicio: el perfil pasaría a listarle a Marta tres municipios que no
-- eligió, y el día que la Prestadora agregue un cuarto al Norte, Marta
-- lo cubriría sin enterarse.
-- =====================================================================


-- ── 1. La vista, con el alcance al final ──────────────────────────────────
-- Tercera columna agregada al final, por la misma razón de siempre: las
-- funciones de la 0021 devuelven `setof` esta vista.
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
         case when exists (select 1
                             from public.intentos_evaluacion i
                            where i.caregiver_id = c.id
                              and i.aprobado)
              then array['curso_aprobado']
              else array[]::text[]
         end
         as comprobaciones,
         -- Las zonas que tildó, cada una con su región al lado. Una región
         -- tildada entera se devuelve como su propia región: así la pantalla
         -- junta las regiones sin preguntar dos veces.
         (
           select coalesce(
                    jsonb_agg(
                      jsonb_build_object(
                        'clave',         z.clave,
                        'nombre',        z.nombre,
                        'es_region',     z.zona_padre_id is null,
                        'region_clave',  coalesce(r.clave,  z.clave),
                        'region_nombre', coalesce(r.nombre, z.nombre))
                      -- Por región, y adentro de cada una la región entera
                      -- primero: `r.nombre` es nulo justo en esa fila.
                      order by coalesce(r.orden, z.orden), r.nombre nulls first,
                               z.orden, z.nombre),
                    '[]'::jsonb)
             from public.zonas_asistente za
             join public.zonas_cobertura z on z.id = za.zona_id
             left join public.zonas_cobertura r on r.id = z.zona_padre_id
            where za.caregiver_id = c.id
              and z.activa
         ) as zonas,
         c.zonas_texto,
         -- Todas las claves que esa respuesta alcanza: la zona tildada, la
         -- región de la que cuelga, y —cuando lo tildado es una región
         -- entera— cada una de sus zonas activas. Sólo para filtrar: esto no
         -- se muestra en ninguna pantalla.
         (
           select coalesce(array_agg(distinct cl.clave), array[]::text[])
             from public.zonas_asistente za
             join public.zonas_cobertura z on z.id = za.zona_id and z.activa
             left join public.zonas_cobertura r on r.id = z.zona_padre_id
             cross join lateral (
                          select z.clave
                          union all select r.clave
                          union all select h.clave
                                      from public.zonas_cobertura h
                                     where h.zona_padre_id = z.id
                                       and h.activa
                        ) as cl(clave)
            where za.caregiver_id = c.id
              and cl.clave is not null
         ) as zonas_claves
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status = 'validado_prestadora'
     and a.perfil_publicado;

comment on column public.directorio.zonas_claves is
  'Hasta dónde llega lo que esa persona contestó, en claves del vocabulario zona. No es lo que contestó —eso es la columna zonas— sino su alcance: una región tildada entera trae acá todas sus zonas activas. Existe para que el filtro del directorio conteste bien, y no se muestra en ninguna pantalla.';


-- ── 2. El esquema, de nuevo ───────────────────────────────────────────────
notify pgrst, 'reload schema';
