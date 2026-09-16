/* ===================================================
   LOS MENSAJES CON LOS QUE SE PRUEBA LA TERCERA PUERTA

   No es un guion: no hace nada al importarlo. Son las dos listas de mensajes
   escritas a mano, y viven acá porque las prueban **dos** cosas distintas y
   tienen que ser las mismas:

     · `scripts/verificar_contacto.mjs` — el reconocedor del navegador,
       `js/contacto.js`, sin base y sin sesión.
     · `scripts/probar_la_tercera_puerta.mjs` — la base, con una sesión de
       verdad y mandándole el mensaje a la tabla sin pasar por ninguna pantalla.

   Si cada una tuviera su lista, el día que las dos mitades dejaran de coincidir
   nadie se enteraría, que es exactamente lo que la puerta del servidor viene a
   evitar.

   POR QUÉ HAY DOS LISTAS Y NO UNA
   Una prueba que sólo tuviera la primera no probaría nada: un reconocedor que
   bloquee todo la pasa entera. La segunda es la que puede fallar, y es la que
   importa, porque el daño de este control no es dejar pasar un teléfono
   —eso se arregla agregando una regla— sino cortarle la conversación a un
   Asistente que dijo que cobra 3500 por hora y trabaja de 8 a 16.

   POR QUÉ CADA MENSAJE DICE EN QUÉ IDIOMA ESTÁ
   El reconocedor no mira el idioma de la pantalla: las reglas son palabras, y
   una palabra está en un idioma. Durante mucho tiempo estas dos listas
   estuvieron enteras en castellano y los chequeos las cruzaban contra los tres
   idiomas, que es lo que hacía parecer que estaban probados: el idioma sólo
   elegía con qué frase se avisaba, así que el reconocedor nunca vio una palabra
   en inglés ni en portugués. Diecisiete de veintiún equivalentes reales de los
   mensajes de abajo entraban enteros. Ahora cada renglón dice en qué idioma
   está escrito, y el chequeo se planta si a alguna de las dos listas le falta
   alguno de los tres.
=================================================== */

/** Los tres idiomas del producto, que son los tres en los que hay que
 *  reconocer un dato de contacto. */
export const IDIOMAS = ['es-AR', 'en', 'pt-BR'];

/* Cada uno con la clave que se espera que lo reconozca —si mañana el mensaje
   queda bloqueado por otra regla, el chequeo lo dice en vez de darlo por
   bueno— y con el idioma en el que está escrito. */
export const NO_PASAN = [
  ['Mi celular es 11 3000-1234', 'telefono', 'es-AR'],
  ['llamame al 1130001234 cuando puedas', 'telefono', 'es-AR'],
  ['+54 9 11 3000 1234', 'telefono', 'es-AR'],
  ['mi numero: 11.3000.1234', 'telefono', 'es-AR'],
  ['anotá uno uno tres cero cero cero uno dos tres cuatro', 'telefono_en_letras', 'es-AR'],
  ['escribime a maria.lopez@gmail.com', 'correo', 'es-AR'],
  ['mi correo es marialopez arroba gmail punto com', 'correo', 'es-AR'],
  ['mandame un mail a maria(at)hotmail.com', 'correo', 'es-AR'],
  ['vivo en la calle Rivadavia 4500', 'domicilio', 'es-AR'],
  ['paso por Av. Corrientes 1234', 'domicilio', 'es-AR'],
  ['es en el pasaje San Lorenzo 88', 'domicilio', 'es-AR'],
  ['tocá el timbre 12', 'domicilio_por_partes', 'es-AR'],
  ['depto 4 del fondo', 'domicilio_por_partes', 'es-AR'],
  ['te paso mi telegram: @cuidadoramaria', 'usuario_de_otra_aplicacion', 'es-AR'],
  ['soy @maria_cuida en todas las redes', 'usuario_de_otra_aplicacion', 'es-AR'],
  ['mi usuario de Instagram es @maria.lopez', 'correo', 'es-AR'],
  ['mirá mi perfil en https://ejemplo.com/maria', 'enlace', 'es-AR'],
  ['está todo explicado en www.ejemplo.com.ar', 'enlace', 'es-AR'],
  ['mi instagram es marialopezcuidados', 'usuario_en_otra_aplicacion', 'es-AR'],
  ['buscame en instagram como marialopezcuidados', 'invitacion_a_otra_aplicacion', 'es-AR'],
  ['escribime por whatsapp', 'invitacion_a_otra_aplicacion', 'es-AR'],

  ['call me at 11 3000-1234', 'telefono', 'en'],
  ['write down one one three zero zero zero one two three four', 'telefono_en_letras', 'en'],
  ['write me at maria.lopez@gmail.com', 'correo', 'en'],
  ['I live at Rivadavia street 4500', 'domicilio', 'en'],
  ['I am at 1234 Corrientes avenue', 'domicilio', 'en'],
  ['apartment 4 at the back', 'domicilio_por_partes', 'en'],
  ['ring doorbell 12', 'domicilio_por_partes', 'en'],
  ['my telegram: @mariacare', 'usuario_de_otra_aplicacion', 'en'],
  ['look at my profile at https://ejemplo.com/maria', 'enlace', 'en'],
  ['my instagram is marialopezcare', 'usuario_en_otra_aplicacion', 'en'],
  ['write me on whatsapp', 'invitacion_a_otra_aplicacion', 'en'],
  ['find me on instagram as marialopezcare', 'invitacion_a_otra_aplicacion', 'en'],

  ['me ligue no 11 3000-1234', 'telefono', 'pt-BR'],
  ['anote um um tres zero zero zero um dois tres quatro', 'telefono_en_letras', 'pt-BR'],
  ['me escreva para maria.lopez@gmail.com', 'correo', 'pt-BR'],
  ['moro na rua Rivadavia 4500', 'domicilio', 'pt-BR'],
  ['apartamento 4 nos fundos', 'domicilio_por_partes', 'pt-BR'],
  ['toque a campainha 12', 'domicilio_por_partes', 'pt-BR'],
  ['sou @maria_cuida em todas as redes', 'usuario_de_otra_aplicacion', 'pt-BR'],
  ['olhe meu perfil em www.exemplo.com.br', 'enlace', 'pt-BR'],
  ['meu instagram e marialopezcuidados', 'usuario_en_otra_aplicacion', 'pt-BR'],
  ['me procure no instagram como marialopezcuidados', 'invitacion_a_otra_aplicacion', 'pt-BR'],
  ['me escreva no whatsapp', 'invitacion_a_otra_aplicacion', 'pt-BR']
];

