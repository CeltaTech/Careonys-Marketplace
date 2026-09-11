# Plan: los tres idiomas

> **El mecanismo está construido y funcionando, y mudar las frases está terminado.**
> Medido el 9 de septiembre de 2026 con `node scripts/inventario_textos.mjs`: **0 apariciones de
> texto escrito a mano en 0 archivos**, y **967 frases** en los tres idiomas repartidas en **17 de
> 54 archivos convertidos**. Las dos pantallas que faltaban se cerraron ese día por caminos
> distintos: `mockup-app.html` se convirtió, y `formulario-integral.html` —que era una hoja de
> muestra y ya había cumplido su función— salió de uso y se apartó a `fuera de uso/`, que ningún
> chequeo abre (`scripts/recorrido.mjs:103`); el porqué está en `docs/ALCANCE.md`. Sus 119 frases
> se fueron con ella sin traducirse, y no se tiró nada: la pantalla sigue entera adentro de la
> cuarentena. **La mitad de los datos ya no falta, y se miró antes de decirlo:**
> `data/catalogo-oferta.json` tiene sus 15 fichas en los tres idiomas y
> `data/catalogo-vocabularios.json` sus 26 listas con 150 opciones, 149 de ellas en los tres
> idiomas; la única que sigue sólo en castellano es `guardia_12`, y es a propósito, marcada
> `i18n_pendiente` y con el motivo escrito al lado
> (`supabase/migrations/0002_siembra_ficticia.sql:416`). Queda además la única decisión abierta del
> Desarrollador —quién traduce—, que es la número 2 de la sección 5.
>
> Corresponde al pendiente 9. Cuando esté todo convertido, este archivo se borra. **La conversión
> ya está toda hecha, así que lo único que lo sostiene en pie es la sección 5**: el selector de
> idioma visible, que es una decisión de diseño, y quién revisa las 967 frases traducidas por la
> línea de comandos. Contestadas esas dos, el archivo se borra.

---

## 1. En una línea

**No queda ninguna frase escrita a mano adentro de una pantalla** —eran 751 el día que se escribió
este plan y 182 el 8 de septiembre de 2026—. La regla pide `es-AR`, `en` y `pt-BR` desde el primer
día. No era un trabajo de traducir: era un trabajo de **sacar las frases de donde estaban** y dejar
en su lugar una llamada al catálogo. Eso terminó el 9 de septiembre de 2026. Traducir viene después
y es lo barato, y es lo único que este plan todavía mira.

---

## 2. Inventario

Medido el 8 de septiembre de 2026 con `scripts/inventario_textos.mjs`, que se vuelve a correr cuando
haga falta. **No es un chequeo**: no falla nunca y no entra en `verificar_todo.mjs`.

```bash
node scripts/inventario_textos.mjs
```

| | |
|---|---:|
| Apariciones de texto visible | 0 |
| Archivos donde aparecen | 0 |
| **Frases distintas, que es lo que hay que traducir** | **0** |
| Apariciones que repiten una frase ya contada | 0 |
| De esas frases, las que pasan las 12 palabras (párrafos, no rótulos) | 0 |

La medición del 8 de septiembre de 2026, que es contra la que se cerró el trabajo, daba 234
apariciones en 2 archivos y 182 frases distintas. Las tablas que siguen son ésa, y quedan porque
explican de dónde salió lo que hoy está en el catálogo.

### 2.1 Por tipo

| Tipo | Cuántas |
|---|---:|
| Texto suelto entre etiquetas | 190 |
| Texto armado desde un guion | 20 |
| `placeholder` de un campo | 15 |
| `alt` de una imagen | 8 |
| `meta name="description"` | 1 |

Los dos últimos grupos son chicos pero **no son opcionales**: el `alt` es lo que oye quien no ve la
pantalla, y la `meta description` es lo que muestra el buscador. Una traducción que se olvida de
ellos deja a esas personas en el idioma equivocado. De `aria-label`, de `title` y del rótulo de un
botón ya no queda ninguno: esos tres grupos están enteros en el catálogo.

### 2.2 Por archivo

| Archivo | Apariciones |
|---|---:|
| `formulario-integral.html` | 119 |
| `mockup-app.html` | 115 |

No había tercero: **esos dos archivos eran las 234 apariciones enteras**. Las 115 de
`mockup-app.html` están hoy en el catálogo; las 119 de `formulario-integral.html` se fueron con la
pantalla, que salió de uso el 9 de septiembre de 2026 y está en `fuera de uso/`. Los demás que
figuraban acá el 26 de agosto de 2026 ya no tenían ni una frase escrita a mano, `js/main.js`
incluido.

