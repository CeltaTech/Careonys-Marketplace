# La fusión, tema por tema

> **La decisión ya está tomada y no se vuelve a discutir acá.** El Marketplace **se muda a la base
> de Careonys**. Lo ordenó el Desarrollador: *«Defintivamente se muda y como te dije anteriormente,
> toma lo mejor de ambas para beneficio de las dos»*. No se sostienen dos bases conectadas, porque
> serían dos verdades sobre la misma persona.
>
> **Y la regla con la que se resuelve cada choque también es suya:** *«Cada vez que encontremos 2
> soluciones tomadas por separado para el mismo tema, trataremos que la definitiva que compartan
> tome lo mejor de cada una»*. No gana Careonys por ser anterior ni el Marketplace por ser más
> nuevo.
>
> **Este documento no ejecuta nada.** Careonys no se toca desde acá —
> `celtatech/CLAUDE.md` §12 y la orden permanente del Desarrollador—: desde acá se deja preparado,
> y la migración se hace desde Careonys, aprobando de a un punto por vez. Su hermano es
> `docs/APORTES_A_CAREONYS.md`, que anota lo que va en un solo sentido; **acá van los temas donde
> los dos lados construyeron su propia solución** y hay que armar una tercera.
>
> **Cómo se comprobó.** Columna por columna, leyendo las migraciones de los dos lados el 10 de
> septiembre de 2026. Lo que sigue no es memoria ni documentación vieja. **Lo que todavía no está
> comprobado se dice así**: acá se miraron las columnas, no las políticas de acceso ni los
> disparadores, y esa segunda pasada falta.

## Lo que hace que esto sea posible, y ya estaba construido

La ficha del Asistente en Careonys **ya tiene una columna que dice por qué canales trabaja esa
persona, y viene de fábrica con los dos**: el directo y el Marketplace. Y la base de Careonys tiene
además, escritos desde antes, los lugares para los cobros del Marketplace, para sus suscripciones,
y una tabla que dice qué modalidades tiene habilitada cada Prestadora.

Es decir que **el banco compartido de Asistentes no hay que inventarlo: está previsto y esperando**.
Lo que hay que deshacer es la copia paralela que el Marketplace construyó sin saberlo.

## Una cosa que no se decide, porque ya está decidida

**Los nombres de lo guardado quedan en castellano, que es como está Careonys.** No es una
preferencia: `celtatech/CLAUDE.md` §4 y §8 lo mandan, y hoy buena parte de lo guardado del
Marketplace está en inglés —la persona Asistente, el nombre completo, la fichada, los mensajes, las
cuentas—. En esos casos no hay «lo mejor de cada uno» que discutir: el nombre castellano gana
porque la regla ya lo dice.

## Otra que tampoco se decide: la parte publica del producto no es la pagina que lo vende

Lo fijo el Desarrollador el 2026-09-10, corrigiendo una propuesta de que el Marketplace
construyera «el sitio publico de los dos»: *«lo comercial es de celtatech y tiene distintas
paginas para distintos productos, aunque el marketplace se comercializa por separado y debe
mostrarse por separado comercialmente tambien es un modulo que debe mostrarse como parte de los
pack de careonis que comercializa celtatech»*.

Entonces la linea es esta, y no se cruza en ningun tema de este documento:

| Sirve para | Es de | Ejemplo |
|---|---|---|
| **Usar** el producto | El producto | La pantalla donde una Familia busca un Asistente |
| **Comprar** el producto | CeltaTech | La pagina que explica los paquetes y lo que cuestan |

**Comprobado acá mismo:** ninguna de las 15 pantallas publicas de este producto vende nada. La de
entrada le habla a la Familia que va a usarlo —«Encuentre al Asistente que necesita»— y no hay
ninguna pantalla de precios ni de paquetes. Asi que **de este lado no hay nada que sacar**, y
tampoco hay ningun sitio promocional que construir: ese trabajo es de CeltaTech y ya tiene su
lugar en `../../docs/SUGERENCIAS_DESDE_EL_MARKETPLACE.md`.

