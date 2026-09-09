# Plan — el rastro de auditoría

> **Estado: escrito y sin aprobar.** Crea una tabla nueva y tres disparadores sobre tablas
> publicadas, así que no se escribe una línea de SQL hasta que el Desarrollador lo apruebe. Lo pide
> el propio pendiente **68**: «va con plan y aprobación antes de código».
>
> Escrito el 27 de agosto de 2026. Cierra el pendiente **68** de `docs/PENDIENTES.md`. Cuando se
> escribió, además destrababa una de las tres salidas que se barajaban para el pendiente **75**
> —permitir que se cambie un papel de un legajo ya sellado y dejarlo asentado para que la
> Prestadora lo revise—, que entonces no se podía elegir porque no había dónde asentar nada. Esa
> decisión ya se tomó y no fue ésa: el Desarrollador eligió que cambiar un papel devuelva el
> sello a «sin revisar», y así quedó aplicado. El pendiente **75** está cerrado, y lo que quedó
> hecho se cuenta en `docs/ALCANCE.md`, sección «Las cuatro columnas que ninguna política
> miraba». Este plan no espera nada de aquello, ni aquello de éste.

## 1. Qué falta, en una línea

> **Hoy, cuando una persona aparece en el directorio público como comprobada, no hay forma de
> saber quién la validó ni cuándo.**

Y no es sólo esa columna. La regla de la empresa —`celtatech\CLAUDE.md`, «Seguridad, privacidad y
auditoría»— pide *«reconstruir quién, cuándo, sobre qué y qué cambió»* y enumera seis clases de
acción. **El producto no registra ninguna.** Comprobado el 26 de agosto de 2026 contra la base en
vivo y vuelto a comprobar el 8 de septiembre de 2026 sobre las migraciones de hoy: ninguna de las
36 tablas es un registro de auditoría y ninguna migración crea uno.

Lo único que existe es `auth.audit_log_entries`, que trae la plataforma: registra entradas, altas y
cambios de clave, es de `supabase_auth_admin`, y **el producto no la alcanza** porque PostgREST no
publica el esquema `auth`. Es una astilla de una de las seis categorías y nada de las otras cinco.

## 2. La decisión que trababa, resuelta con reglas ya escritas

El pendiente decía: *«hay que decidir dónde vive el rastro»*. **No hace falta decidir nada nuevo:
las dos reglas que contestan ya están escritas.**

La primera es la pregunta que reparte los módulos (`docs/MODULOS.md`): *¿esto seguiría teniendo
sentido en prestación directa?* Quién validó un legajo y cuándo es verdad sobre esa persona y esa
Prestadora **haya elegido la Familia en un directorio o le hayan asignado el trabajo**. La
respuesta es sí, y por lo tanto el rastro es **compartido**. Cae del mismo lado que «Organización y
aislamiento», que ya está en el reparto con estas palabras: *«Nunca puede vivir de un solo lado»*
(`docs/MODULOS.md:55`).

La segunda es lo que hay que hacer mientras el módulo no exista, y está en el `CLAUDE.md` de este
producto, §3: *«Todavía no hay ningún módulo creado, y hasta entonces lo compartido se sigue
construyendo acá con el reparto de `docs/MODULOS.md`»*.

**Entonces se construye acá, con tres condiciones que salen de esa misma regla:**

1. **Sin el prefijo de la modalidad.** Ese prefijo marca lo propio de esta modalidad, y es lo que permite
   encontrar de una búsqueda lo que no cruza. Ponérselo al rastro sería mentir sobre a quién sirve.
2. **Sin una sola palabra de esta modalidad adentro**: ni directorio, ni aviso, ni postulación, ni
   contacto, ni puntaje, ni destacado. La tabla nombra tablas y columnas, que ya se llaman como se
   llaman; no nombra conceptos de la modalidad.
3. **Se agrega la fila al reparto de `docs/MODULOS.md`**, en la tabla de lo compartido, para que el
   día de la fusión esté anotado y no haya que descubrirlo.

## 3. Quién escribe el rastro: la base, no el navegador

**El rastro lo escriben disparadores en la base.** Es la parte del plan que menos parece una
decisión y más lo es, así que van los cuatro motivos, todos medidos el 27 de agosto de 2026.

