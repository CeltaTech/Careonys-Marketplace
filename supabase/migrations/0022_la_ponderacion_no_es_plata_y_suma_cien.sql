-- 0022: la ponderación no es plata, y las de una Prestadora suman 100
--
-- Por qué el nombre
-- -----------------
-- La columna se llamaba `peso` y quería decir «cuánto cuenta esta comprobación
-- dentro del puntaje del legajo». El Desarrollador leyó la palabra el 25 de
-- agosto de 2026 y preguntó si se estaba hablando de dinero. Esa es toda la
-- prueba que hacía falta: acá el peso es la moneda antes que cualquier otra
-- cosa, y la primera lectura de quien no escribió la tabla es la que vale.
--
-- Pasa a llamarse `ponderacion`, que no es una palabra inventada: es la que ya
-- significa cuánto cuenta cada cosa dentro de un total. La tabla la acompaña.
-- Es un renombre de algo ya guardado, así que lo autorizó él en la misma
-- conversación; sale barato porque la base todavía no tiene datos reales.
--
-- Por qué suman 100
-- -----------------
-- Lo puso el Desarrollador junto con el sí: «esa ponderación debe ser
-- configurable por cada Prestadora, no necesariamente ha de ser uniforme. Lo
-- que sí es importante es que la suma de todos los ítems valorados dé 100%, así
-- que si se agrega alguno la prestadora tendrá que reacomodar las ponderaciones
-- de cada ítem para que el total de todas ellas dé el 100%.»
--
-- Eso cambia la tabla de la 0018 más de lo que parece. Ahí cada comprobación
-- arrancaba en 1 y era independiente de las demás: subirle a una no le bajaba a
-- ninguna, y el total era cinco, o seis, o lo que diera. Ahora el total es una
-- cantidad fija que se reparte, y **subirle a una obliga a bajarle a otra**.
--
-- Las cinco arrancan en 20, que es 100 repartido en partes iguales. Sigue
-- siendo el valor de fábrica y no la regla.
--
-- Qué gana esto, además de que el número se lea
-- ---------------------------------------------
-- **Que agregar una comprobación sexta no se pueda hacer a escondidas.** El
-- valor de fábrica es 20, así que la fila nueva deja el total en 120 y la base
-- no la deja pasar hasta que alguien reacomode las demás. Es exactamente lo que
-- pidió el Desarrollador, y es la clase de regla que sirve porque molesta: si
-- no molestara, la sexta entraría y nadie se enteraría de que el criterio de esa
-- Prestadora cambió solo.
--
-- Cero sigue siendo legítimo y quiere decir «esta comprobación no me importa».
-- Lo que cambia es que ese cero ahora se lo tiene que quedar otra.
--
-- Por qué la comprobación va al final de la transacción
-- ----------------------------------------------------
-- Porque reacomodar es mover varias filas, y en el medio el total nunca da 100.
-- Un disparador común miraría después de cada renglón y haría fallar el primero.
-- Éste es un disparador de restricción y está diferido: mira una sola vez,
-- cuando la Prestadora terminó de guardar. Se puede pasar de 20 a 40 en una y de
-- 20 a 0 en otra sin que importe cuál se escribió primero.
--
-- Lo que esto deja pendiente en la pantalla
-- -----------------------------------------
-- **La fracción «4 de 5 comprobaciones» ya no se puede usar.** Sólo se lee bien
-- si las cinco valen lo mismo, y ahora valen lo que cada Prestadora diga. El
-- número pasa a ser un porcentaje, que además es lo que la suma a 100 vuelve
-- natural: un legajo con el domicilio y la referencia comprobadas tiene 40 %.
-- La lista al lado se queda, por el motivo de siempre — un número suelto invita
-- a comparar personas y la lista invita a decidir. Es el pendiente 56.
--
-- El mensaje que devuelve la base cuando el total no da 100 es texto técnico y
-- no se muestra tal cual: la pantalla lo clasifica y dice lo que corresponde
-- (regla 5.1 de `CLAUDE.md`).
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. Los nombres ─────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_class where relname = 'peso_comprobacion'
                                     and relnamespace = 'public'::regnamespace) then
    alter table public.peso_comprobacion rename to ponderacion_comprobacion;
  end if;

  if exists (select 1 from information_schema.columns
              where table_schema = 'public'
                and table_name = 'ponderacion_comprobacion'
                and column_name = 'peso') then
    alter table public.ponderacion_comprobacion rename column peso to ponderacion;
  end if;

  if exists (select 1 from pg_class where relname = 'idx_peso_comprobacion_tenant'
                                     and relnamespace = 'public'::regnamespace) then
    alter index public.idx_peso_comprobacion_tenant
      rename to idx_ponderacion_comprobacion_tenant;
  end if;