**Y lo que si hay que anotarle a CeltaTech**, que es suyo y no se construye acá: el Marketplace se
muestra **dos veces** —solo, porque se vende solo, y adentro de los paquetes de Careonys, porque
tambien se vende como parte de ellos, y puede ser el mas basico y economico de todos—.

**Del lado del producto eso no cuesta nada**, y es exactamente lo que manda `celtatech/CLAUDE.md`
§2: el producto declara que sabe hacer, CeltaTech arma los paquetes, y el producto nunca restringe
por razones comerciales.

---

## 1. La persona Asistente

**Cada lado guardó la mitad del problema.**

| Sólo lo tiene Careonys | Sólo lo tiene el Marketplace |
|---|---|
| Alta, baja y estado de la persona | Documento de identidad y clave fiscal |
| Tipo de vínculo laboral | Domicilio |
| Horas semanales | Datos bancarios |
| Borrado suave, con fecha | Fecha de nacimiento, género y nacionalidad |
| Foto | Valor de la hora, **con su moneda** |
| Tipo de Asistente, contra catálogo | Referencias laborales y estudios |
| **Por qué canales trabaja** | Zonas escritas por la persona |
| Marca de que vino de una importación | |

**La definitiva las lleva a las dos.** Careonys resolvió el ciclo de vida laboral; el Marketplace
resolvió la identidad de la persona y lo económico. Ninguna de las dos alcanza sola.

**Y hay un pendiente abierto del Marketplace que se cierra en el camino:** acá las especialidades y
las zonas están además guardadas como texto suelto, y del otro lado son listas contra catálogo.
Gana Careonys.

## 2. La Prestadora

| Sólo lo tiene Careonys | Sólo lo tiene el Marketplace |
|---|---|
| Razón social y nombre de fantasía separados | Los colores de su marca |
| Identificación fiscal | El logotipo |
| País | La dirección corta con la que se la nombra |
| Políticas: cuántos días antes avisar un vencimiento, cómo se controla la matrícula, qué se hace en un alta manual | Su descripción pública |
| Minutos de aviso previo | Su moneda |
| Estado como valor cerrado, no texto libre | La referencia hacia CeltaTech |

**Las dos van.** Careonys tiene lo legal y lo operativo; el Marketplace tiene lo público y la
marca, que es lo que hace falta para que exista un directorio. **Y esto cierra el pendiente
abierto de que la Prestadora no tiene dónde configurar nada**: del otro lado esa configuración
existe y está repartida en más de diez lugares.

## 3. Las cuentas de quien entra

**Gana Careonys sin discusión.** Guarda teléfono y zonas; el Marketplace guarda apenas el nombre y
el rol. No hay nada del lado del Marketplace que valga la pena rescatar.

## 4. Los papeles del Asistente

**Acá se ve mejor que en ningún otro lado por qué la regla del Desarrollador es la correcta**, porque
cada lado tiene lo que al otro le falta:

- **Careonys tiene un catálogo de tipos de documento.** El Marketplace escribe el tipo como texto
  libre, que es exactamente lo que `celtatech/CLAUDE.md` §8 prohíbe.
- **El Marketplace guarda el archivo y la fecha en que se presentó.** Careonys **no guarda el
  archivo**: sólo el tipo y el vencimiento.

**La definitiva:** el catálogo de Careonys, más el archivo y la fecha de presentación del
Marketplace. Ninguna de las dos servía.

## 5. Las verificaciones de esos papeles

**Gana Careonys, con un aporte del Marketplace.** Careonys guarda notas, quién revisó, por qué medio
y una referencia externa al trámite. El Marketplace guarda un plazo de vencimiento del trámite, que
del otro lado no existe y sirve.

## 6. Las matrículas profesionales

**Gana Careonys casi entera.** Guarda vigencia desde y hasta, quién la registró, quién la verificó,
por qué medio, con nota, y si la cargó la propia persona. El Marketplace guarda un sí o un no.

**Y con eso se cierra un pendiente abierto del Marketplace**: el producto promete avisar antes de
que venza una matrícula y no tiene nada detrás. Del otro lado, la Prestadora ya configura cuántos
días antes se avisa.

