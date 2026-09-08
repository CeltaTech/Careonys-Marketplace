# Política de Datos Personales

> **Esto es un modelo, y quien lo adopta es su Prestadora.** El texto lo redactó **CeltaTech**,
> que desarrolla y licencia el software Careonys, y lo entrega **a título de sugerencia**: cada
> Prestadora decide si lo adopta como política propia, la cambia o escribe la suya. Lo que
> CeltaTech sí sabe, y verificó, es **qué hace su software**; lo que no le corresponde decir es
> qué datos pide una Prestadora, para qué los usa y ante quién responde por ellos: **eso es de
> ella**. CeltaTech no presta el servicio de cuidado, no es parte de este trato y **no asume
> ninguna responsabilidad sobre este texto**: no es asesoramiento legal, ningún abogado lo revisó
> todavía, se entrega tal como está —sin garantía de que sirva para el caso de una Prestadora en
> particular, ni de que siga al día cuando la ley cambie—, y **responde por él quien lo publica
> bajo su nombre**.
>
> **Y hoy el software todavía no permite eso**, así que se dice acá en vez de esconderlo: este
> archivo es uno solo, igual para todas las Prestadoras, y ninguna lo adoptó ni lo pudo cambiar.
> Las tres pantallas que lo enlazan lo muestran como si fuera de la Prestadora por la que se
> entró, y no es de ninguna. Está anotado como pendiente 133 y se cierra cuando cada Prestadora
> tenga dónde poner sus propios textos.

> **Documento vivo.** Rige tal como está desde el 31 de agosto de 2026 **por decisión del
> Desarrollador**, que resolvió tomarlo por válido sin esperar a nadie: **mientras el
> proyecto no esté concluido, ésta es la versión válida**. Al
> cerrar el proyecto pasa a revisión de un abogado, junto con los dos documentos de términos, y
> lo que esa revisión corrija se escribe acá. Como todo documento vivo, entre una cosa y la otra
> puede cambiar —se agregan cláusulas, se corrigen y se sacan—, y cada cambio queda anotado en
> la §15.2.
>
> **Cómo está escrito, que es lo que lo hace confiable.** Este documento describe **lo que el
> software hace**, no lo que sería deseable que hiciera. Cada cosa que declara se midió contra el
> código y contra las migraciones que construyen la base, y va con el archivo y el renglón donde
> cualquiera lo puede comprobar. **Lo que no se pudo comprobar no se escribió como si estuviera
> hecho**: está en la §14, que es la lista de lo que este documento todavía no puede contestar.
> Un documento de datos que promete de más es peor que no tenerlo.

| | |
|---|---|
| **A quién le habla** | A toda persona cuyos datos entran en Careonys: la **Familia**, el **Paciente**, el **Asistente**, y quien figure como referencia de un Asistente |
| **De quién es esta política** | De la **Prestadora** que la adopte. CeltaTech sólo entrega el modelo |
| **Con qué software** | Careonys, licenciado por **CeltaTech** |
| **Jurisdicción** | República Argentina |
| **Última actualización** | 2 de septiembre de 2026 |

---

## 1. Qué dice y qué no dice este documento

**1.1. Qué dice.** Qué datos guarda el software, en qué lugar los guarda, quién los puede mirar,
qué se ve sin iniciar sesión, qué se registra de lo que cada quien hace, y qué pasa con todo eso
cuando una Prestadora deja de operar.

**1.2. Qué no dice.** No dice qué hace la Prestadora **fuera** del software: los papeles que
archiva en su oficina, las conversaciones que tiene por teléfono y lo que anota en su propia
contabilidad no pasan por acá y no los alcanza esta política. Tampoco dice qué se acordó entre la
Familia y la Prestadora: eso está en el contrato entre ellas.

**1.3. Los dos documentos hermanos.** Los Términos y Condiciones para Familias y los Términos y
Condiciones para Asistentes dicen qué es el servicio y qué se compromete cada parte. Este
documento dice qué pasa con los datos. Donde los tres hablen del mismo hecho, dicen lo mismo.

