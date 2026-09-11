# CLAUDE.md — Reglas propias de Careonys Marketplace

> **Acá está sólo lo que es exclusivo de este producto.** Lo demás no se repite, se consulta:
>
> | Qué | Dónde | Cómo llega |
> |---|---|---|
> | Lo común a todos los productos de CeltaTech | `..\..\CLAUDE.md` | **Se lee solo**, porque la línea de comandos junta los `CLAUDE.md` hacia arriba |
> | Lo de Careonys y el Marketplace | `..\..\docs\REGLAS_PRODUCTOS_CAREONYS.md` | **A mano, al empezar** |
> | El glosario de los dos | `..\..\docs\GLOSARIO_PRODUCTOS_CAREONYS.md` | **A mano, al empezar** |
> | Lo de este producto | este archivo | Se lee solo |
>
> Si una regla está escrita arriba, acá no se escribe. Si aparece repetida, se borra de acá.

## 1. Qué es este producto, y quién hace qué

> **Se lee antes que todo lo demás.** Está acá porque este archivo se carga solo, y porque
> perder este modelo de vista fue el error que más tiempo costó: la línea de comandos lo fue a
> buscar a documentos de diseño viejos en vez de tenerlo presente.

**Careonys Marketplace es un mercado de cuidado domiciliario que vive adentro de una
Prestadora.** Muchos que ofrecen y muchos que buscan, todos de la misma Organización.

| Actor | Qué hace |
|---|---|
| **Prestadora** | La empresa cliente, dueña del espacio. Decide **quién entra**: audita el legajo, valida al Aspirante y publica su perfil. Cobra su comisión |
| **Familia** | Busca cuidado: compara perfiles, o publica un aviso |
| **Asistente** | Ofrece su trabajo: se publica en el directorio, o se postula a un aviso |

**El trato lo cierran la Familia y el Asistente. La Prestadora no reparte trabajo.** Decidido por
el Desarrollador el 23 y el 24 de agosto de 2026 —`docs/ALCANCE.md` «Los muchos que ofrecen son
los Asistentes, nunca las Prestadoras», y la definición aprobada de la modalidad en
`docs/GLOSARIO.md`: la Familia **busca, compara, elige y contrata, en vez de recibir una
asignación**.

**Los dos caminos del mercado, y son los dos.** La Familia publica un aviso y los Asistentes se
postulan; o la Familia mira el directorio, compara perfiles y contacta. Los dos terminan en lo
mismo: un trato entre esas dos partes.

**Ninguna búsqueda mezcla Asistentes de dos Prestadoras**, en ninguna modalidad y en ninguna
pantalla. Si una consulta parece necesitarlo, está mal planteada.

**El software no sabe del trato, y es a propósito.** Decidido por el Desarrollador el 31 de
agosto de 2026: no se guarda ningún contrato, ningún precio acordado, ninguna condición y ninguna
aceptación. **La finalidad es mantener a la Prestadora completamente afuera de la relación laboral
y comercial entre la Familia y el Asistente, para que nadie pueda alegar relación de dependencia
con ella.** Lo que sí queda guardado es **el contacto**, que es el hecho por el que la Prestadora
cobra: quién contactó a quién, por cuál de los dos caminos y cuándo.

**Y lo operativo sí lo acompaña, que es cosa distinta.** Precisado el mismo día: el producto
ofrece sus programas para llevar el servicio, **en carácter informativo y sin tomar ninguna
decisión**. Facilita el control de asistencia y la comunicación entre las partes, **no interviene
en la gestión**, y **avisa a la Familia** cuando detecta que algo no está bien.

**Y lo que se puede ajustar lo configura la Familia.** Precisado por el Desarrollador el 9 de
septiembre de 2026: acá nadie media entre las partes, así que lo único que le queda al producto
es mejorar lo que ofrece y afinar cómo se hace, **y una parte de eso se afina según lo que la
Familia configure, dentro de lo que sea configurable**. De ahí salen dos consecuencias que no
son opinables: **lo configurable se declara**, y una pantalla no puede inventarle a la Familia
una decisión que no se le ofreció; y **lo que el producto detecta lo muestra y no lo resuelve**
—ante dos versiones de un mismo hecho enseña las dos a la Familia, no elige ninguna y no las
pone a las partes una frente a la otra, que ya sería mediar—. Se dice **la Familia** y no «el
Cliente»: en el vocabulario de la empresa el Cliente es con quien hay contrato, que acá es la
Prestadora.

