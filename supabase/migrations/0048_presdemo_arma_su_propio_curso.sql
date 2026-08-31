-- =====================================================================
-- 0048 — PRESDEMO ARMA SU PROPIO CURSO
--
-- Pendiente 110, el grupo que importa. La 0008 dejó los cursos y las
-- evaluaciones con dos escalones: `tenant_id` nulo es la oferta general
-- de CeltaTech, que ven todas las Prestadoras, y `tenant_id` cargado es
-- lo propio de una, que no ve ninguna otra. La siembra cargaba **sólo el
-- escalón general**, así que la mitad `tenant_id = prestadora_actual()`
-- de las políticas de `cursos`, `evaluaciones`, `preguntas_evaluacion` y
-- `opciones_pregunta` no tenía una sola fila que la ejercitara.
--
-- No hay nada roto ahí: hay cuatro puertas que nadie probó. Y no lo
-- muestra ninguna pantalla, porque la pantalla se dibuja igual: la
-- consulta que trae sólo lo general y la que trae lo general más lo
-- propio contestan lo mismo mientras no exista nada propio. Es el
-- argumento con el que la 0027 cargó comprobaciones en los legajos,
-- aplicado acá.
--
-- POR QUÉ ESTE CURSO Y NO OTRO. PresDemo ya tiene una certificación
-- propia en los vocabularios —`certificacion/rcp_avanzada`, cargada como
-- ítem suyo—, y una Prestadora que le pide a su gente una certificación
-- que la oferta general no dicta es exactamente la que arma su propio
-- curso. Así los dos escalones cuentan la misma historia en vez de ser
-- dos datos sueltos puestos para llenar una columna.
--
-- Y de paso queda llena `evaluaciones.curso_id`, que hasta hoy no la
-- llenaba nadie. Eso no era un defecto: la única evaluación que había es
-- una prueba de competencias general y no el cierre de un curso, y la
-- 0008 lo dice en la columna. Lo que faltaba era el otro caso.
--
-- QUÉ NO HACE. No toca `vocabularios.tenant_id`, que sigue sin llenarse.
-- Ahí la pregunta es otra y no la contesta una siembra: los ítems
-- propios de una Prestadora ya existen —cinco, en `vocabulario_items`—,
-- y una **lista** entera propia de una Prestadora es una función
-- distinta, que hay que decidir antes de sembrarla. Queda en el
-- pendiente 110.
--
-- Sin cambios de esquema: no hace falta `NOTIFY pgrst`.
-- =====================================================================

-- --- 1. El curso ------------------------------------------------------
insert into public.cursos
       (tenant_id, clave, nombre, descripcion,
        horas, nivel, modalidad, otorga_certificado, orden)
select t.id, 'rcp_avanzada', 'RCP avanzada',
       'Reanimación cardiopulmonar avanzada para el equipo de la Prestadora. '
       'Se cursa en la sede y se rinde al terminar.',
       10, 'avanzado', 'presencial', true, 1
  from public.tenants t
 where t.slug = 'presdemo'
   and not exists (select 1 from public.cursos c
                    where c.tenant_id = t.id and c.clave = 'rcp_avanzada');

-- --- 2. La evaluación que lo cierra -----------------------------------
-- `curso_id` cargado: ésta sí es el cierre de un curso, al revés de la
-- general de la 0008.
insert into public.evaluaciones
       (tenant_id, curso_id, clave, nombre,
        porcentaje_para_aprobar, intentos_maximos)
select c.tenant_id, c.id, 'rcp_avanzada', 'RCP avanzada — evaluación final', 100, 2
  from public.cursos c
  join public.tenants t on t.id = c.tenant_id and t.slug = 'presdemo'
 where c.clave = 'rcp_avanzada'
   and not exists (select 1 from public.evaluaciones e
                    where e.tenant_id = c.tenant_id and e.clave = 'rcp_avanzada');

-- --- 3. Las preguntas -------------------------------------------------
insert into public.preguntas_evaluacion (tenant_id, evaluacion_id, clave, enunciado, orden)
select e.tenant_id, e.id, v.clave, v.enunciado, v.orden
  from public.evaluaciones e
  join public.tenants t on t.id = e.tenant_id and t.slug = 'presdemo',
       (values
         ('frecuencia_compresiones',
          '¿A qué frecuencia se hacen las compresiones torácicas en un adulto?', 1),
         ('primero_ante_paro',
          'Ante una persona adulta que no responde y no respira con normalidad, '
          '¿qué corresponde hacer primero?', 2)
       ) as v(clave, enunciado, orden)
 where e.clave = 'rcp_avanzada'
   and not exists (select 1 from public.preguntas_evaluacion p
                    where p.evaluacion_id = e.id and p.clave = v.clave);

-- --- 4. Las opciones --------------------------------------------------
-- La correcta no va siempre en el mismo lugar, por el mismo motivo que
-- escribió la 0008: un patrón que se puede adivinar sin leer la pregunta
-- convierte el examen en otra cosa. Acá va segunda en una y tercera en
-- la otra.
insert into public.opciones_pregunta (tenant_id, pregunta_id, clave, texto, es_correcta, orden)
select p.tenant_id, p.id, v.clave, v.texto, v.es_correcta, v.orden
  from public.preguntas_evaluacion p
  join public.evaluaciones e on e.id = p.evaluacion_id and e.clave = 'rcp_avanzada'
  join public.tenants t on t.id = e.tenant_id and t.slug = 'presdemo',
       (values
         ('frecuencia_compresiones', 'lentas',
          'Entre 60 y 80 por minuto', false, 1),
         ('frecuencia_compresiones', 'cien_a_ciento_veinte',
          'Entre 100 y 120 por minuto', true, 2),
         ('frecuencia_compresiones', 'muy_rapidas',
          'Entre 140 y 160 por minuto', false, 3),
         ('frecuencia_compresiones', 'sin_ritmo',
          'Lo más rápido que se pueda, sin contar', false, 4),

         ('primero_ante_paro', 'buscar_pulso',
          'Buscarle el pulso durante un minuto antes de tocar nada', false, 1),
         ('primero_ante_paro', 'trasladar',
          'Llevarla al hospital en un vehículo particular', false, 2),
         ('primero_ante_paro', 'pedir_ayuda_y_comprimir',
          'Pedir ayuda, avisar al servicio de emergencias y empezar las compresiones',
          true, 3),
         ('primero_ante_paro', 'dar_agua',
          'Darle agua y esperar a que reaccione', false, 4)
       ) as v(pregunta, clave, texto, es_correcta, orden)
 where p.clave = v.pregunta
   and not exists (select 1 from public.opciones_pregunta o
                    where o.pregunta_id = p.id and o.clave = v.clave);
