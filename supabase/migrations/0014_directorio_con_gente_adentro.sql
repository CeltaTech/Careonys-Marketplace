-- ============================================================================
-- 0014 — El directorio inventado, con gente adentro y con su permiso
-- ============================================================================
--
-- Qué estaba mal
-- --------------
-- `caregivers_publicos` devuelve **cero filas**. Preguntado a la base el 24 de
-- agosto de 2026, sin sesión, tal como lo hace una visita: `[]`.
--
-- No es un error de permisos ni de la vista. Es que la vista exige dos cosas y
-- los cuatro legajos inventados de la 0003 sólo cumplen una: están validados,
-- pero **nadie contestó la autorización de publicación**. El cruce contra
-- `autorizaciones_asistente` es un `join` que exige la fila, y sin fila no hay
-- publicación (0007 y 0012). Está bien que sea así: un legajo que nadie
-- autorizó no se muestra. Lo que falta es la respuesta.
--
-- Y mientras el directorio se dibujaba con ocho tarjetas escritas adentro del
-- HTML, esto no se notaba. Al hacer que la pantalla lea de la base —pendiente
-- 2—, un directorio vacío es lo primero que se ve.
--
-- Qué hace esta migración
-- -----------------------
--   1. Cinco Asistentes inventados más, para que cada Prestadora tenga un
--      directorio y no una fila suelta. Todo inventado, como en la 0003: ni una
--      persona real, ni un documento real, ni un teléfono real. Los documentos
--      siguen la serie 90.000.000, que no se asigna.
--   2. La autorización de publicación contestada, legajo por legajo.
--   3. La disponibilidad de reemplazos urgentes, que es lo que el directorio
--      muestra como insignia.
--
-- **Una queda validada y sin publicar a propósito.** Si todos los legajos
-- validados aparecieran en el directorio, la condición del consentimiento no se
-- estaría probando: se vería igual que si no existiera. Ester Villalba Ficticia
-- está validada por su Prestadora y contestó que **no** quiere publicar su
-- perfil, así que no tiene que aparecer. Es la fila que hace que el directorio
-- signifique algo.
--
-- Cómo queda el reparto, y por eso el filtro por Prestadora se puede probar:
--
--   PresDemo      6 legajos, 5 validados, 4 publicados
--   Cuidar Norte  3 legajos, 3 validados, 3 publicados
--
-- Siete publicados en total: si una pantalla muestra siete, está mezclando las
-- dos Prestadoras.
--
-- Cada valor que sale de un catálogo está escrito con la clave del catálogo
-- (`data/catalogo-vocabularios.json`), no con una palabra parecida. Siguen sin
-- vocabulario `schedule_type` y `nationality` (pendiente 31).
-- ============================================================================

-- --- 1. Cinco legajos inventados más ----------------------------------------
insert into public.caregivers
  (id, tenant_id, full_name, dni, cuit, phone, email, address, profession, zone,
   pathologies, tasks, verification_status, birthdate, gender, nationality, hourly_rate)
