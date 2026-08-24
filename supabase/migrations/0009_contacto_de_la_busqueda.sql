-- ============================================================================
-- 0009 — El teléfono de una Familia deja de guardarse como si fuera una patología
-- ============================================================================
--
-- Qué estaba mal
-- --------------
-- `solicitar-asistente.html` pide nombre, correo y celular a quien busca un
-- Asistente, y los mandaba adentro de `pathologies_required`, la columna donde
-- van las patologías que el cuidado requiere. El mapeo de `js/apiClient.js`
-- escribía esa columna dos veces: primero las patologías, y después —si venía
-- contacto— un arreglo que mezclaba las patologías con un objeto `{ contacto }`.
-- El comentario del código lo llamaba «metadata extra», que es como se llama a
-- un dato cuando no se le hizo lugar.
--
-- Dos consecuencias, y la segunda es la que importa:
--
--   1. Cualquier pantalla que lea las patologías de una búsqueda encuentra ahí
--      adentro un objeto que no es una patología.
--   2. Los datos de contacto de una persona quedan en una columna que nadie
--      trata como si tuviera datos de una persona. El día que se borren los
--      datos de personas antes de producción, nadie va a mirar la columna de
--      patologías: `CLAUDE.md` §4 pide que los datos de una persona estén donde
--      se los pueda encontrar.
--
-- Qué hace esta migración
-- -----------------------
-- Le da al contacto su propia columna. El pendiente 28 aceptaba dos salidas
-- —columna propia, o no guardarlo—; se elige la primera porque el contacto es
-- justamente lo que vuelve accionable una solicitud: sin él la Prestadora lee
-- que alguien necesita un Asistente y no tiene cómo devolver el llamado.
--
-- Se rescatan además las filas que ya hubieran quedado mal escritas. Hoy la
-- política de `care_searches` es `for all to authenticated`, así que un
-- visitante anónimo nunca pudo insertar una; pero una Familia con sesión sí, y
-- esas filas existen o no según lo que se haya probado. La corrección se hace
-- sola y no depende de saberlo.
-- ============================================================================

alter table public.care_searches
  add column if not exists contact_info jsonb;

comment on column public.care_searches.contact_info is
  'Cómo volver a comunicarse con quien publicó la búsqueda: nombre, correo y '
  'teléfono. Son datos de una persona real, así que esta columna se vacía junto '
  'con el resto de los datos de personas antes de producción (CLAUDE.md §4).';

-- Rescate: lo que haya quedado adentro de las patologías vuelve a su lugar.
-- El objeto de contacto es el único elemento del arreglo que es un objeto con
-- clave `contacto`; todo lo demás son claves de vocabulario, que son textos.
update public.care_searches
set
  contact_info = (
    select elemento -> 'contacto'
    from jsonb_array_elements(pathologies_required) as elemento
    where jsonb_typeof(elemento) = 'object' and elemento ? 'contacto'
    limit 1
  ),
  pathologies_required = (
    select coalesce(jsonb_agg(elemento), '[]'::jsonb)
    from jsonb_array_elements(pathologies_required) as elemento
    where not (jsonb_typeof(elemento) = 'object' and elemento ? 'contacto')
  )
where jsonb_typeof(pathologies_required) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(pathologies_required) as elemento
    where jsonb_typeof(elemento) = 'object' and elemento ? 'contacto'
  );
