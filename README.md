# Careonys Marketplace

> Leer `CLAUDE.md` antes de tocar cualquier código. Protocolo de sesión completo ahí.

Mercado público donde una Familia busca, compara y contrata un Asistente para el cuidado de un
Paciente. Producto de **CeltaTech**, hermano de Careonys (`productos/careonys/`), que es la
plataforma de gestión que usan las Prestadoras.

**Proyecto exploratorio.** Se construye para ver si el resultado satisface y su base no tiene
datos reales. **Pero está publicado en internet**, en `careonys-marketplace.vercel.app`, que es
la dirección que sirve lo que hay en `main`. La que decía este renglón hasta el 26 de agosto de
2026 —`careonys-marketplace-nu.vercel.app`— es **otra**, quedó congelada en una versión vieja y
sigue abierta: pendiente 83.

**Si ese despliegue expone datos o no, no se puede saber leyendo el código.** Hay que consultarlo
contra la base real, no contra un documento. Hasta que esa consulta se haga, conviene bajar el
despliegue o protegerlo. Por qué esto no es una precaución exagerada: `docs/ESQUEMA.md` §1.

Comparte negocio y vocabulario con Careonys y en algún momento se integrará con él, pero hoy son
dos repositorios y dos proyectos de Supabase independientes.

**Careonys no se toca desde acá.** Ni sus archivos, ni su base, ni sus migraciones.

## Estado real

Sitio estático en HTML, CSS y JavaScript plano, en proceso de migración a React + Vite para
alinearse con el stack de Careonys.

Medido el 31 de agosto de 2026 sobre el árbol de trabajo con `node scripts/medir_estado.mjs`, que es de
donde sale esta tabla: no se escribe a mano y no queda vieja.

| | |
|---|---|
| 17 pantallas HTML, 10.210 renglones | sin ruteo: cada pantalla es un archivo |
| 12.461 renglones de JavaScript propio, en 32 archivos | 7.337 de ellos son copias byte a byte de otro archivo (pendiente 13) |
| 4.194 renglones más metidos adentro del HTML | en 13 bloques `<script>` |
| 4.642 renglones de hojas de estilo, en 10 archivos | 64 tokens con nombre en `css/tokens.css`, sin framework |
| 976 declaraciones más, pegadas al HTML | en 247 atributos `style=` (fue el pendiente 8, cerrado) |
| Supabase Auth funcionando | 12 de las 17 pantallas rescatan la sesión al abrir |
| 4 servidores de afuera, sin `package.json` ni compilación | dos de tipografías y dos de bibliotecas |
| 23 tablas y 49 migraciones en el repositorio | 29 chequeos las miran antes de cada commit |

**Qué está construido y qué no lo dice `docs/ALCANCE.md`**, que es la referencia — no este archivo
ni ningún otro. Lo que queda abierto está en `docs/PENDIENTES.md`.

**Media base sigue nombrada en inglés** —`caregivers`, `tenants`, `clock_ins`—, contra el
glosario. El 25 de agosto de 2026 se renombró la parte de esta modalidad (`avisos`,
`franjas_aviso`, `directorio`) y el resto quedó como estaba, porque renombrar una
tabla ya guardada arrastra el código que la nombra y eso lo decide el Desarrollador.

## Qué documento manda sobre qué

Cuando dos digan cosas distintas, gana el de más arriba.

| | Documento | Autoridad sobre |
|---|---|---|
| 1 | **El código y la base** | Todo. Ningún documento sobrescribe lo que el código hace |
| 2 | `CLAUDE.md` | Las reglas propias de este producto. Arriba mandan `../../CLAUDE.md` y `../../docs/REGLAS_PRODUCTOS_CAREONYS.md` |
| 3 | `../../docs/GLOSARIO_PRODUCTOS_CAREONYS.md` | Cómo se llaman las cosas. Es el único y no se copia. Lo propio de acá está en `docs/GLOSARIO.md` |
| 4 | `docs/ALCANCE.md` | Qué está construido y qué no |
| 5 | `docs/PENDIENTES.md` | Lo abierto, con condición de cierre |
| 6 | `docs/ESQUEMA.md` | Cómo se diseña la base |
| 7 | `docs/DISENO.md` | Cómo se traduce el estilo actual al sistema de Careonys |
| 8 | `docs/INVENTARIO.md` | Anatomía del código actual |

