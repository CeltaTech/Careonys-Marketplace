-- ---------------------------------------------------------------------------
-- 0015 — El aviso se llama aviso, y lo de esta modalidad lleva el prefijo de la modalidad
-- ---------------------------------------------------------------------------
-- Pendiente 52, decidido por el Desarrollador el 25 de agosto de 2026: se
-- renombran las dos, no una sola, porque tener dos nombres para la misma cosa
-- es peor que el trabajo de arreglarlo.
--
-- Son dos cambios y conviene no mezclarlos:
--
-- 1. **`care_searches` pasa a `avisos`.** No es traducir: es que la tabla
--    guardaba algo que no era una búsqueda. Una búsqueda es el acto de buscar
--    y no deja nada guardado; un aviso es lo que la Familia publica y sí queda.
--    La misma confusión estaba en la columna que la apunta desde
--    `logbook_entries` y desde `messages`, que se llamaba `search_id`.
--
-- 2. **El prefijo de la modalidad.** `docs/GLOSARIO.md:101` decidió el 24 de agosto de
--    2026 que lo que sólo existe en esta modalidad lo lleva en el nombre, y
--    `docs/MODULOS.md:88` explica para qué sirve: para que la prueba al revés
--    —buscar palabras de esta modalidad en lo compartido— se pueda correr con
--    una búsqueda de texto en vez de leyendo. Hasta hoy no lo llevaba ninguna.
--
-- **Lo que esta migración no arregla.** `logbook_entries` y `messages` son
-- tablas compartidas y siguen apuntando a un objeto de esta modalidad, ahora
-- con el nombre a la vista: `aviso_id`. Eso es un problema de reparto y no de
-- nombres, y queda anotado en el pendiente 52. Que se vea es una mejora: antes
-- decía `search_id` y no se notaba.
--
-- Correr esto dos veces no falla: cada renombre pregunta antes si hace falta.
-- ---------------------------------------------------------------------------

-- --- 1. La tabla y lo que cuelga de ella -------------------------------------
do $$
begin
  if to_regclass('public.care_searches') is not null then
    alter table public.care_searches rename to avisos;
  end if;

  if exists (select 1 from pg_constraint where conname = 'care_searches_pkey') then
    alter table public.avisos rename constraint care_searches_pkey to avisos_pkey;
  end if;

  if exists (select 1 from pg_constraint where conname = 'care_searches_tenant_id_fkey') then
    alter table public.avisos
      rename constraint care_searches_tenant_id_fkey to avisos_tenant_id_fkey;
  end if;

  if to_regclass('public.idx_busquedas_zona') is not null then
    alter index public.idx_busquedas_zona rename to idx_avisos_zona;
  end if;

  -- La política decía «Busquedas» y ya no se llama así.
  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'avisos'
                and policyname = 'Busquedas de la Prestadora') then
    alter policy "Busquedas de la Prestadora" on public.avisos
      rename to "Avisos de la Prestadora";
  end if;
end $$;

comment on table public.avisos is
  'Lo que una Familia publica cuando necesita cuidado: qué hace falta, para quién, dónde y cuándo. Se llamaba care_searches hasta el 25 de agosto de 2026, y el nombre estaba mal: una búsqueda es el acto de buscar y no queda guardada; lo que queda guardado es el aviso. El prefijo de la modalidad dice que esta tabla existe sólo en la modalidad de este producto: en prestación directa el trabajo se asigna y nadie publica nada.';

-- --- 2. La columna que lo apunta desde las dos tablas compartidas ------------
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'logbook_entries'
                and column_name = 'search_id') then
    alter table public.logbook_entries rename column search_id to aviso_id;
  end if;

  if exists (select 1 from pg_constraint where conname = 'logbook_entries_search_id_fkey') then
    alter table public.logbook_entries
      rename constraint logbook_entries_search_id_fkey to logbook_entries_aviso_id_fkey;
  end if;

  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'messages'
                and column_name = 'search_id') then
    alter table public.messages rename column search_id to aviso_id;
  end if;

  if exists (select 1 from pg_constraint where conname = 'messages_search_id_fkey') then
    alter table public.messages
      rename constraint messages_search_id_fkey to messages_aviso_id_fkey;
  end if;
end $$;

-- --- 3. El directorio, que también es de esta modalidad ----------------------
-- `docs/MODULOS.md:55` lo pone de este lado: en prestación directa nadie mira
-- un catálogo, recibe una asignación. `directorio` es el nombre que ese
-- mismo documento le dio al módulo el 24 de agosto de 2026, así que la vista
-- toma el nombre que ya tenía decidido y no uno nuevo.
do $$
begin
  if to_regclass('public.caregivers_publicos') is not null then
    alter view public.caregivers_publicos rename to directorio;
  end if;
end $$;
