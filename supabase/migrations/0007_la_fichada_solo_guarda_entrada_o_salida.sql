-- La fichada sólo guarda «entrada» o «salida», y la base lo exige
--
-- Qué pasaba. `clock_ins.event_type` es `text` a secas, sin ninguna
-- restricción, y dos pantallas escribían cosas distintas adentro de la misma
-- columna: `pwa-asistente/index.html` guardaba «entrada» y «salida», y
-- `mockup-app.html` guardaba «Entrada» y «Salida», con mayúscula.
--
-- Por qué importa, que no es prolijidad. Las dos alarmas que ve la Familia se
-- calculan comparando ese valor en minúscula
-- (`0001_base_del_esquema.sql:1642` y `:1657`), así que una fila escrita
-- «Entrada» hace las dos cosas que no tiene que hacer:
--
--   1. La jornada que quedó abierta **nunca dispara** la alarma
--      `jornada_abierta`, porque esa fila no es igual a «entrada».
--   2. Y la salida que venga después dispara una `salida_sin_entrada`
--      **falsa**, porque la fila anterior tampoco es igual a «entrada».
--
-- O sea que la Familia recibe el aviso que no corresponde y no recibe el que
-- sí. La pantalla ya quedó corregida en el mismo cambio que esta migración;
-- esto es para que la corrección no dependa de que nadie vuelva a escribirlo
-- mal desde otra pantalla, que es justo lo que ya pasó una vez.
--
-- Qué toca de lo que ya está guardado. Sólo la caja de las letras, y sólo en
-- las filas cuyo valor en minúscula ya es uno de los dos válidos: «Entrada»
-- pasa a «entrada» y «Salida» a «salida». No se pierde ninguna información
-- —es el mismo valor bien escrito—, y sin eso la restricción no se puede
-- validar contra lo que ya hay. Cualquier otro valor distinto de esos dos no
-- se adivina: la migración se corta y los nombra, para que se decida a mano
-- qué eran.

-- 1. La misma marca, bien escrita.
update public.clock_ins
   set event_type = lower(event_type)
 where event_type is not null
   and event_type <> lower(event_type)
   and lower(event_type) in ('entrada', 'salida');

-- 2. Si quedó alguno que no es ninguno de los dos, se para acá y se dice cuál.
do $revision$
declare
  raros text;
begin
  select string_agg(distinct quote_literal(event_type), ', ')
    into raros
    from public.clock_ins
   where event_type is not null
     and event_type not in ('entrada', 'salida');

  if raros is not null then
    raise exception
      'Hay fichadas con un tipo que no es «entrada» ni «salida»: %. No se '
      'adivina qué eran: se corrigen a mano y se vuelve a correr.', raros;
  end if;
end
$revision$;

-- 3. Y que la base no deje escribir otra cosa.
--
-- Son dos y no una, y la diferencia importa. La primera vale para todo lo que
-- hay y para todo lo que venga. La segunda —que el tipo no venga vacío— entra
-- `not valid`, que no quiere decir «apagada»: **rige para toda fila nueva y
-- para toda que se modifique**, y lo único que no hace es revisar lo que ya
-- estaba. Se escribe así a propósito: la columna nació aceptando el vacío y
-- este repositorio no tiene forma de consultar la base publicada para saber si
-- hay filas así. Con `set not null` la migración entera fallaría contra esa
-- base, y una migración que no corre no arregla nada. El día que se compruebe
-- que no queda ninguna, se cierra con un `validate constraint` en una
-- migración adelante. Una fichada sin tipo es igual de invisible para las
-- alarmas que una mal escrita.
alter table public.clock_ins
  add constraint la_fichada_es_entrada_o_salida
  check (event_type is null or event_type in ('entrada', 'salida'));

comment on constraint la_fichada_es_entrada_o_salida on public.clock_ins is
  'El tipo de fichada se guarda en minúscula, que es como lo comparan las alarmas de la Familia. Existe porque «mockup-app.html» escribía «Entrada» y «Salida»: la alarma de jornada abierta no saltaba y la salida siguiente disparaba una «salida_sin_entrada» falsa (migración 0007).';

alter table public.clock_ins
  add constraint la_fichada_tiene_tipo
  check (event_type is not null) not valid;

comment on constraint la_fichada_tiene_tipo on public.clock_ins is
  'Una fichada sin tipo no la ve ninguna de las dos alarmas de la Familia, igual que una mal escrita. Entra «not valid» porque la columna nació aceptando el vacío y desde el repositorio no se puede saber si la base publicada tiene filas así: rige para toda fila nueva, y lo viejo se cierra con un «validate constraint» el día que se compruebe que no queda ninguna (migración 0007).';

notify pgrst, 'reload schema';
