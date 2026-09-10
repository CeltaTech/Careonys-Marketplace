# Aportes del Marketplace a Careonys

> **Qué es este documento.** La lista de lo que se construyó en Careonys Marketplace y que
> conviene llevar a Careonys cuando los dos productos se fusionen.
>
> **La regla que lo manda** está en `celtatech/docs/REGLAS_PRODUCTOS_CAREONYS.md` §5, y la fijó el
> Desarrollador el 2026-08-29: *«todo aquello que sea un aporte de valor de Marketplace a Careonys
> será considerado para incorporarlo allá»*, con *«aprobación 1 a 1 cuando se haga la migración
> desde Careonys — no se realizará desde aquí, desde aquí se dejará todo preparado»*.
>
> **Entonces este archivo no ejecuta nada.** No es un plan de migración ni una autorización: es lo
> que se le pone adelante a quien decida, de a un punto por vez, el día que la migración se haga
> **desde Careonys**. Careonys no se toca desde acá.
>
> **Se escribe a medida que aparece**, no el día de la fusión. Lo que no esté anotado acá cuando
> llegue ese día, se pierde.

## Cómo se anota un aporte

Uno por sección, y siempre las cuatro cosas:

1. **Qué es**, en una línea.
2. **Dónde está acá**, con archivo y renglón.
3. **Qué tiene Careonys hoy** en ese lugar, comprobado contra su código o su base, no supuesto. Si
   no tiene nada, se dice así.
4. **Qué habría que tocar allá** para llevarlo, y qué se rompería si no se toca.

Y si algo de esto no se pudo comprobar, se escribe que no se comprobó. Un aporte mal medido le
hace perder el tiempo a quien lo apruebe.

**Cómo se distinguen las citas, que acá conviven las de dos repositorios.** Toda cita a un archivo
de Careonys lleva adelante el prefijo `careonys/` —`careonys/panel/src/lib/tipoDeAsistente.js:31`—,
que es el nombre de la carpeta hermana donde vive ese producto. Una cita **sin prefijo**
—`js/apiClient.js:247`, `panel-prestadora.html:210`— es de este repositorio, se abre desde su raíz
y la comprueba `scripts/verificar_referencias.mjs` como la de cualquier otro documento. Cuando la
frase nombra un archivo de Careonys **por su nombre solo**, sin ruta, es porque una cita anterior
de la misma sección ya lo presentó con la ruta entera.

Esto no es prolijidad: sin el prefijo las dos clases de cita se ven iguales, y una cita local
que se despegó de su renglón se confunde con una ajena que el chequeo no puede abrir porque el
archivo no está en este árbol. **El prefijo es lo único que las separa, así que no se omite
nunca.**

---

## 1. Dos tablas para todas las listas de opciones

Anotado el 29 de agosto de 2026, al cerrar la mitad de vocabularios del pendiente 7.

**Qué es.** Una sola pareja de tablas genéricas —`vocabularios` y `vocabulario_items`— donde viven
las 24 listas de opciones del producto y sus 142 opciones: patologías, certificaciones, géneros,
niveles educativos, condiciones fiscales, modalidades de contratación, tareas de cuidado y las
demás. No es una tabla por lista: es una tabla de listas. Agregar una lista nueva es una fila, no
una migración de esquema ni una publicación.

Trae cuatro cosas que no son el guardado en sí, y que son la parte que cuesta escribir dos veces:

- **Dos escalones.** `tenant_id` en nulo es el catálogo general que trae el producto; `tenant_id`
  cargado es lo que agregó esa Prestadora. Cada una ve el general más lo suyo y nada de lo ajeno.
- **Listas cerradas y abiertas.** La columna `cerrada` dice si una Prestadora puede agregarle
  opciones. `genero` o `condicion_fiscal` no son opinión de nadie; `patologia` sí admite lo propio.
  Sin esa columna, «abierta» sería la única forma posible y el catálogo general dejaría de serlo.
- **Los tres idiomas adentro de la base**, en un `jsonb` `{es-AR, en, pt-BR}` que un `check`
  obliga a completar, con una excepción que **está declarada y se puede listar**: `i18n_pendiente`
  en verdadero admite sólo el castellano y **exige escribir la nota que dice por qué falta**. Los
  agujeros de traducción se piden con una consulta, no se descubren en producción.
- **Una puerta que sirve a las pantallas sin sesión.** El directorio y el formulario de
  reclutamiento se ven sin cuenta y necesitan las mismas listas.

