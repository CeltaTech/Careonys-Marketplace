# Plan: los vencimientos los controla el sistema

> **Estado: escrito, sin aprobar.** Es el paso 1 —el inventario— y el paso 2 —el plan— de la
> regla de la empresa «antes de un cambio grande». **No se escribió nada de código todavía**, y no
> se escribe hasta que el Desarrollador apruebe. Escrito el 31 de agosto de 2026.
>
> Sale del pendiente 98, que lo dice en una línea: **el producto promete avisar antes de que venza
> una matrícula, y no hay nada detrás.**

---

## 1. Qué promete el producto hoy

La ficha de Matrícula, en los tres idiomas, le dice a cada persona que carga su legajo:

> *«Se avisa antes de que venza. Una matrícula vencida inhabilita para atender.»*

Está en `data/catalogo-fichas.json:44`, y lo lee toda persona que carga su legajo desde la
aplicación del Asistente. Son **dos promesas distintas**, y las dos están sin cumplir:

1. **Se avisa antes.** No existe ningún aviso, de ninguna clase, por ningún medio.
2. **Vencida inhabilita.** No existe ningún control: la fecha se guarda y nadie la vuelve a mirar.

Y el catálogo de verificaciones lo tenía anotado desde el principio, con estas palabras:

> *«Un plazo que nadie mira no es un plazo.»* — `data/catalogo-verificaciones.json:7`

---

## 2. Inventario: qué hay hecho, qué no, y qué está a medio hacer

Esto es lo que se comprobó contra el código y contra las 47 migraciones el 31 de agosto de 2026,
no contra lo que dicen los documentos.

### 2.1. Las columnas están, las tres. Cargada hay una sola

| Dónde | Columna | Cómo está en el esquema | Qué tiene adentro hoy |
|---|---|---|---|
| `matriculas_asistente` | `vencimiento` | `date not null` — `supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:49` | **3 filas y las tres con fecha.** La escribe el producto: la ficha la pide obligatoria (`data/catalogo-fichas.json:40`) y la guarda `js/apiClient.js:387` |
| `documentos_asistente` | `vencimiento` | `date`, puede faltar — `supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:125` | **Nada, y no porque falte sembrarla: la tabla no la escribe nadie.** Es el grupo (a) del pendiente 111 |
| `verificaciones_asistente` | `plazo_vence_el` | `date`, sólo en los tipos que llevan plazo — `supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:144` | **14 filas y ninguna con plazo.** Es una de las siete columnas vacías del pendiente 110 |

Medido contra la base de esta máquina el 31 de agosto de 2026, tabla por tabla, y no contra las
migraciones. **Está cargada justo la que sostiene la promesa** —la de la Matrícula, que es la
ficha donde el producto dice «se avisa antes de que venza»—, así que el paso 3 se puede construir
y probar con datos de verdad desde el primer día. Las otras dos no.

**Y esa diferencia hay que decirla acá, porque si no se convierte en una prueba que no puede
fallar.** Un control de vencimientos que mire las tres columnas por igual va a encontrar cero
papeles vencidos en dos de las tres, siempre, y va a contestar «no hay nada que avisar» con toda
la razón aparente. Sale verde por el mismo motivo por el que saldría verde si estuviera roto: no
hay con qué distinguir un caso del otro. Por eso el control negativo del punto 1 de la sección 7
—una matrícula vencida ayer que **sí** aparece hoy en el directorio— se hace con la Matrícula, que
es la única de las tres que puede aportar el caso.

Lo anterior decía «el dato está, lo que falta es alguien que lo mire». Es cierto en un tercio.
**Antes de que alguien mire, en dos de las tres hay que conseguir qué mirar**, y eso no lo cierra
este plan: el grupo (a) del pendiente 111 espera que el Desarrollador elija cuál de las dos formas
de guardar los papeles queda, y `verificaciones_asistente.plazo_vence_el` espera lo mismo que el
resto del pendiente 110.

### 2.2. El esquema fue escrito esperando esto, y lo que esperaba nunca llegó

Tres señales, todas de la misma migración:

- **`verificaciones_asistente.estado` ya acepta `vencido`**
  (`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:143`), y **nadie lo
  escribe nunca**. Es un valor legal que ninguna fila tiene.
- **Hay un índice construido para una consulta que nadie escribió**: `idx_verificaciones_plazo`,
  sobre `plazo_vence_el` y sólo donde no es nulo
  (`supabase/migrations/0004_legajo_matricula_verificaciones_banderas.sql:237`). Un índice es una
  apuesta a que alguien va a preguntar por esa columna. Nadie preguntó nunca.
- **El catálogo marca el campo**: la fecha de la Matrícula lleva `"vigencia": true`
  (`data/catalogo-fichas.json:43`), que es la manera de decir «esta fecha vence». **Ningún guion
  lee esa marca**, comprobado buscándola en todo el proyecto.

