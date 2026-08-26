-- ============================================================================
-- 0030 — Cada Prestadora ficticia con sus Familias y sus Asistentes
-- ============================================================================
--
-- Por qué
-- -------
-- Las dos Prestadoras inventadas existen para dos cosas: probar el aislamiento
-- y mostrarle el producto a un cliente. Para lo primero alcanzaba con lo que
-- había; para lo segundo no. Al 26 de agosto de 2026 la siembra dejaba a
-- Cuidar Norte con tres Asistentes contra seis de PresDemo, y del lado de la
-- Familia había **un aviso por Prestadora**, con nueve de sus columnas vacías:
-- ni contacto, ni zona, ni qué se necesita, ni qué tipo de Asistente. Y cuatro
-- tablas del legajo —estudios, matrículas, experiencia y referencias— no
-- tenían ni una fila, igual que las dos tablas de franjas.
--
-- Eso no es sólo una demostración pobre. Una pantalla que lee de una tabla
-- vacía se ve exactamente igual esté bien o esté rota, así que **cada tabla
-- vacía es una prueba que no puede fallar**. Es el mismo motivo por el que se
-- escribió la 0027.
--
-- El Desarrollador pidió el 26 de agosto de 2026 que cada Prestadora ficticia
-- tenga cinco o seis Familias y cinco o seis Asistentes propios, «es mejor
-- para probar y usar en las demos», y autorizó completar el resto de los datos
-- inventados sin volver a consultar.
--
-- Cómo queda el reparto
-- ---------------------
--                 Asistentes  validados  publicados   Familias (avisos)
--   PresDemo           6          5           4              6
--   Cuidar Norte       6          5           5              6
--
-- Los números de los dos lados son distintos a propósito: una pantalla que
-- mezcle las dos Prestadoras muestra nueve legajos publicados o doce avisos, y
-- eso se ve. Si las dos mostraran lo mismo, mezclarlas no se notaría.
--
-- Y se conserva el caso que la 0014 puso a propósito: Ester Villalba Ficticia
-- sigue validada y sin publicar, así que la condición del consentimiento sigue
-- teniendo a alguien que la ponga a prueba. Del lado de Cuidar Norte el caso
-- que falta es el otro: Carina Duarte Ficticia entra `en_revision`, que es una
-- Aspirante, y por eso no tiene autorización cargada ni aparece en ningún
-- directorio.
--
-- Lo que esta migración NO hace, y por qué
-- ----------------------------------------
--   * **No crea cuentas de acceso para las Familias.** `avisos.familia_id`
--     apunta a `auth.users`, y dar de alta una cuenta desde una migración
--     significa escribir una clave adentro del repositorio, que es justo lo que
--     el CLAUDE.md de la empresa prohíbe. Los avisos quedan con `familia_id`
--     vacío: la 0020 ya previó ese caso y esos avisos los ve el personal de la
--     Prestadora. El día que haya cuentas de demostración, se les llena la
--     columna y pasan a verse también desde la sesión de cada Familia.
--   * **No escribe `schedule_type` en los avisos nuevos.** Ningún vocabulario
--     gobierna esa columna todavía —pendiente 31— y hoy guarda cuatro formas
--     distintas de decir lo mismo. Escribir una quinta empeora el problema. El
--     horario de cada aviso va en `franjas_aviso`, que sí tiene
--     vocabularios (`dia_semana` y `turno`).
--   * **No inventa estados de aviso.** El único que el producto usa es
--     `activa`, y agregar otro sería una palabra de negocio nueva sin aprobar.
--
-- Todo lo de acá es inventado: ni una persona real, ni un documento real, ni un
-- teléfono real, ni un correo que exista. Los documentos siguen la serie
-- 90.000.000 y los teléfonos la 5000/6000, ninguna de las dos se asigna;
-- `ejemplo.invalid` es un dominio que por norma no puede existir.
--
-- Cada valor que sale de un catálogo está escrito con su clave, no con una
-- palabra parecida (`data/catalogo-vocabularios.json`).
--
-- Correr esto dos veces no falla.
-- ============================================================================


