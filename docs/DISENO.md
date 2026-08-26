# Sistema de diseño — equivalencias con Careonys

> **Conclusión primero.** De las 32 variables de `css/styles.css`, **20 tienen equivalente
> directo** en el sistema de diseño de Careonys, **6 se reemplazan** porque son de otra marca, y
> **6 apuntan a huecos**: cosas que este proyecto nombra y Careonys todavía no.
>
> Fuente del lado de Careonys: `productos/careonys/panel/src/styles/variables.css` (40 tokens, el
> juego completo) y `productos/careonys/pwa-familias/src/styles/variables.css` (16, el subconjunto
> que usan las dos aplicaciones de teléfono, idéntico entre ellas).

---

## 1. Antes de la tabla: por qué los nombres no se copian

Careonys no nombra los colores por su color. `--superficie` no quiere decir «blanco»: quiere decir
«la tarjeta apoyada sobre el fondo». En modo oscuro esa misma variable pasa a gris oscuro y las
pantallas se dan vuelta solas. Por eso las equivalencias de abajo no son un cambio de nombre: son
un cambio de criterio. Un `--bg-white` que en algún lugar se usó para *pintar de blanco* y no para
*ser una superficie* no se traduce — se corrige.

Los valores de Careonys están en `oklch`, donde el primer número es el brillo tal como lo ve el
ojo. Los `#RRGGBB` de este proyecto no se convierten a mano: se reemplazan por el token.

---

## 2. Las 20 que se traducen

| `css/styles.css` | Valor | Token de Careonys | Nota |
|---|---|---|---|
| `--text-dark` | `#1e1e1e` | `--texto-principal` | |
| `--text-mid` | `#444444` | `--texto-secundario` | |
| `--text-light` | `#777777` | `--texto-secundario` | Careonys tiene dos niveles de gris, no cuatro |
| `--text-muted` | `#64748b` | `--texto-secundario` | Ídem |
| `--bg-white` | `#ffffff` | `--superficie` | Solo donde sea una tarjeta o un modal |
| `--bg-light` | `#f0f0f0` | `--superficie-hover` | |
| `--bg-surface` | `#f8fafc` | `--fondo-app` | El papel de la pantalla entera |
| `--bg-panel` | `#f1f5f9` | `--superficie-hundida` | Un escalón hacia adentro de la tarjeta |
| `--border-light` | `#e0e0e0` | `--borde-card` | |
| `--border-color` | `#e2e8f0` | `--borde-card` | Careonys tiene un solo borde |
| `--green-dark` | `#2e7d32` | `--tono-exito-texto` | |
| `--green-light` | `#e8f5e9` | `--tono-exito-fondo` | |
| `--orange-dark` | `#e65100` | `--tono-atencion-texto` | |
| `--orange-light` | `#fff3e0` | `--tono-atencion-fondo` | |
| `--blue-accent` | `#2563eb` | `--tono-info-texto` | Sin uso en el código actual |
| `--blue-light` | `#e3f2fd` | `--tono-info-fondo` | Sin uso en el código actual |
| `--shadow-sm` | `0 2px 8px …` | `--sombra-card` | |
| `--shadow-md` | `0 4px 16px …` | `--sombra-card` | Careonys tiene una sola sombra |
| `--shadow` | `0 4px 24px …` | `--sombra-card` | Ídem |
| `--font` | `'Inter'` | `--font-body` | Careonys usa `'Public Sans'`. Cambia la tipografía |

---

## 3. Las 6 que se reemplazan

**Mandan los colores de Careonys.** El violeta, el magenta y el amarillo no son la paleta de este
producto: vienen de un producto de la competencia y no sobreviven al porteo. Ninguno de los seis
aparece en ningún archivo de Careonys.