---

## 2. Quién responde por sus datos

**2.1. La Prestadora.** Es con quien la Familia y el Asistente tienen trato, es quien decide qué
datos pide y para qué los usa, y es a quien hay que dirigirse por cualquier cosa relativa a
ellos.

**2.2. CeltaTech.** Licencia el software a la Prestadora. No es parte del cuidado, no elige qué
datos se piden y no interviene en la relación entre la Familia, el Paciente y el Asistente. **Su
única contraparte es la Prestadora**: con usted no tiene vínculo de ninguna clase. El software se
entrega con una configuración estándar y cada Prestadora lo ajusta a lo que necesita, así que
**qué datos se piden y para qué se usan es decisión de ella, no de CeltaTech**.

**2.3. La responsable de la base es la Prestadora**, y es lo mismo que dicen los dos documentos de
términos: todo pedido sobre sus datos se le hace a ella.

**2.4. Y queda un punto pendiente, más chico de lo que era.** El 31 de agosto de 2026 el
Desarrollador decidió que **la Prestadora no le traslada a CeltaTech ninguna responsabilidad por
el uso que hace del software**, ni ante usted ni ante nadie. Eso contesta el reparto. Lo que
sigue sin contestar es de nomenclatura y es jurídico, no técnico: **con qué nombre figura cada
una ante un organismo de control** —quién consta como responsable de la base y quién como quien
la opera por cuenta de aquella—, porque son dos personas jurídicas distintas y la ley les da
figuras con nombre propio. Queda anotado en la §14 y se completa cuando la revisión legal lo
resuelva. **Para usted no cambia nada**: se le pide siempre a la Prestadora.

---

## 3. Qué datos se guardan

**3.1. Del Asistente, cuando carga su legajo.** Nombre y apellido, documento, correo, celular,
CUIT o CUIL, fecha de nacimiento, género, nacionalidad, domicilio, zonas donde trabaja, CBU o
alias bancario, tipo de Asistente, nivel de estudios, cursos, patologías que sabe atender, tareas
para las que está autorizado, modalidades de contratación, valor hora pretendido y disponibilidad
por día y turno. La columna de cada uno está declarada en
`supabase/migrations/0001_base_del_esquema.sql:460-482`, y ahí se ven una por una: el nombre en
`supabase/migrations/0001_base_del_esquema.sql:462`, el documento en `:463`, el teléfono en `:464`, el
correo en `:85`, el domicilio en `:95` y los datos bancarios en `:96`.

**3.2. Y además, el legajo se completa con fichas.** Matrícula, estudios, experiencia laboral,
papeles presentados y referencias son tablas aparte, una fila por cada cosa cargada, creadas en
`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql`.

**3.3. De la Familia y del Paciente, cuando se publica un Aviso.** El nombre del Paciente
—`supabase/migrations/0001_base_del_esquema.sql:2155`—, sus patologías —`:154`—, la zona, la
modalidad, los días y los turnos, y cómo volver a comunicarse con quien publicó, que se guarda en
`supabase/migrations/0001_base_del_esquema.sql:2162` y que la propia migración describe como
«nombre, correo y teléfono» en `supabase/migrations/0001_base_del_esquema.sql:2183-2185`.

**3.4. Hay un campo de texto libre, y conviene saberlo antes de escribir en él.** El Aviso tiene
una descripción donde la Familia cuenta la situación con sus palabras
—`supabase/migrations/0001_base_del_esquema.sql:151`—. La propia migración lo dice sin
adornos: es «la única que puede traer datos de una persona sin que nadie los haya pedido»
(`supabase/migrations/0001_base_del_esquema.sql:2197-2199`). **Conviene contar lo necesario y no
más.**

