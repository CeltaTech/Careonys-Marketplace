-- ---------------------------------------------------------------------------
-- 0015 — Una búsqueda guarda sus franjas como las guarda un Asistente
-- ---------------------------------------------------------------------------
-- Pendiente 40. `care_searches.grid_schedule_7x3` es una columna `jsonb` y cada
-- pantalla le escribía una forma distinta: la aplicación de la Familia mandaba
-- `{ "turnos": [...] }` —sin decir de qué día— y el formulario del portal
-- preguntaba días y no mandaba nada, porque no había forma de mandarlos sin
-- inventar una tercera forma. Del lado del Asistente eso ya está resuelto desde
-- la migración 0012: una fila por casillero marcado, en `franjas_asistente`.
--
-- Esta tabla es la de enfrente. Las dos preguntas son la misma pregunta vista
-- desde cada lado: cuándo puede trabajar una persona, y cuándo se necesita el
-- cuidado. Con la misma forma de los dos lados, cruzarlas es una consulta; con
-- filas de un lado y un `jsonb` de dos formas del otro, no es nada.
--
-- `dia` y `turno` guardan claves de los vocabularios `dia_semana` y `turno` de
-- `data/catalogo-vocabularios.json`, nunca la etiqueta que se muestra. Es la
-- misma regla que en `franjas_asistente` y por el mismo motivo: una etiqueta
-- cambia de idioma y una clave no.
--
-- **Lo que esta migración no hace.** No vacía ni saca `grid_schedule_7x3`. Eso
-- toca datos ya guardados y lo decide el Desarrollador: hay búsquedas sembradas
-- por la migración 0003 y las que se hayan cargado probando. Desde hoy ninguna
-- pantalla le escribe —`js/apiClient.js` dejó de mandarla—, así que la columna
-- queda quieta con lo que ya tenía. Cuando el Desarrollador diga, son dos
-- renglones: pasar lo que se pueda a filas y después
-- `alter table public.care_searches drop column grid_schedule_7x3;`
--
-- Correr esto dos veces no falla: todo está envuelto en «si no existe».
-- ---------------------------------------------------------------------------

-- --- 1. Una fila por casillero ----------------------------------------------
create table if not exists public.franjas_busqueda (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null references public.tenants(id) default public.prestadora_actual(),
    search_id   uuid not null references public.care_searches(id) on delete cascade,
    dia         text not null,
    turno       text not null,
    created_at  timestamp with time zone default timezone('utc'::text, now()),
    unique (search_id, dia, turno)
);

comment on table public.franjas_busqueda is
  'Cuándo se necesita el cuidado. Una fila por casillero marcado de la grilla de días por turnos que pregunta la Familia. Es la tabla espejo de franjas_asistente (migración 0012): misma forma, mismos vocabularios, para que cruzar la necesidad de una Familia con la disponibilidad de un Asistente sea una consulta y no un recorrido. dia y turno guardan claves de dia_semana y turno, nunca la etiqueta.';

comment on column public.franjas_busqueda.dia is
  'Clave del vocabulario dia_semana: lunes, martes, miercoles… Nunca «Lunes».';

comment on column public.franjas_busqueda.turno is
  'Clave del vocabulario turno: manana, tarde, noche. Sin eñe, porque una clave con eñe se rompe en direcciones web y en nombres de columna.';

-- --- 2. RLS con el mismo criterio que la búsqueda ----------------------------
-- `care_searches` dice desde la migración 0002 que la fila es de la Prestadora
-- de la sesión o no se ve. Sus franjas dicen exactamente lo mismo: si dijeran
-- menos, se vería por la ventana de al lado cuándo necesita cuidado la familia
-- de otra Prestadora.
alter table public.franjas_busqueda enable row level security;

-- `create policy` no admite «si no existe», así que se borra primero: es lo que
-- hace que correr esta migración dos veces no falle.
drop policy if exists "Franjas de las busquedas de la Prestadora" on public.franjas_busqueda;

create policy "Franjas de las busquedas de la Prestadora" on public.franjas_busqueda
  for all to authenticated
  using      (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

grant select, insert, update, delete on public.franjas_busqueda to authenticated;

-- Sin sesión no se ve nada de acá. El directorio de Asistentes sí se ve sin
-- iniciar sesión, porque lo publicó cada persona; lo que una familia necesita
-- no lo publicó nadie.
revoke all on table public.franjas_busqueda from anon;

-- --- 3. Los dos índices que la tabla va a necesitar --------------------------
-- El primero, para traer las franjas de una búsqueda. El segundo, para la
-- pregunta que motivó todo esto: quién hace falta los martes a la tarde.
create index if not exists idx_franjas_busqueda_search    on public.franjas_busqueda(search_id);
create index if not exists idx_franjas_busqueda_dia_turno on public.franjas_busqueda(dia, turno);
