-- ---------------------------------------------------------------------------
-- El contacto es lo único que queda guardado
-- ---------------------------------------------------------------------------
-- El eslabón que faltaba. Hasta acá el aviso se publicaba y el perfil se veía,
-- pero **ninguna tabla ataba un aviso con un Asistente**: el mercado no tenía
-- dónde encontrarse.
--
-- QUÉ SE GUARDA, Y POR QUÉ TAN POCO. Lo decidió el Desarrollador el 31 de
-- agosto de 2026 y está escrito en `CLAUDE.md` §1: el software **no sabe del
-- trato**. No se guarda ningún contrato, ningún precio acordado, ninguna
-- condición y ninguna aceptación. La finalidad es mantener a la Prestadora
-- completamente afuera de la relación laboral y comercial entre la Familia y
-- el Asistente, para que nadie pueda alegar relación de dependencia con ella.
-- Guardar una tarifa propuesta, o una postulación «aceptada», sería guardar
-- justo eso.
--
-- Lo que sí queda es **el contacto**: quién contactó a quién, por cuál de los
-- dos caminos y cuándo. Es el hecho por el que la Prestadora cobra.
--
-- LOS DOS CAMINOS, y son los dos:
--   1. La Familia publica un aviso y los Asistentes **se postulan**
--      → `postulaciones`.
--   2. La Familia mira el directorio, compara perfiles y **contacta**
--      → `conversaciones` con `aviso_id` en nulo.
-- El camino no es una columna con una lista de valores escrita adentro: sale
-- de si hay aviso o no lo hay, así que no puede quedar en desacuerdo consigo
-- misma ni es un catálogo escondido en una restricción.
--
-- QUIÉN LEE QUÉ. El personal de la Prestadora **no lee ninguna de las tres**.
-- Ni el mensaje de una postulación ni una conversación: es contenido entre las
-- dos partes, y mirarlo es meterse en el trato. El hecho queda guardado para
-- cuando se descongele la lógica comercial (`docs/ALCANCE.md` §4); **cómo lo
-- lee ella —en números agregados y sin contenido— es esa decisión, no ésta**,
-- y hasta entonces no se le concede nada, que es fallar cerrado.
--
-- LO QUE NO TRAE, A PROPÓSITO. Sin tipo de mensaje, sin archivo adjunto, sin
-- editado ni borrado, sin marca de leído y sin fecha del último mensaje: eso
-- es acabado, se deriva o se agrega después, y hoy la estructura es lo que
-- falta. Tampoco trae `pagos`: es la lógica comercial hecha columnas y está
-- congelada por `docs/ALCANCE.md` §4.
--
-- POR QUÉ `tenant_id` Y NO `prestadora_id`. La regla pide la columna de la
-- Organización en toda tabla; el nombre que esa columna tiene en este esquema
-- es `tenant_id`, en las veintitantas tablas que ya existen, y es contra ella
-- que compara `prestadora_actual()`. Una tabla nueva que lo escribiera
-- distinto rompería el único punto de verdad del aislamiento. El renombre, si
-- se hace, se hace de una vez y para todas.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. Que el padre sea de la misma Prestadora se pueda exigir ─────────────
-- Sin esto, nada impide que una postulación apunte a un aviso de otra
-- Organización: la política mira `tenant_id`, pero `tenant_id` lo escribe la
-- misma fila que miente. La llave compuesta lo cierra en la base, que es
-- donde tiene que cerrarse. Mismo recurso que usó la 0035 con las zonas.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'aviso_unico_por_prestadora') then
    alter table public.avisos
      add constraint aviso_unico_por_prestadora unique (id, tenant_id);
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'legajo_unico_por_prestadora') then
    alter table public.caregivers
      add constraint legajo_unico_por_prestadora unique (id, tenant_id);
  end if;
end $$;


-- ── 2. La postulación: el Asistente se ofrece a un aviso ───────────────────
create table if not exists public.postulaciones (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null default public.prestadora_actual(),
    aviso_id      uuid not null,
    caregiver_id  uuid not null,
    mensaje       text,
    vista_el      timestamptz,
    descartada_el timestamptz,
    created_at    timestamptz not null default timezone('utc', now()),

    constraint una_postulacion_por_aviso unique (aviso_id, caregiver_id),
    constraint la_postulacion_va_a_un_aviso_de_la_misma_prestadora
      foreign key (aviso_id, tenant_id)
      references public.avisos(id, tenant_id) on delete cascade,
    constraint la_postulacion_es_de_un_legajo_de_la_misma_prestadora
      foreign key (caregiver_id, tenant_id)
      references public.caregivers(id, tenant_id) on delete cascade
);