values
  ('aaaaaaa1-0000-4000-8000-000000000003',
   (select id from public.tenants where slug = 'presdemo'),
   'Alejandra Sosa Ficticia', '90000005', '27-90000005-5', '+54 9 11 5000-0005',
   'alejandra.ficticia@ejemplo.invalid', 'Calle Inventada 340, Palermo',
   'cuidador_domiciliario', 'palermo',
   '["alzheimer", "deterioro_cognitivo"]'::jsonb,
   '["higiene", "estimulacion_cognitiva"]'::jsonb,
   'validado_prestadora', '1988-06-04', 'femenino', 'argentina', 4300),

  ('aaaaaaa1-0000-4000-8000-000000000004',
   (select id from public.tenants where slug = 'presdemo'),
   'Ramiro Cáceres Ficticio', '90000006', '20-90000006-3', '+54 9 11 5000-0006',
   'ramiro.ficticio@ejemplo.invalid', 'Pasaje Imaginario 55, Caballito',
   'acompanante_terapeutico', 'caballito',
   '["psiquiatricas", "epilepsia"]'::jsonb,
   '["solo_acompanamiento", "movilizacion"]'::jsonb,
   'validado_prestadora', '1991-09-17', 'masculino', 'argentina', 4500),

  ('aaaaaaa1-0000-4000-8000-000000000005',
   (select id from public.tenants where slug = 'presdemo'),
   'Nadia Britos Ficticia', '90000007', '27-90000007-1', '+54 9 11 5000-0007',
   'nadia.ficticia@ejemplo.invalid', 'Avenida Falsa 780, Flores',
   'auxiliar_enfermeria', 'flores',
   '["diabetes", "hipertension"]'::jsonb,
   '["medicacion", "signos"]'::jsonb,
   'validado_prestadora', '1983-02-25', 'femenino', 'paraguaya', 4400),

  -- Validada y sin publicar. Ver el encabezado: es la que prueba que el
  -- consentimiento manda.
  ('aaaaaaa1-0000-4000-8000-000000000006',
   (select id from public.tenants where slug = 'presdemo'),
   'Ester Villalba Ficticia', '90000008', '27-90000008-8', '+54 9 11 5000-0008',
   'ester.ficticia@ejemplo.invalid', 'Ruta Inexistente 12, Belgrano',
   'gerontologo', 'belgrano',
   '["parkinson", "postrados"]'::jsonb,
   '["movilizacion", "higiene"]'::jsonb,
   'validado_prestadora', '1976-12-09', 'femenino', 'argentina', 5300),

  ('bbbbbbb2-0000-4000-8000-000000000003',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Omar Zabala Ficticio', '90000009', '20-90000009-6', '+54 9 11 5000-0009',
   'omar.ficticio@ejemplo.invalid', 'Camino Supuesto 900, San Isidro',
   'cuidador_domiciliario', 'san_isidro',
   '["epoc", "oncologico"]'::jsonb,
   '["higiene", "cocina"]'::jsonb,
   'validado_prestadora', '1980-04-30', 'masculino', 'argentina', 4600)
on conflict (id) do nothing;


-- --- 2. La autorización de publicación, contestada --------------------------
-- `respondido_el` es la fecha en que la persona contestó. Acá se escribe la de
-- la siembra: no hay ninguna persona que haya contestado nada, y dejarla vacía
-- haría creer que la respuesta se guardó sin saber cuándo.
insert into public.autorizaciones_asistente
  (caregiver_id, tenant_id, perfil_publicado, respondido_el)
select c.id, c.tenant_id,
       c.id <> 'aaaaaaa1-0000-4000-8000-000000000006'::uuid,
       now()
  from public.caregivers c
 where c.id in ('aaaaaaa1-0000-4000-8000-000000000001',
                'aaaaaaa1-0000-4000-8000-000000000003',
                'aaaaaaa1-0000-4000-8000-000000000004',
                'aaaaaaa1-0000-4000-8000-000000000005',
                'aaaaaaa1-0000-4000-8000-000000000006',
                'bbbbbbb2-0000-4000-8000-000000000001',
                'bbbbbbb2-0000-4000-8000-000000000002',
                'bbbbbbb2-0000-4000-8000-000000000003')
on conflict (caregiver_id) do nothing;

-- Hugo Peralta Ficticio queda afuera a propósito: su legajo está `en_revision`,
-- así que la pregunta de publicación todavía no le llegó. Es el estado normal
-- de quien acaba de cargar sus datos.


-- --- 3. Quién acepta reemplazos urgentes ------------------------------------
-- La insignia que el directorio muestra. Sin fila, la vista contesta «no» con
-- un `left join`, así que esto no esconde a nadie: sólo enciende la insignia de
-- los tres que dijeron que sí.
insert into public.disponibilidad_asistente
  (caregiver_id, tenant_id, reemplazos_urgentes, respondido_el)
select c.id, c.tenant_id,
       c.id in ('aaaaaaa1-0000-4000-8000-000000000001',
                'aaaaaaa1-0000-4000-8000-000000000004',
                'bbbbbbb2-0000-4000-8000-000000000003'),
       now()
  from public.caregivers c
 where c.id in ('aaaaaaa1-0000-4000-8000-000000000001',
                'aaaaaaa1-0000-4000-8000-000000000003',
                'aaaaaaa1-0000-4000-8000-000000000004',
                'aaaaaaa1-0000-4000-8000-000000000005',
                'bbbbbbb2-0000-4000-8000-000000000001',
                'bbbbbbb2-0000-4000-8000-000000000002',
                'bbbbbbb2-0000-4000-8000-000000000003')
on conflict (caregiver_id) do nothing;