### 2.3. Del lado del navegador no hay absolutamente nada

Buscando `vencimiento` y `plazo_vence_el` en todos los `.js` y `.html` del proyecto aparecen
**cuatro apariciones y las cuatro son comentarios sobre otra cosa**: los enlaces firmados del
depósito de archivos, que también vencen. Ninguna pantalla muestra la fecha, ninguna la compara
con hoy, ninguna avisa.

### 2.4. No hay con qué correr una tarea a hora fija

- **No hay `pg_cron`**, ni `pg_net`, ni ninguna llamada a un servicio de afuera desde la base:
  buscado en las 47 migraciones y en `supabase/`.
- **Hay una sola función de borde**, `supabase/functions/alta-y-baja`, y es la puerta por donde
  CeltaTech da de alta y de baja una Prestadora. No hay ninguna programada.
- **El correo depende del pendiente 45**: hoy el proyecto alojado manda con el servicio de fábrica,
  que tiene un tope bajo, y por eso ni siquiera el alta de un Asistente llega bien.

### 2.5. Sí hay, en cambio, un precedente exacto de cómo se configura una Prestadora

Y conviene copiarlo, porque ya resolvió los dos errores que este trabajo va a encontrar:

- **La forma**: una fila por Prestadora, con `tenant_id` único
  (`supabase/migrations/0018_cada_prestadora_pondera_su_puntaje.sql:38`).
- **El valor de fábrica se siembra con un disparador sobre `tenants`**, no adentro de la puerta de
  alta (`supabase/migrations/0046_toda_prestadora_nace_con_su_configuracion.sql:85`), porque hay
  dos caminos por los que nace una Prestadora y el que había fallado era el otro.
- **Y el motivo por el que hay valor de fábrica**, escrito en la 0018 y que vale igual acá: *una
  tabla vacía no dice «se avisa con treinta días», dice «todavía nadie configuró esto»*.

### 2.6. Dónde está la puerta que habría que cerrar

El directorio tiene hoy dos condiciones, y las dos hacen falta: el legajo validado por la
Prestadora y el perfil publicado por la persona
(`supabase/migrations/0037_quien_cubre_una_region_entera_aparece_por_sus_municipios.sql:119` y
`:120`). **Ahí es donde «inhabilita» se vuelve algo y no una frase.**

---

## 3. Lo que ya está decidido, y no se vuelve a discutir

Buena parte de este trabajo **no es una decisión nueva**: es cumplir lo que ya se decidió y quedó
escrito. Se lista para que la aprobación sea corta.

| Qué | Quién y cuándo | Dónde está escrito |
|---|---|---|
| Qué verificación cierra qué puerta —alta, publicación o ninguna— | el Desarrollador, 24 de agosto de 2026 | `data/catalogo-verificaciones.json` |
| Antecedentes penales: 15 días desde el alta (`:24`), y vencido el plazo **bloquea el legajo**, no sólo la publicación | ídem | `data/catalogo-verificaciones.json:26` |
| Los penales se vuelven a pedir a los 6 meses, y eso es criterio de la Prestadora y no de la ley, **así que es un parámetro** | ídem | `data/catalogo-verificaciones.json:29` |
| Matrícula vencida inhabilita **en cualquier modalidad** | ídem | `data/catalogo-verificaciones.json:38` |
| Certificado de salud: se renueva al año, vencido deja de publicar | ídem | `data/catalogo-verificaciones.json:56` |
| El detalle de la validación lo ven dos y nadie más: la Prestadora y la propia Asistente | el Desarrollador, 25 de agosto de 2026 | `data/catalogo-verificaciones.json:8` |
| Esto pertenece al módulo **Documentación y vencimientos**, que es compartido | | `docs/MODULOS.md:49` |
| Y mientras no exista ningún módulo, lo compartido se construye acá con ese reparto | | `CLAUDE.md` de este producto, sección 3 |
| Y el rumbo: **se automatiza al máximo y la Prestadora configura bien una vez para no andar de la rutina después** | el Desarrollador | citado en el pendiente 98 |

---

## 4. La decisión de arquitectura, que es una sola y ordena todo lo demás

**La fecha de hoy no es un dato que se guarde.**

La tentación es escribir `estado = 'vencido'` en la fila el día que vence, que además es lo que la
columna parece estar pidiendo. **Eso es guardar el resultado de una cuenta que cambia sola todas
las noches.** Si el trabajo que la escribe no corre un día —porque falló, porque nadie lo
programó, porque la base estuvo caída—, las filas quedan diciendo que están vigentes. Y lo peor:
**quedan diciéndolo con la misma cara** que las que sí lo están. Es el mismo error que ya costó
caro en este producto: dos copias del mismo dato terminan siempre diciendo cosas distintas
(`supabase/migrations/0017_un_solo_nombre_para_validado.sql`).