## 7. Las postulaciones — **cuidado: son dos cosas distintas con el mismo nombre**

**Este es el hallazgo que más caro sale si se pasa por alto.**

- **En Careonys** es el formulario público de alguien que se ofrece a trabajar y todavía no existe
  en el sistema: nombre, teléfono, correo, experiencia, situación fiscal, cómo se enteró, idioma.
- **En el Marketplace** es un Asistente que ya existe y que se postula a un pedido concreto de una
  Familia.

**No se fusionan.** Son dos tablas que tienen que seguir siendo dos, y hay que ponerle otro nombre
a una de las dos antes de mudar nada. Si se mezclan, se pierden las dos.

## 8. Las zonas de cobertura

**Casi iguales, y cada una tiene una cosa.** Careonys agrupa por categoría; el Marketplace permite
que una zona cuelgue de otra. La definitiva lleva las dos, y son compatibles entre sí.

## 9. La fichada

**Otra vez son dos cosas distintas, y las dos hacen falta.**

- **Careonys** registra un rastro de ubicación colgado de una guardia.
- **El Marketplace** registra el acto de fichar entrada y salida, y guarda **la hora del botón
  aparte de la hora en que la marca llegó al sistema**, que es lo que hizo que dejaran de perderse
  las fichadas de quien trabaja sin señal.

**Ese último punto es aporte del Marketplace y no existe del otro lado.** Y Careonys tiene, además,
los códigos de presencia y los escaneos, que acá no existen.

## 10. El chat

**Son dos cosas distintas y las dos quedan.**

- **En Careonys** es un mensaje del panel hacia el Asistente, y guarda cuándo se le avisó al
  teléfono.
- **En el Marketplace** es una conversación entre una Familia y un Asistente, con el control que
  impide que ahí adentro pase un dato de contacto. Eso no existe del otro lado **y es lo que
  sostiene el negocio**.

**Aporte de Careonys hacia acá:** el aviso al teléfono. **Aporte del Marketplace hacia allá:** la
conversación y su control.

## 11. Los reportes de lo que se hizo en un turno

**Gana Careonys por lejos.** Guarda alimentación, medicación, signos vitales, estado de ánimo,
incidentes, observaciones, una foto, si el Asistente lo confirmó y si lo procesó la IA. Y **cuelga
de la persona cuidada y de la guardia**. El Marketplace guarda presión, glucemia y notas del día, y
cuelga del pedido.

**Con esto se cierra un pendiente viejo del Marketplace**, que decía exactamente esto: que el
reporte cuelga de donde no va y que Careonys ya lo había resuelto hace rato.

## 12. Los pedidos de las Familias

**Gana el Marketplace.** Guarda la grilla de horarios, las patologías requeridas, las tareas, la
profesión, el género preferido y la frecuencia. En Careonys es un formulario de contacto: nombre,
teléfono, localidad, tipo de servicio y días y horarios como texto corrido.

**Pero se muda con una corrección pendiente**, que ya está anotada: acá el nombre de la persona
cuidada y el contacto de la Familia se guardan como texto pegado, y hay que separarlos antes.

---

## 13. Cómo protege cada lado lo que guarda

**Es la segunda pasada, y es la que faltaba.** Los doce temas de arriba comparan lo que cada lado
guarda. Acá se compara **quién puede leer y escribir cada cosa**, que es lo que decide si una tabla
mejor diseñada es de verdad la mejor de las dos.

### La diferencia de fondo, que es una sola y explica todo lo demás

**El Marketplace no tiene servidor propio: sus pantallas le hablan derecho a la base.** Por eso
toda su protección está adentro de la base, y ahí está bien puesta —todas sus tablas la tienen, y
todas resuelven a qué Prestadora pertenece quien consulta por el mismo camino: la sesión abierta,
nunca un valor que venga en el pedido—.

**Careonys sí tiene servidor, y su servidor entra a la base con la llave de servicio**, que se
saltea todas las reglas de la base por diseño. Careonys también tiene la protección escrita adentro
de la base —más tablas, muchas más reglas, y de mejor calidad—, pero **por el camino que usan sus
pantallas todos los días esas reglas no se evalúan**: quien decide es el servidor.