**Uno: un rastro que el auditado pueda omitir no es un rastro.** El pendiente ya dejó escrita la
mitad de esta trampa —*«un registro que el rol auditado pueda modificar no es un rastro»*—, y la
otra mitad es peor: si lo escribe el navegador, quien quiera saltearlo no tiene que modificar nada,
le alcanza con no escribirlo. Cualquier pedido hecho a mano contra la dirección de datos, con la
sesión propia, cambia el dato y no anota nada. Un disparador se dispara igual, venga el pedido de
la pantalla, de un guion o de la consola.

**Dos: no hay un punto por donde pasen todas las escrituras.** Hay dos caminos y no uno. Todo lo
REST pasa por `_supabaseRequest` (`js/apiClient.js:1191`), que sí es un embudo único —las 15
llamadas de datos entran por ahí—. Pero **la autenticación y los archivos no lo tocan nunca**:
`Sesion.login` (`js/auth.js:173`), `Sesion.signup` (`js/auth.js:190`), `Sesion.cambiarClave`
(`js/auth.js:221`) y `Sesion.uploadFile` (`js/auth.js:338`) hablan derecho con el cliente de la
plataforma. Y ahí están, justamente, tres de las seis categorías que la regla nombra: la entrada
administrativa, el cambio de rol y de Organización, y el cambio de credencial.

**Tres: y aunque hubiera un punto, hoy hay tres copias de él.** `js/apiClient.js` y `js/auth.js`
están triplicados **byte a byte** en `pwa-asistente/js/` y `pwa-familia/js/` —es el pendiente 13—,
así que cada gancho habría que escribirlo tres veces o unificar los archivos primero. Y `window._sb`
está expuesto en global (`js/auth.js:409`): cualquier pantalla puede saltearse `Sesion` y llamar al
cliente por su cuenta.

**Cuatro: el navegador ni siquiera está mandando quién es.** `resolverLegajo`
(`js/apiClient.js:548`) recibe tres cosas —el legajo, el estado nuevo y una nota— y **ninguna es
quién lo ejecuta**. La pantalla sí lo sabe: `panel-prestadora.html:1563` pide el perfil y lo usa para
el control de rol. Pero esa variable es local al arranque de la pantalla y nunca baja hasta la
función. Lo único de la identidad que llega al servidor es el testigo de sesión en el encabezado
(`js/apiClient.js:752`). O sea: **el servidor puede saber quién fue; el navegador no lo está
diciendo.** El lugar donde el dato existe con seguridad es la base.

## 4. La forma de la tabla

Una sola tabla, `public.auditoria`. La palabra no es nueva: la usa la propia regla de la empresa
—«Seguridad, privacidad y auditoría», «se audita toda acción sensible»—, así que no hay que
inventar ninguna.

| Columna | Tipo | Qué guarda | Por qué así |
|---|---|---|---|
| `id` | `uuid` clave primaria | — | La regla de la empresa: toda tabla nace con clave `uuid` |
| `tenant_id` | `uuid` | La Organización del dato tocado | Acepta nulo: hay acciones sin Organización resuelta —un alta a medio camino, algo hecho por CeltaTech— y un rastro que no puede anotarlas se calla justo cuando más importa |
| `hecho_por` | `uuid` | Quién lo hizo, o nulo si lo hizo la base | **Sin clave foránea, a propósito** |
| `hecho_el` | `timestamptz` | Cuándo | Lo pone la base, `default now()`. No entra en ningún pedido |
| `accion` | `text` | `alta`, `modificacion` o `baja` | Son los tres verbos que un disparador puede ver. Con `check` |
| `tabla` | `text` | Sobre qué tabla | Lo pone el disparador desde `TG_TABLE_NAME`; no se puede falsear |
| `fila_id` | `uuid` | Sobre qué fila | **Sin clave foránea, a propósito** |
| `columnas` | `text[]` | Qué cambió, por nombre | Ver §5 |
| `valores` | `jsonb` | El valor viejo y el nuevo, sólo de las columnas de veredicto | Ver §5 |

**Las dos columnas sin clave foránea son la única decisión de forma que no es obvia, así que va
escrito el motivo:** un rastro tiene que sobrevivir a la desaparición de aquello que señala. Con
clave foránea, borrar un perfil fallaría por culpa del rastro, o —peor, si alguien la escribe con
`on delete cascade`— **borrar la fila borraría la prueba de que se la borró**. Y el caso
`accion = 'baja'` es exactamente ése: la fila ya no está, y la referencia no podría apuntar a nada.

