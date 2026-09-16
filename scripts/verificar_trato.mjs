/* ===================================================
   VERIFICA QUE EL TEXTO VISIBLE NO TUTEE A QUIEN LO LEE

   Falla —con código de salida 1— si en el texto que ve una persona aparece
   voseo, un pronombre de segunda persona informal o un imperativo con el
   pronombre pegado atrás.

       node scripts/verificar_trato.mjs

   Por qué existe: la regla «trato de usted» pide forma impersonal primero y
   *usted* cuando haya que dirigirse a alguien. Se limpiaron catorce pantallas el
   24 de agosto de 2026, y eso es una foto: la pantalla número quince la escribe
   alguien que no leyó la regla. Una regla que no se verifica sola no es una regla.

   Qué mira: el texto que ve una persona, que es lo que devuelve
   `scripts/texto_visible.mjs`.

   Qué NO mira, y hay que leer con ojos: **el imperativo en tú sin acento.**
   «Descarga la aplicación» tutea y «El sistema descarga el archivo» no, y las
   dos se escriben igual. Distinguirlas necesita entender la frase, así que este
   chequeo no lo intenta: prefiere no avisar nunca antes que avisar en falso
   tantas veces que alguien lo apague.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_CODIGO } from './recorrido.mjs';
import { visible, visibleDeMigracion, soloCastellano, formatoDe } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: el trato se revisa en el texto que ve una persona, y ahí no hay ninguno.

   `supabase/` sí se mira, desde el 30 de agosto de 2026: una migración es código,
   pero además **carga texto que después se lee en la pantalla** —las etiquetas de
   los vocabularios, las Guías de cuidado—, y ese texto se escapaba de acá. De
   cada `.sql` se mira sólo lo rotulado `"es-AR"`, nunca las sentencias ni los
   comentarios: eso lo resuelve `visibleDeMigracion()`.
   Y `assets/` también, desde el 16 de septiembre de 2026. Acá decía que ahí no
   hay texto que vea una persona, y no es cierto: un dibujo lleva adentro el
   rótulo que lee el lector de pantalla y, cuando hace falta, letras dibujadas.
   Dos de los del proyecto los tienen. Quedaba afuera sin que nada lo dijera. */
const AJENAS = ['docs', 'scripts'];

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

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra frases que sí tutean y contra frases que no. */
const TUTEAN = ['Completá tu legajo', 'Podés ingresar', '¿No tenés cuenta?', 'Registrate',
  'para tu ser querido', 'Te contactaremos', 'Si sos familiar', 'Contanos tu caso'];
const NO_TUTEAN = ['Completar el curso', 'Solicitar Asistente', 'Encuentre al Asistente',
  'Publicar un Aviso', 'Cada Asistente completa su perfil', 'Agenda Horaria Semanal',
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
let eximidos = 0;

/* Qué archivos se abren lo contesta `recorrido.mjs` con la lista de lo que este
   proyecto considera código, y no una lista escrita acá. Una escrita acá conoce
   las extensiones que había el día que se escribió, y el proyecto sigue sumando:
   ésta nombraba cuatro, y la puerta por la que CeltaTech da de alta y de baja a
   un Cliente está escrita en una quinta, así que sus mensajes no los abría nadie
   —tampoco las hojas de estilo—. Se comprobó metiéndole un tuteo adentro: este
   chequeo seguía dando verde. Es la misma lista que ya pide el control del
   glosario, por el mismo motivo y después del mismo hallazgo. */
for (const camino of hayArchivos(raiz, EXTENSIONES_DE_CODIGO, AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  /* Lo que se saltea se cuenta, porque una exención que no exime nada no es
     inofensiva: pasó a nombrar algo que el proyecto ya no escribe y nadie se
     entera. Acá había dos y una era eso: `sw.js` no es el nombre de ningún
     archivo de este proyecto —el que atiende sin conexión se llama
     `service-worker.js` y vive adentro de cada aplicación de teléfono—, así
     que salteaba cero archivos desde siempre. La que queda se comprueba abajo. */
  if (nombre.endsWith('manifest.json')) { eximidos++; continue; }
  revisados++;
  const crudo = readFileSync(camino, 'utf8');
  const renglones = crudo.split(/\r?\n/);
  const vistos = new Set();
  for (const [renglon, texto] of nombre.endsWith('.sql')
    ? visibleDeMigracion(crudo)
    : visible(soloCastellano(crudo), formatoDe(nombre))) {
    /* Lo único exento, y por un motivo que no es un permiso sino una diferencia
       de naturaleza: los renglones `patron` de las reglas del chat no son texto
       que el producto le diga a nadie, son la descripción de **lo que escribe
       otro**. La regla que reconoce «tu instagram es maria» tiene que llevar la
       palabra adentro para poder reconocerla, y sacársela abriría justo el
       agujero que la regla viene a tapar. El `motivo` de esas mismas reglas, que
       sí se muestra en pantalla, se revisa como cualquier otro texto. */
    if (/^\s*"patron"\s*:/.test(renglones[renglon - 1] ?? '')) continue;

    PATRON.lastIndex = 0;
    const acierto = PATRON.exec(texto);
    if (acierto && !vistos.has(renglon + acierto[1])) {
      vistos.add(renglon + acierto[1]);
      fallas.push(`${nombre}:${renglon}  «${acierto[1]}»  ${texto.slice(0, 90)}`);
    }
  }
}

if (eximidos === 0) {
  console.error(
    'La exención de `manifest.json` no salteó ningún archivo, así que dejó de\n' +
    'nombrar algo que exista y este chequeo no está eximiendo lo que dice eximir.\n' +
    'Se le corrige el nombre, o se la saca.');
  process.exit(1);
}

if (fallas.length > 0) {
  console.error('Texto visible que tutea a quien lo lee:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'aparición' : 'apariciones';
  console.error(`\n${fallas.length} ${plural}. La regla «trato de usted» pide forma impersonal, o *usted*.`);
  process.exit(1);
}

console.log(`Trato verificado: ${revisados} archivos sin tuteo en el texto visible.`);