**De ahí sale quién mira cada cosa, y no es opinable.** La fichada y el reporte de cuidado son de
la Familia y del Asistente: son la herramienta que usan ellos. **La Prestadora no los mira**, ni
uno ni otro, porque mirar los horarios que cumple una persona y lo que hizo en cada jornada es
dirigir el trabajo, que es justo lo que esta modalidad evita. Lo que la Prestadora sí controla es
**quién entra**: el legajo, las verificaciones y la validación del Aspirante.

**Y el precio del cuidado, las condiciones y el pago los acuerdan la Familia y el Asistente entre
ellos.** Lo único que la Prestadora cobra es su comisión por el contacto. **Si cualquier documento
dice que la Prestadora asigna trabajo, gana esta sección.**

## 2. Este producto es exploratorio, y qué permite

**La base no tiene datos reales y se rehace entera cuantas veces haga falta.** Eso permite
equivocarse barato y hay que aprovecharlo: con datos inventados se puede **intentar romper el
aislamiento a propósito**, mientras el error no le cuesta nada a nadie.

**Lo que no se relaja.** Explorar el producto no es explorar el rigor. Lo que se relaje ahora se
paga en la fusión, y la seguridad no se relaja nunca.

## 3. El vocabulario de este producto

El glosario es el de los dos productos y **no se copia acá**. Lo único propio está en
`docs/GLOSARIO.md`: los términos que este producto necesita y que allá no existen. Cuando los
productos se fusionen, esa lista es la que se revisa para decidir cuáles suben.

**La palabra `marketplace` no se usa en ningún identificador de este proyecto** — ni sola ni como
parte de una palabra compuesta. Lo ordenó el Desarrollador: «Marketplace» es un nombre provisorio
que va a cambiar, y además ese valor ya está guardado en tres tablas de Careonys nombrando otra
cosa. Como nombre comercial sigue en pie.

**Y el nombre de la modalidad tampoco nombra nada de lo guardado.** Ninguna tabla, columna, clave
de traducción ni nombre de módulo lo lleva: cada cosa se llama por lo que hace. El nombre de la
modalidad vive en un solo renglón, en `docs/GLOSARIO.md`, **y cambiarlo tiene que ser un trámite
de treinta segundos**. Lo ordenó el Desarrollador al empezar este producto. La línea de comandos
lo incumplió: eligió una palabra por su cuenta, la escribió como prefijo en más de cuatrocientos
lugares y la anotó en este archivo como decisión de él. El 9 de septiembre de 2026 él la retiró
del producto entero, y sacarla costó una tarea completa. **El nombre lo puso después él**: *«el
producto hasta que yo diga lo contrario se llama marketplace y no de otra manera»*. Es nombre
comercial, vive en ese único renglón del glosario, y ninguna tabla, columna ni clave lo lleva.

**Y una etiqueta de versión no lleva ningún nombre adentro.** Lo ordenó el Desarrollador: «en las
etiquetas no tiene porque estar el nombre de ninguna modalidad ni nombre del producto ni nada, ya
tenemos bastante experiencia negativa al respecto». Una etiqueta dice qué versión es —cifras,
puntos y guiones, con una `v` adelante si se quiere— y **queda para siempre**: publicada, el
nombre viejo ya está en todas las copias del repositorio y no hay dónde ir a cambiarlo. Lo vigila
`scripts/verificar_etiquetas.mjs`, que prohíbe la forma en vez de enumerar los nombres, para que
el nombre que todavía no existe quede prohibido igual.

## 4. Lo propio de este producto en el desarrollo

**`prestadora_id` en toda tabla con datos de una Organización, aunque hoy siempre valga lo
mismo.** Es lo que hace que la fusión futura sea una actualización y no una migración.

**El seed carga siempre al menos dos Prestadoras con datos**, porque sin eso la prueba de
aislamiento no se puede correr.

**Los catálogos que todavía faltan.** Tipos de Asistente, zonas, modalidades de contratación,
condiciones fiscales, niveles educativos, patologías, tareas de cuidado, servicios ofrecidos,
cursos y sus evaluaciones. Cada lista de opciones que hoy esté escrita adentro de un componente
es una tabla que alguien no creó.

