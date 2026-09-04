/* ===================================================
   LOS CURSOS DEL CATÁLOGO NO SON SÓLO DE LAS FAMILIAS

   Pendiente 132. El ítem `cursos` del vocabulario `motivo_consulta` decía
   «Cursos para familias» / «Courses for families» / «Cursos para famílias»,
   repitiendo el mismo supuesto ya corregido en otras partes del catálogo: los
   cursos son para cualquiera del entorno de la persona cuidada, no sólo para
   la Familia. Se acorta a lo que la clave nombra, sin agregar el destinatario.
=================================================== */

update public.vocabulario_items i
set i18n = '{"en": "Courses", "es-AR": "Cursos", "pt-BR": "Cursos"}'::jsonb
from public.vocabularios v
where i.vocabulario_id = v.id
  and v.clave = 'motivo_consulta' and i.clave = 'cursos' and i.tenant_id is null;
