-- ===================================================
-- LOS PERMISOS DE TABLA, AL MÍNIMO
--
-- POR QUÉ. Postgres decide en dos pasos: primero si el rol puede tocar la
-- tabla, y recién después qué filas ve. Hasta hoy este producto tenía escrito
-- con cuidado el segundo paso —treinta y cuatro políticas— y el primero tal
-- como venía de fábrica. Supabase deja puesto un permiso por omisión que le
-- concede *todo* a `anon` y a `authenticated` sobre cada tabla, secuencia y
-- función que se cree en `public`. Así que cada tabla nueva nacía abierta, sin
-- que ninguna migración lo pidiera y sin que nada lo dijera.
--
-- QUÉ ABRÍA DE VERDAD. Mientras la política niegue, un permiso de más no deja
-- entrar a nadie: por eso la aplicación funcionaba igual. Lo que abría son dos
-- cosas concretas:
--
--   1. `TRUNCATE`, que no mira ninguna política. La RLS filtra filas; vaciar
--      la tabla no es filtrar filas. Cualquiera con sesión iniciada podía
--      vaciar cualquiera de las diecisiete tablas. Es el agujero de verdad.
--   2. La puerta lista para el día que alguien escriba una política más
--      floja, o cree una tabla y se olvide de la política. Ese día el primer
--      paso ya estaba en «sí» y nadie se iba a enterar.
--
-- QUÉ HACE ESTA MIGRACIÓN, Y QUÉ NO. **No concede nada nuevo: sólo saca.**
-- Cada tabla queda con exactamente los verbos que sus propias políticas ya
-- permiten, y ni uno más. Si una política dice `for all`, quedan alta, baja,
-- modificación y consulta; si dice `for select`, queda consulta. Se van
-- `TRUNCATE`, `REFERENCES` y `TRIGGER`, que ninguna pantalla usa y que
-- PostgREST no sabe pedir.
--
-- LA EXCEPCIÓN, QUE ES UN HALLAZGO. `profiles` tiene una política de
-- escritura —«Su propio perfil, de escritura»— y hoy **no** tiene el permiso
-- de tabla que la haría funcionar. Esta migración lo deja así, y a propósito.
-- Esa política no limita qué columnas se cambian, y `profiles` guarda `role` y
-- `tenant_id`: con el permiso puesto, cualquiera con sesión podría ascenderse a
-- personal de la Prestadora y, peor, mudarse a otra Organización escribiendo su
-- propio renglón. Lo único que hoy lo impide es justamente el permiso que
-- falta. Queda anotado como pendiente: se arregla acotando la política por
-- columna, no agregando el permiso.
--
-- LO QUE SE DEJA ABIERTO A `anon`, Y POR QUÉ. Ninguna tabla ni vista. Todo lo
-- que se ve sin iniciar sesión pasa por las tres funciones del directorio
-- —`directorio_de`, `perfil_del_directorio`, `prestadora_por_slug`—, que son
-- `security definer` y devuelven sólo lo publicado. Decidido por el
-- Desarrollador el 24 de agosto de 2026, y esas tres conservan su permiso.
--
-- LO QUE NO SE TOCA, Y POR QUÉ SE DICE. Las funciones que llaman las políticas
-- —`prestadora_actual`, `es_personal_de_prestadora`, `legajo_propio`,
-- `nombre_corto_de`— conservan `authenticated`. Una política evalúa su
-- expresión con los permisos de quien consulta: quitarle ese permiso a una
-- función que las políticas llaman no devuelve cero filas, **falla**, y deja la
-- aplicación sin poder leer sus propias tablas. Tampoco se toca `service_role`,
-- que es la llave del servidor y tiene que poder todo.
-- ===================================================


-- ---------------------------------------------------
-- 1. QUE LA TABLA DE MAÑANA NO NAZCA ABIERTA
--
-- Son los seis renglones que dejó puestos la instalación. Sacarlos no cambia
-- nada de lo que ya existe —el permiso por omisión sólo actúa al crearse un
-- objeto nuevo—, y cambia todo lo que venga: desde acá, la tabla que se cree
-- mañana no le concede nada a nadie hasta que una migración lo escriba.
--
-- CONSECUENCIA QUE HAY QUE SABER. Toda migración que cree una tabla, una vista
-- o una función tiene que conceder sus permisos explícitamente. Si no, la
-- pantalla va a recibir `42501 permission denied` con una sesión válida, y eso
-- no se arregla tocando políticas.
-- ---------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;


-- ---------------------------------------------------
-- 2. LAS DIECISIETE TABLAS CON POLÍTICA `for all`
--
-- Quedan con los cuatro verbos que la política ya permite. Se van `TRUNCATE`
-- —el que no mira políticas—, `REFERENCES` y `TRIGGER`.
-- ---------------------------------------------------
revoke all on table public.autorizaciones_asistente       from anon, authenticated;
revoke all on table public.avisos                   from anon, authenticated;
revoke all on table public.franjas_aviso            from anon, authenticated;
revoke all on table public.ponderacion_comprobacion from anon, authenticated;
revoke all on table public.puntaje_prestadora       from anon, authenticated;
revoke all on table public.caregivers                     from anon, authenticated;
revoke all on table public.clock_ins                      from anon, authenticated;
revoke all on table public.disponibilidad_asistente       from anon, authenticated;
revoke all on table public.documentos_asistente           from anon, authenticated;
revoke all on table public.estudios_asistente             from anon, authenticated;
revoke all on table public.experiencia_laboral_asistente  from anon, authenticated;
revoke all on table public.franjas_asistente              from anon, authenticated;
revoke all on table public.matriculas_asistente           from anon, authenticated;
revoke all on table public.messages                       from anon, authenticated;
revoke all on table public.referencias_asistente          from anon, authenticated;
revoke all on table public.reportes                       from anon, authenticated;
revoke all on table public.verificaciones_asistente       from anon, authenticated;

