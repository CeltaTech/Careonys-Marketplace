-- =====================================================================
-- 0043 — Qué vocabularios llevan Guía de cuidado
--
-- La 0041 colgó la Guía de `vocabulario_items` y no de «patología» para
-- que las discapacidades y las tareas de cuidado pudieran tener la suya
-- sin una tabla nueva. Eso está bien del lado de los datos y deja un
-- agujero del lado de la pantalla: la que le permite a una Prestadora
-- escribir su guía tiene que ofrecerle de qué lista elegir, y hoy hay 24
-- vocabularios. Ofrecerle los 24 es ofrecerle escribir la guía de cuidado
-- del «día de la semana». Ofrecerle cinco escritos adentro de la pantalla
-- es un catálogo escrito a mano, que es justo lo que la 0038 vino a
-- terminar.
--
-- Así que la respuesta va donde va todo lo demás: en la base, y la
-- pantalla la lee. `admite_guia` dice si sobre esa lista tiene sentido
-- escribir qué es, qué esperar, qué mirar y cómo actuar.
--
-- Arranca en falso para todos, y se prende en los cinco que hablan de la
-- persona cuidada o de lo que se le hace: patologías, discapacidades y
-- las tres listas de tareas. Los otros diecinueve describen al Asistente,
-- al contrato o al calendario, y de esos no hay nada que explicarle a
-- nadie en un domicilio.
--
-- No lleva RLS propia ni permisos nuevos: es una columna más de
-- `vocabularios`, que ya los tiene desde la 0038.
-- =====================================================================

alter table public.vocabularios
  add column if not exists admite_guia boolean not null default false;

comment on column public.vocabularios.admite_guia is
  'Verdadero si sobre las opciones de esta lista tiene sentido escribir una Guia de cuidado. Lo lee la pantalla que deja a una Prestadora escribir la suya, para no ofrecerle listas donde una guia no significa nada.';

update public.vocabularios
   set admite_guia = true
 where clave in ('patologia', 'discapacidad', 'tarea_cuidado',
                 'tarea_hogar', 'tarea_acompanamiento');

notify pgrst, 'reload schema';
