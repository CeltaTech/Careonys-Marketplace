# Plan: los tres idiomas

> **El mecanismo está construido y funcionando; el trabajo de mudar las frases recién empieza.**
> Al 26 de agosto de 2026: **10 de 46 archivos convertidos** y **461 frases** en los tres idiomas.
> Lo que falta son las otras 36 pantallas —seis de ellas trabadas por una decisión del
> Desarrollador, contadas en el pendiente 9— y **el contenido de los datos**, que es la mitad que
> este plan no miraba: `data/catalogo-oferta.json` y `data/catalogo-vocabularios.json` están sólo
> en castellano, así que una pantalla traducida todavía muestra sus tarjetas y sus listas de
> opciones en un solo idioma. Queda además la única decisión abierta del Desarrollador —quién
> traduce—, que es la número 2 de la sección 5.
>
> Corresponde al pendiente 9. Cuando esté todo convertido, este archivo se borra.

---

## 1. En una línea

Hay **751 frases distintas** escritas a mano adentro de las pantallas, en un solo idioma. La regla
pide `es-AR`, `en` y `pt-BR` desde el primer día. No es un trabajo de traducir: es un trabajo de
**sacar las frases de donde están** y dejar en su lugar una llamada al catálogo. Traducir viene
después y es lo barato.

---

## 2. Inventario

Medido el 26 de agosto de 2026 con `scripts/inventario_textos.mjs`, que se vuelve a correr cuando
haga falta. **No es un chequeo**: no falla nunca y no entra en `verificar_todo.mjs`.

```bash
node scripts/inventario_textos.mjs
```

| | |
|---|---:|
| Apariciones de texto visible | 1.256 |
| Archivos donde aparecen | 31 |
| **Frases distintas, que es lo que hay que traducir** | **751** |
| Apariciones que repiten una frase ya contada | 505 |
| De esas frases, las que pasan las 12 palabras (párrafos, no rótulos) | 91 |

### 2.1 Por tipo

| Tipo | Cuántas |
|---|---:|
| Texto suelto entre etiquetas | 973 |
| Texto armado desde un guion | 145 |
| `alt` de una imagen | 45 |
| `placeholder` de un campo | 40 |
| `aria-label` | 28 |
| Rótulo de un botón (`value`) | 14 |
| `meta name="description"` | 9 |
| `title` | 2 |

Los tres últimos grupos son chicos pero **no son opcionales**: `alt` y `aria-label` son lo que oye
quien no ve la pantalla, y `meta description` es lo que muestra el buscador. Una traducción que se
olvida de ellos deja a esas personas en el idioma equivocado.

### 2.2 Por archivo

| Archivo | Apariciones |
|---|---:|
| `registrar-asistente.html` | 162 |
| `pwa-asistente/index.html` | 148 |
| `index.html` | 141 |
| `formulario-integral.html` | 125 |
| `mockup-app.html` | 120 |
| `solicitar-asistente.html` | 105 |
| `pwa-familia/index.html` | 84 |
| `soporte-remoto.html` | 65 |
| `cursos.html` | 60 |
| `perfil.html` | 55 |
| `directorio.html` | 51 |
| `panel-prestadora.html` | 33 |
| `examen.html` | 29 |
| `nueva-clave.html` | 18 |
| `recuperar-clave.html` | 15 |
| `js/main.js` | 14 |
| `acceso.html` | 11 |
| `js/clave.js` y sus dos copias | 3 cada una |
| Otros nueve guiones | 1 cada uno |

**Seis archivos concentran 801 de las 1.256**, o sea el 64 %. Ese es el orden en que conviene
tomarlos.

### 2.2.1 La cuenta estaba inflada, y se midió cuánto

**Al 27 de agosto de 2026 lo que falta son 414 frases distintas, no 479.** La diferencia no es
trabajo hecho: es que el inventario contaba de más. De los 122 textos que decía sacar de los
guiones, **30 eran texto y 92 no**.

| | Antes | Corregido |
|---|---:|---:|
| Apariciones | 710 | 618 |
| Archivos | 28 | 7 |
| **Frases distintas** | **479** | **414** |
| Texto armado desde un guion | 122 | 30 |

