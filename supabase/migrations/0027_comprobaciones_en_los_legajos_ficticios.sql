-- 0027: comprobaciones cargadas en los legajos ficticios
--
-- Por qué
-- -------
-- La 0026 agregó al directorio la lista de qué se le comprobó a cada legajo, y
-- la siembra no tenía ni una comprobación cargada: la columna devolvía lista
-- vacía para las siete personas publicadas. Eso no es una pantalla vacía sin
-- consecuencia — es una prueba que no puede fallar. Una consulta rota y una
-- consulta correcta contra una tabla vacía contestan exactamente lo mismo.
--
-- Así que esta migración carga comprobaciones de verdad, repartidas para que
-- cada regla de la 0026 tenga a alguien que la ponga a prueba:
--
--   Marta Quiroga      ninguna                      -> lista vacía
--   Alejandra Sosa     domicilio, referencia, curso -> tres, y una es el curso
--   Ramiro Cáceres     domicilio verificado,
--                      matrícula sólo *presentada*  -> una sola: el estado manda
--   Nadia Britos       domicilio, referencia, título
--                      y antecedentes penales
--                      *verificados*                -> tres: los penales no salen
--   Omar Zabala        referencia y curso           -> dos, en la otra Prestadora
--
-- Los dos casos del medio son los que valen: si alguien escribe la consulta sin
-- mirar el estado, Ramiro pasa a tener dos; si alguien la escribe sin la lista
-- de tipos, Nadia pasa a tener cuatro y el directorio publica que a una persona
-- se le comprobaron los antecedentes penales.
--
-- Datos inventados, como todo el resto de la siembra. Ninguna persona real.


-- ── 1. Los papeles comprobados ────────────────────────────────────────────
-- `verificado_el` se escribe porque un papel comprobado sin fecha de
-- comprobación es un dato a medias del lado de la Prestadora. No sale al
-- directorio: la 0026 devuelve qué se comprobó y nunca cuándo.
insert into public.verificaciones_asistente
  (tenant_id, caregiver_id, tipo, estado, verificado_el)
select c.tenant_id, c.id, v.tipo, v.estado,
       case when v.estado = 'verificado' then now() end
  from public.caregivers c
  join (values
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'domicilio',  'verificado'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'referencia', 'verificado'),

          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'domicilio',  'verificado'),
          -- Presentada, no comprobada. No tiene que salir.
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'matricula',  'presentado'),

          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'domicilio',  'verificado'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'referencia', 'verificado'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'titulo',     'verificado'),
          -- Comprobados de verdad, y aun así no salen: son de la puerta.
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'penales',    'verificado'),

          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'referencia', 'verificado')
       ) as v(caregiver_id, tipo, estado) on v.caregiver_id = c.id
on conflict (caregiver_id, tipo) do nothing;


-- ── 2. Los cursos aprobados ───────────────────────────────────────────────
-- Contra la única evaluación que existe, la de muestra que sembró la 0008. Se
-- guarda un intento aprobado entero, con sus respuestas, porque la tabla lo
-- pide y porque un intento sin respuestas no se parece a ninguno de verdad.
insert into public.intentos_evaluacion
  (tenant_id, caregiver_id, evaluacion_id, respuestas,
   respuestas_correctas, preguntas_totales, porcentaje, aprobado)
select c.tenant_id, c.id, e.id, '{}'::jsonb, 2, 2, 100, true
  from public.caregivers c
 cross join public.evaluaciones e
 where c.id in ('aaaaaaa1-0000-4000-8000-000000000003',
                'bbbbbbb2-0000-4000-8000-000000000003')
   and e.clave = 'gerontologico_primeros_auxilios'
   and e.tenant_id is null
   and not exists (select 1
                     from public.intentos_evaluacion i
                    where i.caregiver_id = c.id
                      and i.evaluacion_id = e.id
                      and i.aprobado);


notify pgrst, 'reload schema';