**De ahí sale la decisión que esta pasada existe para poner sobre la mesa.** Cuando el Marketplace
se mude, sus pantallas tienen que elegir uno de los dos caminos:

- **Siguen hablándole derecho a la base.** Entonces las reglas del Marketplace viajan con las
  tablas y hay que revisarlas contra las de Careonys, tabla por tabla, donde las dos existan.
- **Pasan a hablar con el servidor de Careonys.** Entonces esas reglas no protegen nada por ese
  camino y **toda la protección hay que volver a escribirla del lado del servidor**.

No es lo mismo y no se decide sobre la marcha: es la diferencia entre revisar lo que ya está
escrito y escribirlo de nuevo. **Mientras esa elección no esté hecha, no se mueve un dato.**

### Lo que hay que arreglar de este lado antes de mudarse

Son dos, y las dos las comprobó la línea de comandos contra el esquema real:

**Uno. La pertenencia a una Prestadora se declara sola al crearse la cuenta.** Quien se registra
manda a qué Prestadora dice pertenecer, y la base le cree: no hay invitación, no hay lista de
autorizados y ni siquiera se comprueba que esa Prestadora esté activa. El nombre corto de cada
Prestadora es público —está a la vista en la dirección de la pantalla—, así que cambiarlo antes de
registrarse mete a cualquiera adentro de la Prestadora que elija. **El rol sí está bien cerrado**:
nadie puede darse a sí mismo el rol de coordinador, y un disparador impide cambiarse el rol o la
Prestadora después. Lo que falta es el control del valor inicial.

**Dos. Cinco piezas de la configuración de la Prestadora las puede cambiar y borrar cualquier
miembro**, no sólo el coordinador: las zonas de cobertura, las zonas de cada Asistente, las guías
de cuidado y los dos catálogos propios. El control de que sea coordinador existe, pero vive
solamente en la pantalla; la base no lo pide. **Y las zonas de cada Asistente no separan leer de
escribir**, así que además cualquier miembro ve dónde trabaja cada uno.

Fuera de eso el Marketplace está sólido, y hay que decirlo con la misma claridad: todas sus tablas
protegidas, todas las reglas pasando por el mismo punto único, y todo lo que se probó falla
cerrado. Lo que queda abierto ya estaba anotado: no hay registro de auditoría, el depósito de fotos
de perfil es público y las direcciones de los archivos empiezan por la cuenta en vez de por la
Prestadora.

### Lo que Careonys tiene que saber, y que se le informa desde acá

**Careonys no guarda registro de lo que hace la gente de una Prestadora.** Tiene el registro de
auditoría construido, y bien construido, pero **sólo escribe cuando hay una sesión de soporte de
CeltaTech abierta**; y como su servidor entra con la llave de servicio, fuera de esa sesión el
disparador nunca llega a activarse. Hoy «quién le cambió la medicación a este Paciente», «quién
borró esta guardia» y «quién tocó este precio» **no tienen respuesta**. No es una falla: es un
alcance que quedó corto. La sesión de soporte está bien hecha; el registro de la operación de todos
los días no existe.

**Y hay un control que se abre en vez de cerrarse.** La comprobación de si alguien es superadmin
exige segundo factor, pero si no logra leer la configuración que dice si el segundo factor es
obligatorio, **contesta que sí, que es superadmin**. El servidor decide lo contrario ante la misma
duda. Es el único lugar donde los dos no coinciden.

**Menor pero real:** el servidor acepta pedidos de cualquier origen y no tiene tope de intentos; la
constancia del aviso legal la escribe el navegador y nada del lado del servidor la exige; y el
depósito de marcas de las Prestadoras es público a propósito.

**Y la decisión de a qué Prestadora pertenece cada consulta está copiada, no centralizada.** Existe
una única pieza que la resuelve, y la usan cinco de sus treinta y cuatro grupos de rutas; las otras
veinte la escriben a mano, casi cien veces, sin la red que esa pieza tiene de cortar cuando no hay
Prestadora.