-- ── 1. Tres Asistentes más en Cuidar Norte ────────────────────────────────
insert into public.caregivers
  (id, tenant_id, full_name, dni, cuit, phone, email, address, profession, zone,
   pathologies, tasks, verification_status, birthdate, gender, nationality, hourly_rate)
values
  ('bbbbbbb2-0000-4000-8000-000000000004',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Lorena Maidana Ficticia', '90000010', '27-90000010-2', '+54 9 11 5000-0010',
   'lorena.ficticia@ejemplo.invalid', 'Calle Inventada 45, Ramos Mejía',
   'auxiliar_enfermeria', 'ramos_mejia',
   '["hipertension", "arritmias"]'::jsonb,
   '["signos", "medicacion"]'::jsonb,
   'validado_prestadora', '1987-05-19', 'femenino', 'argentina', 4700),

  ('bbbbbbb2-0000-4000-8000-000000000005',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Diego Ferreyra Ficticio', '90000011', '20-90000011-9', '+54 9 11 5000-0011',
   'diego.ficticio@ejemplo.invalid', 'Pasaje Imaginario 8, Morón',
   'acompanante_terapeutico', 'moron',
   '["psiquiatricas", "deterioro_cognitivo"]'::jsonb,
   '["solo_acompanamiento", "estimulacion_cognitiva"]'::jsonb,
   'validado_prestadora', '1993-10-08', 'masculino', 'argentina', 4400),

  -- Aspirante: cargó su legajo y la Prestadora todavía no lo revisó. No tiene
  -- autorización cargada, igual que Hugo Peralta en PresDemo, porque la
  -- pregunta de publicación llega recién al final del alta.
  ('bbbbbbb2-0000-4000-8000-000000000006',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Carina Duarte Ficticia', '90000012', '27-90000012-7', '+54 9 11 5000-0012',
   'carina.ficticia@ejemplo.invalid', 'Avenida Falsa 60, Quilmes',
   'cuidador_domiciliario', 'quilmes',
   '["postrados", "epoc"]'::jsonb,
   '["higiene", "movilizacion"]'::jsonb,
   'en_revision', '1996-01-23', 'femenino', 'boliviana', 4100)
on conflict (id) do nothing;


-- ── 2. Lo que cada uno autorizó, y quién acepta reemplazos urgentes ───────
insert into public.autorizaciones_asistente
  (caregiver_id, tenant_id, perfil_publicado, respondido_el)
select c.id, c.tenant_id, true, now()
  from public.caregivers c
 where c.id in ('bbbbbbb2-0000-4000-8000-000000000004',
                'bbbbbbb2-0000-4000-8000-000000000005')
on conflict (caregiver_id) do nothing;

insert into public.disponibilidad_asistente
  (caregiver_id, tenant_id, reemplazos_urgentes, respondido_el)
select c.id, c.tenant_id,
       c.id = 'bbbbbbb2-0000-4000-8000-000000000004'::uuid,
       now()
  from public.caregivers c
 where c.id in ('bbbbbbb2-0000-4000-8000-000000000004',
                'bbbbbbb2-0000-4000-8000-000000000005')
on conflict (caregiver_id) do nothing;


-- ── 3. Qué se les comprobó ────────────────────────────────────────────────
-- Mismo criterio que la 0027: repartido para que la lista del directorio no
-- diga lo mismo en todos. Lorena tiene tres comprobaciones y Diego una sola;
-- si la consulta dejara de mirar el estado, Diego pasaría a tener dos.
insert into public.verificaciones_asistente
  (tenant_id, caregiver_id, tipo, estado, verificado_el)
select c.tenant_id, c.id, v.tipo, v.estado,
       case when v.estado = 'verificado' then now() end
  from public.caregivers c
  join (values
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'domicilio',  'verificado'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'titulo',     'verificado'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'matricula',  'verificado'),

          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'referencia', 'verificado'),
          -- Presentado y sin comprobar: no tiene que salir al directorio.
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'domicilio',  'presentado')
       ) as v(caregiver_id, tipo, estado) on v.caregiver_id = c.id
