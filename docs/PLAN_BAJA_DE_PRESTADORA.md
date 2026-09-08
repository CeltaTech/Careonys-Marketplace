# Plan — dar de baja una Prestadora

> **Estado: escrito y sin aprobar.** Toca el borrado de datos y el modelo de seguridad, así que no
> se escribe una línea de SQL hasta que el Desarrollador lo apruebe. Es el paso 1 de «antes de un
> cambio grande» —el inventario— hecho sobre las veinticinco tablas que cuelgan de `tenants`.
>
> Escrito el 31 de agosto de 2026. Cierra el pendiente **107** de `docs/PENDIENTES.md`.
>
> **Todo lo que dice este documento se midió contra la base de esta máquina el 31 de agosto de
> 2026**, no se dedujo de las migraciones. Cuando algo no se pudo medir, lo dice.
>
> **Este documento nació diciendo algo que no era cierto, y se corrigió el mismo día.** Decía que
> «desde la migración 0046 ninguna Prestadora se puede borrar» y que eso era un defecto del
> producto. No lo es: la baja de CeltaTech nunca borró nada. La sección 1 cuenta qué pasa de
> verdad, y la 2 por qué el error era fácil de cometer y qué deja de enseñanza.

## 1. Qué pasa de verdad

**La baja de CeltaTech no borra: cambia el estado.** La puerta traduce el aviso de la suscripción a
uno de tres valores —`activo`, `suspendido`, `cancelado`
(`supabase/functions/alta-y-baja/index.ts:102`, y la restricción que los admite en
`supabase/migrations/0001_base_del_esquema.sql:3072`)—. **No hay un
solo `DELETE` en esa función**, comprobado buscándolo.

Y el estado protege de verdad. Medido por el camino que usan las pantallas, que es la función
`directorio_de()` y no la vista cruda:

| Estado de la Prestadora | Personas que devuelve el directorio |
|---|---|
| `activo` | 1 |
| `suspendido` | **0** |
| `cancelado` | **0** |

Lo hace la condición `and t.status = 'activo'` de
`supabase/migrations/0001_base_del_esquema.sql:867`. Y la vista cruda
`directorio`, que no filtra por Prestadora, **no la alcanza nadie desde afuera**:
`has_table_privilege` da falso para `anon` y para `authenticated`. **No hay agujero acá. El
producto se porta bien.**

## 2. Entonces qué era el `409`, y qué deja de enseñanza

Era **la limpieza de la propia prueba**. `scripts/probar_alta_y_baja.mjs` crea una Prestadora
ficticia y al final la borra con la llave de administración para no dejar basura en la base
publicada. Ese borrado es el que chocaba, porque desde la migración
`0046_toda_prestadora_nace_con_su_configuracion.sql` toda Prestadora nace con seis filas de
configuración de puntaje que apuntan a `tenants` sin cascada.

**Ya está arreglado**, y sin tocar el producto: la limpieza ahora borra en orden —primero lo que
cuelga, después la Prestadora— en `scripts/probar_alta_y_baja.mjs:196` a `:204`. Comprobado contra
la base de esta máquina en un bloque que se deshace solo: el borrado derecho choca, el borrado en
orden sale bien.

**Y la enseñanza, que es la que importa:** el pendiente 107 decía «la puerta de baja no puede
borrar ninguna Prestadora», y de ahí salió todo lo demás. La frase mezclaba dos cosas —la puerta
del producto y la limpieza de la prueba— y **nadie la verificó contra el código de la puerta**, que
son doce renglones y contestaban solos. Se arrastró hasta acá y hasta el informe al Desarrollador.
Es exactamente lo que dice la regla de la casa: *el estado real está por encima del documentado*, y
un pendiente es documento.

## 3. El inventario entero

Sigue siendo válido, y es lo que este trabajo deja de aporte. Veinticinco claves ajenas apuntan a
`tenants`, y se reparten en tres grupos que **no se decidieron con el mismo criterio**.

### Las diez que sí se borran con la Prestadora (`cascade`)

`cursos`, `evaluaciones`, `guias_cuidado`, `intentos_evaluacion`, `opciones_pregunta`,
`preguntas_evaluacion`, `profiles`, `vocabulario_items`, `vocabularios`, `zonas_cobertura`.

Son cosas que **la Prestadora escribió**: su catálogo propio, sus Guías, sus cursos, sus zonas. Que
se vayan con ella tiene sentido y no hay nada que decidir acá.

