-- =====================================================================
-- 0003 — Dos Prestadoras inventadas, para que el aislamiento se pueda probar
--
-- El CLAUDE.md §2 lo pide así: con una sola Prestadora cargada, una prueba que
-- devuelve la lista correcta no distingue "aislado" de "siempre devuelve lo
-- mismo". Hacen falta dos con datos para que el resultado signifique algo.
--
-- Todo lo de acá es inventado: ni una persona real, ni un documento real, ni un
-- teléfono real. Los documentos son de la serie 90.000.000, que no se asigna.
--
-- Las Prestadoras se buscan por su `slug` y no por un identificador escrito a
-- mano: PresDemo ya existía en la base con el suyo, y pisarlo habría dejado sus
-- legajos colgando de una Prestadora que no existe.
-- =====================================================================

insert into public.tenants (slug, name, description, primary_color, accent_color, status)
values
  ('presdemo', 'PresDemo',
   'Prestadora de ejemplo. Datos inventados.', '#1A365D', '#E53E3E', 'activo'),
  ('cuidarnorte', 'Cuidar Norte',
   'Segunda Prestadora de ejemplo. Existe para probar el aislamiento.',
   '#2F5D50', '#C77D22', 'activo')
on conflict (slug) do nothing;

-- Un legajo sin Prestadora no se ve desde ninguna sesión: queda invisible sin
-- que nadie se entere. Los que estaban sueltos pasan a PresDemo.
update public.caregivers
   set tenant_id = (select id from public.tenants where slug = 'presdemo')
 where tenant_id is null
    or tenant_id not in (select id from public.tenants);

insert into public.caregivers
  (id, tenant_id, full_name, dni, cuit, phone, email, address, profession, zone,
   pathologies, tasks, verification_status, birthdate, gender, nationality, hourly_rate)
values
  ('aaaaaaa1-0000-4000-8000-000000000001',
   (select id from public.tenants where slug = 'presdemo'),
   'Marta Quiroga Ficticia', '90000001', '27-90000001-4', '+54 9 11 5000-0001',
   'marta.ficticia@ejemplo.invalid', 'Calle Inventada 100, Vicente López',
   'enfermero', 'zona_norte',
   '["alzheimer", "diabetes"]'::jsonb, '["higiene", "medicacion"]'::jsonb,
   'validado_prestadora', '1985-03-12', 'femenino', 'argentina', 4800),
  ('aaaaaaa1-0000-4000-8000-000000000002',
   (select id from public.tenants where slug = 'presdemo'),
   'Hugo Peralta Ficticio', '90000002', '20-90000002-1', '+54 9 11 5000-0002',
   'hugo.ficticio@ejemplo.invalid', 'Pasaje Imaginario 250, San Isidro',
   'cuidador_domiciliario', 'zona_norte',
   '["movilidad_reducida"]'::jsonb, '["acompanamiento", "traslados"]'::jsonb,
   'en_revision', '1979-11-02', 'masculino', 'argentina', 4200),
  ('bbbbbbb2-0000-4000-8000-000000000001',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Silvia Ledesma Ficticia', '90000003', '27-90000003-9', '+54 9 11 5000-0003',
   'silvia.ficticia@ejemplo.invalid', 'Avenida Falsa 1234, San Martín',
   'enfermero', 'zona_oeste',
   '["oncologico", "cuidados_paliativos"]'::jsonb, '["medicacion", "curaciones"]'::jsonb,
   'validado_prestadora', '1990-07-21', 'femenino', 'uruguaya', 5100),
  ('bbbbbbb2-0000-4000-8000-000000000002',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Rubén Ocampo Ficticio', '90000004', '20-90000004-7', '+54 9 11 5000-0004',
   'ruben.ficticio@ejemplo.invalid', 'Ruta Inexistente km 3, Morón',
   'gerontologo', 'zona_oeste',
   '["parkinson"]'::jsonb, '["estimulacion_cognitiva"]'::jsonb,
   'validado', '1972-01-30', 'masculino', 'argentina', 5600)
on conflict (id) do nothing;

insert into public.care_searches (id, tenant_id, patient_name, pathologies_required, schedule_type, status)
values
  ('ccccccc3-0000-4000-8000-000000000001',
   (select id from public.tenants where slug = 'presdemo'),
   'Paciente de Ejemplo Norte', '["alzheimer"]'::jsonb, 'turno_manana', 'activa'),
  ('ccccccc3-0000-4000-8000-000000000002',
   (select id from public.tenants where slug = 'cuidarnorte'),
   'Paciente de Ejemplo Oeste', '["parkinson"]'::jsonb, 'guardia_12', 'activa')
on conflict (id) do nothing;
