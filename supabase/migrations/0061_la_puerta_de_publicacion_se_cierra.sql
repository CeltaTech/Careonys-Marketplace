-- =====================================================================
-- 0061 — La puerta de publicación se cierra
-- =====================================================================
--
-- Qué estaba mal
-- --------------
-- `data/catalogo-verificaciones.json` declara desde el 24 de agosto de 2026
-- qué papel frena qué cosa: `dni` frena el alta; antecedentes penales y
-- certificado de salud frenan la publicación —y también matrícula y título,
-- cuando el tipo de Asistente los exige—; domicilio y referencia no frenan
-- nada. **Ninguna de esas puertas existía en el código.** El archivo lo
-- nombraban siete documentos y dos migraciones, y no lo abría ninguna
-- pantalla ni ningún guion.
--
-- Peor todavía: la vista del directorio ya lo prometía en su propio
-- comentario. La 0026 escribió, al lado de la columna `comprobaciones`, que
-- ahí no salen «las tres de la puerta —documento, antecedentes penales y
-- salud—, **que las pasaron todos los que aparecen acá**». No las pasaba
-- nadie: la vista tenía dos condiciones y ninguna miraba una verificación.
-- O sea que un legajo llegaba al directorio, y una Familia lo contrataba,
-- sin que la Prestadora hubiera comprobado un solo papel de los que hacen
-- falta para entrar a una casa.
--
-- Quedó a la vista al cerrar el pendiente 70, que construyó la pantalla
-- donde se marca cada verificación: marcar ya se podía, y lo marcado no
-- cambiaba todavía qué se dejaba hacer.
--
-- Qué hace esta migración
-- -----------------------
-- Dos cosas, y la primera es la que importa.
--
-- **La puerta se guarda en la base, no en el código.** Cada verificación del
-- vocabulario `verificacion` estrena en su `extra` la puerta que frena, con
-- las mismas palabras del catálogo: `alta`, `publicacion` o `ninguna`. Así la
-- decisión sigue siendo un dato —que es lo que pide la regla «los catálogos
-- salen de la base»— y el día que la Prestadora quiera exigir un papel más,
-- eso es una fila y no una publicación de versión nueva.
--
-- **Y la vista del directorio la aplica.** Tercera condición, además de las
-- dos que ya tenía. Se escribe una sola vez y acá: el directorio es el único
-- lugar donde «no aparece en la modalidad ni puede ser contratado» significa algo.
--
-- Lo que NO hace, a propósito
-- ---------------------------
-- **La puerta del alta no se cierra acá**, y no por olvido: el catálogo la
-- define como «terminar de cargar el legajo», y quien carga el legajo es el
-- Aspirante, mientras que quien marca la verificación del documento es la
-- Prestadora, después. Cerrarla como está escrita dejaría a todo el mundo sin
-- poder terminar el alta hasta que alguien le mire el documento, que no puede
-- ser lo que se quiso decir. Queda en el pendiente 143 con la pregunta hecha.
--
-- **Los plazos tampoco**: los quince días de los antecedentes penales y las
-- vigencias son el pendiente 98, con su plan en `docs/PLAN_VENCIMIENTOS.md`.
-- Acá una verificación vencida se marca a mano como «Vencido», y con eso
-- deja de ser `verificado` y la puerta se cierra sola.
--
-- Cómo falla
-- ----------
-- Cerrado, en los tres casos en que no entiende algo: si el tipo de Asistente
-- de la persona no está en el vocabulario, el papel condicional **se exige
-- igual**; si la condición nombra algo que este código no conoce, **se exige
-- igual**; y si no hay ninguna fila de verificación, no hay nada comprobado.
-- Un control que ante la duda deja pasar es el que no entendió justo el caso
-- que importaba.
-- =====================================================================


-- ── 1. Qué puerta frena cada papel, guardado donde se puede consultar ─────
-- Los valores salen tal cual de `data/catalogo-verificaciones.json`. La
-- condición de matrícula y título se guarda con el mismo nombre que usa el
-- catálogo, `tipo_asistente.requiere_matricula`, que es una clave que la base
-- ya sabe contestar: está en el `extra` del vocabulario `tipo_asistente`.
update public.vocabulario_items vi
   set extra = vi.extra || x.agrega
  from (values
          ('dni',        '{"puerta": "alta"}'::jsonb),
          ('penales',    '{"puerta": "publicacion"}'::jsonb),
          ('salud',      '{"puerta": "publicacion"}'::jsonb),
          ('matricula',  '{"puerta": "publicacion", "condicional_a": "tipo_asistente.requiere_matricula"}'::jsonb),
          ('titulo',     '{"puerta": "publicacion", "condicional_a": "tipo_asistente.requiere_matricula"}'::jsonb),
          ('domicilio',  '{"puerta": "ninguna", "suma_al_perfil": true}'::jsonb),
          ('referencia', '{"puerta": "ninguna", "suma_al_perfil": true}'::jsonb)
       ) as x(clave, agrega)
 where vi.clave = x.clave
   and vi.tenant_id is null
   and vi.vocabulario_id = (select id from public.vocabularios
                             where clave = 'verificacion' and tenant_id is null);


