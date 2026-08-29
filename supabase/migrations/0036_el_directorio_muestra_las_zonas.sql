-- =====================================================================
-- 0036 — El directorio y el perfil muestran las zonas, no la zona
--
-- La 0035 hizo que un Asistente cubra varias zonas, y dejó a medias lo
-- que ese cambio arrastraba: `directorio` seguía devolviendo
-- `caregivers.zone`, una sola. La tarjeta mostraba «Palermo» de alguien
-- que había tildado ocho zonas, y el perfil mostraba lo mismo. La
-- respuesta completa estaba cargada y no se veía en ninguna parte, que
-- es la peor de las dos formas de fallar: el dato existe, la pantalla
-- dice otra cosa, y nadie se entera.
--
-- Tres decisiones, y las tres estaban escritas en el plan antes de tocar
-- esto (`docs/PLAN_ZONAS_DE_COBERTURA.md`, secciones 4.3 y 7c):
--
--   1. **La tarjeta muestra regiones, no municipios.** Ocho nombres en
--      una tarjeta que se lee de un vistazo la vuelven ilegible. Quien
--      tildó tres municipios del Oeste cubre el Oeste, así que la
--      tarjeta dice «Zona Oeste» y el detalle queda para el perfil.
--      Por eso cada zona viaja con su región al lado: la pantalla no
--      tiene de dónde deducirla.
--   2. **`zonas_texto` sale por acá.** Sin eso, el Asistente de una
--      Prestadora que todavía no armó su lista aparecería en el
--      directorio sin decir dónde trabaja — y ésa es justamente la
--      Prestadora que más lejos está de que la encuentren.
--   3. **`caregivers.zone` se queda donde está.** No se borra ni se
--      vacía: es historial, y la regla dice que lo guardado no se
--      renombra ni se tira. La pantalla deja de leerlo cuando hay
--      zonas cargadas, y lo sigue usando de respaldo si no hay
--      ninguna.
--
-- **Lo que este archivo NO agrega:** ningún dato de contacto y ninguna
-- columna que el consentimiento no nombre. El consentimiento de
-- publicación dice «su zona» desde que se escribió; el mismo día que
-- esta migración se aplicó, ese texto pasó a decir «sus zonas de
-- cobertura» en los tres idiomas (`data/catalogo-autorizaciones.json`),
-- porque un consentimiento que nombra menos de lo que se publica no es
-- un consentimiento.
-- =====================================================================


-- ── 1. La vista, con las zonas al final ───────────────────────────────────
-- Mismo cuerpo que la 0026, con dos columnas agregadas al final y por la
-- misma razón que aquella las agregó ahí: `create or replace view` no deja
-- reordenar ni renombrar lo que ya está, y las tres funciones de la 0021
-- devuelven `setof` esta vista.
--
-- `zonas` es jsonb y no un arreglo de texto porque cada zona necesita cuatro
-- cosas —cómo se llama, con qué clave se traduce, de qué región cuelga y si
-- ella misma es una región— y cuatro arreglos paralelos son cuatro formas de
-- desalinearse.
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
         c.zonas_texto
    from public.caregivers c
    join public.autorizaciones_asistente a on a.caregiver_id = c.id
    left join public.disponibilidad_asistente d on d.caregiver_id = c.id
   where c.verification_status = 'validado_prestadora'
     and a.perfil_publicado;


-- ── 2. Lo que las columnas nuevas prometen ────────────────────────────────
comment on view public.directorio is
  'Directorio de Asistentes. Dos condiciones, y las dos hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora), y la persona marcó perfil_publicado. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera. gender y comprobaciones están acá por decisión suya del 26 de agosto de 2026 (pendiente 43), y el consentimiento de publicación las nombra a las dos: una columna que el consentimiento no nombre no puede salir por acá.';

comment on column public.directorio.zonas is
  'Dónde trabaja, en la lista de la Prestadora. Cada elemento trae clave, nombre, es_region y la región de la que cuelga (region_clave y region_nombre, que apuntan a ella misma cuando es una región). Lista vacía cuando la Prestadora no armó su lista: ahí lo que dice dónde trabaja es zonas_texto. Sólo las zonas activas: una zona que la Prestadora dio de baja deja de mostrarse sin borrar lo que la persona respondió.';

comment on column public.directorio.zonas_texto is
  'Dónde puede trabajar, escrito con sus palabras. Sale por acá porque sin esto el Asistente de una Prestadora sin lista aparecería en el directorio sin decir dónde trabaja.';


