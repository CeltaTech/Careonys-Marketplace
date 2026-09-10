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

## Lo que este documento todavía no mira

**Se comparó lo que cada lado guarda, no cómo lo protege.** Falta la segunda pasada: las políticas
de acceso, los disparadores y los permisos de cada tabla de las dos bases. Hasta que esa pasada no
esté hecha, **ninguna conclusión de acá alcanza para mover un dato**, porque una tabla mejor
diseñada y peor protegida no es la mejor de las dos.

Y falta el reparto de lo que no está acá porque no choca: lo que sólo tiene Careonys —el registro
de auditoría, la sesión de soporte, los cobros, las pasarelas de pago, los consentimientos, las
Familias como entidad— y lo que sólo tiene el Marketplace —los cursos y evaluaciones, las guías de
cuidado, la disponibilidad horaria, el directorio público, el sitio público, los tres idiomas y la
red de comprobaciones—. Eso vive en `docs/APORTES_A_CAREONYS.md` y se lee junto con esto.
