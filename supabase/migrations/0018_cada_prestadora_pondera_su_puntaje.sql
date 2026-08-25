-- 0018: el puntaje del legajo lo pondera cada Prestadora, y puede apagarlo
--
-- Por qué
-- -------
-- El 25 de agosto de 2026 quedó decidido cómo se dibuja lo que un legajo
-- acredita: escudo con tilde y el recuento al lado (`docs/DISENO.md`). La
-- primera propuesta era que las cinco comprobaciones valieran todas lo mismo,
-- con este argumento: cualquier otro reparto obliga a defender por qué el
-- domicilio vale menos que la referencia, y eso no lo puede defender nadie.
--
-- El Desarrollador aceptó el fondo y corrigió la parte que faltaba: **el que
-- tiene que poder defenderlo no somos nosotros, es cada Prestadora**. Su
-- criterio puede no ser el nuestro, y puede incluso no querer calificar a
-- nadie. Así que los pesos iguales dejan de ser la regla y pasan a ser lo que
-- siempre debieron ser: **el valor de fábrica**.
--
-- Esto cae de este lado de la línea y no del compartido, y eso ya estaba
-- escrito antes de que hiciera falta: `docs/MODULOS.md` dice que lo que un
-- Asistente acredita es del legajo y es compartido, pero que **cuánto vale
-- cada cosa es del directorio y se queda acá**. Por eso las dos tablas llevan
-- el prefijo de la modalidad.
--
-- Qué guarda cada tabla
-- ---------------------
--   1. `puntaje_prestadora` — una fila por Prestadora: si califica o no.
--      Apagarlo no apaga el escudo: el escudo dice si el legajo está validado,
--      que es la puerta de la modalidad y no es opcional. Apaga el número.
--   2. `peso_comprobacion` — una fila por Prestadora y comprobación:
--      cuánto suma cada una. Cero es legítimo y quiere decir «esta no me
--      importa», que no es lo mismo que apagar el puntaje entero.
--
-- Lo que esta migración NO decide, y por eso no hay pantalla todavía: qué ve
-- una Familia en un directorio donde conviven Prestadoras que ponderan
-- distinto. Ver el pendiente 56.


-- ── 1. Si esta Prestadora califica ─────────────────────────────────────────
create table if not exists public.puntaje_prestadora (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null unique references public.tenants(id),
    califica    boolean not null default true,
    created_at  timestamp with time zone default timezone('utc'::text, now())
);

comment on table public.puntaje_prestadora is
  'Una fila por Prestadora. califica en false esconde el número del legajo en todas sus pantallas; el escudo de legajo validado sigue viéndose, porque ése es la puerta de la modalidad y no es opcional.';


-- ── 2. Cuánto pesa cada comprobación ───────────────────────────────────────
-- Las cuatro primeras son verificaciones del catálogo
-- (`data/catalogo-verificaciones.json`). `curso_aprobado` no lo es: sale de un
-- intento aprobado en el sistema (`0008:151`), y está en la lista porque es la
-- única de las cinco que nadie puede declarar sin rendirla.
create table if not exists public.peso_comprobacion (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants(id),
    comprobacion  text not null
                  check (comprobacion in ('domicilio', 'referencia', 'matricula',
                                          'titulo', 'curso_aprobado')),
    peso          numeric(5,2) not null default 1 check (peso >= 0),
    created_at    timestamp with time zone default timezone('utc'::text, now()),
    unique (tenant_id, comprobacion)
);

comment on table public.peso_comprobacion is
  'Cuánto suma cada comprobación en el puntaje del legajo, por Prestadora. Arranca en 1 para las cinco: pesos iguales es el valor de fábrica, no la regla. Sólo entra acá lo comprobado por alguien; lo que la persona declara y nadie miró se muestra en el perfil y no suma.';

comment on column public.peso_comprobacion.peso is
  'Cero quiere decir «esta comprobación no me importa». Para no calificar en absoluto está puntaje_prestadora.califica, que es otra cosa.';


-- ── 3. RLS: la configuración es de cada Prestadora ─────────────────────────
alter table public.puntaje_prestadora enable row level security;
alter table public.peso_comprobacion  enable row level security;

drop policy if exists "Puntaje de la Prestadora" on public.puntaje_prestadora;
create policy "Puntaje de la Prestadora" on public.puntaje_prestadora
  for all to authenticated
  using      (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

drop policy if exists "Pesos de la Prestadora" on public.peso_comprobacion;
create policy "Pesos de la Prestadora" on public.peso_comprobacion
  for all to authenticated
  using      (tenant_id = public.prestadora_actual())
  with check (tenant_id = public.prestadora_actual());

grant select, insert, update, delete on public.puntaje_prestadora to authenticated;
grant select, insert, update, delete on public.peso_comprobacion  to authenticated;

-- Sin sesión no se ve. Con qué criterio pondera una Prestadora es asunto suyo,
-- y además publicarlo dejaría comparar criterios de Prestadoras distintas, que
-- es justo lo que todavía no está decidido.
revoke all on table public.puntaje_prestadora from anon;
revoke all on table public.peso_comprobacion  from anon;

create index if not exists idx_peso_comprobacion_tenant
  on public.peso_comprobacion(tenant_id);


-- ── 4. El valor de fábrica, para las Prestadoras que ya existen ────────────
-- Sin estas filas el valor de fábrica sería invisible: una tabla vacía no dice
-- «todas valen uno», dice «todavía nadie configuró esto».
insert into public.puntaje_prestadora (tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;

insert into public.peso_comprobacion (tenant_id, comprobacion)
select t.id, c.comprobacion
  from public.tenants t
 cross join (values ('domicilio'), ('referencia'), ('matricula'),
                    ('titulo'), ('curso_aprobado')) as c(comprobacion)
on conflict (tenant_id, comprobacion) do nothing;
