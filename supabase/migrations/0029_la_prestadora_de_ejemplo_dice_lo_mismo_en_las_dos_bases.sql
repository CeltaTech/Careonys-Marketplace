-- ===========================================================================
-- LA PRESTADORA DE EJEMPLO DICE LO MISMO EN LAS DOS BASES
--
-- POR QUÉ EXISTE. La base publicada no era la que arman las migraciones. La
-- fila de PresDemo estaba ahí con el nombre «PresDemo — Servicios de Cuidado»,
-- con otra descripción y con su logotipo cargado, y **ninguna migración escribe
-- ninguna de las tres cosas**: se pusieron a mano contra la base, que es
-- justamente lo que la regla «la base de datos: sólo por migraciones» viene a
-- impedir. Reconstruir desde cero daba una Prestadora distinta de la que se ve
-- publicada, y nadie lo iba a notar hasta el día de rehacerla.
--
-- Se comprobó comparando fila por fila y columna por columna un volcado de la
-- base publicada contra otro de una base local reconstruida desde cero con las
-- veintiocho migraciones anteriores. De esa comparación salieron tres clases de
-- diferencia, y sólo la primera es un desvío:
--
--   1. **Esta fila.** Va acá, escrita sin condición, para que las dos bases
--      digan lo mismo.
--   2. **Los identificadores y las fechas.** Cada base genera los suyos: los
--      `uuid` de las Prestadoras y los `created_at` que toman su valor por
--      omisión no son iguales ni tienen por qué serlo.
--   3. **Lo que existe porque alguien usó el producto.** Los perfiles cuelgan
--      de una cuenta de acceso —los crea el disparador de la migración 0005 al
--      registrarse alguien— y varios legajos se cargaron probando las pantallas
--      a mano. Eso no es siembra y no entra en ninguna migración: una base
--      recién construida no tiene cuentas, y está bien que no las tenga.
--
-- QUÉ SE ELIGIÓ, Y POR QUÉ. Entre los dos textos gana el de la base publicada,
-- que es el que ya se demostró y se verificó funcionando, con una corrección: su
-- descripción decía «plataforma», que el glosario de la empresa no admite para
-- nombrar una unidad vendible. El logotipo se escribe con la barra inicial, como
-- el de la otra Prestadora de ejemplo, para que las dos filas se lean iguales.
--
-- SIN CONDICIÓN, A PROPÓSITO. La migración 0028 escribía el logotipo sólo
-- `where logo_url is null`, y contra la base publicada eso no hizo nada, porque
-- el valor ya estaba puesto a mano. Una migración que no corre donde más falta
-- hace no arregla nada: acá se escribe siempre.
--
-- La fila se encuentra por su nombre corto, nunca por un identificador escrito
-- a mano, porque el identificador lo genera cada base.
-- ===========================================================================

update public.tenants
   set name        = 'PresDemo — Servicios de Cuidado',
       description = 'Prestadora de ejemplo, con datos inventados. Existe para probar el producto y para mostrarlo.',
       logo_url    = '/assets/images/logo_presdemo.png'
 where slug = 'presdemo';

update public.tenants
   set logo_url = '/assets/images/logo_cuidarnorte.svg'
 where slug = 'cuidarnorte';

-- --- Dos comentarios que nombraban una vista que ya no existe ---------------
-- `caregivers_publicos` pasó a llamarse `directorio` en la migración
-- 0015, pero estos dos comentarios se quedaron con el nombre viejo. No es un
-- desvío —están así en las dos bases, porque salen de las migraciones—, es
-- texto que ya no describe lo que hay.

comment on table public.referencias_asistente is
  'Datos de un tercero. No se expone jamás vía directorio ni ninguna otra vista pública.';

comment on table public.autorizaciones_asistente is
  'Lo que el Asistente autoriza al cerrar el alta. perfil_publicado en false es lo que impide que directorio muestre a alguien que no dio permiso — pendiente 2. Se llamaba banderas_asistente hasta la migración 0012.';

notify pgrst, 'reload schema';
