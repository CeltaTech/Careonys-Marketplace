-- ============================================================================
-- 0013 — Lo que una Familia pide deja de tirarse por no tener dónde ponerlo
-- ============================================================================
--
-- Qué estaba mal
-- --------------
-- Tres pantallas le preguntan cosas a una Familia y `care_searches` tiene siete
-- columnas para guardarlas. Lo que sobra no da error: se pierde en silencio, un
-- paso antes de la base, porque el traductor de `js/apiClient.js` arma la fila
-- campo por campo y descarta lo que no reconoce.
--
-- Lo que se preguntaba y no se guardaba, comprobado leyendo cada pantalla:
--
--   * `pwa-familia/index.html` pide zona y descripción al publicar. Las dos
--     llegan al traductor y ninguna llega a la base (pendiente 29).
--   * `formulario-integral.html` pregunta seis pasos: tareas de cuidado, tipo
--     de Asistente, género preferido, frecuencia, modalidad y descripción. De
--     todo eso `js/main.js` mandaba `patologias: []` y `horarios: 'flexible'`
--     escritos a mano, así que no llegaba ni una de las seis (pendiente 32).
--   * `solicitar-asistente.html` pregunta el motivo de la consulta y lo mandaba
--     adentro de `pathologies_required`, la columna de las patologías. Es la
--     misma falla que arregló la 0009 con el contacto, en otra columna: un
--     motivo de consulta —«busco un asistente», «quiero hacer un curso»— no es
--     una patología, y cualquier pantalla que lea las patologías de una
--     búsqueda se encuentra ahí adentro algo que no lo es.
--
-- Qué hace esta migración
-- -----------------------
-- Le da una columna a cada cosa. Ninguna es opcional para el negocio: sin zona
-- no se sabe dónde es el trabajo, sin tipo de Asistente no se sabe a quién
-- buscar, y sin motivo de consulta la Prestadora no distingue a quien busca
-- cuidado de quien pregunta por un curso.
--
-- Cinco de las seis columnas guardan claves de vocabulario, no las etiquetas
-- que se ven en pantalla: así una búsqueda escrita en castellano se lee después
-- en cualquier idioma, que es lo que pide la regla 5.1. `description` es la
-- excepción, y lo es a propósito: es lo que la persona escribe con sus palabras.
--
-- Falta una y se deja afuera adrede: la modalidad de contratación de
-- `formulario-integral.html` iría a `schedule_type`, que hoy guarda cuatro
-- formas distintas de nombrar lo mismo y no tiene vocabulario que la gobierne.
-- Es el pendiente 31, que decide el Desarrollador; hasta que decida, escribir
-- ahí una quinta forma sería empeorar el problema.
-- ============================================================================

-- 1. Las columnas nuevas ─────────────────────────────────────────────────────

alter table public.care_searches
  add column if not exists zone                text,
  add column if not exists description         text,
  add column if not exists consultation_reason text,
  add column if not exists tasks_required      jsonb,
  add column if not exists profession_required text,
  add column if not exists preferred_gender    text,
  add column if not exists frequency           text;

comment on column public.care_searches.zone is
  'Dónde se necesita el cuidado. Guarda una clave del vocabulario `zona`, que '
  'tiene dos escalones: una región entera («zona_norte») o un barrio suelto '
  '(«palermo»). Nunca texto libre: el directorio filtra por esta columna.';

comment on column public.care_searches.description is
  'Lo que la Familia cuenta con sus palabras sobre la situación. Es la única '
  'columna de esta tabla que guarda texto libre, y por eso es la única que '
  'puede traer datos de una persona sin que nadie los haya pedido: se revisa '
  'junto con el resto antes de producción (CLAUDE.md §4).';

comment on column public.care_searches.consultation_reason is
  'Para qué escribe quien escribe. Clave del vocabulario `motivo_consulta`. '
  'Hasta la 0013 se guardaba adentro de `pathologies_required`, que es la '
  'columna de las patologías; el rescate de más abajo lo mueve a su lugar.';

comment on column public.care_searches.tasks_required is
  'Qué tareas de cuidado hace falta que haga el Asistente. Arreglo de claves '
  'del vocabulario `tarea_cuidado`. Es el espejo de `caregivers.tasks`: allá '
  'dice qué sabe hacer una persona, acá qué se necesita que se haga.';

comment on column public.care_searches.profession_required is
  'Qué tipo de Asistente se busca. Clave del vocabulario `tipo_asistente`, el '
  'mismo que llena `caregivers.profession`. Una sola: quien busca elige un '
  'tipo, no una lista.';

comment on column public.care_searches.preferred_gender is
  'Si la Familia prefiere que el Asistente sea de un género. Clave del '
  'vocabulario `genero_preferido`, que trae «indistinto» justamente para que '
  'no haya que dejarlo vacío cuando da igual.';

comment on column public.care_searches.frequency is
  'Si el cuidado es algo que se repite o algo de una vez. Clave del '
  'vocabulario `frecuencia`. No se confunde con `schedule_type`: aquélla dice '
  'bajo qué forma se contrata, ésta cada cuánto se necesita.';

-- 2. Rescate: el motivo de consulta vuelve a su lugar ────────────────────────
--
-- Las filas ya escritas tienen el motivo adentro del arreglo de patologías. Se
-- reconoce sin adivinar: es el único elemento que es una clave de
-- `motivo_consulta`, y ninguna de esas ocho claves es también una patología —se
-- comprobó una por una contra `data/catalogo-vocabularios.json`.
--
-- La lista va escrita acá y no leída de ningún lado porque una migración es un
-- hecho fechado: describe cómo estaba la base el 24 de agosto de 2026, no cómo
-- esté el catálogo el día que alguien la lea. Si mañana se agrega un motivo, no
-- hay nada que corregir hacia atrás: esta migración ya corrió.

update public.care_searches
set
  consultation_reason = coalesce(consultation_reason, (
    select elemento #>> '{}'
    from jsonb_array_elements(pathologies_required) as elemento
    where jsonb_typeof(elemento) = 'string'
      and elemento #>> '{}' in ('busco_asistente', 'acompanamiento_online',
                                'cursos', 'orientacion', 'apoyo_cuidador',
                                'entender_salud', 'coordinar', 'otro')
    limit 1
  )),
  pathologies_required = (
    select coalesce(jsonb_agg(elemento), '[]'::jsonb)
    from jsonb_array_elements(pathologies_required) as elemento
    where not (jsonb_typeof(elemento) = 'string'
      and elemento #>> '{}' in ('busco_asistente', 'acompanamiento_online',
                                'cursos', 'orientacion', 'apoyo_cuidador',
                                'entender_salud', 'coordinar', 'otro'))
  )
where jsonb_typeof(pathologies_required) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(pathologies_required) as elemento
    where jsonb_typeof(elemento) = 'string'
      and elemento #>> '{}' in ('busco_asistente', 'acompanamiento_online',
                                'cursos', 'orientacion', 'apoyo_cuidador',
                                'entender_salud', 'coordinar', 'otro')
  );

-- 3. Por dónde se va a buscar ────────────────────────────────────────────────
--
-- La zona es lo primero que se pregunta cuando hay muchas búsquedas abiertas:
-- «cuáles hay en Zona Norte». Sin índice eso obliga a leer la tabla entera. Las
-- otras columnas no llevan índice todavía porque nadie filtra por ellas: un
-- índice que nadie usa cuesta escritura y no ahorra nada.

create index if not exists idx_busquedas_zona
  on public.care_searches (tenant_id, zone);