| `css/styles.css` | Valor | Reemplazo | Cuándo |
|---|---|---|---|
| `--magenta` | `#e91e8c` | `--azul-medio-texto` | Cuando pinta letras — 47 de sus 69 usos |
| `--magenta` | `#e91e8c` | `--azul-medio` | Cuando pinta fondos o bordes — los otros 22 |
| `--magenta-dark` | `#c2185b` | `--azul-medio-texto` | Es el magenta más oscuro, del `:hover` |
| `--purple-dark` | `#5c1049` | `--texto-titulo` | Cuando pinta letras — 30 de sus 50 usos |
| `--purple-dark` | `#5c1049` | `--azul-oscuro` | Cuando pinta fondos — los otros 20 |
| `--purple-mid` | `#7a1464` | `--azul-oscuro` | |
| `--yellow` | `#f5c000` | `--naranja-alerta` | Fondo o acento |
| `--yellow-dark` | `#e0ad00` | `--naranja-alerta-texto` | Letras |

La distinción de las dos primeras filas es la regla de Careonys, no una preferencia: las variantes
`-texto` son el mismo tono más oscuro, y existen para llegar a 4.5:1 sobre fondo claro. Se usan
**únicamente cuando el color pinta letras**. Bordes, fondos de alerta y acentos grandes usan la
variable base.

### Lo que la tabla no alcanza

**Las imágenes llevan la paleta adentro.** `assets/images/` tiene el logo y nueve ilustraciones.
Cambiar una variable no cambia un `.png`: se reemplazan de a una.

## 4. Lo que este proyecto tiene y Careonys no

Nueve cosas existen acá y no del otro lado: cuatro medidas de redondeo, una duración de animación,
un tercer nivel de gris para texto, el anillo del foco de teclado y las dos piezas que acompañan a
`--texto-sobre-color` —el renglón secundario y el borde de lo que se apoya sobre fondo oscuro—.
Están en la sección propia del marketplace de `css/tokens.css`. Si algún día Careonys las necesita,
se agregan allá y esta sección desaparece.

---

## 5. Las piezas de interfaz

Una pieza es un pedazo de pantalla que se repite: un botón, una tarjeta, una insignia. Se definen
una sola vez y las pantallas las usan por su nombre. Dos reglas las gobiernan.

**Se nombran por lo que hacen, no por el color que tienen.** Un botón llamado `btn-magenta` obliga
a cambiarle el nombre el día que cambia el color, en todas las pantallas a la vez. Los cuatro
botones del proyecto:

| Pieza | Para qué | Cómo se pinta |
|---|---|---|
| `btn-primario` | La acción principal de la pantalla. Una sola por pantalla | `--azul-medio` |
| `btn-secundario` | La acción que acompaña | `--azul-oscuro` |
| `btn-atencion` | Lo que conviene mirar antes de seguir | `--naranja-alerta` |
| `btn-sobre-oscuro` | El mismo botón, apoyado sobre una foto o un fondo de color | Contorno con `--texto-sobre-color` |

Lo mismo vale para el resto: `insignia-validada` e `insignia-pendiente` marcan el estado de un
legajo, y no llevan el nombre de ninguna Prestadora.

**Ninguna pieza escribe un color, una sombra ni un redondeo.** Todo sale de un token. Las sombras
son el caso que más se escapa, porque un color escrito como `rgba(233, 30, 140, 0.25)` no aparece
si se busca por código de color: hay que buscarlo por sus tres números.

### Tres cosas que se miden, tres formas distintas de dibujarlas

Un Asistente tiene tres marcas encima que dicen cosas incompatibles, y las tres tentaban con
dibujarse igual. **El Desarrollador decidió el 25 de agosto de 2026 que las estrellas son de una
sola: la que dan las Familias.** Las otras dos llevan forma propia, y la forma sale de qué clase
de cosa es cada una.

