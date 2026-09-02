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
=================================================== */

/* Cada uno con la clave que se espera que lo reconozca: si mañana el mensaje
   queda bloqueado por otra regla, el chequeo lo dice en vez de darlo por bueno. */
export const NO_PASAN = [
  ['Mi celular es 11 3000-1234', 'telefono'],
  ['llamame al 1130001234 cuando puedas', 'telefono'],
  ['+54 9 11 3000 1234', 'telefono'],
  ['mi numero: 11.3000.1234', 'telefono'],
  ['anotá uno uno tres cero cero cero uno dos tres cuatro', 'telefono_en_letras'],
  ['escribime a maria.lopez@gmail.com', 'correo'],
  ['mi correo es marialopez arroba gmail punto com', 'correo'],
  ['mandame un mail a maria(at)hotmail.com', 'correo'],
  ['vivo en la calle Rivadavia 4500', 'domicilio'],
  ['paso por Av. Corrientes 1234', 'domicilio'],
  ['es en el pasaje San Lorenzo 88', 'domicilio'],
  ['tocá el timbre 12', 'domicilio_por_partes'],
  ['depto 4 del fondo', 'domicilio_por_partes']
];

/* Todo lo que un Asistente y una Familia se dicen de verdad antes de contratar.
   Ninguno puede quedar bloqueado. */
export const PASAN = [
  'Hola, buenas tardes. Vi su perfil en el directorio.',
  'Tengo 45 años y trabajo hace 10 años en gerontología.',
  'Cobro 3500 por hora, de 8 a 16 hs.',
  'Puedo los martes y jueves, 4 horas por día.',
  'Trabajé 3 años con una señora de 92 con Alzheimer.',
  'El 25 de agosto puedo empezar, si le parece bien.',
  'Tengo el curso de primeros auxilios aprobado.',
  'Mi zona es Caballito y alrededores.',
  'Puedo hacer 2 turnos, uno a la mañana y otro a la tarde.',
  '¿La atención es para una persona sola o para dos?',
  'Hice 120 horas de práctica en una residencia.',
  'Somos 3 hermanos y nos turnamos los fines de semana.',
  'Necesito cubrir de lunes a viernes, 6 horas.'
];
