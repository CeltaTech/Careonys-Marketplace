-- 0058: la basura que dejaron las pruebas en la base publicada
--
-- Qué pasó
-- --------
-- Dos pruebas crean cosas en la base publicada y las borran al terminar. Las
-- dos hacen ese borrado **por la puerta de administración**, y las dos, cuando
-- corren sin esa llave, avisan que dejaron el rastro y siguen adelante:
-- `scripts/probar_alta_y_baja.mjs` con la Prestadora que inventa para probar
-- el alta y la baja, y `scripts/probar_aislamiento.mjs` con las dos cuentas
-- ficticias con las que comprueba el aislamiento.
--
-- Corrieron así, y quedó el rastro. Lo encontró `scripts/comparar_bases.mjs`,
-- que lo listó como «filas que están en la base publicada y ninguna migración
-- carga».
--
-- Por qué esto es una migración y no un borrado a mano
-- ---------------------------------------------------
-- Porque la regla de la empresa no tiene excepción para limpiar: nunca se
-- aplica un cambio a mano contra la base. Escrito acá queda versionado, corre
-- una sola vez, dice qué borró y se puede leer dentro de un año. Contra la
-- base de esta máquina no borra nada, porque este rastro no existe ahí: lo
-- dejaron corridas contra la publicada.
--
-- Cómo se reconoce la basura sin adivinar
-- ---------------------------------------
-- **Por la terminación del correo.** Las cuentas de prueba se registran en
-- `@ejemplo.invalid` y `@ejemplo.test`. `.invalid` y `.test` están reservadas
-- por norma para nombres inventados: no se pueden registrar, no resuelven y
-- **ninguna persona real puede tener una dirección ahí**. Así que esto no
-- borra «lo que parece de prueba» —que sería una corazonada— sino lo que por
-- construcción no es de nadie.
--
-- La Prestadora va por su nombre exacto, el que declara la prueba en
-- `scripts/probar_alta_y_baja.mjs`. No se borra «toda Prestadora que no
-- reconozco»: una regla así se lleva puesto el día que exista una que este
-- archivo no llegó a conocer.
--
-- Las tres Prestadoras de ejemplo no se tocan: PresDemo y Cuidar Norte, de la
-- 0003, y Cuidar Sur, de la 0035. Son el banco de pruebas de todo lo demás.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. Las cuentas ficticias ───────────────────────────────────────────────
-- El perfil cuelga de la cuenta con borrado en cascada
-- (`0001_esquema_inicial.sql:252`), así que se borra la cuenta y el perfil se
-- va con ella. Borrar el perfil solo dejaría la cuenta viva, que es la mitad
-- del trabajo y la mitad que importa: la cuenta es la que puede iniciar
-- sesión.
do $$
declare
  cuantas integer;
begin
  select count(*) into cuantas
    from auth.users u
   where u.email like '%@ejemplo.invalid'
      or u.email like '%@ejemplo.test';

  delete from auth.users u
   where u.email like '%@ejemplo.invalid'
      or u.email like '%@ejemplo.test';

  raise notice 'Cuentas de prueba borradas: %', cuantas;
end $$;


-- ── 2. La Prestadora que la prueba de la puerta no alcanzó a borrar ────────
-- El orden importa, y lo dice la propia prueba en su limpieza: desde la 0046
-- toda Prestadora nace con sus filas de configuración de puntaje, que apuntan
-- a `tenants` **sin cascada**. Borrar la Prestadora derecho choca contra la
-- clave ajena. Primero la configuración, después ella.
--
-- Si mañana otra tabla le cuelga sin cascada, este borrado falla y la
-- migración se detiene entera. Eso es lo correcto: mejor que se pare a que
-- borre a medias.
do $$
declare
  ficticia uuid;
begin
  select t.id into ficticia
    from public.tenants t
   where t.slug = 'prestadora-de-prueba-de-la-puerta';

  if ficticia is null then
    raise notice 'La Prestadora de prueba de la puerta no está. No hay nada que borrar.';
    return;
  end if;

  delete from public.ponderacion_comprobacion where tenant_id = ficticia;
  delete from public.puntaje_prestadora        where tenant_id = ficticia;
  delete from public.alarmas_prestadora        where tenant_id = ficticia;
  delete from public.tenants                         where id        = ficticia;

  raise notice 'Borrada la Prestadora de prueba de la puerta y su configuración.';
end $$;


-- ── 3. Y se comprueba que quedó limpio ─────────────────────────────────────
-- Una migración que borra y no mira es una intención, no un hecho.
do $$
declare
  cuentas      integer;
  prestadoras  integer;
  ejemplo      integer;
begin
  select count(*) into cuentas
    from auth.users u
   where u.email like '%@ejemplo.invalid'
      or u.email like '%@ejemplo.test';

  select count(*) into prestadoras
    from public.tenants t
   where t.slug = 'prestadora-de-prueba-de-la-puerta';

  -- El control positivo. Sin esto, «cero cuentas de prueba» lo daría igual una
  -- base a la que este borrado no le llegó nunca, y las tres Prestadoras de
  -- ejemplo son lo que tiene que seguir estando cuando la basura ya no está.
  select count(*) into ejemplo
    from public.tenants t
   where t.slug in ('presdemo', 'cuidarnorte', 'cuidarsur');

  if cuentas > 0 then
    raise exception 'Quedaron % cuentas de prueba sin borrar', cuentas;
  end if;
  if prestadoras > 0 then
    raise exception 'Quedó la Prestadora de prueba de la puerta';
  end if;
  if ejemplo <> 3 then
    raise exception 'Tendrían que quedar las 3 Prestadoras de ejemplo y quedaron %', ejemplo;
  end if;

  raise notice 'Limpio: 0 cuentas de prueba, 0 Prestadoras de prueba, y las 3 de ejemplo en su lugar.';
end $$;


notify pgrst, 'reload schema';