**Ningún otro documento afirma estado.** Los que quedan son material de diseño o legal, y cada uno
lo dice en su encabezado.

## Estructura

```
Careonys-Marketplace/
├── CLAUDE.md                   ← las reglas propias de este producto, leer primero
├── docs/
│   ├── GLOSARIO.md             ← los términos que nació este producto; el glosario está arriba
│   ├── ALCANCE.md              ← qué existe y qué no. Referencia única
│   ├── ESQUEMA.md              ← reglas de la base y el error que no se repite
│   ├── INVENTARIO.md           ← anatomía del código actual
│   ├── PENDIENTES.md           ← lo abierto, con condición de cierre
│   ├── DISENO.md               ← equivalencias de estilo con Careonys
│   ├── TABLAS_QUE_FALTAN.md     ← diseño de las diez tablas que aún no existen
│   ├── modelo_de_negocios_*.md             ← material de diseño; decisión comercial abierta
│   └── terminos_y_condiciones_*.md         ← borradores legales sin revisión de abogado
├── *.html                      ← las 12 pantallas del sitio, una por archivo
├── css/                        ← styles.css, mockup-app.css
├── js/                         ← apiClient.js, auth.js, main.js
├── assets/images/
├── data/                       ← JSON locales de la demo, hoy sin uso
├── pwa-asistente/              ← aplicación instalable para Asistentes
├── pwa-familia/                ← aplicación instalable para Familias
└── vercel.json
```

**`supabase/migrations/` todavía no existe.** Se crea con la primera migración; no se anticipan
carpetas vacías.

`apiClient.js` y `auth.js` existen **tres veces** —raíz, `pwa-asistente/`, `pwa-familia/`—
idénticos byte a byte. La duplicación desaparece en la migración, cuando haya imports reales.

Las carpetas de la aplicación nueva se agregan cuando llegue su turno — no se anticipan carpetas
vacías.

## Entorno de desarrollo

El sitio actual es estático. Alcanza con servir la raíz:

```bash
npx serve .          # queda en http://localhost:3000
```

Para la base, con Docker Desktop abierto:

```bash
npx supabase start     # levanta la base local
npx supabase db reset  # aplica migraciones y carga datos de prueba
```

El seed carga **al menos dos Prestadoras con datos**, a propósito: es lo que permite comprobar el
aislamiento. Una prueba que devuelve una lista vacía no distingue "aislado" de "todo bloqueado".

Copiar `.env.example` a `.env.local` y completar los valores antes de levantar nada. Los `.env`
nunca se suben (ver `.gitignore`).

**Para buscar adentro del proyecto**, `node scripts/listar.mjs` y no un `grep -r` desde la raíz:
acá al lado hay una caja fuerte y la regla de la bóveda dice que no se lista. El guion recorre
con el mismo guardián que los chequeos, así que la trae puesta.

```bash
node scripts/listar.mjs .html            # sólo las pantallas
node scripts/listar.mjs --buscar "TODO"  # archivo:renglón: texto
```

## Los chequeos, y el comando que hace falta una sola vez

Cada regla que se arregló una vez tiene un guion que impide que vuelva. Se corren todos juntos
en menos de un segundo:

```bash
node scripts/verificar_todo.mjs
```

Ese guion no tiene la lista escrita: busca los `scripts/verificar_*.mjs` de la carpeta, así que
un chequeo nuevo se suma solo con existir. Acá tampoco va la cuenta, por el mismo motivo: el
título decía trece cuando ya eran veinticuatro, y la tabla nombraba trece de esos veinticuatro.