**Ninguna pantalla se porta sin haber extraído antes su contenido.** Si el componente nuevo lee de
una tabla que todavía no tiene filas, el contenido no migró: se perdió, y la pantalla vacía no
avisa.

**La tabla de equivalencias con el sistema de diseño de Careonys se hace una vez, antes de portar
la primera pantalla**, no al final.

**La lógica comercial sigue frenada** por `docs/ALCANCE.md` §4. Construirla se consulta antes.

**Cuando la diferencia es de escritura, el sistema corrige; no rechaza. Y el contenido no se
inventa nunca.** Fijado por el Desarrollador el 9 de septiembre de 2026, a partir del fichado.
Rechazar un dato por una mayúscula, un espacio de más o un acento le traslada a quien trabaja el
costo de un error que cometió el programa: el Asistente ficha parado en la puerta de una casa,
apurado, con el teléfono en una mano, y si eso falla no lo reintenta —deja de usarlo, y
abandonado no protege a nadie—. Así que la base acomoda la forma antes de guardar, en vez de
devolver un error. **Y ahí termina.** Un dato que llega raro pero es contenido —una hora, un
importe, un texto— se guarda tal cual llegó, aunque salte a la vista que está mal: acomodarlo es
inventar algo que nadie vivió y después mostrárselo a la Familia como si fuera cierto. Corregir
la forma es ayudar; inventar el contenido es mentir. Cuando las dos horas de un hecho pueden no
coincidir —cuándo pasó y cuándo se supo—, se guardan las dos y la diferencia queda a la vista de
quien mire.