**`hecho_por` es nulo cuando la acción no la hizo una persona con sesión**, que hoy pasa en dos
casos legítimos: el alta de una Prestadora, que ejecuta CeltaTech con la llave del servidor
(`supabase/migrations/0001_base_del_esquema.sql:72`), y el disparador que crea el perfil al
registrarse (`supabase/migrations/0001_base_del_esquema.sql:329`). Nulo ahí significa «la
base», no «no se sabe», y el comentario de la columna lo dice.

## 5. Qué se guarda del cambio, que es donde dos reglas de la empresa chocan

Una pide *«reconstruir qué cambió»*. La otra, tres renglones más abajo, prohíbe *«claves ni datos de
contenido adentro de ese registro»*. Guardar la fila vieja entera cumple la primera y rompe la
segunda: `caregivers` tiene el documento, el domicilio, el CBU y los estudios de una persona, y
copiarlos al rastro los duplica en una tabla que después va a leer más gente y que nadie va a
borrar nunca.

**La resolución, y es lo que se propone:**

- **El nombre de las columnas que cambiaron se guarda siempre.** Un nombre de columna no es dato de
  nadie. Con eso ya se contesta «qué cambió» en el sentido que importa: se sabe que a este legajo,
  este día, esta persona le tocó el sello, o el CBU, o los papeles.
- **El valor viejo y el nuevo se guardan sólo de una lista cerrada de columnas de veredicto**, hoy
  tres: `caregivers.verification_status`, `profiles.role` y `profiles.tenant_id`. Las tres son
  decisiones, no contenido: no dicen nada de la persona, dicen qué resolvió alguien sobre ella. Sin
  el valor, el rastro del sello no sirve —«le tocaron el estado» no distingue aprobar de rechazar—.
- **De todo lo demás no se guarda ningún valor.** Ni el viejo ni el nuevo. Ni recortado, ni
  resumido, ni con la mitad tapada.

La lista cerrada vive **en un solo lugar**, adentro de la función del disparador, y agregarle una
columna es una migración nueva. Es a propósito: si la lista fuera un parámetro, ampliarla sería un
descuido en vez de una decisión.

## 6. Cómo se escribe: un disparador genérico, y nadie con permiso de alta

**Una sola función de disparador**, colgada de las tablas que se auditan. Lee `TG_TABLE_NAME` y
`TG_OP` y con eso arma la fila; no hay una función por tabla. Es la regla «ningún patrón repetido
sin punto único de verdad» aplicada al lugar donde más tienta copiarla.

Va **`after insert or update or delete`**, no `before`. El motivo: `after` anota lo que realmente
quedó, y encima corre después de los disparadores `before` que ya están puestos sobre
`caregivers` y `profiles` —`el_legajo_no_se_sella_solo`
(`supabase/migrations/0001_base_del_esquema.sql:3863`) y
`el_rol_y_la_prestadora_no_se_escriben_solos`
(`supabase/migrations/0001_base_del_esquema.sql:3877`), contados en `docs/ALCANCE.md`, sección
«Las cuatro columnas que ninguna política miraba»—, así que el rastro no va a registrar como
sucedidos los intentos que aquéllos rechazan. Los dos se apilan; no chocan.

**Nadie recibe permiso de alta sobre `auditoria`. Ni `authenticated`, ni `anon`.** El pendiente
pedía que el rol auditado pudiera insertar y no modificar ni borrar; esto es más fuerte y por el
mismo motivo: si el rol puede insertar, puede insertar una fila falsa. La función es
`security definer`, así que escribe con los permisos de quien la creó y no con los de quien
disparó el cambio.

El patrón no hay que inventarlo, ya está dos veces en el proyecto:

- **La tabla que no se escribe desde afuera:** `intentos_evaluacion`. Una sola política, y de
  lectura (`supabase/migrations/0001_base_del_esquema.sql:4574`), **y además** un solo permiso de
  tabla, también de lectura (`supabase/migrations/0001_base_del_esquema.sql:5293`): sobre la tabla
  que decide si alguien está capacitado para cuidar a una persona, una traba sola es poca. La
  única puerta es una función. El porqué estaba escrito en la migración que la creó, y hoy no está
  en ningún lado: al aplanarse el esquema quedó el efecto y se perdió el motivo.
