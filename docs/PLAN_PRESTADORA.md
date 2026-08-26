# Plan: sacar a «PresDemo» de las pantallas

> **Esto es una propuesta, no un cambio hecho.** El `CLAUDE.md` §6 pide inventario, después plan,
> y recién después tocar código. Acá están los dos primeros pasos. **Falta la aprobación del
> Desarrollador.**
>
> Corresponde al pendiente 11. Cuando se ejecute, este archivo se borra.

---

## 1. Qué es PresDemo y por qué molesta

PresDemo es una Prestadora **inventada**, montada como ejemplo para probar el producto y para
mostrárselo a un cliente. No existe: sus datos y sus fotos son ficticios.

El problema no es que sea ficticia. Es que su nombre está **escrito adentro de las pantallas**,
111 veces en 18 archivos. Cuando haya una segunda Prestadora usando el producto, cada uno de esos
lugares le va a mostrar el nombre de otra empresa.

Eso choca con dos reglas escritas:

- **`CLAUDE.md` §2:** *"¿Esto funciona correctamente cuando existan cientos de Prestadoras usándolo
  simultáneamente?"* — hoy la respuesta es no.
- **`CLAUDE.md`, «nunca hardcodear»:** nada de texto visible escrito a mano. La marca de la Prestadora es
  un dato de la Prestadora, no una constante del programa.

Está escrito además con **tres grafías distintas** —`PresDemo`, `PrestDemo`, `Presdemo`—, lo que
muestra hasta qué punto no hay una única fuente.

---

## 2. Inventario

Medido el 23 de agosto de 2026, cargando las 12 pantallas y comparándolas contra los selectores que
`js/apiClient.js:_applyBranding` ya reemplaza.

### 2.1 Lo que ya está resuelto y no se ve

**32 de las apariciones ya se reemplazan solas al cargar.** `_applyBranding()`
(`js/apiClient.js:76-115`) pisa el nombre en `.tenant-name`, `.navbar-logo span` y `.logo span`, y
la imagen en `.logo-brand`, `.tenant-logo`, `.navbar-logo img` y `.logo img`. Lo escrito en el HTML
ahí es solo lo que se ve **antes** de que responda la base.

O sea: el mecanismo existe y funciona. Lo que falta es cobertura, no invención.

### 2.2 Lo que queda suelto: 43 apariciones

| Grupo | Cuántas | Dónde |
|---|---:|---|
| `<title>` de cada pantalla | 10 | las 10 del sitio |
| `alt` de las imágenes de logotipo | 17 | todas las pantallas |
| Línea de copyright del pie (`© 2025 PresDemo — Servicios de Cuidado`) | 8 | todas menos `index.html` |
| `<meta name="description">` | 2 | `index.html`, `registrar-asistente.html` |
| Texto legal y operativo | 5 | `panel-prestadora.html` (4: encabezado, operador de RRHH, resolución, nota legal) y `directorio.html` (1: el `title` del sello de auditoría) |
| Texto armado desde JavaScript | 1 | `panel-prestadora.html:211`, la nota por defecto de la entrevista |

### 2.3 Lo que no es texto de pantalla

| Qué | Dónde | Por qué es aparte |
|---|---|---|
| El archivo del logotipo se llama `logo_presdemo.png` | `assets/images/`, enlazado 17 veces | Un nombre de archivo con la marca adentro obliga a renombrar archivos cuando cambia el cliente. Mismo error que ya se corrigió con `logotipo.png`. |
| El identificador `presdemo` y su UUID escritos en el remiendo | `js/apiClient.js:40, 55-58, 69-71`, ×3 copias | Cuando la base no responde, el programa **inventa** esta Prestadora y sigue sin avisar. Es el pendiente 2. |
| Dos comentarios | `css/mockup-app.css:3`, `css/styles.css:1507` | No se ven. Se corrigen de paso. |

---

## 3. Plan propuesto

La idea es la misma que ya funcionó con el nombre del producto, pero con una diferencia importante:
**el nombre de la Prestadora no se sabe hasta que responde la base.** Por eso no alcanza con
resolver marcadores al cargar la página; hay que resolverlos **cuando llega el dato**.

### Paso 1 — Marcadores de Prestadora

Se agrega un segundo juego de marcadores, resueltos por `_applyBranding()` en vez de por
`js/identidad.js`:

    {{prestadora}}        el nombre completo de la Prestadora de la sesión
    {{prestadoraCorta}}   su nombre corto, para títulos
    {{prestadoraLogo}}    la ruta de su logotipo

`_applyBranding()` pasa a hacer lo que ya hace **más** una recorrida de marcadores igual a la de
`js/identidad.js` —texto visible, atributos, `<title>`—. Los selectores actuales se quedan como
están: hoy funcionan y sacarlos sería romper algo que anda.

### Paso 2 — Qué se ve mientras tanto

Una pantalla que todavía no recibió el dato **no puede mostrar el nombre de nadie**. Dos opciones,
y hay que elegir una:

- **(a)** El marcador queda a la vista un instante. Es lo que hace `js/identidad.js`, y ahí está
  bien: si el archivo no carga, se ve el desperfecto. Acá se vería en cada carga, aunque todo
  funcione.
- **(b)** El HTML trae texto neutro —«Servicios de Cuidado», sin nombre— y el dato lo reemplaza.
  Nunca se ve un marcador ni el nombre equivocado. **Es la que se recomienda.**

### Paso 3 — Lo que no es texto

- El logotipo pasa a `assets/images/logo_prestadora_ejemplo.png`, o mejor a un logotipo genérico:
  el de una Prestadora concreta no debería estar en el repositorio del producto.
- El remiendo de `js/apiClient.js:53` deja de inventar una Prestadora. **Ese es el pendiente 2 y no
  se arregla acá**, pero conviene hacerlos juntos: mientras el remiendo exista, sacar el nombre de
  las pantallas no cambia lo que se ve.
- Los dos comentarios se corrigen de paso. `data/cuidadores.json`, que también nombraba a la
  Prestadora de ejemplo, ya no está: se borró el 24 de agosto de 2026 con el pendiente 14.

### Paso 4 — Que no vuelva

`scripts/verificar_identidad.mjs` ya sabe fallar cuando aparece un nombre escrito a mano. Se le
agrega el nombre de la Prestadora de ejemplo a la lista de lo prohibido, con una excepción: los
datos de muestra de `data/`, que son datos y no pantalla.

---

## 4. Lo que hay que decidir antes de empezar

1. **Paso 2, opción (a) o (b).** Se recomienda (b).
2. **Si PresDemo sigue existiendo.** Es útil para mostrarle el producto a un cliente. La propuesta
   es que siga, pero como **fila en la base**, no como texto en las pantallas.
3. **Si el logotipo de ejemplo queda en el repositorio** o se reemplaza por uno genérico.
4. **Si se hace junto con el pendiente 2** —el remiendo que inventa una Prestadora— o después.

---

## 5. Riesgos

- **`_applyBranding()` está triplicado byte a byte** en las tres copias de `apiClient.js`
  (pendiente 13). Todo cambio va tres veces, y nada garantiza que sigan iguales. Se puede aplicar
  el mismo remedio que a `identidad.js`: que el chequeo verifique las tres copias.
- **La base no responde** (pendiente 2), así que hoy no se puede probar con una Prestadora de
  verdad. La prueba honesta es con **dos** Prestadoras ficticias distintas, que es lo que pide el
  `CLAUDE.md` §2: una sola no distingue «anda» de «siempre muestra la misma».
- **Es una recorrida del documento más por página.** Medible, chico, pero se mide.