on conflict (caregiver_id, tipo) do nothing;


-- ── 4. Cuándo puede trabajar cada Asistente ───────────────────────────────
-- `franjas_asistente` no tenía ni una fila desde que se creó en la 0012, así
-- que la grilla del legajo se veía vacía y la consulta que cruza necesidad con
-- disponibilidad no tenía contra qué correr. Una fila por casillero marcado.
insert into public.franjas_asistente (tenant_id, caregiver_id, dia, turno)
select c.tenant_id, c.id, f.dia, f.turno
  from public.caregivers c
  join (values
          -- PresDemo
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'lunes',     'manana'),
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'miercoles', 'manana'),
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'viernes',   'manana'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'martes',    'tarde'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'jueves',    'tarde'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'lunes',     'tarde'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'martes',    'tarde'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'sabado',    'manana'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'miercoles', 'noche'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'jueves',    'noche'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'domingo',   'manana'),
          -- Validada y sin publicar: también tiene su grilla, porque el legajo
          -- existe aunque el directorio no lo muestre.
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'lunes',     'manana'),
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'viernes',   'tarde'),
          -- Cuidar Norte
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'lunes',     'noche'),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'martes',    'noche'),
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'miercoles', 'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'viernes',   'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'martes',    'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'jueves',    'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'sabado',    'tarde'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'lunes',     'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'martes',    'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'jueves',    'tarde'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'miercoles', 'tarde'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'viernes',   'noche'),
          ('bbbbbbb2-0000-4000-8000-000000000006'::uuid, 'sabado',    'manana'),
          ('bbbbbbb2-0000-4000-8000-000000000006'::uuid, 'domingo',   'tarde')
       ) as f(caregiver_id, dia, turno) on f.caregiver_id = c.id
on conflict (caregiver_id, dia, turno) do nothing;


-- ── 5. El legajo por dentro ───────────────────────────────────────────────
-- Cuatro tablas que se crearon en la 0004 y nunca tuvieron una fila. Ninguna
-- tiene clave única aparte del identificador, así que la repetición se evita
-- mirando si esa persona ya tiene algo cargado en esa tabla.

insert into public.estudios_asistente
  (tenant_id, caregiver_id, institucion, titulo_obtenido, en_curso,
   anio_finalizacion, respalda_perfil)
select c.tenant_id, c.id, e.institucion, e.titulo, e.en_curso, e.anio, e.respalda
  from public.caregivers c
  join (values
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid,
           'Instituto Inventado de Enfermería', 'Licenciatura en Enfermería',
           false, 2009, 'matricula'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid,
           'Escuela Imaginaria de Cuidados', 'Cuidador Domiciliario',
           false, 2015, 'titulo'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid,
           'Instituto Inventado de Enfermería', 'Auxiliar de Enfermería',
           false, 2012, 'titulo'),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid,
           'Universidad Supuesta del Oeste', 'Licenciatura en Enfermería',
           false, 2014, 'matricula'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid,
           'Escuela Imaginaria de Cuidados', 'Auxiliar de Enfermería',
           false, 2011, 'titulo'),
          ('bbbbbbb2-0000-4000-8000-000000000006'::uuid,
           'Escuela Imaginaria de Cuidados', 'Cuidador Domiciliario',
           true, null, 'titulo')
       ) as e(caregiver_id, institucion, titulo, en_curso, anio, respalda)
    on e.caregiver_id = c.id
 where not exists (select 1 from public.estudios_asistente x
                    where x.caregiver_id = c.id);

insert into public.matriculas_asistente
  (tenant_id, caregiver_id, organismo, numero, vencimiento, verificada)
