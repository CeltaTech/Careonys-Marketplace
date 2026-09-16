/* ===================================================
   VERIFICA QUE NADA ENTRE EN UNA PANTALLA COMO NO CORRESPONDE

   Falla —con código de salida 1— si una plantilla que arma HTML mete adentro un
   dato sin pasarlo por `Texto.escapar`, o si el texto crudo de un error llega a
   la pantalla en vez de a la consola.

       node scripts/verificar_escapado.mjs

   Por qué existe: un nombre, una nota de un reporte o un mensaje de chat que se
   pega crudo adentro de HTML deja de ser texto y pasa a ser marcado. Se limpiaron
   veinte lugares el 24 de agosto de 2026, y eso es una foto: la plantilla número
   veintiuno la escribe alguien apurado. Una regla que no se verifica sola no es
   una regla.

   Qué mira, en cada `.html` y cada archivo de `js/`:

   1. **Toda plantilla que parezca HTML** —cualquier texto entre acentos graves
      que contenga algo con forma de etiqueta— y cada `${...}` de adentro. Un
      `${...}` pasa si llama a `Texto.escapar(`, o si no toca ninguna propiedad
      de ningún objeto: los datos se alcanzan con un punto, y lo que el programa
      decide solo —una clase, un color, un texto fijo elegido con un ternario—
      no lo lleva.

   2. **Los manejadores escritos adentro del marcado** (`onclick="..."` y
      compañía) que interpolen cualquier cosa. Ahí escapar no sirve: el navegador
      deshace el escapado del atributo antes de leerlo como código, así que
      `&#39;` vuelve a ser una comilla y cierra la cadena igual. Se arreglan con
      `addEventListener`, no con `Texto.escapar`.

   3. **El HTML armado con `+`**, que es la forma vieja de lo mismo.

   4. **El texto crudo de un error que llega a la vista.** La regla «un mensaje de
      error es texto visible» dice que lo que devuelven el navegador o la base
      nombra tablas, columnas y restricciones, y eso no se le muestra a nadie.
      Se mira **a dónde va** cada `.message` y cada `.error_description`, que
      tienen tres destinos legítimos y ninguno más: la consola, una comparación
      contra un texto escrito, y volver a tirarlo. Cualquier otro se avisa. A la
      pantalla va la clave que devuelve `Texto.claveDeError`.

   5. **La única puerta equivalente en una pantalla de un programa.** Ahí el
      marcado está adentro del código y lo que se mete adentro se convierte en
      texto solo, así que ninguna de las cuatro formas de arriba puede pasar.
      Queda un atributo, con un nombre que ya avisa lo que hace, capaz de
      saltearse esa conversión. Hoy no lo usa nadie y así tiene que quedar.

   Y un archivo de pantalla se revisa distinto según qué sea: una página suelta
   es marcado con el código adentro de sus bloques de guión, y una pantalla de
   un programa es código de punta a punta. Mientras se les buscaron los bloques
   de guión a las dos por igual, las del programa pasaban enteras sin revisar.

   **Y el punto 4 se quedó ciego una segunda vez, por otro camino.** Preguntaba
   si en la misma sentencia había un `alert`, un `confirm`, un `innerHTML` o un
   `textContent`: eso es la forma de una página suelta, y una pantalla de un
   programa no escribe ninguna de las cuatro —guarda el error en su estado y lo
   dibuja unos cuantos renglones más abajo—. Los archivos estaban todos, se
   abrían todos, y adentro no quedaba nada que juzgar. Por eso ahora se mira el
   destino, que no depende de la forma, y por eso el renglón final dice cuántas
   cosas miró: un número que baja a cero avisa, un ✔ solo no avisa nada.

   Cuando un caso sea legítimo de verdad, se marca adentro de la interpolación
   —o adentro de la sentencia, si lo que se deja pasar es un texto crudo de
   error— con un comentario que empiece por `seguro:` y siga con la razón. El
   comentario obliga a escribirla, y queda a la vista de quien lea el renglón.
   Marcar sin razón es autoengaño con más pasos.

   Qué NO mira, y hay que leer con ojos: **no sigue el rastro de una variable.**
   Si el dato se copió antes a una variable local sin punto —`const nombre =
   asp.nombre`— y después se interpola esa variable, este chequeo la deja pasar.
   Vale igual la pena: caza la forma en que el problema aparece casi siempre, que
   es el dato pegado derecho desde el objeto. Y del texto crudo de un error mira
   la sentencia donde aparece, acotada a un par de renglones para cada lado: una
   sentencia que llame a la consola y además muestre algo en la pantalla pasa,
   porque el destino bueno tapa al malo.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA, esPaginaSuelta } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: un dato entra en una pantalla, y en esas carpetas no hay pantallas. */
