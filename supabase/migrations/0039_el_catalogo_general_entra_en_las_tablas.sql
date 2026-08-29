-- =====================================================================
-- 0039 — El catálogo general entra en las tablas
--
-- Los veinticuatro vocabularios y sus ciento cuarenta y dos opciones,
-- tal como estaban en `data/catalogo-vocabularios.json`, ahora como
-- filas con `tenant_id` en nulo: el catálogo general, el que trae el
-- producto y ve todo el mundo.
--
-- **Generada, no escrita a mano.** La produjo
-- `scripts/generar_vocabularios.mjs` leyendo el archivo, y por eso no
-- hay diferencias entre lo que había y lo que hay. Escribir ciento
-- cuarenta y dos `insert` a mano es exactamente la clase de trabajo
-- donde se pierde una opción sin que nadie lo note.
--
-- **Lo que esta migración deja al descubierto y antes estaba tapado.**
-- `guardia_12` no tiene `en` ni `pt-BR`. No es un olvido: «Guardia» es
-- palabra del glosario de los dos productos, no está traducida en ningún
-- archivo del proyecto, y reusar «shift» o «turno» pisaría una
-- distinción que el glosario define a propósito. La decisión es del
-- Desarrollador. Hasta acá eso vivía como un comentario adentro del
-- JSON; ahora entra con `i18n_pendiente` en verdadero y su nota, y se
-- puede preguntar:
--
--     select clave, nota from public.vocabulario_items
--      where i18n_pendiente;
--
-- **De acá en adelante el archivo no se edita.** Se edita la base y se
-- vuelve a generar el archivo con `scripts/generar_vocabularios.mjs`.
-- Una opción agregada al archivo a mano no llega a ninguna pantalla y
-- además hace fallar el chequeo, que es la forma buena de enterarse.
-- =====================================================================