grant select, insert, update, delete on table public.autorizaciones_asistente       to authenticated;
grant select, insert, update, delete on table public.avisos                   to authenticated;
grant select, insert, update, delete on table public.franjas_aviso            to authenticated;
grant select, insert, update, delete on table public.ponderacion_comprobacion to authenticated;
grant select, insert, update, delete on table public.puntaje_prestadora       to authenticated;
grant select, insert, update, delete on table public.caregivers                     to authenticated;
grant select, insert, update, delete on table public.clock_ins                      to authenticated;
grant select, insert, update, delete on table public.disponibilidad_asistente       to authenticated;
grant select, insert, update, delete on table public.documentos_asistente           to authenticated;
grant select, insert, update, delete on table public.estudios_asistente             to authenticated;
grant select, insert, update, delete on table public.experiencia_laboral_asistente  to authenticated;
grant select, insert, update, delete on table public.franjas_asistente              to authenticated;
grant select, insert, update, delete on table public.matriculas_asistente           to authenticated;
grant select, insert, update, delete on table public.messages                       to authenticated;
grant select, insert, update, delete on table public.referencias_asistente          to authenticated;
grant select, insert, update, delete on table public.reportes                       to authenticated;
grant select, insert, update, delete on table public.verificaciones_asistente       to authenticated;


-- ---------------------------------------------------
-- 3. LOS CATÁLOGOS Y LOS INTENTOS, QUE SÓLO SE LEEN
--
-- Las cuatro tienen política `for select` y nada más. Y las cuatro le concedían
-- lectura a `anon`, que no la usa: la política pide sesión, así que sin sesión
-- ya devolvían cero filas. Sacar el permiso no cambia lo que se ve; cambia que
-- la puerta deje de estar abierta.
--
-- Lo que se escribe en `intentos_evaluacion` lo escribe `rendir_evaluacion`,
-- que es `security definer` y no necesita este permiso.
-- ---------------------------------------------------
revoke all on table public.cursos               from anon, authenticated;
revoke all on table public.evaluaciones         from anon, authenticated;
revoke all on table public.preguntas_evaluacion from anon, authenticated;
revoke all on table public.intentos_evaluacion  from anon, authenticated;

grant select on table public.cursos               to authenticated;
grant select on table public.evaluaciones         to authenticated;
grant select on table public.preguntas_evaluacion to authenticated;
grant select on table public.intentos_evaluacion  to authenticated;


-- ---------------------------------------------------
-- 4. LAS QUE YA ESTABAN BIEN, ESCRITAS IGUAL
--
-- `tenants`, `profiles` y `opciones_para_responder` ya tenían exactamente
-- lectura. Se vuelven a escribir acá para que el mapa completo de quién puede
-- tocar qué esté en un solo lugar y no haya que reconstruirlo leyendo trece
-- migraciones. `profiles` queda con lectura y sin escritura, por lo dicho
-- arriba.
-- ---------------------------------------------------
revoke all on table public.tenants                 from anon, authenticated;
revoke all on table public.profiles                from anon, authenticated;
revoke all on table public.opciones_para_responder from anon, authenticated;

grant select on table public.tenants                 to authenticated;
grant select on table public.profiles                to authenticated;
grant select on table public.opciones_para_responder to authenticated;


-- ---------------------------------------------------
-- 5. LAS DOS QUE NO SE ALCANZAN DESDE NINGUNA SESIÓN
--
-- `opciones_pregunta` guarda cuál es la respuesta correcta, y ya no tenía
-- permiso para nadie: se escribe el `revoke` igual para que quede dicho que es
-- a propósito y no un olvido. `directorio` es la vista que leen las tres
-- funciones del directorio; la lectura se le sacó en la migración 0021, pero le
-- habían quedado los otros seis verbos, que sobre una vista no sirven para nada
-- y no tienen por qué estar.
-- ---------------------------------------------------
revoke all on table public.opciones_pregunta from anon, authenticated;
revoke all on table public.directorio  from anon, authenticated;


-- ---------------------------------------------------
-- 6. LA FUNCIÓN DEL DISPARADOR, QUE NADIE TIENE QUE PODER LLAMAR
--
-- `la_ponderacion_suma_cien` comprueba que los pesos del puntaje sumen cien. Es
-- la función de un disparador sobre `ponderacion_comprobacion`: la llama
-- la base sola cuando alguien escribe esa tabla, y el permiso de llamada se
-- verifica al crear el disparador, no cada vez que se dispara. Que estuviera al
-- alcance de `anon` es exactamente lo que dejó puesto el permiso por omisión
-- del punto 1.
--
-- Se le revoca también a `PUBLIC`: revocarle a `PUBLIC` no alcanza para sacarle
-- el permiso a `anon`, porque el de `anon` es una concesión aparte, y al revés
-- tampoco. Hay que hacer las dos.
-- ---------------------------------------------------
revoke all on function public.la_ponderacion_suma_cien() from public, anon, authenticated;


notify pgrst, 'reload schema';
