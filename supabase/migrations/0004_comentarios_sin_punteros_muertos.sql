-- Los comentarios de la base todavía mandaban a migraciones que no existen.
--
-- Las 76 migraciones sueltas de este producto se juntaron en tres archivos, y
-- desde entonces toda migración con número 0004 o mayor dejó de estar en el
-- disco. Veinticinco `COMMENT ON` seguían nombrándolas —«migración 0053»,
-- «(0074)», «hasta la 0013»—, y esos comentarios no viven en un documento: los
-- guarda la base, los lee cualquiera que abra la tabla desde el panel o desde
-- `\d+`, y mandan a un archivo que nadie puede abrir.
--
-- No se corrigen editando el archivo donde están escritos: una migración
-- aplicada no se edita jamás, se corrige con otra adelante. Esta es esa otra.
--
-- Cada texto se reescribe entero, con el hecho intacto y sin el puntero. Donde
-- el número era lo único que decía la frase, la frase se va; donde la frase
-- explicaba algo que sigue valiendo, queda dicha sin fecha ni número. Lo que
-- **no** se toca es el contenido: ninguna de estas reescrituras cambia lo que
-- el comentario afirma sobre la tabla, la columna o la función.
--
-- Quedan afuera, a propósito, los comentarios de `--` que están adentro de
-- `0001_base_del_esquema.sql`: ésos no viven en la base, viven en el archivo, y
-- el archivo es una migración aplicada.

-- ---- Las dos funciones que atiende CeltaTech ----

COMMENT ON FUNCTION public.alta_de_prestadora(p_referencia text, p_nombre text, p_slug text, p_descripcion text) IS 'Da de alta una Prestadora a pedido de CeltaTech, o devuelve la que ya existe con esa referencia. La reconoce sólo por `p_referencia`; el nombre corto es la dirección web y nada más. Se llama únicamente desde la función de borde `alta-y-baja`.';

COMMENT ON FUNCTION public.corregir_prestadora(p_referencia text, p_nombre text) IS 'Recibe de CeltaTech la corrección de la razón social de una Prestadora. Corrige el nombre visible y nada más: el nombre corto es la dirección web y no se toca, y la descripción la escribe la Prestadora. Se llama únicamente desde la función de borde `alta-y-baja`.';

COMMENT ON FUNCTION public.fijar_estado_de_prestadora(p_id uuid, p_estado text, p_emitido_en timestamp with time zone) IS 'Deja a una Prestadora activa, suspendida o cancelada por orden de CeltaTech. Descarta lo que se emitió antes de lo último aplicado, así que un aviso repetido o llegado tarde no pisa nada. Sólo la llama la función de borde `alta-y-baja`.';

COMMENT ON FUNCTION public.nombre_corto_de(p_nombre text) IS 'Convierte un nombre en el nombre corto que va en la dirección: minúsculas, sin tildes y con guiones. Es determinista a propósito —el mismo nombre da siempre el mismo resultado—, que es lo que hace que repetir un alta no duplique la Prestadora.';

-- ---- El legajo del Asistente ----

COMMENT ON TABLE public.autorizaciones_asistente IS 'Lo que el Asistente autoriza al cerrar el alta. perfil_publicado en false es lo que impide que directorio muestre a alguien que no dio permiso — pendiente 2. Se llamaba banderas_asistente antes del acomodamiento del glosario.';

COMMENT ON COLUMN public.caregivers.zone IS 'Histórica y de sólo lectura desde el 2026-08-31 (pendiente 109). Guarda la zona de los legajos anteriores al día en que la zona dejó de ser un texto suelto. Ninguna pantalla la escribe y el traductor de js/apiClient.js ya no la llena. La zona viva de un legajo está en zonas_asistente, y el texto para mostrar en caregivers.zonas_texto. No se borró porque los datos que tiene son de personas cargadas antes de ese cambio y tres lectores se apoyan en ella para mostrarlos.';

