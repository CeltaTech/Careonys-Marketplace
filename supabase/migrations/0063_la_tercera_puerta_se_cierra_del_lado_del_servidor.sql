-- =====================================================================
-- LA TERCERA PUERTA SE CIERRA DEL LADO DEL SERVIDOR
--
-- Desde el 26 de agosto de 2026 el chat reconoce un teléfono, un correo o
-- un domicilio y no manda el mensaje. Eso corre en `js/contacto.js`, o sea
-- **en la máquina de quien escribe**: quien quiera saltearlo abre la consola
-- del navegador y lo saltea. Y el que quiere saltearlo es exactamente la
-- persona contra la que el control existe, porque llevarse la conversación
-- afuera es lo que le conviene. Era el pendiente 62.
--
-- Acá va la otra mitad, la que sí es un control: la base revisa el contenido
-- antes de guardarlo, y un mensaje con datos de contacto no entra aunque el
-- pedido llegue a mano, sin pasar por ninguna pantalla.
--
-- POR QUÉ LAS REGLAS VAN EN UNA TABLA Y NO ADENTRO DE ESTE ARCHIVO
-- Porque escribir las cinco expresiones acá sería la segunda copia de las
-- mismas reglas, y el día que alguien ajuste qué cuenta como teléfono va a
-- ajustar una sola de las dos. La condición de cierre del pendiente 62 lo
-- dice con todas las letras: «con las mismas reglas que usa la pantalla y no
-- una segunda copia de ellas». Así que la tabla es el original, y
-- `data/patrones-contacto.json` —que es lo que lee el navegador— pasa a
-- generarse desde ella con `scripts/generar_patrones_contacto.mjs`, igual
-- que `data/catalogo-vocabularios.json` desde la migración 0038.
--
-- POR QUÉ NO ES UN VOCABULARIO
-- Un vocabulario es una lista de opciones que alguien elige. Una expresión
-- que reconoce un teléfono no es una opción y nadie la elige: meterla ahí
-- sería usar la palabra por comodidad y no por lo que significa. Tabla
-- propia, entonces, con la misma disciplina.
--
-- LAS DOS SINTAXIS, Y EL ÚNICO PUNTO DONDE SE TRADUCEN
-- Las expresiones están escritas para el navegador, y ahí `\b` significa
-- «borde de palabra». En Postgres `\b` significa **retroceso** —el carácter
-- de la tecla de borrar— y el borde de palabra se escribe `\y`. Es la única
-- diferencia que tienen estas cinco, y por eso hay una sola función que la
-- traduce, `public.patron_en_postgres`, en vez de una segunda columna con
-- las expresiones repetidas en el otro dialecto. Lo que esa función **no**
-- sabe traducir está escrito en su propio comentario, y una restricción de
-- la tabla impide guardar un patrón que la use.
--
-- LO QUE ESTA MIGRACIÓN NO DECIDE
-- Si hay que bloquear además el nombre de usuario de otra aplicación
-- —«buscame en Instagram como…»—, que abre la misma puerta y que bloquearlo
-- puede cortar conversaciones legítimas. Es decisión del Desarrollador y
-- sigue anotada. Cuando la conteste, se agrega **una fila**, no una versión.
-- =====================================================================


-- --- 1. El traductor de las dos sintaxis -----------------------------------
-- Una sola función, y documentada, en vez de guardar cada expresión dos veces.
create or replace function public.patron_en_postgres(p_patron text)
  returns text
  language sql
  immutable
  set search_path = public
as $$
  select replace(p_patron, '\b', '\y');
$$;

comment on function public.patron_en_postgres(text) is
  'Traduce una expresión escrita para el navegador a la sintaxis de Postgres. Hoy la única diferencia entre las dos, para las expresiones que usa el chat, es el borde de palabra: \b en JavaScript, \y en Postgres, donde \b significa retroceso. Lo que NO sabe traducir, y por eso la tabla no lo deja guardar: \B, la clase [\b], las miradas hacia adelante y hacia atrás ((?= (?! (?<= (?<!), y las referencias hacia atrás (\1). Ninguna de las cinco reglas de hoy las usa.';


-- --- 2. Las reglas, que son el original ------------------------------------
create table if not exists public.patrones_de_contacto (
    id         uuid primary key default gen_random_uuid(),
    clave      text not null unique,
    patron     text not null,
    banderas   text not null default '',
    motivo     jsonb not null,
    orden      integer not null default 0,
    activo     boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),

    -- El motivo es texto visible y como tal nace en los tres idiomas.
    constraint el_motivo_esta_en_los_tres_idiomas check (public.i18n_completo(motivo)),

    -- Las únicas dos banderas que significan algo de este lado: `i` elige
    -- entre `~` y `~*`, y `g` no cambia nada acá porque no se cuenta cuántas
    -- veces aparece, sólo si aparece. Cualquier otra sería una regla que la
    -- pantalla entiende y la base no.
    constraint las_banderas_son_conocidas check (banderas ~ '^[gi]*$'),

    -- Lo que el traductor no sabe traducir no entra. Sin esto, una expresión
    -- con una mirada hacia adelante se guardaría, la pantalla la aplicaría y
    -- la base la rechazaría al compilarla: el control se caería justo cuando
    -- alguien lo está ampliando, que es el peor momento.
    constraint el_patron_lo_entienden_los_dos_lados check (
      patron !~ '\\[B1-9]' and patron !~ '\(\?[=!<]'),

    -- Y que compile de este lado. `regexp_replace` contra una cadena vacía
    -- obliga a Postgres a compilar la expresión y devuelve la cadena vacía,
    -- así que un paréntesis sin cerrar rompe acá y no el día que alguien
    -- escriba un mensaje.
    constraint el_patron_compila_en_postgres check (
      length(regexp_replace('', public.patron_en_postgres(patron), '')) = 0)
);

