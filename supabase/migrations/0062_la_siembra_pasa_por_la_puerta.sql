-- =====================================================================
-- 0062 — La siembra pasa por la puerta
-- =====================================================================
--
-- Por qué hace falta
-- ------------------
-- La 0061 cerró la puerta de publicación, y ahí quedó a la vista que la
-- siembra nunca había modelado el requisito de entrada: de los trece legajos
-- ficticios, **ninguno** tenía el certificado de salud y los antecedentes
-- penales los tenía una sola persona. Con la puerta puesta, el directorio de
-- las tres Prestadoras pasaba de diez publicados a cero.
--
-- No es un defecto de la puerta. Es que hasta ahora las verificaciones de la
-- siembra estaban repartidas para que la lista de comprobaciones del
-- directorio no dijera lo mismo en todos —eso era todo lo que hacían—, y los
-- papeles que hacen falta para entrar a una casa no se los había cargado
-- nadie. Los clientes ficticios se tratan como reales: si con ellos no se
-- puede ver el producto andando, no se puede ver con nadie.
--
-- Quién queda adentro y quién no, y por qué justo así
-- --------------------------------------------------
-- Cada condición del directorio queda aislada en una persona distinta, para
-- que una prueba que se rompa diga cuál se rompió:
--
--   * **Ramiro Cáceres** (PresDemo) tiene todo menos la matrícula, que ya
--     estaba cargada como «presentada, sin comprobar» desde la 0027. Es
--     acompañante terapéutico, y ese tipo de Asistente la exige. **Queda
--     afuera del directorio por exactamente un papel.** Es el caso que hace
--     que la puerta se pueda ver: sin él, una vista con la condición rota y
--     una sana contestan lo mismo.
--   * **Diego Ferreyra** (Cuidar Norte) es del mismo tipo de Asistente y sí
--     tiene la matrícula comprobada. Los dos al lado son la prueba: misma
--     profesión, un papel de diferencia, uno publica y el otro no.
--   * **Ester Villalba** (PresDemo) queda afuera por lo suyo de siempre: no
--     contestó que sí a publicarse. Ahora tiene todos los papeles, así que
--     ésa es la única razón que la deja afuera, y el consentimiento se sigue
--     probando solo.
--   * **Hugo Peralta** y **Carina Duarte** siguen en revisión, sin papeles.
--     Son Aspirantes: la Prestadora todavía no les miró el legajo.
--
-- Quedan nueve publicados de trece.
--
-- Datos inventados, como todo el resto de la siembra. Ninguna persona real.
-- =====================================================================


-- ── 1. Los papeles de la puerta ──────────────────────────────────────────
-- Sólo se agrega lo que falta: `do nothing` deja quieto lo que ya estaba, y
-- por eso la matrícula presentada de Ramiro no se pisa. `verificado_el` lo
-- pone el disparador de la 0060; `verificado_por` queda vacío porque una
-- migración no tiene sesión, y eso es honesto: nadie lo marcó desde una
-- pantalla.
insert into public.verificaciones_asistente
  (tenant_id, caregiver_id, tipo, estado)
select c.tenant_id, c.id, v.tipo, 'verificado'
  from public.caregivers c
  join (values
          -- PresDemo ------------------------------------------------------
          -- Marta Quiroga, enfermera universitaria: los cuatro.
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'penales'),
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'salud'),
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'matricula'),
          ('aaaaaaa1-0000-4000-8000-000000000001'::uuid, 'titulo'),

          -- Alejandra Sosa, cuidadora domiciliaria: no le corresponden ni
          -- matrícula ni título, así que con dos alcanza.
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'penales'),
          ('aaaaaaa1-0000-4000-8000-000000000003'::uuid, 'salud'),

          -- Ramiro Cáceres, acompañante terapéutico. Título sí, matrícula
          -- **no**: la suya sigue presentada y sin comprobar. Es el que la
          -- puerta deja afuera.
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'penales'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'salud'),
          ('aaaaaaa1-0000-4000-8000-000000000004'::uuid, 'titulo'),

          -- Nadia Britos, auxiliar de enfermería: ya tenía penales y título.
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'salud'),
          ('aaaaaaa1-0000-4000-8000-000000000005'::uuid, 'matricula'),

          -- Ester Villalba, gerontóloga. Tiene todo y aun así no aparece:
          -- no contestó que sí a publicarse, y ésa pasa a ser la única razón.
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'penales'),
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'salud'),
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'matricula'),
          ('aaaaaaa1-0000-4000-8000-000000000006'::uuid, 'titulo'),

          -- Cuidar Norte --------------------------------------------------
          -- Silvia Ledesma, enfermera universitaria.
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'penales'),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'salud'),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'matricula'),
          ('bbbbbbb2-0000-4000-8000-000000000001'::uuid, 'titulo'),

          -- Rubén Ocampo, gerontólogo.
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'penales'),
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'salud'),
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'matricula'),
          ('bbbbbbb2-0000-4000-8000-000000000002'::uuid, 'titulo'),

          -- Omar Zabala, cuidador domiciliario.
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'penales'),
          ('bbbbbbb2-0000-4000-8000-000000000003'::uuid, 'salud'),

          -- Lorena Maidana, auxiliar de enfermería: ya tenía título y
          -- matrícula.
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'penales'),
          ('bbbbbbb2-0000-4000-8000-000000000004'::uuid, 'salud'),

          -- Diego Ferreyra, acompañante terapéutico. El de al lado de
          -- Ramiro: misma profesión, y a éste la matrícula sí se le comprobó.
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'penales'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'salud'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'matricula'),
          ('bbbbbbb2-0000-4000-8000-000000000005'::uuid, 'titulo'),

          -- Cuidar Sur ----------------------------------------------------
          -- Verónica Aguirre, cuidadora domiciliaria.
          ('bbbbbbb3-0000-4000-8000-000000000001'::uuid, 'penales'),
          ('bbbbbbb3-0000-4000-8000-000000000001'::uuid, 'salud')
       ) as v(caregiver_id, tipo) on v.caregiver_id = c.id
on conflict (caregiver_id, tipo) do nothing;


-- ── 2. Que la puerta se note, y que esto no pueda pasar sin hacer nada ───
-- Tres preguntas, y las tres tienen que dar lo mismo que dice el encabezado.
-- La del medio es la que importa: si alguien afloja la condición de la vista,
-- Ramiro aparece y esta migración deja de correr.
do $$
declare
  publicados integer;
  ramiro     integer;
  diego      integer;
begin
  select count(*) into publicados from public.directorio;

  select count(*) into ramiro from public.directorio
   where id = 'aaaaaaa1-0000-4000-8000-000000000004';

  select count(*) into diego from public.directorio
   where id = 'bbbbbbb2-0000-4000-8000-000000000005';

  if publicados <> 9 then
    raise exception 'El directorio tendría que publicar 9 legajos y publica %', publicados;
  end if;

  if ramiro <> 0 then
    raise exception
      'Ramiro Cáceres aparece en el directorio sin la matrícula comprobada: la puerta de publicación no está cerrando';
  end if;

  if diego <> 1 then
    raise exception
      'Diego Ferreyra no aparece en el directorio y tiene los cuatro papeles: la puerta está cerrando de más';
  end if;
end $$;


notify pgrst, 'reload schema';