**Dónde está acá.**

| Qué | Dónde |
|---|---|
| Las dos tablas, con sus `check` y sus comentarios | `supabase/migrations/0001_base_del_esquema.sql:598` y `:653` |
| Los tres idiomas obligatorios, y el agujero declarado | `supabase/migrations/0001_base_del_esquema.sql:663`, `:611` y `:604` |
| Las ocho políticas: todos leen el general y lo propio, cada una escribe sólo lo suyo | `supabase/migrations/0001_base_del_esquema.sql:4788` a `:4809` y `:4981` a `:5002` |
| Los dos disparadores que impiden cruzar Prestadoras y pisar el catálogo general | `supabase/migrations/0001_base_del_esquema.sql:4008` y `:4015`, con sus funciones en `:1104` y `:1162` |
| La puerta anónima `vocabularios_de(p_slug)` | `supabase/migrations/0001_base_del_esquema.sql:2075` |
| Cómo lo pide el navegador | `js/apiClient.js:247` |
| El archivo JSON, que pasó a ser copia generada y sin conexión | `scripts/generar_vocabularios.mjs` |
| La comprobación de que la copia no se despegó | `scripts/verificar_catalogo.mjs` |

**Qué tiene Careonys hoy.** Comprobado el 29 de agosto de 2026 leyendo su código y sus
migraciones, no supuesto:

- **Tablas de catálogo tiene, pero pocas y sueltas**: `tipos_asistente`
  (`careonys/supabase/migrations/20260819160000_foto_de_la_base.sql:1840`), `tareas_tipo_asistente`
  (`:2908`), `tipos_documento_asistente` (`:2962`), `motivos_aviso_previo_guardia` (`:2353`),
  `escalas_legales` (`:1736`), `advertencias_legales` (`:1051`), `catalogo_modulos` (`:1308`),
  `conceptos_liquidacion`, `monedas_por_pais` y `textos_consentimiento` (`:2938`). Cada una con su
  esquema propio.
- **Y hay listas que no tienen tabla ninguna.** Las patologías del Paciente son **texto libre
  separado por comas**: se escriben en un campo y se parten con `split(',')` en
  `careonys/panel/src/pages/familias/EditarPacienteModal.jsx:16` y `:33`. **No existe tabla de
  cursos** —lo comprobado es que ningún `.sql` crea una—; `certificados` (`:1321`) guarda fechas, no
  la lista de qué se puede certificar. Género, nivel educativo y complejidad del Paciente tampoco
  existen como catálogo: la complejidad es un `check ('I','II','III')` (`:2433`) y la condición
  fiscal otro `check`, con su constante espejo en
  `careonys/panel/src/lib/conceptosLiquidacion.js:30`.
- **Otras listas viven adentro de un componente**: `EditarPacienteModal.jsx:57-61`,
  `careonys/panel/src/pages/asistentes/AusenciasCoberturaTab.jsx:14`, `MatriculasTab.jsx:51` en esa
  misma carpeta, `careonys/panel/src/pages/configuracion/ElCuidado.jsx:28`,
  `careonys/panel/src/lib/modalidades.js:41-47`, y
  `careonys/backend/src/utils/catalogoVisibilidad.js:41` con su gemelo
  `careonys/backend/src/utils/catalogoAvisos.js:43`
  —varias duplicadas entre el frente y el fondo.
- **Los dos escalones ya existen allá y están bien hechos, pero sólo sobre dos tablas.**
  `tipos_asistente.prestadora_id` es nulable (`:1842`) y el `check`
  `tipos_asistente_nombre_segun_nivel` (`:1852`) obliga a que el nivel general lleve `clave` y el
  de la Prestadora lleve `nombre`; lo mismo hace `tareas_tipo_asistente_texto_segun_nivel`
  (`:2920`). La lectura combinada está escrita una sola vez, en
  `careonys/backend/src/utils/tareasDelTipo.js:23` y `:38`. **La idea de este aporte no es nueva para
  Careonys: lo nuevo es dejar de repetirla tabla por tabla.**