### 2.2.1 Por qué el inventario cuenta lo que cuenta

**Esto es historia, y queda porque explica el guion que da los números de arriba.** El 27 de agosto
de 2026 el inventario contaba de más: decía que faltaban 479 frases distintas y faltaban 414. La
diferencia no era trabajo hecho, era ruido. De los 122 textos que decía sacar de los guiones, **30
eran texto y 92 no**.

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
  `js/catalogo.js:109` en lugar del archivo de frases, así que compararla contra el archivo daba
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

**Los siete archivos que quedaban ese día eran exactamente los seis trabados más `js/main.js`.** No
era casualidad: era lo que decía la lista de trabas, ya sin ruido encima. De aquellos siete hoy
quedan dos, y `js/main.js` no es ninguno de los dos.

### 2.3 Lo que ya estaba resuelto sin que nadie se lo propusiera

Tres cosas quedaron afuera de la cuenta, y no por descuido:

- **Las opciones de los catálogos.** Las 150 de `data/catalogo-vocabularios.json` —repartidas en 26
  listas— más las 15 fichas de `data/catalogo-oferta.json` y las de los demás
  `data/catalogo-*.json` no están escritas en ninguna pantalla: la pantalla pide la clave y el
  catálogo devuelve el texto. **Ahí el idioma entra por un solo lugar**, y por eso ya está hecho: al
  8 de septiembre de 2026 esos archivos tienen las tres columnas y **149 de las 150 opciones están
  en los tres idiomas**. La que falta es `guardia_12`, sin `en` ni `pt-BR` a propósito, marcada
  `i18n_pendiente` y con el motivo escrito al lado
  (`supabase/migrations/0002_siembra_ficticia.sql:416`). Y no depende de que alguien se acuerde: la
  base lo exige por esquema, con `i18n_completo()`
  (`supabase/migrations/0001_base_del_esquema.sql:378`) adentro de la restricción de cada tabla que
  guarda texto visible.
- **Las fechas.** `Texto.fechaCorta()` (`js/texto.js:132`) es el único lugar del proyecto donde se
  le da forma a una fecha. El idioma le entra por ahí y no hay que buscarlo pantalla por pantalla.
- **El aviso del chat.** `data/patrones-contacto.json` nació el 26 de agosto de 2026 con los tres
  idiomas adentro, porque para entonces la regla ya estaba escrita.

Los tres son el mismo argumento a favor de haberlo hecho entonces: **lo que ya salía de un catálogo
no costó nada**. Lo que costó fueron las 182 que no, y se terminaron de pagar el 9 de septiembre de
2026.

---

## 3. Lo que está construido

Las cuatro piezas de abajo existen y corren. Lo que sigue abierto es mudar las frases de las dos
pantallas que faltan.

### 3.1 El catálogo de frases

`data/catalogo-frases.json`, hermano de los otros siete `data/catalogo-*.json` y leído por el mismo
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
esperar a tenerla es esperar a la migración a React. El atributo funciona hoy, en las dieciséis
pantallas y en las dos aplicaciones del teléfono, sin instalar nada. Y cuando llegue React, las
claves ya están puestas: se cambia quién las lee, no dónde están.

### 3.3 De dónde sale el idioma

`Catalogo.idiomaDelEntorno()`, y por ahora sin selector visible. En orden: lo que diga
`?idioma=` en la dirección, después lo guardado de la vez anterior, después lo que declara el
navegador. `es-419` y `pt-PT` caen en `es-AR` y `pt-BR` por la raíz, no por una lista escrita a
mano. `Catalogo.cambiarIdioma()` cambia la pantalla entera sin recargarla y guarda la elección.

**El selector visible todavía no se puso, y es a propósito**: dónde va en el encabezado de dieciséis
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
6. Ninguna fecha, hora o importe lleva el idioma escrito adentro.
7. Ningún módulo se guarda el idioma, ni se lo pisa al catálogo.

Son siete y no cinco: las dos últimas se sumaron después de escrito este plan, y valen para todo
archivo, esté convertido o no. Al 8 de septiembre de 2026 el chequeo pasa con 937 frases en los tres
idiomas y 16 de 55 archivos convertidos.

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
   eso la regla que vale para las dos que faltan: **son dos frases distintas y no una armada con
   pedazos**. «Rendida 3 veces» no se arma pegando «Rendida», el número y «veces»: cada idioma
   arma su oración y elige su plural, así que hay `examen.rendida_una` y `examen.rendida_varias`,
   y el número entra en un hueco. Son ocho pares así en esta sola pantalla.
