-- ---------------------------------------------------------------------------
-- QUIÉN MARCÓ CADA VERIFICACIÓN, Y CUÁNDO, NO LO DICE EL NAVEGADOR
--
-- `verificaciones_asistente` tiene desde la 0004 dos columnas para la huella:
-- `verificado_por` —que apunta a `profiles`— y `verificado_el`. Nunca las
-- escribió nadie, porque hasta hoy ninguna pantalla marcaba una verificación
-- (pendiente 70). La pantalla que lo arregla podría mandarlas en el pedido, y
-- ahí está el problema: **lo que manda el navegador lo elige quien llama.**
-- Nada le impide al personal de la Prestadora escribir el identificador de un
-- compañero y dejarle a él la firma de una comprobación que hizo otro. Una
-- auditoría que se puede escribir a mano no es una auditoría.
--
-- Así que la escribe la base, con lo único que el navegador no puede falsificar:
-- `auth.uid()`, que sale del testigo de la sesión y es el mismo valor que
-- `profiles.id`, porque `profiles.id` referencia a `auth.users(id)`.
--
-- Tres decisiones que no son obvias:
--
--   * **Si el estado vuelve a «pendiente», la huella se borra.** «Pendiente» es
--     el estado de lo que todavía no se miró; dejar ahí un «verificado el 3 de
--     septiembre» sería una columna que miente. Las dos columnas dicen siempre
--     quién sacó a esta verificación del estado inicial.
--   * **Tocar otra columna no refresca la huella.** Si el estado no cambió, se
--     conservan los valores viejos. Sin esto, cualquier modificación posterior
--     le pondría la firma de quien pasó último.
--   * **No es `security definer`, y no hace falta que lo sea.** Sólo llama a
--     `auth.uid()` y a `now()`, que cualquiera puede llamar. Mínimo privilegio.
--
-- Con la sesión vacía —una siembra, o la llave de administración— no toca nada:
-- ahí no hay nadie a quien atribuirle la marca, y la siembra guarda lo que
-- quiere guardar.
-- ---------------------------------------------------------------------------

create or replace function public.la_verificacion_dice_quien_la_marco()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.estado = 'pendiente' then
    new.verificado_por := null;
    new.verificado_el  := null;
    return new;
  end if;

  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    new.verificado_por := auth.uid();
    new.verificado_el  := now();
  else
    new.verificado_por := old.verificado_por;
    new.verificado_el  := old.verificado_el;
  end if;

  return new;
end;
$$;

comment on function public.la_verificacion_dice_quien_la_marco() is
  'Sobre `verificaciones_asistente`: la huella de quién marcó y cuándo la pone la base con `auth.uid()`, no el pedido. Vuelve a vacía si el estado vuelve a «pendiente», y no se refresca si el estado no cambió. Parte del pendiente 70.';

-- PostgREST no publica las funciones que devuelven `trigger`, pero Postgres le
-- concede la ejecución a `PUBLIC` por omisión, y revocarle a `PUBLIC` no
-- alcanza para sacársela a `anon`: es una concesión aparte. El disparador
-- funciona igual, porque el permiso de llamada se verifica al crearlo y no cada
-- vez que se dispara.
revoke all on function public.la_verificacion_dice_quien_la_marco() from public, anon, authenticated;

drop trigger if exists la_verificacion_dice_quien_la_marco on public.verificaciones_asistente;

create trigger la_verificacion_dice_quien_la_marco
  before insert or update on public.verificaciones_asistente
  for each row
  execute function public.la_verificacion_dice_quien_la_marco();

notify pgrst, 'reload schema';