### Las dos que quedan sin dueño (`set null`)

`caregivers` y `avisos`, que en el esquema inicial se llamaba `care_searches`
(`supabase/migrations/0001_base_del_esquema.sql:4051` y `:3987`). Las dos admiten `tenant_id` nulo,
así que al borrarse la Prestadora **el legajo de la persona y el aviso sobreviven**, sin
Prestadora. **Ninguna migración explica por qué**, y las dos vienen de un volcado anterior a las
migraciones.

### Las trece que trabarían un borrado (`no action`)

Y acá está el nudo: **las trece tienen `tenant_id` obligatorio**, así que `set null` no es una
salida para ninguna sin cambiar antes la columna.

Se parten en dos naturalezas distintas, y esa diferencia es la que decide el plan:

| Qué describen | Tablas | De qué cuelgan además |
|---|---|---|
| **La Prestadora** | `puntaje_prestadora`, `ponderacion_comprobacion` | de nada más |
| **Un aviso de la Prestadora** | `franjas_aviso` | de `avisos` |
| **Una persona** | `autorizaciones_asistente`, `disponibilidad_asistente`, `documentos_asistente`, `estudios_asistente`, `experiencia_laboral_asistente`, `franjas_asistente`, `matriculas_asistente`, `referencias_asistente`, `verificaciones_asistente`, `zonas_asistente` | de `caregivers` |

Las diez últimas cuelgan de `caregivers` con `on delete cascade` hacia el legajo, y **nada hacia
`tenants`**. Su `tenant_id` es la copia que necesitan las políticas para decidir sin salir de la
tabla. **Son los papeles de la persona, no de la Prestadora.**

## 4. La contradicción que destapa el inventario

`caregivers.tenant_id` es `set null`: **el legajo sobrevive a la baja de su Prestadora**. Pero sus
diez tablas de detalle tienen `tenant_id` obligatorio y sin cascada.

> **El legajo sobrevive y sus papeles no pueden.**

Eso no es una decisión que alguien tomó: son dos decisiones tomadas en momentos distintos que no se
miraron juntas. **Y hoy no se nota, justamente porque nada borra Prestadoras.** La contradicción
está dormida, y se despierta el día que alguien quiera borrar una de verdad.

## 5. Y lo que aparecería si alguna vez se borrara

Se probó el estado final, limpiando a mano todo lo que hoy trabaría. El resultado, medido:

- El legajo sobrevivió sin Prestadora. ✔ Es lo que dice `set null`.
- **Y conservó el sello de una Prestadora que ya no existe.**

Ese sello es `verification_status = 'validado_prestadora'`. Con `tenant_id` nulo **casi nadie puede
bajarlo**: la propia persona no —la migración 0047 se lo rechaza—; el personal de cualquier
Prestadora tampoco —su política pide `tenant_id = prestadora_actual()`, y contra un nulo eso nunca
da verdadero—; **sólo CeltaTech por la puerta de administración**, donde `auth.uid()` es nulo y el
disparador se aparta.

**Esto es hipotético y hay que leerlo así.** Al directorio público no llega, porque el filtro por
`status` de la sección 1 lo tapa antes. Es un sello huérfano e inmutable esperando a que alguien
escriba el primer borrado de Prestadoras.

## 6. La pregunta que hay que contestar, y es una sola

Todo lo anterior se reduce a esto:

> **Cuando se da de baja una Prestadora, ¿qué pasa con las personas que ella validó?**

**No está contestada en ningún lado**, y se buscó. Contestada, las trece tablas se acomodan solas.
Hay tres respuestas defendibles:

### A. El legajo se va con la Prestadora

Todo cascadea. El borrado funciona siempre y no queda nada colgado.

**En contra, y es decisivo:** borra los papeles de una persona que no es de la Prestadora. Esa
persona cargó su documento, sus estudios y sus referencias, y perderlos porque la Prestadora cerró
es hacerle pagar a ella una decisión ajena. Además contradice el `set null` que ya está puesto en
`caregivers`.

### B. El legajo sobrevive y el sello se cae *(la recomendada)*

Los papeles de la persona sobreviven; lo que se va es lo que era de la Prestadora. Y al quedar sin
Prestadora, **el sello vuelve a «sin revisar»** y la persona sale del directorio hasta que otra
Prestadora la mire.