5. **Las seis pantallas grandes**, que eran el 64 %. ✔ Hechas. Cuatro se convirtieron entre el 26 de
   agosto y el 2 de septiembre de 2026 —`registrar-asistente.html`, `pwa-asistente/index.html`,
   `index.html` y `solicitar-asistente.html`—, `mockup-app.html` el 9 de septiembre, y la sexta,
   `formulario-integral.html`, se cerró ese mismo día por la otra salida: salió de uso.
6. **Las nueve chicas.** ✔ Hechas.
7. **Los `alt`, los `aria-label` y las `meta`**, todos juntos al final. ✔ Hechos: no queda ninguno
   escrito a mano. Los 8 `alt` y la `meta description` que quedaban el 8 de septiembre de 2026
   estaban en las dos pantallas del punto 5, y se cerraron con ellas.

---

## 4. Lo que este plan no resuelve

- **Quién traduce.** Es la decisión 2 de abajo, la única que sigue abierta.
- **Los nombres comerciales.** La regla de la empresa los exceptúa: un plan que se llama de una
  manera se llama igual en los tres idiomas. ✔ Ya están marcados: son las 10 claves de
  `IGUALES_EN_TODOS` (`scripts/verificar_frases.mjs:80`) —las cuatro redes sociales, los tres
  medios que cita la portada, el nombre comercial de los cursos y los dos marcadores de marca—, y
  el chequeo no les pide traducción.
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
2. **Quién traduce.** ⏳ **Abierta.** Una máquina y después alguien que revise, o alguien desde el
   principio. Es una decisión de plata y de calidad, y **también es un caso de «evaluar qué tareas
   conviene dejarle a una IA»**. Ya no mira hacia adelante: no falta ninguna frase por convertir
   desde el 9 de septiembre de 2026.
   **Y el resguardo que este renglón traía escrito ya no se sostiene**, así que conviene decirlo con
   el número medido: decía «mientras esto siga abierto, se convierten pantallas de rótulo y no
   pantallas de párrafo», y las pantallas de párrafo se convirtieron igual. De las 937 frases que
   hoy están en los tres idiomas **150 pasaban las 12 palabras**, y las tradujo la línea de comandos:
   la portada, la de solicitar Asistente, el panel de la Prestadora y el alta del legajo son las que
   más ponen. O sea que esta decisión ya no mira sólo hacia adelante —quién traduce lo que falta—
   sino también hacia atrás: **quién revisa esas 150**.
3. **Si se hace antes de React o adentro.** ✔ Tomada: antes, como se recomendaba, por lo que decía
   el propio pendiente —cada pantalla nueva lo encarece, y la migración va a agregar pantallas.
4. **Qué pasa con `pt-BR` y el trato.** ✔ Resuelta, y hacía falta el mismo día: «publicá-lo», que
   en portugués es lo normal, se leía como un voseo, y «cuidador», que en portugués es la palabra
   correcta, es la que el vocabulario prohíbe en castellano. `scripts/texto_visible.mjs` tiene
   ahora `soloCastellano()`, que deja fuera lo rotulado `en` y `pt-BR`; lo usan
   `verificar_trato.mjs` y `verificar_vocabulario.mjs`, y **se reconoce por la clave, no por las
   palabras**. Los chequeos que valen para los tres idiomas siguen viendo todo.
5. **Si el catálogo de frases es un archivo o una tabla.** ✔ Tomada como se recomendaba: archivo
   por ahora, y viaja junto con los otros siete cuando se haga el pendiente 7. El único lugar que
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
  quedó vacío. Los chequeos de entonces no lo veían: apareció mirando la consola del navegador.
- **La frase partida en pedazos.** Hoy hay texto armado con `+` desde los guiones —«Quedan 3
  intentos»—. Traducido pedazo por pedazo sale mal en cualquier idioma que ordene distinto. Esas
  apariciones se convierten en frases con huecos, no en pedazos sueltos. Al 8 de septiembre de 2026
  quedan 20, todas adentro de las dos pantallas que faltan.
- **El archivo que no llega.** Si el catálogo no se puede traer, lo que se ve es el castellano que
  la pantalla trae adentro, y `lang` se deja como está: declarar inglés sobre texto castellano hace
  que un lector de pantalla lo pronuncie mal. Se comprobó escondiendo el archivo, y ahí aparecieron
  dos fallas de verdad, ya corregidas.
- **El texto legal.** Los avisos legales no se traducen: **salen del documento legal de ese país**,
  y si el país no tiene documento no hay aviso. Eso ya está escrito en la regla de la empresa y no
  cambia acá.