- **El disparador que protege una columna:** `la_fecha_de_alta_del_legajo`, sobre `caregivers`
  (`supabase/migrations/0001_base_del_esquema.sql:3898`), con su función
  `la_fecha_de_alta_la_pone_la_base` (`supabase/migrations/0001_base_del_esquema.sql:1379`) y su
  `revoke all … from public, anon` (`supabase/migrations/0001_base_del_esquema.sql:5465`), que es
  la forma de recordar que revocarle a `PUBLIC` no alcanza para sacárselo a `anon`. A esa función
  no la llama ninguna política, así que no le queda `authenticated`.

De ahí sale la forma exacta que va a tener la migración, incluida una advertencia que conviene
tener presente: **hoy todo permiso hay que concederlo explícitamente**, porque los privilegios
por omisión están revocados (`supabase/migrations/0001_base_del_esquema.sql:56-57`); sin `grant`
la pantalla recibe `42501 permission denied` con sesión válida y eso no se arregla tocando
políticas.

**Una propiedad que conviene decir de frente:** si la función del rastro falla, la escritura
original se deshace con ella. Eso es fallar cerrado —sin rastro no hay cambio— y es lo que
corresponde; pero también significa que un error en esta función rompe la aplicación. Por eso la
función es corta, no consulta ninguna otra tabla y no depende de nada que pueda no estar.

## 7. Qué se audita en la primera tanda

Se elige por las seis categorías que nombra la regla, no por comodidad.

| Tabla | Cuándo | Qué categoría de la regla cubre |
|---|---|---|
| `caregivers` | alta, modificación y baja | **Modificación crítica** —`verification_status` es lo que publica a una persona como comprobada— y **consecuencia económica** —`bank_info` es el CBU y `hourly_rate` el precio—. Y **borrado de datos**: hoy el producto no borra, pero `authenticated` tiene el permiso y las dos políticas alcanzan a todos los verbos (`supabase/migrations/0001_base_del_esquema.sql:4690` y `:4815`), así que un pedido directo borra la fila propia |
| `profiles` | alta, modificación y baja | **Cambios de permisos o de membresía**: `role` y `tenant_id` son literalmente eso |
| `verificaciones_asistente` | alta, modificación y baja | **Modificación crítica**: es la evidencia de cada control. La escribe el panel de la Prestadora desde el 1 de septiembre de 2026 —fue el pendiente 70—, así que el disparador nace con algo que anotar desde el primer día |

**Lo que queda afuera, y la primera no es cuestión de tanda:**

- **`clock_ins` y `reportes` no entran en este rastro, ni ahora ni en una segunda tanda.** Hasta
  el 2 de septiembre de 2026 esta página las dejaba afuera «por volumen» y las mandaba a una
  segunda tanda. Escrito así, hoy pide deshacer algo que ya se decidió, y por eso se corrige.
  **La Prestadora no mira la jornada:** lo dice la sección «Qué es este producto, y quién hace
  qué» del `CLAUDE.md` de este producto —la fichada y el reporte de cuidado son la herramienta de
  la Familia y del Asistente— y está aplicado en la base. Ninguna política de `clock_ins` ni de
  `reportes` alcanza al personal de la Prestadora: la fichada la ve quien la marca
  (`supabase/migrations/0001_base_del_esquema.sql:4517`) y la Familia del vínculo marcado
  (`:4526`); el reporte lo escribe el Asistente que cuidó (`:4769`) y lo lee la Familia de ese
  aviso (`:4776`), con la condición del aviso repetida adentro de la subconsulta a propósito,
  porque la RLS de `avisos` no alcanza para filtrarla. El motivo quedó escrito en el
  comentario de cada una de las dos tablas
  (`supabase/migrations/0001_base_del_esquema.sql:2448` y `:3051`): mirar a qué hora entra y sale
  una persona, y leer lo que hizo en cada jornada, es dirigir el trabajo, y en esta modalidad la
  Prestadora no lo hace.
- **Por qué eso decide la pregunta, y no el volumen.** El rastro **lo lee el personal de la
  Prestadora** (§8). Auditar esas dos tablas acá adentro le devolvería por la ventana lo que la
  RLS le saca por la puerta: qué columna se tocó, de qué fila, quién y cuándo, fichada por
  fichada. Sería el mismo dato con otro nombre. Si algún día hay que dejar rastro de esas dos
  tablas, va a ser en otro lado y con otros lectores, y eso es un plan distinto que arranca por
  esa pregunta y no por ésta.