**3.5. Datos de otras personas, que ni la Familia ni el Asistente son.** Son dos casos y los dos
existen. El primero: la Familia carga los datos del **Paciente**, que casi nunca es quien está
escribiendo. El segundo: el Asistente carga **referencias**, con el nombre, el teléfono y la
relación de una persona que no está presente
—`supabase/migrations/0001_base_del_esquema.sql:3014-3016`—. En los dos
casos, quien los carga tiene que estar autorizado a hacerlo. Las referencias no salen nunca al
directorio, y así está escrito en la propia tabla:
`supabase/migrations/0001_base_del_esquema.sql:3027`.

---

## 4. La geolocalización al fichar

**4.1. Qué se guarda.** Cuando el Asistente marca su entrada o su salida desde el teléfono, el
software guarda **la posición desde donde marcó**, junto con el momento y el tipo de marca. Las
dos columnas están declaradas en `supabase/migrations/0001_base_del_esquema.sql:2435-2436`.

**4.2. Qué NO se guarda.** **No se guarda ningún recorrido.** El software pide la posición una
sola vez por cada toque del botón y nunca queda siguiendo al teléfono: la instrucción que serviría
para eso no aparece en ninguna parte del código. Tampoco se guarda ningún dato del aparato.

**4.3. Quién la ve.** El propio Asistente, siempre
—`supabase/migrations/0001_base_del_esquema.sql:4513-4522`—, y la Familia para la que él
diga que fue esa jornada, si es que lo dice
—`supabase/migrations/0001_base_del_esquema.sql:4522-4528`—. Cuando no lo dice, no la ve
nadie más que él. **El personal de la Prestadora no la ve en ningún caso**: las dos reglas de la
tabla son la del Asistente que fichó y la de la Familia del vínculo, y ninguna lo nombra
—`supabase/migrations/0001_base_del_esquema.sql:4517-4519`—, y la
propia tabla lo deja escrito
—`supabase/migrations/0001_base_del_esquema.sql:2446-2448`—. El motivo está en la §8.4:
mirar a qué hora entra y sale una persona es dirigir el trabajo.

**4.4. Qué se dice antes de marcar.** La pantalla pregunta, antes de tomar la posición, **para
quién es esa jornada**, y aclara ahí mismo que la Familia elegida va a ver la marca
—`pwa-asistente/index.html:449-455`—. La respuesta que viene puesta es **no decirlo**
—`pwa-asistente/index.html:451`—, y con ésa la marca no sale del propio Asistente. Terminada la
marca, el aviso de confirmación muestra las coordenadas que quedaron guardadas
—`pwa-asistente/index.html:1898-1901`—. Aparte de eso está el pedido de permiso que hace el
navegador por su cuenta.

---

## 5. Los datos de salud

**5.1. El Reporte diario.** Cada jornada, el Asistente puede dejar asentada la presión, la
glucemia, la medicación que administró y las novedades del día. Las cuatro columnas están en
`supabase/migrations/0001_base_del_esquema.sql:3038-3041`, y la tabla se llama por lo que es:
`reportes`.

**5.2. Las novedades del día son texto libre.** Vale lo mismo que en la §3.4: lo necesario para el
cuidado, y no más.

**5.3. Las patologías, que son dos cosas distintas y no conviene confundirlas.** Las del
**Paciente** son un dato de salud suyo y las carga la Familia
—`supabase/migrations/0001_base_del_esquema.sql:154`—. Las del **Asistente** no son un dato de salud
de nadie: son la lista de lo que sabe atender, o sea su experiencia
—`supabase/migrations/0001_base_del_esquema.sql:468`—, y por eso, y sólo por eso, esas sí se
publican en el directorio.

**5.4. Lo que el software no guarda.** No hay historia clínica: no existe ninguna columna de
diagnóstico, de alergias ni de tratamiento en toda la base. Lo que hay son esos cuatro campos por
jornada y nada más.