-- --- genero --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'genero', '{"en": "Gender of the person", "es-AR": "Género de la persona", "pt-BR": "Gênero da pessoa"}'::jsonb, true, 1)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('femenino', '{"en": "Female", "es-AR": "Femenino", "pt-BR": "Feminino"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('masculino', '{"en": "Male", "es-AR": "Masculino", "pt-BR": "Masculino"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('otro', '{"en": "Other", "es-AR": "Otro", "pt-BR": "Outro"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('sin_declarar', '{"en": "Prefer not to say", "es-AR": "Prefiero no decirlo", "pt-BR": "Prefiro não dizer"}'::jsonb, '{}'::jsonb, 4, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'genero' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- genero_preferido --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'genero_preferido', '{"en": "Gender of Caregiver the Family prefers", "es-AR": "Género de Asistente que la Familia prefiere", "pt-BR": "Gênero de Assistente que a Família prefere"}'::jsonb, true, 2)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('indistinto', '{"en": "No preference", "es-AR": "Indistinto", "pt-BR": "Indiferente"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('femenino', '{"en": "Female only", "es-AR": "Femenino únicamente", "pt-BR": "Somente feminino"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('masculino', '{"en": "Male only", "es-AR": "Masculino únicamente", "pt-BR": "Somente masculino"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'genero_preferido' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- tipo_asistente --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'tipo_asistente', '{"en": "Type of Caregiver", "es-AR": "Tipo de Asistente", "pt-BR": "Tipo de Assistente"}'::jsonb, true, 3)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('cuidador_domiciliario', '{"en": "Caregiver / Home carer", "es-AR": "Asistente / Cuidador domiciliario", "pt-BR": "Assistente / Cuidador domiciliar"}'::jsonb, '{"bajada": {"en": "Comprehensive assistance at home", "es-AR": "Asistencia integral en el hogar", "pt-BR": "Assistência integral no domicílio"}, "icono": "fa-user-nurse", "requiere_matricula": false}'::jsonb, 1, false, null),
  ('enfermero_universitario', '{"en": "University-trained nurse", "es-AR": "Enfermero universitario", "pt-BR": "Enfermeiro com formação universitária"}'::jsonb, '{"bajada": {"en": "Clinical care and wound dressing", "es-AR": "Cuidados clínicos y curaciones", "pt-BR": "Cuidados clínicos e curativos"}, "icono": "fa-stethoscope", "requiere_matricula": true}'::jsonb, 2, false, null),
  ('auxiliar_enfermeria', '{"en": "Nursing auxiliary", "es-AR": "Auxiliar de enfermería", "pt-BR": "Auxiliar de enfermagem"}'::jsonb, '{"requiere_matricula": true}'::jsonb, 3, false, null),
  ('acompanante_terapeutico', '{"en": "Therapeutic companion", "es-AR": "Acompañante terapéutico", "pt-BR": "Acompanhante terapêutico"}'::jsonb, '{"bajada": {"en": "Emotional and behavioural support", "es-AR": "Soporte emocional y conductual", "pt-BR": "Apoio emocional e comportamental"}, "icono": "fa-hands-helping", "requiere_matricula": true}'::jsonb, 4, false, null),
  ('gerontologo', '{"en": "Gerontology specialist", "es-AR": "Especialista en gerontología", "pt-BR": "Especialista em gerontologia"}'::jsonb, '{"bajada": {"en": "Specialised care for older adults", "es-AR": "Atención especializada en adultos mayores", "pt-BR": "Atendimento especializado a pessoas idosas"}, "icono": "fa-ribbon", "requiere_matricula": true}'::jsonb, 5, false, null),
  ('voluntario', '{"en": "Volunteer / Companion", "es-AR": "Voluntario / Acompañante", "pt-BR": "Voluntário / Acompanhante"}'::jsonb, '{"requiere_matricula": false}'::jsonb, 6, false, null),
  ('promotor_salud', '{"en": "Health promoter", "es-AR": "Promotor de salud", "pt-BR": "Promotor de saúde"}'::jsonb, '{"requiere_matricula": true}'::jsonb, 7, false, null),
  ('otro', '{"en": "Other", "es-AR": "Otro", "pt-BR": "Outro"}'::jsonb, '{"requiere_matricula": false}'::jsonb, 8, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'tipo_asistente' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- condicion_fiscal --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'condicion_fiscal', '{"en": "Tax status", "es-AR": "Condición fiscal", "pt-BR": "Situação fiscal"}'::jsonb, true, 4)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('monotributo_social', '{"en": "Monotributo social", "es-AR": "Monotributo social", "pt-BR": "Monotributo social"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('monotributo_general', '{"en": "Monotributo general", "es-AR": "Monotributo general", "pt-BR": "Monotributo general"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('responsable_inscripto', '{"en": "Responsable inscripto", "es-AR": "Responsable inscripto", "pt-BR": "Responsable inscripto"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('no_inscripto', '{"en": "Not registered / Application in progress", "es-AR": "No inscripto / En trámite", "pt-BR": "Não inscrito / Em andamento"}'::jsonb, '{}'::jsonb, 4, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'condicion_fiscal' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- nivel_educativo --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'nivel_educativo', '{"en": "Highest level of education reached", "es-AR": "Nivel educativo alcanzado", "pt-BR": "Nível de escolaridade alcançado"}'::jsonb, true, 5)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('secundario', '{"en": "Secondary school completed", "es-AR": "Secundario completo", "pt-BR": "Ensino médio completo"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('terciario', '{"en": "Tertiary education or university technical degree", "es-AR": "Terciario o tecnólogo universitario", "pt-BR": "Curso técnico ou tecnólogo"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('universitario_en_curso', '{"en": "University studies in progress", "es-AR": "Universitario en curso", "pt-BR": "Ensino superior em andamento"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('universitario_graduado', '{"en": "University graduate", "es-AR": "Universitario graduado", "pt-BR": "Ensino superior completo"}'::jsonb, '{}'::jsonb, 4, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'nivel_educativo' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- patologia --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'patologia', '{"en": "Conditions the Caregiver works with", "es-AR": "Patologías con las que el Asistente trabaja", "pt-BR": "Patologias com as quais o Assistente trabalha"}'::jsonb, false, 6)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('alzheimer', '{"en": "Alzheimer''s", "es-AR": "Alzheimer", "pt-BR": "Alzheimer"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('deterioro_cognitivo', '{"en": "Cognitive impairment", "es-AR": "Deterioro cognitivo", "pt-BR": "Declínio cognitivo"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('parkinson', '{"en": "Parkinson''s", "es-AR": "Parkinson", "pt-BR": "Parkinson"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('acv', '{"en": "Stroke", "es-AR": "ACV", "pt-BR": "AVC"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('epilepsia', '{"en": "Epilepsy or seizures", "es-AR": "Epilepsia o convulsiones", "pt-BR": "Epilepsia ou convulsões"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('psiquiatricas', '{"en": "Psychiatric conditions", "es-AR": "Patologías psiquiátricas", "pt-BR": "Patologias psiquiátricas"}'::jsonb, '{}'::jsonb, 6, false, null),
  ('diabetes', '{"en": "Diabetes", "es-AR": "Diabetes", "pt-BR": "Diabetes"}'::jsonb, '{}'::jsonb, 7, false, null),
  ('hipertension', '{"en": "Hypertension", "es-AR": "Hipertensión", "pt-BR": "Hipertensão"}'::jsonb, '{}'::jsonb, 8, false, null),
  ('anticoagulados', '{"en": "Patients on anticoagulants", "es-AR": "Pacientes anticoagulados", "pt-BR": "Pacientes anticoagulados"}'::jsonb, '{}'::jsonb, 9, false, null),
  ('arritmias', '{"en": "Arrhythmias", "es-AR": "Arritmias", "pt-BR": "Arritmias"}'::jsonb, '{}'::jsonb, 10, false, null),
  ('coronarias', '{"en": "Coronary heart disease", "es-AR": "Enfermedades coronarias", "pt-BR": "Doenças coronarianas"}'::jsonb, '{}'::jsonb, 11, false, null),
  ('epoc', '{"en": "COPD", "es-AR": "EPOC", "pt-BR": "DPOC"}'::jsonb, '{}'::jsonb, 12, false, null),
  ('sincope', '{"en": "Syncope", "es-AR": "Síncope", "pt-BR": "Síncope"}'::jsonb, '{}'::jsonb, 13, false, null),
  ('obesidad', '{"en": "Obesity", "es-AR": "Obesidad", "pt-BR": "Obesidade"}'::jsonb, '{}'::jsonb, 14, false, null),
  ('ceguera', '{"en": "Blindness", "es-AR": "Ceguera", "pt-BR": "Cegueira"}'::jsonb, '{}'::jsonb, 15, false, null),
  ('amputaciones', '{"en": "Amputations", "es-AR": "Amputaciones", "pt-BR": "Amputações"}'::jsonb, '{}'::jsonb, 16, false, null),
  ('postrados', '{"en": "Bedbound patients", "es-AR": "Pacientes postrados", "pt-BR": "Pacientes acamados"}'::jsonb, '{}'::jsonb, 17, false, null),
  ('paliativos', '{"en": "Palliative care", "es-AR": "Cuidados paliativos", "pt-BR": "Cuidados paliativos"}'::jsonb, '{}'::jsonb, 18, false, null),
  ('oncologico', '{"en": "Cancer patient", "es-AR": "Paciente oncológico", "pt-BR": "Paciente oncológico"}'::jsonb, '{}'::jsonb, 19, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'patologia' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- tarea_cuidado --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'tarea_cuidado', '{"en": "Care tasks the Caregiver performs", "es-AR": "Tareas de cuidado que el Asistente realiza", "pt-BR": "Tarefas de cuidado que o Assistente realiza"}'::jsonb, false, 7)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('higiene', '{"en": "Patient hygiene and comfort", "es-AR": "Higiene y confort del paciente", "pt-BR": "Higiene e conforto do paciente"}'::jsonb, '{"bajada": {"en": "Bathing, changing incontinence pads, personal grooming", "es-AR": "Baño, cambio de pañales, aseo personal", "pt-BR": "Banho, troca de fraldas, higiene pessoal"}, "icono": "fa-bath"}'::jsonb, 1, false, null),
  ('signos', '{"en": "Monitoring of vital signs", "es-AR": "Control de signos vitales", "pt-BR": "Controle de sinais vitais"}'::jsonb, '{"bajada": {"en": "Blood pressure, blood glucose, oxygen saturation", "es-AR": "Presión, glucemia, saturación", "pt-BR": "Pressão, glicemia, saturação"}, "icono": "fa-heartbeat"}'::jsonb, 2, false, null),
  ('medicacion', '{"en": "Administration of medication", "es-AR": "Administración de medicación", "pt-BR": "Administração de medicação"}'::jsonb, '{"bajada": {"en": "Dose reminders and administration", "es-AR": "Recordatorio y administración de dosis", "pt-BR": "Lembrete e administração de doses"}, "icono": "fa-pills"}'::jsonb, 3, false, null),
  ('inyecciones', '{"en": "Giving injections and fitting tubes", "es-AR": "Aplicación de inyecciones y sondas", "pt-BR": "Aplicação de injeções e sondas"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('cocina', '{"en": "Cooking adapted to the patient, and nutrition", "es-AR": "Cocina adaptada al paciente y nutrición", "pt-BR": "Cozinha adaptada ao paciente e nutrição"}'::jsonb, '{"bajada": {"en": "Light cooking, special diets", "es-AR": "Cocina ligera, dieta especial", "pt-BR": "Cozinha leve, dieta especial"}, "icono": "fa-utensils"}'::jsonb, 5, false, null),
  ('movilizacion', '{"en": "Moving a patient with no mobility", "es-AR": "Movilización de paciente sin movilidad", "pt-BR": "Mobilização de paciente sem mobilidade"}'::jsonb, '{"bajada": {"en": "Wheelchair, walks, transfers", "es-AR": "Silla de ruedas, paseos, transferencias", "pt-BR": "Cadeira de rodas, passeios, transferências"}, "icono": "fa-wheelchair"}'::jsonb, 6, false, null),
  ('estimulacion_cognitiva', '{"en": "Cognitive stimulation and memory games", "es-AR": "Estimulación cognitiva y juegos de memoria", "pt-BR": "Estimulação cognitiva e jogos de memória"}'::jsonb, '{"bajada": {"en": "Companionship, memory games", "es-AR": "Acompañamiento, juegos de memoria", "pt-BR": "Acompanhamento, jogos de memória"}, "icono": "fa-brain"}'::jsonb, 7, false, null),
  ('solo_acompanamiento', '{"en": "Companionship only, no care tasks", "es-AR": "Solo acompañamiento, sin tareas de cuidado", "pt-BR": "Somente acompanhamento, sem tarefas de cuidado"}'::jsonb, '{}'::jsonb, 8, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'tarea_cuidado' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- modalidad_contratacion --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'modalidad_contratacion', '{"en": "Intensity of the engagement", "es-AR": "Intensidad de la contratación", "pt-BR": "Intensidade da contratação"}'::jsonb, true, 8)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('horas', '{"en": "By the hour", "es-AR": "Por horas", "pt-BR": "Por hora"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('guardia_12', '{"es-AR": "Guardia de 12 horas"}'::jsonb, '{}'::jsonb, 2, true, '«Guardia» es palabra del glosario de los dos productos y no está traducida en ningún archivo del proyecto. «turno» ya es «shift»/«turno», y el glosario dice que una Guardia NO es un turno, así que reusar esa palabra pisaría una distinción que el glosario define a propósito. Se deja sin «en» ni «pt-BR» —cae al castellano— hasta que el Desarrollador decida. Anotado en docs/PENDIENTES.md.'),
  ('jornada_completa', '{"en": "Full working day", "es-AR": "Jornada completa", "pt-BR": "Jornada completa"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'modalidad_contratacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- frecuencia --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'frecuencia', '{"en": "Frequency of the service", "es-AR": "Frecuencia del servicio", "pt-BR": "Frequência do serviço"}'::jsonb, true, 9)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('recurrente', '{"en": "Recurring (fixed days each week)", "es-AR": "Recurrente (días fijos por semana)", "pt-BR": "Recorrente (dias fixos por semana)"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('eventual', '{"en": "One-off (a single occasion)", "es-AR": "Eventual (por única vez)", "pt-BR": "Eventual (uma única vez)"}'::jsonb, '{}'::jsonb, 2, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'frecuencia' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- dia_semana --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'dia_semana', '{"en": "Days of the week", "es-AR": "Días de la semana", "pt-BR": "Dias da semana"}'::jsonb, false, 10)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('lunes', '{"en": "Monday", "es-AR": "Lunes", "pt-BR": "Segunda-feira"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('martes', '{"en": "Tuesday", "es-AR": "Martes", "pt-BR": "Terça-feira"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('miercoles', '{"en": "Wednesday", "es-AR": "Miércoles", "pt-BR": "Quarta-feira"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('jueves', '{"en": "Thursday", "es-AR": "Jueves", "pt-BR": "Quinta-feira"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('viernes', '{"en": "Friday", "es-AR": "Viernes", "pt-BR": "Sexta-feira"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('sabado', '{"en": "Saturday", "es-AR": "Sábado", "pt-BR": "Sábado"}'::jsonb, '{}'::jsonb, 6, false, null),
  ('domingo', '{"en": "Sunday", "es-AR": "Domingo", "pt-BR": "Domingo"}'::jsonb, '{}'::jsonb, 7, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'dia_semana' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- turno --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'turno', '{"en": "Time band", "es-AR": "Franja horaria", "pt-BR": "Faixa horária"}'::jsonb, false, 11)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('manana', '{"en": "Morning", "es-AR": "Mañana", "pt-BR": "Manhã"}'::jsonb, '{"horario": "6 a 14"}'::jsonb, 1, false, null),
  ('tarde', '{"en": "Afternoon", "es-AR": "Tarde", "pt-BR": "Tarde"}'::jsonb, '{"horario": "14 a 22"}'::jsonb, 2, false, null),
  ('noche', '{"en": "Night", "es-AR": "Noche", "pt-BR": "Noite"}'::jsonb, '{"horario": "22 a 6"}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'turno' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- nivel_reputacion --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'nivel_reputacion', '{"en": "Level of the Caregiver in the catalogue", "es-AR": "Nivel del Asistente en el catálogo", "pt-BR": "Nível do Assistente no catálogo"}'::jsonb, true, 12)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('bronce', '{"en": "Verified Caregiver (Bronze)", "es-AR": "Asistente verificado (Bronce)", "pt-BR": "Assistente verificado (Bronze)"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('plata', '{"en": "Senior Caregiver (Silver)", "es-AR": "Asistente senior (Plata)", "pt-BR": "Assistente sênior (Prata)"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('oro', '{"en": "Distinguished Caregiver (Gold)", "es-AR": "Asistente destacado (Oro)", "pt-BR": "Assistente destacado (Ouro)"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'nivel_reputacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- verificacion --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'verificacion', '{"en": "Verifications of the Caregiver''s personal file", "es-AR": "Verificaciones del legajo del Asistente", "pt-BR": "Verificações do cadastro do Assistente"}'::jsonb, false, 13)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('dni', '{"en": "Identity document", "es-AR": "Documento de identidad", "pt-BR": "Documento de identidade"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('domicilio', '{"en": "Home address", "es-AR": "Domicilio", "pt-BR": "Endereço"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('titulo', '{"en": "Qualification backing the profession", "es-AR": "Título que respalda la profesión", "pt-BR": "Diploma que respalda a profissão"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('matricula', '{"en": "Valid professional licence", "es-AR": "Matrícula vigente", "pt-BR": "Registro profissional vigente"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('penales', '{"en": "Criminal record certificate", "es-AR": "Certificado de antecedentes penales", "pt-BR": "Certificado de antecedentes criminais"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('salud', '{"en": "Health certificate", "es-AR": "Certificado de salud", "pt-BR": "Atestado de saúde"}'::jsonb, '{}'::jsonb, 6, false, null),
  ('referencia', '{"en": "Verified work reference", "es-AR": "Referencia laboral verificada", "pt-BR": "Referência profissional verificada"}'::jsonb, '{}'::jsonb, 7, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'verificacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- comprobacion --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'comprobacion', '{"en": "What has been checked about a Caregiver and the directory states", "es-AR": "Lo que se le comprobó a un Asistente y el directorio dice", "pt-BR": "O que foi comprovado sobre um Assistente e o diretório informa"}'::jsonb, true, 14)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('domicilio', '{"en": "Home address checked", "es-AR": "Domicilio comprobado", "pt-BR": "Endereço comprovado"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('referencia', '{"en": "References checked", "es-AR": "Referencias comprobadas", "pt-BR": "Referências comprovadas"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('matricula', '{"en": "Professional licence checked", "es-AR": "Matrícula comprobada", "pt-BR": "Registro profissional comprovado"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('titulo', '{"en": "Qualification checked", "es-AR": "Título comprobado", "pt-BR": "Diploma comprovado"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('curso_aprobado', '{"en": "Approved course", "es-AR": "Curso aprobado", "pt-BR": "Curso aprovado"}'::jsonb, '{}'::jsonb, 5, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'comprobacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- certificacion --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'certificacion', '{"en": "Accredited courses the Caregiver declares", "es-AR": "Cursos acreditados que el Asistente declara", "pt-BR": "Cursos acreditados que o Assistente declara"}'::jsonb, false, 15)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('curso_gerontologico', '{"en": "General course for home care Caregivers", "es-AR": "Curso general de asistente de cuidado domiciliario", "pt-BR": "Curso geral de assistente de cuidado domiciliar"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('deterioro_cognitivo', '{"en": "Specialisation in cognitive impairment and Alzheimer''s", "es-AR": "Especialización en deterioro cognitivo y Alzheimer", "pt-BR": "Especialização em declínio cognitivo e Alzheimer"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('primeros_auxilios', '{"en": "First aid and basic life support (CPR)", "es-AR": "Primeros auxilios y soporte vital básico (RCP)", "pt-BR": "Primeiros socorros e suporte básico de vida (RCP)"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('nutricion', '{"en": "Nutrition, dietetics and adapted cooking", "es-AR": "Nutrición, dietética y cocina adaptada", "pt-BR": "Nutrição, dietética e cozinha adaptada"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('pacientes_complejos', '{"en": "Care of bedbound patients and management of tubes", "es-AR": "Cuidado de pacientes postrados y manejo de sondas", "pt-BR": "Cuidado de pacientes acamados e manejo de sondas"}'::jsonb, '{}'::jsonb, 5, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'certificacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- motivo_consulta --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'motivo_consulta', '{"en": "Reason a Family is writing", "es-AR": "Motivo por el que una Familia escribe", "pt-BR": "Motivo pelo qual uma Família escreve"}'::jsonb, true, 16)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('busco_asistente', '{"en": "Looking for a Caregiver", "es-AR": "Busco un Asistente", "pt-BR": "Procuro um Assistente"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('acompanamiento_online', '{"en": "Online companionship and guidance", "es-AR": "Acompañamiento y asesoramiento online", "pt-BR": "Acompanhamento e orientação online"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('cursos', '{"en": "Courses for families", "es-AR": "Cursos para familias", "pt-BR": "Cursos para famílias"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('orientacion', '{"en": "Guidance on caring for a relative", "es-AR": "Orientación para cuidar a un familiar", "pt-BR": "Orientação para cuidar de um familiar"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('apoyo_cuidador', '{"en": "Emotional support for whoever cares", "es-AR": "Apoyo emocional para quien cuida", "pt-BR": "Apoio emocional para quem cuida"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('entender_salud', '{"en": "Understanding a relative''s health situation", "es-AR": "Entender la situación de salud de un familiar", "pt-BR": "Entender a situação de saúde de um familiar"}'::jsonb, '{}'::jsonb, 6, false, null),
  ('coordinar', '{"en": "Coordinating care among several relatives", "es-AR": "Coordinar cuidados entre varios familiares", "pt-BR": "Coordenar cuidados entre vários familiares"}'::jsonb, '{}'::jsonb, 7, false, null),
  ('otro', '{"en": "Other", "es-AR": "Otro", "pt-BR": "Outro"}'::jsonb, '{}'::jsonb, 8, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'motivo_consulta' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- zona --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'zona', '{"en": "Coverage area", "es-AR": "Zona de cobertura", "pt-BR": "Zona de cobertura"}'::jsonb, true, 17)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('caba', '{"en": "City of Buenos Aires", "es-AR": "Ciudad de Buenos Aires", "pt-BR": "Cidade de Buenos Aires"}'::jsonb, '{"region": null}'::jsonb, 1, false, null),
  ('palermo', '{"en": "Palermo", "es-AR": "Palermo", "pt-BR": "Palermo"}'::jsonb, '{"region": "caba"}'::jsonb, 2, false, null),
  ('belgrano', '{"en": "Belgrano", "es-AR": "Belgrano", "pt-BR": "Belgrano"}'::jsonb, '{"region": "caba"}'::jsonb, 3, false, null),
  ('recoleta', '{"en": "Recoleta", "es-AR": "Recoleta", "pt-BR": "Recoleta"}'::jsonb, '{"region": "caba"}'::jsonb, 4, false, null),
  ('villa_urquiza', '{"en": "Villa Urquiza", "es-AR": "Villa Urquiza", "pt-BR": "Villa Urquiza"}'::jsonb, '{"region": "caba"}'::jsonb, 5, false, null),
  ('nunez', '{"en": "Núñez", "es-AR": "Núñez", "pt-BR": "Núñez"}'::jsonb, '{"region": "caba"}'::jsonb, 6, false, null),
  ('caballito', '{"en": "Caballito", "es-AR": "Caballito", "pt-BR": "Caballito"}'::jsonb, '{"region": "caba"}'::jsonb, 7, false, null),
  ('flores', '{"en": "Flores", "es-AR": "Flores", "pt-BR": "Flores"}'::jsonb, '{"region": "caba"}'::jsonb, 8, false, null),
  ('san_telmo', '{"en": "San Telmo", "es-AR": "San Telmo", "pt-BR": "San Telmo"}'::jsonb, '{"region": "caba"}'::jsonb, 9, false, null),
  ('zona_norte', '{"en": "North Zone", "es-AR": "Zona Norte", "pt-BR": "Zona Norte"}'::jsonb, '{"region": null}'::jsonb, 10, false, null),
  ('san_isidro', '{"en": "San Isidro", "es-AR": "San Isidro", "pt-BR": "San Isidro"}'::jsonb, '{"region": "zona_norte"}'::jsonb, 11, false, null),
  ('vicente_lopez', '{"en": "Vicente López", "es-AR": "Vicente López", "pt-BR": "Vicente López"}'::jsonb, '{"region": "zona_norte"}'::jsonb, 12, false, null),
  ('grand_bourg', '{"en": "Grand Bourg", "es-AR": "Grand Bourg", "pt-BR": "Grand Bourg"}'::jsonb, '{"region": "zona_norte"}'::jsonb, 13, false, null),
  ('zona_sur', '{"en": "South Zone", "es-AR": "Zona Sur", "pt-BR": "Zona Sul"}'::jsonb, '{"region": null}'::jsonb, 14, false, null),
  ('quilmes', '{"en": "Quilmes", "es-AR": "Quilmes", "pt-BR": "Quilmes"}'::jsonb, '{"region": "zona_sur"}'::jsonb, 15, false, null),
  ('avellaneda', '{"en": "Avellaneda", "es-AR": "Avellaneda", "pt-BR": "Avellaneda"}'::jsonb, '{"region": "zona_sur"}'::jsonb, 16, false, null),
  ('lomas', '{"en": "Lomas de Zamora", "es-AR": "Lomas de Zamora", "pt-BR": "Lomas de Zamora"}'::jsonb, '{"region": "zona_sur"}'::jsonb, 17, false, null),
  ('zona_oeste', '{"en": "West Zone", "es-AR": "Zona Oeste", "pt-BR": "Zona Oeste"}'::jsonb, '{"region": null}'::jsonb, 18, false, null),
  ('moron', '{"en": "Morón", "es-AR": "Morón", "pt-BR": "Morón"}'::jsonb, '{"region": "zona_oeste"}'::jsonb, 19, false, null),
  ('ramos_mejia', '{"en": "Ramos Mejía", "es-AR": "Ramos Mejía", "pt-BR": "Ramos Mejía"}'::jsonb, '{"region": "zona_oeste"}'::jsonb, 20, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'zona' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- tarea_hogar --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'tarea_hogar', '{"en": "Household tasks the Caregiver performs", "es-AR": "Tareas domésticas que el Asistente realiza", "pt-BR": "Tarefas domésticas que o Assistente realiza"}'::jsonb, false, 18)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('limpieza', '{"en": "Cleaning the home", "es-AR": "Limpieza del hogar", "pt-BR": "Limpeza da casa"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('tendido_cama', '{"en": "Making the beds", "es-AR": "Tendido de cama", "pt-BR": "Arrumação das camas"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('lavado', '{"en": "Washing clothes", "es-AR": "Lavado de ropa", "pt-BR": "Lavagem de roupa"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('planchado', '{"en": "Ironing clothes", "es-AR": "Planchado de ropa", "pt-BR": "Passar roupa"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('cocina_hogar', '{"en": "Cooking for the household", "es-AR": "Cocina para el hogar", "pt-BR": "Cozinhar para a casa"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('compras', '{"en": "Shopping for the household", "es-AR": "Compras para el hogar", "pt-BR": "Compras para a casa"}'::jsonb, '{}'::jsonb, 6, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'tarea_hogar' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- tarea_acompanamiento --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'tarea_acompanamiento', '{"en": "Companionship tasks the Caregiver performs", "es-AR": "Tareas de acompañamiento que el Asistente realiza", "pt-BR": "Tarefas de acompanhamento que o Assistente realiza"}'::jsonb, false, 19)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('paseos', '{"en": "Going out for walks with the patient", "es-AR": "Pasear con el paciente", "pt-BR": "Passear com o paciente"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('turnos_medicos', '{"en": "Accompanying to medical appointments", "es-AR": "Acompañar a turnos médicos", "pt-BR": "Acompanhar em consultas médicas"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('tramites', '{"en": "Running errands and paperwork", "es-AR": "Realizar trámites", "pt-BR": "Realizar trâmites"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('tramites_obra_social', '{"en": "Paperwork with the health insurance provider", "es-AR": "Trámites ante la Obra Social", "pt-BR": "Trâmites junto ao plano de saúde"}'::jsonb, '{}'::jsonb, 4, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'tarea_acompanamiento' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- discapacidad --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'discapacidad', '{"en": "Disabilities the Caregiver has experience with", "es-AR": "Discapacidades con las que el Asistente tiene experiencia", "pt-BR": "Deficiências com as quais o Assistente tem experiência"}'::jsonb, false, 20)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('visual', '{"en": "Visual disability", "es-AR": "Discapacidad visual", "pt-BR": "Deficiência visual"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('auditiva', '{"en": "Hearing disability", "es-AR": "Discapacidad auditiva", "pt-BR": "Deficiência auditiva"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('motora', '{"en": "Motor disability", "es-AR": "Discapacidad motora", "pt-BR": "Deficiência motora"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('intelectual', '{"en": "Intellectual disability", "es-AR": "Discapacidad intelectual", "pt-BR": "Deficiência intelectual"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('visceral', '{"en": "Visceral disability", "es-AR": "Discapacidad visceral", "pt-BR": "Deficiência visceral"}'::jsonb, '{}'::jsonb, 5, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'discapacidad' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- retiro --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'retiro', '{"en": "Living out or living in at the home", "es-AR": "Con retiro o sin retiro del domicilio", "pt-BR": "Com ou sem dormida no domicílio"}'::jsonb, false, 21)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('con_retiro', '{"en": "Living out", "es-AR": "Con retiro", "pt-BR": "Sem dormir na casa"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('sin_retiro', '{"en": "Living in, sleeping at the home", "es-AR": "Sin retiro, cama adentro", "pt-BR": "Com dormida, morando na casa"}'::jsonb, '{}'::jsonb, 2, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'retiro' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- puesto_experiencia --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'puesto_experiencia', '{"en": "Position declared in previous work experience", "es-AR": "Puesto declarado en una experiencia laboral anterior", "pt-BR": "Cargo declarado em uma experiência profissional anterior"}'::jsonb, true, 22)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('cuidador_domiciliario', '{"en": "Home carer", "es-AR": "Cuidador domiciliario", "pt-BR": "Cuidador domiciliar"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('auxiliar_enfermeria', '{"en": "Nursing auxiliary", "es-AR": "Auxiliar de enfermería", "pt-BR": "Auxiliar de enfermagem"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('gerontologo', '{"en": "Gerontological Caregiver", "es-AR": "Asistente gerontológico", "pt-BR": "Assistente gerontológico"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('acompanante_terapeutico', '{"en": "Therapeutic companion", "es-AR": "Acompañante terapéutico", "pt-BR": "Acompanhante terapêutico"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('personal_casas_particulares', '{"en": "Private household staff", "es-AR": "Personal de casas particulares", "pt-BR": "Empregado em casas particulares"}'::jsonb, '{}'::jsonb, 5, false, null),
  ('otro', '{"en": "Other", "es-AR": "Otro", "pt-BR": "Outro"}'::jsonb, '{}'::jsonb, 6, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'puesto_experiencia' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- modalidad_curso --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'modalidad_curso', '{"en": "How the course is delivered", "es-AR": "Cómo se cursa", "pt-BR": "Como o curso é feito"}'::jsonb, true, 23)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('online', '{"en": "Online", "es-AR": "Online", "pt-BR": "Online"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('presencial', '{"en": "In person", "es-AR": "Presencial", "pt-BR": "Presencial"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('mixta', '{"en": "Blended", "es-AR": "Mixta", "pt-BR": "Mista"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'modalidad_curso' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- --- nivel_curso --------------------------------------------------
insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'nivel_curso', '{"en": "Level of the course", "es-AR": "Nivel del curso", "pt-BR": "Nível do curso"}'::jsonb, true, 24)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('basico', '{"en": "Basic level", "es-AR": "Nivel básico", "pt-BR": "Nível básico"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('intermedio', '{"en": "Intermediate level", "es-AR": "Nivel intermedio", "pt-BR": "Nível intermediário"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('avanzado', '{"en": "Advanced level", "es-AR": "Nivel avanzado", "pt-BR": "Nível avançado"}'::jsonb, '{}'::jsonb, 3, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'nivel_curso' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

notify pgrst, 'reload schema';
