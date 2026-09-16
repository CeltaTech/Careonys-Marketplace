--
-- 0009 — El chat reconocía los datos de contacto sólo en castellano
--
-- Qué pasaba: las nueve reglas de la tercera puerta están escritas con palabras
-- castellanas —«calle», «depto», «timbre», «mi instagram», «buscame»— y el
-- producto se usa en tres idiomas desde el día uno. Un mensaje que en castellano
-- queda bloqueado, escrito en inglés o en portugués entraba entero:
--
--     «my instagram is marialopezcare»        pasaba
--     «write me on whatsapp»                  pasaba
--     «I live at Rivadavia street 4500»       pasaba
--     «apartment 4 at the back»               pasaba
--     «meu instagram e marialopezcuidados»    pasaba
--     «toque a campainha 12»                  pasaba
--
-- De veintiún equivalentes reales de los mensajes que el castellano sí bloquea,
-- pasaban diecisiete. Y el dato de contacto es lo que el Marketplace vende: cada
-- uno que se escapa por el chat es una venta que no ocurre.
--
-- Por qué nadie lo vio: los treinta y nueve mensajes con los que se prueba esta
-- puerta estaban todos escritos en castellano. El chequeo los cruzaba contra los
-- tres idiomas, pero el idioma sólo elige con qué frase se avisa, así que el
-- reconocedor nunca vio una palabra en inglés ni en portugués y el chequeo
-- terminaba en verde diciendo «117 mensajes en 3 idiomas». Junto con esta
-- migración se agregan a las dos listas los mensajes de los otros dos idiomas.
--
-- Cómo se eligió cada palabra. El daño de este control no es dejar pasar un
-- teléfono —eso se arregla agregando una regla— sino cortarle la conversación a
-- un Asistente que está diciendo lo que cobra y cuándo puede. Por eso quedaron
-- afuera, a propósito, tres palabras que sí serían direcciones y que rompen
-- conversaciones normales: «floor», porque «I clean the floor 2 times a week» no
-- es un piso; «andar», porque «posso andar 20 minutos» tampoco; y «drive», «st»
-- y «dr», porque «I drive 30 minutes» y «el Dr. Gómez 3 años» tampoco.
--
-- Las reglas de 0002 y de 0004 no se editan —una migración aplicada no se toca
-- nunca—: se corrigen desde acá, con los patrones enteros, que es como los
-- guarda la tabla.
--
-- Comprobado antes de escribir esta migración contra las dos listas de
-- `scripts/mensajes_de_contacto.mjs`, ya ampliadas: los 44 mensajes que no
-- pasan quedan bloqueados y por la misma regla que se espera, y los 40
-- legítimos —trece en inglés y nueve en portugués— pasan.
--

UPDATE public.patrones_de_contacto SET patron =
  '(?:\b(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|zero|one|two|three|four|five|six|seven|eight|nine|oh|um|uma|dois|duas|três|sete|oito|nove)\b[ ,.\-]*){7,}'
  WHERE clave = 'telefono_en_letras';

UPDATE public.patrones_de_contacto SET patron =
  '\b(?:calle|avenida|av|avda|pasaje|psje|diagonal|rua|travessa|alameda|estrada|rodovia|street|avenue|road|boulevard)\b\.? ?[A-Za-zÀ-ÿ'' ]{0,24}?\d{1,5}\b|\b\d{1,5} ?[A-Za-zÀ-ÿ'' ]{0,24}?\b(?:street|avenue|road|boulevard)\b'
  WHERE clave = 'domicilio';

UPDATE public.patrones_de_contacto SET patron =
  '\b(?:piso|depto|dpto|departamento|timbre|altura|apartamento|apto|bloco|campainha|apartment|apt|flat|unit|suite|doorbell|buzzer)\b\.? ?\d{1,5}\b'
  WHERE clave = 'domicilio_por_partes';

UPDATE public.patrones_de_contacto SET patron =
  '\b(?:mi|el|su|tu|my|your|his|her|meu|minha|seu|sua)\s+(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b\s*(?:es|is|é|e|:)?\s*[A-Za-z0-9._@-]{3,}'
  WHERE clave = 'usuario_en_otra_aplicacion';

UPDATE public.patrones_de_contacto SET patron =
  '\b(?:busc.me|agreg.me|escrib.me|contact.me|habl.me|mand.me|llam.me|segu.me|pas.me|write|text|message|find|add|follow|contact|reach|dm|ping|escreva|escreve|procure|procura|adicione|adiciona|siga|segue|chame|chama|fale|fala|mande|manda|ligue|liga)\b[^\n]{0,40}\b(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b|\b(?:instagram|insta|ig|telegram|telegran|whatsapp|whatsap|wasap|wsp|wpp|messenger|facebook|face|tiktok|snapchat|skype|signal|discord|linkedin|zoom|meet)\b[^\n]{0,40}\b(?:busc.me|agreg.me|escrib.me|contact.me|habl.me|mand.me|llam.me|segu.me|pas.me|write|text|message|find|add|follow|contact|reach|dm|ping|escreva|escreve|procure|procura|adicione|adiciona|siga|segue|chame|chama|fale|fala|mande|manda|ligue|liga)\b'
  WHERE clave = 'invitacion_a_otra_aplicacion';

NOTIFY pgrst, 'reload schema';
