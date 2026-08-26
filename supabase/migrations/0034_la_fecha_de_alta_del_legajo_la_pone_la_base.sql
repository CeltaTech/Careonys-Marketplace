-- ===================================================
-- LA FECHA DE ALTA DEL LEGAJO LA PONE LA BASE
--
-- QUÉ PASABA. `caregivers.created_at` tenía su valor por omisión desde el
-- principio, pero la política «Su propio legajo» es `for all` y no nombra
-- ninguna columna, así que la fecha entraba en el alta como cualquier otro dato
-- y se podía poner cualquier valor, pasado o futuro. Y no sólo al darse de alta:
-- también se podía cambiar después.
--
-- MEDIDO el 26 de agosto de 2026 contra la base local, con una cuenta ficticia y
-- sesión simulada: el legajo se creó con fecha de alta del 1 de enero de 2015, y
-- un `update` posterior la corrió al 1 de enero de 2010. Las dos veces la base
-- guardó lo que le mandaron.
--
-- POR QUÉ IMPORTA SI HOY NO SE VE. Ninguna pantalla la muestra —`js/apiClient.js`
-- la traduce a `fechaRegistro` y ese nombre no aparece en ningún otro archivo—,
-- así que hoy no hay consecuencia visible. Pero la antigüedad es exactamente la
-- clase de dato que después se usa para ordenar un directorio o para decidir a
-- quién se muestra primero, y ese día el agujero pasa a ser una ventaja que
-- alguien se dio a sí mismo.
--
-- POR QUÉ UN DISPARADOR Y NO UN PERMISO POR COLUMNA. Las dos herramientas
-- servían acá: a diferencia del veredicto de la Prestadora —donde el permiso por
-- columna no sirve porque el personal y el Asistente son el mismo rol de base—,
-- la fecha de alta no la tiene que escribir nadie, en ningún rol de sesión. Se
-- eligió el disparador por dos razones. Una: el límite queda escrito en la
-- tabla, donde lo lee quien lee el esquema, y no en un `grant` a treinta
-- renglones de distancia. Dos: un permiso por columna se pierde sin que nadie se
-- entere, y eso no es una hipótesis — la migración 0032 se llevó puesto el
-- `update (full_name)` de `profiles` con un `revoke all on table`, y hubo que
-- reponerlo en la 0033.
--
-- QUÉ HACE. Al dar de alta, la fecha es la de ese momento y se ignora lo que
-- venga de afuera. Al modificar, la fecha queda como estaba. Vale para todo el
-- mundo, incluido el servidor: la fecha de alta es la fecha de alta. Si algún
-- día hace falta traer legajos de otro sistema conservando sus fechas, esa
-- migración apaga el disparador mientras carga y lo vuelve a encender, y así
-- queda dicho que la excepción fue a propósito.
-- ===================================================

create or replace function public.la_fecha_de_alta_la_pone_la_base()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

comment on function public.la_fecha_de_alta_la_pone_la_base() is
  'La fecha de alta de un legajo la pone la base y no se puede escribir desde afuera. La política del legajo propio es `for all` y no nombra columnas, así que sin esto la persona se elige su propia antigüedad.';

-- No la tiene que poder llamar nadie. PostgREST no publica las funciones que
-- devuelven `trigger`, pero Postgres le concede la ejecución a `PUBLIC` por
-- omisión, y revocarle a `PUBLIC` no alcanza para sacársela a `anon`: es una
-- concesión aparte. Hay que hacer las dos. El disparador funciona igual, porque
-- el permiso de llamada se verifica al crearlo y no cada vez que se dispara.
revoke all on function public.la_fecha_de_alta_la_pone_la_base() from public, anon, authenticated;

drop trigger if exists la_fecha_de_alta_del_legajo on public.caregivers;

create trigger la_fecha_de_alta_del_legajo
  before insert or update on public.caregivers
  for each row
  execute function public.la_fecha_de_alta_la_pone_la_base();

notify pgrst, 'reload schema';
