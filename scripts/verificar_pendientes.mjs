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
   cerrado el 26 de agosto de 2026 con la migración 0032. El rojo venía en
   realidad de otra cosa. **Una roja esperada contra un número que no existe es
   un permiso permanente para no mirar.**
   Ese mismo día aparecieron cuatro citas más del mismo tipo adentro de la propia
   lista de pendientes: el 68 reclamaba como agujero abierto lo que la migración
   0047 había tapado el 31 de agosto de 2026.

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
   · `docs/claude_history.md` y todo lo que lleve `historial` en el nombre, por lo
     mismo: es historial y no se corrige, se agrega.
   · Los archivos de `supabase/migrations/`, que **una vez aplicados no se editan
     jamás** —regla de la empresa—, así que su texto es historia por definición.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Tres veces, porque las tres pueden fallar:
   1. Se planta si no logró leer ni un pendiente abierto de `docs/PENDIENTES.md`
      —el día que esa tabla cambie de forma, este chequeo diría ✔ sin haber
      mirado nada— y si no logró encontrar ni una cita en todo el proyecto.
   2. Contra tres textos de mentira escritos acá mismo: uno que cita un pendiente
      cerrado sin decirlo tiene que ser señalado, uno que lo cita y aclara que se
      cerró tiene que pasar, y uno que cita un pendiente abierto tiene que pasar.
   3. Contra un número imposible: `pendiente 99999` no está abierto y no puede
      estarlo, así que si el detector no lo señala es que no está mirando.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaLista = join(raiz, 'docs', 'PENDIENTES.md');

/* Las filas de la lista empiezan con el número entre barras. Es la misma
   expresión que usa `scripts/probar_todo.mjs` para lo mismo, y por eso vive
   exportada acá: dos copias de esta lectura se despegan igual que se despegó la
   lista de funciones anónimas. */
export function pendientesAbiertos(texto) {
  return new Set([...texto.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) => Number(m[1])));
}

/* «pendiente 66», «pendientes 74 y 75», «pendientes 8, 42 y 67». */
const CITA = /\bpendientes?\b\s+(?:el\s+)?(\d+(?:\s*(?:,|y|\/|ni)\s*(?:el\s+)?\d+)*)/gi;

/* Lo que alcanza para que una cita a algo cerrado no sea un error. Se busca en
   la misma frase, no en el archivo entero: una nota de cierre tres párrafos más
   abajo no la lee quien está leyendo esta línea. */
const CIERRE = /cerrad|cerró|se cierra|se cerr|al cerrar|ya no existe|ya no está|resuelt|estuvo abierto|quedó atrás/i;
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

const EXTENSIONES = ['.md', '.mjs', '.js', ...EXTENSIONES_DE_PANTALLA, '.css', '.sql'];

/* Narran un momento con fecha, o son historia que no se corrige. El motivo de
   cada uno está en el encabezado. */
const NARRAN_UN_MOMENTO = (rel) => {
  const r = rel.split(sep).join('/');
  return (
    r === 'docs/ALCANCE.md' ||
    r.startsWith('docs/PLAN_') ||
    r.includes('historial') ||
    r.includes('claude_history') ||
    r.startsWith('supabase/migrations/')
  );
};

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
  ['un «fue» lejos de la cita', `fue un lío. Hoy esto es el pendiente ${CERRADO}`, 1],
  ['una lista donde uno solo está cerrado', `los pendientes ${ABIERTO} y ${CERRADO}`, 1]
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
const hallazgos = [];
let citas = 0;
let mirados = 0;

for (const ruta of hayArchivos(raiz, EXTENSIONES)) {
  const rel = relative(raiz, ruta);
  if (NARRAN_UN_MOMENTO(rel)) continue;
  if (rel === join('scripts', 'verificar_pendientes.mjs')) continue;
  mirados++;
  const { colgadas, cuantas } = citasColgadas(readFileSync(ruta, 'utf8'), abiertos);
  citas += cuantas;
  for (const c of colgadas) {
    const cual = c.texto === `pendiente ${c.numero}` ? '' : ` → el ${c.numero}`;
    hallazgos.push(`${rel.split(sep).join('/')}:${c.renglon}  «${c.texto}»${cual}`);
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
  `Pendientes verificados: ${citas} citas en ${mirados} archivos, ninguna hablando en presente ` +
  `de alguno de los que ya se cerraron (${abiertos.size} abiertos hoy).`
);