-- ── 2. La vista, con la puerta puesta ────────────────────────────────────
-- Se repite entera porque `create or replace view` no admite otra cosa. Lo
-- único nuevo está al final, en el `where`: todo lo de arriba viene de la
-- 0037 sin tocar una coma.
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
     and a.perfil_publicado
     -- Tercera condición: ningún papel de la puerta `publicacion` sin
     -- comprobar. Se pregunta al revés —«que no exista uno que falte»—
     -- porque así la lista de papeles la decide el vocabulario y no este
     -- renglón, y agregar uno más no vuelve a tocar la vista.
     and not exists (
           select 1
             from public.vocabulario_items vi
             join public.vocabularios vo on vo.id = vi.vocabulario_id
            where vo.clave = 'verificacion'
              and vo.tenant_id is null
              -- La Prestadora puede agregar papeles suyos a esta lista, y si
              -- lo hace rigen para su gente y para nadie más.
              and (vi.tenant_id is null or vi.tenant_id = c.tenant_id)
              and vi.activo
              and vi.extra->>'puerta' = 'publicacion'
              -- El condicional no es opcional: exige sólo cuando el tipo de
              -- Asistente lo pide. Ante cualquier duda, exige.
              and case
                    when vi.extra ? 'condicional_a' then
                      case vi.extra->>'condicional_a'
                        when 'tipo_asistente.requiere_matricula' then
                          coalesce(
                            (select ti.extra->>'requiere_matricula'
                               from public.vocabulario_items ti
                               join public.vocabularios tv on tv.id = ti.vocabulario_id
                              where tv.clave = 'tipo_asistente'
                                and tv.tenant_id is null
                                and ti.clave = c.profession
                                and (ti.tenant_id is null
                                     or ti.tenant_id = c.tenant_id)
                              limit 1),
                            -- Tipo de Asistente que el vocabulario no conoce:
                            -- se exige el papel.
                            'true') = 'true'
                        -- Condición que este código no sabe contestar: se
                        -- exige el papel.
                        else true
                      end
                    else true
                  end
              and not exists (select 1
                                from public.verificaciones_asistente v
                               where v.caregiver_id = c.id
                                 and v.tipo = vi.clave
                                 and v.estado = 'verificado')
         );


-- ── 3. Lo que la vista promete, ahora escrito de verdad ──────────────────
comment on view public.directorio is
  'Directorio de Asistentes. Tres condiciones, y las tres hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora); la persona marcó perfil_publicado; y el legajo tiene comprobado cada papel que el vocabulario `verificacion` marca con puerta `publicacion` —los condicionales sólo cuando el tipo de Asistente los exige—. Esa tercera es de la 0061: hasta entonces la vista prometía en este mismo comentario que los papeles de la puerta los habían pasado todos, y no los miraba nadie. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera. gender y comprobaciones están acá por decisión suya del 26 de agosto de 2026 (pendiente 43), y el consentimiento de publicación las nombra a las dos: una columna que el consentimiento no nombre no puede salir por acá.';

comment on column public.directorio.comprobaciones is
  'Qué se le comprobó a este legajo, de las cinco de ponderacion_comprobacion. Sin fechas y sin números, y sin las de la puerta —documento, antecedentes penales y salud—, que desde la 0061 las pasaron de verdad todos los que aparecen acá. Lista vacía cuando no se le comprobó ninguna de las cinco: eso no es un error, es que todavía no se le comprobó ninguna.';


-- ── 4. Que esta migración no pueda pasar sin hacer nada ──────────────────
-- Una migración que corre entera y no cambia nada da verde igual, y ése es
-- justo el resultado que no sirve.
do $$
declare
  con_puerta   integer;
  publicacion  integer;
  condicional  integer;
begin
  select count(*) filter (where vi.extra ? 'puerta'),
         count(*) filter (where vi.extra->>'puerta' = 'publicacion'),
         count(*) filter (where vi.extra ? 'condicional_a')
    into con_puerta, publicacion, condicional
    from public.vocabulario_items vi
    join public.vocabularios vo on vo.id = vi.vocabulario_id
   where vo.clave = 'verificacion'
     and vo.tenant_id is null
     and vi.tenant_id is null;

  if con_puerta <> 7 or publicacion <> 4 or condicional <> 2 then
    raise exception
      'La puerta no quedó guardada: % con puerta (7), % de publicación (4), % condicionales (2)',
      con_puerta, publicacion, condicional;
  end if;
end $$;


notify pgrst, 'reload schema';