comment on table public.patrones_de_contacto is
  'Las reglas de la tercera puerta: qué cuenta como un teléfono, un correo o un domicilio adentro del chat. Es el original; data/patrones-contacto.json se genera desde acá con scripts/generar_patrones_contacto.mjs.';

comment on column public.patrones_de_contacto.patron is
  'La expresión tal como la escribe el navegador. La base la traduce al leerla con public.patron_en_postgres.';

comment on column public.patrones_de_contacto.motivo is
  'Por qué quedó bloqueado, en los tres idiomas. Lo muestra la pantalla; la base nunca lo devuelve, porque un mensaje de error del servidor no lleva texto visible.';

-- No lleva `tenant_id`, y no es un olvido. La tercera puerta es del producto,
-- no de cada Prestadora: si una Prestadora pudiera aflojarla, la puerta dejaría
-- de estar cerrada para todos, porque a cualquiera le alcanza con abrirse una
-- conversación ahí. Es lo mismo que la regla de que el teléfono no se muestra.
comment on column public.patrones_de_contacto.activo is
  'Apagar una regla es de la empresa, no de una Prestadora: por eso esta tabla no tiene columna de Organización.';


-- --- 3. El aislamiento ------------------------------------------------------
-- RLS igual que en toda tabla, aunque lo que guarda sea del producto y no de
-- nadie: las reglas ya viajan al navegador dentro de data/patrones-contacto.json,
-- así que leerlas no descubre nada, pero escribirlas no lo puede hacer ninguna
-- sesión. La política deja ver sólo las que están encendidas.
alter table public.patrones_de_contacto enable row level security;

drop policy if exists "Las reglas del chat se leen y no se tocan" on public.patrones_de_contacto;
create policy "Las reglas del chat se leen y no se tocan" on public.patrones_de_contacto
  for select to anon, authenticated
  using (activo);

revoke all on table public.patrones_de_contacto from anon, authenticated;
grant select on table public.patrones_de_contacto to anon, authenticated;


-- --- 4. Las cinco reglas de hoy --------------------------------------------
-- Salen tal cual de data/patrones-contacto.json, que hasta esta migración era
-- el original. De acá en adelante el archivo se genera desde esta tabla.
insert into public.patrones_de_contacto (clave, patron, banderas, motivo, orden)
values
  ('telefono',
   '(?:\d[ .()\-]{0,2}){7,}',
   'g',
   '{"es-AR": "Parece un número de teléfono.", "en": "This looks like a phone number.", "pt-BR": "Parece um número de telefone."}'::jsonb,
   1),

  ('telefono_en_letras',
   '(?:\b(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b[ ,.\-]*){7,}',
   'gi',
   '{"es-AR": "Parece un número de teléfono escrito con palabras.", "en": "This looks like a phone number spelled out in words.", "pt-BR": "Parece um número de telefone escrito por extenso."}'::jsonb,
   2),

  ('correo',
   '[A-Za-z0-9._%+-]+ ?(?:@|\( ?at ?\)|\[ ?at ?\]|\barroba\b) ?[A-Za-z0-9-]+ ?(?:\.|\bpunto\b|\bponto\b) ?[A-Za-z]{2,}',
   'gi',
   '{"es-AR": "Parece una dirección de correo.", "en": "This looks like an email address.", "pt-BR": "Parece um endereço de e-mail."}'::jsonb,
   3),

  ('domicilio',
   '\b(?:calle|avenida|av|avda|pasaje|psje|diagonal)\b\.? ?[A-Za-zÀ-ÿ'' ]{0,24}?\d{1,5}\b',
   'gi',
   '{"es-AR": "Parece un domicilio.", "en": "This looks like a street address.", "pt-BR": "Parece um endereço residencial."}'::jsonb,
   4),

  ('domicilio_por_partes',
   '\b(?:piso|depto|dpto|departamento|timbre|altura)\b\.? ?\d{1,5}\b',
   'gi',
   '{"es-AR": "Parece parte de un domicilio.", "en": "This looks like part of a street address.", "pt-BR": "Parece parte de um endereço residencial."}'::jsonb,
   5)
on conflict (clave) do nothing;