- **La traducción es el punto donde más se separan.** Allá conviven tres estrategias y ninguna es
  traducir en la base: el nivel general se traduce en código por clave
  (`careonys/panel/src/lib/tipoDeAsistente.js:31`, con las entradas en
  `careonys/panel/src/i18n/translations.js:729-732`, `:2575` y `:4414`, y el ayudante
  `careonys/panel/src/i18n/valores.js:5`); el nivel de la Prestadora se deja sin traducir a
  propósito (`careonys/panel/src/lib/tipoDeAsistente.js:9-10`, que es la misma decisión que tomó
  este producto); y
  sólo `textos_consentimiento` traduce en la base, con una columna `idioma` (`:2953`). **Y hay un
  agujero:** las tareas generales (`tareas_tipo_asistente.clave`) no tienen dónde traducirse —no
  existe ninguna clave `tarea_*` en `translations.js`— así que
  `careonys/panel/src/pages/configuracion/TiposAsistenteTab.jsx:362` imprime la clave cruda en
  pantalla.
- **Pantallas donde una Prestadora carga lo suyo hay tres**: `TiposAsistenteTab.jsx:406`,
  `careonys/panel/src/pages/configuracion/Asistentes.jsx:105` y `:155` (con su ruta en
  `careonys/backend/src/routes/panelConfiguracion.js:596`) y `ElCuidado.jsx:273`. **Ninguna para patologías,
  certificaciones, cursos, géneros, niveles educativos ni modalidades.** Este producto ya tiene la suya, y es una sola
  para todas las listas: `panel-prestadora.html:210`, contra `vocabulario_items`. Careonys las tiene
  repartidas en tres pantallas y le faltan seis listas; acá el bloque es uno y sirve para
  cualquier vocabulario abierto, así que **el aporte va en este sentido**.

**Qué habría que tocar allá.** Es lo que se pone adelante para aprobar de a un punto, no un plan
en curso:

1. **Crear las dos tablas genéricas con sus políticas y sus disparadores.** Es todo lo que se
   nombra en el cuadro de arriba, copiado tal cual, cambiando `tenant_id` por `prestadora_id` y
   `tenants` por `prestadoras`. Nada se rompe con este paso solo: son tablas nuevas.
2. **Traer primero las listas que hoy no tienen ninguna tabla** —patologías, certificaciones,
   cursos, género, nivel educativo, modalidades—. Es donde el aporte se nota y donde no hay nada
   que migrar, porque hoy son texto libre o constantes en un componente. **Si esto no se hace, lo
   que se pierde es concreto:** las patologías siguen siendo texto libre, así que dos Prestadoras
   escriben «EPOC» y «E.P.O.C.» y ninguna consulta las junta nunca.
3. **Recién después, y de a una, mudar las que ya tienen tabla propia.** `tipos_asistente` y
   `tareas_tipo_asistente` son las candidatas naturales porque ya tienen los dos escalones, pero
   **las dos tienen datos cargados y código que las lee** —el `check` de nombre según nivel, la
   lectura de `tareasDelTipo.js`, las tres pantallas de configuración—. Mudarlas sin tocar eso deja
   las pantallas leyendo una tabla que ya no se escribe.
4. **Decidir dónde se traduce.** Si las opciones generales pasan a traducirse en la base, las
   entradas de `translations.js` que hoy las traducen quedan sin uso y hay que sacarlas, no
   dejarlas: dos verdades de traducción es peor que una sola incompleta. El caso de las tareas
   generales se arregla solo con este paso, porque hoy no tiene dónde traducirse.
5. **Lo que no hay que llevar sin pensarlo dos veces:** el archivo JSON generado. Existe acá porque
   los dos programas para el teléfono necesitan el catálogo sin conexión. Si Careonys no tiene esa
   necesidad, ese archivo, su generador y su comprobación no van.

**Lo que no se comprobó.** Cuánto código de Careonys leería cada catálogo mudado: se listaron las
pantallas que muestran listas, no todos sus lectores. Antes de mudar una tabla que ya existe hay
que hacer esa cuenta.

---

## 2. Cursos, evaluaciones y el examen que corrige la base

Anotado al cerrar el reparto de lo que no choca, en la segunda pasada de la fusión.

**Qué es.** Un catálogo de cursos con su oferta a la vista, evaluaciones con preguntas y opciones,
y un examen que **se corrige adentro de la base**: la pantalla manda las respuestas y recibe el
resultado, y nunca llega a saber cuál era la correcta. El tope de intentos y la exigencia de que
el legajo sea el propio también se controlan ahí, no en la pantalla.

Cinco tablas, dos vistas y una función, todo en `supabase/migrations/0001_base_del_esquema.sql`:

- `cursos` (`:2359`), con los dos escalones de siempre: el general del producto y el propio de cada
  Prestadora.
- `evaluaciones` (`:2481`), `preguntas_evaluacion` (`:3003`), `opciones_pregunta` (`:2846`) e
  `intentos_evaluacion` (`:548`).