Entonces se parte en dos cosas que se parecen y no son la misma:

| | **El estado** | **El aviso** |
|---|---|---|
| Qué es | si un papel está vigente, por vencer o vencido | el mensaje que sale hacia una persona |
| De qué depende | de la fecha guardada y de hoy | de que alguien lo mande |
| Cómo se resuelve | **se calcula al leer**, nunca se guarda | **se guarda**, porque mandar dos veces el mismo mensaje es molestar dos veces |
| Necesita tarea programada | **no** | sí |
| Se puede construir hoy | **sí** | no: espera el correo y la palabra |

Esta partición es la que permite que **lo más importante se pueda hacer ya**. Que una matrícula
vencida saque a esa persona del directorio no necesita ningún trabajo programado, ninguna cuenta
de correo y ninguna palabra nueva: necesita una condición más en una vista.

---

## 5. El plan, en cinco pasos

Cada paso deja el producto entero y andando. Los cuatro primeros no dependen de nada que esté
trabado; el quinto sí, y por eso va último.

### Paso 1 — El estado se calcula, en un solo lugar

Una función SQL que, dado un legajo, diga qué papeles tiene vencidos y cuáles vencen dentro de los
próximos tantos días. **Un solo punto de verdad**, como pide la regla de la empresa: la vista del
directorio, la pantalla de la Prestadora y el futuro mensaje preguntan los tres a la misma
función, no cada uno con su propia cuenta de días.

- Es `SECURITY DEFINER` y por lo tanto **revoca `PUBLIC` y `anon` en la misma migración**; conserva
  `authenticated` porque la van a llamar políticas y vistas.
- No agrega ninguna columna y no escribe nada.
- Termina con `NOTIFY pgrst, 'reload schema';`.

### Paso 2 — Con cuánta anticipación avisa, lo configura la Prestadora

Una tabla de configuración con la forma del precedente: una fila por Prestadora, `tenant_id`
único, RLS estricta, y **el valor de fábrica sembrado por un disparador sobre `tenants`**, para que
la Prestadora que nazca mañana nazca configurada igual que las de hoy.

Qué guarda, como mínimo: **con cuántos días de anticipación se avisa**, si se repite mientras no se
renueve, y **a quién** —a la persona, a la Prestadora, o a las dos—.

Los valores de fábrica son la pregunta 2 de la sección 6.

### Paso 3 — La puerta: un papel vencido saca del directorio

Se agrega la condición a `directorio`. Quien tiene vencido un papel de los que cierran la
puerta de la publicación deja de aparecer, y **vuelve a aparecer solo** cuando lo renueva, porque
el estado se calcula y no se guarda. Nadie tiene que acordarse de destildar ni de volver a tildar
nada, que es exactamente lo que pidió el Desarrollador.

**Con una excepción que no la decide el código**: la persona que está en medio de un trabajo. Es la
pregunta 3 de la sección 6.

### Paso 4 — La Prestadora lo ve, y la persona también

La pantalla de la Prestadora muestra qué vence y cuándo, con sus cuatro estados —cargando, error,
vacío, listo— y su texto del catálogo en los tres idiomas. La persona ve lo suyo en su propia
aplicación. Ni una ni otra ven nada de otra Prestadora: eso lo prueba el punto 5 de la sección 7.

Hasta acá, **el sistema ya controla el vencimiento**. Lo que falta es que hable.

### Paso 5 — El mensaje sale, y queda registrado que salió

Esto es lo único que necesita algo que hoy no existe, y son cuatro cosas:

- **La palabra.** Ver la pregunta 1 de la sección 6.
- **Un medio para mandarlo.** Hoy no lo hay: pendiente 45.
- **Dónde queda escrito que se avisó.** El registro de auditoría es el pendiente 68, y este paso es
  uno de sus primeros clientes: hace falta poder decir a quién se avisó y cuándo, sin lo cual el
  producto no puede sostener que avisó.
- **Y qué lo dispara**, que es la única parte que sí necesita correr a hora fija. Las opciones son
  `pg_cron` adentro del proyecto alojado, o una función de borde llamada desde afuera. **Se
  recomienda `pg_cron`**: no agrega ninguna credencial nueva ni ninguna puerta nueva hacia la base,
  y lo único que tiene que hacer es leer la función del paso 1 y encolar mensajes.

---

## 6. Lo que no decide el código, y espera al Desarrollador

Son tres, y ninguna se inventa.

### Pregunta 1 — Cómo se llama lo que el sistema manda

