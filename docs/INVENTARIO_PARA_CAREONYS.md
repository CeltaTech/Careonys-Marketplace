# Lo que este producto tiene, para que Careonys elija

Acá está todo lo que el Marketplace construyó, pieza por pieza y dicho por lo que hace. Nada de
esto se apaga por decisión de este lado. **Careonys marca lo que le sirve, y recién sobre lo que
sobre se decide algo.**

La última columna se completa de un solo lado: **Careonys**. Tres valores y ninguno más:

| Marca | Significa |
|---|---|
| **viaja** | Careonys lo quiere. Se lleva y sigue vivo |
| **no** | Careonys no lo necesita |
| *(vacío)* | Todavía no se miró |

Donde dice **«Careonys lo pide»**, es porque el plan de Careonys ya escribió que le falta eso
mismo.

---

## 1. Las pantallas del sitio

| Pieza | Qué hace | Careonys |
|---|---|---|
| Portada | Presenta el producto a quien llega sin conocerlo | |
| Quien busca cuidado pide asistencia | La Familia describe qué necesita y lo publica | |
| Directorio | La Familia recorre a los Asistentes disponibles y abre la ficha de cada uno | |
| Ficha propia | Cada persona ve y corrige sus datos, y ve cómo la ven los demás | |
| **Formulario público de postulación** | Quien quiere trabajar entra sus datos por pasos, sin tener cuenta: identidad, domicilio, formación, experiencia clínica, disponibilidad horaria, zonas, papeles del legajo y cierre. **Careonys lo pide** | |
| Alta de una Familia | Quien necesita cuidado abre su cuenta | |
| Entrada | Una sola puerta para todos, que reconoce de qué Prestadora viene quien entra | |
| Recuperar la clave | Pide el correo y manda el enlace | |
| Clave nueva | Recibe el enlace y deja entrar una clave nueva | |
| **Cursos** | La lista de capacitaciones, con el avance de cada persona. **Careonys lo pide** | |
| **Examen** | Toma la evaluación, la corrige la base y devuelve el resultado. **Careonys lo pide** | |
| Guías de cuidado de la Prestadora | Cada Prestadora escribe y publica sus guías por patología | |
| Acompañamiento a distancia | Explica y ofrece la modalidad de acompañamiento remoto | |
| Maqueta de las aplicaciones | Muestra las dos aplicaciones de teléfono adentro del sitio, para verlas sin instalarlas | |

## 2. El panel de la Prestadora

| Pieza | Qué hace | Careonys |
|---|---|---|
| **Listas de opciones propias** | Cada Prestadora carga sus propias opciones: género, nacionalidad, registro fiscal, subgrupos de experiencia clínica y todo lo demás que se elige de una lista. **Careonys lo pide** | |
| Verificaciones | La Prestadora define qué papeles exige y en qué orden | |
| Resoluciones | La Prestadora admite o rechaza a quien se postuló, con el motivo | |
| Moneda | Con qué moneda trabaja esa Prestadora | |
| Tope de alarma | A partir de qué número el sistema avisa | |
| Registro de lo que se hizo | Quién hizo qué, cuándo y sobre qué | |

## 3. Las dos aplicaciones de teléfono

| Pieza | Qué hace | Careonys |
|---|---|---|
| Aplicación del Asistente: inicio | La guardia de hoy, con registrar entrada, registrar salida y registrar ubicación | |
| Aplicación del Asistente: avisos | Lo que la Prestadora le manda | |
| Aplicación del Asistente: conversación | La charla de ida y vuelta con la Familia | |
| Aplicación del Asistente: legajo | Sus papeles, qué falta y qué venció | |
| Aplicación del Asistente: capacitaciones | Los cursos desde el teléfono | |
| Aplicación del Asistente: guías | Las guías de cuidado de la patología que atiende | |
| Aplicación del Asistente: entrada | Puerta de acceso propia del teléfono | |
| Aplicación de la Familia: tablero | Qué está pasando ahora con el cuidado | |
| Aplicación de la Familia: publicar | Publica la vacante y la sostiene | |
| Aplicación de la Familia: postulaciones | Ve quién se postuló a su vacante y elige | |
| Aplicación de la Familia: asistencia | Sigue la guardia en curso | |
| Aplicación de la Familia: reportes | Lo que quedó registrado de cada guardia | |
| Aplicación de la Familia: conversación | La charla de ida y vuelta con el Asistente | |
| Trabajo sin señal | Guarda lo que se registró sin conexión y lo entrega cuando vuelve | |

## 4. El código que sostiene todo eso