COMMENT ON COLUMN public.caregivers.moneda_valor_hora IS 'En qué moneda está escrito `hourly_rate`, en código ISO 4217. No se lee de `tenants` cada vez a propósito: el día que la Prestadora cambie de moneda, lo ya cargado sigue estando en la vieja hasta que cada persona lo vuelva a escribir. La llena sola el disparador `el_valor_hora_nace_con_su_moneda`.';

COMMENT ON FUNCTION public.el_valor_hora_nace_con_su_moneda() IS 'Le pone al valor por hora la moneda de su Prestadora cuando quien escribe no la trajo, y la borra cuando se borra el importe. Existe para que la regla «todo importe con su moneda» no dependa de que cada pantalla se acuerde.';

COMMENT ON FUNCTION public.el_rol_y_la_prestadora_no_se_escriben_solos() IS 'Sobre `profiles`: desde una sesión, `role` y `tenant_id` no cambian. De esas dos columnas salen `es_personal_de_prestadora()` y `prestadora_actual()`, o sea las políticas de todas las tablas. Cierra el pendiente 82, y no reemplaza al permiso por columna: se suma.';

COMMENT ON INDEX public.idx_caregivers_user_unico IS 'Una cuenta, un legajo. ATENCIÓN: de este índice depende además el aislamiento entre Prestadoras del depósito de archivos. El camino del depósito empieza por la cuenta y no por la Organización, así que la política «Documentos del legajo, para la Prestadora» llega a la carpeta por el legajo: si una cuenta llegara a tener legajo en dos Prestadoras, las dos verían la carpeta entera. Antes de sacarlo hay que mover el camino a <Organización>/<cuenta>/, reescribir las tres políticas del depósito contra public.prestadora_actual() y mudar los archivos ya subidos. Está anotado en el pendiente 115.';

-- ---- El directorio ----

COMMENT ON VIEW public.directorio IS 'Directorio de Asistentes. Tres condiciones, y las tres hacen falta: la Prestadora validó el legajo (verification_status = validado_prestadora); la persona marcó perfil_publicado; y el legajo tiene comprobado cada papel que el vocabulario `verificacion` marca con puerta `publicacion` —los condicionales sólo cuando el tipo de Asistente los exige—. Esa tercera llegó tarde: hasta que se escribió, la vista prometía en este mismo comentario que los papeles de la puerta los habían pasado todos, y no los miraba nadie. Nunca agregar acá una columna con datos personales: ni documento, ni teléfono, ni correo, ni domicilio, ni los caminos del depósito privado. El Desarrollador decidió el 24 de agosto de 2026 que este directorio se ve sin iniciar sesión, así que todo lo que se agregue acá queda a la vista de cualquiera. gender y comprobaciones están acá por decisión suya del 26 de agosto de 2026 (pendiente 43), y el consentimiento de publicación las nombra a las dos: una columna que el consentimiento no nombre no puede salir por acá.';

COMMENT ON COLUMN public.directorio.comprobaciones IS 'Qué se le comprobó a este legajo, de las cinco de ponderacion_comprobacion. Sin fechas y sin números, y sin las de la puerta —documento, antecedentes penales y salud—, que las pasaron de verdad todos los que aparecen acá. Lista vacía cuando no se le comprobó ninguna de las cinco: eso no es un error, es que todavía no se le comprobó ninguna.';

COMMENT ON COLUMN public.directorio.moneda_valor_hora IS 'En qué moneda está el `hourly_rate` de esta fila. Sale del legajo y no de la Prestadora, así que un valor cargado antes de que ella cambiara de moneda sigue diciendo la vieja, que es la verdadera. No es dato personal: es la unidad del número que ya se publicaba al lado.';

-- ---- El aviso de la Familia ----

COMMENT ON COLUMN public.avisos.consultation_reason IS 'Para qué escribe quien escribe. Clave del vocabulario `motivo_consulta`. Antes se guardaba adentro de `pathologies_required`, que es la columna de las patologías, y ya está movido a su lugar.';

