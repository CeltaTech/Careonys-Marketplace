-- ---------------------------------------------------------------------------
-- 0066 — EL ÍNDICE QUE SOSTIENE EL AISLAMIENTO DEL DEPÓSITO LO DICE
--
-- Es la mitad del pendiente 115 que no depende de ninguna decisión.
--
-- En el depósito de archivos el camino es `<cuenta>/<archivo>`, y no
-- `<Organización>/<cuenta>/<archivo>` como pide la regla de la empresa. Las dos
-- políticas propias del legajo comparan la primera carpeta contra `auth.uid()`
-- (`0006_archivos_del_legajo.sql:52` y `:63`), así que cada cuenta llega a su
-- carpeta y a ninguna otra: hacia afuera no hay agujero hoy.
--
-- Lo que no estaba escrito en ningún lado es qué separa a una Prestadora de
-- otra. Es esto: **una cuenta tiene un solo legajo**, por el índice único
-- `idx_caregivers_user_unico` que creó `0005_acceso_por_sesion.sql:40`. La
-- tercera política —la que deja mirar al personal de la Prestadora
-- (`0006_archivos_del_legajo.sql:78`)— llega a la carpeta **por ese legajo**:
-- pide que exista un `caregivers` con esa cuenta y con la Prestadora de quien
-- mira. Si una misma cuenta tuviera legajo en dos Prestadoras —que es
-- exactamente a donde apunta un mercado—, las dos verían la carpeta entera, con
-- los papeles que la persona subió para la otra.
--
-- Es latente, no explotable hoy, y **silencioso**: el acoplamiento vive en una
-- migración distinta de la que crea el depósito, así que quien mañana saque ese
-- índice —para permitir el segundo legajo, que es una función razonable de
-- pedir— no tiene hoy cómo enterarse de que con eso abre el depósito.
--
-- Esta migración no decide nada: no mueve el camino, no reescribe ninguna
-- política y no toca ningún archivo ya subido. Sólo cuelga el aviso del clavo
-- donde se lo va a leer, que es el índice mismo. Si el día de mañana el camino
-- pasa a empezar por la Organización —la salida que el pendiente 115 deja
-- abierta—, este comentario se reemplaza en la migración que lo mueva.
-- ---------------------------------------------------------------------------

comment on index public.idx_caregivers_user_unico is
  'Una cuenta, un legajo. ATENCIÓN: de este índice depende además el aislamiento '
  'entre Prestadoras del depósito de archivos. El camino del depósito empieza por '
  'la cuenta y no por la Organización, así que la política «Documentos del legajo, '
  'para la Prestadora» (migración 0006) llega a la carpeta por el legajo: si una '
  'cuenta llegara a tener legajo en dos Prestadoras, las dos verían la carpeta '
  'entera. Antes de sacarlo hay que mover el camino a <Organización>/<cuenta>/, '
  'reescribir las tres políticas del depósito contra public.prestadora_actual() y '
  'mudar los archivos ya subidos. Está anotado en el pendiente 115.';


notify pgrst, 'reload schema';