Lo que sobraba no era una cosa sino seis, y ninguna se reconoce mirando si una cadena «parece»
una frase —eso es adivinar—: cada una se reconoce por algo que el propio proyecto ya escribió
alrededor.

- **Nombres de ida, no texto de vuelta.** La clave que se le pide al catálogo
  —`Catalogo.frase('catalogo.cargando')`—, el nombre de un atributo dentro de un `getAttribute`,
  el de un campo entre corchetes. La clave además puede vivir en la tabla de arranque de
  `js/catalogo.js:115` en lugar del archivo de frases, así que compararla contra el archivo daba
  faltantes que no existen.
- **Valores guardados.** Una cadena al lado de un `===` viaja al servidor y traducirla rompe la
  comparación. Es el mismo criterio que `sinValoresGuardados()` (`scripts/texto_visible.mjs:42`)
  ya aplicaba al `value` de un casillero.
- **Lo que sólo llega a la consola**, que es el segundo argumento de las funciones que clasifican
  un error.
- **Lo que ya está contado en otro lado**: lo que se le escribe a un elemento que el mismo guion
  marca con `data-frase` —el texto sale del catálogo—, y lo que se le escribe a una hoja de
  estilo que el guion se fabrica solo, que es CSS.
- **El atributo adentro de una plantilla de marcado.** `elemento.title = …` es una escritura de
  JavaScript; `title="Silenciar Micrófono">` es marcado. Sin exigir el punto de adelante se
  confundían, y como un atributo no termina en punto y coma, la lectura seguía de largo y contaba
  como frases los renglones de código que venían atrás.
- **Los pedazos.** Una plantilla cortada por la mitad al llegar al tope de lectura, un hueco
  `${…}` quitado sin contar las llaves de adentro, un par de comillas mal emparejado en
  `a ? (x || '') : (y || '')`. Los tres dejaban restos —«<h4 style="font-size:14px», «) : (y ||»—
  adentro del inventario.

**Se comprobó al revés, que es lo que hace que la prueba pueda fallar.** Un archivo de mentira que
escribe cuatro frases de cuatro maneras distintas —`textContent`, `innerHTML` con marcado,
`setAttribute('title', …)` y `alert()`— y además dos cosas que no son texto: aparecen las cuatro
y no aparecen las dos. Y las categorías que no toca este arreglo quedaron **idénticas**: 588
apariciones antes y 588 después, así que lo que cambió es lo que tenía que cambiar y nada más.

**Los siete archivos que quedan son exactamente los seis trabados más `js/main.js`.** No es
casualidad: es lo que decía la lista de trabas, ahora sin ruido encima.

### 2.3 Lo que ya estaba resuelto sin que nadie se lo propusiera

Tres cosas quedaron afuera de la cuenta, y no por descuido:

- **Las opciones de los catálogos.** Las 133 de `data/catalogo-vocabularios.json` más las fichas
  de los demás `data/catalogo-*.json` no están escritas en ninguna pantalla: la pantalla pide la
  clave y el catálogo devuelve el texto. **Ahí el idioma entra por un solo lugar.** Hoy esos
  archivos tienen una sola columna, `es-AR`; agregarle dos columnas es agregar dos columnas.
- **Las fechas.** `Texto.fechaCorta()` (`js/texto.js:60`) es el único lugar del proyecto donde se
  le da forma a una fecha. El idioma le entra por ahí y no hay que buscarlo pantalla por pantalla.
- **El aviso del chat.** `data/patrones-contacto.json` nació el 26 de agosto de 2026 con los tres
  idiomas adentro, porque para entonces la regla ya estaba escrita.

Los tres son el mismo argumento a favor de hacerlo ahora: **lo que ya sale de un catálogo no
costó nada**. Lo que cuesta son las 751 que no.

---

## 3. Lo que está construido

Las cuatro piezas de abajo existen y corren. Lo que sigue abierto es mudar las frases de las 44
pantallas que faltan.

### 3.1 El catálogo de frases

`data/catalogo-frases.json`, hermano de los seis que ya existían y leído por el mismo
`js/catalogo.js`:

```json
{
  "frases": {
    "acceso.entrar": {
      "es-AR": "Entrar",
      "en": "Sign in",
      "pt-BR": "Entrar"
    }
  }
}
```