Careonys, del otro lado, es claramente más fuerte donde importa: todas sus tablas protegidas, más
del cuádruple de reglas, la Prestadora siempre resuelta desde la sesión validada y nunca desde el
pedido, las direcciones de archivos firmadas y con vencimiento corto, los roles limitados por el
esquema y respondidos por un único punto, y casi todo fallando cerrado con el motivo escrito al
lado.

**Ninguna de las dos revisiones tocó una base en vivo.** Las dos se hicieron leyendo. Confirmarlo
contra datos cargados es la prueba de aislamiento con dos Prestadoras, que es lo que queda para la
última etapa.

---

## 14. Las tres trampas, y los nombres que se proponen — **ESPERA DECISIÓN**

**Qué es una trampa acá.** Una cosa de cada lado que se llama igual que la del otro y no es la
misma. Son tres, están en los temas 7, 9 y 10, y **ninguna se puede mudar mientras las dos se
llamen igual**: el día que las dos tablas se junten en la misma base, el nombre repetido decide
solo, y decide mal.

**Esto es una propuesta, no una decisión.** El vocabulario lo aprueba el Desarrollador, y ninguna
palabra nueva se escribe antes de que la apruebe. Cada nombre propuesto pasó las cinco preguntas
de la regla de la empresa: no existe ya una palabra aprobada para eso, es palabra del negocio y no
de la tecnología, está en castellano, y la entiende alguien que no conoce el tema.

### Trampa 1 — las postulaciones

| Qué es | Cómo se llama hoy | Nombre propuesto |
|---|---|---|
| Alguien de afuera que pide entrar a la Prestadora y todavía no existe en el sistema | postulación, en Careonys | **postulación** (se queda como está) |
| Un Asistente que ya existe y se ofrece para un pedido concreto de una Familia | postulación, en el Marketplace | **ofrecimiento** |

**Por qué así y no al revés.** *Postular* es literalmente pedir para uno mismo, y eso es lo que
hace quien golpea la puerta de la Prestadora: pide entrar. *Ofrecer* es poner algo delante de
alguien, y eso es lo que hace el Asistente que ya está adentro: le pone su trabajo delante a una
Familia que publicó lo que necesita. Además el que se queda quieto es el de Careonys, que es el que
tiene datos guardados desde hace más tiempo.

### Trampa 2 — la fichada

| Qué es | Cómo se llama hoy | Nombre propuesto |
|---|---|---|
| Marcar que se entra y que se sale de una guardia | fichada acá, check-in y check-out allá | **check-in / check-out** (se queda como está allá) |
| El rastro de dónde estuvo el teléfono mientras duraba la guardia | fichada, en Careonys | **rastro de la guardia** |

**Por qué así.** Acá no hay dos palabras peleando: hay una palabra puesta sobre dos cosas del lado
de Careonys. Marcar entrada y salida ya tiene nombre aprobado en el glosario que comparten los dos
productos, y además es el que está guardado del lado de Careonys desde el principio, así que no se
toca. Lo que necesita nombre propio es lo otro: una sucesión de posiciones a lo largo de una
guardia no es una marca, es un rastro. **Y el nombre visible no cambia por esto**: en la pantalla
se sigue diciendo lo que se venía diciendo, porque las pantallas del Marketplace se apagan en la
etapa 3 y su función pasa a las de Careonys.

### Trampa 3 — el chat

| Qué es | Cómo se llama hoy | Nombre propuesto |
|---|---|---|
| Un mensaje que el panel de la Prestadora le manda al Asistente, y el aviso que le llega al teléfono | chat, en Careonys | **aviso al Asistente** |
| Una conversación de ida y vuelta entre una Familia y un Asistente, con el control que impide que ahí adentro pase un dato de contacto | chat, en el Marketplace | **conversación** |

**Por qué así.** Uno va en un solo sentido y el otro en los dos, y llamarlos igual esconde
justamente eso. *Avisar* es hacer saber, y no espera respuesta. *Conversar* es tratar con otro, y
no existe si el otro no contesta. Y **«chat» se cae de los dos lados**: es palabra en inglés que
tiene equivalente claro en castellano, así que no pasa la tercera pregunta de la regla.

