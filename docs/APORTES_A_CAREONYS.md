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
| Las dos tablas, con sus `check` y sus comentarios | `supabase/migrations/0038_los_vocabularios_viven_en_la_base.sql:105` y `:146` |
| Los tres idiomas obligatorios, y el agujero declarado | mismo archivo, `:118`, `:179` y `:152` |
| Las ocho políticas: todos leen el general y lo propio, cada una escribe sólo lo suyo | mismo archivo, `:308` a `:345` |
| Los dos disparadores que impiden cruzar Prestadoras y pisar el catálogo general | mismo archivo, `:210` y `:275` |
| La puerta anónima `vocabularios_de(p_slug)` | mismo archivo, `:375` |
| Cómo lo pide el navegador | `js/apiClient.js:247` |
| El archivo JSON, que pasó a ser copia generada y sin conexión | `scripts/generar_vocabularios.mjs` |
| La comprobación de que la copia no se despegó | `scripts/verificar_catalogo.mjs` |

**Qué tiene Careonys hoy.** Comprobado el 29 de agosto de 2026 leyendo su código y sus
migraciones, no supuesto:

- **Tablas de catálogo tiene, pero pocas y sueltas**: `tipos_asistente`
  (`supabase/migrations/20260819160000_foto_de_la_base.sql:1840`), `tareas_tipo_asistente`
  (`:2908`), `tipos_documento_asistente` (`:2962`), `motivos_aviso_previo_guardia` (`:2353`),
  `escalas_legales` (`:1736`), `advertencias_legales` (`:1051`), `catalogo_modulos` (`:1308`),
  `conceptos_liquidacion`, `monedas_por_pais` y `textos_consentimiento` (`:2938`). Cada una con su
  esquema propio.
- **Y hay listas que no tienen tabla ninguna.** Las patologías del Paciente son **texto libre
  separado por comas**: se escriben en un campo y se parten con `split(',')` en
  `panel/src/pages/familias/EditarPacienteModal.jsx:16` y `:33`. **No existe tabla de cursos** —lo
  comprobado es que ningún `.sql` crea una—; `certificados` (`:1321`) guarda fechas, no la lista de
  qué se puede certificar. Género, nivel educativo y complejidad del Paciente tampoco existen como
  catálogo: la complejidad es un `check ('I','II','III')` (`:2433`) y la condición fiscal otro
  `check`, con su constante espejo en `panel/src/lib/conceptosLiquidacion.js:30`.
- **Otras listas viven adentro de un componente**: `EditarPacienteModal.jsx:57-61`,
  `AusenciasCoberturaTab.jsx:14`, `MatriculasTab.jsx:51`, `ElCuidado.jsx:28`,
  `panel/src/lib/modalidades.js:41-47`, y `backend/src/utils/catalogoVisibilidad.js:41` con su
  gemelo `catalogoAvisos.js:43` —varias duplicadas entre el frente y el fondo.
- **Los dos escalones ya existen allá y están bien hechos, pero sólo sobre dos tablas.**
  `tipos_asistente.prestadora_id` es nulable (`:1842`) y el `check`
  `tipos_asistente_nombre_segun_nivel` (`:1852`) obliga a que el nivel general lleve `clave` y el
  de la Prestadora lleve `nombre`; lo mismo hace `tareas_tipo_asistente_texto_segun_nivel`
  (`:2920`). La lectura combinada está escrita una sola vez, en
  `backend/src/utils/tareasDelTipo.js:23` y `:38`. **La idea de este aporte no es nueva para
  Careonys: lo nuevo es dejar de repetirla tabla por tabla.**
- **La traducción es el punto donde más se separan.** Allá conviven tres estrategias y ninguna es
  traducir en la base: el nivel general se traduce en código por clave
  (`panel/src/lib/tipoDeAsistente.js:31`, con las entradas en
  `panel/src/i18n/translations.js:729-732`, `:2575` y `:4414`, y el ayudante
  `panel/src/i18n/valores.js:5`); el nivel de la Prestadora se deja sin traducir a propósito
  (`panel/src/lib/tipoDeAsistente.js:9-10`, que es la misma decisión que tomó este producto); y
  sólo `textos_consentimiento` traduce en la base, con una columna `idioma` (`:2953`). **Y hay un
  agujero:** las tareas generales (`tareas_tipo_asistente.clave`) no tienen dónde traducirse —no
  existe ninguna clave `tarea_*` en `translations.js`— así que
  `panel/src/pages/configuracion/TiposAsistenteTab.jsx:362` imprime la clave cruda en pantalla.
- **Pantallas donde una Prestadora carga lo suyo hay tres**: `TiposAsistenteTab.jsx:406`,
  `configuracion/Asistentes.jsx:105` y `:155` (con su ruta en
  `backend/src/routes/panelConfiguracion.js:596`) y `ElCuidado.jsx:273`. **Ninguna para patologías,
  certificaciones, cursos, géneros, niveles educativos ni modalidades.** Careonys está más adelante
  que este producto en esto: acá esa pantalla no existe todavía para ninguna lista (pendiente 96).

**Qué habría que tocar allá.** Es lo que se pone adelante para aprobar de a un punto, no un plan
en curso:

1. **Crear las dos tablas genéricas con sus políticas y sus disparadores.** Es la migración 0038
   entera, cambiando `tenant_id` por `prestadora_id` y `tenants` por `prestadoras`. Nada se rompe
   con este paso solo: son tablas nuevas.
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
