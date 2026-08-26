# Plan: los tres idiomas

> **Esto es una propuesta, no un cambio hecho.** La regla de la empresa «antes de un cambio grande»
> pide inventario, después plan, y recién después tocar código. Acá están los dos primeros pasos.
> **Falta la aprobación del Desarrollador, y las cinco decisiones de la sección 5.**
>
> Corresponde al pendiente 9. Cuando se ejecute, este archivo se borra.

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

### 2.3 Lo que ya está resuelto sin que nadie se lo propusiera

Tres cosas quedaron afuera de la cuenta, y no por descuido:

- **Las opciones de los catálogos.** Las 133 de `data/catalogo-vocabularios.json` más las fichas
  de los demás `data/catalogo-*.json` no están escritas en ninguna pantalla: la pantalla pide la
  clave y el catálogo devuelve el texto. **Ahí el idioma entra por un solo lugar.** Hoy esos
  archivos tienen una sola columna, `es-AR`; agregarle dos columnas es agregar dos columnas.
- **Las fechas.** `Texto.fechaCorta()` (`js/texto.js:57`) es el único lugar del proyecto donde se
  le da forma a una fecha. El idioma le entra por ahí y no hay que buscarlo pantalla por pantalla.
- **El aviso del chat.** `data/patrones-contacto.json` nació el 26 de agosto de 2026 con los tres
  idiomas adentro, porque para entonces la regla ya estaba escrita.

Los tres son el mismo argumento a favor de hacerlo ahora: **lo que ya sale de un catálogo no
costó nada**. Lo que cuesta son las 751 que no.

---

## 3. Lo que se propone construir

### 3.1 Un catálogo de textos, con la misma forma que los que ya hay

`data/catalogo-textos.json`, hermano de los seis que ya existen y leído por el mismo `js/catalogo.js`:

```json
{
  "textos": {
    "acceso.entrar": {
      "es-AR": "Ingresar",
      "en": "Sign in",
      "pt-BR": "Entrar"
    }
  }
}
```

La clave se nombra `pantalla.cosa`. **Se nombra por lo que hace y no se renombra**, que es la regla
de «lo que se guarda para siempre»: la clave es lo guardado, el texto es lo visible.

### 3.2 Las pantallas piden por clave, como ya piden la marca

El mecanismo existe y funciona: `_applyBranding()` (`js/apiClient.js:76`) ya recorre la pantalla al
cargar y reemplaza el nombre y el logotipo de la Prestadora. Se propone lo mismo para el texto:

```html
<button data-texto="acceso.entrar">Ingresar</button>
```

Lo escrito adentro queda como está y es lo que se ve **antes** de que responda el catálogo —igual
que hoy con la marca—, así que una pantalla nunca aparece vacía.

**Por qué así y no con un armador de proyectos:** este producto no tiene herramienta de armado, y
esperar a tenerla es esperar a la migración a React. El atributo funciona hoy, en las catorce
pantallas y en las dos aplicaciones del teléfono, sin instalar nada. Y cuando llegue React, las
claves ya están puestas: se cambia quién las lee, no dónde están.

### 3.3 Un chequeo que falle cuando falte una traducción

`scripts/verificar_textos.mjs`, con la forma de los catorce que ya corren antes de cada `commit`:

1. Toda clave nombrada en una pantalla existe en el catálogo.
2. Toda clave del catálogo tiene los tres idiomas, sin ninguno vacío.
3. Ninguna clave del catálogo quedó sin usar.
4. Ninguna pantalla ya convertida volvió a tener texto escrito a mano.

El punto 4 es el que sostiene todo lo demás: sin él, la pantalla siguiente vuelve a nacer en un
solo idioma y nadie se entera hasta que un cliente la abre.

### 3.4 En qué orden

Por lo que ya se midió, y de a una pantalla por vez:

1. **`js/texto.js` y los mensajes de error primero.** Son pocos, los ve cualquiera de las tres
   puntas, y un mensaje de error es texto visible: se traduce y sale del catálogo.
2. **Las seis pantallas grandes**, que son el 64 %.
3. **Las nueve chicas.**
4. **Los `alt`, los `aria-label` y las `meta`**, todos juntos al final, que son 84 y se hacen de
   una pasada.

---

## 4. Lo que este plan no resuelve

- **Cómo se elige el idioma.** Es la decisión 1 de abajo.
- **Quién traduce.** Es la decisión 2.
- **Los nombres comerciales.** La regla de la empresa los exceptúa: un plan que se llama de una
  manera se llama igual en los tres idiomas. Hay que marcarlos para que el chequeo no los pida.
- **«PresDemo».** Aparece 19 veces en la cuenta y **no es texto para traducir**: es el pendiente 11
  y tiene su propio plan en `docs/PLAN_PRESTADORA.md`. Si ese se hace antes, estas 19 se van solas.
- **Las nueve ilustraciones.** Varias tienen texto adentro del dibujo. Eso no se traduce con un
  catálogo y va con el pendiente 16.

---

## 5. Lo que hay que decidir antes de empezar

1. **Cómo se elige el idioma.** Tres caminos, y no son excluyentes: lo que declara el navegador;
   un selector visible; o lo guardado en el legajo de esa persona. **Se recomienda el navegador
   como valor de arranque y un selector visible que lo pise**, porque el navegador acierta casi
   siempre y el selector arregla el caso en que no.
2. **Quién traduce las 751.** Una máquina y después alguien que revise, o alguien desde el
   principio. Es una decisión de plata y de calidad, y **también es un caso de «evaluar qué tareas
   conviene dejarle a una IA»**: los 660 rótulos cortos los hace bien una máquina, los 91 párrafos
   son texto de venta y de aviso legal, y ahí la máquina no alcanza.
3. **Si se hace antes de React o adentro.** Hoy el pendiente 9 está anotado como «se resuelve
   dentro de la migración a React». **Se recomienda hacerlo antes**, por lo que dice el propio
   pendiente: cada pantalla nueva lo encarece, y la migración va a agregar pantallas.
4. **Qué pasa con `pt-BR` y el trato.** El chequeo `verificar_trato.mjs` mira que no se tutee, y
   está escrito para el castellano. En portugués «você» es la forma corriente y no es tutear. Hay
   que decidir si el chequeo se enseña a distinguir el idioma o si sólo mira `es-AR`.
5. **Si el catálogo de textos es un archivo o una tabla.** Los seis catálogos de hoy son archivos y
   el pendiente 7 dice que todos tienen que terminar en tablas. **Se recomienda archivo por ahora**
   y que viaje junto con los otros seis cuando ese pendiente se haga: partirlo en dos formas
   distintas es trabajo de más para el mismo final.

---

## 6. Riesgos

- **La pantalla convertida a medias.** Media pantalla en castellano y media en inglés es peor que
  toda en castellano. Por eso se convierte de a una pantalla entera, y el chequeo del punto 3.3.4
  la mira completa.
- **La frase partida en pedazos.** Hoy hay texto armado con `+` desde los guiones —«Quedan 3
  intentos»—. Traducido pedazo por pedazo sale mal en cualquier idioma que ordene distinto. Esas
  145 apariciones se convierten en frases con huecos, no en pedazos sueltos.
- **El texto legal.** Los avisos legales no se traducen: **salen del documento legal de ese país**,
  y si el país no tiene documento no hay aviso. Eso ya está escrito en la regla de la empresa y no
  cambia acá.
