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

---

## 5. Los tres idiomas los exige la base, y no solamente la pantalla

Anotado al cerrar el reparto de lo que no choca, en la segunda pasada de la fusión.

**Qué es.** La regla de la empresa pide `es-AR`, `en` y `pt-BR` desde el primer día. Acá esa regla
no vive en la buena voluntad de quien escribe una pantalla: **está adentro de la base, como una
restricción**, y un texto al que le falte un idioma no se puede guardar.

- Cuatro funciones son el punto único de verdad, dos para un texto y dos para una lista de textos:
  `i18n_completo` (`supabase/migrations/0001_base_del_esquema.sql:378`), `i18n_minimo` (`:402`),
  `i18n_lista_completa` (`:1329`) e `i18n_lista_minima` (`:1359`).
- **Doce restricciones las usan**, y todas dicen lo mismo con dos escalones: si el texto es del
  producto, tienen que estar los tres idiomas; si es de una Prestadora, alcanza con el suyo. Se ve
  entera en `:2374`, y las otras once están en `:611`, `:663`, `:2379`, `:2384`, `:2603`, `:2608`,
  `:2613`, `:2619`, `:2768`, `:2773` y `:2898`.
- El idioma de la pantalla se decide **en un solo lugar** (`js/catalogo.js:82`), y en este orden:
  lo que diga la dirección, después lo que la persona haya elegido antes, y **después lo que
  declara el navegador** (`js/catalogo.js:91`). Con equivalencias: quien tiene el navegador en
  `pt-PT` o en `es-419` cae en el idioma de su familia y no en el de omisión (`js/catalogo.js:69`).
- Las frases sueltas salen de un catálogo de datos y no del código: 1022 frases, cada una con sus
  tres idiomas, en `data/catalogo-frases.json`. Los mensajes de error son frases como cualquier
  otra, así que también se traducen.
- Y hay un chequeo que lo vigila: `scripts/verificar_frases.mjs`, que busca texto escrito a mano
  adentro de una pantalla y traducciones a medias.

**Qué tiene Careonys hoy.** Los tres idiomas están, y el trabajo hecho es enorme —más de ocho mil
renglones de traducciones—, pero **todo el peso está del lado de la pantalla y nada del lado de la
base**:

- Son **tres archivos separados y escritos a mano**, uno por aplicación, sin librería:
  `careonys/panel/src/i18n/translations.js` (6052 renglones),
  `careonys/pwa-asistentes/src/i18n/translations.js` (1089) y
  `careonys/pwa-familias/src/i18n/translations.js` (983).
- **El idioma sale solamente de lo que la persona eligió antes, y nunca del navegador**
  (`careonys/panel/src/i18n/LocaleContext.jsx:8`). Quien entra por primera vez con el teléfono en
  portugués ve la aplicación en castellano.
- **Y cada aplicación guarda esa elección en su propio lugar**, así que elegir el idioma en una no
  cambia el de las otras: son tres llaves distintas, una por aplicación
  (`careonys/pwa-asistentes/src/i18n/LocaleContext.jsx:8`,
  `careonys/pwa-familias/src/i18n/LocaleContext.jsx:8`).
- **Sólo el panel tiene dónde elegirlo**
  (`careonys/panel/src/components/layout/SelectoresPreferencias.jsx:28`), y muestra el código
  crudo en vez del nombre del idioma (`:31`). **En los dos programas de teléfono no hay ningún
  selector**, así que quien los usa se queda en castellano y no tiene manera de cambiarlo.
- **La base no exige nada.** Sabe que los idiomas son tres en un solo lugar, y es para decir de
  cuál de los tres es cada texto de consentimiento, no para pedir que estén los tres
  (`careonys/supabase/migrations/20260819160000_foto_de_la_base.sql:2953`). Las advertencias
  legales, sin ir más lejos, guardan **un solo texto**, y la migración que las carga lo dice en su
  propio cuerpo
  (`careonys/supabase/migrations/20260910140000_las_cinco_advertencias_de_marketplace_se_cargan_y_sus_funciones_se_pueden_encender.sql:30`).

**Qué habría que tocar allá.**

1. **Lo primero es lo más barato y lo que más se nota: leer el idioma del navegador la primera
   vez, y poner un selector en los dos programas de teléfono.** Son dos cambios chicos, no
   dependen de la mudanza, y hoy dejan a todo el que no habla castellano mirando una aplicación
   que sí está traducida.
2. **Las cuatro funciones y las doce restricciones viajan tal cual.** No dependen de nada propio
   de esta modalidad: miran un texto y dicen si tiene los idiomas. Puestas allá, el texto a medio
   traducir deja de poder guardarse, que es la diferencia entera entre una regla y una intención.
3. **Y ahí aparece el trabajo de verdad:** allá el texto visible vive en archivos de código y no
   en la base, así que la restricción sólo alcanza a lo que la base guarda —consentimientos,
   advertencias, catálogos—. Para el resto, el equivalente de la restricción es un chequeo
   automático, y allá ya hay dos corriendo en cada subida. Eso se trata en el aporte 6.
4. **Los dos escalones —el producto en tres idiomas, la Prestadora en el suyo— hay que llevarlos
   enteros**, porque sin ellos la regla es impracticable: nadie va a exigirle a una Prestadora que
   escriba en portugués una opción de su propio catálogo.
5. **Lo que no viaja es el contenido**, como en los aportes anteriores: las 1022 frases de acá son
   de las pantallas de acá.

