-- =====================================================================
-- 0049 — LAS PRESTADORAS FICTICIAS FICHAN
--
-- Pendiente 111, grupo (b). `clock_ins` no tenía una sola fila en toda
-- su vida, y el motivo estaba tapado por otro: la única pantalla que la
-- escribía mandaba el identificador de la cuenta donde va el del legajo,
-- así que la base la rechazaba siempre. Fue el pendiente 112, cerrado el 31
-- de agosto de 2026: ese día se fichó una entrada y una salida
-- desde el teléfono, corriendo de verdad contra la base de esta máquina,
-- y las dos filas quedaron.
--
-- PERO ESO NO LLENA LA TABLA, y conviene decir por qué, porque es
-- exactamente la trampa que este proyecto viene persiguiendo. Aquellas
-- dos filas las escribió una persona apretando un botón: no las repone
-- ninguna migración, así que la primera base que se arme desde cero
-- vuelve a tener la tabla vacía. La comprobación de la siembra saldría
-- verde hoy y roja mañana sin que nadie haya cambiado nada — que es peor
-- que salir roja siempre, porque un verde intermitente se lee como
-- «anda» las veces que anda.
--
-- Así que la fichada se siembra, que es lo que el pendiente 111 pedía
-- con todas las letras para este grupo.
--
-- QUÉ SE SIEMBRA, Y POR QUÉ ASÍ. Cuatro turnos cerrados y uno abierto,
-- repartidos entre las dos Prestadoras que tienen gente cargada. Cada
-- fichada cae en una zona que **esa** Asistente cubre de verdad según
-- `zonas_asistente`, no en una coordenada puesta al azar: una entrada
-- marcada en un barrio donde esa persona no trabaja es un dato falso
-- aunque la persona sea inventada.
--
-- Las coordenadas son de lugares públicos de cada barrio. Ninguna es el
-- domicilio de nadie, ni real ni inventado, y no hace falta que lo sea:
-- lo que la columna tiene que poder mostrar es que la fichada trae una
-- posición, no dónde vive una Familia.
--
-- EL TURNO ABIERTO ES A PROPÓSITO. Una entrada sin su salida es el
-- estado normal de cualquier Asistente que todavía está trabajando, y
-- es el caso que hace fallar a la pantalla que sume horas restando una
-- de otra. Si la siembra tuviera sólo pares perfectos, esa pantalla se
-- podría escribir mal y salir bien.
--
-- Los identificadores van escritos para que esto se pueda correr dos
-- veces sin duplicar nada, igual que hacen la 0003 y la 0030 con las
-- Prestadoras y los legajos.
--
-- Sin cambios de esquema: no hace falta `NOTIFY pgrst`.
-- =====================================================================

insert into public.clock_ins
       (id, tenant_id, caregiver_id, latitude, longitude, event_type, created_at)
select v.id::uuid, c.tenant_id, c.id, v.latitude, v.longitude, v.event_type,
       date_trunc('day', now()) - (v.dias || ' days')::interval
                                + (v.hora || ' hours')::interval
  from (values
    -- Alejandra Sosa Ficticia, PresDemo — Palermo, turno cerrado
    ('f1c4ada0-0000-4000-8000-000000000001', 'presdemo',    'Alejandra Sosa Ficticia',
     -34.5789, -58.4234, 'entrada', 3,  8),
    ('f1c4ada0-0000-4000-8000-000000000002', 'presdemo',    'Alejandra Sosa Ficticia',
     -34.5789, -58.4234, 'salida',  3, 16),
    -- Nadia Britos Ficticia, PresDemo — Caballito, turno cerrado
    ('f1c4ada0-0000-4000-8000-000000000003', 'presdemo',    'Nadia Britos Ficticia',
     -34.6187, -58.4407, 'entrada', 2,  7),
    ('f1c4ada0-0000-4000-8000-000000000004', 'presdemo',    'Nadia Britos Ficticia',
     -34.6187, -58.4407, 'salida',  2, 13),
    -- Omar Zabala Ficticio, Cuidar Norte — San Isidro, turno cerrado
    ('f1c4ada0-0000-4000-8000-000000000005', 'cuidarnorte', 'Omar Zabala Ficticio',
     -34.4715, -58.5075, 'entrada', 2,  9),
    ('f1c4ada0-0000-4000-8000-000000000006', 'cuidarnorte', 'Omar Zabala Ficticio',
     -34.4715, -58.5075, 'salida',  2, 15),
    -- Lorena Maidana Ficticia, Cuidar Norte — Morón, turno cerrado
    ('f1c4ada0-0000-4000-8000-000000000007', 'cuidarnorte', 'Lorena Maidana Ficticia',
     -34.6534, -58.6196, 'entrada', 1,  8),
    ('f1c4ada0-0000-4000-8000-000000000008', 'cuidarnorte', 'Lorena Maidana Ficticia',
     -34.6534, -58.6196, 'salida',  1, 14),
    -- Ester Villalba Ficticia, PresDemo — Núñez, todavía adentro
    ('f1c4ada0-0000-4000-8000-000000000009', 'presdemo',    'Ester Villalba Ficticia',
     -34.5461, -58.4620, 'entrada', 0,  8)
  ) as v(id, slug, asistente, latitude, longitude, event_type, dias, hora)
  join public.tenants t on t.slug = v.slug
  join public.caregivers c on c.tenant_id = t.id and c.full_name = v.asistente
 where not exists (select 1 from public.clock_ins f where f.id = v.id::uuid);