- **La sesión de soporte.** No existe ninguna: se buscó `impersona`, `suplanta`, `actuar como`, `en
  nombre de` y `support` en los 46 archivos y no hay mecanismo de suplantación. `soporte-remoto.html`
  no es una herramienta de soporte, es una página comercial. Así que hoy esa categoría no está
  incumplida. **Lo que sí queda escrito es que el día que se construya, la marca de sesión se
  construye con ella y no después**, porque la regla pide que *todo* lo que se haga adentro quede
  auditado.

## 8. Quién lee el rastro

- **`select` para `authenticated`, con política de `es_personal_de_prestadora()` y su propia
  Organización.** Un Asistente no lee el rastro de su Prestadora; el personal sí, y sólo el de la
  suya. Es la misma forma que ya tiene `verificaciones_asistente`
  (`supabase/migrations/0001_base_del_esquema.sql:4885` y `:4899`).
- **Nada para `anon`.** `revoke all on table public.auditoria from anon`.
- **CeltaTech entra como entra a todo lo demás**, con la llave del servidor y por función. No se le
  abre ninguna puerta nueva, y `service_role` no se toca: las revocaciones por omisión nombran
  sólo a `anon` y a `authenticated` (`supabase/migrations/0001_base_del_esquema.sql:56-57`).

**Y de quién lo lee sale qué se puede auditar acá adentro.** Si el rastro lo lee el personal de la
Prestadora, entonces **ninguna tabla que ese personal no pueda mirar entra en este rastro**: lo que
la RLS le niega no puede reaparecer, columna por columna, en una fila de auditoría. Es lo que deja
afuera a `clock_ins` y a `reportes` (§7), y es el filtro con el que se mira cualquier tabla que
alguien quiera sumar más adelante.

## 9. Lo que este plan NO cierra, dicho antes de que sorprenda

**Uno: el pisado de archivos.** `Sesion.uploadFile` sube con `upsert: true` (`js/auth.js:250`) y
el camino es determinístico, así que **subir dos veces el mismo documento destruye el primero sin
dejar nada**. No es un `DELETE` y ningún disparador de estas tres tablas lo ve. Es una destrucción
de datos real y hoy no está en ningún pendiente. **Se abre pendiente aparte.**

**Dos: el motivo de la decisión más crítica se está perdiendo, y no es culpa de que falte el
rastro.** `panel-prestadora.html:898` y `:912` juntan la nota de la entrevista —el motivo de aprobar
o de rechazar—, `resolverLegajo` la manda como `notaPrestadora` (`js/apiClient.js:521`), y
**`_mapToDatabase` la descarta**: no está en la lista de campos de `caregivers` (`js/apiClient.js:1412-1433`),
así que se pierde con un aviso en la consola y nada más. Comprobado el 27 de agosto de 2026 leyendo
las dos listas. Y no hay columna donde pudiera caer: `caregivers` no tiene ninguna para eso. **Se
abre pendiente aparte**, y en §12 queda la pregunta de si el motivo va a una columna del legajo o a
la fila del rastro.

**Tres: las acciones de cuenta siguen fuera de alcance.** Entrar, cambiar la clave, pedir el enlace
de recuperación: eso vive en el esquema `auth`, que el producto no alcanza. El disparador sobre
`profiles` va a ver el alta —porque el perfil se crea con ella— pero no la entrada ni el cambio de
credencial. Alcanzarlas necesita una función del lado del servidor, y eso es otra tanda.

**Cuatro: el rastro dice qué columna cambió, no qué decía antes**, salvo las tres de veredicto. Es
la decisión del §5 y se paga acá: si mañana alguien quiere saber cuál era el CBU viejo, el rastro no
lo tiene. Se eligió a favor de la regla de privacidad, a conciencia.

## 10. Cómo se prueba, y por qué la prueba puede fallar

Va adentro de `scripts/probar_aislamiento.mjs`, que es donde ya viven las 132 comprobaciones y las
seis cuentas ficticias. En el tramo que corre con `--local`, que es el único donde se puede ascender
a alguien a coordinador.

