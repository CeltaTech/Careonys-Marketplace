/* ===================================================
   EL NOMBRE Y LA DESCRIPCIÓN DEL CURSO YA NO SE GUARDAN DOS VECES

   Pendiente 130. La migración 0051 agregó `nombre_i18n` y `descripcion_i18n`
   —con los tres idiomas— y dejó en pie `nombre` y `descripcion`, de texto
   suelto, porque las leía `getCursos()` en `js/apiClient.js` desde el
   programa del Asistente. Esa lectura ya pasó a las columnas nuevas, y no
   queda ningún otro lugar que escriba o lea las viejas —las únicas altas,
   las migraciones 0008 y 0048, ya llenan las dos—, así que se borran.
=================================================== */

alter table public.cursos
  drop column nombre,
  drop column descripcion;

notify pgrst, 'reload schema';