end $$;


-- ── 2. El reparto de fábrica: 100 en cinco partes iguales ──────────────────
alter table public.ponderacion_comprobacion
  alter column ponderacion set default 20;

-- Las filas que dejó la 0018 valen 1 cada una y suman 5. Se llevan a 20 antes
-- de encender el disparador, porque si no ninguna Prestadora podría volver a
-- guardar nada.
update public.ponderacion_comprobacion set ponderacion = 20 where ponderacion = 1;

comment on table public.ponderacion_comprobacion is
  'Cuánto cuenta cada comprobación en el puntaje del legajo, por Prestadora. Las de una misma Prestadora suman 100 y la base no acepta otra cosa: es un reparto, no una lista de valores sueltos. Arranca en 20 las cinco, que es el reparto en partes iguales; eso es el valor de fábrica y no la regla. Sólo entra acá lo comprobado por alguien; lo que la persona declara y nadie miró se muestra en el perfil y no suma.';

comment on column public.ponderacion_comprobacion.ponderacion is
  'Cuánto de los 100 se lleva esta comprobación. Cero quiere decir «esta no me importa», y ese cero se lo tiene que quedar otra comprobación para que el total siga dando 100. Para no calificar en absoluto está puntaje_prestadora.califica, que es otra cosa.';


-- ── 3. La regla: el total de una Prestadora da 100 ─────────────────────────
create or replace function public.la_ponderacion_suma_cien()
  returns trigger
  language plpgsql
as $$
declare
  afectada uuid := coalesce(new.tenant_id, old.tenant_id);
  cuantas  integer;
  total    numeric(8,2);
begin
  select count(*), coalesce(sum(ponderacion), 0)
    into cuantas, total
    from public.ponderacion_comprobacion
   where tenant_id = afectada;

  -- Una Prestadora que no tiene ni una fila no reparte nada, y eso es válido:
  -- es la que borró todo, no la que dejó el reparto a medias.
  if cuantas = 0 then
    return null;
  end if;

  if total <> 100 then
    raise exception
      'Las ponderaciones de una Prestadora tienen que sumar 100 y suman %', total
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

comment on function public.la_ponderacion_suma_cien() is
  'Comprueba, al cerrar la transacción y no en cada renglón, que las ponderaciones de la Prestadora que se tocó sumen 100. Diferido a propósito: reacomodar es mover varias filas y en el medio el total nunca da 100.';

drop trigger if exists la_ponderacion_suma_cien on public.ponderacion_comprobacion;
create constraint trigger la_ponderacion_suma_cien
  after insert or update or delete on public.ponderacion_comprobacion
  deferrable initially deferred
  for each row execute function public.la_ponderacion_suma_cien();


-- ── 4. La política sigue diciendo lo mismo, con el nombre nuevo ────────────
-- El renombre de la tabla se lleva la política puesta, pero no su nombre: se
-- vuelve a escribir para que no quede una que hable de pesos.
drop policy if exists "Pesos de la Prestadora"         on public.ponderacion_comprobacion;
drop policy if exists "Ponderaciones de la Prestadora" on public.ponderacion_comprobacion;
create policy "Ponderaciones de la Prestadora" on public.ponderacion_comprobacion
  for all to authenticated
  using      (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora())
  with check (tenant_id = public.prestadora_actual() and public.es_personal_de_prestadora());

revoke all on table public.ponderacion_comprobacion from anon;
