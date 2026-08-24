/* ===================================================
   VERIFICA QUE EL TEXTO VISIBLE NO TUTEE A QUIEN LO LEE

   Falla —con código de salida 1— si en el texto que ve una persona aparece
   voseo, un pronombre de segunda persona informal o un imperativo con el
   pronombre pegado atrás.

       node scripts/verificar_trato.mjs

   Por qué existe: la regla 5.1 de `CLAUDE.md` pide forma impersonal primero y
   *usted* cuando haya que dirigirse a alguien. Se limpiaron catorce pantallas el
   24 de agosto de 2026, y eso es una foto: la pantalla número quince la escribe
   alguien que no leyó la regla. Una regla que no se verifica sola no es una regla.

   Qué mira:
   - el texto entre etiquetas de cada `.html`, sin los comentarios ni el `<style>`;
   - los atributos que se leen en pantalla (`placeholder`, `title`, `alt`,
     `aria-label`, `value`, `content`, `label`);
   - las cadenas de texto de los bloques `<script>`, de los archivos de `js/` y
     del catálogo de `data/`, porque de ahí sale lo que la pantalla muestra.

   Qué NO mira, y hay que leer con ojos: **el imperativo en tú sin acento.**
   «Descarga la aplicación» tutea y «El sistema descarga el archivo» no, y las
   dos se escriben igual. Distinguirlas necesita entender la frase, así que este
   chequeo no lo intenta: prefiere no avisar nunca antes que avisar en falso
   tantas veces que alguien lo apague.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { archivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: el trato se revisa en el texto que ve una persona, y ahí no hay ninguno. */
const AJENAS = ['docs', 'supabase', 'scripts', 'assets'];

/* Sólo formas que no pueden ser otra cosa. Las ambiguas —«completa», «carga»,
   «agenda», «entrevista»— son terceras personas legítimas en casi todos los
   casos, y meterlas acá llena la salida de avisos falsos. */
const VOSEO = [
  // Presente: la vocal acentuada al final no existe en tercera persona.
  'pod[eé]s', 'ten[eé]s', 'quer[eé]s', 'necesit[aá]s', 'sab[eé]s', 'complet[aá]s',
  'registr[aá]s', 'suscrib[ií]s', 'deb[eé]s', 'hac[eé]s', 'ven[ií]s', 'sos', 'estás',
  // Futuro y pasado en segunda persona.
  'aprender[aá]s', 'recibir[aá]s', 'podr[aá]s', 'tendr[aá]s', 'ser[aá]s', 'ver[aá]s',
  'quisieras', 'olvidaste', 'hiciste', 'elegiste', 'quisiste',
  // Imperativo de voseo: siempre lleva acento en la última vocal.
  'elegí', 'completá', 'buscá', 'encontrá', 'mejorá', 'ingresá', 'publicá',
  'entrevistá', 'solicitá', 'evaluá', 'organizá', 'gestioná', 'conseguí', 'acordá',
  'descargá', 'aprendé', 'accedé', 'verificá', 'fichá', 'creá', 'cargá', 'describí',
  'seleccioná', 'contactá', 'mirá', 'recordá', 'revisá', 'enviá', 'probá', 'dejá',
  'escribí', 'seguí', 'pedí', 'conocé', 'descubrí', 'empezá', 'presentá', 'sumá',
  'anotá', 'compartí', 'presioná', 'tocá', 'habilitá', 'agendá', 'confirmá', 'aceptá',
  'andá', 'poné', 'sacá', 'llamá', 'mandá', 'usá', 'guardá',
  // Imperativo con el pronombre pegado atrás.
  'conectate', 'sumate', 'registrate', 'postulate', 'inscribite', 'contactate',
  'fijate', 'acordate', 'quedate', 'contanos', 'dejanos', 'escribinos', 'llamanos',
  'regístrate', 'contáctanos', 'cuéntanos', 'suscríbete', 'únete', 'inscríbete',
  'déjanos', 'escríbenos', 'llámanos', 'conócenos', 'postúlate', 'súmate',
  // Infinitivo con el pronombre pegado atrás.
  'asistirte', 'ayudarte', 'guiarte', 'contactarte', 'acompañarte', 'mostrarte',
  'enviarte', 'darte', 'ofrecerte', 'avisarte', 'llamarte', 'buscarte',
  // Pronombres y posesivos.
  'vos', 'tu', 'tus', 'te', 'ti', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'contigo',
];