select c.tenant_id, c.id, m.organismo, m.numero, m.vence, m.verificada
  from public.caregivers c
  join (values
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid,
           'Colegio Inventado de Enfermería', 'MAT-90000001', date '2028-03-31', true),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid,
           'Colegio Inventado de Enfermería', 'MAT-90000003', date '2027-11-30', true),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid,
           'Colegio Inventado de Enfermería', 'MAT-90000010', date '2029-06-30', true)
       ) as m(caregiver_id, organismo, numero, vence, verificada)
    on m.caregiver_id = c.id
 where not exists (select 1 from public.matriculas_asistente x
                    where x.caregiver_id = c.id);

insert into public.experiencia_laboral_asistente
  (tenant_id, caregiver_id, puesto, inicio, trabajo_actual, fin, tareas, detalle)
select c.tenant_id, c.id, x.puesto, x.inicio, x.actual, x.fin, x.tareas, x.detalle
  from public.caregivers c
  join (values
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'auxiliar_enfermeria',
           date '2012-04-01', false, date '2019-08-31',
           '["medicacion", "signos"]'::jsonb,
           'Institución inventada de cuidados prolongados.'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'cuidador_domiciliario',
           date '2016-02-15', true, null,
           '["higiene", "estimulacion_cognitiva"]'::jsonb,
           'Acompañamiento domiciliario, caso inventado.'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'acompanante_terapeutico',
           date '2018-09-01', true, null,
           '["solo_acompanamiento", "movilizacion"]'::jsonb,
           'Acompañamiento terapéutico, caso inventado.'),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'cuidador_domiciliario',
           date '2014-06-01', false, date '2021-12-31',
           '["higiene", "cocina"]'::jsonb,
           'Domicilio particular inventado.'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'auxiliar_enfermeria',
           date '2013-03-01', true, null,
           '["signos", "medicacion"]'::jsonb,
           'Centro de día inventado.'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'acompanante_terapeutico',
           date '2019-05-02', true, null,
           '["solo_acompanamiento", "estimulacion_cognitiva"]'::jsonb,
           'Acompañamiento inventado, dos veces por semana.')
       ) as x(caregiver_id, puesto, inicio, actual, fin, tareas, detalle)
    on x.caregiver_id = c.id
 where not exists (select 1 from public.experiencia_laboral_asistente e
                    where e.caregiver_id = c.id);

-- Referencias: dato de un tercero. Inventado, y no sale a ninguna vista
-- pública — la 0004 lo dice en el comentario de la tabla y la 0029 lo repitió.
insert into public.referencias_asistente
  (tenant_id, caregiver_id, nombre, telefono, relacion, comentarios, contactada)
select c.tenant_id, c.id, r.nombre, r.telefono, r.relacion, r.comentarios, r.contactada
  from public.caregivers c
  join (values
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid,
           'Referencia Inventada Uno', '+54 9 11 7000-0001', 'Empleadora anterior',
           'Comentario inventado, cargado para probar la ficha.', true),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid,
           'Referencia Inventada Dos', '+54 9 11 7000-0002', 'Coordinadora',
           'Comentario inventado, cargado para probar la ficha.', true),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid,
           'Referencia Inventada Tres', '+54 9 11 7000-0003', 'Empleadora anterior',
           'Comentario inventado, cargado para probar la ficha.', true),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid,
           'Referencia Inventada Cuatro', '+54 9 11 7000-0004', 'Supervisor',
           'Comentario inventado, todavía sin contactar.', false)
       ) as r(caregiver_id, nombre, telefono, relacion, comentarios, contactada)
    on r.caregiver_id = c.id
 where not exists (select 1 from public.referencias_asistente y
                    where y.caregiver_id = c.id);


-- ── 6. Las Familias: seis avisos en cada Prestadora ───────────────────────
-- Una Familia no tiene tabla propia en este producto: existe porque publicó un
-- aviso, y quién es está en `contact_info`. Así que seis Familias por
-- Prestadora son seis avisos, cada uno con su contacto inventado y con todo lo
-- que la 0013 le dio dónde guardar.
--
-- `familia_id` queda vacío: ver el encabezado. `schedule_type` también, y el
-- horario va en las franjas del punto 8.
insert into public.avisos
  (id, tenant_id, patient_name, contact_info, zone, description,
   consultation_reason, pathologies_required, tasks_required,
   profession_required, preferred_gender, frequency, status)