**5.5. Quién lee el Reporte diario.** El Asistente que lo escribió
—`supabase/migrations/0001_base_del_esquema.sql:4767-4772`— y la Familia del Aviso del
que cuelga, y nadie más
—`supabase/migrations/0001_base_del_esquema.sql:4774-4778`—. **El personal de la
Prestadora no lo lee**: ninguna regla de la tabla lo nombra, por lo mismo que la fichada de
la §4.3, y la propia tabla lo deja escrito
—`supabase/migrations/0001_base_del_esquema.sql:3051`—.

**5.6. Pero hoy la Familia todavía no lo ve, aunque la regla ya esté escrita.** La pantalla donde el
Asistente guarda el reporte no anota de qué Aviso es
—`pwa-asistente/index.html:1940-1941`—, así que ninguna fila cumple la condición y la pantalla de
la Familia aparece vacía. Se dice acá porque un hueco declarado es mejor que un hueco tapado.

---

## 6. Los archivos y las fotos

**6.1. Cuáles son.** Cuatro: la foto del Perfil, el documento de identidad, el certificado de
antecedentes y el título o certificado de formación.

**6.2. Los tres papeles se guardan en un depósito privado.** Está declarado privado en la misma
migración que lo crea: `supabase/migrations/0001_base_del_esquema.sql:5951`. Un papel de ésos no
tiene dirección pública. Cuando el personal de la Prestadora necesita abrir uno, el software pide
una dirección firmada que **vence sola a los pocos minutos** —la función que la fabrica es
`urlFirmada()`, de `js/auth.js`, y es la única puerta—.

**6.3. Quién alcanza esos papeles.** Su dueño, porque la carpeta es la suya
—`supabase/migrations/0001_base_del_esquema.sql:5949`—, y el personal de la Prestadora de ese
legajo, y de ninguna otra
—`supabase/migrations/0001_base_del_esquema.sql:5953`—.

**6.4. La foto del Perfil es distinta, y hay que decirlo con todas las letras.** Está en un
depósito **público** —`supabase/migrations/0001_base_del_esquema.sql:5949`—, porque el directorio
se mira sin iniciar sesión y la foto tiene que verse ahí. Consecuencia medida: **quien conozca la
dirección exacta de una foto la puede abrir sin sesión, esté o no publicado ese Perfil.** Esa
dirección no sale del directorio ni de ninguna otra pantalla, así que no se llega por casualidad;
pero el depósito no distingue entre una foto publicada y una que no lo está. Queda anotado en la
§14.

---

## 7. Qué se ve sin iniciar sesión

**7.1. Sólo el directorio de una Prestadora, y sólo de quien aceptó aparecer.** Ninguna tabla con
datos de una persona está al alcance de quien no inició sesión: el permiso se le quita a `anon`
antes de que exista una sola tabla —`supabase/migrations/0001_base_del_esquema.sql:56` y `:57`—.
Lo que sí contesta sin sesión son seis funciones que **exigen el nombre corto de una
Prestadora** —`supabase/migrations/0001_base_del_esquema.sql:5348`, `:5439`, `:5567`, `:5586`, `:5623` y `:5633`—, así que no
existe la respuesta que mezcla dos empresas ni la lista de todas; y tres lugares que no tienen
dato de nadie: la oferta comercial de la portada, la oferta general de cursos y las reglas que
dicen qué parece un teléfono adentro del chat —`supabase/migrations/0001_base_del_esquema.sql:5807`, `:5816` y `:5840`—.

**7.2. Qué muestra exactamente un Perfil del directorio.** Nombre, tipo de Asistente, zonas,
patologías que atiende, tareas, valor hora, género, foto, si acepta reemplazos urgentes, desde
cuándo está, y qué comprobaciones le hizo su Prestadora. La lista se lee entera en
`supabase/migrations/0001_base_del_esquema.sql:743-754`.

**7.3. Qué NO sale del directorio, nunca.** Ni teléfono, ni correo, ni documento, ni domicilio, ni
CUIT, ni datos bancarios, ni fecha de nacimiento, ni ninguno de los tres papeles del legajo. De
todos los archivos del legajo, lo único que la vista deja salir es la foto
—`supabase/migrations/0001_base_del_esquema.sql:752`—.
Cuando en un Perfil aparece «domicilio comprobado», lo que sale es **que se comprobó**, no el
domicilio.