La clave se nombra `pantalla.cosa`. **Se nombra por lo que hace y no se renombra**, que es la regla
de «lo que se guarda para siempre»: la clave es lo guardado, el texto es lo visible.

Los huecos se escriben entre llaves simples —`{cuantos}`— y se rellena la frase entera, nunca de a
pedazos: cada idioma ordena distinto. Una clave que empieza con guión bajo es un separador para
leer el archivo, no una frase.

**Lo que no es de ninguna pantalla se nombra `comun.cosa`.** «Cargando…» aparece en casi todas, y
darle el nombre de la primera que la usó obliga a las demás a pedir una frase que dice ser de otra.
Las dos del servidor caído —`acceso.sin_servidor` y `acceso.reintentar`— **se quedan donde
nacieron** y las demás pantallas las piden con ese nombre: una clave no se renombra, y renombrarla
para que quede prolija es exactamente lo que la regla prohíbe.

**Cinco frases no están ahí**, a propósito: las que hacen falta cuando ese archivo no llegó. Viven
adentro de `js/catalogo.js`, con sus tres idiomas, y `verificar_frases.mjs` comprueba que no estén
además en el catálogo.

### 3.2 Las pantallas piden por clave, como ya pedían la marca

El mecanismo ya existía para la marca: `_applyBranding()` (`js/apiClient.js:125`) recorre la
pantalla al cargar y reemplaza el nombre y el logotipo de la Prestadora. El texto va igual:

```html
<button data-frase="acceso.entrar">Entrar</button>
<input data-frase-placeholder="clave.minimo" data-huecos='{"cuantos":8}' placeholder="…" />
```

`data-frase` cambia lo que se lee adentro del elemento; `data-frase-<atributo>` cambia un atributo
—`placeholder`, `aria-label`, `title`—; `data-huecos` trae lo que va adentro de los huecos. Se
llama `data-huecos` y no `data-frase-huecos` a propósito: todo lo que empieza con `data-frase-` es
el nombre de un atributo para traducir.

Lo escrito adentro queda como está y es lo que se ve **antes** de que responda el catálogo —igual
que con la marca—, así que una pantalla nunca aparece vacía.

**Lo que arma el código**, y por lo tanto no está escrito en ninguna pantalla, se marca igual y
después pide la traducción de ese pedazo: `Catalogo.traducir(elemento)`. Así lo hacen el botón de
ver la contraseña (`js/clave.js:147`) y los avisos de `acceso.html`. La ventaja no es de estilo:
**un texto escrito a mano se queda en el idioma en que nació**, y si la persona cambia de idioma
con el cartel en pantalla, el cartel no se entera.

**Por qué así y no con un armador de proyectos:** este producto no tiene herramienta de armado, y
esperar a tenerla es esperar a la migración a React. El atributo funciona hoy, en las catorce
pantallas y en las dos aplicaciones del teléfono, sin instalar nada. Y cuando llegue React, las
claves ya están puestas: se cambia quién las lee, no dónde están.

### 3.3 De dónde sale el idioma

`Catalogo.idiomaDelEntorno()`, y por ahora sin selector visible. En orden: lo que diga
`?idioma=` en la dirección, después lo guardado de la vez anterior, después lo que declara el
navegador. `es-419` y `pt-PT` caen en `es-AR` y `pt-BR` por la raíz, no por una lista escrita a
mano. `Catalogo.cambiarIdioma()` cambia la pantalla entera sin recargarla y guarda la elección.

**El selector visible todavía no se puso, y es a propósito**: dónde va en el encabezado de catorce
pantallas es una decisión de diseño, y ésas se consultan. Es la primera mitad de la decisión 1 de
la sección 5, que ya está tomada; falta la segunda.

### 3.4 El chequeo que falla cuando falte una traducción

`scripts/verificar_frases.mjs`, con la forma de sus hermanos, que corren antes de cada `commit`.
Entra solo en `verificar_todo.mjs`, que busca sus hermanos por el nombre.

1. Toda clave nombrada en una pantalla existe en el catálogo.
2. Toda clave del catálogo tiene los tres idiomas, sin ninguno vacío.
3. Ninguna clave del catálogo quedó sin usar.
4. Ninguna pantalla ya convertida volvió a tener texto escrito a mano.
5. Ninguna de las cinco frases de arranque está además en el catálogo.

