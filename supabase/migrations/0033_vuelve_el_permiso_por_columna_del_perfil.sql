-- ===================================================
-- VUELVE EL PERMISO POR COLUMNA DEL PERFIL
--
-- QUÉ PASÓ. La migración 0032 recortó los permisos de tabla al mínimo y dijo de
-- sí misma que «no concede nada nuevo: sólo saca». Sacó de más: el renglón
--
--     revoke all on table public.profiles from anon, authenticated;
--
-- se llevó puesto también un permiso *por columna* que la migración 0005 había
-- puesto a propósito, `update (full_name)`. En Postgres, `REVOKE ALL ON TABLE`
-- no distingue entre el permiso sobre la tabla entera y el permiso sobre una
-- columna: borra los dos. Esta migración lo repone, y nada más.
--
-- POR QUÉ IMPORTA, SI NINGUNA PANTALLA LO USA HOY. Porque ese permiso no está
-- para que la pantalla escriba: está para que la política sea segura. `profiles`
-- tiene la política «Su propio perfil, de escritura», que dice `id = auth.uid()`
-- y no nombra ninguna columna. La tabla guarda `role` y `tenant_id`. Lo único
-- que impide que alguien con sesión se ascienda a personal de la Prestadora, o
-- se mude a otra Organización escribiéndose el `tenant_id`, es que el permiso
-- llegue acotado a una sola columna. Así lo dejó 0005, y así vuelve a quedar.
--
-- Y HAY UNA AFIRMACIÓN DE 0032 QUE QUEDÓ MAL. Su encabezado dice que `profiles`
-- «hoy no tiene el permiso de tabla que la haría funcionar» y que la política de
-- escritura es letra muerta. Eso era falso cuando se escribió: el permiso
-- existía, acotado a `full_name`, desde `0005_acceso_por_sesion.sql:160`. Lo que
-- lo volvió cierto fue la propia 0032, al revocarlo. Una migración aplicada no
-- se edita, así que aquel párrafo queda como está y la corrección vive acá y en
-- `docs/ALCANCE.md`.
--
-- LO QUE NO CAMBIA. `profiles` sigue sin `insert` y sin `delete` para nadie: la
-- fila la crea el disparador `crear_perfil_al_registrarse` y se va sola cuando
-- se borra la cuenta de acceso, por la clave foránea con `on delete cascade`. Y
-- sigue sin permiso alguno para `anon`.
-- ===================================================

grant update (full_name) on table public.profiles to authenticated;

notify pgrst, 'reload schema';