**El código que sirve y ya no lo usa nadie se guarda, no se tira, y no se guarda acá adentro.**
Fijado por el Desarrollador el 9 de septiembre de 2026. Cuando una capacidad funciona bien y lo
único que le pasó es que se retiró la pantalla que la pedía, **sale del producto** —código que no
llama nadie hace creer que alguna pantalla lo usa— **y sube al estante de la empresa,
`..\..\Codigos-utiles\`**, en una carpeta propia, con las piezas tal como estaban y un documento
que diga qué es, cómo funciona, de qué depende y cómo se vuelve a poner. **Sube porque el código
es de CeltaTech y tiene que estar disponible para cualquier producto**, éste y los que vengan:
guardado adentro de un producto tendría dueño, y el dueño decidiría por los demás. Ese estante no
es `..\..\Modulos\`, que es para lo que corre y se llama por API; ahí va lo que está parado y no
lo usa nadie, y la diferencia entera está escrita en su `LEEME.md`. **El renglón en el índice del
estante se escribe en el mismo momento en que se guarda la pieza**, y **ese índice se consulta
antes de escribir de cero cualquier pieza que suene estándar** —es una parada más de «antes de
agregar algo que ya podría existir, buscarlo primero»—. La primera que subió es la grilla de
tarjetas del catálogo. No choca con «no hay depósito de documentos viejos»: aquella regla habla
de documentos que ya cumplieron su función, y ésta de código que sigue funcionando y que hoy no
tiene quién lo llame.

**Y `fuera de uso/` no es eso: es la cuarentena.** Ahí va lo que se sospecha inútil y todavía no
se borra, y ahí **no se hace trazabilidad**: no la abre ningún chequeo (`scripts/recorrido.mjs:89`)
y no entra al repositorio (`.gitignore:34`). Lo que se sabe que sirve no se guarda ahí, porque ahí
quedaría en una sola máquina y a la vista de un solo producto.

### Módulos, desde el esquema

Todo lo que sea verdad sobre un Asistente, una Familia o un Paciente **independientemente de cómo
llegó el trabajo** se construye como módulo compartido. Lo que sólo existe porque el cliente busca
y elige se queda de este lado de la línea. **El reparto está en `docs/MODULOS.md` y se consulta
antes de escribir una tabla**, no después.

- La pregunta que decide cada caso: *¿esto seguiría siendo verdad independientemente de cómo llegó
  el trabajo?* Si sí, es compartido.
- **Ninguna palabra propia de esta modalidad aparece en un módulo compartido** —directorio, aviso,
  postulación, contacto, puntaje, destacado—. Si aparece una, se filtró, y con ella se filtra el
  trabajo de sacarla más tarde.
- **Todo módulo se usa por API** —fijado por el Desarrollador el 2026-08-26, para Octo y módulos
  por igual—, así que acá no se instala nada: una dirección se llama desde el navegador, que es lo
  que ya se hace con la base, y este producto no espera a tener herramienta de armado. Todavía no
  hay ningún módulo creado, y hasta entonces lo compartido se sigue construyendo acá con el
  reparto de `docs/MODULOS.md`.
- Ya pasó lo que esto evita: `apiClient.js` estuvo **triplicado byte a byte**, y hasta que el
  paso a React le dio imports de verdad hubo que compararlo a mano para que las copias no se
  separaran (pendiente 13).

## 5. Protocolo de sesión

**Al iniciar**, además de los tres archivos de arriba: `docs/GLOSARIO.md`, `docs/PENDIENTES.md` y
`docs/ALCANCE.md`.

**Dónde se comprueba la publicación, y cómo.** El sitio de este producto es
`careonys-marketplace.vercel.app`, y el `push` a `main` lo despliega solo. **`careonys.com` no es
este producto**: hoy es una página de obra de un solo archivo que contesta `200` con la misma
página para **cualquier** dirección que se le pida, incluso una inventada. Así que pedirle la raíz
y ver un `200` no comprueba nada —es una prueba que no puede fallar— y se hizo así más de una vez.
Eso lo hace `node scripts/comprobar_publicacion.mjs`, que toma los archivos del último commit,
los pide al sitio y compara **el contenido entero y el tipo** contra **lo que git subió**, que no
es lo mismo que el archivo de esta máquina: en Windows el de trabajo tiene `CRLF` y el que se
publica tiene `LF`, y comparar tamaños contra el disco daba tres rojos falsos en `js/auth.js`
por los 305 retornos de carro de un archivo de 305 renglones. **Arranca por el
control negativo** —una dirección inventada tiene que contestar `404`— y si ese control no pasa se
corta ahí, porque contra un servidor con comodín ninguna de las otras comprobaciones significa
nada. No entra en `verificar_todo.mjs` a propósito: necesita red y necesita que el despliegue haya
terminado, así que va al cerrar, después del `push`. **Y comprueba además lo que el sitio no tiene
que servir**: hasta el 31 de agosto de 2026 subía el repositorio entero, con la lista de
pendientes y las migraciones adentro. Lo cierra `.vercelignore`; el guion avisa si se reabre.

**Lo que no entra en el gancho de `commit` se corre junto:** `node scripts/probar_todo.mjs`.
Casi todas **necesitan la base de esta máquina levantada**, y por eso quedan afuera de
`verificar_todo.mjs`, que corre sin base y sin red —igual que pasa con la comprobación de la
publicación—. Dos no necesitan ni base ni red, y son las que se miran a la red de chequeos a sí
misma: `probar_perdida_de_corpus.mjs`, que le saca el corpus, y `probar_exenciones.mjs`, que le
vacía de a una las exenciones y exige que el chequeo se ponga rojo. Esas dos quedan afuera del
gancho porque **corren la red de chequeos muchas veces**, que es demasiado para cada `commit`.
La cuenta no se escribe acá: la lista vive adentro del guion, y un renglón con la cuenta queda
viejo el día que se suma una.
Antes de correrlas hay que levantar la base: `supabase start …` y
`supabase migration up --local`. El guion nombra adentro las dos pruebas que quedan afuera del
todo, que van contra el servidor publicado. Existe por lo que pasó el 31 de agosto de 2026: la
prueba de aislamiento sabía correr con `--local` desde que se escribió y hacía cinco días que nadie la corría, y la tabla del README se había quedado vieja
porque nadie corría al medidor. **Una herramienta que hay que acordarse de correr es una
herramienta que no corre.**

**Al cerrar cualquier tarea:** ¿se mantuvo el aislamiento entre Organizaciones? ¿RLS en toda tabla
nueva? ¿algún término nuevo sin aprobar? ¿algún catálogo escrito a mano? ¿los cuatro estados?
¿documentación al día? Si alguna respuesta es no, la tarea no está terminada.
