/* ===================================================
   LAS REGLAS DEL CHAT NO SE DESPEGARON DE LA BASE

       node scripts/verificar_patrones_contacto.mjs

   Las reglas con las que se reconoce un dato de contacto viven en la tabla
   `patrones_de_contacto` (`supabase/migrations/0001_base_del_esquema.sql:2928`),
   y `data/patrones-contacto.json` es
   una copia generada, que existe sólo porque el reconocedor del navegador tiene
   que poder avisar sin conexión.

   Una copia que nadie compara vuelve a ser una segunda verdad en cuanto alguien
   edita una de las dos. Y acá el daño es peor que en un catálogo de opciones: el
   que se despega en silencio es el lado que la persona ve, así que el aviso
   diría una cosa —«esto no se puede mandar»— y el servidor haría otra, o al
   revés, que es todavía peor: mandar sin aviso y que el mensaje se pierda.

   Mira dos cosas, y son distintas a propósito:

     1. **Lo que se puede comprobar siempre**, con base o sin ella: que cada
        regla tenga la forma que exige la tabla —clave, expresión que
        compila, banderas conocidas, motivo en los tres idiomas—, que ninguna use
        algo que Postgres no entiende, y que el aviso esté en los tres idiomas.
        Estas comprobaciones fallan de verdad, y fallan sin conexión.

     2. **Lo que sólo se puede comprobar con la base delante**: que las reglas
        del archivo sean las de la tabla. Si la base no contesta, esto **no pasa:
        queda sin hacer**, y el último renglón lo dice con todas las letras.

   Qué no mira: si las reglas reconocen lo que tienen que reconocer. De eso se
   ocupan `verificar_contacto.mjs`, contra el reconocedor del navegador, y
   `scripts/probar_la_tercera_puerta.mjs`, contra la base y con una sesión de
   verdad. Los tres usan los mismos mensajes, que están en
   `scripts/mensajes_de_contacto.mjs`.
=================================================== */

import { traerDeLaBase, leerElArchivo, armar, diferencias, ARCHIVO } from './generar_patrones_contacto.mjs';
import { seRevisaron } from './recorrido.mjs';

const IDIOMAS = ['es-AR', 'en', 'pt-BR'];

/* Lo que Postgres no sabe traducir. Es la misma lista que la restricción
   `el_patron_lo_entienden_los_dos_lados`
   (`supabase/migrations/0001_base_del_esquema.sql:2939`), y está acá para
   que el problema se vea al escribir la regla y no al aplicar la migración:
   `\B`, las referencias hacia atrás `\1`..`\9` y los cuatro miradores
   `(?=`, `(?!`, `(?<=`, `(?<!`. */
const NO_LO_ENTIENDEN_LOS_DOS = [
  [/\\B/, 'usa \\B, que Postgres no tiene'],
  [/\\[1-9]/, 'usa una referencia hacia atrás, que Postgres escribe distinto'],
  [/\(\?[=!<]/, 'usa un mirador, que Postgres no tiene']
];

const problemas = [];
const { datos } = leerElArchivo();
const reglas = datos.reglas || [];
const vistas = new Set();

for (const regla of reglas) {
  const clave = regla && regla.clave;
  if (typeof clave !== 'string' || !/^[a-z][a-z0-9_]*$/.test(clave)) {
    problemas.push(`Una regla no tiene clave, o su clave no tiene la forma de una clave guardada: «${clave}».`);
    continue;
  }
  if (vistas.has(clave)) problemas.push(`La regla «${clave}» aparece dos veces.`);
  vistas.add(clave);

  if (typeof regla.patron !== 'string' || regla.patron.trim() === '') {
    problemas.push(`La regla «${clave}» no tiene expresión.`);
  } else {
    try {
      new RegExp(regla.patron);
    } catch (e) {
      problemas.push(`La expresión de «${clave}» no compila en el navegador: ${e.message}`);
    }
    for (const [busca, porQue] of NO_LO_ENTIENDEN_LOS_DOS) {
      if (busca.test(regla.patron)) {
        problemas.push(`La expresión de «${clave}» ${porQue}, así que el servidor no la puede aplicar.`);
      }
    }
  }

  if (typeof regla.banderas !== 'string' || !/^[gi]*$/.test(regla.banderas)) {
    problemas.push(`Las banderas de «${clave}» no son las conocidas: sólo «g» e «i».`);
  }

  for (const idioma of IDIOMAS) {
    const texto = (regla.motivo || {})[idioma];
    if (typeof texto !== 'string' || texto.trim() === '') {
      problemas.push(`Al motivo de «${clave}» le falta el idioma ${idioma}.`);
    }
  }
}

for (const idioma of IDIOMAS) {
  const texto = (datos.aviso || {})[idioma];
  if (typeof texto !== 'string' || texto.trim() === '') {
    problemas.push(`Al aviso del archivo le falta el idioma ${idioma}.`);
  }
}

// ── El archivo contra la base ──────────────────────────────────────────────
const { reglas: deLaBase, servidor, motivo } = await traerDeLaBase();
if (deLaBase) {
  problemas.push(...diferencias(armar(deLaBase, datos), datos));
}

/* Lo que se cuenta sale de un archivo, no de un recorrido de carpetas, así que
   el corpus vacío no se nota solo: un archivo sin reglas recorre cero veces el
   bucle de arriba, no junta ningún problema, y este chequeo escribiría su ✔ sin
   haber mirado una sola regla —con la puerta del navegador abierta de par en
   par—. */
seRevisaron(reglas.length, 'ni una regla en ' + ARCHIVO);

if (problemas.length) {
  console.error('\n' + problemas.join('\n') +
    '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
    '    node scripts/generar_patrones_contacto.mjs --escribir\n');
  process.exit(1);
}

if (deLaBase) {
  console.log(`Reglas del chat verificadas: ${reglas.length}, iguales a las de ${servidor}.`);
} else {
  console.log(`Reglas del chat: ${reglas.length} con la forma correcta. SIN COMPROBAR contra ${servidor} (${motivo}).`);
}