- La vista `oferta_de_cursos` (`:2818`), abierta a quien no inició sesión (`:5861`), que es lo que
  ve la vitrina.
- La vista `opciones_para_responder` (`:2868`), que es la misma lista **sin la columna que dice
  cuál es la correcta**. Es lo que hace que el examen no se pueda espiar desde el navegador.
- `rendir_evaluacion` (`:1887`), que recibe las respuestas, corrige, cuenta el intento y devuelve
  el porcentaje.

Las pantallas son `examen.html`, `cursos.html` y la de capacitaciones del programa del Asistente
(`pwa-asistente/index.html:732`). El acceso desde el código está en `js/apiClient.js:831` y `:875`.

Y el resultado no se queda ahí: el directorio suma la comprobación de curso aprobado cuando existe
un intento aprobado (`supabase/migrations/0001_base_del_esquema.sql:773`).

**Qué tiene Careonys hoy.** Nada de esto. «Capacitación» existe allá, pero es **una etapa del
proceso de incorporación** —una casilla que alguien marca—, no un curso con contenido:
`careonys/backend/src/utils/cuentasPanel.js:14` y `careonys/panel/src/i18n/translations.js:501`.
No hay tabla de cursos, ni de evaluaciones, ni de intentos. Las únicas apariciones de «evaluación»
en su código son las calificaciones que la Familia le pone al Asistente
(`careonys/backend/src/routes/appFamilias.js:544`), que son otra cosa.

**Qué habría que tocar allá.**

1. Las cinco tablas viajan casi tal cual: no dependen de nada propio de esta modalidad salvo el
   legajo, porque `rendir_evaluacion` corta con «sin legajo» si quien llama no tiene uno. Allá el
   equivalente es la ficha del Asistente.
2. **La corrección tiene que seguir adentro de la base, y eso choca con cómo trabaja Careonys.**
   Su servidor entra a la base con una llave que se saltea las reglas de la base, así que si el
   examen pasa por el servidor, el tope de intentos y el control de legajo propio dejan de estar
   donde están hoy y hay que escribirlos de nuevo allá. Es el mismo cruce de caminos del tema 13.
   **Si esto no se decide antes de mudar, se muda una función que allá no protege nada.**
3. Enganchar el resultado con la etapa de capacitación que ya existe allá: hoy alguien la marca a
   mano, y con esto la marcaría un examen aprobado. Si no se hace, quedan dos verdades sobre lo
   mismo y ninguna manda.
4. **Lo que no viaja es el contenido.** Las dos evaluaciones cargadas tienen cuatro preguntas y
   doce opciones, y con eso se aprueba adivinando 37 de cada 64 veces (pendiente 24). Llevar el
   mecanismo sin escribir las preguntas es llevar un examen que no examina.

**Lo que no se comprobó.** Si a Careonys le sirve que la oferta de cursos se vea sin sesión, como
acá. Acá se ve porque la vitrina es parte de lo que vende el producto.

---

## 3. Las guías de cuidado por patología

Anotado al cerrar el reparto de lo que no choca, en la segunda pasada de la fusión.

**Qué es.** Un texto de cuidado atado a **una opción del catálogo** —una patología—, con partes
fijas: qué es, qué esperar, señales de alarma y qué hacer en una emergencia. Con los dos escalones
de siempre: la general que trae el producto y la propia de cada Prestadora, que pisa a la general.

- `guias_cuidado` (`supabase/migrations/0001_base_del_esquema.sql:2590`), colgada de la opción de
  catálogo y no de un texto suelto.
- `vocabularios.admite_guia` (`:662`) marca qué listas admiten guía, para que la de patologías la
  tenga y la de géneros no.
- Un control que no deja publicar una guía sin decir quién la revisó y cuándo (`:2618`).
- Un disparador que impide que la guía de una Prestadora se cuele en otra (`:1434`).
- `guias_de` (`:1272`), abierta a quien no inició sesión (`:5514`), que devuelve sólo las
  publicadas y deja que la propia pise a la general.

Se leen en la pantalla de guías del programa del Asistente (`pwa-asistente/index.html:800`) y se
escriben en `guias-prestadora.html`. Y hay un camino para el teléfono sin señal:
`scripts/generar_guias.mjs` deja el archivo que la aplicación guarda.