**7.4. Y hay que estar publicado y validado, las dos cosas.** Un Perfil aparece sólo si la
Prestadora terminó de validar el legajo **y** el Asistente autorizó que se publique
—`supabase/migrations/0001_base_del_esquema.sql:793`—.
Esa autorización **arranca apagada**
—`supabase/migrations/0001_base_del_esquema.sql:443`—: no contestar nunca
termina en un Perfil publicado.

**7.5. Ningún Aviso se ve sin sesión.** Lo que una Familia publica no está en ninguna pantalla
abierta.

---

## 8. Quién ve qué adentro de una Organización

**8.1. La Organización es la Prestadora.** Cada una tiene su propio espacio de datos, y el
software está construido para que uno no alcance al otro.

**8.2. Cómo se decide de qué Prestadora es quien está mirando.** Por su membresía, resuelta en la
base contra la sesión firmada, en una única función que consultan todas las reglas:
`supabase/migrations/0001_base_del_esquema.sql:417`, cuyo cuerpo entero es el renglón
`supabase/migrations/0001_base_del_esquema.sql:420-422`. **Nunca sale de algo que venga en el
pedido**, y así lo declara la propia base en
`supabase/migrations/0001_base_del_esquema.sql:427-429`. Al guardar tampoco se puede elegir:
la Prestadora se pone sola, porque es el valor por omisión de la columna
—`supabase/migrations/0001_base_del_esquema.sql:2778`—, así que ninguna pantalla puede elegirla, ni por error ni a
propósito.

**8.3. Las tres barreras.** Entre Prestadoras, por la membresía. Entre Asistentes, porque cada uno
alcanza su propio legajo y ninguno más
—`supabase/migrations/0001_base_del_esquema.sql:1584`—. Y **entre Familias de una misma
Prestadora**, porque cada Aviso sabe quién lo publicó y sólo lo ve quien lo publicó
—`supabase/migrations/0001_base_del_esquema.sql:3979` y
`supabase/migrations/0001_base_del_esquema.sql:4480-4482`—. Esa tercera barrera es la
que impide que una Familia vea los Avisos, los horarios, los mensajes, los reportes ni los
fichajes de otra.

**8.4. Qué ve el personal de la Prestadora, que no es todo.** Ve lo que necesita para decidir
**quién entra**: los legajos de su Organización, con sus verificaciones
—`supabase/migrations/0001_base_del_esquema.sql:4688-4690`—, y los Avisos publicados en ella, con
lo que cada Familia haya contado adentro
—`supabase/migrations/0001_base_del_esquema.sql:4480-4485`—. **No ve la fichada,
ni el Reporte diario, ni la conversación entre la Familia y el Asistente.** Las tres reglas que se
las daban se sacaron, y hoy no queda ni una regla de esas tres tablas que nombre al personal de
la Prestadora. La conversación la leen las dos partes y nadie más
—`supabase/migrations/0001_base_del_esquema.sql:4501-4503`—. **El motivo
es el que da forma a todo el producto**: la Prestadora controla quién entra, y no dirige el
trabajo; mirar los horarios que cumple una persona, lo que hizo en cada jornada y lo que habla con
la Familia sería dirigirlo. Quién cuenta como personal lo resuelve una única función
—`supabase/migrations/0001_base_del_esquema.sql:1175`— y **no se autoasigna**: quien se registra
por su cuenta no puede tomar ese lugar, y así está escrito adentro de la función que crea el
perfil —`supabase/migrations/0001_base_del_esquema.sql:339-344`—. Desde una sesión, además, ni el rol ni la
Prestadora de un perfil se pueden reescribir
—`supabase/migrations/0001_base_del_esquema.sql:1029-1035`—.