const AJENAS = ['docs', 'supabase', 'scripts', 'assets'];

const PARECE_MARCADO = /<[a-zA-Z][a-zA-Z0-9-]*[\s/>]/;
const CRUDO = /\.(?:message|error_description)\b/g;
const COMPARA_ANTES = /(?:===|!==|==|!=)$/;
const COMPARA_DESPUES = /^(?:===|!==|==|!=)/;
const VA_A_LA_CONSOLA = /^console\./;
const ANTES_DE_UNA_REGEX = /(?:^|[(,=:[!&|?{};+*%<>~^]|\breturn)\s*$/;
const MANEJADOR_EN_LINEA = /\son[a-z]+\s*=\s*"[^"]*\$\{/;

/** Reemplaza el contenido de las cadenas por espacios, para poder buscar sintaxis. */
function sinCadenas(expresion) {
  let fuera = '';
  let i = 0;
  while (i < expresion.length) {
    const c = expresion[i];
    if (c === "'" || c === '"' || c === '`') {
      const cierre = c;
      fuera += ' ';
      i++;
      while (i < expresion.length && expresion[i] !== cierre) {
        i += expresion[i] === '\\' ? 2 : 1;
        fuera += ' ';
      }
      fuera += ' ';
      i++;
      continue;
    }
    fuera += c;
    i++;
  }
  return fuera;
}

/** Reemplaza los comentarios por espacios, dejando las cadenas intactas. */
function sinComentarios(codigo) {
  let fuera = '';
  let i = 0;
  while (i < codigo.length) {
    const c = codigo[i];
    if (c === "'" || c === '"' || c === '`') {
      // Una comilla suelta —la de una expresión regular, por ejemplo— no abre
      // ningún literal: si no cierra, se la trata como un carácter más. Sin
      // esto el recorrido vuelve al principio y no termina nunca.
      const fin = finDeLiteral(codigo, i);
      if (fin > i) {
        fuera += codigo.slice(i, fin + 1);
        i = fin + 1;
        continue;
      }
    }
    if (c === '/' && codigo[i + 1] === '/') {
      const fin = codigo.indexOf('\n', i);
      const hasta = fin < 0 ? codigo.length : fin;
      fuera += ' '.repeat(hasta - i);
      i = hasta;
      continue;
    }
    if (c === '/' && codigo[i + 1] === '*') {
      const fin = codigo.indexOf('*/', i);
      const hasta = fin < 0 ? codigo.length : fin + 2;
      fuera += codigo.slice(i, hasta).replace(/[^\n]/g, ' ');
      i = hasta;
      continue;
    }
    fuera += c;
    i++;
  }
  return fuera;
}

/** Devuelve dónde cierra la comilla o el acento grave que abre en `inicio`. */
function finDeLiteral(texto, inicio) {
  const cierre = texto[inicio];
  let i = inicio + 1;
  let hondo = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (cierre === '`' && c === '$' && texto[i + 1] === '{') { hondo++; i += 2; continue; }
    if (cierre === '`' && c === '}' && hondo > 0) { hondo--; i++; continue; }
    if (c === cierre && hondo === 0) return i;
    i++;
  }
  return -1;
}

/**
 * Igual que `sinCadenas`, pero deja a la vista lo que hay adentro de un `${...}`.
 * Sirve para buscar sintaxis alrededor de algo sin que un punto y coma escrito
 * adentro de un texto corte la sentencia donde no corta, y sin perder de vista
 * la llamada que envuelve a un dato interpolado. Conserva el largo, así que las
 * posiciones siguen siendo las mismas.
 */
export function sinTextoLiteral(codigo) {
  let fuera = '';
  let i = 0;
  while (i < codigo.length) {
    const c = codigo[i];
    /* Una expresión regular no es un texto, pero adentro puede llevar una
       comilla suelta —`.replace(/'/g, …)` lleva una— y si se la toma por el
       principio de un texto, todo lo que sigue queda emparejado al revés y se
       borra código de verdad. Se la saltea entera. */
    if (c === '/' && ANTES_DE_UNA_REGEX.test(fuera)) {
      let j = i + 1;
      let enClase = false;
      while (j < codigo.length && codigo[j] !== '\n') {
        const d = codigo[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') enClase = true;
        else if (d === ']') enClase = false;
        else if (d === '/' && !enClase) break;
        j += 1;
      }
      if (j < codigo.length && codigo[j] === '/') {
        fuera += ' '.repeat(j - i + 1);
        i = j + 1;
        continue;
      }
    }
    if (c === "'" || c === '"') {
      const fin = finDeLiteral(codigo, i);
      if (fin < 0) { fuera += c; i += 1; continue; }
      fuera += ' '.repeat(fin - i + 1);
      i = fin + 1;
      continue;
    }
    if (c === '`') {
      const fin = finDeLiteral(codigo, i);
      if (fin < 0) { fuera += c; i += 1; continue; }
      const dentro = codigo.slice(i + 1, fin);
      let hueco = '';
      let j = 0;
      while (j < dentro.length) {
        if (dentro[j] === '$' && dentro[j + 1] === '{') {
          const desde = j + 2;
          let hondo = 1;
          let k = desde;
          while (k < dentro.length && hondo > 0) {
            if (dentro[k] === '{') hondo += 1;
            else if (dentro[k] === '}') hondo -= 1;
            k += 1;
          }
          hueco += '  ' + sinTextoLiteral(dentro.slice(desde, k - 1)) + ' ';
          j = k;
          continue;
        }
        hueco += dentro[j] === '\n' ? '\n' : ' ';
        j += 1;
      }
      fuera += ' ' + hueco + ' ';
      i = fin + 1;
      continue;
    }
    fuera += c;
    i += 1;
  }
  return fuera;
}

/**
 * Dónde empieza y dónde termina la sentencia que contiene a `pos`. Acotada a un
 * par de renglones para cada lado: una sentencia más larga que eso no existe en
 * este proyecto, y sin el tope un literal mal cerrado en cualquier parte del
 * archivo se lleva puesta media pantalla de código y la deja pasar entera.
 */
function laSentencia(plano, pos) {
  let desde = piso(plano, pos, -2);
  for (let i = pos; i > desde; i -= 1) {
    const c = plano[i - 1];
    if (c === ';' || c === '{' || c === '}') { desde = i; break; }
  }
  let hasta = piso(plano, pos, 2);
  for (let i = pos; i < plano.length; i += 1) {
    const c = plano[i];
    if (c === ';' || c === '}') { hasta = Math.min(i, hasta); break; }
  }
  return [desde, hasta];
}

/** Dónde arranca el renglón que está `cuantos` más arriba o más abajo de `pos`. */
function piso(plano, pos, cuantos) {
  let i = pos;
  for (let n = 0; n < Math.abs(cuantos); n += 1) {
    const salto = cuantos < 0 ? plano.lastIndexOf('\n', i - 1) : plano.indexOf('\n', i + 1);
    if (salto < 0) return cuantos < 0 ? 0 : plano.length;
    i = salto;
  }
  return cuantos < 0 ? i + 1 : i;
}

/**
 * Los nombres de las llamadas que envuelven a `pos`, de adentro hacia afuera.
 * Con eso se sabe a dónde va lo que está ahí: `console.error(String(err.message))`
 * va a la consola aunque entre medio haya otra llamada.
 */
function lasLlamadasQueLoEnvuelven(plano, pos, tope) {
  const nombres = [];
  let desde = pos;
  while (desde > tope) {
    let hondo = 0;
    let abre = -1;
    for (let i = desde; i > tope; i -= 1) {
      const c = plano[i - 1];
      if (c === ')') hondo += 1;
      else if (c === '(') {
        if (hondo === 0) { abre = i - 1; break; }
        hondo -= 1;
      }
    }
    if (abre < 0) return nombres;
    const m = plano.slice(tope, abre).match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*$/);
    if (!m) return nombres;
    nombres.push(m[1].replace(/\s+/g, ''));
    desde = abre - m[1].length;
  }
  return nombres;
}

/**
 * ¿Todo lo que puede salir de esta expresión está escrito en el código?
 *
 * Un `condición ? 'esto' : 'aquello'` devuelve siempre uno de los dos textos que
 * están ahí a la vista, sin importar qué diga la condición: el dato elige, pero
 * no entra. Eso no necesita escaparse, y pedirlo llenaría el código de ruido.
 * Las plantillas anidadas cuentan como salida escrita porque sus propias
 * interpolaciones se revisan aparte.
 */
function esSalidaEscrita(expresion) {
  const e = expresion.trim();
  if (e === '') return true;

  if (e[0] === "'" || e[0] === '"' || e[0] === '`') {
    return finDeLiteral(e, 0) === e.length - 1;
  }

  const limpio = sinCadenas(e);
  let hondo = 0;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if ('([{'.includes(c)) hondo++;
    else if (')]}'.includes(c)) hondo--;
    else if (c === '?' && hondo === 0 && limpio[i + 1] !== '.' && limpio[i + 1] !== '?') {
      let j = i + 1;
      let interno = 0;
      while (j < limpio.length) {
        const d = limpio[j];
        if ('([{'.includes(d)) interno++;
        else if (')]}'.includes(d)) interno--;
        else if (d === '?' && interno === 0 && limpio[j + 1] !== '.') interno++;
        else if (d === ':' && interno === 0) break;
        j++;
      }
      if (j >= limpio.length) return false;
      return esSalidaEscrita(e.slice(i + 1, j)) && esSalidaEscrita(e.slice(j + 1));
    }
  }
  return false;
}

