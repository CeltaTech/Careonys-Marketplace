--
-- 0004 — El chat reconoce cualquier medio de contacto, no sólo el teléfono y el correo
--
-- Por qué existe: el Desarrollador contestó el 10 de septiembre de 2026 la
-- pregunta de si el nombre de usuario de otra aplicación cuenta como dato de
-- contacto, y contestó ampliando la definición entera:
--
--     «evidentemente cualquier dato que permite que dos personas se comuniquen
--      es un dato de contacto. Ahora bien, queda claro que en marketplace esos
--      datos de contacto es lo que en definitiva estamos vendiendo.»
--
-- Con esa definición las cinco reglas de la siembra quedaban cortas: reconocían
-- el número de teléfono —escrito con cifras o con palabras—, la dirección de
-- correo y el domicilio, y **no reconocían nada de lo que hoy más se usa para
-- comunicarse**: el nombre de usuario de otra aplicación, el enlace y la
-- invitación a seguir la charla en otro lado. Un mensaje que dijera «buscame en
-- instagram» pasaba entero.
--
-- Y la segunda mitad de la frase es la que dice por qué esto no es una
-- prolijidad: el dato de contacto **es lo que se vende**. Cada uno que se
-- escapa por el chat es una venta que no ocurre.
--
-- Las reglas de 0002 no se editan —una migración aplicada no se toca nunca—:
-- estas cuatro se agregan adelante, con el orden que sigue al último.
--
-- Cómo se eligió cada patrón. El daño de este control no es dejar pasar un
-- teléfono —eso se arregla agregando una regla— sino cortarle la conversación a
-- un Asistente que está diciendo lo que cobra y cuándo puede. Así que ninguna de
-- las cuatro se dispara con el nombre de una aplicación a secas: «no tengo
-- WhatsApp, prefiero hablar por acá» tiene que pasar, y pasa. Hace falta que al
-- nombre lo acompañe un usuario, o una invitación a escribir por ahí.
--
-- Comprobado antes de escribir esta migración contra las dos listas de
-- `scripts/mensajes_de_contacto.mjs`: los trece mensajes que no pasan siguen sin
-- pasar y con la misma clave que antes, los trece que pasan siguen pasando, y se
-- agregaron a esas listas los casos nuevos de las dos clases.
--

INSERT INTO public.patrones_de_contacto (id, clave, patron, banderas, motivo, orden, activo) VALUES
  ('572eed74-1904-4fde-b964-a3dd49e49a8b',
   'usuario_de_otra_aplicacion',
   '@[A-Za-z0-9._]{3,30}',
   'gi',
   '{"es-AR": "Parece un nombre de usuario de otra aplicación.", "en": "This looks like a username on another application.", "pt-BR": "Parece um nome de usuário de outro aplicativo."}',
   6, true),

  ('f5691ece-ad62-454d-946d-02b1ba58ee9a',
   'enlace',
   '(?:https?://|www\.)[^\s]{2,}|\b[A-Za-z0-9-]{2,}\.(?:com|net|org|ar|br|me|io|app|link|ly|gl)\b',
   'gi',
   '{"es-AR": "Parece un enlace a otro sitio.", "en": "This looks like a link to another site.", "pt-BR": "Parece um link para outro site."}',
   7, true),

  ('cf0e4191-54c4-4880-a84f-9054cff80bf8',
   'usuario_en_otra_aplicacion',
   '\b(?:mi|el|su|tu)\s+(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b\s*(?:es|:)?\s*[A-Za-z0-9._@-]{3,}',
   'gi',
   '{"es-AR": "Parece un nombre de usuario de otra aplicación.", "en": "This looks like a username on another application.", "pt-BR": "Parece um nome de usuário de outro aplicativo."}',
   8, true),

  ('9b651f05-9327-4204-bed6-6336300c4d53',
   'invitacion_a_otra_aplicacion',
   '\b(?:busc.me|agreg.me|escrib.me|contact.me|habl.me|mand.me|llam.me|segu.me|pas.me)\b[^\n]{0,40}\b(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b|\b(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b[^\n]{0,40}\b(?:busc.me|agreg.me|escrib.me|contact.me|habl.me|mand.me|llam.me|segu.me|pas.me)\b',
   'gi',
   '{"es-AR": "Parece una invitación a seguir la conversación en otra aplicación.", "en": "This looks like an invitation to continue the conversation on another application.", "pt-BR": "Parece um convite para continuar a conversa em outro aplicativo."}',
   9, true);

NOTIFY pgrst, 'reload schema';