**Lo que no se comprobó.** Cuántas de las traducciones de allá están realmente escritas en los
tres idiomas y cuántas repiten el castellano. Se contaron los archivos y los renglones; no se
leyó frase por frase.

---

## 6. La red de chequeos que corre sola antes de cada cambio

Anotado al cerrar el reparto de lo que no choca, en la segunda pasada de la fusión.

**Y éste es el único de los aportes que va y viene**, así que se escribe entero en los dos
sentidos. Cada lado resolvió la mitad que el otro no tiene.

**Qué es lo de acá.** Treinta y nueve chequeos que corren **antes de cada cambio guardado**, y si
alguno se pone rojo el cambio no se guarda. Tardan menos de un segundo todos juntos.

- La lista **no está escrita en ningún lado**: el corredor mira la carpeta y toma todo lo que
  encuentra (`scripts/verificar_todo.mjs:36`). Un chequeo nuevo entra solo, sin que nadie se
  acuerde de anotarlo, y un renglón con la cuenta escrito a mano queda viejo el día que se agrega
  uno.
- El gancho que los dispara **vive adentro del repositorio** y no en la carpeta oculta que no se
  sube (`.githooks/pre-commit`). Se enciende con un comando, una sola vez por máquina
  (`.githooks/pre-commit:12`).
- **Dos pruebas se miran a la red de chequeos a sí misma**, que es lo que la separa de una red
  decorativa: una le saca el material que revisan y exige que se pongan rojos
  (`scripts/probar_perdida_de_corpus.mjs`), y la otra les vacía de a una las excepciones y exige
  lo mismo (`scripts/probar_exenciones.mjs`). Un chequeo que pasa con la carpeta vacía no estaba
  revisando nada.
- Y la comprobación de que la publicación salió bien **arranca por un control negativo**: le pide
  al sitio una dirección inventada y, si no contesta que no existe, se corta ahí y no informa nada
  (`scripts/comprobar_publicacion.mjs:109`). Sin eso, un servidor que contesta cualquier cosa a
  cualquier pedido da todo verde.

**Qué tiene Careonys hoy, y qué tiene que acá no hay.**

- **Tiene lo que acá falta entero: chequeos que corren solos en cada subida, en un servidor y no
  en la máquina de alguien.** Son tres: la identidad del producto
  (`careonys/.github/workflows/verificar-identidad.yml:28`), los textos huérfanos y a medio
  traducir (`careonys/.github/workflows/verificar-textos.yml:41`) y el texto escrito a mano o que
  tutea (`careonys/.github/workflows/verificar-textos.yml:68`).
- Y su publicación **comprueba que la versión nueva esté contestando**, no que la subida haya
  terminado (`careonys/.github/workflows/deploy-backend.yml:50`). Es exactamente el mismo problema
  que resuelve la comprobación de acá, resuelto por el otro lado.
- **Y le falta lo que acá sobra: nada corre antes de guardar un cambio.** No hay ningún gancho
  puesto —los que trae la herramienta de fábrica están todos apagados— ni nada que los encienda.
- **Y las pruebas que tiene, que son muchas, no las corre nadie automáticamente.** Cuarenta y
  cuatro archivos, casi diez mil renglones, y ninguno de los tres flujos que corren en cada subida
  los llama. Están escritas, y esperan que alguien se acuerde.
- **Y no están donde más falta hacen:** las cuarenta y cuatro viven en el motor y en el panel. Los
  dos programas de teléfono tienen **cero**, y además no tienen con qué correrlas: su archivo de
  arranque no declara ninguna orden de prueba, a diferencia del motor y del panel.

**Qué habría que tocar, de los dos lados.**

1. **Los treinta y nueve chequeos no viajan como están, y hay que decirlo sin vueltas.** Están
   escritos contra pantallas de un solo archivo, sin herramienta de armado; allá las pantallas se
   arman con una y el texto vive adentro del código. Lo que viaja es **la forma**: la lista que se
   descubre sola, el gancho guardado en el repositorio, y sobre todo las dos pruebas que revisan a
   los revisores. Cuáles de los treinta y nueve sobreviven se decide uno por uno el día de la
   mudanza, y varios ya tienen su equivalente allá.
2. **Lo primero que hay que llevar allá es el gancho, no los chequeos.** Con los tres chequeos que
   ya tienen corriendo en la subida, ponerlos también antes de guardar el cambio adelanta el rojo
   de media hora a un segundo, y no hay nada nuevo que escribir.
3. **Y lo primero que hay que traer para acá es que los chequeos corran en un servidor.** Hoy toda
   la red de acá depende de que en esa máquina alguien haya corrido un comando una vez. En una
   máquina donde no se corrió, los treinta y nueve chequeos no existen y nadie se entera.
4. **Las dos pruebas que se miran a los revisores son el aporte que más rinde**, porque no
   dependen de la tecnología: le sacan el material a un chequeo y exigen que se ponga rojo. Se
   pueden escribir allá contra sus tres chequeos sin esperar ninguna mudanza.
5. **Y las cuarenta y cuatro pruebas de allá hay que engancharlas a la subida antes de agregar una
   sola más.** Una prueba que hay que acordarse de correr es una prueba que no corre, y hoy son
   diez mil renglones que no protegen nada.

**Lo que no se comprobó.** Si las cuarenta y cuatro pruebas de allá pasan hoy. Se contaron y se
miró quién las llama; no se corrieron.