1. El coordinador de la Prestadora A valida el legajo de la cuenta A.
2. Se consulta `auditoria` y tiene que haber **exactamente una fila**, con `tabla = 'caregivers'`,
   `fila_id` = ese legajo, `accion = 'modificacion'`, `columnas` conteniendo `verification_status`,
   `valores` con el viejo y el nuevo, y **`hecho_por` = el identificador del coordinador A**, que es
   el dato que hoy no existe en ninguna parte.
3. El coordinador de la Prestadora B pide la misma consulta y **no ve esa fila**.
4. La cuenta A —el Asistente, que no es personal— tampoco la ve.

**Y la prueba que hace que las otras cuatro signifiquen algo:** se corre una vez con el disparador
sacado, y el paso 2 tiene que **fallar**. Sin eso, una comprobación que sólo lee la tabla pasa igual
mientras esté vacía, que es exactamente lo que el propio pendiente 68 advierte en su condición de
cierre. Es la misma regla que ya está escrita en el encabezado de ese guion: *«una prueba que
devuelve una lista vacía no distingue 'aislado' de 'todo bloqueado'»*.

## 11. El orden

1. **Migración `0005`** —la próxima libre; la última en disco es `0004`—: la tabla, su RLS, sus
   permisos, la función del disparador con su `revoke`, los tres disparadores, y el
   `notify pgrst, 'reload schema';` de último renglón.
2. **La prueba** en `scripts/probar_aislamiento.mjs`, y correrla **con el disparador sacado** antes
   de darla por buena.
3. **`docs/MODULOS.md`**: la fila nueva en la tabla de lo compartido.
4. **`docs/ESQUEMA.md`** y **`docs/ALCANCE.md`** al día, y el pendiente 68 cerrado con lo que
   quedó afuera anotado como pendientes nuevos (§9).

## 12. Lo único que hace falta decidir, y es del Desarrollador

**a. El nombre de la tabla y de sus columnas.** Se propone `auditoria`, con las columnas del §4. Se
pregunta porque la regla dice que **lo que se guarda se nombra por lo que hace y no se renombra
nunca**: cambiarlo después es una migración de datos, y preguntarlo ahora no cuesta nada.

**b. Si los valores de las tres columnas de veredicto se guardan.** Recomendación: **sí**, con la
lista cerrada del §5. Sin ellos el rastro del sello no distingue aprobar de rechazar, que es la
única pregunta que a esa fila se le va a hacer. El costo es que `role` y `tenant_id` quedan
escritos, y ninguno de los dos dice nada personal.

**c. Dónde va el motivo de la resolución** —la nota de la entrevista que hoy se pierde (§9, dos).
Las dos son defendibles:

| | Qué implica | A favor | En contra |
|---|---|---|---|
| **A. Columna en `caregivers`** | Una columna nueva en el legajo, que el panel escribe | Se lee al lado del estado, que es donde alguien la va a buscar | Es texto libre escrito por el personal sobre una persona: queda en la fila de esa persona para siempre y se lo lleva cualquiera que lea el legajo |
| **B. En la fila del rastro** | Un campo más del `jsonb`, junto al viejo y al nuevo | El motivo queda pegado a la decisión y a quien la tomó, que es lo que un motivo es. Y hereda los permisos del rastro: sólo lo lee el personal de esa Prestadora | Choca con el §5, que dice que el rastro no guarda contenido. Habría que escribir la excepción y su porqué |

**Recomendación: B, con la excepción escrita.** El motivo de una decisión es parte de la decisión,
no del legajo. Pero es una excepción a una regla que este mismo plan propone, así que no se toma
sola.

**d. Ya no hay nada que decidir sobre `clock_ins` y `reportes`, y por eso este punto se queda
escrito en vez de borrarse.** Figuraba acá como una pregunta de volumen, y no lo era: el rastro lo
lee el personal de la Prestadora (§8) y esas dos tablas son justamente las que ese personal no
mira, por la sección «Qué es este producto, y quién hace qué» del `CLAUDE.md` de este producto y
por las políticas de `clock_ins` y de `reportes`, que no alcanzan a ese personal
(`supabase/migrations/0001_base_del_esquema.sql:4517`, `:4526`, `:4769` y `:4776`). **No entran,
no van a una segunda tanda y no queda ningún pendiente abierto por ellas** (§7). Quedan tres
puntos para decidir: a, b y c.