COMMENT ON COLUMN public.avisos.familia_id IS 'Quién publicó el aviso. Sale del valor por omisión y nunca del pedido, igual que tenant_id: es lo que hace que nadie pueda publicar a nombre de otro. Los avisos más viejos lo tienen vacío, así que sólo los ve el personal de la Prestadora.';

COMMENT ON TABLE public.franjas_aviso IS 'Cuándo se necesita el cuidado. Una fila por casillero marcado de la grilla de días por turnos que pregunta la Familia. Es la tabla espejo de franjas_asistente: misma forma, mismos vocabularios, para que cruzar la necesidad de una Familia con la disponibilidad de un Asistente sea una consulta y no un recorrido. dia y turno guardan claves de dia_semana y turno, nunca la etiqueta. Lleva el prefijo de la modalidad porque cuelga del aviso, y el aviso sólo existe en esta modalidad.';

COMMENT ON TABLE public.postulaciones IS 'Un Asistente se ofrece a un aviso. Guarda el hecho del contacto y nada del trato: sin tarifa propuesta, sin condiciones y sin aceptación, porque el trato lo cierran la Familia y el Asistente afuera del software (CLAUDE.md §1).';

-- ---- Lo que la Prestadora no mira ----

COMMENT ON TABLE public.clock_ins IS 'La fichada de entrada y salida del Asistente, con su ubicación. La marca él, y la ve él y la Familia del vínculo que haya marcado. El personal de la Prestadora no la ve: mirar la jornada es dirigir el trabajo, y en esta modalidad no lo hace.';

COMMENT ON COLUMN public.clock_ins.conversacion_id IS 'El vínculo con la Familia para la que fue esta jornada, o vacío si el Asistente no lo dijo. Apunta a la conversación, que es el único lugar donde consta que esas dos partes se encontraron: no guarda ningún trato ni ninguna condición.';

COMMENT ON TABLE public.messages IS 'Mensajes colgados de un aviso. Los ve quien los escribió y la Familia que publicó ese aviso; el personal de la Prestadora no, porque la comunicación entre la Familia y el Asistente es la herramienta de ellos y no de ella. Hoy la tabla está vacía y sólo la llama la maqueta: la conversación de verdad vive en mensajes. Su destino se decide en el pendiente 139.';

COMMENT ON TABLE public.reportes IS 'El reporte de cuidado. Lo escribe el Asistente que cuidó y lo lee la Familia de ese aviso. El personal de la Prestadora no lo ve: en la modalidad de este producto la Prestadora no dirige el trabajo. La condición del aviso se repite adentro de la subconsulta a propósito: la RLS de avisos no alcanza para filtrarla, porque a ese personal le devuelve todos los avisos de la Organización.';

-- ---- La Prestadora vista desde CeltaTech ----

COMMENT ON COLUMN public.tenants.status IS 'En qué situación está la Prestadora frente a quien le vendió el software. activo, suspendido o cancelado, y nada más. Quién lo escribe es CeltaTech, a través de la función de borde `alta-y-baja`; adentro del producto sólo lo leen las tres funciones públicas, que exigen `activo`.';

COMMENT ON COLUMN public.tenants.estado_fijado_en IS 'Cuándo se emitió la orden que dejó `status` como está. No es cuándo se aplicó: es la fecha que trae el aviso de CeltaTech. Sirve para una sola cosa, y es descartar lo repetido y lo atrasado.';

COMMENT ON COLUMN public.tenants.referencia_celtatech IS 'Con qué nombre conoce CeltaTech a esta Prestadora. Texto opaco: se guarda tal cual llega y no se interpreta nunca. Es lo único por lo que el alta y las correcciones la reconocen. Nulo en las Prestadoras ficticias, que no vienen de ningún contrato.';

COMMENT ON COLUMN public.tenants.moneda IS 'Con qué moneda trabaja esta Prestadora, en código ISO 4217 y en mayúsculas. La elige ella desde su panel; de fábrica es ARS, que es lo que la pantalla ya venía mostrando sin decirlo. Las opciones salen del vocabulario `moneda`, que es abierto: la Prestadora que necesite otra se la agrega.';

NOTIFY pgrst, 'reload schema';