**«Aviso» está tomado**: en este producto un Aviso es lo que una Familia publica cuando necesita un
Asistente (`docs/GLOSARIO.md:15`). Llamar Aviso también al mensaje que dice «su matrícula vence en
treinta días» pisa la palabra que sostiene la mitad de la modalidad.

No se propone ninguna acá, porque la regla es que **una palabra de negocio nueva se propone y no se
usa antes de estar aprobada**, y ésta va a quedar escrita en nombres de tablas y de columnas, que
son lo que no se renombra.

**Lo que conviene tener a la vista al elegirla**: la palabra tiene que servir para las tres cosas
que el sistema va a mandar y que no son iguales —lo que vence pronto, lo que ya venció, y lo que se
le pide a alguien que haga—, o hay que elegir más de una.

### Pregunta 2 — Los valores de fábrica

Toda configuración necesita uno, y **el valor de fábrica no es la regla**: es con lo que arranca
una Prestadora que todavía no configuró nada. Lo que hace falta decidir:

- **Con cuánta anticipación se avisa.** Un solo mensaje, o varios que se acercan.
- **A quién.** A la persona, a la Prestadora, o a las dos.
- **Si se repite** mientras no se renueve, y cada cuánto.

Se puede aprobar con un número y seguir: la Prestadora lo va a cambiar desde su pantalla.

### Pregunta 3 — Qué pasa con quien está en medio de un trabajo

Que una matrícula vencida saque a alguien del directorio es claro: no lo contrata nadie nuevo. Lo
que el catálogo no dice es qué pasa con **el trabajo que ya está en curso** el día que vence.

Las dos respuestas son defendibles —cortar cuida a la persona atendida de que la atienda alguien
sin habilitación, y no cortar la cuida de quedarse sin nadie de un día para el otro— y por eso no
la contesta el código. **Y hay un tercer camino, que es el que este plan recomienda**: que el
sistema no corte nada por sí solo en ese caso y **le avise a la Prestadora, que es quien tiene la
responsabilidad**. Es exactamente la forma de la regla del riesgo legal: el producto avisa, y
decide quien responde.

---

## 7. Cómo se prueba, y por qué la prueba puede fallar

La regla de la empresa: *una prueba que no puede fallar no prueba nada*. Contra el código de hoy,
**todas éstas tienen que dar rojo**, y ése es el primer paso de la prueba.

1. **El control negativo, antes de tocar nada.** Un legajo ficticio con la matrícula vencida ayer
   **aparece hoy en el directorio**. Si no apareciera, la prueba del paso 3 pasaría por un motivo
   que no tiene nada que ver con lo que se construyó.
2. **Tres fechas y no una**: vencida ayer, vence mañana, y sin fecha. La del medio es la que
   distingue «está por vencer» de «venció», que es toda la diferencia entre avisar y cerrar.
3. **La fecha se mueve en el dato, no en el reloj.** Se cambia la fecha de vencimiento de un legajo
   inventado; nunca la fecha de la máquina, porque una prueba que necesita mover el reloj del
   sistema no la puede correr nadie más.
4. **El día exacto.** Vence hoy: hay que decidir si hoy todavía vale, y la prueba tiene que fijar
   esa respuesta, porque si no la fija se va a contestar distinto en cada pantalla.
5. **El aislamiento, con dos Prestadoras cargadas.** La Prestadora A no ve un solo vencimiento de
   la B. Comprobar que una consulta devuelve vacío no prueba nada: se prueba viendo los propios y
   no viendo ninguno del otro. Esto entra en `scripts/probar_aislamiento.mjs`, que ya tiene las dos
   Prestadoras montadas.
6. **Y la vuelta.** Se renueva la fecha y la persona **vuelve** al directorio sin que nadie toque
   ningún interruptor. Es la comprobación de que el estado se calcula y no se guardó en ningún
   lado: si alguien lo guardó, este punto falla.

Todo se corre con `node scripts/probar_todo.mjs`, que es donde viven las pruebas que necesitan la
base levantada.

---

## 8. Lo que este plan no hace

Se dice para que nadie cuente los cinco pasos y crea que están todos:

- **No toca Careonys.** Nada de acá se lleva allá hasta que el Desarrollador lo decida, y la fusión
  se aprueba de a una.
- **No inventa la palabra** de la pregunta 1, ni ninguna otra.
- **No manda nada.** El paso 5 queda escrito y sin construir hasta que haya correo (pendiente 45),
  registro de auditoría (pendiente 68) y palabra.
- **No borra ni pisa ningún dato.** Los cuatro primeros pasos agregan una función, una tabla de
  configuración con su valor de fábrica, una condición en una vista y una pantalla.
- **No decide el certificado de salud.** Sigue anotado como libreta sanitaria y sigue a confirmar,
  desde el 24 de agosto de 2026 (`docs/CATALOGO.md:158`).