/**
 * Lee una plantilla que empieza en `inicio` (el acento grave) y devuelve dónde
 * termina, su contenido crudo y las interpolaciones que tiene, incluidas las de
 * las plantillas anidadas adentro de esas interpolaciones.
 */
function leerPlantilla(texto, inicio) {
  const interpolaciones = [];
  let i = inicio + 1;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return { fin: i, crudo: texto.slice(inicio, i + 1), interpolaciones };
    if (c === '$' && texto[i + 1] === '{') {
      const desde = i + 2;
      let j = desde;
      let hondo = 1;
      while (j < texto.length && hondo > 0) {
        const d = texto[j];
        if (d === '\\') { j += 2; continue; }
        if (d === "'" || d === '"') {
          const cierre = d;
          j++;
          while (j < texto.length && texto[j] !== cierre) j += texto[j] === '\\' ? 2 : 1;
          j++;
          continue;
        }
        if (d === '`') {
          const anidada = leerPlantilla(texto, j);
          interpolaciones.push(...anidada.interpolaciones);
          j = anidada.fin + 1;
          continue;
        }
        if (d === '{') hondo++;
        else if (d === '}') hondo--;
        j++;
      }
      interpolaciones.push({ posicion: desde, expresion: texto.slice(desde, j - 1) });
      i = j;
      continue;
    }
    i++;
  }
  return { fin: texto.length, crudo: texto.slice(inicio), interpolaciones };
}