### Qué hace falta para cerrar esto

Que el Desarrollador diga sí a los cuatro nombres, o cambie los que no le gusten. **Recién ahí** se
escriben: hasta entonces no entra ninguno ni al código, ni a una tabla, ni a una pantalla, ni a
este documento como si fuera decisión tomada.

---

## 15. El reparto de lo que no choca

**Qué es esto.** Los catorce temas de arriba son los que los dos lados resolvieron por separado y
hay que juntar. Éstos son los otros trece: los que tiene uno solo de los dos, y que por eso no
hay que juntar sino repartir. Dos de los trece los tienen los dos, y aparecen igual acá,
porque lo que hay que repartir no es la cosa sino la mitad que a cada lado le falta.
Cada uno termina en uno de cuatro destinos: **viaja** —se lleva a la
base de Careonys—, **se queda acá** —porque es justamente lo que este producto sigue siendo—,
**se retira**, porque no lo usa nadie, o **va y viene**, que le pasa a uno solo: cada lado resolvió
la mitad que al otro le falta.

Nada de esto se ejecuta desde acá. Lo que viaja queda escrito con su detalle en el documento de
aportes, para aprobarlo de a uno el día de la mudanza.

### Lo que sólo tiene este producto, y va para allá

**Los cursos y el examen.** Un catálogo de cursos, evaluaciones con sus preguntas, y un examen que
**lo corrige la base, no la pantalla**: quien rinde nunca recibe cuál era la respuesta correcta, y
el tope de intentos tampoco se controla en el teléfono. Careonys no tiene nada de esto: allá
«capacitación» es una casilla que alguien marca en el proceso de incorporación. Lo que se lleva es
el mecanismo; **las preguntas no**, porque hoy hay cuatro y con eso se aprueba adivinando más de la
mitad de las veces.

**Las guías de cuidado.** Un texto de cuidado atado a una patología, con partes fijas —qué es, qué
esperar, señales de alarma, qué hacer en una emergencia—, con la general del producto y la propia
de cada Prestadora, y sin que se pueda publicar ninguna sin decir quién la revisó. Careonys no
tiene ninguna, pero sí tiene dónde engancharlas y una regla ya resuelta que manda sobre esto: allá
la patología de un Paciente se muestra solamente en la pantalla de una guardia, así que la guía
tampoco puede aparecer antes. Lo que se lleva es el mecanismo; **los textos no**, porque las 19
están escritas y ninguna está firmada.

**La disponibilidad horaria como grilla.** Acá el Asistente marca casillas de día y turno, y cada
casilla es un dato con forma. Allá son cuatro palabras sueltas —mañana, tarde, noche, fines de
semana— sin día de la semana, así que «los martes a la tarde» no se puede decir. **Pero hay que
decir el hecho incómodo: hoy no la lee nadie, de ninguno de los dos lados.** Acá se escribe y no
se muestra en ninguna pantalla; allá la ficha del Asistente tiene el dato y no lo abre ningún
programa. Acá no la lee nadie porque acá nadie reparte trabajo, y allá el reparto de guardias es
justamente lo que la necesitaría. **Si del otro lado tampoco aparece quién la lea, no viaja**:
mudar algo que sólo se escribe es mudar el problema de lugar.

### Lo que sólo tiene este producto, y se queda acá

**El directorio donde una Familia busca.** Es el corazón de lo que este producto sigue siendo
después de la mudanza. Se mira sin haber entrado, muestra sólo a quien tiene el legajo validado y
el perfil publicado y todos sus papeles al día, y no mezcla nunca Asistentes de dos Prestadoras.
No viaja porque allá no hay a quién ofrecérselo: en prestación directa la Prestadora asigna, no se
elige.

**Las pantallas que se miran sin entrar.** Quince pantallas, y detrás de ellas una puerta muy
angosta hacia la base: seis funciones y tres listas, y ninguna sirve nada si no se le dice de qué
Prestadora se está hablando. Se quedan, y se rehacen acá con la tecnología nueva. Las que sí se
apagan son las del panel y las de los dos programas de teléfono, cuya función pasa a las
aplicaciones que Careonys ya tiene.