-- ── 3. Que los legajos ficticios ejerciten lo que la vista ahora devuelve ─
-- La 0035 le dio a cada legajo que ya existía una sola zona: la que tenía en
-- `caregivers.zone`. Con eso la columna nueva funciona y no se ve: doce
-- personas cubriendo una zona cada una dibujan exactamente la misma tarjeta
-- que dibujaba antes, así que el directorio pasaría la prueba sin haber
-- probado nada.
--
-- Los datos son inventados, y por eso mismo tienen que ser coherentes: quien
-- trabaja en Palermo cubre Recoleta y Belgrano, que están al lado, y no
-- Quilmes. El reparto ejercita los cuatro casos que la pantalla distingue:
-- varias zonas de una región, una región entera tildada, varias regiones, y
-- más regiones de las que entran en una tarjeta.
insert into public.zonas_asistente (tenant_id, caregiver_id, zona_id)
select c.tenant_id, c.id, z.id
  from public.caregivers c
  join public.tenants t on t.id = c.tenant_id
  join public.zonas_cobertura z
    on z.tenant_id = c.tenant_id
   and z.clave = any (case
     -- Tres barrios vecinos de la Ciudad: una región en la tarjeta, tres
     -- nombres en el perfil.
     when c.full_name = 'Alejandra Sosa Ficticia' then array['palermo','recoleta','belgrano']
     when c.full_name = 'Ester Villalba Ficticia' then array['belgrano','nunez','villa_urquiza']
     when c.full_name = 'Nadia Britos Ficticia'   then array['flores','caballito']
     -- Cuatro regiones: la tarjeta muestra tres y dice cuántas faltan.
     when c.full_name = 'Ramiro Cáceres Ficticio'
       then array['caballito','flores','moron','san_isidro','avellaneda']
     -- Dos municipios del Oeste, cada uno desde el otro lado.
     when c.full_name = 'Diego Ferreyra Ficticio' then array['moron','ramos_mejia']
     when c.full_name = 'Lorena Maidana Ficticia' then array['ramos_mejia','moron']
     when c.full_name = 'Omar Zabala Ficticio'
       then array['san_isidro','vicente_lopez','grand_bourg']
     -- Una región entera más un municipio suelto de otra: las dos formas de
     -- responder conviven en la misma persona, que es el caso que más fácil
     -- se rompe.
     when c.full_name = 'Silvia Ledesma Ficticia' then array['zona_oeste','quilmes']
     else array[]::text[]
   end)
 where t.slug in ('presdemo', 'cuidarnorte')
on conflict (caregiver_id, zona_id) do nothing;

-- Marta Quiroga y Rubén Ocampo se quedan con la región entera y nada más: son
-- los dos que prueban que «cubro todo el Norte» sigue siendo una sola fila.


-- ── 4. Cuidar Sur: el otro camino, con alguien adentro ────────────────────
-- Cuidar Sur es la Prestadora que la 0035 dejó sin lista de zonas a propósito,
-- para probar el campo de texto libre. Hasta acá no tenía ningún legajo, así
-- que la columna `zonas_texto` de la vista no se veía en ninguna pantalla: se
-- podía romper sin que ninguna prueba se enterara.
--
-- Una sola persona alcanza, y tiene que estar publicada —legajo validado y
-- perfil publicado— porque si no, no llega al directorio. Los datos son
-- inventados, como todos: correo en `.invalid`, que es el dominio que la
-- norma reserva justamente para que no exista.
insert into public.caregivers
  (id, tenant_id, full_name, dni, cuit, phone, email, address, profession, zone,
   zonas_texto, pathologies, tasks, verification_status, birthdate, gender,
   nationality, hourly_rate)
select 'bbbbbbb3-0000-4000-8000-000000000001',
       t.id,
       'Verónica Aguirre Ficticia', '90000020', '27-90000020-4', '+54 9 351 500-0020',
       'veronica.ficticia@ejemplo.invalid', 'Calle Inventada 210, Córdoba',
       'cuidador_domiciliario', null,
       'El centro de la ciudad y los barrios del sur. Con auto propio llego hasta Alta Gracia.',
       '["diabetes", "movilidad_reducida"]'::jsonb,
       '["higiene", "medicacion", "acompanamiento"]'::jsonb,
       'validado_prestadora', '1985-02-11', 'femenino', 'argentina', 4600
  from public.tenants t
 where t.slug = 'cuidarsur'
on conflict (id) do nothing;

insert into public.autorizaciones_asistente
  (caregiver_id, tenant_id, perfil_publicado, respondido_el)
select c.id, c.tenant_id, true, now()
  from public.caregivers c
 where c.id = 'bbbbbbb3-0000-4000-8000-000000000001'
on conflict (caregiver_id) do nothing;

insert into public.disponibilidad_asistente
  (caregiver_id, tenant_id, reemplazos_urgentes, respondido_el)
select c.id, c.tenant_id, false, now()
  from public.caregivers c
 where c.id = 'bbbbbbb3-0000-4000-8000-000000000001'
on conflict (caregiver_id) do nothing;


-- ── 5. El esquema, de nuevo ───────────────────────────────────────────────
-- Sin esto PostgREST sigue devolviendo la vista vieja, sin las dos columnas.
notify pgrst, 'reload schema';
