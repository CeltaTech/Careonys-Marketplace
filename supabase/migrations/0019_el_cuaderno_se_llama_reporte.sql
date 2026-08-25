-- 0019: `logbook_entries` pasa a llamarse `reportes`
--
-- Por qué
-- -------
-- Decidido por el Desarrollador el 25 de agosto de 2026: lo que el Asistente
-- anota de cada jornada se llama **reporte**. Hasta hoy en este repositorio se
-- llamaba de tres maneras a la vez —«cuaderno de cuidado» en el menú,
-- «bitácora» en el resto de las pantallas y `logbook_entries` en la base—, y
-- ninguna de las tres era la que ya usa Careonys, que la tiene como `reportes`
-- desde su modelo de datos.
--
-- **Reporte y no informe**, entre las dos palabras que el Desarrollador puso
-- sobre la mesa: «reportar» es *re-portare*, llevar de vuelta, y eso es
-- exactamente lo que hace el Asistente —le lleva a la Familia lo que pasó en la
-- jornada—. «Informar» es *in-formare*, darle forma a algo, y suena a documento
-- elaborado por alguien que analiza. Esto es una anotación diaria, no un
-- dictamen. Y de paso no es palabra nueva: es la que ya está en el otro
-- repositorio, así que la fusión encuentra un solo nombre en vez de dos.
--
-- **Esta migración cambia el nombre y nada más.** Las columnas siguen como
-- están: acá son `blood_pressure`, `glycemia`, `medications_administered` y
-- `daily_notes`, y en Careonys son `signos_vitales`, `medicacion` y
-- `texto_libre`, que es otra forma de guardar lo mismo. Emparejarlas es trabajo
-- de la fusión y no de un renombre. `aviso_id` también se queda: de qué tiene
-- que colgar un reporte es el pendiente 52, y se resuelve trayendo la guardia.
--
-- Correr esto dos veces no falla: cada paso pregunta antes si hace falta.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.logbook_entries') is not null
     and to_regclass('public.reportes') is null then
    alter table public.logbook_entries rename to reportes;
  end if;

  if exists (select 1 from pg_constraint where conname = 'logbook_entries_pkey') then
    alter table public.reportes rename constraint logbook_entries_pkey to reportes_pkey;
  end if;

  if exists (select 1 from pg_constraint
              where conname = 'logbook_entries_caregiver_id_fkey') then
    alter table public.reportes
      rename constraint logbook_entries_caregiver_id_fkey to reportes_caregiver_id_fkey;
  end if;

  if exists (select 1 from pg_constraint
              where conname = 'logbook_entries_aviso_id_fkey') then
    alter table public.reportes
      rename constraint logbook_entries_aviso_id_fkey to reportes_aviso_id_fkey;
  end if;
end
$$;

comment on table public.reportes is
  'Lo que el Asistente anota de una jornada: signos, medicación administrada y la nota del día. Se llama reporte porque reportar es llevar de vuelta, y eso es lo que hace: le lleva a la Familia lo que pasó. En Careonys la misma tabla ya se llama así.';

-- La política se llamaba «Bitacora de la Prestadora» y la palabra se fue de
-- todos lados menos de acá. `alter policy … rename` existe desde PostgreSQL 15,
-- pero se borra y se crea para que esto corra igual en un servidor anterior.
drop policy if exists "Bitacora de la Prestadora" on public.reportes;
drop policy if exists "Reportes de la Prestadora" on public.reportes;
create policy "Reportes de la Prestadora" on public.reportes
  for all to authenticated
  using      (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());