**8.5. CeltaTech, adentro de los datos de una Prestadora, no entra por ninguna otra puerta.**

---

## 9. Cookies, rastreo y lo que queda en el navegador

**9.1. El software no usa cookies. Ninguna.** No hay una sola línea que escriba ni lea una cookie
en todo el sitio.

**9.2. No hay medidor de visitas, ni píxel, ni etiqueta publicitaria, ni socio publicitario.** No
se mide a quién entra, no se arma ningún perfil de navegación y no se le entrega nada a terceros
con fines de publicidad. **Esto es una ventaja y por eso queda escrito.**

**9.3. Lo que el navegador sí guarda, y para qué.** Tres cosas, y ninguna es un rastreador: el
**idioma** elegido, para no volver a preguntarlo; el **correo** escrito en la pantalla de acceso,
sólo mientras se pasa a la pantalla de recuperar la clave, y se borra apenas se usó; y el
**testigo de la sesión**, que es lo que evita tener que escribir la clave en cada pantalla.

**9.4. Tres piezas vienen de afuera, y hay que decir qué implica.** La tipografía, los iconos y la
biblioteca que habla con la base se piden a servidores de terceros. **Ninguna de las tres pone
cookies ni rastrea**, pero las tres, por el solo hecho de entregar el archivo, ven la dirección de
red de quien entró. Es un hecho medido y se dice tal cual.

**9.5. Los programas de teléfono guardan sólo su propio armazón.** Guardan las pantallas y los
catálogos fijos para poder abrirse sin señal, y **tienen escrito que no guarden ninguna respuesta
con datos de personas**.

---

## 10. Qué queda registrado de quién hizo qué

**10.1. Hoy no hay registro de auditoría, y ésta es la falta más grande de este documento.** No
queda escrito quién miró un dato, quién dio de alta o de baja a una Prestadora, ni quién cambió un
permiso. Se revisaron las migraciones que construyen la base y ninguna crea una tabla que lo
asiente.

**10.2. Lo único que hoy queda firmado es la verificación de un papel del legajo.** Ahí sí se
guarda **quién** verificó y **cuándo**
—`supabase/migrations/0001_base_del_esquema.sql:574-575`—. Y guarda la
constancia, no el contenido: dice que el papel se verificó, no lo que el papel decía. Con una
salvedad medida: hay **una sola fila por papel**
—`supabase/migrations/0001_base_del_esquema.sql:3493`—, así que queda el
último estado y no el historial.

**10.3. Quién puede leer esas verificaciones.** El personal de la Prestadora, y el Asistente las
suyas, **que puede mirar y no puede tocar**
—`supabase/migrations/0001_base_del_esquema.sql:4883-4885`—.

**10.4. Está anotado en la §14**, porque un servicio que guarda datos de salud tiene que poder
decir quién los miró, y hoy no puede.

---

## 11. La baja, y qué queda escrito igual

**11.1. Darse de baja no borra nada.** Cuando una Prestadora deja de operar, lo que cambia es su
estado —`supabase/migrations/0001_base_del_esquema.sql:3072`— y
nada más. Legajos, Avisos, Reportes diarios, fichajes y verificaciones **quedan escritos**.

**11.2. Lo que sí cambia enseguida.** Una Prestadora que no está activa **desaparece del
directorio público** —`supabase/migrations/0001_base_del_esquema.sql:867`—.
Deja de tener puerta de calle, mientras su personal, que tiene cuenta, sigue entrando.

**11.3. Lo que un Asistente puede hacer hoy con su Perfil.** Puede dejar de publicarlo, y entonces
sale del directorio. Su legajo sigue guardado en su Prestadora: dejar de mostrarse y borrarse no
son la misma cosa.

**11.4. Y acá hay dos cosas que faltan.** **No hay plazo de conservación decidido** —cuánto tiempo
se guarda un legajo, un Reporte diario o un fichaje después de que terminó el servicio—, y **no
hay procedimiento escrito de supresión**. Hoy el pedido de suprimir se atiende a mano, se le hace
a la Prestadora, y el software no lo asiste. Las dos quedan anotadas en la §14.