| Qué dice | Quién la da | Cómo se dibuja | Por qué esa forma |
|---|---|---|---|
| **Calificación** | La Familia, después de una jornada | **Estrellas**, de una a cinco | Es una opinión, y una opinión admite grados. La estrella es la forma que todo el mundo ya lee como «me pareció así» |
| **Legajo comprobado** | La Prestadora, revisando papeles | **Escudo con tilde**, y al lado el recuento de las comprobaciones que suman | No es una opinión: es un hecho, y un hecho no tiene grados. Cada comprobación está o no está. El escudo ya existe —`insignia-validada`, `insignia-pendiente`— y esto lo continúa en vez de inventar algo nuevo |
| **Insignia de examen** | Un examen rendido, que se paga | **Medalla**, en su metal: bronce, plata, oro | Ya viene con el metal en el nombre, y una medalla nunca se confunde con una estrella |

**Las tres se pueden ver juntas sin que ninguna se lea como la otra**, que es la prueba: formas
distintas, no colores distintos del mismo dibujo. Quien mire de reojo tiene que poder decir cuál es
cuál sin leer una palabra.

**Un cuidado con la medalla.** Es la única de las tres que se compra. Una Familia que ve oro va a
leer «es la mejor», y lo que dice es «rindió y pagó un examen». Cuando se construya, el texto que
la acompañe tiene que decir de qué examen se trata — nunca la medalla sola. Hoy no se construye
nada de esto: todo lo comercial está frenado por `docs/ALCANCE.md` §4.

**Lo que falta y no se inventa:** cuánto suma cada comprobación no obligatoria. Hoy las que suman
son dos —`domicilio` y `referencia`, las de `puerta: ninguna` en `data/catalogo-verificaciones.json`—
y cuánto vale cada una lo decide el Desarrollador.

### El foco del teclado

`css/tokens.css` termina con una regla que le devuelve el contorno a todo lo que se puede enfocar.
Hace falta porque nueve lugares del proyecto escriben `outline: none`, y ningún botón ni enlace
tenía nada en su lugar: quien navega sin mouse no veía dónde estaba parado. `:focus-visible` sólo
se enciende cuando la persona llegó con el teclado, así que al hacer clic no aparece nada.

---

## 6. Lo que todavía falta

**Las variantes `-texto` de Careonys están calibradas contra el blanco puro, y el fondo de las
pantallas no es blanco puro.** Medido: `--azul-medio-texto` sobre `--superficie` da 4,51 —justo el
mínimo—, pero sobre `--fondo-app`, que es `oklch(0.98 …)`, cae a 4,02. Lo mismo les pasa a las
otras tres. Es un asunto de Careonys y no se arregla acá: la sección 2 de este archivo se copia,
no se edita. Anotado para llevarlo allá.

**El modo oscuro ya se enciende solo, y era condición necesaria, no una comodidad** —remarcado por
el Desarrollador el 2026-08-26—. Sigue `prefers-color-scheme`: quien tiene el teléfono o la
computadora en oscuro entra directo en oscuro, sin tocar nada. Encima de eso, la persona puede
forzar un modo con `data-tema='oscuro'` o `'claro'` en el `<html>`, y esa elección le gana a la del
dispositivo. Los dos bloques están en `css/tokens.css`. Esto quedó posible el 25 de agosto de 2026,
el mismo día en que se fueron los 434 colores escritos a mano: `scripts/verificar_paleta.mjs`
verificó hoy 48 archivos sin ninguno (2 exentos por ser marcas de otras empresas), y
`scripts/verificar_temas.mjs` corta el build si algo vuelve a romper el modo oscuro.

**No hay tokens de espaciado ni de densidad.** Careonys tiene `--densidad-fila-y` y
`--densidad-fila-texto`, que la persona elige y quedan guardados en su navegador. Acá el espaciado
está escrito a mano en cada regla. Se resuelve al portar, cuando cada pantalla se reescribe.

**Las estrellas vacías de una calificación quedan en `--borde-card`**, con poco contraste a
propósito: son las que *no* están, y no dicen nada que las llenas no digan.