El punto 4 es el que sostiene todo lo demás: sin él, la pantalla siguiente vuelve a nacer en un
solo idioma y nadie se entera hasta que un cliente la abre. Ve las claves puestas desde el código
—`setAttribute`, ternarios— y no sólo las escritas en el HTML.

### 3.5 En qué orden

Por lo que ya se midió, y de a una pantalla por vez:

1. **`js/texto.js` y los mensajes de error primero.** ✔ Hecho. Son pocos, los ve cualquiera de las
   tres puntas, y un mensaje de error es texto visible: se traduce y sale del catálogo.
   `Texto.claveDeError()` clasifica la falla y devuelve una clave; la frase la pone el catálogo.
2. **`acceso.html`**, entera, incluidos el botón de ver la contraseña y los avisos que escribe el
   código. ✔ Hecha. Es la pantalla chica que ejercita todas las formas del mecanismo.
3. **`recuperar-clave.html` y `nueva-clave.html`**, las dos que completan el camino de la
   contraseña. ✔ Hechas. **Se adelantaron al paso 4 a propósito**, y conviene decir por qué: el
   paso siguiente son las seis pantallas grandes, donde están los 91 párrafos de venta y de aviso
   legal, que son justamente los que la decisión 2 todavía no resolvió quién traduce. Estas dos son
   casi todo rótulo corto, así que avanzan el trabajo sin adelantarse a esa decisión. De paso
   cierran el camino entero: quien no puede entrar pide el enlace y elige contraseña nueva sin
   cambiar de idioma en el medio, que era lo que pasaba si se convertía sólo el acceso.
4. **`examen.html`**, por el mismo motivo que las dos anteriores: es chica y es casi toda rótulo.
   ✔ Hecha. Aportó lo que ninguna otra había pedido todavía —**el singular y el plural**—, y con
   eso la regla que vale para las 41 que faltan: **son dos frases distintas y no una armada con
   pedazos**. «Rendida 3 veces» no se arma pegando «Rendida», el número y «veces»: cada idioma
   arma su oración y elige su plural, así que hay `examen.rendida_una` y `examen.rendida_varias`,
   y el número entra en un hueco. Son ocho pares así en esta sola pantalla.
5. **Las seis pantallas grandes**, que son el 64 %.
6. **Las nueve chicas.**
7. **Los `alt`, los `aria-label` y las `meta`**, todos juntos al final, que son 84 y se hacen de
   una pasada.

---

## 4. Lo que este plan no resuelve

- **Quién traduce.** Es la decisión 2 de abajo, la única que sigue abierta.
- **Los nombres comerciales.** La regla de la empresa los exceptúa: un plan que se llama de una
  manera se llama igual en los tres idiomas. Hay que marcarlos para que el chequeo no los pida.
- **«PresDemo».** Ya no está. Aparecía 19 veces en la cuenta y **no era texto para traducir**: era
  el nombre de la Prestadora de ejemplo escrito a mano. El 26 de agosto de 2026 pasó a ser el
  marcador `{{organizacion}}`, que se resuelve al cargar, así que esas 19 salieron de la cuenta sin
  que hubiera que traducir ninguna.
- **Las nueve ilustraciones.** Varias tienen texto adentro del dibujo. Eso no se traduce con un
  catálogo y va con el pendiente 16.

---

## 5. Las decisiones

1. **Cómo se elige el idioma.** ✔ Tomada como se recomendaba: el navegador como valor de arranque
   y un selector visible que lo pise. Lo primero está construido (3.3). **El selector visible falta
   y no se pone solo**: dónde va en el encabezado es diseño, y eso se consulta.
2. **Quién traduce las 751.** ⏳ **Abierta.** Una máquina y después alguien que revise, o alguien
   desde el principio. Es una decisión de plata y de calidad, y **también es un caso de «evaluar qué
   tareas conviene dejarle a una IA»**: los 660 rótulos cortos los hace bien una máquina, los 91
   párrafos son texto de venta y de aviso legal, y ahí la máquina no alcanza. Las 71 que ya están
   las tradujo la línea de comandos, y son todas rótulos y avisos cortos: **mientras esto siga
   abierto, se convierten pantallas de rótulo y no pantallas de párrafo**, para no dejar traducido
   por una máquina justo lo que la decisión iba a mandar a una persona.