---

## 12. Sus derechos

**12.1. Cuáles son.** Por la **Ley 25.326 de Protección de los Datos Personales**, usted puede
pedir acceder a sus datos, rectificarlos, actualizarlos y suprimirlos.

**12.2. A quién se los pide.** A **su Prestadora**. Hoy el software no tiene una pantalla que haga
ninguna de esas cuatro cosas de punta a punta: lo que un Asistente sí puede hacer por su cuenta es
corregir su propio legajo y dejar de publicar su Perfil. El resto se pide y se atiende a mano.

**12.3. Punto pendiente: el organismo de control.** Esa ley prevé un organismo ante el cual
reclamar, y **este documento todavía no lo nombra**, igual que los dos documentos de términos. El
motivo es el mismo y está escrito: los avisos legales de este producto salen del documento legal
del país, ese documento hoy no trae nada sobre protección de datos personales, y la regla de la
empresa es que un aviso legal no se deduce por parecido con otro país ni se improvisa. **Mientras
tanto el reclamo se le hace a su Prestadora**, que es la responsable de la base.

**12.4. Y falta además** decidir cómo se reparte la responsabilidad entre la Prestadora y
CeltaTech ante ese organismo. Está en la §2.4 y anotado en la §14.

---

## 13. Seguridad

**13.1. Cada Prestadora vive aislada de las demás**, y el aislamiento lo sostiene la base, no la
pantalla: aunque alguien pidiera un dato ajeno sin pasar por ninguna pantalla, la base no se lo
da. Es lo de la §8.

**13.2. Los papeles del legajo se guardan privados** y se sirven con dirección firmada que vence
sola. Es lo de la §6.

**13.3. Cada quien recibe el permiso mínimo que su función necesita**, y ante la duda el software
niega en lugar de permitir.

**13.4. La clave.** El software nunca la muestra ni la manda por correo, y quien la escribe es el
único que la conoce. **No compartirla con nadie es parte de la seguridad de sus datos**, porque
quien entra con la clave de otro entra como esa persona.

**13.5. Lo que ningún sistema puede prometer.** Ninguna medida vuelve imposible un incidente. Lo
que sí se puede prometer es que lo que este documento declara está construido y se puede
comprobar, renglón por renglón.

---

## 14. Lo que este documento todavía no puede contestar

Están acá y no escondidos adentro de un capítulo, porque un hueco tapado es peor que un hueco
declarado. Ninguno se rellena adivinando.

| Qué falta | Por qué no se contesta acá |
|---|---|
| **Cuál es el organismo de control** ante el que se reclama | El documento legal de Argentina de este producto no trae nada sobre protección de datos personales, y un aviso legal no se improvisa ni se deduce por parecido con otro país. Se completa cuando ese documento lo incluya (§12.3) |
| **Con qué nombre figura cada una** ante ese organismo: quién consta como responsable de la base y quién como quien la opera por cuenta de aquella | El reparto ya no está abierto —la Prestadora responde por el uso que hace del software y no lo traslada (§2.4)—; lo que falta es cómo se llama cada figura ante el organismo, que es jurídico y no técnico. Va con la revisión legal del cierre del proyecto |
| **Ante qué tribunales se litiga** por un asunto de datos personales | Depende de la respuesta anterior y del contrato entre la Familia y su Prestadora |
| **Cuánto tiempo se conserva cada dato** | Hoy no se borra nada, y ningún plazo está decidido (§11.1) |
| **Cómo se ejerce la supresión** de punta a punta | El software no la asiste: hoy se pide y se atiende a mano (§12.2) |
| **Que quede registrado quién miró o cambió un dato** | No existe ningún registro de auditoría en la base (§10.1) |
| **Que la foto del Perfil deje de estar al alcance de quien conozca su dirección** | El depósito de fotos es público porque el directorio se ve sin sesión, y no distingue entre publicada y no publicada (§6.4) |