No son pantallas: es la capa de abajo que las pantallas usan. Una pantalla que viaje sin su pieza
de abajo no anda.

| Pieza | Qué hace | Careonys |
|---|---|---|
| Puerta a la base | Un solo punto por donde pasa todo pedido de datos | |
| Identidad y entrada | Quién entró, de qué Prestadora y con qué permisos | |
| Autorizaciones | Qué puede hacer cada quien en cada pantalla | |
| Claves | Alta, cambio y recuperación de la clave | |
| Catálogos | Trae de la base toda lista de opciones, sin que ninguna pantalla la escriba adentro | |
| Formularios declarados | Campos, etiquetas, validaciones y pasos salen de una definición, no de cada pantalla | |
| Vocabularios | La misma lista de opciones dicha en los tres idiomas | |
| Frases | Todo el texto visible, en los tres idiomas, leído de un catálogo | |
| Disponibilidad horaria | La grilla de días y franjas, y no un texto libre | |
| Zonas | Dónde trabaja cada persona | |
| Legajo: papeles | Sube, guarda y vence los documentos de cada persona | |
| Legajo: fichas | Los datos que componen el legajo y cómo se corrigen | |
| Conversación | La charla de ida y vuelta, con sus reglas de qué no se puede mandar | |
| Reglas de lo que no se manda | Detecta datos de contacto adentro de la conversación y los frena | |
| Cola de registros | Retiene lo que se registró sin señal hasta que vuelve la conexión | |
| Avisos | Cómo se muestra un mensaje del sistema en cualquier pantalla | |
| Alarmas | La franja que aparece cuando algo pasó el tope | |
| Estados de una lista | Cargando, error, vacía y lista, resueltos una sola vez | |
| Marca | El nombre visible del producto, en un único lugar | |
| Trabajo sin conexión | Qué queda guardado en el teléfono y cómo se actualiza | |

## 5. Los catálogos

Son datos, no código. Cada uno es una lista cerrada que el producto lee.

| Pieza | Qué hace | Careonys |
|---|---|---|
| Frases | Todo el texto visible del producto, en los tres idiomas | |
| Vocabularios | Las listas de opciones de los formularios, en los tres idiomas | |
| Fichas | Qué datos componen un legajo | |
| Verificaciones | Qué papeles se exigen y en qué orden | |
| Autorizaciones | Qué puede hacer cada rol | |
| Disponibilidad | Días y franjas horarias | |
| Guías de cuidado | Las guías por patología | |
| Oferta | Lo que el producto ofrece hacia afuera | |
| Reglas de lo que no se manda | Los patrones que frenan datos de contacto en la conversación | |

## 6. Los tres idiomas

Todo el texto visible existe en castellano rioplatense, inglés y portugués de Brasil, y no como
una traducción agregada después: la base lo exige y hay un chequeo que rompe la construcción si
falta un idioma en cualquier frase nueva.

| Pieza | Qué hace | Careonys |
|---|---|---|
| Los tres idiomas exigidos desde la base | Ninguna frase puede existir en un solo idioma | |

## 7. Los chequeos que corren solos

Cuarenta y un chequeos automáticos que corren antes de cada cambio y lo frenan si algo se rompió.
Miran, entre otras cosas: que ninguna pantalla escriba texto a mano, que ningún color esté puesto
fuera del sistema de diseño, que ninguna cita a un renglón apunte a un renglón que se movió, que
ninguna dirección lleve a una pantalla que no existe, que ningún mensaje de error filtre detalle
de la base, que ningún casillero lleve explicación debajo, y que ningún texto tutee.

| Pieza | Qué hace | Careonys |
|---|---|---|
| La red de chequeos | Cuarenta y un controles automáticos antes de cada cambio | |
| Los chequeos que se arreglan solos | Ocho de ellos no sólo avisan: corrigen lo que encontraron | |
| La prueba de que un chequeo sirve | Cada exención se prueba vaciándola: si igual pasa, el chequeo no controlaba nada | |

## 8. La base

Nueve archivos que construyen la base entera desde cero, en orden, y que reproducen exactamente
lo que hoy está publicado. Ahí viven las tablas, el aislamiento entre Prestadoras y los datos
ficticios de prueba.

| Pieza | Qué hace | Careonys |
|---|---|---|
| Las tablas y su aislamiento | Toda tabla nace con su Prestadora y con la regla que impide ver la de al lado | |
| Las tres Prestadoras ficticias | Banco de pruebas con datos inventados, con la misma arquitectura de seguridad que las reales | |
| La corrección del examen adentro de la base | El examen no lo corrige la pantalla | |