**Qué tiene Careonys hoy.** Nada: 0 coincidencias de guía de cuidado en su código y en sus
migraciones. Pero **sí tiene el lugar donde engancharía**, y con una regla ya resuelta que hay que
respetar: las patologías del Paciente existen allá y ya tienen control de quién las ve —se
muestran solamente en la pantalla de una guardia, `careonys/backend/src/routes/appAsistentes.js:43`,
y no se mandan siquiera cuando la Prestadora las tiene encendidas si el Asistente está mirando una
oferta, `careonys/backend/src/routes/appAsistentesOfertas.js:47`—.

**Qué habría que tocar allá.**

1. La guía cuelga de una opción de catálogo, así que **primero tiene que estar mudado el aporte
   1**. Sin las dos tablas de listas no hay de dónde colgarla.
2. Allá las patologías del Paciente se guardan como texto. Mientras sigan así, ninguna guía las
   alcanza: dos maneras de escribir la misma patología son dos patologías distintas.
3. **La regla de a quién se le muestra ya está resuelta allá y manda sobre esto**: si la patología
   sólo se ve en la pantalla de una guardia, la guía tampoco puede aparecer antes.
4. **Lo que no viaja es el contenido.** Las 19 guías generales están escritas en los tres idiomas y
   **ninguna está publicada**, porque falta la firma de quien las revise (pendiente 104). El
   mecanismo se lleva; los textos siguen siendo borrador de los dos lados.

---

## 4. La disponibilidad horaria como grilla, y no como texto

Anotado al cerrar el reparto de lo que no choca, en la segunda pasada de la fusión.

**Qué es.** El Asistente marca en una grilla de día y turno cuándo puede trabajar, y cada casilla
marcada es una fila que guarda **claves de catálogo**, nunca la etiqueta escrita.

- `disponibilidad_asistente` (`supabase/migrations/0001_base_del_esquema.sql:528`): lo general,
  incluido si acepta reemplazos urgentes.
- `franjas_asistente` (`:2534`): una fila por casilla, con la clave del día y la del turno.
- Del otro lado del mercado, la misma forma para lo que pide la Familia: `franjas_aviso` (`:2555`)
  y `franjas_de_aviso` (`:1247`).
- Y la grilla se dibuja una sola vez para los dos lados: `js/disponibilidad.js`, donde el destino
  lo elige un argumento (`js/disponibilidad.js:8`).

**Qué tiene Careonys hoy.** Dos formas, las dos sin estructura:

- En la postulación, la disponibilidad es texto
  (`careonys/supabase/migrations/20260819160000_foto_de_la_base.sql:2535`), y lo que se guarda son
  cuatro códigos separados por coma —mañana, tarde, noche y fines de semana—
  (`careonys/panel/src/lib/postulacionCodigos.js:1`), traducidos con una tabla de etiquetas escrita
  adentro del archivo de traducciones (`careonys/panel/src/i18n/translations.js:733`). **No hay día
  de la semana**, así que «los martes a la tarde» no se puede decir.
- En la ficha del Asistente, la disponibilidad es un campo de datos libres sin forma declarada
  (`careonys/supabase/migrations/20260819160000_foto_de_la_base.sql:1126`).

**Y hay un hecho que hay que decir antes de proponer nada: hoy no la lee nadie, de ninguno de los
dos lados.** Acá, `franjas_asistente` se escribe en tres lugares y su única aparición fuera de la
escritura es el envío a la base (`js/apiClient.js:510`): no hay pantalla que la muestre ni filtro
del directorio que la use. Lo único de disponibilidad que sale al directorio es el sí o no de
reemplazos urgentes (`supabase/migrations/0001_base_del_esquema.sql:759`). Y allá, la columna de la
ficha del Asistente no la lee ningún archivo del servidor ni de las pantallas: las únicas
apariciones son las de la postulación.

**Qué habría que tocar allá.**

1. Es el aporte más barato de los tres, y el que más rinde **si y sólo si del otro lado hay quien
   la lea**: Careonys reparte guardias, y una grilla de día y turno es exactamente lo que un
   reparto necesita. Acá no hay quién la lea porque acá nadie reparte trabajo.
2. Requiere el aporte 1 mudado: las claves de día y de turno son opciones de catálogo.
3. El texto de las postulaciones no se convierte solo. O se deja como historia y la grilla arranca
   vacía, o alguien traduce los cuatro códigos viejos a casillas, y ahí falta el día, que nunca se
   preguntó.
4. **Si allá tampoco hay quién la lea, no viaja.** Mudar una tabla que sólo se escribe es mudar el
   problema de lugar.