values
  -- PresDemo ──────────────────────────────────────────────────────────────
  ('ccccccc3-0000-4000-8000-000000000003',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Palermo',
   '{"nombre": "Familia Aguirre Ficticia", "email": "familia.aguirre@ejemplo.invalid", "celular": "+54 9 11 6000-0003"}'::jsonb,
   'palermo',
   'Caso inventado: se necesita ayuda con la movilidad y la higiene, tres veces por semana.',
   'busco_asistente',
   '["parkinson"]'::jsonb, '["movilizacion", "higiene"]'::jsonb,
   'gerontologo', 'indistinto', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000004',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Caballito',
   '{"nombre": "Familia Bermúdez Ficticia", "email": "familia.bermudez@ejemplo.invalid", "celular": "+54 9 11 6000-0004"}'::jsonb,
   'caballito',
   'Caso inventado: control de signos y medicación todos los días a la mañana.',
   'busco_asistente',
   '["diabetes", "hipertension"]'::jsonb, '["medicacion", "signos"]'::jsonb,
   'auxiliar_enfermeria', 'indistinto', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000005',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Belgrano',
   '{"nombre": "Familia Cardozo Ficticia", "email": "familia.cardozo@ejemplo.invalid", "celular": "+54 9 11 6000-0005"}'::jsonb,
   'belgrano',
   'Caso inventado: la familia todavía no sabe qué tipo de ayuda necesita y pide orientación.',
   'orientacion',
   '["postrados"]'::jsonb, '["higiene", "movilizacion"]'::jsonb,
   'cuidador_domiciliario', 'masculino', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000006',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Flores',
   '{"nombre": "Familia Domínguez Ficticia", "email": "familia.dominguez@ejemplo.invalid", "celular": "+54 9 11 6000-0006"}'::jsonb,
   'flores',
   'Caso inventado: quien cuida está agotado y busca apoyo para relevos ocasionales.',
   'apoyo_cuidador',
   '["psiquiatricas"]'::jsonb, '["solo_acompanamiento"]'::jsonb,
   'acompanante_terapeutico', 'indistinto', 'eventual', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000007',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Recoleta',
   '{"nombre": "Familia Escobar Ficticia", "email": "familia.escobar@ejemplo.invalid", "celular": "+54 9 11 6000-0007"}'::jsonb,
   'recoleta',
   'Caso inventado: cuidados paliativos en domicilio, con manejo de medicación.',
   'busco_asistente',
   '["oncologico", "paliativos"]'::jsonb, '["medicacion", "higiene"]'::jsonb,
   'enfermero_universitario', 'femenino', 'recurrente', 'activa'),

  -- Cuidar Norte ──────────────────────────────────────────────────────────
  ('ccccccc3-0000-4000-8000-000000000008',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo Ramos Mejía',
   '{"nombre": "Familia Juárez Ficticia", "email": "familia.juarez@ejemplo.invalid", "celular": "+54 9 11 6000-0008"}'::jsonb,
   'ramos_mejia',
   'Caso inventado: control de presión y arritmias, con registro diario.',
   'busco_asistente',
   '["hipertension", "arritmias"]'::jsonb, '["signos", "medicacion"]'::jsonb,
   'auxiliar_enfermeria', 'femenino', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000009',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo Quilmes',
   '{"nombre": "Familia Leiva Ficticia", "email": "familia.leiva@ejemplo.invalid", "celular": "+54 9 11 6000-0009"}'::jsonb,
   'quilmes',
   'Caso inventado: ayuda con la higiene y la comida, de lunes a viernes.',
   'busco_asistente',
   '["epoc"]'::jsonb, '["higiene", "cocina"]'::jsonb,
   'cuidador_domiciliario', 'indistinto', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000010',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo Lomas',
   '{"nombre": "Familia Moreno Ficticia", "email": "familia.moreno@ejemplo.invalid", "celular": "+54 9 11 6000-0010"}'::jsonb,
   'lomas',
   'Caso inventado: se busca estimulación cognitiva dos veces por semana.',
   'orientacion',
   '["deterioro_cognitivo"]'::jsonb,
   '["estimulacion_cognitiva", "solo_acompanamiento"]'::jsonb,
   'acompanante_terapeutico', 'indistinto', 'eventual', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000011',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo Avellaneda',
   '{"nombre": "Familia Navarro Ficticia", "email": "familia.navarro@ejemplo.invalid", "celular": "+54 9 11 6000-0011"}'::jsonb,
   'avellaneda',
   'Caso inventado: alguien con fuerza para movilizar, después de un ACV.',
   'busco_asistente',
   '["acv", "postrados"]'::jsonb, '["movilizacion", "higiene"]'::jsonb,
   'cuidador_domiciliario', 'masculino', 'recurrente', 'activa'),

  ('ccccccc3-0000-4000-8000-000000000012',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo San Isidro',
   '{"nombre": "Familia Olivera Ficticia", "email": "familia.olivera@ejemplo.invalid", "celular": "+54 9 11 6000-0012"}'::jsonb,
   'san_isidro',
   'Caso inventado: acompañamiento con manejo de medicación anticonvulsiva.',
   'apoyo_cuidador',
   '["epilepsia"]'::jsonb, '["solo_acompanamiento", "medicacion"]'::jsonb,
   'enfermero_universitario', 'indistinto', 'eventual', 'activa')