/** Devuelve los reparos de un texto de código. `base` desplaza los renglones. */
export function revisarCodigo(codigo, base = 0, cuenta = { crudos: 0, interpolaciones: 0 }) {
  const reparos = [];
  const renglon = (pos) => base + codigo.slice(0, pos).split('\n').length - 1;

  let i = 0;
  while (i < codigo.length) {
    const c = codigo[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"') {
      const cierre = c;
      i++;
      while (i < codigo.length && codigo[i] !== cierre && codigo[i] !== '\n') {
        i += codigo[i] === '\\' ? 2 : 1;
      }
      i++;
      continue;
    }
    if (c === '/' && codigo[i + 1] === '/') { i = codigo.indexOf('\n', i) + 1 || codigo.length; continue; }
    if (c === '/' && codigo[i + 1] === '*') { i = codigo.indexOf('*/', i) + 2 || codigo.length; continue; }
    if (c === '`') {
      const plantilla = leerPlantilla(codigo, i);
      if (PARECE_MARCADO.test(plantilla.crudo)) {
        if (MANEJADOR_EN_LINEA.test(plantilla.crudo)) {
          reparos.push({
            renglon: renglon(i),
            motivo: 'un manejador escrito adentro del marcado interpola un dato',
            muestra: (plantilla.crudo.match(MANEJADOR_EN_LINEA) || [''])[0].trim().slice(0, 70),
            remedio: 'el atributo se saca y el manejador se cuelga con addEventListener'
          });
        }
        for (const { posicion, expresion } of plantilla.interpolaciones) {
          cuenta.interpolaciones += 1;
          if (expresion.includes('seguro:')) continue;
          if (expresion.includes('Texto.escapar(')) continue;
          if (!sinCadenas(expresion).includes('.')) continue;
          if (esSalidaEscrita(expresion)) continue;
          reparos.push({
            renglon: renglon(posicion),
            motivo: 'un dato entra en el marcado sin escapar',
            muestra: '${' + expresion.trim().replace(/\s+/g, ' ').slice(0, 60) + '}',
            remedio: 'se envuelve en Texto.escapar(), o se marca /*seguro: por qué*/'
          });
        }
      }
      i = plantilla.fin + 1;
      continue;
    }
    i++;
  }

  const pegado = /\.(?:inner|outer)HTML\s*=\s*(?!`)[^;\n]*\+[^;\n]*/g;
  for (const a of pegado.exec ? codigo.matchAll(pegado) : []) {
    if (!sinCadenas(a[0]).includes('.')) continue;
    reparos.push({
      renglon: renglon(a.index),
      motivo: 'se arma marcado pegando textos con +',
      muestra: a[0].trim().replace(/\s+/g, ' ').slice(0, 70),
      remedio: 'se usa una plantilla con Texto.escapar(), o se arma con createElement y textContent'
    });
  }

  const limpio = sinComentarios(codigo);
  /* El texto crudo de un error lo escribió el servidor y nombra tablas, columnas
     y restricciones: no se le muestra a nadie. Se mira **a dónde va**, y no en
     qué renglón aparece. Mientras se preguntó si en la misma sentencia había un
     `alert`, un `innerHTML` o un `textContent`, las pantallas del programa
     quedaron afuera sin que nadie lo dijera: una pantalla de React no escribe
     ninguna de las tres —guarda el error en su estado y lo dibuja después, a
     unos cuantos renglones de distancia—, así que la regla existía y no alcanzaba
     a las tres cuartas partes del proyecto. Por destino son tres los usos
     legítimos, y cualquier otro se avisa: la consola, una comparación contra un
     texto escrito, y volver a tirarlo. */
  const plano = sinTextoLiteral(limpio);
  for (const a of limpio.matchAll(CRUDO)) {
    cuenta.crudos += 1;
    const [abre, cierra] = laSentencia(plano, a.index);
    const muestra = codigo.slice(abre, cierra).trim().replace(/\s+/g, ' ').slice(0, 70);
    if (codigo.slice(abre, cierra).includes('seguro:')) continue;
    if (/\bthrow\b/.test(plano.slice(abre, a.index))) continue;
    const despues = plano.slice(a.index + a[0].length, cierra).trimStart();
    if (COMPARA_ANTES.test(plano.slice(abre, a.index).trimEnd())
        || COMPARA_DESPUES.test(despues)) continue;
    if (lasLlamadasQueLoEnvuelven(plano, a.index, abre).some((n) => VA_A_LA_CONSOLA.test(n))) continue;
    reparos.push({
      renglon: renglon(a.index),
      motivo: 'el texto crudo de un error llega a la pantalla',
      muestra,
      remedio: 'a la pantalla va Texto.claveDeError(err, qué se intentaba); el crudo, a console.error'
    });
  }

  /* La única puerta por la que entra marcado sin convertir en una pantalla
     de un programa. En una página suelta la abre `innerHTML`; acá la abre un
     atributo cuyo nombre ya avisa lo que hace, y que es lo único capaz de
     saltear la conversión a texto que el programa hace solo. Hoy no lo usa
     nadie, y ese es justamente el estado que hay que sostener. */
  for (const a of limpio.matchAll(/dangerouslySetInnerHTML/g)) {
    const desde = limpio.lastIndexOf('\n', a.index) + 1;
    let hasta = limpio.indexOf('\n', a.index);
    if (hasta < 0) hasta = limpio.length;
    reparos.push({
      renglon: renglon(a.index),
      motivo: 'entra marcado en la pantalla sin convertirlo en texto',
      muestra: codigo.slice(desde, hasta).trim().replace(/\s+/g, ' ').slice(0, 70),
      remedio: 'el dato se dibuja como texto; si de verdad tiene que ser marcado, se arma con etiquetas'
    });
  }

  return reparos;
}

const enBlanco = (t) => t.replace(/[^\n]/g, ' ');

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra código que sí falla y contra código que no. */
const MALOS = [
  ['dato pegado derecho', 'el.innerHTML = `<h5>${asp.nombre}</h5>`;'],
  ['dato adentro de un atributo', 'el.innerHTML = `<img src="${asp.fotoUrl}" />`;'],
  ['dato en una plantilla anidada', 'el.innerHTML = `<p>${x ? `<b>${log.notas}</b>` : \'\'}</p>`;'],
  ['manejador escrito en el marcado', 'el.innerHTML = `<button onclick="ver(\'${a.id}\')">Ver</button>`;'],
  ['marcado pegado con +', "el.innerHTML = '<span>' + Identidad.datos.nombre + '</span>';"],
  ['una rama del ternario es dato', 'el.innerHTML = `<p>${a.ok ? a.nombre : \'\'}</p>`;'],
  ['el respaldo es fijo pero el dato no', 'el.innerHTML = `<p>${a.zona || \'Cobertura\'}</p>`;'],
  ['el error crudo en un aviso', "alert('No se pudo guardar: ' + err.message);"],
  ['el error crudo escapado sigue siendo crudo', "el.innerHTML = `<p>${Texto.escapar(err.message)}</p>`;"],
  ['marcado metido sin convertir', 'return <p dangerouslySetInnerHTML={{ __html: a.nota }} />;'],
  ['el error crudo guardado en el estado de una pantalla', 'setAviso(err.message);'],
  ['el error crudo dibujado derecho en una pantalla', 'return <p>{err.message}</p>;'],
  ['el error crudo pegado adentro de una frase', "setAviso('No se pudo guardar: ' + err.message);"],
  ['el error crudo metido en una plantilla', 'setAviso(`No se pudo: ${err.message}`);']
];
const BUENOS = [
  ['dato escapado', 'el.innerHTML = `<h5>${Texto.escapar(asp.nombre)}</h5>`;'],
  ['escapado adentro de una anidada', 'el.innerHTML = `<p>${x ? `<b>${Texto.escapar(log.notas)}</b>` : \'\'}</p>`;'],
  ['decisión del propio código', 'el.innerHTML = `<i class="fas ${iconClass}"></i>`;'],
  ['el dato elige entre dos textos escritos', 'el.innerHTML = `<h5>${l.presion ? \'Signos Vitales\' : \'Nota\'}</h5>`;'],
  ['ternario anidado, todo escrito', 'el.innerHTML = `<p>${a.e === \'x\' ? \'<b>X</b>\' : a.e ? \'<i>Y</i>\' : \'\'}</p>`;'],
  ['rama que es una plantilla', 'el.innerHTML = `<p>${a.ok ? `<b>${Texto.escapar(a.n)}</b>` : \'\'}</p>`;'],
  ['excepción con su razón', 'el.innerHTML = `<div>${/* seguro: lo arma este mismo módulo */ this._bloque(i)}</div>`;'],
  ['plantilla que no es marcado', 'const q = `eq.${aviso.id}`;'],
  ['texto plano por textContent', 'el.textContent = asp.nombre;'],
  ['marcado fijo sin datos', "el.innerHTML = '<p>No hay registros todavía.</p>';"],
  ['el error crudo va a la consola', "console.error('Publicar el aviso:', err.message);"],
  ['el error clasificado antes de mostrarse', "alert(Texto.mensajeDeError(err, 'guardar la novedad'));"],
  ['el error se relanza con su texto', "if (error) throw new Error(error.message);"],
  ['el dato se dibuja como texto', 'return <p>{a.nota}</p>;'],
  ['el error crudo comparado contra un texto escrito', "const falta = err.message === 'sin_legajo';"],
  ['el error crudo envuelto para la consola', "console.error('Falla:', String(err.message));"],
  ['el error crudo adentro de una plantilla que va a la consola', 'console.error(`Falla: ${err.message}`);'],
  ['el error crudo donde se lo clasifica, con su razón', "const crudo = String(/* seguro: acá se traduce a una clave */ (error && error.message) || '');"]
];

const noDetecta = MALOS.filter(([, c]) => revisarCodigo(c).length === 0).map(([n]) => n);
const sePasa = BUENOS.filter(([, c]) => revisarCodigo(c).length > 0).map(([n]) => n);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  if (noDetecta.length) console.error('  no detecta: ' + noDetecta.join(' / '));
  if (sePasa.length) console.error('  avisa de más: ' + sePasa.join(' / '));
  process.exit(1);
}

