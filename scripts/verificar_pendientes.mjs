/* ===================================================
   NINGÚN ARCHIVO VIVO CITA UN PENDIENTE CERRADO COMO SI ESTUVIERA ABIERTO

       node scripts/verificar_pendientes.mjs

   Falla —con código de salida 1— cuando un archivo del proyecto nombra
   «pendiente N» y ese N ya no es una fila abierta de `docs/PENDIENTES.md`, salvo
   que ahí mismo diga que está cerrado.

   POR QUÉ EXISTE
   El 31 de agosto de 2026 se descubrió que `scripts/probar_permisos_en_vivo.mjs`
   estaba en rojo desde hacía cinco días y nadie lo había mirado, porque su
   encabezado decía que el rojo era el pendiente 67 y el pendiente 67 se había
   cerrado el 26 de agosto de 2026. El rojo venía en
   realidad de otra cosa. **Una roja esperada contra un número que no existe es
   un permiso permanente para no mirar.**
   Ese mismo día aparecieron cuatro citas más del mismo tipo adentro de la propia
   lista de pendientes: el 68 reclamaba como agujero abierto lo que ya se
   había tapado el 31 de agosto de 2026.

   QUÉ CUENTA COMO ARREGLADO
   No hace falta borrar la cita: casi siempre conviene dejarla, porque explica de
   dónde salió una decisión. Lo que hace falta es que **el texto diga que está
   cerrado** —«fue el pendiente 8, cerrado», «la migración que cerró el pendiente
   66»— dentro de la misma frase. Las palabras que valen están en `CIERRE`.
   **Y alcanza con el tiempo verbal**: «eran el pendiente 15» dice lo mismo, y es
   como ya estaba escrita la mitad de las citas del código. Eso se busca pegado a
   la cita y no en toda la frase; el motivo está al lado de `PASADO`.

   QUÉ QUEDA AFUERA, Y POR QUÉ
   · `docs/ALCANCE.md` y los `docs/PLAN_*.md` **narran un momento con fecha**: se
     escribieron el día que se escribieron y cuentan qué se sabía entonces.
     Pedirles que hablen del futuro los convierte en documentos que hay que
     reescribir cada vez que se cierra algo. Medido el 31 de agosto de 2026:
     `ALCANCE.md` tiene 122 citas, 66 apuntando a pendientes cerrados y 46 de
     ellas sin palabra de cierre. Ninguna es un error.
   · Los archivos de `supabase/migrations/`, que **una vez aplicados no se editan
     jamás** —regla de la empresa—, así que su texto es historia por definición.

   QUÉ ABRE
   Todo archivo de texto del proyecto, sin lista de extensiones de por medio: el
   mismo recorrido que usan los dos chequeos hermanos que leen citas, escrito una
   sola vez en `scripts/citas.mjs`. Una cita se escribe en cualquier cosa que
   alguien lea.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Cuatro veces, porque las cuatro pueden fallar:
   1. Se planta si no logró leer ni un pendiente abierto de `docs/PENDIENTES.md`
      —el día que esa tabla cambie de forma, este chequeo diría ✔ sin haber
      mirado nada— y si no logró encontrar ni una cita en todo el proyecto.
   2. Contra tres textos de mentira escritos acá mismo: uno que cita un pendiente
      cerrado sin decirlo tiene que ser señalado, uno que lo cita y aclara que se
      cerró tiene que pasar, y uno que cita un pendiente abierto tiene que pasar.
   3. Contra un número imposible: `pendiente 99999` no está abierto y no puede
      estarlo, así que si el detector no lo señala es que no está mirando.
   4. Contra el propio corpus, que es lo único que las otras tres no tocan: se
      exige que el recorrido traiga archivos de texto sin extensión de código.
      Por ahí fue la ceguera que tuvo.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';

import { seRevisaron } from './recorrido.mjs';
import { documentosConCitas } from './citas.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaLista = join(raiz, 'docs', 'PENDIENTES.md');

/* Las filas de la lista empiezan con el número entre barras. `scripts/probar_todo.mjs`
   lee lo mismo, para comprobar que cada roja esperada apunta a un pendiente que
   sigue abierto, y la lee desde acá: una sola expresión, en un solo lugar, igual
   que la lista de funciones anónimas. Que se pueda importar es parte de eso, y
   por eso lo que este chequeo hace cuando se lo corre a mano está abajo, adentro
   de su guarda: sin ella, pedirle esta función significaba recorrer el proyecto
   entero, y un rojo de acá mataba a quien la hubiera pedido. */
export function pendientesAbiertos(texto) {
  return new Set([...texto.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) => Number(m[1])));
}

/* «pendiente 66», «pendientes 74 y 75», «pendientes 8, 42 y 67». Y el número
   puede venir resaltado —`pendiente **75**`, `el pendiente `75``—, que es como
   está escrito en cinco lugares: quien escribe un documento resalta el número
   para que se vea, y la forma sin resaltar era la única que este chequeo
   reconocía. */