on conflict (id) do nothing;


-- ── 7. Los dos avisos de la 0003, completos ───────────────────────────────
-- Nacieron con cuatro columnas llenas porque las otras nueve todavía no
-- existían: las agregaron la 0009 y la 0013. Se completan ahora para que los
-- doce avisos se vean igual y ninguna pantalla tenga que arreglárselas con la
-- mitad de los datos. `schedule_type` se deja como está: lo que ya guardan es
-- historia y pisarlo no aporta nada.
update public.avisos
   set contact_info        = '{"nombre": "Familia Quintana Ficticia", "email": "familia.quintana@ejemplo.invalid", "celular": "+54 9 11 6000-0001"}'::jsonb,
       zone                = 'vicente_lopez',
       description         = 'Caso inventado: acompañamiento por la mañana, con estimulación cognitiva.',
       consultation_reason = 'busco_asistente',
       tasks_required      = '["higiene", "estimulacion_cognitiva"]'::jsonb,
       profession_required = 'cuidador_domiciliario',
       preferred_gender    = 'femenino',
       frequency           = 'recurrente'
 where id = 'ccccccc3-0000-4000-8000-000000000001';

update public.avisos
   set contact_info        = '{"nombre": "Familia Ibarra Ficticia", "email": "familia.ibarra@ejemplo.invalid", "celular": "+54 9 11 6000-0002"}'::jsonb,
       zone                = 'moron',
       description         = 'Caso inventado: guardia de doce horas, con ayuda para movilizar.',
       consultation_reason = 'busco_asistente',
       tasks_required      = '["movilizacion", "solo_acompanamiento"]'::jsonb,
       profession_required = 'gerontologo',
       preferred_gender    = 'indistinto',
       frequency           = 'recurrente'
 where id = 'ccccccc3-0000-4000-8000-000000000002';