---

## 15. Cambios de este documento

**15.1. Cómo cambia.** Este documento cambia. Cuando cambie, la fecha de la tabla de arriba se
actualiza y el cambio se anota abajo. Si un cambio afecta algo que usted ya aceptó, se le pide que
lo acepte de nuevo.

**15.2. Registro de cambios.**

| Fecha | Qué cambió |
|---|---|
| 31 de agosto de 2026 | Primera redacción. Se escribió de cero, midiendo cada afirmación contra el código y contra las migraciones. Se declararon por primera vez la geolocalización al fichar, los datos de salud del Reporte diario, los datos de terceros, qué expone exactamente el directorio público, que el software no usa cookies ni rastreadores, que no hay registro de auditoría y que la baja no borra nada. Quedan marcados como huecos el organismo de control, el reparto de responsabilidad con CeltaTech, los tribunales, los plazos de conservación y el procedimiento de supresión |
| 31 de agosto de 2026 | **El documento se declara lo que es: un modelo.** El Desarrollador precisó ese día que los documentos legales de un producto de CeltaTech viven adentro de sus términos y de sus contratos con el Cliente, y que a la Prestadora CeltaTech sólo puede entregarle **un modelo, a título de sugerencia y sin ninguna responsabilidad sobre él**. El encabezado ahora lo dice en su cara —quién lo entrega, que no es asesoramiento legal, que se entrega tal como está y que adoptarlo es decisión de la Prestadora— y **admite que el producto todavía no cumple esa forma**, porque el texto no se entrega sino que se acepta. Cambian el encabezado y la ficha de arriba |
| 31 de agosto de 2026 | **Se separaron los dos mundos**, por decisión del Desarrollador de ese día: CeltaTech licencia el software a la Prestadora y no tiene vínculo de ninguna índole con la Familia, el Paciente, el Asistente ni nadie que trate con una Prestadora, y **la Prestadora no le traslada a CeltaTech ninguna responsabilidad por el uso que hace del software**. Cambia la §2.2, y el hueco de la §2.4 se achica: el reparto queda contestado y sigue abierta sólo la nomenclatura ante el organismo de control |
| 2 de septiembre de 2026 | **La Prestadora dejó de mirar la jornada, y este documento lo dice.** Tres migraciones cambiaron quién ve qué, y el texto describía el mundo anterior. La fichada dejó de estar al alcance del personal de la Prestadora y pasó a verla, además del Asistente, la Familia del vínculo que él marque (`supabase/migrations/0001_base_del_esquema.sql:4522-4528`); el Reporte diario dejó de estar a su alcance por la misma razón; y la lectura del reporte colgado de un Aviso y la tabla de mensajes se cerraron del todo, porque la condición no filtraba lo que su comentario decía (`supabase/migrations/0001_base_del_esquema.sql:4774-4778` y `:4697-4699`). Cambian la §4.3, la §5.5 y la §8.4. Se agrega la §5.6, que declara que la Familia todavía no ve el reporte en la pantalla aunque la regla ya esté escrita. Y se reescribe la §4.4 y sale su hueco de la §14: la pantalla del fichado pregunta ahora, antes de tomar la posición, para quién es la jornada, y aclara quién va a ver la marca (`pwa-asistente/index.html:449-455`) |

---

## 16. Ley aplicable

Este documento se rige por las leyes de la **República Argentina**, y en particular por la **Ley
25.326 de Protección de los Datos Personales**. El tribunal competente es el que corresponda al
acuerdo entre usted y su Prestadora, con la salvedad de la §14.

---

## 17. Contacto

Por cualquier cosa relativa a sus datos —acceder, corregir, actualizar, suprimir, o simplemente
entender qué se guarda— escriba a **su Prestadora**: es quien responde. Sus datos de contacto
están en la pantalla por la que entró.

---

*Careonys es un producto de CeltaTech.*