const CITA =
  /\bpendientes?\b[\s*_`]+(?:el\s+)?[*_`]*(\d+(?:\s*(?:,|y|\/|ni)\s*(?:el\s+)?[*_`]*\d+)*)/gi;

/* Lo que alcanza para que una cita a algo cerrado no sea un error. Se busca en
   la misma frase, no en el archivo entero: una nota de cierre tres párrafos más
   abajo no la lee quien está leyendo esta línea.

   Van las formas del pasado y ninguna del futuro: `cerraron` se agregó el 31 de
   agosto de 2026 porque «las clases que cerraron el pendiente 8» salió en rojo
   siendo una cita bien escrita. `cerrará` no entra a propósito —«esto cerrará
   el pendiente N» habla de uno que sigue abierto—, y por eso no se pone el
   verbo entero. */
const CIERRE = /cerrad|cerró|cerraron|se cierra|se cerr|al cerrar|ya no existe|ya no está|resuelt|estuvo abierto|quedó atrás/i;
const VENTANA = 220;

/* Antes de buscar cualquiera de las dos cosas se aplana el texto: los espacios,
   los saltos de renglón y las marcas de comentario —`//`, `*`, `#`, `>`— pasan a
   ser un espacio solo. Sin esto, «el pendiente 101 estuvo» / «// abierto por
   eso» no se reconoce, y la mitad de las citas del código están partidas así. */
const aplanar = (t) => t.replace(/[\s*\/#>|-]+/g, ' ');

/* Y alcanza también con el tiempo verbal, que es como está escrita la mitad de
   las citas del código: «eran el pendiente 15», «era el pendiente 23». Dice lo
   mismo sin nombrar una fecha. Pero esto se busca **pegado** a la cita —60
   caracteres antes y nada más—, porque un «fue» suelto tres renglones más arriba
   no habla de este número y dejaría pasar cualquier cosa. */
const PASADO = /\b(era|eran|fue|fueron)\s+(el|la|los|las)?\s*$/i;
const PEGADO = 60;

/* Una cita a un pendiente la escribe una persona, y una persona escribe en
   cualquier archivo del proyecto que no sea una imagen. La lista de antes
   —documentos, guiones, hojas de estilo, pantallas y migraciones— conocía el
   mundo de los archivos sueltos y nada más: dejaba afuera `data/` entera, que es
   donde viven los catálogos con la prosa que explica por qué existe cada uno, y
   también la configuración de la base y la única función que corre en el
   servidor. Tres citas colgadas vivían justamente ahí.

   Después pasó a la lista de extensiones de código de `recorrido.mjs` más cuatro
   formas escritas a mano, y seguía siendo una lista: dejaba afuera los seis
   archivos que no tienen extensión de código y los escribe alguien igual —los dos
   enganches del control de versiones y las cuatro listas de lo que no se sube—.
   Adentro había una cita de verdad, en el renglón 26 de `.vercelignore`.

   Ahora no hay lista de ninguna clase: el corpus es el mismo que usan los dos
   chequeos hermanos que leen citas, y está escrito una sola vez, en `citas.mjs`.
   Una cita se escribe en cualquier cosa que alguien lea, y eso es todo lo que no
   sea una imagen ni un binario. Las migraciones quedan afuera de aquel recorrido
   por el mismo motivo por el que estaban acá: una migración aplicada no se edita
   jamás, así que una cita suya no se puede arreglar. */

/* Narran un momento con fecha, o son historia que no se corrige. El motivo de
   cada uno está en el encabezado. */
const NARRAN_UN_MOMENTO = (rel) => (
  rel === 'docs/ALCANCE.md' ||
  rel.startsWith('docs/PLAN_')
);

/** Devuelve las citas colgadas de un texto: cerradas y sin decir que lo están. */
export function citasColgadas(texto, abiertos) {
  const colgadas = [];
  let cuantas = 0;
  for (const hallazgo of texto.matchAll(CITA)) {
    const numeros = hallazgo[1].split(/\D+/).filter(Boolean).map(Number);
    const desde = Math.max(0, hallazgo.index - VENTANA);
    const hasta = hallazgo.index + hallazgo[0].length + VENTANA;
    const alrededor = aplanar(texto.slice(desde, hasta));
    const pegado = aplanar(texto.slice(Math.max(0, hallazgo.index - PEGADO), hallazgo.index));
    for (const n of numeros) {
      cuantas++;
      if (abiertos.has(n)) continue;
      if (CIERRE.test(alrededor)) continue;
      if (PASADO.test(pegado)) continue;
      const renglon = texto.slice(0, hallazgo.index).split('\n').length;
      colgadas.push({ numero: n, renglon, texto: hallazgo[0].replace(/\s+/g, ' ') });
    }
  }
  return { colgadas, cuantas };
}

// Solo revisa el proyecto cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const abiertos = pendientesAbiertos(readFileSync(rutaLista, 'utf8'));
  if (abiertos.size === 0) {
    console.error(
      'No se pudo leer ningún pendiente abierto de docs/PENDIENTES.md.\n' +
      'Sin eso este chequeo diría que está todo bien sin haber mirado nada.\n' +
      'Suele ser que la tabla cambió de forma y hay que ponerla al día acá.'
    );
    process.exit(1);
  }

  /* ── Las tres pruebas del propio detector, antes de mirar el proyecto ────── */
  const ABIERTO = [...abiertos][0];
  const CERRADO = 99999;
  const PRUEBAS = [
    ['una cita a un pendiente cerrado sin decirlo', `esto es el pendiente ${CERRADO} y sigue abierto`, 1],
    ['una cita a un pendiente cerrado que lo aclara', `fue el pendiente ${CERRADO}, cerrado el martes`, 0],
    ['una cita a un pendiente abierto', `esto lo traba el pendiente ${ABIERTO}`, 0],
    ['una cita en pasado', `eran el pendiente ${CERRADO}, y se arreglaron`, 0],
    ['una cita en pasado y en plural', `las clases que cerraron el pendiente ${CERRADO}`, 0],
    ['una cita en futuro', `esto cerrará el pendiente ${CERRADO} algún día`, 1],
    ['un «fue» lejos de la cita', `fue un lío. Hoy esto es el pendiente ${CERRADO}`, 1],
    ['una lista donde uno solo está cerrado', `los pendientes ${ABIERTO} y ${CERRADO}`, 1],
    ['una cita con el número en negrita', `esto es el pendiente **${CERRADO}** y sigue abierto`, 1],
    ['una cita con el número resaltado', 'esto es el pendiente `' + CERRADO + '` y sigue abierto', 1],
    ['una cita en negrita a un pendiente abierto', `esto lo traba el pendiente **${ABIERTO}**`, 0]
  ];
  for (const [que, texto, esperadas] of PRUEBAS) {
    const { colgadas } = citasColgadas(texto, abiertos);
    if (colgadas.length !== esperadas) {
      console.error(
        `El detector de este chequeo está roto: con ${que} devolvió ${colgadas.length}\n` +
        `hallazgo(s) y tenía que devolver ${esperadas}. No se revisó el proyecto.`
      );
      process.exit(1);
    }
  }

  /* ── El proyecto ─────────────────────────────────────────────────────────── */
  /* La cuarta prueba, y es del corpus y no del detector. La ceguera que este
     chequeo tuvo no estaba en lo que sabía reconocer sino en lo que abría: su
     lista de extensiones dejaba afuera los seis archivos de texto que no tienen
     ninguna —los dos enganches del control de versiones y las cuatro listas de
     lo que no se sube—, y adentro de uno había una cita viva. Si el corpus
     vuelve a ser una lista de extensiones, esto se pone en rojo. */
  const documentos = documentosConCitas(raiz);
  const sinExtension = documentos.filter((rel) => !basename(rel).includes('.', 1));
  if (!sinExtension.length) {
    console.error(
      'El recorrido no trajo ni un archivo de texto sin extensión de código.\n' +
      'Este chequeo ya fue ciego así una vez: había una cita viva en un archivo\n' +
      'que ninguna lista de extensiones abría. Si el corpus volvió a ser una\n' +
      'lista, hay que devolverlo a `documentosConCitas`, de scripts/citas.mjs.'
    );
    process.exit(1);
  }

  const hallazgos = [];
  let citas = 0;
  let mirados = 0;
  let conCitas = 0;

  for (const rel of documentos) {
    if (NARRAN_UN_MOMENTO(rel)) continue;
    if (rel === 'scripts/verificar_pendientes.mjs') continue;
    mirados++;
    const { colgadas, cuantas } = citasColgadas(
      readFileSync(join(raiz, rel), 'utf8'), abiertos);
    citas += cuantas;
    if (cuantas) conCitas++;
    for (const c of colgadas) {
      const cual = c.texto === `pendiente ${c.numero}` ? '' : ` → el ${c.numero}`;
      hallazgos.push(`${rel}:${c.renglon}  «${c.texto}»${cual}`);
    }
  }

  seRevisaron(citas, 'ni una sola cita a un pendiente en todo el proyecto');

  if (hallazgos.length) {
    console.error(
      `\n${hallazgos.length} cita(s) hablan de un pendiente que ya no está abierto:\n\n  ` +
      hallazgos.join('\n  ') +
      '\n\nO el pendiente sigue vivo y falta su fila en docs/PENDIENTES.md, o se cerró\n' +
      'y el texto tiene que decirlo —«fue el pendiente N, cerrado», «la migración que\n' +
      'cerró el pendiente N»—. Dejar la cita está bien; dejarla en presente, no: quien\n' +
      'la lee sale a buscar un número que no existe, o peor, le cree.\n'
    );
    process.exit(1);
  }

  console.log(
    `Pendientes verificados: ${citas} citas, repartidas en ${conCitas} de los ${mirados} ` +
    `archivos del proyecto que se recorren, ninguna hablando en presente de alguno ` +
    `de los que ya se cerraron (${abiertos.size} abiertos hoy).`
  );
}
