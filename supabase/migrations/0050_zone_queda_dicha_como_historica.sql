-- =====================================================================
-- 0050 — `caregivers.zone` QUEDA DICHA COMO HISTÓRICA
--
-- Pendiente 109. Al cerrar el pendiente 94 —el 31 de agosto de 2026—
-- desapareció el último formulario que llenaba esta columna, así que
-- desde ese día sólo se lee. Lo que seguía en pie era el otro lado: el
-- traductor de `js/apiClient.js` seguía llevando `zona` a `zone` al
-- escribir un legajo, y ninguna pantalla mandaba `zona`. Código que
-- espera un dato que ya nadie manda, y que la próxima persona que lo
-- lea va a tomar por vigente.
--
-- El pendiente dejaba dos salidas: borrar la columna, o dejarla como
-- columna histórica de sólo lectura. **Se tomó la segunda**, y no por
-- comodidad: la columna tiene datos de los legajos anteriores a la
-- migración 0035, y hay tres lectores que se apoyan en ella justamente
-- para esos —`js/zonas.js`, `directorio.html` y `mockup-app.html`—.
-- Borrarla sería borrar la zona de las personas cargadas antes de que
-- existiera `zonas_asistente`, que es dato y no basura.
--
-- Así que se saca el mapeo de escritura de las tres copias de
-- `js/apiClient.js` y se dice acá, en la base, que la columna es
-- histórica. **Se dice en la base y no en un documento** porque es acá
-- donde va a mirar quien la encuentre: un comentario en la columna
-- viaja con el esquema y no se queda viejo en una carpeta.
--
-- No toca ni una fila y no cambia ningún permiso: escribe un
-- comentario. La zona viva de un legajo es `zonas_asistente`, y su
-- texto para mostrar es `caregivers.zonas_texto`.
-- =====================================================================

comment on column public.caregivers.zone is
  'Histórica y de sólo lectura desde el 2026-08-31 (migración 0050, pendiente 109). '
  'Guarda la zona de los legajos anteriores a la migración 0035, cuando la zona '
  'todavía era un texto suelto. Ninguna pantalla la escribe y el traductor de '
  'js/apiClient.js ya no la llena. La zona viva de un legajo está en '
  'zonas_asistente, y el texto para mostrar en caregivers.zonas_texto. '
  'No se borró porque los datos que tiene son de personas cargadas antes de esa '
  'migración y tres lectores se apoyan en ella para mostrarlos.';

notify pgrst, 'reload schema';