### Lo que sólo tiene Careonys, y este producto recibe al llegar

**El registro de quién hizo qué.** Ya está dicho en el tema 13 y se repite acá porque es el que
más pesa: existe, está bien hecho, y **anota solamente lo que hace CeltaTech cuando entra a dar
soporte**. Lo que hace la gente de una Prestadora sobre sus propios datos no queda anotado en
ningún lado, porque el servidor entra a la base con una llave que se saltea las reglas de la base
y el anotador nunca se dispara. Este producto no tiene nada de auditoría, así que lo recibe entero
—y recibe el agujero con él—.

**La entrada de soporte de CeltaTech.** Una Prestadora por vez, cartel a la vista, aviso extra
antes de cualquier cosa destructiva, corte por inactividad y tope absoluto. Está terminada y
cerrada por los dos lados: la base y el servidor se ponen de acuerdo sobre a qué Prestadora se
está mirando. Este producto no tiene nada equivalente. Un detalle que hay que saber: la sesión
vencida se cierra **cuando alguien vuelve a golpear la puerta**, no sola.

**Los cobros y la facturación.** Son dos circuitos separados. El de prestación directa está
terminado y es sólido: la plata que entra se anota entrada por entrada, el estado de una factura
no se marca a mano sino que sale de lo cobrado, y lo que se debe es una resta y no una columna que
alguien mantiene. Lo que le falta es que la factura la genere el servidor y no un botón de la
pantalla, y que haya algo que la dispare todos los meses. El circuito del mercado, en cambio,
**está a medias en un punto que importa: nadie da de alta una suscripción.** El producto sabe
leerlas y actualizarlas, y no sabe crearlas.

**Las pasarelas de pago.** Seis medios escritos contra las interfaces reales de cada proveedor, una
verificación de firma compartida para el aviso que devuelven, y la credencial de cada Prestadora
guardada donde corresponde: en la caja de secretos de la base, no en una columna. **Y la otra
mitad no existe:** nada llama a esos seis para dar de alta un cobro, y el aviso que llega de vuelta
busca una fila que hoy no crea nadie. Se recibe la mitad hecha, que es la difícil, y hay que
escribir la otra.

**Los consentimientos.** El andamiaje está completo y es mejor que lo que cualquiera escribiría de
apuro: los textos versionados por país e idioma, y **la fotocopia de lo que la persona leyó
guardada junto a su decisión**, para que cambiar el texto después no cambie lo que ella aceptó.
Retirar no borra: pone la fecha. Pero **el contenido está vacío**: todos los textos cargados son de
relleno y lo dicen en su propio cuerpo, hay una sola clase de consentimiento —el de seguimiento de
ubicación— y las advertencias del mercado, cargadas hace pocos días, todavía no tienen pantalla que
las muestre.

**La Familia como entidad, y no como cuenta.** Es el que más trabajo trae, y no por lo que agrega
sino por lo que cambia. Allá la Familia tiene ficha propia, y colgando de ella el Paciente, los
servicios, las facturas, la medicación y un **círculo de personas** con permisos finos, respaldado
por un documento firmado con constancia. Acá la Familia **es** la cuenta: cada regla de la base
compara contra quién inició sesión, y punto. Al mudarse, todas esas comparaciones dejan de
preguntar «¿sos vos?» y pasan a preguntar «¿de qué Familia sos?», **que es una respuesta distinta
para los miembros del círculo**. Ninguna de esas reglas se puede convertir sin mirarla: no es un
cambio de nombre, es un cambio de pregunta.

### Los dos que están de los dos lados, y que igual hay que repartir

**Los tres idiomas.** Los dos productos están en castellano, inglés y portugués, y allá el trabajo
hecho es enorme: más de ocho mil renglones de texto traducido. La diferencia no es cuánto hay
escrito, es **quién obliga**. Acá la exigencia está adentro de la base: un texto del producto al
que le falte un idioma **no se puede guardar**, y son doce reglas las que lo piden. Allá no hay
nada que lo pida: la base sabe que los idiomas son tres en un solo lugar, y es para decir de cuál
de los tres es cada texto legal, no para exigir que estén los tres. Lo que viaja es la exigencia.