comment on table public.postulaciones is
  'Un Asistente se ofrece a un aviso. Guarda el hecho del contacto y nada del trato: sin tarifa propuesta, sin condiciones y sin aceptación, porque el trato lo cierran la Familia y el Asistente afuera del software (CLAUDE.md §1, migración 0054).';
comment on column public.postulaciones.mensaje is
  'Lo que el Asistente escribe al ofrecerse. Lo lee la Familia del aviso, y nadie más: el personal de la Prestadora no lo ve.';
comment on column public.postulaciones.vista_el is
  'Cuándo la Familia la vio. Junto con descartada_el reemplaza a una columna de estado: no hay «aceptada», porque aceptar sería guardar el trato.';

create index if not exists idx_postulaciones_aviso
  on public.postulaciones(aviso_id);
create index if not exists idx_postulaciones_legajo
  on public.postulaciones(caregiver_id);


-- ── 3. La conversación: el canal entre esas dos personas ───────────────────
create table if not exists public.conversaciones (
    id           uuid primary key default gen_random_uuid(),
    tenant_id    uuid not null default public.prestadora_actual(),
    familia_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
    caregiver_id uuid not null,
    aviso_id     uuid,
    created_at   timestamptz not null default timezone('utc', now()),

    constraint una_conversacion_por_par unique (tenant_id, familia_id, caregiver_id),
    constraint la_conversacion_es_con_un_legajo_de_la_misma_prestadora
      foreign key (caregiver_id, tenant_id)
      references public.caregivers(id, tenant_id) on delete cascade,
    constraint la_conversacion_sale_de_un_aviso_de_la_misma_prestadora
      foreign key (aviso_id, tenant_id)
      references public.avisos(id, tenant_id) on delete set null
);

comment on table public.conversaciones is
  'El canal entre una Familia y un Asistente, y el hecho por el que la Prestadora cobra: quién contactó a quién y por cuál camino. Una sola por par, para que abrir dos ventanas no sea abrir dos contactos.';
comment on column public.conversaciones.familia_id is
  'Quién abrió el contacto. Sale del valor por omisión y nunca del pedido, igual que en avisos: es lo que impide contactar a nombre de otro.';
comment on column public.conversaciones.aviso_id is
  'El aviso por el que se abrió, o nulo si la Familia llegó por el directorio. Ahí está guardado cuál de los dos caminos fue, sin una lista de valores escrita a mano.';

create index if not exists idx_conversaciones_legajo
  on public.conversaciones(caregiver_id);


-- ── 4. Quién es de una conversación: un solo lugar ─────────────────────────
-- Las políticas de los mensajes lo preguntan dos veces, y las pantallas van a
-- preguntarlo más. Se escribe una vez.
--
-- Mismas precauciones que `legajo_propio()` (0005 §3): `security definer` para
-- poder mirar la conversación sin que su propia política se lo impida, sin
-- permiso para el anónimo —el esquema `public` es además una dirección web—, y
-- **con** permiso para la sesión autenticada, porque una política se evalúa
-- con los permisos de quien consulta y sin ese permiso fallaría en vez de
-- devolver cero filas.
create or replace function public.conversacion_propia(p_conversacion uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $funcion$
  select exists (
    select 1
      from public.conversaciones c
     where c.id        = p_conversacion
       and c.tenant_id = public.prestadora_actual()
       and (c.familia_id = auth.uid()
            or c.caregiver_id = public.legajo_propio()))
$funcion$;

revoke all on function public.conversacion_propia(uuid) from public;
revoke all on function public.conversacion_propia(uuid) from anon;
grant execute on function public.conversacion_propia(uuid) to authenticated;

comment on function public.conversacion_propia(uuid) is
  'Si quien inició sesión es una de las dos partes de esa conversación. Punto único de verdad de las políticas de mensajes.';


-- ── 5. Los mensajes ────────────────────────────────────────────────────────
create table if not exists public.mensajes (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null default public.prestadora_actual(),
    conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
    autor_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
    contenido       text not null,
    created_at      timestamptz not null default timezone('utc', now()),

    constraint el_mensaje_no_esta_vacio check (length(btrim(contenido)) > 0)
);

comment on table public.mensajes is
  'Lo que se dicen las dos partes. No se edita y no se borra: un canal donde el mensaje se puede reescribir después no sirve para lo que las dos partes lo usan. El personal de la Prestadora no lo lee.';
comment on column public.mensajes.autor_id is
  'Quién lo escribió. Sale del valor por omisión y nunca del pedido.';

create index if not exists idx_mensajes_conversacion
  on public.mensajes(conversacion_id, created_at);


-- ── 6. El aislamiento ──────────────────────────────────────────────────────
alter table public.postulaciones  enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes       enable row level security;

-- La postulación la escribe el Asistente, y sólo la suya.
drop policy if exists "Postulaciones que escribe el Asistente" on public.postulaciones;
create policy "Postulaciones que escribe el Asistente" on public.postulaciones
  for insert to authenticated
  with check (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio());

drop policy if exists "La postulacion la cancela quien la hizo" on public.postulaciones;
create policy "La postulacion la cancela quien la hizo" on public.postulaciones
  for delete to authenticated
  using (tenant_id = public.prestadora_actual()
         and caregiver_id = public.legajo_propio());

-- La leen los dos: quien se postuló y la Familia del aviso.
drop policy if exists "La postulacion la leen las dos partes" on public.postulaciones;
create policy "La postulacion la leen las dos partes" on public.postulaciones
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and (caregiver_id = public.legajo_propio()
              or exists (select 1 from public.avisos a
                          where a.id = postulaciones.aviso_id
                            and a.familia_id = auth.uid())));