| Chequeo | Qué impide que vuelva |
|---|---|
| `verificar_arranque` | Que el arranque de una pantalla falle sin que nadie lo diga, ni en pantalla ni en la consola |
| `verificar_base` | Que la dirección de la base o su clave publicable vuelvan a estar escritas fuera de `js/apiClient.js`, y dos afirmaciones sueltas del mismo hecho se contradigan en silencio |
| `verificar_botones` | Que un botón dispare una operación sin apagarse mientras corre, y dos toques sean dos escrituras |
| `verificar_cajas` | Que un chequeo entre a leer una caja fuerte por estar escrita con otra tipografía, o que cierre de más y deje de revisar código de verdad |
| `verificar_catalogo` | Que el archivo del catálogo se despegue de lo que dice la base |
| `verificar_clases` | Que el marcado nombre una clase que ninguna hoja declara, y el estilo que alguien vaya a buscar ahí no exista |
| `verificar_claves` | Que se guarde en la base una opción que el catálogo no tiene |
| `verificar_contacto` | Que el chat vuelva a dejar pasar un teléfono, un correo o un domicilio |
| `verificar_copias` | Que las copias byte a byte se separen sin que nadie se entere |
| `verificar_deriva` | Que una cita `archivo:renglón` apunte a un renglón que existe pero no es el que la frase dice: le pregunta al historial qué decía ese renglón el día en que se escribió la cita, y busca ese texto en el archivo de hoy |
| `verificar_escapado` | Que un texto de la base entre a la pantalla como si fuera HTML |
| `verificar_esquema` | Que una tabla nueva nazca sin RLS, que una función que se saltea la RLS quede al alcance de quien no inició sesión, que falte la columna de la Organización, que la clave primaria no sea `uuid` o que un importe se guarde sin moneda |
| `verificar_estado` | Que un número escrito en la documentación quede viejo sin que nada avise: los cuatro bloques que se miden salen del medidor y se comparan acá |
| `verificar_estados` | Que algo que carga datos se olvide de uno de sus cuatro estados: cargando, error, vacío, listo |
| `verificar_estilos` | Que se escriba a mano en un `style=` lo que ya dice una clase de utilidad |
| `verificar_frases` | Que quede texto visible escrito a mano en una pantalla ya convertida a los tres idiomas |
| `verificar_guias` | Que una Guía de cuidado se vea sin estar publicada, o que se cruce entre dos Prestadoras |
| `verificar_guiones` | Que el JavaScript de una pantalla quede sin poder leerse |
| `verificar_identidad` | Que la marca vuelva a estar escrita a mano |
| `verificar_organizacion` | Que una pantalla nombre a una Prestadora del seed, o escriba otro logotipo |
| `verificar_paleta` | Que vuelva un color escrito con su número en vez de un token |
| `verificar_pendientes` | Que un archivo siga diciendo en presente que un agujero está abierto después de haberse cerrado, y una roja esperada se vuelva un permiso para no mirar |
| `verificar_red` | Que un chequeo mire cero archivos, no encuentre nada y salga en verde igual; que la extensión de las pantallas vuelva a escribirse a mano en vez de pedirse a `scripts/recorrido.mjs`; y que esta misma tabla se quede atrás, nombrando un chequeo que ya no existe o callando uno que sí |
| `verificar_referencias` | Que una cita `archivo:renglón` de la documentación apunte a la nada |
| `verificar_sinconexion` | Que la copia que el teléfono guarda para andar sin señal siga sirviendo un archivo viejo |
| `verificar_temas` | Que se rompa el modo oscuro: las dos copias separadas, o un token de letra pintando un fondo |
| `verificar_trato` | Que el texto visible tutee a quien lo lee |
| `verificar_usos` | Que el catálogo diga que una opción se usa en un renglón donde ya no se usa |
| `verificar_vocabulario` | Que «cuidador» vuelva a ser el término general, o que «búsqueda» nombre lo que una Familia publica |

**El comando que hace falta una sola vez por máquina**, para que se corran solos antes de cada
`git commit`:

```bash
git config core.hooksPath .githooks
```

El gancho vive en `.githooks/pre-commit`, que sí se sube, porque `.git/hooks/` no se sube. Sin
ese comando el gancho está en el repositorio y no lo llama nadie. Para saltearlo en un commit
puntual: `git commit --no-verify`, y conviene que sea raro.

## Decisiones abiertas que bloquean el esquema

1. **Qué se construye acá y qué es de Careonys.** Reportes de cuidado, signos vitales, check-in y
   reportes diarios ya existen allá. Ver `docs/ALCANCE.md` §3.

No se resuelve escribiendo código.