Y de paso aparecieron dos cosas que allá se arreglan solas, sin esperar ninguna mudanza, y que
hoy dejan afuera a todo el que no habla castellano: **el idioma no se le pregunta nunca al
teléfono** —quien entra por primera vez con el teléfono en portugués ve la aplicación en
castellano—, y **en los dos programas de teléfono no hay dónde cambiarlo**. Sólo el panel tiene
selector, y muestra el código en vez del nombre del idioma. Es la aplicación traducida que nadie
puede ver traducida.

**La red de comprobaciones automáticas: éste es el que va y viene.** Acá hay treinta y nueve
comprobaciones que corren **antes de cada cambio guardado**, en menos de un segundo, y si alguna
se pone roja el cambio no se guarda. La lista no está escrita en ningún lado: el corredor mira la
carpeta y toma lo que encuentra, así que una comprobación nueva entra sola. Y hay dos pruebas que
**se miran a la red a sí misma**: le sacan a cada comprobación el material que revisa y exigen que
se ponga roja. Una comprobación que pasa con la carpeta vacía no estaba revisando nada.

**Pero acá falta justo lo que allá está hecho, y es grave: nada de eso corre en un servidor.**
Toda la red depende de que en esa máquina alguien haya corrido un comando una vez. En una máquina
donde no se corrió, las treinta y nueve comprobaciones no existen y nadie se entera. Allá, en
cambio, tres comprobaciones corren solas en cada subida, y la publicación no se da por buena hasta
que la versión nueva está contestando.

**Y allá falta lo de acá, exactamente al revés: no corre nada antes de guardar un cambio**, y las
cuarenta y cuatro pruebas que tienen escritas —casi diez mil renglones— **no las llama nadie
automáticamente**. Ninguna de ellas mira los dos programas de teléfono, que además no tienen con
qué correrlas. Cada mitad tapa el agujero de la otra.

### Lo que este reparto deja sobre la mesa

- **Cuatro cosas no esperan a la mudanza, y conviene hacerlas antes.** Que allá le pregunten el
  idioma al teléfono; que los dos programas de teléfono tengan dónde cambiarlo; que allá se
  disparen sus comprobaciones antes de guardar el cambio y no media hora después; y que las
  cuarenta y cuatro pruebas que ya tienen escritas las corra alguien solo. Ninguna de las cuatro
  depende de que los productos se junten.
- **La disponibilidad horaria espera saber si allá alguien la lee.** Es la única de las trece cuyo
  destino todavía no está: viaja si el reparto de guardias la usa, se retira si no.
- **La Familia deja de ser la cuenta**, y eso hay que revisarlo regla por regla, no de una vez.
- **Lo que se recibe no está todo terminado**, y conviene saberlo antes y no después: falta quién
  cree una suscripción, falta quién dé de alta un cobro en la pasarela, faltan los textos legales
  de verdad, y falta que quede anotado lo que hace la gente de una Prestadora.

---

## Lo que este documento todavía no mira

El reparto de lo que no choca ya no falta: es el tema 15. Lo que queda abierto es corto, y es
esto:

- **Los cuatro nombres del tema 14 esperan un sí.** Hasta entonces no se escribe ninguno en
  ningún lado.
- **La disponibilidad horaria espera saber si allá alguien la lee.** Es lo único de los trece del
  reparto cuyo destino todavía no está.
- **Cómo se declara la pertenencia a una Prestadora al crearse la cuenta.** Es el agujero que
  apareció en el tema 13, no se arregla solo y la respuesta no es técnica: hay tres caminos y los
  tres son decisión del Desarrollador.
- **Y el detalle de cada cosa que viaja** —qué habría que tocar allá, y qué se rompe si no se
  toca— **no está en este documento**: está escrito aparte, uno por uno, para aprobarlo de a uno
  el día de la mudanza. Se lee junto con éste.