-- --- 5. El reconocedor ------------------------------------------------------
-- Devuelve la clave de la primera regla que reconoce algo, o nulo si el texto
-- pasa. La clave y nada más: el contenido del mensaje no sale de acá ni en un
-- error ni en un registro.
create or replace function public.contacto_en_el_texto(p_texto text)
  returns text
  language sql
  stable
  set search_path = public
as $$
  select r.clave
    from public.patrones_de_contacto r
   where r.activo
     and case when position('i' in r.banderas) > 0
              then coalesce(p_texto, '') ~* public.patron_en_postgres(r.patron)
              else coalesce(p_texto, '') ~  public.patron_en_postgres(r.patron)
         end
   order by r.orden, r.clave
   limit 1;
$$;

comment on function public.contacto_en_el_texto(text) is
  'La clave de la primera regla de patrones_de_contacto que reconoce datos de contacto en ese texto, o nulo si no reconoce ninguna. Nunca devuelve el texto.';

-- No es SECURITY DEFINER a propósito: lee la tabla con los permisos de quien
-- consulta, y esa tabla ya se puede leer. Así que no hay nada que revocarle a
-- `anon` por saltarse la RLS, pero igual se le revoca el poder llamarla: es una
-- función que PostgREST publica, y quien no inició sesión no tiene por qué
-- probar textos contra ella.
revoke all on function public.contacto_en_el_texto(text) from public;
revoke all on function public.contacto_en_el_texto(text) from anon;
grant execute on function public.contacto_en_el_texto(text) to authenticated;

revoke all on function public.patron_en_postgres(text) from public;
revoke all on function public.patron_en_postgres(text) from anon;
grant execute on function public.patron_en_postgres(text) to authenticated;


-- --- 6. La puerta -----------------------------------------------------------
create or replace function public.el_mensaje_no_lleva_datos_de_contacto()
  returns trigger
  language plpgsql
  set search_path = public
as $$
declare
  v_clave text;
begin
  v_clave := public.contacto_en_el_texto(new.contenido);
  if v_clave is not null then
    -- El error lleva una clave estable y nada más. No lleva el mensaje, no
    -- lleva la parte reconocida y no lleva nombres de tablas: es texto que
    -- llega al navegador, y ahí lo traduce el catálogo de frases.
    raise exception 'contacto_bloqueado:%', v_clave
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.el_mensaje_no_lleva_datos_de_contacto() is
  'Frena un mensaje del chat que lleve datos de contacto. Corre antes de guardar, así que no depende de ninguna pantalla. El error dice contacto_bloqueado:<clave de la regla> y nunca el contenido.';

drop trigger if exists el_mensaje_no_lleva_datos_de_contacto on public.mensajes;
create trigger el_mensaje_no_lleva_datos_de_contacto
  before insert on public.mensajes
  for each row execute function public.el_mensaje_no_lleva_datos_de_contacto();


-- --- 7. Que no nazca rota ---------------------------------------------------
-- Nueve textos, uno por regla y cuatro de los que tienen que pasar. No es la
-- prueba: la prueba son los veintiséis mensajes de
-- `scripts/probar_contacto_en_la_base.mjs`, que corren contra la tabla de
-- verdad y con una sesión. Esto es lo mínimo para que la migración no se dé
-- por aplicada si el traductor o las expresiones quedaron rotos.
do $$
declare
  v_esperado text;
  v_dio      text;
begin
  -- Los que no pueden pasar, con la regla que tiene que reconocerlos: si
  -- mañana lo reconoce otra, esto lo dice en vez de darlo por bueno.
  for v_esperado, v_dio in
    select x.espera, public.contacto_en_el_texto(x.texto)
      from (values
        ('telefono',             'Mi celular es 11 3000-1234'),
        ('telefono_en_letras',   'anotá uno uno tres cero cero cero uno dos tres cuatro'),
        ('correo',               'escribime a maria.lopez@gmail.com'),
        ('domicilio',            'vivo en la calle Rivadavia 4500'),
        ('domicilio_por_partes', 'tocá el timbre 12')
      ) as x(espera, texto)
  loop
    if v_dio is distinct from v_esperado then
      raise exception 'La regla % no reconoció lo suyo (dio %). La tercera puerta quedaría abierta.',
        v_esperado, coalesce(v_dio, 'nada');
    end if;
  end loop;

  -- Y los que sí tienen que pasar. Sin esta mitad la comprobación no puede
  -- fallar: una regla que bloquee todo pasaría la de arriba entera.
  for v_dio in
    select public.contacto_en_el_texto(x.texto)
      from (values
        ('Cobro 3500 por hora, de 8 a 16 hs.'),
        ('Tengo 45 años y trabajo hace 10 años en gerontología.'),
        ('Puedo los martes y jueves, 4 horas por día.'),
        ('Hice 120 horas de práctica en una residencia.')
      ) as x(texto)
  loop
    if v_dio is not null then
      raise exception 'Un mensaje legítimo quedó bloqueado por la regla %. El chat le corta la conversación a quien no hizo nada.',
        v_dio;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