-- ── 8. Cuándo se necesita el cuidado ──────────────────────────────────────
-- La tabla espejo del punto 4. Con las dos llenas, cruzar lo que una Familia
-- necesita con lo que un Asistente puede es una consulta, que es exactamente
-- para lo que la 0016 creó esta tabla. Y hay dos coincidencias puestas a
-- propósito, una en cada Prestadora: el aviso de San Isidro pide martes y
-- jueves a la mañana y Omar Zabala Ficticio está justo ahí con esas dos
-- franjas; el de Ramos Mejía pide lunes a la mañana y jueves a la tarde, y
-- Lorena Maidana Ficticia tiene las dos. Cruzando zona y franja, la consulta
-- devuelve esas dos filas y ninguna otra: comprobado contra la base local el
-- 26 de agosto de 2026.
insert into public.franjas_aviso (tenant_id, aviso_id, dia, turno)
select a.tenant_id, a.id, f.dia, f.turno
  from public.avisos a
  join (values
          ('ccccccc3-0000-4000-8000-000000000001'::uuid, 'lunes',     'manana'),
          ('ccccccc3-0000-4000-8000-000000000001'::uuid, 'miercoles', 'manana'),
          ('ccccccc3-0000-4000-8000-000000000001'::uuid, 'viernes',   'manana'),

          ('ccccccc3-0000-4000-8000-000000000002'::uuid, 'martes',    'noche'),
          ('ccccccc3-0000-4000-8000-000000000002'::uuid, 'jueves',    'noche'),

          ('ccccccc3-0000-4000-8000-000000000003'::uuid, 'lunes',     'tarde'),
          ('ccccccc3-0000-4000-8000-000000000003'::uuid, 'miercoles', 'tarde'),
          ('ccccccc3-0000-4000-8000-000000000003'::uuid, 'viernes',   'tarde'),

          ('ccccccc3-0000-4000-8000-000000000004'::uuid, 'lunes',     'manana'),
          ('ccccccc3-0000-4000-8000-000000000004'::uuid, 'martes',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000004'::uuid, 'miercoles', 'manana'),
          ('ccccccc3-0000-4000-8000-000000000004'::uuid, 'jueves',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000004'::uuid, 'viernes',   'manana'),

          ('ccccccc3-0000-4000-8000-000000000005'::uuid, 'martes',    'tarde'),
          ('ccccccc3-0000-4000-8000-000000000005'::uuid, 'jueves',    'tarde'),
          ('ccccccc3-0000-4000-8000-000000000005'::uuid, 'sabado',    'manana'),

          ('ccccccc3-0000-4000-8000-000000000006'::uuid, 'sabado',    'tarde'),
          ('ccccccc3-0000-4000-8000-000000000006'::uuid, 'domingo',   'tarde'),

          ('ccccccc3-0000-4000-8000-000000000007'::uuid, 'lunes',     'noche'),
          ('ccccccc3-0000-4000-8000-000000000007'::uuid, 'martes',    'noche'),
          ('ccccccc3-0000-4000-8000-000000000007'::uuid, 'miercoles', 'noche'),

          ('ccccccc3-0000-4000-8000-000000000008'::uuid, 'lunes',     'manana'),
          ('ccccccc3-0000-4000-8000-000000000008'::uuid, 'jueves',    'tarde'),

          ('ccccccc3-0000-4000-8000-000000000009'::uuid, 'lunes',     'manana'),
          ('ccccccc3-0000-4000-8000-000000000009'::uuid, 'martes',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000009'::uuid, 'miercoles', 'manana'),
          ('ccccccc3-0000-4000-8000-000000000009'::uuid, 'jueves',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000009'::uuid, 'viernes',   'manana'),

          ('ccccccc3-0000-4000-8000-000000000010'::uuid, 'miercoles', 'tarde'),
          ('ccccccc3-0000-4000-8000-000000000010'::uuid, 'viernes',   'tarde'),

          ('ccccccc3-0000-4000-8000-000000000011'::uuid, 'martes',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000011'::uuid, 'jueves',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000011'::uuid, 'sabado',    'manana'),

          ('ccccccc3-0000-4000-8000-000000000012'::uuid, 'martes',    'manana'),
          ('ccccccc3-0000-4000-8000-000000000012'::uuid, 'jueves',    'manana')
       ) as f(aviso_id, dia, turno) on f.aviso_id = a.id
on conflict (aviso_id, dia, turno) do nothing;


notify pgrst, 'reload schema';
