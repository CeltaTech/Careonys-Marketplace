-- ---------------------------------------------------------------------------
-- EL ASISTENTE VE EL AVISO, Y NO VE A LA FAMILIA
--
-- La migración 0054 creó la postulación, la conversación y los mensajes. Al
-- escribir la pantalla apareció que el camino seguía cerrado un paso antes:
-- **el Asistente no puede ver ningún aviso**. La política de `avisos`
-- (migración 0020 §2) deja mirar a la Familia que lo publicó y al personal de
-- la Prestadora, y un Asistente no es ninguno de los dos. Podía postularse a un
-- aviso que no tenía forma de encontrar.
--
-- Abrirle la política entera sería peor que no abrirla. El aviso guarda
-- `contact_info` —los datos de contacto de la Familia— y `familia_id`. Un
-- Asistente que lee la fila completa se saltea a la Prestadora por el camino
-- más corto que hay: la Familia y él arreglan por afuera y el contacto, que es
-- el único hecho por el que la Prestadora cobra, nunca ocurre adentro del
-- software. Es la misma razón por la que el directorio no muestra el teléfono
-- del Asistente.
--
-- Y la RLS no sabe de columnas: decide qué filas se ven, no qué partes de una
-- fila. La forma que este proyecto ya usa para eso está en la migración 0021:
-- una función `security definer` que devuelve **sólo las columnas que se pueden
-- mostrar**, con la vista o la tabla de abajo cerrada a todos. Se repite acá,
-- que es lo que hace la regla del punto único de verdad.
--
-- Van cuatro funciones, una por cada cosa que una pantalla necesita y hoy no
-- puede pedir:
--
--   1. `avisos_abiertos()`            el Asistente ve a qué puede postularse
--   2. `franjas_de_aviso(uuid)`       y cuándo se necesita el cuidado
--   3. `postulaciones_de_mis_avisos()` la Familia ve quién se ofreció
--   4. `mis_conversaciones()`          los dos ven con quién están hablando
--
-- **Ninguna devuelve un dato de contacto.** Ni el teléfono ni el correo ni el
-- domicilio de nadie, de ninguno de los dos lados. Lo que devuelven de una
-- persona es lo mismo que el directorio ya publica: nombre, profesión, zona y
-- foto. La 3 y la 4 sí devuelven contenido escrito por las partes —el mensaje
-- de la postulación, el último mensaje de la conversación—, y eso es de ellas:
-- el personal de la Prestadora no llama a ninguna de las cuatro y no ve nada.
--
-- **El nombre del paciente tampoco viaja.** `patient_name` está en el aviso y
-- se deja afuera a propósito: un Asistente decide si se postula por lo que se
-- necesita, no por cómo se llama la persona, y mostrárselo a todos los
-- Asistentes de la Prestadora antes de que exista ningún trato es dato
-- personal repartido sin motivo.
--
-- **Las cuatro fallan cerradas.** Cada una empieza por preguntar quién llama:
-- sin legajo propio la 1 y la 2 no devuelven nada, sin sesión la 3 no devuelve
-- nada, y la 4 pide ser una de las dos partes. Todas comparan además contra
-- `prestadora_actual()`, así que ninguna cruza dos Organizaciones. Se apoyan en
-- `legajo_propio()` (0005 §3) y `prestadora_actual()` (0002), que son el punto
-- único de verdad de las dos preguntas.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. Los avisos a los que un Asistente puede postularse ──────────────────
-- Sin `contact_info`, sin `familia_id` y sin `patient_name`. Trae además si el
-- que pregunta ya se postuló, para que la pantalla no tenga que pedir dos
-- listas y cruzarlas a mano.
create or replace function public.avisos_abiertos()
  returns table (
    id                uuid,
    created_at        timestamptz,
    zona              text,
    descripcion       text,
    motivo_consulta   text,
    profesion         text,
    patologias        jsonb,
    tareas            jsonb,
    horarios          text,
    frecuencia        text,
    genero_preferido  text,
    ya_me_postule     boolean
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select a.id,
         a.created_at,
         a.zone,
         a.description,
         a.consultation_reason,
         a.profession_required,
         a.pathologies_required,
         a.tasks_required,
         a.schedule_type,
         a.frequency,
         a.preferred_gender,
         exists (select 1
                   from public.postulaciones p
                  where p.aviso_id = a.id
                    and p.caregiver_id = public.legajo_propio())
    from public.avisos a
   where public.legajo_propio() is not null
     and a.tenant_id = public.prestadora_actual()
     and coalesce(a.status, 'activa') = 'activa'
   order by a.created_at desc;
$$;

comment on function public.avisos_abiertos() is
  'Los avisos activos de la Prestadora de quien inició sesión, para un Asistente con legajo. Devuelve sólo lo que hace falta para decidir si postularse: nunca contact_info, nunca familia_id y nunca el nombre del paciente. Sin legajo propio devuelve cero filas.';


-- ── 2. Cuándo se necesita el cuidado ───────────────────────────────────────
-- La franja sigue al aviso (migración 0016 §2), así que al Asistente le pasa
-- lo mismo: no ve el aviso y no ve la grilla. Devuelve claves de vocabulario,
-- nunca etiquetas: quien traduce es la pantalla.
create or replace function public.franjas_de_aviso(p_aviso uuid)
  returns table (dia text, turno text)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select f.dia, f.turno
    from public.franjas_aviso f
    join public.avisos a on a.id = f.aviso_id
   where a.id = p_aviso
     and a.tenant_id = public.prestadora_actual()
     and (public.legajo_propio() is not null or a.familia_id = auth.uid())
   order by f.dia, f.turno;
$$;

comment on function public.franjas_de_aviso(uuid) is
  'La grilla de días y turnos de un aviso, para un Asistente de esa misma Prestadora o para la Familia que lo publicó. Nada más de ese aviso viaja acá.';


-- ── 3. Quién se ofreció a los avisos de una Familia ────────────────────────
-- Del Asistente devuelve lo mismo que ya publica el directorio y nada más. El
-- teléfono y el correo siguen sin salir: que la Familia le haya visto una
-- postulación no le da los datos con los que arreglar por afuera.
create or replace function public.postulaciones_de_mis_avisos(p_aviso uuid default null)
  returns table (
    id                  uuid,
    aviso_id            uuid,
    caregiver_id        uuid,
    mensaje             text,
    vista_el            timestamptz,
    descartada_el       timestamptz,
    created_at          timestamptz,
    asistente_nombre    text,
    asistente_profesion text,
    asistente_zona      text,
    asistente_foto      text,
    conversacion_id     uuid
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.id,
         p.aviso_id,
         p.caregiver_id,
         p.mensaje,
         p.vista_el,
         p.descartada_el,
         p.created_at,
         c.full_name,
         c.profession,
         c.zone,
         c.documents->>'foto',
         (select cv.id
            from public.conversaciones cv
           where cv.familia_id = auth.uid()
             and cv.caregiver_id = p.caregiver_id
           limit 1)
    from public.postulaciones p
    join public.avisos a on a.id = p.aviso_id
    join public.caregivers   c on c.id = p.caregiver_id
   where a.familia_id = auth.uid()
     and a.tenant_id = public.prestadora_actual()
     and (p_aviso is null or p.aviso_id = p_aviso)
   order by p.created_at desc;
$$;

comment on function public.postulaciones_de_mis_avisos(uuid) is
  'Las postulaciones que recibieron los avisos de quien inició sesión. Sin argumento las trae todas; con uno, las de ese aviso. Del Asistente devuelve lo mismo que el directorio público y ningún dato de contacto. Sin sesión devuelve cero filas.';


-- ── 4. Con quién está hablando cada uno ────────────────────────────────────
-- La misma función sirve a los dos lados y devuelve al otro, sea quien sea el
-- que pregunta. `soy_la_familia` es lo que la pantalla necesita para saber de
-- qué lado dibujar cada mensaje.
create or replace function public.mis_conversaciones()
  returns table (
    id              uuid,
    aviso_id        uuid,
    caregiver_id    uuid,
    created_at      timestamptz,
    soy_la_familia  boolean,
    otra_parte      text,
    otra_parte_foto text,
    ultimo_el       timestamptz,
    ultimo_texto    text
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select cv.id,
         cv.aviso_id,
         cv.caregiver_id,
         cv.created_at,
         cv.familia_id = auth.uid(),
         case when cv.familia_id = auth.uid()
              then c.full_name
              else pf.full_name
         end,
         case when cv.familia_id = auth.uid()
              then c.documents->>'foto'
              else null
         end,
         m.created_at,
         m.contenido
    from public.conversaciones cv
    join public.caregivers c on c.id = cv.caregiver_id
    left join public.profiles pf on pf.id = cv.familia_id
    left join lateral (
      select mm.created_at, mm.contenido
        from public.mensajes mm
       where mm.conversacion_id = cv.id
       order by mm.created_at desc
       limit 1
    ) m on true
   where cv.tenant_id = public.prestadora_actual()
     and (cv.familia_id = auth.uid()
          or cv.caregiver_id = public.legajo_propio())
   order by coalesce(m.created_at, cv.created_at) desc;
$$;

comment on function public.mis_conversaciones() is
  'Las conversaciones de quien inició sesión, sea la Familia o el Asistente, con el nombre de la otra parte y su último mensaje. No devuelve ningún dato de contacto: el canal es el canal, y sacar el trato de acá es justo lo que el producto no facilita.';


-- ── 5. Quién puede llamarlas ───────────────────────────────────────────────
-- Las cuatro son `security definer` del esquema `public`, así que PostgREST las
-- publica como dirección web. `public` es todo el mundo, incluidos roles que
-- todavía no existen: se le revoca siempre y primero. `anon` es una concesión
-- aparte y se revoca aparte — sin eso, cualquiera con la clave publicable las
-- llamaría sin sesión. Ninguna política las usa, así que `authenticated` sale
-- de este `grant` y de ningún otro lado.
revoke all on function public.avisos_abiertos()                 from public;
revoke all on function public.avisos_abiertos()                 from anon;
grant execute on function public.avisos_abiertos()              to authenticated;

revoke all on function public.franjas_de_aviso(uuid)            from public;
revoke all on function public.franjas_de_aviso(uuid)            from anon;
grant execute on function public.franjas_de_aviso(uuid)         to authenticated;

revoke all on function public.postulaciones_de_mis_avisos(uuid) from public;
revoke all on function public.postulaciones_de_mis_avisos(uuid) from anon;
grant execute on function public.postulaciones_de_mis_avisos(uuid) to authenticated;

revoke all on function public.mis_conversaciones()              from public;
revoke all on function public.mis_conversaciones()              from anon;
grant execute on function public.mis_conversaciones()           to authenticated;


-- ── 6. Que PostgREST se entere ─────────────────────────────────────────────
notify pgrst, 'reload schema';
