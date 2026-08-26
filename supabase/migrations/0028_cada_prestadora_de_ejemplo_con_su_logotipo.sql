-- 0028: cada Prestadora de ejemplo se muestra con su propio logotipo
--
-- Por qué
-- -------
-- Este producto se ve con el nombre, el logotipo y los colores de la Prestadora
-- que se esté mirando. Los colores ya salían de la siembra desde la 0003, y el
-- nombre dejó de estar escrito a mano en las pantallas el 26 de agosto de 2026.
-- El logotipo era el único que faltaba: `logo_url` estaba en nulo para las dos
-- Prestadoras de ejemplo, así que `_applyBranding` caía en el respaldo —el
-- logotipo del producto— y las dos se veían iguales.
--
-- Eso no es sólo una pantalla imperfecta: es una demostración que no demuestra
-- lo que tiene para demostrar. Quien la mira se lleva la idea de que el producto
-- se ve siempre igual, que es justo lo contrario de lo que se le está mostrando.
-- Y es además una prueba que no puede fallar: con las dos Prestadoras cayendo en
-- el mismo respaldo, cambiar de Prestadora y ver el mismo logotipo es el
-- resultado correcto y el resultado roto a la vez.
--
-- Por eso los dos logotipos son distintos entre sí y distintos del producto.
-- Los dos son inventados, como todo lo de estas dos Prestadoras: no son de
-- ninguna empresa que exista.
--
-- La ruta se guarda empezando con barra. `_applyBranding` la resuelve contra la
-- raíz del sitio con `new URL`, así que una ruta con barra vale igual leída
-- desde la portada que desde `pwa-familia/index.html`, que es donde una ruta
-- relativa apuntaba a una carpeta que no existe.
--
-- Se busca por `slug`, nunca por un identificador escrito a mano: el de
-- PresDemo lo creó la base y no se escribe en ningún archivo.

update public.tenants
   set logo_url = '/assets/images/logo_presdemo.png'
 where slug = 'presdemo'
   and logo_url is null;

update public.tenants
   set logo_url = '/assets/images/logo_cuidarnorte.svg'
 where slug = 'cuidarnorte'
   and logo_url is null;


notify pgrst, 'reload schema';
