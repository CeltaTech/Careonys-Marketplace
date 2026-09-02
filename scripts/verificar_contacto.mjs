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

   Qué no mira: la puerta de verdad, que está del lado del servidor desde la
   migración 0063 y la prueba `scripts/probar_la_tercera_puerta.mjs` con una
   sesión y sin pasar por ninguna pantalla. Esto revisa el reconocedor del
   navegador, que es el que avisa antes de mandar.

   Y las dos listas de mensajes **no viven acá**: están en
   `scripts/mensajes_de_contacto.mjs`, porque las dos mitades de la puerta se
   prueban con las mismas. Dos listas separadas dejarían de coincidir sin que
   nadie se enterara.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { seRevisaron } from './recorrido.mjs';
import { NO_PASAN, PASAN } from './mensajes_de_contacto.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Contacto } = require(join(raiz, 'js', 'contacto.js'));
const reglas = JSON.parse(readFileSync(join(raiz, 'data', 'patrones-contacto.json'), 'utf8'));

const IDIOMAS = ['es-AR', 'en', 'pt-BR'];
seRevisaron((reglas.reglas || []).length, 'una sola regla en `data/patrones-contacto.json`');
seRevisaron(IDIOMAS.length, 'un solo idioma contra el que probar');


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

/* «i18n desde el día uno»: ningún texto visible nace en un solo idioma. */
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