-- Y la marca vista o descartada la Familia del aviso, nadie más. Que no pueda
-- además reescribir el mensaje del Asistente no lo decide la política: lo
-- decide el permiso por columna de más abajo, que es lo único que distingue
-- «puede tocar la fila» de «puede tocar esta columna».
drop policy if exists "La postulacion la marca la Familia del aviso" on public.postulaciones;
create policy "La postulacion la marca la Familia del aviso" on public.postulaciones
  for update to authenticated
  using      (tenant_id = public.prestadora_actual()
              and exists (select 1 from public.avisos a
                           where a.id = postulaciones.aviso_id
                             and a.familia_id = auth.uid()))
  with check (tenant_id = public.prestadora_actual());

-- La conversación la abre la Familia. El Asistente la ve, y no la abre: en
-- este mercado quien busca es ella.
drop policy if exists "La conversacion la abre la Familia" on public.conversaciones;
create policy "La conversacion la abre la Familia" on public.conversaciones
  for insert to authenticated
  with check (tenant_id = public.prestadora_actual()
              and familia_id = auth.uid());

drop policy if exists "La conversacion la leen las dos partes" on public.conversaciones;
create policy "La conversacion la leen las dos partes" on public.conversaciones
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and (familia_id = auth.uid()
              or caregiver_id = public.legajo_propio()));

-- El mensaje lo escribe una de las dos partes, en su propia conversación.
drop policy if exists "El mensaje lo escribe una de las dos partes" on public.mensajes;
create policy "El mensaje lo escribe una de las dos partes" on public.mensajes
  for insert to authenticated
  with check (tenant_id = public.prestadora_actual()
              and autor_id = auth.uid()
              and public.conversacion_propia(conversacion_id));

drop policy if exists "El mensaje lo leen las dos partes" on public.mensajes;
create policy "El mensaje lo leen las dos partes" on public.mensajes
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and public.conversacion_propia(conversacion_id));


-- ── 7. Los permisos de tabla, que no son la RLS ────────────────────────────
-- La 0032 le sacó a `postgres` el permiso por omisión sobre las tablas nuevas,
-- así que sin esto la pantalla recibe `42501 permission denied` con una sesión
-- válida y eso no se arregla tocando políticas. Se concede sólo el verbo que
-- alguna política permite: nada de `update` ni `delete` en los mensajes, y
-- nada para `anon` en ninguna de las tres.
revoke all on table public.postulaciones  from anon, authenticated;
revoke all on table public.conversaciones from anon, authenticated;
revoke all on table public.mensajes       from anon, authenticated;

grant select, insert, delete on table public.postulaciones to authenticated;
grant update (vista_el, descartada_el) on table public.postulaciones to authenticated;
grant select, insert on table public.conversaciones to authenticated;
grant select, insert on table public.mensajes       to authenticated;

notify pgrst, 'reload schema';