/* El decimosexto de la tanda castellana pide una aclaración, porque el que lo
   lea va a creer que está mal puesto: `@maria.lopez` **también** es exactamente
   lo que describe la regla del correo —algo, una arroba, algo, un punto, algo—,
   y esa regla va antes. Queda bloqueado igual, que es lo único que importa,
   pero lo nombra el correo. Está escrito así a propósito: el día que alguien
   cambie el orden de las reglas, este renglón lo dice en vez de dejarlo pasar. */

/* Todo lo que un Asistente y una Familia se dicen de verdad antes de contratar.
   Ninguno puede quedar bloqueado. */
export const PASAN = [
  ['Hola, buenas tardes. Vi su perfil en el directorio.', 'es-AR'],
  ['Tengo 45 años y trabajo hace 10 años en gerontología.', 'es-AR'],
  ['Cobro 3500 por hora, de 8 a 16 hs.', 'es-AR'],
  ['Puedo los martes y jueves, 4 horas por día.', 'es-AR'],
  ['Trabajé 3 años con una señora de 92 con Alzheimer.', 'es-AR'],
  ['El 25 de agosto puedo empezar, si le parece bien.', 'es-AR'],
  ['Tengo el curso de primeros auxilios aprobado.', 'es-AR'],
  ['Mi zona es Caballito y alrededores.', 'es-AR'],
  ['Puedo hacer 2 turnos, uno a la mañana y otro a la tarde.', 'es-AR'],
  ['¿La atención es para una persona sola o para dos?', 'es-AR'],
  ['Hice 120 horas de práctica en una residencia.', 'es-AR'],
  ['Somos 3 hermanos y nos turnamos los fines de semana.', 'es-AR'],
  ['Necesito cubrir de lunes a viernes, 6 horas.', 'es-AR'],
  ['No tengo WhatsApp, prefiero hablar por acá.', 'es-AR'],
  ['Prefiero coordinar todo por acá, que me queda más cómodo.', 'es-AR'],
  ['Seguimos hablando por este chat cuando usted pueda.', 'es-AR'],
  ['Le paso el detalle de las tareas mañana.', 'es-AR'],
  ['La señora se llama Ana y tiene 88 años.', 'es-AR'],

  ['Hello, good afternoon. I saw your profile in the directory.', 'en'],
  ['I am 45 years old and I have worked in geriatrics for 10 years.', 'en'],
  ['I charge 3500 per hour, from 8 to 16.', 'en'],
  ['I can do Tuesdays and Thursdays, 4 hours a day.', 'en'],
  ['I do not have WhatsApp, I prefer to talk here.', 'en'],
  ['I prefer to arrange everything here, it is easier for me.', 'en'],
  ['Let us keep talking on this chat whenever you can.', 'en'],
  ['I will send you the details of the tasks tomorrow.', 'en'],
  ['I did 120 hours of practice at a nursing home.', 'en'],
  ['The lady is called Ana and she is 88 years old.', 'en'],
  ['We are 3 siblings and we take turns on weekends.', 'en'],
  ['I clean the floor 2 times a week.', 'en'],
  ['I drive 30 minutes to get there.', 'en'],

  ['Olá, boa tarde. Vi o seu perfil no diretório.', 'pt-BR'],
  ['Tenho 45 anos e trabalho há 10 anos em gerontologia.', 'pt-BR'],
  ['Cobro 3500 por hora, das 8 às 16.', 'pt-BR'],
  ['Não tenho WhatsApp, prefiro conversar por aqui.', 'pt-BR'],
  ['Prefiro combinar tudo por aqui, fica mais fácil.', 'pt-BR'],
  ['Vamos seguir conversando por este chat quando você puder.', 'pt-BR'],
  ['Trabalhei 3 anos com uma senhora de 92 anos com Alzheimer.', 'pt-BR'],
  ['Preciso cobrir de segunda a sexta, 6 horas.', 'pt-BR'],
  ['Posso andar 20 minutos até lá.', 'pt-BR']
];

/* Los cinco últimos de la tanda castellana son la contracara de las reglas que
   reconocen una invitación, y son los que de verdad pueden fallar: nombrar una
   aplicación **no** es dar un dato de contacto, y decir «seguimos» o «le paso»
   no es invitar a nadie a irse a otro lado. Si alguna de esas reglas se afloja
   de más, estos cinco son los primeros que se caen.

   Y los tres últimos del inglés y el último del portugués están por el mismo
   motivo, contra las palabras que se agregaron para esos dos idiomas: limpiar
   el piso dos veces por semana, manejar treinta minutos y caminar veinte no son
   un domicilio. Son los renglones que dicen por qué «floor», «drive» y «andar»
   quedaron afuera de las reglas a propósito. */