**A favor:** es exactamente la regla que usted ya eligió para el pendiente 75 —el sello siempre
habla de algo vigente—, aplicada acá. Un sello sin quién lo firme es el mismo problema que un sello
sobre un papel que cambió. Y no le hace perder nada a la persona: conserva sus papeles y puede
volver a presentarse.

**En contra:** hay que decidir además si la persona conserva su publicación en el directorio
apagada o si se apaga también, y eso es una fila más de `autorizaciones_asistente`.

### C. El legajo sobrevive con el sello puesto

**Es lo que pasaría hoy si alguien escribiera el borrado sin mirar nada más.** No hace falta
argumentar en contra más de lo que dice la sección 5.

## 7. Qué se escribe una vez elegida

Suponiendo la **B**, que es la recomendada. Todo en una migración:

1. **Las tres tablas que describen a la Prestadora o a su aviso pasan a `on delete cascade`**:
   `puntaje_prestadora`, `ponderacion_comprobacion` y `franjas_aviso`. Lo que
   nace con la Prestadora se va con ella, que es el sentido de la 0046.
2. **Las diez tablas de la persona no se tocan en su clave hacia `caregivers`**, y su `tenant_id`
   pasa a acompañar al legajo: si el legajo queda sin Prestadora, sus papeles también. Eso
   significa hacer la columna anulable y ponerle `on delete set null`. **Hay que revisar política
   por política que ninguna decida con una comparación contra nulo**, porque la regla de la casa
   dice que todo control falla cerrado y una comparación con nulo no es falsa, es nula.
3. **Un disparador sobre `caregivers`**: cuando `tenant_id` pasa a nulo, `verification_status`
   vuelve a `en_revision`. Va en la misma familia que `el_legajo_no_se_sella_solo` de la 0047, y
   por el mismo motivo: la política recibe la fila, no el cambio.
4. **El bloque que se planta si la migración no logró lo que dice**, como el de la 0047.
5. `notify pgrst, 'reload schema';`

## 8. Cómo se prueba, y cómo puede fallar

Una prueba nueva, `scripts/probar_la_baja_de_la_prestadora.mjs`, con dos Prestadoras ficticias
cargadas y no con una vacía —una Prestadora sin uso pasa la prueba sin probar nada—:

1. La Prestadora recién nacida se borra. **Hoy da rojo.**
2. La Prestadora con un Asistente publicado y un aviso con franjas se borra. **Hoy da rojo.**
3. Después de la baja, el legajo de esa persona **sigue existiendo** y conserva sus documentos, sus
   estudios y sus referencias.
4. Y **su sello volvió a «sin revisar»**, así que no aparece en el directorio público.
5. La otra Prestadora no perdió nada: sus filas siguen todas.

**Y el sostén, que es lo que la hace poder fallar:** sin el punto 5, borrar la tabla entera dejaría
los cuatro primeros en verde. Sin el punto 3, poner cascada en todo también los dejaría en verde.
Los dos juntos son los que distinguen la salida B de la A.

## 9. Y una cosa que no espera a la migración

**En la base publicada quedó una Prestadora ficticia de una corrida anterior**,
`prestadora-de-prueba-de-la-puerta`, que la limpieza rota no pudo borrar. Mientras esté, las
comprobaciones 7, 8 y 9 de `scripts/probar_alta_y_baja.mjs` van a seguir en rojo **por arrastre y
no por defecto propio**, que es exactamente el error de lectura que ya costó una corrida en la
tanda del pendiente 74.

Con la limpieza ya arreglada, **la próxima corrida de esa prueba la borra sola**. Pero esa corrida
borra datos de la base publicada, así que **la decide el Desarrollador** y no se hizo mientras
dormía.

## 10. Lo que hay que decidir

1. **A, B o C** de la sección 6. La recomendada es la **B**. **No urge**: hoy nada borra
   Prestadoras, así que esto se puede decidir sin apuro y antes de que alguien escriba el primer
   borrado.
2. Si es la B: cuando el legajo queda sin Prestadora, ¿la publicación en el directorio se apaga
   sola, o se deja encendida sabiendo que el sello caído ya lo saca de la vista?
3. Correr `node scripts/probar_alta_y_baja.mjs` contra la base publicada, que con la limpieza
   arreglada saca la Prestadora ficticia que quedó.