/* En JavaScript `\b` sólo entiende letras del alfabeto inglés: después de una
   vocal acentuada no marca fin de palabra, así que «completá» no se detectaría
   nunca. Las miradas laterales con propiedades Unicode sí funcionan. */
const PATRON = new RegExp(
  '(?<![\\p{L}\\p{N}_])(' + VOSEO.join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');

const ATRIBUTOS = 'placeholder|title|alt|aria-label|value|content|label';

const enBlanco = (t) => t.replace(/[^\n]/g, ' ');

/** Devuelve los trozos de texto que ve una persona, con su renglón. */
function visible(crudo, esHtml) {
  const trozos = [];
  const anotar = (inicio, texto) => {
    if (texto.trim()) trozos.push([crudo.slice(0, inicio).split('\n').length, texto.trim()]);
  };

  if (!esHtml) {
    const sinComentarios = crudo.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
    for (const c of sinComentarios.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(c.index, c[1].slice(1, -1));
    }
    return trozos;
  }

  const limpio = crudo
    .replace(/<!--[\s\S]*?-->/g, enBlanco)
    .replace(/<style\b[\s\S]*?<\/style>/gi, enBlanco);

  for (const g of limpio.matchAll(/<script\b[\s\S]*?<\/script>/gi)) {
    const cuerpo = g[0].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
    for (const c of cuerpo.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(g.index + c.index, c[1].slice(1, -1));
    }
  }

  const sinGuion = limpio.replace(/<script\b[\s\S]*?<\/script>/gi, enBlanco);

  const atributo = new RegExp('\\b(' + ATRIBUTOS + ')\\s*=\\s*("[^"]*"|\'[^\']*\')', 'gi');
  for (const a of sinGuion.matchAll(atributo)) anotar(a.index, a[2].slice(1, -1));

  const resto = sinGuion.replace(/<[^>]*>/g, enBlanco);
  resto.split('\n').forEach((linea, i) => {
    if (linea.trim()) trozos.push([i + 1, linea.trim()]);
  });
  return trozos;
}

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra frases que sí tutean y contra frases que no. */
const TUTEAN = ['Completá tu legajo', 'Podés ingresar', '¿No tenés cuenta?', 'Registrate',
  'para tu ser querido', 'Te contactaremos', 'Si sos familiar', 'Contanos tu caso'];
const NO_TUTEAN = ['Completar el curso', 'Solicitar Asistente', 'Encuentre al cuidador',
  'Publicar Búsqueda', 'Cada cuidador completa su perfil', 'Agenda Horaria Semanal',
  'Notas de la Entrevista', 'Se aprende desde aspectos técnicos'];

const tutea = (frase) => { PATRON.lastIndex = 0; return PATRON.test(frase); };
const noDetecta = TUTEAN.filter((f) => !tutea(f));
const sePasa = NO_TUTEAN.filter(tutea);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  if (noDetecta.length) console.error('  no detecta: ' + noDetecta.join(' / '));
  if (sePasa.length) console.error('  avisa de más: ' + sePasa.join(' / '));
  process.exit(1);
}

const fallas = [];
let revisados = 0;

for (const camino of archivos(raiz, ['.html', '.js', '.json'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (nombre.endsWith('manifest.json') || nombre.endsWith('sw.js')) continue;
  revisados++;
  const crudo = readFileSync(camino, 'utf8');
  const vistos = new Set();
  for (const [renglon, texto] of visible(crudo, nombre.endsWith('.html'))) {
    PATRON.lastIndex = 0;
    const acierto = PATRON.exec(texto);
    if (acierto && !vistos.has(renglon + acierto[1])) {
      vistos.add(renglon + acierto[1]);
      fallas.push(`${nombre}:${renglon}  «${acierto[1]}»  ${texto.slice(0, 90)}`);
    }
  }
}

if (fallas.length > 0) {
  console.error('Texto visible que tutea a quien lo lee:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'aparición' : 'apariciones';
  console.error(`\n${fallas.length} ${plural}. La regla 5.1 pide forma impersonal, o *usted*.`);
  process.exit(1);
}

console.log(`Trato verificado: ${revisados} archivos sin tuteo en el texto visible.`);
