/* ===================================================
   EL CHAT NO DEJA PASAR DATOS DE CONTACTO

       node scripts/verificar_contacto.mjs

   Corre `Contacto.revisarCon()` —el mismo código que corre la pantalla, no una
   copia— contra dos listas de mensajes escritas a mano: los que **tienen** que
   quedar bloqueados y los que **tienen** que pasar.

   POR QUÉ HAY DOS LISTAS Y NO UNA
   Una prueba que sólo tuviera la primera no probaría nada: un reconocedor que
   bloquee todo la pasa entera. La segunda lista es la que puede fallar, y es la
   que importa, porque el daño de este control no es dejar pasar un teléfono
   —eso ya está anotado como pendiente— sino cortarle la conversación a un
   Asistente que dijo que cobra 3500 por hora y trabaja de 8 a 16.

   Qué no mira: si el control existe del lado del servidor, que es donde tendría
   que estar. Hoy no existe y no puede: la tabla del chat todavía no se decidió
   (pendiente 62). Esto revisa el reconocedor, no la puerta.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Contacto } = require(join(raiz, 'js', 'contacto.js'));
const reglas = JSON.parse(readFileSync(join(raiz, 'data', 'patrones-contacto.json'), 'utf8'));

const IDIOMAS = ['es-AR', 'en', 'pt-BR'];
seRevisaron((reglas.reglas || []).length, 'una sola regla en `data/patrones-contacto.json`');
seRevisaron(IDIOMAS.length, 'un solo idioma contra el que probar');

/* Cada uno con la clave que se espera que lo reconozca: si mañana el mensaje
   queda bloqueado por otra regla, el chequeo lo dice en vez de darlo por bueno. */
const NO_PASAN = [
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
const PASAN = [
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

const fallas = [];

for (const idioma of IDIOMAS) {
  for (const [texto, claveEsperada] of NO_PASAN) {
    const revision = Contacto.revisarCon(reglas, texto, idioma);
    if (revision.pasa) {
      fallas.push(`[${idioma}] tendría que quedar bloqueado y pasó: ${JSON.stringify(texto)}`);
      continue;
    }
    if (!revision.motivos.some((m) => m.clave === claveEsperada)) {
      fallas.push(`[${idioma}] quedó bloqueado por otra regla que la esperada (${claveEsperada}): `
        + `${JSON.stringify(texto)} -> ${revision.motivos.map((m) => m.clave).join(', ')}`);
    }
    if (!revision.aviso) {
      fallas.push(`[${idioma}] quedó bloqueado sin decir por qué: ${JSON.stringify(texto)}`);
    }
  }

  for (const texto of PASAN) {
    const revision = Contacto.revisarCon(reglas, texto, idioma);
    if (!revision.pasa) {
      fallas.push(`[${idioma}] tendría que pasar y quedó bloqueado por `
        + `${revision.motivos.map((m) => m.clave).join(', ')}: ${JSON.stringify(texto)}`);
    }
  }
}

/* «multiidioma desde el día uno»: ningún texto visible nace en un solo idioma. */
for (const idioma of IDIOMAS) {
  if (!reglas.aviso || !reglas.aviso[idioma]) {
    fallas.push(`El aviso del chat no está en ${idioma}.`);
  }
  for (const regla of reglas.reglas || []) {
    if (!regla.motivo || !regla.motivo[idioma]) {
      fallas.push(`El motivo de la regla «${regla.clave}» no está en ${idioma}.`);
    }
  }
}

if (fallas.length > 0) {
  console.error('El chat no está cerrando la tercera puerta como debería:\n');
  fallas.forEach((f) => console.error('  - ' + f));
  console.error('\nLas reglas están en data/patrones-contacto.json.');
  process.exit(1);
}

const cuenta = (NO_PASAN.length + PASAN.length) * IDIOMAS.length;
console.log(`Contacto: ${cuenta} mensajes revisados `
  + `(${NO_PASAN.length} que no pasan y ${PASAN.length} que sí, en ${IDIOMAS.length} idiomas), `
  + `contra ${(reglas.reglas || []).length} reglas.`);