const fallas = [];
let revisados = 0;
const miradas = { crudos: 0, interpolaciones: 0 };

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  revisados++;
  const crudo = readFileSync(camino, 'utf8');
  const reparos = [];

  /* Una página suelta es marcado con código adentro, en sus bloques de
     guión; una pantalla de un programa es código de punta a punta, con el
     marcado adentro del código y no al revés. Mientras se les miraron los
     bloques de guión a las dos por igual, las pantallas del programa pasaban
     enteras sin que nadie les mirara nada: no tienen ninguno. */
  if (esPaginaSuelta(nombre)) {
    const sinEstilo = crudo.replace(/<!--[\s\S]*?-->/g, enBlanco);
    for (const g of sinEstilo.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(g[1])) continue;
      const desde = g.index + g[0].indexOf(g[2]);
      reparos.push(...revisarCodigo(g[2], sinEstilo.slice(0, desde).split('\n').length, miradas));
    }
  } else {
    reparos.push(...revisarCodigo(crudo, 1, miradas));
  }

  for (const r of reparos) {
    fallas.push(`${nombre}:${r.renglon}  ${r.motivo}\n      ${r.muestra}\n      → ${r.remedio}`);
  }
}

if (fallas.length > 0) {
  console.error('Lo que llega a una pantalla pasa antes por Texto:\n');
  for (const falla of fallas) console.error('  - ' + falla + '\n');
  const plural = fallas.length === 1 ? 'lugar' : 'lugares';
  console.error(`${fallas.length} ${plural}. Un dato se escapa; un error se clasifica.`);
  process.exit(1);
}

/* Y que no quede mirando cero: la cuenta de archivos estaba entera mientras la
   de adentro era cero, que es cómo un chequeo dice ✔ sin haber mirado nada. */
seRevisaron(
  miradas.interpolaciones + miradas.crudos,
  'ni un dato entrando en el marcado ni un texto crudo de error donde mirar'
);

console.log(
  `Escapado verificado: ${revisados} archivos sin datos ni errores crudos en la pantalla `
  + `(${miradas.interpolaciones} datos entrando en el marcado y ${miradas.crudos} textos crudos de error, mirados de a uno).`
);