3. **Si se hace antes de React o adentro.** ✔ Tomada: antes, como se recomendaba, por lo que decía
   el propio pendiente —cada pantalla nueva lo encarece, y la migración va a agregar pantallas.
4. **Qué pasa con `pt-BR` y el trato.** ✔ Resuelta, y hacía falta el mismo día: «publicá-lo», que
   en portugués es lo normal, se leía como un voseo, y «cuidador», que en portugués es la palabra
   correcta, es la que el vocabulario prohíbe en castellano. `scripts/texto_visible.mjs` tiene
   ahora `soloCastellano()`, que deja fuera lo rotulado `en` y `pt-BR`; lo usan
   `verificar_trato.mjs` y `verificar_vocabulario.mjs`, y **se reconoce por la clave, no por las
   palabras**. Los chequeos que valen para los tres idiomas siguen viendo todo.
5. **Si el catálogo de frases es un archivo o una tabla.** ✔ Tomada como se recomendaba: archivo
   por ahora, y viaja junto con los otros seis cuando se haga el pendiente 7. El único lugar que
   sabe de dónde sale es `_traer()` en `js/catalogo.js`.

### 5.1 Lo que conviene que el Desarrollador confirme

No traba nada —está escrito y funcionando—, pero son palabras del negocio en dos idiomas y las
puso la línea de comandos:

| Castellano | `en` | `pt-BR` |
|---|---|---|
| Prestadora | Provider | Prestadora |
| Asistente | Caregiver | Assistente |
| legajo | personal file | cadastro |
| Aviso | Listing | Anúncio |
| Acompañamiento | Companionship | Acompanhamento |

`Caregiver` es además el término que ya usa la base (`caregivers`), así que en inglés no hay
elección real. Los otros cuatro sí son elegibles. `Aviso` y `Acompañamiento` entraron el 26 de
agosto de 2026 con la barra y el pie de `directorio.html`, que las repiten ocho pantallas.

---

## 6. Riesgos

- **La pantalla convertida a medias.** Media pantalla en castellano y media en inglés es peor que
  toda en castellano. Por eso se convierte de a una pantalla entera, y el chequeo del punto 3.4.4
  la mira completa. **Ya pasó una vez**, y no con el HTML sino con lo que escribe el código: el
  aviso de `acceso.html` se quedaba en castellano al cambiar de idioma porque nació como texto y
  no como clave.
- **El cartel que se abre antes de que llegue el catálogo.** `Catalogo.frase()` no espera —está
  hecha para que se la llame mientras se dibuja—, así que un aviso que se abre durante el arranque
  la llama con el archivo todavía en camino: devuelve vacío, anota «no existe» en la consola, y el
  cartel muestra el error genérico en vez del que correspondía. Apareció en `nueva-clave.html`, con
  el enlace vencido, que es el único aviso que se abre solo apenas carga la pantalla; en
  `acceso.html` el mismo error estaba escrito y no se veía nunca, porque ahí los carteles los abre
  la persona y para entonces el catálogo ya llegó. **La regla que queda:** lo que se abre solo pide
  `Catalogo.traducir(elemento)`, que sí espera; `frase()` es para lo que se dibuja a pedido. Los
  tres avisos de la sesión están escritos así, y el respaldo genérico se pone después, sólo si
  quedó vacío. Los 16 chequeos no lo veían: apareció mirando la consola del navegador.
- **La frase partida en pedazos.** Hoy hay texto armado con `+` desde los guiones —«Quedan 3
  intentos»—. Traducido pedazo por pedazo sale mal en cualquier idioma que ordene distinto. Esas
  145 apariciones se convierten en frases con huecos, no en pedazos sueltos.
- **El archivo que no llega.** Si el catálogo no se puede traer, lo que se ve es el castellano que
  la pantalla trae adentro, y `lang` se deja como está: declarar inglés sobre texto castellano hace
  que un lector de pantalla lo pronuncie mal. Se comprobó escondiendo el archivo, y ahí aparecieron
  dos fallas de verdad, ya corregidas.
- **El texto legal.** Los avisos legales no se traducen: **salen del documento legal de ese país**,
  y si el país no tiene documento no hay aviso. Eso ya está escrito en la regla de la empresa y no
  cambia acá.
