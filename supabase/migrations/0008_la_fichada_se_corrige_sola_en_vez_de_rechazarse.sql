-- La fichada se corrige sola antes de guardarse, en vez de rechazarse
--
-- Qué se cambia de la migración anterior, y por qué. La 0007 le puso a
-- `clock_ins.event_type` una restricción que rechaza todo lo que no sea
-- «entrada» o «salida». Eso deja el dato sano, pero rompe el momento: si una
-- pantalla vuelve a mandar «Entrada» con mayúscula, la base ya no guarda una
-- fichada mal escrita — no guarda **ninguna**—, y quien apretó el botón se
-- lleva un error en la cara sin haber hecho nada mal.
--
-- Y el fichado es lo que menos puede fallar de todo el producto. El Asistente
-- lo marca parado en la puerta de una casa, apurado, muchas veces con el
-- teléfono en una mano. Si falla no lo reintenta: deja de usarlo. Un sistema
-- que estorba se abandona, y abandonado no protege a nadie.
--
-- La regla que sale de acá, fijada por el Desarrollador el 9 de septiembre de
-- 2026: **cuando la diferencia es de escritura, el sistema corrige; no
-- rechaza.** Rechazar por una letra le traslada al que trabaja el costo de un
-- error que cometió el programa.
--
-- Qué hace esto. Antes de guardar y antes de modificar, la base le saca los
-- espacios de los costados a la marca y le pasa las letras a minúscula. Con eso
-- «Entrada», « ENTRADA » y «Salida » entran las tres bien escritas, la fichada
-- se guarda igual, y las dos alarmas que ve la Familia la encuentran.
--
-- Qué sigue rechazando, y por qué se deja así. La restricción de la 0007 queda
-- en pie, pero después de esto ya no la alcanza ninguna diferencia de
-- escritura: sólo puede saltar con una palabra que no se parezca a ninguna de
-- las dos. Ahí no se corrige, porque corregir sería adivinar, y una fichada
-- inventada es peor que una que no entró: afirma que alguien llegó o se fue a
-- una hora en la que nadie sabe qué pasó, y con eso la Familia recibe un aviso
-- falso o deja de recibir el que le corresponde.
--
-- Una aclaración que importa para no confundir el problema. Esta marca no la
-- teclea ninguna persona: la escribe el programa cuando el Asistente aprieta el
-- botón (`pwa-asistente/index.html:1896`). Esto no está para atajar la
-- ortografía de nadie — está para que la equivocación de una pantalla no le
-- cueste la fichada a quien la marcó, que es lo que ya pasó una vez.

-- 1. La misma marca, bien escrita, antes de tocar el disco.
create function public.la_fichada_se_escribe_derecho()
  returns trigger
  language plpgsql
  set search_path = ''
as $cuerpo$
begin
  if new.event_type is not null then
    new.event_type := lower(btrim(new.event_type));
  end if;
  return new;
end
$cuerpo$;

comment on function public.la_fichada_se_escribe_derecho() is
  'Le saca los espacios y le pasa a minúscula el tipo de fichada antes de guardarlo. Existe para que una pantalla que escriba «Entrada» con mayúscula no le haga perder la fichada al Asistente que la marcó: se corrige sola y entra (migración 0008).';

-- No es `security definer`, así que corre con los permisos de quien ficha y no
-- abre ninguna puerta nueva. Igual no queda al alcance de nadie por su cuenta:
-- Postgres controla el permiso al crear el disparador, no al dispararlo, así
-- que revocarlo acá no lo apaga.
revoke all on function public.la_fichada_se_escribe_derecho() from public, anon, authenticated;

create trigger la_fichada_se_escribe_derecho
  before insert or update of event_type on public.clock_ins
  for each row
  execute function public.la_fichada_se_escribe_derecho();

-- 2. Y lo que ya está guardado, igual.
--
-- La 0007 corrigió las mayúsculas de lo viejo, pero no los espacios de los
-- costados, porque entonces todavía no eran algo que se corrigiera. Se corrigen
-- acá, y sólo cuando lo que queda es una de las dos palabras válidas: cualquier
-- otra cosa sigue sin adivinarse.
update public.clock_ins
   set event_type = lower(btrim(event_type))
 where event_type is not null
   and event_type <> lower(btrim(event_type))
   and lower(btrim(event_type)) in ('entrada', 'salida');

notify pgrst, 'reload schema';
