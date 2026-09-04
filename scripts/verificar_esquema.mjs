/* ===================================================
   VERIFICA LAS QUINCE REGLAS QUE SE ESCRIBEN EN UNA MIGRACIÓN

       node scripts/verificar_esquema.mjs

   Mira `supabase/migrations/*.sql`. No consulta la base: mira lo que dice cada
   migración, que es lo único que se puede comprobar sin red y antes de un commit.
   Lo que corre hoy en el servidor es otra pregunta y se responde mirando el
   servidor (regla de la empresa «el estado real está por encima del documentado»).

   Las quince:

   1. **Toda tabla nueva enciende su RLS en la misma migración que la crea**
      (regla de la empresa «RLS estricta en toda tabla nueva»). Encenderla después, a mano desde el panel, deja una ventana
      abierta entre las dos cosas, y deja el repositorio diciendo algo que no es.
   2. **Toda función `SECURITY DEFINER` le revoca el permiso a `PUBLIC` y a `anon`
      en la misma migración** (la misma regla). Una función así del esquema `public` es además
      una dirección web, porque PostgREST publica ese esquema: con permiso para
      `anon`, cualquiera con la clave pública la llama sin sesión. Revocarle a
      `PUBLIC` no alcanza: el de `anon` es una concesión aparte. No se mira
      `authenticated`, porque ahí los dos casos son legítimos: la que consumen las
      políticas lo conserva —sin él la aplicación no puede leer sus propias
      tablas— y la que dispara un `trigger` no lo necesita.
   3. **Toda tabla con datos propios de una Organización tiene `prestadora_id` o
      `tenant_id`** (§5.10), aunque hoy siempre valga lo mismo. Es lo que hace que
      la fusión con Careonys sea un update y no una migración. Acá, a diferencia de
      la RLS, no se exige que esté en la misma migración que crea la tabla: la
      regla pide la columna, no el momento, y tres tablas la reciben legítimamente
      en la 0002. Se busca en todas las migraciones juntas, en el cuerpo de la
      creación o en un `alter table … add column` posterior.
   4. **Todo importe se guarda con su moneda** (§5.11). Un número solo, leído un
      año después, no se sabe cuánto vale.
   5. **Toda tabla tiene clave primaria `uuid`** (§5.10). Es la otra mitad de la
      «toda tabla nace con clave uuid y con la columna de su Organización», y es del mismo motivo: dos bases que se fusionan con claves
      correlativas chocan en el número 1, y hay que reasignarlas todas junto con
      cada referencia que las apunta. Con UUID no chocan. La clave se busca donde
      esté declarada —adentro del `create table` o en un `alter table … add
      constraint … primary key` posterior, que es como la declara la 0001—.
   6. **Toda siembra que recorre las Prestadoras que existen hoy deja además un
      disparador sobre `tenants`**, para las que vengan mañana. Un
      `insert … select … from public.tenants` sin acotar corre una sola vez, sobre
      las que había ese día, y toda Prestadora nacida después arranca sin eso. Ya
      pasó: la 0018 sembró de fábrica el puntaje, y `cuidarsur`, nacida en la 0035,
      tenía cero (pendiente 97, cerrado por la 0046). El disparador no tiene que
      estar en la misma migración que la siembra —el arreglo llega después, como
      llegó acá—, pero tiene que estar en alguna.
   7. **Toda política sobre `storage.objects` nombra la Organización en su
      condición** (regla de la empresa «los archivos se guardan privados por
      defecto… la ruta empieza por la Organización, y la política lo exige»).
      Es la única política que este chequeo lee, y por un motivo: en una tabla,
      si la política se equivoca, todavía queda la columna de Organización a la
      vista y el resto de las reglas la miran. En el depósito de archivos no hay
      columna que mirar —el camino es una cadena de texto—, así que **la
      condición es lo único que separa a una Prestadora de otra**. Cuando no la
      nombra, el aislamiento lo está sosteniendo alguna otra cosa, en algún otro
      archivo, y nadie lo dice. Por eso la exención pide dos cosas y no una: el
      motivo, y **qué lo sostiene en su lugar**.
   8. **La Organización se resuelve por la membresía de quien inició sesión, y
      nunca por un valor que venga en el pedido** (regla de la empresa «la
      política resuelve la Organización por la membresía verificada de quien
      inició sesión, nunca por un valor que venga en el pedido —encabezado,
      subdominio, parámetro—: esas fuentes las falsifica quien llama»). Quien
      llama arma el pedido entero, así que una condición que lea
      `current_setting('request.headers')`, `request.jwt.claims` o
      `auth.jwt()` está preguntándole al que quiere entrar de qué Organización
      es. `auth.jwt()` entra en la lista aunque el token venga firmado: adentro
      viaja `user_metadata`, que en Supabase lo escribe la propia cuenta.
      Resolverla por membresía es lo que hace `public.prestadora_actual()`
      (`supabase/migrations/0002_aislamiento_por_prestadora.sql:34`), que va a
      buscar el `tenant_id` a `profiles` por `auth.uid()`. Su comentario ya
      decía «sale de su membresía, nunca del pedido»
      (`supabase/migrations/0002_aislamiento_por_prestadora.sql:48`); esta regla
      es lo que hace que eso siga siendo cierto.

      **Esta regla no tiene lista de exenciones, y es a propósito.** Hoy no hay
      un solo caso en las migraciones, así que la lista nacería vacía, y una
      lista vacía no la puede probar `scripts/probar_exenciones.mjs`: vaciar lo
      que ya está vacío no pone rojo a nadie. Sería una exención sin guarda, que
      es la enfermedad que este proyecto ya se pasó dos noches persiguiendo. El
      día que aparezca un caso legítimo se crea la lista **con ese caso adentro**,
      y ahí sí la prueba la alcanza.
   9. **Ningún permiso de tabla le da `all` ni `truncate` a `anon` ni a
      `authenticated`** (regla de la empresa «mínimo privilegio siempre»). Es
      el agujero que encontró y cerró la 0032, escrito ahí con todas las
      letras: «`TRUNCATE`, que no mira ninguna política. La RLS filtra filas;
      vaciar la tabla no es filtrar filas. Cualquiera con sesión iniciada podía
      vaciar cualquiera de las diecisiete tablas. Es el agujero de verdad»
      (`supabase/migrations/0032_los_permisos_de_tabla_al_minimo.sql:16`). Un
      `grant all` sobre una tabla concede además `REFERENCES` y `TRIGGER`, que
      ninguna pantalla usa y que PostgREST no sabe pedir. Los verbos se escriben
      uno por uno.

      **La regla empieza en la 0032 y no antes.** La 0001 es el volcado que dejó
      la instalación, con veintiún `GRANT ALL` que son justamente lo que la 0032
      vino a sacar; una migración aplicada no se edita, así que ponerle rojo a la
      historia sólo enseñaría a apagar el chequeo. El límite no es una exención:
      es la migración que cerró la puerta, y desde ella la regla rige entera.
      `service_role` queda afuera porque es la llave del servidor y tiene que
      poder todo, tal como lo dejó dicho la 0032.
  10. **Toda migración que cambia el esquema termina con
      `NOTIFY pgrst, 'reload schema';`** (regla de la empresa «todo cambio de
      esquema termina con `NOTIFY pgrst, 'reload schema';`. Sin eso PostgREST
      puede devolver 404 en tablas que sí existen»). PostgREST no lee la base
      en cada pedido: guarda una copia de qué tablas, qué columnas y qué
      funciones hay, y a quién le tocan. Una migración que agrega algo y no
      avisa deja esa copia vieja, y entonces la pantalla pide una tabla que
      **está creada** y recibe un 404. El error apunta al lugar equivocado: se
      sale a buscar un permiso o una política, y lo que falta es un aviso.

      **Va al final, y eso no es prolijidad.** El aviso manda recargar lo que
      hay en ese momento: lo que se escriba después queda afuera de esa
      recarga, así que un aviso en el medio deja el mismo agujero que no
      ponerlo, y encima parece puesto.

      Sembrar filas no es cambiar el esquema, y por eso un `insert` solo no
      pide aviso: PostgREST no guarda filas. Ocho migraciones avisan sin
      cambiar nada —la 0027, la 0028, la 0030, la 0031, la 0039, la 0040, la
      0042 y la 0045— y eso no molesta a nadie: recargar de más no rompe.
      Lo que rompe es no recargar.

      **La regla empieza en la 0025 y no antes**, por el mismo motivo que la
      novena empieza en la 0032. Veintiuna de las veinticuatro primeras
      cambian el esquema y ninguna avisa; están aplicadas hace tiempo y una
      migración aplicada no se edita jamás, así que ponerles rojo sólo
      enseñaría a apagar el chequeo. El límite no es una exención de
      veintiuna filas: es el renglón donde la regla empezó a cumplirse, y
      desde ahí rige entera, con las quince que cambian el esquema en verde.
      Y no se puede esquivar sin querer, porque una migración nueva siempre
      lleva un número más alto.

      **Esta regla tampoco tiene lista de exenciones**, por lo mismo que la
      octava: hoy no hay ningún caso, y una lista vacía no la puede probar
      `scripts/probar_exenciones.mjs`.

  11. **Toda política que deja escribir nombra la Organización en la condición
      que gobierna la fila que queda escrita** (regla de la empresa
      «aislamiento entre Organizaciones», que es de la que dependen todas las
      demás). La octava mira de dónde sale la Organización; ésta mira algo
      distinto y más callado: que se la pida al escribir, y no sólo al leer.

      **Las dos condiciones de una política no son la misma.** El `using` dice
      qué filas puedo tocar; el `with check` dice cómo puede quedar la fila
      después de que la toque. Una política que pide la Organización en el
      `using` y no en el `with check` deja entrar y deja **mudar**: la fila era
      mía, la guardo con la Prestadora de al lado y ya no es de nadie de acá.
      Nada de eso se ve leyendo, porque leer sigue andando bien.

      Cuando el `with check` no está escrito, Postgres usa el `using` para las
      dos cosas, así que la regla mira el `using`: no escribirlo no es un
      agujero, escribirlo más flojo sí. Hoy hay dos políticas así y las dos
      quedan en verde por el `using` que heredan.

      **Un `with check` más angosto que su `using` es legítimo y no se juzga.**
      Dos de la 0020 lo son a propósito: se puede *leer* un mensaje del aviso en
      el que uno participa y no se puede *escribirlo* como si fuera de otro. Por
      eso la regla no compara las dos condiciones —eso daría rojo en las dos—,
      sino que le pide a la que gobierna la fila nueva una sola cosa: que nombre
      la Organización. Las dos de la 0020 la nombran en las dos.

      **Las políticas dadas de baja no se juzgan, y eso no es un límite
      escrito.** Siete de la 0001 escriben `with check (true)`, que es el
      agujero entero; las siete las da de baja la 0002 por su nombre. En vez de
      una migración de corte como la novena y la décima, la regla mira si
      alguna migración posterior la borra, y a la que sigue en pie la juzga
      aunque sea de la 0001. Es más angosto que un límite: si alguien vuelve a
      crear mañana una de esas siete con el mismo nombre, esta vez se juzga.

      **Las que crea un bucle también se juzgan.** La 0005 y la 0012 escriben
      cuatro políticas adentro de un `execute format`, una por cada tabla de un
      arreglo. El texto del `create policy` está ahí, entero, y lo único que
      falta es el nombre de la tabla, que llega como `%I`; la regla lo lee
      igual y, cuando alguna de ésas falla, lo dice así en vez de inventar un
      nombre de tabla. Lo que no vería es un `create policy` armado a pedazos
      desde variables, y hoy no hay ninguno.

      Las del depósito de archivos son de la séptima y no se juzgan dos veces:
      ahí no hay columna de Organización y se miden con otra vara.

      **La única exención se comprueba en vez de creerse.** `profiles` es la
      tabla que **define** la Organización de cada persona —`prestadora_actual()`
      la lee para contestarle a todas las demás políticas—, así que una política
      suya que preguntara `prestadora_actual()` se estaría preguntando a sí
      misma. Lo que impide mudarse de Prestadora, o hacerse `coordinador`, no es
      su política: es el **permiso por columna**, `grant update (full_name)` y
      nada más. Y como eso es lo único que la sostiene, el chequeo va y lo mira:
      un permiso de escritura sobre esa tabla que no nombre sus columnas da rojo.
      No es una precaución teórica —la 0032 sacó ese permiso sin querer y la
      0033 tuvo que devolverlo—, y era lo único de todo el archivo que no
      miraba nadie.

  12. **La Organización se resuelve en un solo lugar** (regla de la empresa
      «cuando la plataforma no deja compartir código, el punto único de verdad
      es una función SQL reutilizada por todas las políticas, nunca la misma
      condición copiada política por política»). En Postgres una política no
      puede llamar a otra ni heredar de ninguna: la única manera de no repetir
      la condición es que todas le pregunten a la misma función. Acá esa función
      es `public.prestadora_actual()`.

      **Por qué importa, si la copia contesta lo mismo hoy.** Porque contesta lo
      mismo *hoy*. El día que la función aprenda algo —que la membresía tenga
      que estar activa, que una sesión de soporte no cuente, que una persona
      dada de baja deje de ver— la copia sigue contestando lo de antes. Y no lo
      nota nadie, porque leer sigue funcionando igual: lo que cambia es a quién
      se le sigue dejando entrar. Es la misma forma de todas las reglas de este
      archivo, la que no se ve mientras anda.

      La regla mira dos lugares. Adentro de una política, que toda comparación
      contra la columna de la Organización se conteste llamando a la función y
      no rehaciendo la cuenta con un `select` o un `auth.uid()`. Y afuera, que
      ninguna otra función deduzca la Organización sacándola de una tabla por
      quien inició sesión: una segunda función que lo hiciera sería la misma
      copia, escondida un piso más abajo y más difícil de ver.

      **La única que tiene derecho a deducirla no es una exención con otro
      nombre.** `LA_RESUELVE` no está en un `Map` de exenciones porque no
      perdona nada: nombra el punto único de verdad que la regla existe para
      proteger. Si mañana la resolviera otra función, lo que cambia es ese
      renglón, y la regla sigue diciendo exactamente lo mismo —una sola—, que
      es justo lo contrario de lo que hace una lista de exenciones, que crece.

      **Sólo lo que está pegado a la comparación.** Del lado derecho del `=` se
      mira hasta el primer `and` o el primer `or`, porque lo que viene después
      ya es otra condición: una política puede tener un `exists (select …)`
      legítimo —comprobar que quien pregunta participa del aviso— sin que eso
      tenga nada que ver con cómo resolvió la Organización.

  13. **Lo que ya está guardado no se renombra** (regla de la empresa «lo que
      se guarda para siempre se nombra por lo que hace, y no se renombra»). Son
      tres capas y no se mezclan: lo **visible** puede cambiar cuando cambia la
      marca; lo **guardado** —tablas, columnas, claves, prefijos de archivo— se
      nombra por su función y no cambia nunca; y lo **histórico** ya quedó
      escrito y no se toca. Un renombre las mezcla y convierte un cambio de
      nombre en una migración de datos.

      **El costo no se paga una vez.** El nombre viejo no se va: queda en los
      datos de antes, en toda migración anterior —que no se puede editar— y en
      los chequeos, que a partir de ahí tienen que seguirle el hilo.
      `nombreDeHoy()` está en este mismo archivo por eso, y va a seguir estando
      aunque no se renombre nada más. Cuando el nombre de hoy quedó mal, la
      salida es agregar lo nuevo y dejar de escribir lo viejo.

      **Las políticas entran también.** Acá cada una se vuelve a crear con un
      `drop policy if exists` que la busca por el nombre: una renombrada deja
      esos drops apuntando a nada, y la undécima y la duodécima la dan por viva
      cuando ya no lo está.

      Rige **desde la 0023**. Los renombres que hay son todos del mismo
      acomodamiento del glosario, cerrado entre el 24 y el 25 de agosto de 2026
      y terminado en la 0022, cuyo encabezado dice por qué salía barato: «la
      base todavía no tiene datos reales». Es una fecha, no una lista de
      perdones, y del otro lado no hay ninguno.

  14. **La migración entra entera o no entra** (regla de la empresa «toda
      migración corre entera o no corre, sin dejar la base a mitad de camino»).
      Una base a mitad de camino no avisa: queda andando, con una parte de los
      cambios puestos y la otra no, y el archivo que los escribió dice que se
      aplicaron. Reconstruir ese estado después es un trabajo aparte —que es
      justo el motivo por el que la regla existe—.

      Son dos maneras distintas de romperla y avisan cosas distintas. Un
      `commit`, un `rollback` o un `begin` **cortan la transacción que envuelve
      a la migración**: lo que está arriba del corte queda aplicado aunque lo de
      abajo falle. Y un `create index concurrently`, un `vacuum` o un `alter
      system` **no pueden correr adentro de una transacción**, y cada migración
      corre adentro de una: eso no falla al escribirlo, falla el día que se
      aplica, y falla siempre.

      El `begin` de una función plpgsql no cuenta, y no hace falta blanquear los
      cuerpos para distinguirlo: ése viene seguido de un renglón nuevo y éste
      pide el `;` o la palabra pegada. Hay un caso en el banco de pruebas que lo
      comprueba, para que la distinción no dependa de que alguien la recuerde.

  15. **Quien llega sin sesión entra por la puerta de una Prestadora, o no
      entra** (regla de los dos productos «no hay lista de Prestadoras ni listado
      suelto… no existe ningún listado que no sea de una Prestadora», decidida el
      2026-08-25). Son dos mitades y hasta hoy no miraba ninguna nadie.

      **15 a. A `anon` no le queda ningún permiso neto sobre una tabla ni una
      vista de `public`.** «Neto» es la palabra que importa, y es lo que hace que
      esta mitad no se pueda juzgar archivo por archivo: la 0002, la 0007, la
      0012 y la 0017 le conceden `select` a `anon` sobre la misma vista y las
      cuatro están bien, porque la 0021 se lo revocó —y la 0032 otra vez—. Mirando
      una sola migración, esas cuatro saldrían en rojo para siempre por algo que
      ya no está. Así que `alcanceAnonimo()` corre todas en orden y se queda con lo
      que sobrevive, siguiendo los renombres y los `drop`; la falla se informa en
      el renglón **donde se concedió** el permiso, que es donde hay que ir a
      sacarlo. Y `PUBLIC` cuenta como sin sesión, porque `anon` hereda de él.

      El seguimiento del renombre no es prolijidad. Sin él este mismo cálculo
      decía que `caregivers_publicos` seguía abierta desde la 0012, cuando la 0015
      la había renombrado a `directorio` y los dos `revoke` estaban escritos
      con el nombre nuevo. Un renombre no es un `revoke`: el permiso viaja con el
      objeto, no con el nombre. La base publicada lo dice de frente y hay que
      saber leerlo: contesta `PGRST205` —«no existe»— al nombre viejo y `42501`
      —«sin permiso»— al nuevo, que son dos hechos distintos.

      **Y la vista que se abre a propósito se nombra, y lo que la sostiene se
      comprueba.** `VISTAS_AL_ALCANCE_ANONIMO` es esa lista, y hoy tiene una sola
      entrada: la oferta general de cursos, que el Desarrollador decidió publicar
      el 31 de agosto de 2026. Una vista abierta a `anon` es una dirección web sin
      puerta, así que lo único que la separa de ser un listado suelto es la
      condición que lleva escrita adentro —y ésa no vive en ninguna política: vive
      en el cuerpo de la vista—. Por eso acá no alcanza con escribir el motivo,
      igual que en la undécima con `profiles`: la regla va y mira que el cuerpo
      siga acotando a las filas generales del producto —`tenant_id is null`—, que
      no lo haya vuelto opcional con la misma disyunción que prohíbe la 15 b, y
      que el permiso que sobrevive sea `select` y ninguno más. El día que alguien
      le saque la condición a la vista, la exención deja de valer sola.

      **15 b. Y la función que sí abre esa puerta exige de verdad el nombre
      corto.** Cinco de las seis exenciones de `AL_ALCANCE_ANONIMO` lo afirman en
      su motivo —«exige el nombre corto», «la que nombra el argumento»— y eso era
      prosa: nadie iba a mirar si seguía siendo cierto. Ahora se le piden tres
      cosas a cada una: que el primer parámetro sea un `text` con nombre, que el
      cuerpo lo compare contra `slug`, y que el cuerpo **no** escriba `<parámetro>
      is null or`. Es la misma forma de la undécima bis, «lo que sostiene a una
      exenta se comprueba, no se cree».

      Lo tercero merece su renglón, porque la trampa está al revés de lo que
      parece. `vocabularios_de` y `guias_de` reciben el nombre corto con `default
      null` y escriben `p_slug is not null and t.slug = p_slug`. Ese `is not null`
      **no protege nada**: `t.slug = null` no da falso, da nulo, y no coincide con
      ninguna fila igual. Exigirlo hubiera sido una regla que no puede fallar. Lo
      que sí convierte la puerta de una Prestadora en el listado de todas es la
      disyunción —`p_slug is null or t.slug = p_slug`—, una palabra de distancia,
      y eso es lo que la regla prohíbe.

   Las cuentas de cuántas tablas y cuántas funciones hay no se escriben acá: las
   dice el renglón verde al terminar, que sale de contar los archivos. Un número
   escrito a mano en un encabezado queda viejo el día que se agrega una
   migración, y nadie vuelve a leerlo. La regla de la moneda tiene hoy un
   incumplimiento, anotado abajo con su motivo y su pendiente: el chequeo no lo
   tapa, lo deja a la vista y evita que entre uno nuevo.

   Qué NO mira, dicho de frente:
   - No sabe si la migración se aplicó. Un archivo acá describe lo que se quiso
     aplicar, no lo que corre.
   - De las tablas no lee la política, sólo que la RLS esté encendida. Una
     política mal escrita con la RLS encendida pasa igual. Las del depósito de
     archivos sí se leen, y de ellas se mira una sola cosa: si nombran la
     Organización. Que la nombre no quiere decir que la use bien.
   - De la octava regla mira de dónde **no** puede salir la Organización, no que
     salga bien. Una política que llame a `prestadora_actual()` y después la
     ignore pasa igual.
   - De la novena mira lo que **abre de más**, no lo que abre de menos. Que una
     tabla nueva se olvide de conceder sus permisos no se avisa: desde la 0032
     nace sin ninguno, así que falla cerrada —`42501` en la pantalla— y ésa es la
     dirección segura. Además hay casos legítimos, como una tabla que sólo tocan
     funciones `security definer`. Lo que no tiene caso legítimo es `truncate`,
     que se salta la RLS entera.
   - Un importe se reconoce por el nombre de la columna. Una que se llame de otra
     manera no se detecta; hoy la única del esquema es `caregivers.hourly_rate`.
   - De la clave primaria mira el tipo, no que sea una sola columna. Una clave
     compuesta de dos `uuid` pasaría, y hoy no hay ninguna.
   - De la siembra sigue **un solo salto** de llamadas: la función del disparador,
     y las funciones que ésa nombra. Una cadena de tres no la sigue, y hoy no hay
     ninguna. Tampoco sabe si el disparador siembra lo mismo que sembró la
     migración: sabe que escribe en esa tabla.
   - De la décima no sabe si el aviso hizo falta de verdad: reconoce el cambio de
     esquema por cómo empieza la sentencia, no por lo que PostgREST guarde. Una
     migración que avise sin necesitarlo pasa, y así tiene que ser.
   - De la undécima mira que la Organización **esté nombrada** en la condición
     que gobierna la fila nueva, no que esté bien usada. Una política que la
     nombre y después la ignore pasa igual, lo mismo que en la octava. Y no
     compara el `with check` con el `using`: uno más angosto es legítimo.
   - De la duodécima mira **cómo se resuelve** la Organización, no si el
     resultado es el correcto. Una política que le pregunte a la función y
     después la ignore pasa igual, lo mismo que en la octava y en la undécima. Y
     no sabe si dos funciones distintas contestan lo mismo: reconoce la forma de
     la deducción —sacar la columna de una tabla por quien inició sesión—, no su
     resultado.
   - De la decimocuarta mira las formas conocidas de cortar la transacción o de
     quedarse afuera de ella, no si la migración es correcta adentro de la suya.
     Un `alter type … add value` tampoco entra: desde PostgreSQL 12 corre adentro
     de una transacción, lo que no se puede es **usar** el valor nuevo en esa
     misma, y eso ya es otra cosa.
   - De la decimotercera mira las sentencias que renombran, no si dos nombres
     quieren decir lo mismo. Borrar una tabla y crear otra parecida al lado no
     lo ve nadie, y está bien: eso no arrastra ningún nombre viejo adentro de
     los datos, que es justo lo que la regla viene a evitar.
   - De la decimoquinta, la primera mitad mira los permisos de tabla y de vista,
     no los de función: para ésas está la segunda regla, con su lista de exentas.
     Y la segunda mitad mira la forma de la puerta —que el nombre corto esté,
     que se compare, que el nulo no abra—, no que lo que devuelve sea de esa
     Prestadora. Una función que compare el `slug` en un rincón y después
     devuelva otra cosa pasa igual, lo mismo que en la octava y en la undécima.
   - Y no consulta la base: si alguien concedió un permiso a mano contra el
     servidor, ninguna migración lo dice y este cálculo no lo ve. Eso se pregunta
     desde afuera, y lo hace `scripts/probar_permisos_en_vivo.mjs`.
   - Una siembra acotada a una Prestadora por su nombre corto no es un barrido y
     no se mira. Es lo que hacen las migraciones de datos ficticios.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'supabase', 'migrations');

/* Tablas que no llevan columna de Organización, con el motivo escrito al lado.
   Una exención sin motivo es una excepción que nadie va a poder revisar después. */
const SIN_ORGANIZACION = new Map([
  ['tenants',
   'es la Organización: su propio identificador es el que las demás tablas copian'],
  ['patrones_de_contacto',
   'guarda las reglas de la tercera puerta, que son del producto y no de ninguna ' +
   'Prestadora: si una pudiera aflojarlas, la puerta dejaría de estar cerrada para todos, ' +
   'porque a cualquiera le alcanza con abrirse una conversación en esa Prestadora. No hay ' +
   'dos Organizaciones que separar ahí adentro, y por eso mismo está además en ' +
   'TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO, que va y mira que siga sin la columna; ' +
   'migración 0063']
]);

/* Funciones SECURITY DEFINER que conservan a propósito el permiso del rol
   anónimo, con el motivo escrito. Es la excepción más cara del archivo y por eso
   se nombra una por una: cualquier otra función así es un descuido, y el chequeo
   la tiene que encontrar.

   **Y es la única lista.** `scripts/probar_permisos_en_vivo.mjs` la importa de
   acá en vez de tener la suya: tenía una copia con tres, y cuando las
   migraciones 0035, 0038 y 0041 abrieron tres puertas más —con su motivo
   escrito, acá— aquella prueba se puso en rojo y así se quedó. Una lista
   repetida se despega, y la que se despega es siempre la que nadie mira. */
export const AL_ALCANCE_ANONIMO = new Map([
  ['prestadora_por_slug',
   'la pantalla de ingreso tiene que saber qué nombre y qué colores mostrar antes de que ' +
   'exista ninguna sesión; devuelve una sola Prestadora, la que nombra el argumento, y ' +
   'sólo sus columnas de marca; migración 0021'],
  ['directorio_de',
   'el directorio se ve sin cuenta por decisión del 24 de agosto de 2026, así que la ' +
   'puerta se abre sin sesión o no hay directorio; no devuelve ni una columna que la ' +
   'vista `directorio` no publicara ya, y esa vista no tiene datos de contacto; ' +
   'migración 0021'],
  ['perfil_del_directorio',
   'la misma puerta, para una sola persona; migración 0021'],
  ['zonas_de',
   'quien completa el formulario de reclutamiento todavía no tiene cuenta y necesita ver ' +
   'la lista de zonas para tildar las suyas; exige el nombre corto, así que devuelve las de ' +
   'una sola Prestadora, y sólo el nombre y el orden de cada zona, que es lo mismo que ya ' +
   'muestra el formulario; migración 0035'],
  ['vocabularios_de',
   'las listas de opciones las piden pantallas que se ven sin cuenta —el directorio y el ' +
   'formulario de reclutamiento—, así que la puerta se abre sin sesión o esas pantallas ' +
   'quedan sin opciones; exige el nombre corto, devuelve el catálogo general del producto ' +
   'más lo que agregó esa sola Prestadora, y ninguna de las dos cosas es dato de una ' +
   'persona: son las opciones que la pantalla iba a mostrar igual; migración 0038'],
  ['guias_de',
   'la guía la lee el Asistente en el domicilio, donde la aplicación puede estar mostrando ' +
   'la pantalla antes de resolver la sesión, así que cuelga de la misma puerta que el ' +
   'catálogo del que depende; exige el nombre corto, devuelve la guía general del producto ' +
   'más la que escribió esa sola Prestadora, y sólo las publicadas; ninguna es dato de una ' +
   'persona: son textos sobre una patología, nunca sobre un Paciente; migración 0041']
]);

/* Vistas de `public` que a propósito se ven sin sesión, con el motivo **y con
   qué acota lo que publican**. Es la otra mitad de la decimoquinta regla, y la
   segunda parte no es adorno: una vista abierta a `anon` es una dirección web
   sin puerta, así que lo único que la separa de ser un listado suelto es la
   condición que lleva escrita adentro. Por eso acá no alcanza con decirlo: la
   regla va y mira que esa condición siga estando, igual que la undécima va a
   mirar el permiso por columna de `profiles`.

   **Y es la única lista**, por lo mismo que `AL_ALCANCE_ANONIMO`:
   `scripts/probar_permisos_en_vivo.mjs` la importa de acá en vez de tener la
   suya, que era un `Set` vacío guardado para el día que se decidiera abrir una.
   Ese día llegó el 31 de agosto de 2026. */
export const VISTAS_AL_ALCANCE_ANONIMO = new Map([
  ['oferta_de_cursos',
   'el Desarrollador decidió el 31 de agosto de 2026 que «la oferta de cursos, no el ' +
   'contenido de los mismos, se hará disponible», y `cursos.html` es una pantalla que se ' +
   've sin cuenta, así que la vista se abre sin sesión o esa pantalla no tiene qué ' +
   'mostrar. No es un listado suelto: su cuerpo la acota a la oferta general del producto ' +
   '—`tenant_id is null`— y a las publicadas, así que no sale por ahí ni un curso de una ' +
   'Prestadora ni el nombre de ninguna. Y no publica una sola columna del contenido del ' +
   'curso: ni evaluaciones, ni preguntas, ni opciones, que se siguen pidiendo con sesión; ' +
   'migración 0051'],
  ['oferta_comercial_publica',
   'la oferta comercial de la portada —Busco Asistente, Cursos, Monitoreo y el resto de ' +
   '`data-oferta="servicios"`— la dibujan `index.html` y `solicitar-asistente.html`, dos ' +
   'pantallas que se ven sin cuenta, así que la vista se abre sin sesión o esas pantallas ' +
   'no tienen qué mostrar. No es un listado suelto: su cuerpo la acota a la oferta general ' +
   'del producto —`tenant_id is null`— y a las activas, así que no sale por ahí ni un ' +
   'ítem propio de una Prestadora ni el nombre de ninguna; migración 0072']
]);

/* Tablas de `public` que a propósito se leen sin sesión porque **no guardan
   datos de nadie**: guardan reglas del producto, iguales para todas las
   Prestadoras. La decimoquinta regla existe contra el listado suelto —publicar
   filas de clientes, y de paso quiénes son los clientes—, y una tabla sin
   columna de Organización no tiene ninguna fila de ningún cliente que publicar.

   **Y no alcanza con decirlo**, igual que con las vistas: lo que sostiene esta
   exención es que la tabla siga sin columna de Organización, así que la regla va
   y lo mira. El día que alguien le agregue `tenant_id` —para que una Prestadora
   pueda tener sus propias reglas, por ejemplo—, la exención deja de valer sola y
   el chequeo se pone rojo, que es exactamente cuando hay que volver a pensarlo.

   Va aparte de `VISTAS_AL_ALCANCE_ANONIMO` a propósito: lo que sostiene a una
   vista es la condición escrita en su cuerpo, y lo que sostiene a una tabla es
   no tener a quién aislar. Son dos cosas distintas y se comprueban distinto. */
export const TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO = new Map([
  ['patrones_de_contacto',
   'son las expresiones con las que se reconoce un teléfono, un correo o un domicilio ' +
   'adentro del chat, y no son de ninguna Prestadora: la tercera puerta es del producto, ' +
   'así que la tabla nace sin columna de Organización a propósito —si una Prestadora ' +
   'pudiera aflojarla, la puerta dejaría de estar cerrada para todos—. No hay nada de ' +
   'nadie ahí adentro que publicar, y lo que sí hay ya viaja igual al navegador en ' +
   '`data/patrones-contacto.json`, que el sitio le sirve a cualquiera. Se abre sin sesión ' +
   'para que `scripts/verificar_patrones_contacto.mjs` pueda comparar el archivo contra ' +
   'la tabla sin ninguna credencial: sin eso la copia se despega en silencio, que es lo ' +
   'que ese chequeo viene a evitar; migración 0063']
]);

/* Políticas del depósito de archivos que no nombran la Organización, con el
   motivo **y con qué sostiene el aislamiento en su lugar**. Esa segunda mitad no
   es adorno: una política del depósito que no nombra la Organización siempre
   está apoyada en algo que está en otro archivo, y lo que no se escribe acá no
   se entera nadie el día que ese algo cambie. */
const SIN_ORGANIZACION_EN_EL_DEPOSITO = new Map([
  ['Documentos del legajo, los propios',
   'la condición compara la primera carpeta del camino contra `auth.uid()`, así que ' +
   'cada cuenta llega a la suya y a ninguna otra; no hay dos Organizaciones adentro de ' +
   'esa condición que separar. Lo que las separa está en otro lado: **una cuenta tiene ' +
   'un solo legajo**, por el índice único `idx_caregivers_user_unico` de la migración ' +
   '0005. La política que deja mirar al personal de la Prestadora llega a la carpeta ' +
   'por ese legajo, y si una misma cuenta llegara a tener legajo en dos Prestadoras, ' +
   'las dos verían la carpeta entera, con los papeles que la persona subió para la otra'],
  ['Avatar propio',
   'la misma condición y el mismo apoyo, sobre el depósito `avatares`, que además es ' +
   'público a propósito desde la 0006: la foto es lo que el directorio muestra sin ' +
   'cuenta, así que ahí no hay nada que aislar hacia afuera. Lo que la condición cuida ' +
   'es la escritura: que nadie deje una foto en la carpeta de otro']
]);

/* Políticas de escritura que no pueden nombrar la Organización, con el motivo
   **y con qué la sostiene en su lugar**. Igual que en el depósito de archivos:
   lo que no se escribe acá no existe. Y acá esa segunda mitad además **se
   comprueba**: no alcanza con decir que el permiso por columna la sostiene, la
   undécima regla va y mira que ese permiso siga nombrando sus columnas. */
const SIN_ORGANIZACION_AL_ESCRIBIR = new Map([
  ['Su propio perfil, de escritura',
   { tabla: 'profiles',
     motivo:
       '`profiles` es la tabla que define la Organización de cada persona: ' +
       '`prestadora_actual()` la lee para contestarle a todas las demás políticas, ' +
       'así que una política suya que la preguntara se estaría preguntando a sí ' +
       'misma. Lo que impide mudarse de Prestadora, o hacerse `coordinador`, es el ' +
       'permiso por columna: `grant update (full_name)` y nada más ' +
       '(0005_acceso_por_sesion.sql:160, que la 0032 sacó sin querer y la ' +
       '0033_vuelve_el_permiso_por_columna_del_perfil.sql:36 devolvió). Eso no se ' +
       'cree: se comprueba acá mismo.' }]
]);

/* Importes que hoy se guardan sin moneda, con su motivo y su pendiente. */
const SIN_MONEDA = new Map([
  ['caregivers.hourly_rate',
   'único importe del esquema; agregarle la moneda toca una columna ya escrita, ' +
   'así que lo decide el Desarrollador; pendiente 51']
]);

const TABLA = /create\s+table\s+(?:if\s+not\s+exists\s+)?"?public"?\."?([a-z_]+)"?\s*\(/gi;
const FUNCION = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_]+)\s*\(/gi;
const PLATA = /(price|precio|rate|tarifa|monto|importe|honorario|cobro|salario|remuneracion|pago|fee|amount)/i;
const NUMERO = /\b(numeric|decimal|money|integer|bigint|real|double\s+precision|smallint)\b/i;
const MONEDA = /(moneda|currency)/i;
const NO_ES_COLUMNA = /^(primary|unique|constraint|foreign|check|--)/i;
const CLAVE_APARTE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?"?public"?\."?([a-z_]+)"?[^;]*add\s+constraint[^;]*primary\s+key\s*\(\s*"?([a-z_]+)"?/gi;
const AGREGA_ORGANIZACION =
  /alter\s+table\s+(?:if\s+exists\s+)?"?public"?\."?([a-z_]+)"?[^;]*add\s+column[^;]*\b(?:prestadora_id|tenant_id)\b/gi;
/* Para la sexta. Un `insert` que sale de recorrer `tenants`, el `create trigger`
   colgado de esa misma tabla, y el `rename to` que le cambia el nombre a una
   tabla en el medio —la 0022 renombró justo una de las dos que siembra la 0018,
   y sin esto la sexta regla buscaría un nombre que ya no existe—. */
const INSERTA = /insert\s+into\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi;
const POLITICA_DEPOSITO = /create\s+policy\s+"([^"]+)"\s+on\s+storage\.objects/gi;
/* La migración que revocó los permisos por omisión. Desde ella rige la novena
   regla; antes está el volcado de la instalación, que es lo que ella vino a
   sacar y que ya no se puede editar. */
const LA_PUERTA_SE_CERRO = '0032';
/* Un cambio de esquema es lo que PostgREST guarda en su copia: qué tablas, qué
   columnas, qué funciones hay y quién puede tocarlas. Los `insert` quedan
   afuera a propósito —sembrar filas no cambia nada de eso—. */
const CAMBIA_EL_ESQUEMA =
  /^[ \t]*(?:create|alter|drop)\s+(?:or\s+replace\s+)?(?:table|function|policy|type|index|view|trigger|schema|sequence|extension|domain|publication|materialized)\b|^[ \t]*(?:grant|revoke)\b|^[ \t]*comment\s+on\b/im;
const AVISA_A_POSTGREST = /^\s*notify\s+pgrst\s*,\s*'reload schema'\s*;\s*$/i;
const EL_AVISO_EMPIEZA = '0025';
const GRANT_DE_TABLA =
  /grant\s+([a-z][a-z0-9_,\s()]*?)\s+on\s+(?:table\s+)?"?public"?\."?([a-z_]+)"?\s+to\s+([a-z_,\s"]+)/gi;
const ABRE_DE_MAS = /\ball\b|\btruncate\b/i;
/* Para la decimotercera. Todo lo que le cambia el nombre a algo ya guardado.
   Las políticas entran a propósito: acá cada una se vuelve a crear con un
   `drop policy if exists` que la busca por el nombre, así que una renombrada
   deja esos drops apuntando a nada, y de paso la undécima y la duodécima la
   dan por viva cuando ya no lo está. */
const RENOMBRA_LO_GUARDADO = [
  ['una tabla', /alter\s+table\s+(?:if\s+exists\s+)?\S+\s+rename\s+to\s+/gi],
  ['una columna', /alter\s+table\s+(?:if\s+exists\s+)?[\s\S]{0,80}?\brename\s+column\s+/gi],
  ['una restricción', /\brename\s+constraint\s+/gi],
  ['un índice', /alter\s+index\s+[\s\S]{0,60}?\brename\s+to\s+/gi],
  ['una vista', /alter\s+(?:materialized\s+)?view\s+[\s\S]{0,60}?\brename\s+to\s+/gi],
  ['una secuencia', /alter\s+sequence\s+[\s\S]{0,60}?\brename\s+to\s+/gi],
  ['un tipo', /alter\s+type\s+[\s\S]{0,60}?\brename\s+/gi],
  ['una función', /alter\s+function\s+[\s\S]{0,80}?\brename\s+to\s+/gi],
  ['una política', /alter\s+policy\s+[\s\S]{0,80}?\brename\s+to\s+/gi],
];
/* Los renombres que hay son todos del mismo acomodamiento del glosario
   —«bandera», `care_searches`, `logbook_entries`, `peso`—, que el Desarrollador
   cerró entre el 24 y el 25 de agosto de 2026 y que termina en la 0022. El
   encabezado de esa migración dice incluso por qué salía barato: «sale barato
   porque la base todavía no tiene datos reales». Desde la siguiente rige la
   regla. **No es una lista de perdones: es una fecha**, y del otro lado no hay
   ninguno. */
const NO_SE_RENOMBRA_DESDE = '0023';
/* Para la decimocuarta. Dos maneras distintas de romper la misma regla —«toda
   migración corre entera o no corre»— con consecuencias distintas, así que van
   separadas y avisan cosas distintas.

   La primera corta la transacción que envuelve a la migración: lo que quedó
   arriba se aplica igual aunque lo de abajo falle. El `begin` de una función
   plpgsql no entra acá, y no hace falta blanquear los cuerpos para eso: ése
   viene seguido de un renglón nuevo, y éste pide el `;` o la palabra pegada.

   **Una sentencia empieza donde termina la anterior, no donde empieza el
   renglón.** Anclar al principio del renglón dejaba pasar un `commit;` escrito
   pegado a la sentencia de arriba, que es SQL perfectamente válido; lo encontró
   el primer caso del banco de pruebas, antes de que este chequeo se publicara.

   **Y por eso la palabra va en el grupo 1 de cada expresión.** Al aceptar el
   `;` de la sentencia anterior como parte del patrón, el comienzo de la
   coincidencia cae en el renglón de arriba, y el aviso señalaba dos renglones
   antes del problema. Lo encontró la falsificación contra un archivo real, no
   el banco de pruebas, que sólo mira si hay rojo y no dónde. */
const CORTA_LA_TRANSACCION = [
  ['commit', /(?:^|;)\s*(commit\b)/gim],
  ['rollback', /(?:^|;)\s*(rollback\b)/gim],
  ['begin', /(?:^|;)\s*(begin\s*(?:;|transaction\b|work\b))/gim],
  ['start transaction', /(?:^|;)\s*(start\s+transaction\b)/gim],
  ['set transaction', /(?:^|;)\s*(set\s+transaction\b)/gim],
];
/* Y la segunda no puede correr adentro de una transacción, y cada migración
   corre adentro de una: no falla al escribirla, falla el día que se aplica, y
   falla siempre. */
const NO_ENTRA_EN_UNA_TRANSACCION = [
  ['create index concurrently', /(create\s+index\s+concurrently\b)/gi],
  ['drop index concurrently', /(drop\s+index\s+concurrently\b)/gi],
  ['reindex concurrently', /(reindex\b[\s\S]{0,40}?\bconcurrently\b)/gi],
  ['refresh materialized view concurrently',
   /(refresh\s+materialized\s+view\s+concurrently\b)/gi],
  ['vacuum', /(?:^|;)\s*(vacuum\b)/gim],
  ['create database', /(create\s+database\b)/gi],
  ['drop database', /(drop\s+database\b)/gi],
  ['alter system', /(alter\s+system\b)/gi],
  ['create tablespace', /(create\s+tablespace\b)/gi],
];
/* Para la undécima. Una política de `public`, su baja, y los dos verbos que
   no dejan ninguna fila escrita. El `%I` del final es el nombre de tabla que
   deja escrito un `execute format`: la 0005 y la 0012 crean cuatro políticas
   así, una por cada tabla de un arreglo, y sin esa alternativa el nombre de
   la tabla se leía como `public`. */
const POLITICA_DE_TABLA =
  /create\s+policy\s+"([^"]+)"\s+on\s+(?:"?([a-z_]+)"?\s*\.\s*)?(%I|"?[a-z_]+"?)/gi;
const BAJA_DE_POLITICA = /drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"/gi;
/* Para la duodécima. La comparación con la columna de la Organización y lo que
   viene a contestarla; y la deducción hecha a mano, que es sacar esa columna de
   una tabla preguntando quién inició sesión. */
const COMPARA_ORGANIZACION =
  /\b(?:tenant_id|prestadora_id)\s*(?:=|<>|!=|\bin\b)\s*(\(?[\s\S]{0,140})/gi;
const RESUELVE_SOLA = /\bselect\b|auth\.uid\s*\(/i;
const FUNCION_CON_CUERPO =
  /create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?([a-z_]+)"?[\s\S]{0,400}?\$([a-z_]*)\$([\s\S]*?)\$\2\$/gi;
const DEDUCE_LA_ORGANIZACION =
  /\bselect\b[\s\S]{0,120}?\b(?:tenant_id|prestadora_id)\b[\s\S]{0,120}?\bfrom\b[\s\S]{0,200}?auth\.uid\s*\(/i;
/* La única que tiene derecho a deducirla. **No es una exención con otro
   nombre**: es el punto único de verdad que la regla viene a proteger, y por eso
   no va a un `Map` de exenciones sino acá. Si mañana la resolviera otra, lo que
   cambia es este renglón, y la regla sigue diciendo lo mismo: una sola. */
const LA_RESUELVE = 'prestadora_actual';
const SOLO_LEE = /\bfor\s+(?:select|delete)\b/i;
const ESCRIBE = /\b(?:insert|update|delete)\b/i;
/* Para la decimoquinta. Un permiso sobre una tabla o una vista de `public`,
   concedido o revocado, con el objeto y los roles. Es `GRANT_DE_TABLA` abierto a
   los dos verbos, porque esta regla no mira lo que dice una migracion sino el
   **neto** de todas: un `grant` de la 0002 revocado en la 0021 no es un agujero,
   y uno de la 0012 que nadie revoco lo es aunque su migracion se vea prolija. */
const PERMISO_DE_TABLA =
  /\b(grant|revoke)\s+([a-z][a-z0-9_,\s()]*?)\s+on\s+(?:table\s+)?"?public"?\."?([a-z_]+)"?\s+(?:to|from)\s+([a-z_,\s"]+)/gi;
/* Un `drop` de tabla o de vista: el objeto se va y con el se van sus permisos,
   asi que lo que hubiera concedido antes deja de contar. Aca las vistas se
   borran y se vuelven a crear seguido —`caregivers_publicos` tres veces— y sin
   esto el neto arrastraria permisos de un objeto que ya no es el mismo. */
const BORRA_EL_OBJETO =
  /drop\s+(?:table|(?:materialized\s+)?view)\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?/gi;
/* Quien entra sin sesion. `PUBLIC` entra porque `anon` hereda de el: conceder a
   `PUBLIC` es conceder a todos, incluido el que no inicio sesion. */
const SIN_SESION = /^(?:anon|public)$/i;
/* Una funcion con sus parametros y su cuerpo, para mirarle la puerta. */
const FUNCION_CON_PARAMETROS =
  /create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?([a-z_]+)"?\s*\(([^)]*)\)([\s\S]{0,400}?)\$([a-z_]*)\$([\s\S]*?)\$\4\$/gi;
/* El nombre corto de una Prestadora, que es lo que la puerta publica exige.
   El nombre del parametro no se fija aca a proposito: lo que hace de puerta no
   es como se llama el parametro sino que el cuerpo lo compare contra `slug`. */
const COMPARA_EL_NOMBRE_CORTO = (parametro) =>
  new RegExp('\\bslug\\s*=\\s*' + parametro + '\\b|\\b' + parametro + '\\s*=\\s*[a-z_]*\\.?slug\\b', 'i');
/* Y la forma con la que un nombre corto opcional se vuelve un listado suelto:
   `p_slug is null or t.slug = p_slug`, que con nulo **deja pasar todo**. No se
   exige lo contrario —el `p_slug is not null` que escriben las dos funciones que
   hoy lo tienen opcional— porque eso no protege nada: `t.slug = null` no da
   verdadero, da nulo, y no coincide con ninguna fila igual. Lo que hay que
   impedir es la disyuncion, que es donde el nulo se convierte en «todas». */
const EL_NULO_DEJA_PASAR = (parametro) =>
  new RegExp(parametro + '\\s+is\\s+null\\s+or\\b|\\bor\\s+' + parametro + '\\s+is\\s+null\\b', 'i');
const DEL_SERVIDOR = /service_role/i;
const DEL_PEDIDO = /current_setting\s*\(|request\.headers|request\.jwt|auth\.jwt\s*\(/i;
const NOMBRA_ORGANIZACION = /prestadora_actual\s*\(\s*\)|\btenant_id\b|\bprestadora_id\b/i;
const ACOTADA = /\bwhere\b[^;]*\b(?:slug|id)\s*=/i;
const DISPARADOR =
  /create\s+(?:or\s+replace\s+)?trigger\s+"?[a-z_]+"?[^;]*\bon\s+(?:"?public"?\.)?"?tenants"?[^;]*\bexecute\s+(?:function|procedure)\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi;
/* Sigue el nombre de una tabla **y el de una vista**. Las vistas entraron el
   31 de agosto de 2026, y no por prolijidad: sin ellas este seguimiento decia
   que `caregivers_publicos` seguia existiendo con `select` para `anon` desde la
   0012, cuando la 0015 la habia renombrado a `directorio` y la 0021 le
   habia revocado ese permiso con el nombre nuevo. La base publicada contesta
   `PGRST205` —«no existe»— al nombre viejo y `42501` —«sin permiso»— al nuevo, que
   son dos hechos distintos y hay que poder distinguirlos. */
const RENOMBRA =
  /alter\s+(?:table|(?:materialized\s+)?view)\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+rename\s+to\s+"?([a-z_]+)"?/gi;
/* Para `columnasDeclaradas`: las tres cosas que le pasan a una columna despues
   de nacer. */
const AGREGA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?/gi;
const SACA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+drop\s+column\s+(?:if\s+exists\s+)?"?([a-z_]+)"?/gi;
const RENOMBRA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+rename\s+column\s+"?([a-z_]+)"?\s+to\s+"?([a-z_]+)"?/gi;

/** Las tablas que en algún lado reciben su columna de Organización. */
export function conOrganizacion(textos) {
  const salida = new Set();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    for (const m of t.matchAll(TABLA)) {
      if (/\b(prestadora_id|tenant_id)\b/i.test(entreParentesis(t, m.index))) {
        salida.add(m[1].toLowerCase());
      }
    }
    for (const m of t.matchAll(AGREGA_ORGANIZACION)) salida.add(m[1].toLowerCase());
  }
  return salida;
}

/** El tipo declarado de cada columna del cuerpo de un `create table`. */
function tiposDeColumna(cuerpo) {
  const salida = new Map();
  for (const linea of cuerpo.split('\n')) {
    const l = linea.trim().replace(/,$/, '');
    if (!l || NO_ES_COLUMNA.test(l)) continue;
    const partes = l.split(/\s+/);
    salida.set(partes[0].replace(/"/g, '').toLowerCase(),
      (partes[1] || '').replace(/"/g, '').replace(/\(.*/, '').toLowerCase());
  }
  return salida;
}

/**
 * La clave primaria de cada tabla: `tabla → [columna, tipo]`. Se busca en las
 * tres formas en que Postgres deja declararla, porque el esquema usa dos: al
 * lado de la columna (`id uuid primary key`), como restricción del cuerpo
 * (`primary key ("id")`) y en un `alter table` aparte, que es como salen las
 * siete tablas de la 0001.
 */
export function clavesPrimarias(textos) {
  const columna = new Map();
  const tipos = new Map();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    for (const m of t.matchAll(TABLA)) {
      const tabla = m[1].toLowerCase();
      const cuerpo = entreParentesis(t, m.index);
      tipos.set(tabla, tiposDeColumna(cuerpo));
      for (const linea of cuerpo.split('\n')) {
        const l = linea.trim();
        if (!/primary\s+key/i.test(l)) continue;
        const conParentesis = l.match(/primary\s+key\s*\(\s*"?([a-z_]+)"?/i);
        const nombre = conParentesis ? conParentesis[1] : l.split(/\s+/)[0];
        columna.set(tabla, nombre.replace(/"/g, '').toLowerCase());
      }
    }
    for (const m of t.matchAll(CLAVE_APARTE)) {
      columna.set(m[1].toLowerCase(), m[2].toLowerCase());
    }
  }
  const salida = new Map();
  for (const [tabla, nombre] of columna) {
    salida.set(tabla, [nombre, (tipos.get(tabla) || new Map()).get(nombre) || '']);
  }
  return salida;
}

/**
 * Las columnas que hoy tiene cada tabla: `tabla → Set(columnas)`. Se sigue el
 * orden de las migraciones y se aplica lo que cada una hace, porque una columna
 * no es sólo lo que dice el `create table`: puede agregarse, renombrarse o
 * sacarse después, y la tabla entera puede cambiar de nombre en el medio.
 *
 * No la usa este chequeo: la usa la octava regla de `scripts/verificar_red.mjs`,
 * que se planta cuando una exención nombra una columna que ya no existe. Vive
 * acá porque acá está el punto único de verdad de cómo se leen las migraciones,
 * y una segunda copia de esta lectura se despega de ésta el primer día.
 *
 * **Se sacan los comentarios de renglones enteros antes de mirar**, y no es
 * cautela de más: la 0016 escribió `alter table public.avisos drop column
 * grid_schedule_7x3;` adentro de un comentario, justamente para explicar lo que
 * esa migración **no** hacía. Leído sin sacarlos, el esquema pierde una columna
 * que está.
 */
export function columnasDeclaradas(textos) {
  const columnas = new Map();
  const poner = (tabla, columna) => {
    if (!columnas.has(tabla)) columnas.set(tabla, new Set());
    columnas.get(tabla).add(columna);
  };
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n').replace(/^[ \t]*--.*$/gm, '');
    for (const m of t.matchAll(TABLA)) {
      const tabla = m[1].toLowerCase();
      for (const nombre of tiposDeColumna(entreParentesis(t, m.index)).keys()) {
        poner(tabla, nombre);
      }
    }
    for (const m of t.matchAll(AGREGA_COLUMNA)) poner(m[1].toLowerCase(), m[2].toLowerCase());
    for (const m of t.matchAll(RENOMBRA_COLUMNA)) {
      const suyas = columnas.get(m[1].toLowerCase());
      if (!suyas) continue;
      suyas.delete(m[2].toLowerCase());
      suyas.add(m[3].toLowerCase());
    }
    for (const m of t.matchAll(SACA_COLUMNA)) {
      const suyas = columnas.get(m[1].toLowerCase());
      if (suyas) suyas.delete(m[2].toLowerCase());
    }
    for (const m of t.matchAll(RENOMBRA)) {
      const antes = m[1].toLowerCase();
      const despues = m[2].toLowerCase();
      if (!columnas.has(antes)) continue;
      columnas.set(despues, columnas.get(antes));
      columnas.delete(antes);
    }
  }
  return columnas;
}

/* De la paréntesis que abre hasta la que cierra, contando. Una definición de
   columna trae paréntesis adentro —`numeric(10,2)`, `check (…)`— y cortando por
   la primera que cierra se pierde media tabla.

   **Y no cuenta las que están adentro de un texto ni de un comentario**, que es
   lo que rompía la cuenta en silencio. La 0063 escribe
   `check (patron !~ '\\(\\?[=!<]')`: ese paréntesis vive adentro de una
   expresión guardada como texto y no abre nada, pero contado como si abriera
   dejaba la cuenta desbalanceada para siempre, así que esta función se comía el
   resto del archivo y le atribuía a la tabla todo lo que viniera después —los
   comentarios incluidos—. El síntoma fue que `conOrganizacion` le encontró una
   columna `tenant_id` a una tabla que no la tiene, porque la nombraba un
   comentario veinte renglones más abajo explicando justamente que no la lleva.
   Una definición que se lee de más no avisa: contesta de más. */
function entreParentesis(texto, desde) {
  const i = texto.indexOf('(', desde);
  if (i < 0) return '';
  let hondo = 0;
  let enTexto = false;
  for (let j = i; j < texto.length; j++) {
    const c = texto[j];
    if (enTexto) {
      /* La comilla de adentro se escribe doblada, y con esto se resuelve sola:
         la primera cierra el texto y la segunda lo vuelve a abrir. */
      if (c === "'") enTexto = false;
      continue;
    }
    if (c === "'") { enTexto = true; continue; }
    if (c === '-' && texto[j + 1] === '-') {
      const finDelRenglon = texto.indexOf('\n', j);
      if (finDelRenglon < 0) break;
      j = finDelRenglon;
      continue;
    }
    if (c === '(') hondo++;
    else if (c === ')') {
      hondo--;
      if (hondo === 0) return texto.slice(i + 1, j);
    }
  }
  return texto.slice(i);
}

const renglonDe = (texto, posicion) => texto.slice(0, posicion).split('\n').length;

/* Dónde da de baja cada política: `[archivo, posición]`, en orden de aplicación.
   Una política que una migración posterior borra ya no está en la base, y
   juzgarla sería ponerle rojo a algo que no existe. Es más angosto que una
   migración de corte: la que sigue en pie se juzga aunque sea de la 0001. */
function politicasDadasDeBaja(textos, nombres) {
  const bajas = new Map();
  for (const [i, texto] of textos.entries()) {
    /* Los finales de renglón se unifican **antes** de medir. En Windows el
       archivo llega con dos caracteres por renglón y quien juzga las altas mide
       sobre el texto ya unificado: si las bajas se midieran sobre el crudo, cada
       posición vendría corrida hacia adelante tantos caracteres como renglones
       haya arriba, y una política creada debajo de su propio `drop policy if
       exists` —que es como se escriben todas acá— parecería creada **antes** de
       esa baja, o sea dada de baja después. Se la saltearía sin decirlo. */
    const limpio = texto.replace(/\r\n/g, '\n').split('\n')
      .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n');
    for (const m of limpio.matchAll(BAJA_DE_POLITICA)) {
      if (!bajas.has(m[1])) bajas.set(m[1], []);
      bajas.get(m[1]).push([nombres[i], m.index]);
    }
  }
  return bajas;
}

/* Todas las políticas de `public`: `[nombre, tabla, posición, cuerpo]`. Las de
   `storage` no entran: son de la séptima. La undécima y la duodécima leen las
   políticas de distinta manera pero las reconocen igual, así que reconocerlas
   está una sola vez —que es la misma regla de la empresa que la duodécima viene
   a hacer cumplir, un piso más arriba—. */
function politicasDeTabla(sinComentarios) {
  const salida = [];
  for (const m of sinComentarios.matchAll(POLITICA_DE_TABLA)) {
    if ((m[2] || 'public').toLowerCase() !== 'public') continue;
    const corte = sinComentarios.indexOf(';', m.index);
    const cuerpo = sinComentarios.slice(m.index, corte > 0 ? corte : sinComentarios.length);
    salida.push([m[1], m[3].replace(/"/g, '').toLowerCase(), m.index, cuerpo]);
  }
  return salida;
}

/* Las que dejan una fila escrita. La regla y la cuenta del renglón verde salen
   de acá, para que no se puedan despegar. */
function politicasQueEscriben(sinComentarios) {
  return politicasDeTabla(sinComentarios).filter(([, , , cuerpo]) => !SOLO_LEE.test(cuerpo));
}

/** Si a esta política la borra una migración posterior a donde se la crea. */
function yaNoEsta(politica, archivo, posicion, bajas) {
  const donde = (bajas || new Map()).get(politica) || [];
  return donde.some(([a, p]) =>
    (archivo ? a > archivo : false) || (a === archivo && p > posicion));
}

/** El nombre que tiene hoy una tabla que en el camino se renombró. */
function nombreDeHoy(tabla, renombres) {
  let nombre = tabla;
  for (let vueltas = 0; vueltas < 10 && renombres.has(nombre); vueltas++) {
    nombre = renombres.get(nombre);
  }
  return nombre;
}

/* Un depósito de archivos declarado: `values ('nombre', 'nombre', publico, …)`.
   Se toma el primer valor —el `id`, que es con el que lo pide el navegador— y la
   bandera que dice si es público. */
const DEPOSITO_DECLARADO =
  /insert\s+into\s+storage\.buckets\b[\s\S]{0,200}?values\s*\(\s*'([a-z0-9._-]+)'\s*,\s*'[a-z0-9._-]+'\s*,\s*(true|false)\b/gi;

/**
 * Los depósitos de archivos que declaran las migraciones, con su bandera de
 * público: `Map<nombre, boolean>`. Vive acá por el mismo motivo que
 * `columnasDeclaradas()`: acá está el punto único de verdad de cómo se leen las
 * migraciones, y una segunda copia de esta lectura se despega de ésta el primer
 * día. La usa `scripts/verificar_deposito.mjs`.
 *
 * Se sacan los comentarios de renglón entero antes de mirar, igual que allá: un
 * depósito citado adentro de un comentario para explicar algo no está declarado.
 */
export function depositosDeclarados(textos) {
  const depositos = new Map();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n').replace(/^[ \t]*--.*$/gm, '');
    for (const m of t.matchAll(DEPOSITO_DECLARADO)) {
      depositos.set(m[1].toLowerCase(), m[2].toLowerCase() === 'true');
    }
  }
  return depositos;
}

/* El mismo depósito, pero entero: la lista de columnas y la tupla de valores.
   Se cierra en el `on conflict` o en el punto y coma, que es donde termina toda
   sentencia. */
const DEPOSITO_ENTERO =
  /insert\s+into\s+storage\.buckets\s*\(([^)]*)\)\s*values\s*\(([\s\S]*?)\)\s*(?:on\s+conflict|;)/gi;

/* Parte la tupla de un `values (...)` en sus valores, sin cortar adentro de un
   `array[...]` ni adentro de una cadena. No entiende la comilla doblada de SQL
   —`'no''va'`—, y no hace falta: los valores que se leen acá son nombres de
   depósito y tipos de archivo, donde una comilla adentro no tiene sentido. */
function partirTupla(cuerpo) {
  const partes = [];
  let actual = '';
  let abiertos = 0;
  let comilla = null;
  for (const c of cuerpo) {
    if (comilla) {
      actual += c;
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === "'" || c === '"') { comilla = c; actual += c; continue; }
    if (c === '[' || c === '(') abiertos += 1;
    if (c === ']' || c === ')') abiertos -= 1;
    if (c === ',' && abiertos === 0) { partes.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

/**
 * El tope de tamaño y los tipos de archivo que cada depósito declara:
 * `Map<nombre, { limite, tipos }>`. Vive acá por el mismo motivo que
 * `depositosDeclarados()`: la lectura de las migraciones tiene un solo lugar.
 * La usa la cuarta regla de `scripts/verificar_deposito.mjs`, que exige que la
 * copia declarada en el navegador diga exactamente lo mismo.
 *
 * Los valores se leen **por nombre de columna**, no por posición: el día que
 * alguien agregue una columna en el medio, leer por posición devolvería otra
 * cosa sin avisar. Un depósito que no declare tope o tipos sale con `null`, que
 * no es lo mismo que declararlos vacíos.
 */
export function limitesDeclarados(textos) {
  const limites = new Map();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n').replace(/^[ 	]*--.*$/gm, '');
    for (const m of t.matchAll(DEPOSITO_ENTERO)) {
      const columnas = m[1].split(',').map((c) => c.trim().toLowerCase());
      const valores = partirTupla(m[2]);
      if (columnas.length !== valores.length) continue;
      const campo = (nombre) => {
        const i = columnas.indexOf(nombre);
        return i === -1 ? null : valores[i];
      };
      const id = (campo('id') || '').replace(/^'|'$/g, '').toLowerCase();
      if (!id) continue;
      const tope = campo('file_size_limit');
      const tipos = campo('allowed_mime_types');
      limites.set(id, {
        limite: tope && /^\d+$/.test(tope) ? Number(tope) : null,
        tipos: tipos
          ? [...tipos.matchAll(/'([^']+)'/g)].map((x) => x[1].toLowerCase())
          : null
      });
    }
  }
  return limites;
}

/**
 * Lo que ya se sigue solo: las tablas donde escribe algún disparador colgado de
 * `tenants`, y el nombre de hoy de cada tabla que en el camino se renombró. Lo
 * segundo hace falta de verdad: la 0022 le cambió el nombre justo a una de las
 * dos tablas que siembra la 0018, y sin esto la sexta regla buscaría un nombre
 * que ya no existe y avisaría de una tabla que sí está cubierta.
 *
 * Se sigue **un solo salto** de llamadas: la función que el disparador ejecuta,
 * y las que ésa nombra. Con eso alcanza para la 0046, donde el disparador no
 * siembra él mismo sino que llama a la que sabe cuál es la configuración de
 * fábrica —que es como tiene que ser, porque esa misma función la usa también el
 * arreglo de las Prestadoras que ya habían nacido sin ella—.
 */
export function siembraQueSeSigueSola(textos) {
  const nombreActual = new Map();
  const cuerpos = new Map();
  const deDisparador = new Set();

  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    const bajo = t.toLowerCase();
    for (const m of t.matchAll(RENOMBRA)) {
      nombreActual.set(m[1].toLowerCase(), m[2].toLowerCase());
    }
    for (const m of t.matchAll(FUNCION)) {
      const fin = bajo.indexOf('$$;', m.index);
      cuerpos.set(m[1].toLowerCase(), bajo.slice(m.index, fin > 0 ? fin : bajo.length));
    }
    for (const m of t.matchAll(DISPARADOR)) deDisparador.add(m[1].toLowerCase());
  }

  const alcance = new Set(deDisparador);
  for (const nombre of deDisparador) {
    const cuerpo = cuerpos.get(nombre) || '';
    for (const otra of cuerpos.keys()) {
      if (otra !== nombre && new RegExp('\\b' + otra + '\\s*\\(').test(cuerpo)) alcance.add(otra);
    }
  }

  const cubiertas = new Set();
  for (const nombre of alcance) {
    for (const m of (cuerpos.get(nombre) || '').matchAll(INSERTA)) {
      cubiertas.add(nombreDeHoy(m[1].toLowerCase(), nombreActual));
    }
  }
  return { cubiertas, nombreActual };
}

/**
 * Lo que le queda a quien entra sin sesion sobre las tablas y las vistas de
 * `public`, una vez corridas todas las migraciones en orden: el **neto** de
 * cada `grant` y cada `revoke`. Devuelve `Map<archivo, [[indice, objeto, verbo]]>`,
 * ubicando cada concesion que sobrevive en el renglon donde se la concedio, que
 * es donde hay que ir a sacarla.
 *
 * **Ninguna migracion sola contesta esta pregunta**, y por eso no se juzga
 * archivo por archivo. La 0002, la 0007 y la 0012 le conceden `select` a `anon`
 * sobre la misma vista y las tres estan bien: la 0021 se lo revoco. Y al reves,
 * un `grant` que nadie revoco es un agujero aunque su migracion se vea prolija.
 *
 * Sigue los renombres —`caregivers_publicos` es `directorio` desde la 0015— y
 * los `drop`: un objeto que se borra se lleva sus permisos, y aca las vistas se
 * borran y se vuelven a crear seguido.
 */
export function alcanceAnonimo(textos, migraciones) {
  const limpios = textos.map((x) =>
    x.replace(/\r\n/g, '\n').split('\n')
      .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n'));

  /* Primero todos los renombres juntos: un permiso concedido en la 0012 con el
     nombre viejo se revoca en la 0021 con el nuevo, y hay que verlos iguales. */
  const renombres = new Map();
  for (const t of limpios) {
    for (const m of t.matchAll(RENOMBRA)) {
      renombres.set(m[1].toLowerCase(), m[2].toLowerCase());
    }
  }

  const tiene = new Map();
  const tocados = new Set();
  for (const [i, t] of limpios.entries()) {
    const archivo = (migraciones && migraciones[i]) || '';
    for (const m of t.matchAll(PERMISO_DE_TABLA)) {
      const concede = m[1].toLowerCase() === 'grant';
      const verbos = m[2].toLowerCase().replace(/\([^)]*\)/g, '')
        .split(',').map((v) => v.trim()).filter(Boolean);
      const objeto = nombreDeHoy(m[3].toLowerCase(), renombres);
      const roles = m[4].replace(/"/g, '').split(',').map((r) => r.trim()).filter(Boolean);
      if (!roles.some((r) => SIN_SESION.test(r))) continue;
      for (const verbo of verbos) {
        const clave = objeto + '|' + verbo;
        if (concede) {
          tiene.set(clave, { archivo, indice: m.index, objeto, verbo });
          tocados.add(objeto);
        }
        else tiene.delete(clave);
        /* `revoke all` se lleva todo lo del objeto, no solo el verbo `all`. */
        if (!concede && verbo === 'all') {
          for (const k of [...tiene.keys()]) {
            if (k.startsWith(objeto + '|')) tiene.delete(k);
          }
        }
      }
    }
    /* El objeto que se borra se lleva sus permisos. Va despues de los permisos
       del mismo archivo y no antes, porque la forma normal de redefinir una
       vista es `drop`, `create` y `grant`, los tres seguidos: mirar el `drop`
       primero borraria justamente el permiso que se acaba de conceder. */
    for (const m of t.matchAll(BORRA_EL_OBJETO)) {
      const objeto = nombreDeHoy(m[1].toLowerCase(), renombres);
      for (const [k, v] of [...tiene]) {
        if (k.startsWith(objeto + '|') && v.indice < m.index) tiene.delete(k);
      }
    }
  }

  const porArchivo = new Map();
  for (const v of tiene.values()) {
    if (!porArchivo.has(v.archivo)) porArchivo.set(v.archivo, []);
    porArchivo.get(v.archivo).push([v.indice, v.objeto, v.verbo]);
  }
  /* Y de paso, cuántos objetos estuvieron abiertos alguna vez y hoy no lo están.
     Es lo que el renglón verde puede decir sin escribir un número a mano, y es
     una cuenta que **puede** bajar: si alguien saca un `revoke`, baja. Un «cero
     abiertos» solo no prueba nada, porque también da cero un esquema que nunca
     concedió nada. */
  const siguenAbiertos = new Set([...tiene.values()].map((v) => v.objeto));
  porArchivo.cerrados = [...tocados].filter((o) => !siguenAbiertos.has(o)).length;
  return porArchivo;
}

/* Para la decimoquinta. El cuerpo de una vista, que es donde vive la única
   condición que puede acotar lo que publica: una vista no tiene política. Se
   queda con la última definición de cada una, porque acá las vistas se vuelven
   a crear —`caregivers_publicos` tres veces— y lo que vale es la que quedó. */
const DEFINE_LA_VISTA =
  /create\s+(?:or\s+replace\s+)?view\s+(?:"?public"?\.)?"?([a-z_]+)"?\s+as([\s\S]*?);/gi;

export function cuerposDeVista(textos) {
  const cuerpos = new Map();
  for (const t of textos) {
    const limpio = t.replace(/\r\n/g, '\n').split('\n')
      .map((l) => (/^\s*--/.test(l) ? '' : l)).join('\n');
    for (const m of limpio.matchAll(DEFINE_LA_VISTA)) {
      cuerpos.set(m[1].toLowerCase(), m[2]);
    }
  }
  return cuerpos;
}

/**
 * Lo que incumple una migración. Devuelve `[renglón, qué pasa]` por cada cosa.
 * `conColumna` son las tablas que reciben su columna de Organización en alguna
 * migración, `claves` las claves primarias de todas, y `sigue` lo que ya atiende
 * un disparador: ninguna de las tres cosas está obligada a estar en esta
 * migración. Sin esos datos se mira sólo este texto.
 */
export function fallasDeUnaMigracion(texto, conColumna, claves, sigue, nombre, bajas,
                                     alcance, vistas) {
  const t = texto.replace(/\r\n/g, '\n');
  const bajo = t.toLowerCase();
  const tienen = conColumna || conOrganizacion([t]);
  const primarias = claves || clavesPrimarias([t]);
  const siembra = sigue || siembraQueSeSigueSola([t]);
  /* Sin el neto de todas las migraciones se mira este solo texto, que es lo
     que hace falta para las pruebas de más abajo. */
  const alAlcance = alcance || alcanceAnonimo([t], [nombre || '']);
  /* Y sin los cuerpos de todas, los de este solo texto: es lo que hace falta
     para las pruebas de más abajo, donde cada caso es una migración sola. */
  const cuerpos = vistas || cuerposDeVista([t]);
  const fallas = [];

  for (const m of t.matchAll(TABLA)) {
    const tabla = m[1].toLowerCase();
    const renglon = renglonDe(t, m.index);
    const columnas = entreParentesis(t, m.index);

    /* 1. La RLS, en esta misma migración. */
    const rls = new RegExp('alter\\s+table[^;]*\\b' + tabla +
      '\\b[^;]*enable\\s+row\\s+level\\s+security');
    if (!rls.test(bajo)) {
      fallas.push([renglon, '`' + tabla + '` se crea acá y su RLS no se enciende acá']);
    }

    /* 3. La columna de la Organización, acá o en cualquier otra migración. */
    if (!tienen.has(tabla) && !SIN_ORGANIZACION.has(tabla)) {
      fallas.push([renglon,
        '`' + tabla + '` no tiene `prestadora_id` ni `tenant_id` en ninguna migración']);
    }

    /* 5. La clave primaria es un UUID, esté declarada donde esté. */
    const clave = primarias.get(tabla);
    if (!clave) {
      fallas.push([renglon,
        '`' + tabla + '` no declara clave primaria en ninguna migración']);
    } else if (clave[1] !== 'uuid') {
      fallas.push([renglon,
        '`' + tabla + '.' + clave[0] + '` es la clave primaria y no es `uuid`: es `' +
        (clave[1] || 'de un tipo que no se pudo leer') + '`']);
    }

    /* 4. La moneda del importe. */
    const tieneMoneda = MONEDA.test(columnas);
    const primera = renglonDe(t, t.indexOf('(', m.index));
    columnas.split('\n').forEach((linea, i) => {
      const l = linea.trim().replace(/,$/, '');
      if (!l || NO_ES_COLUMNA.test(l)) return;
      const columna = l.split(/\s+/)[0].replace(/"/g, '');
      if (!PLATA.test(columna) || !NUMERO.test(l)) return;
      if (tieneMoneda || SIN_MONEDA.has(tabla + '.' + columna)) return;
      fallas.push([primera + i,
        '`' + tabla + '.' + columna + '` guarda un importe y la tabla no tiene moneda']);
    });
  }

  /* 2. La función que se saltea la RLS no queda al alcance de quien no inició sesión. */
  for (const m of t.matchAll(FUNCION)) {
    const funcion = m[1].toLowerCase();
    const fin = bajo.indexOf('$$;', m.index);
    const trozo = bajo.slice(m.index, fin > 0 ? fin : bajo.length);
    if (!/security\s+definer/.test(trozo)) continue;

    const revocado = [...bajo.matchAll(
      new RegExp('revoke[^;]*\\b' + funcion + '\\b[^;]*from([^;]*);', 'g'))]
      .map((r) => r[1]).join(' ');
    const exenta = AL_ALCANCE_ANONIMO.has(funcion);
    const faltan = (exenta ? ['public'] : ['public', 'anon']).filter((quien) =>
      !new RegExp('\\b' + quien + '\\b').test(revocado));
    if (faltan.length > 0) {
      fallas.push([renglonDe(t, m.index),
        '`' + funcion + '()` es SECURITY DEFINER y no le revoca el permiso a ' +
        faltan.join(' ni a ')]);
    }
  }

  /* 6. La siembra que recorre las Prestadoras de hoy deja algo puesto para las
     de mañana. Los renglones comentados se tapan con espacios y no se borran:
     así el renglón que se informa sigue siendo el del archivo. */
  const sinComentarios = t.split('\n')
    .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n');
  for (const m of sinComentarios.matchAll(INSERTA)) {
    const corte = sinComentarios.indexOf(';', m.index);
    const sentencia = sinComentarios.slice(m.index, corte > 0 ? corte : sinComentarios.length);
    if (!/from\s+(?:"?public"?\.)?"?tenants"?\b/i.test(sentencia)) continue;
    if (ACOTADA.test(sentencia)) continue;
    const tabla = nombreDeHoy(m[1].toLowerCase(), siembra.nombreActual);
    if (siembra.cubiertas.has(tabla)) continue;
    fallas.push([renglonDe(t, m.index),
      '`' + tabla + '` se siembra recorriendo las Prestadoras que existen hoy, y ningún ' +
      'disparador sobre `tenants` la escribe: la que nazca mañana arranca sin eso']);
  }

  /* 7. La política del depósito de archivos nombra la Organización. */
  for (const m of sinComentarios.matchAll(POLITICA_DEPOSITO)) {
    const nombre = m[1];
    const corte = sinComentarios.indexOf(';', m.index);
    const cuerpo = sinComentarios.slice(m.index, corte > 0 ? corte : sinComentarios.length);
    if (NOMBRA_ORGANIZACION.test(cuerpo)) continue;
    if (SIN_ORGANIZACION_EN_EL_DEPOSITO.has(nombre)) continue;
    fallas.push([renglonDe(t, m.index),
      'la política «' + nombre + '» del depósito de archivos no nombra la ' +
      'Organización, y en el depósito no hay columna que la nombre por ella']);
  }

  /* 8. La Organización no sale de nada que venga en el pedido. */
  for (const renglon of sinComentarios.split('\n').entries()) {
    const [i, texto] = renglon;
    const m = texto.match(DEL_PEDIDO);
    if (!m) continue;
    fallas.push([i + 1,
      'acá la Organización se estaría resolviendo con «' +
      m[0].trim().replace(/\s*\($/, '') + '», que ' +
      'es un valor que arma quien llama; se resuelve por la membresía, que es lo ' +
      'que hace `public.prestadora_actual()`']);
  }

  /* 9. Ningún permiso de tabla abre de más. Rige desde la migración que cerró la
     puerta: lo de antes es el volcado que ella vino a sacar, y una migración
     aplicada no se edita. Sin nombre —las pruebas de acá abajo— rige igual. */
  if (!nombre || nombre.slice(0, 4) >= LA_PUERTA_SE_CERRO) {
    for (const m of sinComentarios.matchAll(GRANT_DE_TABLA)) {
      const verbos = m[1];
      if (/^\s*execute\b/i.test(verbos)) continue;
      if (!ABRE_DE_MAS.test(verbos)) continue;
      const quienes = m[3].replace(/[\s"]/g, '').split(',').filter((r) => !DEL_SERVIDOR.test(r));
      if (quienes.length === 0) continue;
      fallas.push([renglonDe(t, m.index),
        'este permiso sobre `' + m[2] + '` le da «' + verbos.trim() + '» a ' +
        quienes.join(' y ') + '; ahí adentro va `truncate`, que no mira ninguna ' +
        'política y vacía la tabla entera. Los verbos se escriben uno por uno']);
    }
  }

  /* 10. La migración que cambia el esquema termina avisándole a PostgREST.
     Sólo se juzga a la que tiene nombre: los fragmentos de las pruebas de acá
     abajo no son migraciones, y varios cambian el esquema a propósito para
     probar otra regla. Las de la regla sí traen nombre. */
  if (nombre && nombre.slice(0, 4) >= EL_AVISO_EMPIEZA &&
      CAMBIA_EL_ESQUEMA.test(sinComentarios)) {
    const rens = sinComentarios.split('\n');
    let ultimo = rens.length - 1;
    while (ultimo >= 0 && !rens[ultimo].trim()) ultimo--;
    if (!AVISA_A_POSTGREST.test(rens[ultimo] || '')) {
      const suelto = rens.findIndex((l) => AVISA_A_POSTGREST.test(l));
      fallas.push([ultimo + 1, suelto >= 0
        ? 'esta migración le avisa a PostgREST en el renglón ' + (suelto + 1) +
          ' y después sigue cambiando el esquema: lo que venga detrás del aviso ' +
          'queda afuera de esa recarga, así que el aviso parece puesto y no lo está'
        : 'esta migración cambia el esquema y no termina con ' +
          "`NOTIFY pgrst, 'reload schema';`. Sin ese aviso PostgREST sigue con la " +
          'copia vieja y contesta 404 en tablas y columnas que sí existen, y el ' +
          'error apunta al lugar equivocado']);
    }
  }

  /* 11. Toda política que deja escribir nombra la Organización en la condición
     que gobierna la fila que queda escrita. El `using` dice qué filas puedo
     tocar; el `with check`, cómo pueden quedar. Pedirla sólo en el primero deja
     entrar y deja mudar: la fila se guarda dentro de otra Prestadora. */
  for (const [politica, tabla, posicion, cuerpo] of politicasQueEscriben(sinComentarios)) {
    if (yaNoEsta(politica, nombre, posicion, bajas)) continue;
    if (SIN_ORGANIZACION_AL_ESCRIBIR.has(politica)) continue;

    /* Sin `with check` escrito, Postgres usa el `using` para las dos cosas, así
       que ahí el que gobierna la fila nueva es el `using`. */
    const conCheck = cuerpo.search(/\bwith\s+check\b/i);
    const conUsing = cuerpo.search(/\busing\b/i);
    const desde = conCheck >= 0 ? conCheck : conUsing;
    if (desde >= 0 && NOMBRA_ORGANIZACION.test(entreParentesis(cuerpo, desde))) continue;

    fallas.push([renglonDe(t, posicion),
      'la política «' + politica + '» ' + (tabla === '%i'
        ? 'de las tablas que arma el bucle'
        : 'de `' + tabla + '`') + ' deja escribir y ' +
      (conCheck >= 0
        ? 'su `with check` no nombra la Organización'
        : 'no tiene condición que nombre la Organización') +
      ': la fila que quede escrita se puede guardar dentro de otra Prestadora. ' +
      'El `using` dice qué filas se pueden tocar; el `with check`, cómo pueden ' +
      'quedar, y son cosas distintas']);
  }

  /* 11 bis. Lo que sostiene a una exenta se comprueba, no se cree. La de arriba
     dice que la sostiene el permiso por columna: acá se mira que lo siga siendo.
     Desde la 0032 por lo mismo que la novena —antes está el volcado que ella vino
     a sacar—, y la 0032 es justo la que sacó ese permiso sin querer. */
  if (!nombre || nombre.slice(0, 4) >= LA_PUERTA_SE_CERRO) {
    const sostenidas = [...SIN_ORGANIZACION_AL_ESCRIBIR.values()].map((v) => v.tabla);
    for (const m of sinComentarios.matchAll(GRANT_DE_TABLA)) {
      if (!sostenidas.includes(m[2].toLowerCase())) continue;
      if (!ESCRIBE.test(m[1]) || m[1].includes('(')) continue;
      const quienes = m[3].replace(/[\s"]/g, '').split(',').filter((r) => !DEL_SERVIDOR.test(r));
      if (quienes.length === 0) continue;
      fallas.push([renglonDe(t, m.index),
        'este permiso deja escribir `' + m[2] + '` a ' + quienes.join(' y ') +
        ' sin nombrar columnas, y una política de esa tabla está exenta de la ' +
        'undécima regla justamente porque el permiso por columna la sostenía. ' +
        'Sin lista de columnas se puede escribir cualquiera, incluidas las que ' +
        'deciden el rol y la Prestadora']);
    }
  }

  /* 12. La Organización se resuelve en un solo lugar. La octava dice de dónde
     **no** puede salir; ésta dice que no se la vuelva a deducir. Adentro de una
     política, la comparación con la columna de la Organización se contesta
     llamando a la función, no rehaciendo la cuenta. Una condición copiada no
     aprende: el día que la función sepa algo nuevo —que la membresía tenga que
     estar activa, por ejemplo— la copia sigue contestando lo de antes, y no lo
     nota nadie, porque leer sigue funcionando igual. */
  for (const [politica, tabla, posicion, cuerpo] of politicasDeTabla(sinComentarios)) {
    if (yaNoEsta(politica, nombre, posicion, bajas)) continue;
    for (const m of cuerpo.matchAll(COMPARA_ORGANIZACION)) {
      /* Sólo lo que está pegado a la comparación: hasta el primer `and` o el
         primer `or`, que ya es otra condición y puede traer una subconsulta que
         no resuelve nada de esto —comprobar que quien pregunta participa del
         aviso, por ejemplo—. */
      const derecha = m[1].split(/\band\b|\bor\b/i)[0];
      if (!RESUELVE_SOLA.test(derecha)) continue;
      fallas.push([renglonDe(t, posicion + m.index),
        'la política «' + politica + '» ' + (tabla === '%i'
          ? 'de las tablas que arma el bucle'
          : 'de `' + tabla + '`') + ' deduce la Organización en vez de pedírsela ' +
        'a `public.' + LA_RESUELVE + '()`: es la misma condición copiada, y una ' +
        'copia no aprende lo que la función aprenda después']);
    }
  }

  /* 12 bis. Y afuera de las políticas, lo mismo. Una segunda función que dedujera
     la Organización sería la misma condición copiada, escondida un piso más
     abajo y más difícil de ver. */
  for (const m of sinComentarios.matchAll(FUNCION_CON_CUERPO)) {
    if (m[1].toLowerCase() === LA_RESUELVE) continue;
    if (!DEDUCE_LA_ORGANIZACION.test(m[3])) continue;
    fallas.push([renglonDe(t, m.index),
      '`' + m[1] + '()` deduce la Organización sacándola de una tabla por quien ' +
      'inició sesión, que es lo que hace `public.' + LA_RESUELVE + '()`. Dos ' +
      'lugares que contestan lo mismo se separan el día que uno de los dos ' +
      'aprende algo, y el que quede viejo decide permisos igual']);
  }

  /* 13. Lo que ya está guardado no se renombra. Son las tres capas que la
     regla de la empresa no deja mezclar: lo **visible**, que puede cambiar
     cuando cambia la marca; lo **guardado**, que se nombra por lo que hace y no
     cambia nunca; y lo **histórico**, que ya quedó escrito. Un renombre las
     mezcla, y convierte un cambio de nombre en una migración de datos.

     Y el costo no se paga una vez, se paga siempre: `nombreDeHoy()` existe en
     este mismo archivo para seguirle el hilo a los renombres que ya están, y va
     a seguir existiendo aunque no se agregue ninguno más. */
  if (!nombre || nombre.slice(0, 4) >= NO_SE_RENOMBRA_DESDE) {
    for (const [que, expresion] of RENOMBRA_LO_GUARDADO) {
      for (const m of sinComentarios.matchAll(expresion)) {
        fallas.push([renglonDe(t, m.index),
          'esto le cambia el nombre a ' + que + ' que ya está guardada, y lo ' +
          'guardado se nombra por lo que hace y no se renombra. El nombre viejo ' +
          'no se va: queda en los datos de antes, en toda migración anterior ' +
          '—que no se puede editar— y en los chequeos que tienen que seguirle ' +
          'el hilo. Si el nombre de hoy quedó mal, lo que corresponde es agregar ' +
          'lo nuevo y dejar de escribir lo viejo, no renombrarlo']);
      }
    }
  }

  /* 14. La migración entra entera o no entra. Es regla de la empresa, y existe
     porque una base a mitad de camino no avisa: queda andando, con la mitad de
     los cambios puestos y la otra mitad no, y el archivo que la escribió dice
     que se aplicó. Reconstruir ese estado después es un trabajo aparte, que es
     exactamente el motivo por el que la regla se escribió. */
  /* El renglón es el de la palabra, no el del `;` que la precede. */
  const dondeEmpieza = (m) => m.index + m[0].length - m[1].length;
  for (const [que, expresion] of CORTA_LA_TRANSACCION) {
    for (const m of sinComentarios.matchAll(expresion)) {
      fallas.push([renglonDe(t, dondeEmpieza(m)),
        '`' + que + '` corta acá la transacción que envuelve a la migración: lo ' +
        'que está arriba queda aplicado aunque lo de abajo falle, y la base se ' +
        'queda a mitad de camino sin que nadie avise. La migración entra entera ' +
        'o no entra']);
    }
  }
  for (const [que, expresion] of NO_ENTRA_EN_UNA_TRANSACCION) {
    for (const m of sinComentarios.matchAll(expresion)) {
      fallas.push([renglonDe(t, dondeEmpieza(m)),
        '`' + que + '` no puede correr adentro de una transacción, y cada ' +
        'migración corre adentro de una. Esto no falla al escribirlo: falla el ' +
        'día que se aplique, y falla siempre, así que la migración entera se cae ' +
        'y no entra nada']);
    }
  }


  /* 15. Quien llega sin sesión entra por la puerta de una Prestadora, o no
     entra. Son las dos mitades de la misma regla de los dos productos —«no hay
     lista de Prestadoras ni listado suelto… no existe ningún listado que no sea
     de una Prestadora»—, y hasta hoy ninguna de las dos la miraba nadie. */

  /* 15 a. Ninguna tabla ni vista de `public` le queda al alcance del que no
     inició sesión. Se mide el neto, no lo que dice esta migración: la falla se
     informa en el renglón donde se concedió el permiso que sobrevivió, que es
     donde hay que ir a sacarlo. */
  for (const [indice, objeto, verbo] of (alAlcance.get(nombre || '') || [])) {
    /* La vista que se abre a propósito no queda perdonada por estar en la
       lista: lo que la sostiene es la condición que lleva adentro, así que se
       la va a mirar. Es la misma forma de la undécima con `profiles`. */
    if (VISTAS_AL_ALCANCE_ANONIMO.has(objeto)) {
      const cuerpo = cuerpos.get(objeto);
      if (verbo !== 'select') {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` está en `VISTAS_AL_ALCANCE_ANONIMO`, que perdona la ' +
          'lectura y nada más, y este permiso le deja `' + verbo + '` a quien entra sin ' +
          'sesión. Abrir una vista para que se lea no es abrirla para que se escriba']);
      } else if (!cuerpo) {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` está en `VISTAS_AL_ALCANCE_ANONIMO` y ninguna migración la ' +
          'define como vista. Lo que sostiene esa exención es la condición escrita ' +
          'adentro del cuerpo, y una tabla no lleva ninguna: sin ese cuerpo, lo que ' +
          'queda abierto sin sesión es la tabla entera']);
      } else if (!/tenant_id\s+is\s+null/i.test(cuerpo)) {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` se ve sin sesión a propósito, pero su cuerpo ya no acota a ' +
          'la oferta general del producto —`tenant_id is null`—, que es lo único que la ' +
          'separaba de ser un listado suelto: así publica las filas de cada Prestadora, ' +
          'y de paso quiénes son los clientes']);
      } else if (/tenant_id\s+is\s+null\s+or\b/i.test(cuerpo)) {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` se ve sin sesión a propósito y su cuerpo escribe ' +
          '`tenant_id is null or`: esa disyunción deja pasar todo lo que venga después, ' +
          'que es exactamente lo que la 15 b prohíbe en las puertas. La condición acota ' +
          'o no acota; con un `or` al lado no acota']);
      }
      continue;
    }
    /* Y la tabla del producto que se lee sin sesión tampoco queda perdonada por
       estar en la lista: lo que la sostiene es no tener a quién aislar, así que
       se le mira que siga sin columna de Organización. */
    if (TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO.has(objeto)) {
      if (verbo !== 'select') {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` está en `TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO`, que ' +
          'perdona la lectura y nada más, y este permiso le deja `' + verbo + '` a quien ' +
          'entra sin sesión. Que una regla del producto se lea sin cuenta no es que ' +
          'cualquiera la pueda cambiar']);
      } else if (tienen.has(objeto)) {
        fallas.push([renglonDe(t, indice),
          '`' + objeto + '` se lee sin sesión a propósito porque no guarda datos de ' +
          'nadie, y ya tiene columna de Organización: dejó de ser una tabla del producto ' +
          'y ahora publica, sin puerta, las filas de cada Prestadora. La exención valía ' +
          'por eso y dejó de valer']);
      }
      continue;
    }
    fallas.push([renglonDe(t, indice),
      'este permiso le deja `' + verbo + '` sobre `' + objeto + '` a quien entra ' +
      'sin sesión, y ninguna migración posterior se lo saca. Una tabla o una vista ' +
      'de `public` es además una dirección web, porque PostgREST publica ese ' +
      'esquema: no hay condición que la acote a una sola Prestadora, así que es ' +
      'un listado suelto, y de paso publica quiénes son los clientes. La puerta ' +
      'sin sesión se abre con una función que exija el nombre corto, nunca con un ' +
      'permiso de tabla']);
  }

  /* 15 b. Y la función que sí abre esa puerta exige de verdad el nombre corto.
     Cinco de las seis exenciones de `AL_ALCANCE_ANONIMO` lo afirman en su motivo
     —«exige el nombre corto», «la que nombra el argumento»— y hasta hoy eso era
     prosa: nadie iba a mirar si seguía siendo cierto. Es la misma forma de la
     undécima bis, «lo que sostiene a una exenta se comprueba, no se cree». */
  for (const m of t.matchAll(FUNCION_CON_PARAMETROS)) {
    const funcion = m[1].toLowerCase();
    if (!AL_ALCANCE_ANONIMO.has(funcion)) continue;
    const renglon = renglonDe(t, m.index);
    const primero = (m[2].split(',')[0] || '').trim();
    const cuerpo = m[5];
    const parametro = (primero.match(/^"?([a-z_][a-z0-9_]*)"?\s/i) || [])[1];

    if (!parametro || !/\btext\b/i.test(primero)) {
      fallas.push([renglon,
        '`' + funcion + '()` se abre sin sesión y su primer parámetro no es el nombre ' +
        'corto de una Prestadora. Lo que hace de puerta es ese parámetro: sin él la ' +
        'función contesta sobre todas, que es el listado suelto que no existe']);
      continue;
    }
    if (!COMPARA_EL_NOMBRE_CORTO(parametro).test(cuerpo)) {
      fallas.push([renglon,
        '`' + funcion + '()` se abre sin sesión y su cuerpo no compara `' + parametro +
        '` contra `slug`: recibe el nombre corto y no lo usa para acotar, así que ' +
        'lo que devuelve no está atado a ninguna Prestadora']);
      continue;
    }
    /* Y el nombre corto no se vuelve opcional por la puerta de atrás. Las dos
       funciones que hoy lo tienen con `default` devuelven, sin él, el catálogo
       general del producto y nada de ninguna Prestadora, que es legítimo y está
       escrito en su exención. Lo que no es legítimo es escribir `is null or`:
       ahí el que llama sin argumento pasa a verlas **todas**, con una sola
       palabra de diferencia y sin que se rompa nada. */
    if (EL_NULO_DEJA_PASAR(parametro).test(cuerpo)) {
      fallas.push([renglon,
        '`' + funcion + '()` se abre sin sesión y su cuerpo escribe `' + parametro +
        ' is null or`: llamada sin nombre corto, esa condición da verdadero para ' +
        'todas las filas, así que la puerta de una Prestadora se convierte en el ' +
        'listado de todas. Comparar contra nulo no hace eso —da nulo y no ' +
        'coincide con nada—; la disyunción sí']);
    }
  }

  return fallas.sort((a, b) => a[0] - b[0]);
}

/* ── Pruebas del detector ────────────────────────────────────────────────────
   Un chequeo que no detecta nada pasa siempre, y eso no se nota. Antes de mirar
   las migraciones se mira a sí mismo. */

const RLS = 'alter table public.visitas enable row level security;';
const CREA = 'create table if not exists public.visitas (\n' +
  '  id uuid primary key default gen_random_uuid(),\n' +
  '  prestadora_id uuid not null references public.tenants(id)\n);\n';

/* Para la sexta. La siembra que recorre todas las Prestadoras, el disparador que
   la atiende de ahí en más, y el mismo disparador llamando a otra función, que es
   como está escrita la 0046. */
const AVISO = "\nnotify pgrst, 'reload schema';\n";
const BARRIDO = 'insert into public.visitas (tenant_id)\n' +
  'select id from public.tenants\non conflict do nothing;\n';
const SIEMBRA_DIRECTA =
  'create function public.al_nacer() returns trigger language plpgsql as $$\n' +
  'begin\n  insert into public.visitas (tenant_id) values (new.id);\n' +
  '  return null;\nend;\n$$;\n' +
  'create trigger al_nacer after insert on public.tenants\n' +
  '  for each row execute function public.al_nacer();\n';
const SIEMBRA_LLAMADA =
  'create function public.de_fabrica(p uuid) returns void language plpgsql as $$\n' +
  'begin\n  insert into public.visitas (tenant_id) values (p);\nend;\n$$;\n' +
  'create function public.al_nacer() returns trigger language plpgsql as $$\n' +
  'begin\n  perform public.de_fabrica(new.id);\n  return null;\nend;\n$$;\n' +
  'create trigger al_nacer after insert on public.tenants\n' +
  '  for each row execute function public.al_nacer();\n';

/* Una política del depósito, con y sin la Organización adentro. */
const DEPOSITO = (condicion) =>
  'create policy "Papeles de cualquiera" on storage.objects\n' +
  '  for select to authenticated\n  using (\n    ' + condicion + '\n  );\n';

/* Para la decimoquinta. Una puerta sin sesión de verdad: `directorio_de` esta
   en `AL_ALCANCE_ANONIMO`, asi que la regla la juzga. Los parametros y la
   condicion se pasan por afuera para poder escribirla bien y mal sin repetir
   el resto, que es siempre igual. */
const PUERTA = (parametros, condicion) =>
  'create or replace function public.directorio_de(' + parametros + ')\n' +
  '  returns jsonb language sql stable security definer as $$\n' +
  '  select jsonb_agg(t.*) from public.tenants t where ' + condicion + ';\n' +
  '$$;\n' +
  'revoke all on function public.directorio_de(text) from public;\n';

/* Y la otra mitad de la decimoquinta: la vista que se ve sin sesión a
   propósito. `oferta_de_cursos` está en `VISTAS_AL_ALCANCE_ANONIMO`, así que la
   regla no la perdona: le mira el cuerpo. La condición se pasa por afuera para
   poder escribirla bien y mal sin repetir el resto. */
const VISTA_ABIERTA = (condicion) =>
  'create or replace view public.oferta_de_cursos as\n' +
  '  select c.clave, c.horas from public.cursos c ' + condicion + ';\n';

const MAL = [
  ['un permiso de tabla que deja mirar al que no inició sesión',
   'grant select on table public.visitas to anon;\n'],
  ['el mismo, concedido a `PUBLIC`, de quien `anon` hereda',
   'grant select on table public.visitas to public;\n'],
  ['una puerta sin sesión cuyo primer parámetro no es el nombre corto',
   PUERTA('p_todas boolean', 'p_todas')],
  ['una puerta sin sesión que recibe el nombre corto y no lo compara',
   PUERTA('p_slug text', 'true')],
  ['una puerta sin sesión donde el nulo deja pasar todo',
   PUERTA('p_slug text default null', 'p_slug is null or t.slug = p_slug')],
  ['un permiso de tabla que concede `all`, con `truncate` adentro',
   'grant all on table public.visitas to anon, authenticated;\n'],
  ['el mismo, nombrando `truncate` de frente',
   'grant select, truncate on public.visitas to authenticated;\n'],
  ['una política que saca la Organización de un encabezado del pedido',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   "  using (tenant_id = (current_setting('request.headers', true)::json->>'x-prestadora')::uuid);\n"],
  ['una política que la saca de un dato que la cuenta se escribe sola',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   "  using (tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid);\n"],
  ['una política del depósito que no nombra la Organización',
   DEPOSITO("bucket_id = 'papeles'")],
  ['una tabla que se crea sin encender su RLS',
   CREA],
  ['una tabla sin columna de Organización',
   'create table if not exists public.visitas (\n  id uuid primary key\n);\n' + RLS],
  ['un importe sin moneda',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  precio_hora numeric not null\n);\n' + RLS],
  ['una clave primaria que no es uuid',
   'create table if not exists public.visitas (\n  id serial primary key,\n' +
   '  prestadora_id uuid not null\n);\n' + RLS],
  ['una tabla que no declara clave primaria en ningún lado',
   'create table if not exists public.visitas (\n  id uuid not null,\n' +
   '  prestadora_id uuid not null\n);\n' + RLS],
  ['una función SECURITY DEFINER que no revoca nada',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\n'],
  ['una función SECURITY DEFINER que sólo le revoca a PUBLIC',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\nrevoke all on function public.mirar() from public;\n'],
  ['una siembra que recorre las Prestadoras de hoy y no deja nada para las de mañana',
   BARRIDO],
  ['la misma siembra con un disparador colgado de otra tabla',
   BARRIDO + SIEMBRA_DIRECTA.replace('on public.tenants', 'on public.caregivers')],
  ['un disparador sobre `tenants` que escribe en otra tabla que la sembrada',
   BARRIDO + SIEMBRA_DIRECTA.replace('into public.visitas', 'into public.otras')],
  ['una migración nueva que cambia el esquema y no le avisa a PostgREST',
   CREA + RLS, '0050_prueba.sql'],
  ['la misma con el aviso puesto en el medio y un cambio de esquema detrás',
   CREA + RLS + AVISO +
   'alter table public.visitas add column if not exists nota text;\n',
   '0050_prueba.sql'],
  ['un permiso de tabla, que también cambia lo que PostgREST tiene guardado',
   'grant select on table public.visitas to authenticated;\n', '0050_prueba.sql'],
  ['una política que deja escribir y pide la Organización sólo para leer',
   'create policy "Lo mío" on public.cosas for all to authenticated\n' +
   '  using      (tenant_id = public.prestadora_actual())\n' +
   '  with check (user_id = auth.uid());\n'],
  ['la misma dejando entrar cualquier fila',
   'create policy "Lo mío" on public.cosas for insert to authenticated\n' +
   '  with check (true);\n'],
  ['una que la crea un bucle y tampoco la nombra',
   'create policy "Lo mío" on public.%I for all to authenticated\n' +
   '  with check (user_id = auth.uid());\n'],
  ['un permiso que deja escribir `profiles` sin nombrar columnas',
   'grant update on table public.profiles to authenticated;\n'],
  ['una migración que corta su propia transacción en el medio',
   CREA + RLS + 'commit;\n' + AVISO, '0050_prueba.sql'],
  ['una que trae algo que no puede correr adentro de una transacción',
   CREA + RLS + 'create index concurrently idx_visitas on public.visitas (prestadora_id);\n' +
   AVISO, '0050_prueba.sql'],
  ['una migración nueva que le cambia el nombre a una tabla ya guardada',
   'alter table public.visitas rename to jornadas;\n' + AVISO, '0050_prueba.sql'],
  ['y una que se lo cambia a una columna, que es lo mismo un piso más adentro',
   'alter table public.visitas rename column peso to ponderacion;\n' + AVISO,
   '0050_prueba.sql'],
  ['y una que se lo cambia a una política, que es como se la busca para bajarla',
   'alter policy "Lo mío" on public.visitas rename to "Lo nuestro";\n' + AVISO,
   '0050_prueba.sql'],
  ['una política que rehace la cuenta de la Organización en vez de pedirla',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   '  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));\n'],
  ['una segunda función que la deduce, que es la misma copia un piso más abajo',
   'create function public.mi_prestadora() returns uuid language sql security definer as $$\n' +
   '  select tenant_id from public.profiles where id = auth.uid();\n$$;\n' +
   'revoke all on function public.mi_prestadora() from public, anon;\n'],
  /* Y lo que sostiene a la vista exenta, que no se cree: se comprueba. Los
     cuatro casos son las cuatro maneras de que la exención quede escrita y
     dejando de ser cierta. */
  ['la vista exenta a la que le sacaron la condición que la acotaba',
   VISTA_ABIERTA('where c.publicado') + 'grant select on public.oferta_de_cursos to anon;\n'],
  ['la misma condición vuelta opcional por un `or`, que es no acotar',
   VISTA_ABIERTA('where c.tenant_id is null or c.publicado') +
   'grant select on public.oferta_de_cursos to anon;\n'],
  ['la exenta abierta también para escribir, cuando lo que se perdonó fue mirar',
   VISTA_ABIERTA('where c.tenant_id is null') +
   'grant select, insert on public.oferta_de_cursos to anon;\n'],
  ['el nombre de la exenta puesto sobre algo que ninguna migración define como vista',
   'grant select on table public.oferta_de_cursos to anon;\n']
];

const BIEN = [
  ['una puerta sin sesión que exige el nombre corto de una Prestadora',
   PUERTA('p_slug text', 't.slug = p_slug')],
  ['el mismo nombre corto opcional: sin él no hay Prestadora, y sin ella no hay filas',
   PUERTA('p_slug text default null', 't.slug = p_slug')],
  ['la vista exenta, con la condición que la acota escrita adentro del cuerpo',
   VISTA_ABIERTA('where c.tenant_id is null and c.publicado') +
   'grant select on public.oferta_de_cursos to anon;\n'],
  ['un permiso sin sesión que la misma migración se vuelve a llevar',
   'grant select on table public.visitas to anon;\n' +
   'revoke all on table public.visitas from anon;\n'],
  ['el permiso de mirar para quien sí inició sesión',
   'grant select on table public.visitas to authenticated;\n'],
  ['los cuatro verbos escritos uno por uno',
   'grant select, insert, update, delete on public.visitas to authenticated;\n'],
  ['`all` para `service_role`, que es la llave del servidor',
   'grant all on table public.visitas to service_role;\n'],
  ['`grant execute` sobre una función, que no es un permiso de tabla',
   'grant execute on function public.visitas_de() to authenticated;\n'],
  ['la misma política resolviendo la Organización por la membresía',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   '  using (tenant_id = public.prestadora_actual());\n'],
  ['`auth.uid()`, que no es un valor del pedido sino quién inició sesión',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   '  using (user_id = auth.uid());\n'],
  ['una política del depósito que sí la nombra',
   DEPOSITO("bucket_id = 'papeles' and tenant_id = public.prestadora_actual()")],
  ['la misma política nombrada adentro de un comentario, que no cuenta',
   '-- create policy "Papeles de cualquiera" on storage.objects using (true);\nselect 1;\n'],
  ['una tabla con su RLS y su columna de Organización',
   CREA + RLS],
  ['un importe con su moneda al lado',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  precio_hora numeric not null,\n' +
   '  moneda text not null default \'ARS\'\n);\n' + RLS],
  ['la columna de la Organización que llega en un `alter table` posterior',
   'create table if not exists public.visitas (\n  id uuid primary key\n);\n' +
   'alter table public.visitas add column if not exists tenant_id uuid;\n' + RLS],
  ['una columna numérica que no es un importe',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  latitude double precision\n);\n' + RLS],
  ['la clave primaria declarada en un `alter table` aparte, como en la 0001',
   'create table if not exists public.visitas (\n  "id" uuid not null,\n' +
   '  prestadora_id uuid not null\n);\n' +
   'alter table only public.visitas add constraint visitas_pkey primary key ("id");\n' +
   RLS],
  ['la clave primaria escrita como restricción del cuerpo',
   'create table if not exists public.visitas (\n  id uuid not null,\n' +
   '  prestadora_id uuid not null,\n  primary key (id)\n);\n' + RLS],
  ['una función SECURITY DEFINER que le revoca a los dos',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\nrevoke all on function public.mirar() from public, anon;\n'],
  ['una que además le revoca a la sesión iniciada, porque la dispara un trigger',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\n' +
   'revoke all on function public.mirar() from public, anon, authenticated;\n'],
  ['una función común que no revoca nada',
   'create function public.mirar() returns boolean language sql as $$\n' +
   '  select true;\n$$;\n'],
  ['`numeric(10,2)` no corta la tabla por la mitad',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  cantidad numeric(10,2),\n  prestadora_id uuid not null\n);\n' + RLS],
  ['la siembra que además deja el disparador que la sigue',
   BARRIDO + SIEMBRA_DIRECTA],
  ['la misma, con el disparador llamando a otra función, como la 0046',
   BARRIDO + SIEMBRA_LLAMADA],
  ['la siembra acotada a una Prestadora, que no es un barrido',
   "insert into public.visitas (tenant_id)\nselect id from public.tenants where slug = 'presdemo';\n"],
  ['la siembra de una tabla que después se renombró',
   'insert into public.pesos (tenant_id)\nselect id from public.tenants;\n' +
   'alter table public.pesos rename to visitas;\n' + SIEMBRA_DIRECTA,
   '0022_prueba.sql'],
  ['el `begin` con el que abre una función plpgsql, que no corta ninguna transacción',
   'create function public.mirar() returns boolean language plpgsql security definer as $$\n' +
   'begin\n  return true;\nend;\n$$;\n' +
   'revoke all on function public.mirar() from public, anon;\n'],
  ['la palabra `commit` contada adentro de un comentario',
   '-- commit;\nselect 1;\n'],
  ['el mismo renombre pero en el acomodamiento del glosario, que ya está escrito',
   'alter table public.visitas rename to jornadas;\n', '0015_prueba.sql'],
  ['un comentario que cuenta un renombre viejo, que es prosa y no una sentencia',
   '-- alter table public.visitas rename to jornadas;\nselect 1;\n',
   '0050_prueba.sql'],
  ['un `insert` que nombra `tenants` adentro de un comentario',
   '-- insert into public.visitas select id from public.tenants;\n' +
   'select 1;\n'],
  ['la misma migración nueva terminando con el aviso, que es como va',
   CREA + RLS + AVISO, '0050_prueba.sql'],
  ['una migración de datos, que no cambia el esquema y no necesita avisar',
   "insert into public.visitas (tenant_id)\nselect id from public.tenants " +
   "where slug = 'presdemo';\n", '0050_prueba.sql'],
  ['el aviso nombrado adentro de un comentario, que no es un cambio de esquema',
   "-- alter table public.visitas add column nota text;\nselect 1;\n",
   '0050_prueba.sql'],
  ['la migración vieja que cambia el esquema sin avisar: ya está aplicada y no se edita',
   CREA + RLS, '0006_prueba.sql'],
  ['la misma política nombrando la Organización también en el `with check`',
   'create policy "Lo mío" on public.cosas for all to authenticated\n' +
   '  using      (tenant_id = public.prestadora_actual())\n' +
   '  with check (tenant_id = public.prestadora_actual() and user_id = auth.uid());\n'],
  ['una de escritura sin `with check`, que Postgres copia del `using`',
   'create policy "Lo mío" on public.cosas for all to authenticated\n' +
   '  using (tenant_id = public.prestadora_actual());\n'],
  ['un `with check` más angosto que su `using`, como las dos de la 0020',
   'create policy "Lo mío" on public.cosas for all to authenticated\n' +
   '  using      (tenant_id = public.prestadora_actual())\n' +
   '  with check (tenant_id = public.prestadora_actual() and user_id = auth.uid());\n'],
  ['la que abre de par en par pero una migración posterior da de baja',
   'create policy "Vieja" on public.cosas for all to authenticated\n' +
   '  with check (true);\n' +
   'drop policy if exists "Vieja" on public.cosas;\n'],
  ['la baja escrita antes del alta, como en el bucle de la 0012',
   'drop policy if exists "Lo mío" on public.%I;\n' +
   'create policy "Lo mío" on public.%I for all to authenticated\n' +
   '  with check (tenant_id = public.prestadora_actual());\n'],
  ['el permiso de `profiles` nombrando la columna que sí se puede tocar',
   'grant update (full_name) on table public.profiles to authenticated;\n'],
  ['la que le pregunta a la función y además tiene una subconsulta que no viene al caso',
   'create policy "Lo mío" on public.cosas for select to authenticated\n' +
   '  using (tenant_id = public.prestadora_actual()\n' +
   '     and exists (select 1 from public.avisos a where a.id = aviso_id));\n'],
  ['`prestadora_actual()` misma, que es la única que tiene derecho a deducirla',
   'create function public.prestadora_actual() returns uuid language sql security definer as $$\n' +
   '  select tenant_id from public.profiles where id = auth.uid();\n$$;\n' +
   'revoke all on function public.prestadora_actual() from public, anon;\n'],
  ['la columna comparada contra la de otra tabla, que no deduce nada',
   'create policy "Del aviso" on public.cosas for select to authenticated\n' +
   '  using (tenant_id = a.tenant_id);\n']
];

/* De acá para abajo está la verificación. De acá para arriba está la regla que
   reconoce una tabla con datos de una Prestadora, que además le presta
   `scripts/barrer_aislamiento.mjs`. Por eso el cuerpo va adentro de esta
   pregunta: cuando alguien importa este archivo para usar la regla, la
   verificación no tiene que correr ni imprimir nada. Cuando se lo corre a él,
   corre entera. */
const ME_CORRIERON_A_MI = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ME_CORRIERON_A_MI) {
  /* El tercer valor, cuando está, es el nombre del archivo: la novena regla y la
     décima miran desde qué migración rigen, y sin nombre no se las puede probar.
     Las bajas salen del mismo texto del caso, que es lo que deja probar que una
     política dada de baja después ya no se juzga. */
  const juzgar = ([, t, n]) => fallasDeUnaMigracion(
    t, undefined, undefined, undefined, n,
    politicasDadasDeBaja([t], [n]));
  const noDetecta = MAL.filter((c) => juzgar(c).length === 0);
  const sePasa = BIEN.filter((c) => juzgar(c).length > 0);
  if (noDetecta.length || sePasa.length) {
    console.error('El detector está roto, así que no verifica nada:');
    for (const [q] of noDetecta) console.error('  no detecta: ' + q);
    for (const [q] of sePasa) console.error('  avisa de más: ' + q);
    process.exit(1);
  }

  const fallas = [];
  let tablas = 0;
  let funciones = 0;
  let siembras = 0;
  let politicas = 0;
  let permisos = 0;
  let avisos = 0;
  let escrituras = 0;
  let resoluciones = 0;
  let quietas = 0;
  let enteras = 0;
  let renombres = 0;
  let puertas = 0;
  const migraciones = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort();
  seRevisaron(migraciones.length, 'una sola migración `.sql` para revisar');
  const textos = migraciones.map((n) => readFileSync(join(carpeta, n), 'utf8'));

  /* Primero se leen todas juntas: una tabla puede recibir su columna de
     Organización en una migración posterior a la que la crea, y juzgando archivo
     por archivo se avisaría de tres que están bien. */
  const tienenColumna = conOrganizacion(textos);

  /* Lo mismo con la clave primaria: las siete tablas de la 0001 la declaran en un
     `alter table` que está más abajo en el mismo archivo, y otra migración podría
     declararla en otro. Se buscan todas antes de juzgar ninguna. */
  const primarias = clavesPrimarias(textos);

  /* Y lo mismo con el disparador: la siembra está en la 0018 y el disparador que
     la sigue, en la 0046. Juzgando archivo por archivo, la 0018 saldría en rojo
     para siempre por algo que ya está arreglado. */
  const sigue = siembraQueSeSigueSola(textos);

  /* Y lo mismo con las bajas: las siete políticas de la 0001 que escriben
     `with check (true)` las borra la 0002, y juzgando archivo por archivo la
     0001 saldría en rojo para siempre por algo que ya no está en la base. */
  const bajas = politicasDadasDeBaja(textos, migraciones);

  /* Y lo mismo, más todavía, con lo que le queda al que entra sin sesión: eso no
     lo contesta ninguna migración sola. La 0002, la 0007, la 0012 y la 0017 le
     conceden `select` a `anon` sobre la misma vista y las cuatro están bien,
     porque la 0021 se lo revocó; juzgando archivo por archivo las cuatro sale ían
     en rojo para siempre por algo que ya no está. */
  const alcance = alcanceAnonimo(textos, migraciones);
  /* Y los cuerpos de las vistas, por lo mismo: la condición que sostiene a una
     vista exenta puede haberse escrito en otra migración que la del permiso que
     sobrevive, y lo que vale es la última definición. */
  const vistas = cuerposDeVista(textos);

  for (const [i, nombre] of migraciones.entries()) {
    const texto = textos[i];
    tablas += [...texto.matchAll(TABLA)].length;
    for (const m of texto.matchAll(FUNCION)) {
      const fin = texto.toLowerCase().indexOf('$$;', m.index);
      if (/security\s+definer/i.test(
        texto.slice(m.index, fin > 0 ? fin : texto.length))) funciones++;
    }
    politicas += [...texto.matchAll(POLITICA_DEPOSITO)].length;
    /* La cuenta sale del mismo lugar que la regla, para que no se despeguen, y
       sobre el texto con los finales de renglón unificados, que es donde miden
       las bajas contra las que se la compara. */
    for (const [politica, , posicion] of politicasQueEscriben(
      texto.replace(/\r\n/g, '\n').split('\n')
        .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n'))) {
      if (!yaNoEsta(politica, nombre, posicion, bajas)) escrituras++;
    }
    /* Y lo mismo con la duodécima: la cuenta sale del mismo lugar que la regla. */
    for (const [politica, , posicion, cuerpo] of politicasDeTabla(
      texto.replace(/\r\n/g, '\n').split('\n')
        .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n'))) {
      if (yaNoEsta(politica, nombre, posicion, bajas)) continue;
      resoluciones += [...cuerpo.matchAll(COMPARA_ORGANIZACION)].length;
    }
    if (nombre.slice(0, 4) >= LA_PUERTA_SE_CERRO) {
      /* Sin los renglones comentados, igual que la regla: la 0047 cita un
         `grant` adentro de un comentario para explicarlo, y contar eso sería
         contar prosa. */
      const limpio = texto.split('\n')
        .map((l) => (/^\s*--/.test(l) ? '' : l)).join('\n');
      for (const m of limpio.matchAll(GRANT_DE_TABLA)) {
        if (!/^\s*execute\b/i.test(m[1])) permisos++;
      }
    }
    enteras++;
    /* Y la cuenta de la decimotercera, del mismo lugar que la regla: cuántas
       se juzgaron de este lado del límite, y cuántos renombres quedaron del
       otro, que son los que este archivo va a seguir arrastrando. */
    if (nombre.slice(0, 4) >= NO_SE_RENOMBRA_DESDE) {
      quietas++;
    } else {
      const sinProsa = texto.split('\n')
        .map((l) => (/^\s*--/.test(l) ? '' : l)).join('\n');
      for (const [, expresion] of RENOMBRA_LO_GUARDADO) {
        renombres += [...sinProsa.matchAll(expresion)].length;
      }
    }
    /* Cada vez que una migración escribe una de las funciones que se abren sin
       sesión. Se cuentan las veces y no las funciones distintas a propósito:
       una función reescrita más adelante vuelve a pasar por la regla, que es
       lo que hay que poder decir. */
    for (const m of texto.matchAll(FUNCION_CON_PARAMETROS)) {
      if (AL_ALCANCE_ANONIMO.has(m[1].toLowerCase())) puertas++;
    }
    if (nombre.slice(0, 4) >= EL_AVISO_EMPIEZA && CAMBIA_EL_ESQUEMA.test(
      texto.split('\n').map((l) => (/^\s*--/.test(l) ? '' : l)).join('\n'))) {
      avisos++;
    }
    for (const m of texto.matchAll(INSERTA)) {
      const corte = texto.indexOf(';', m.index);
      const sentencia = texto.slice(m.index, corte > 0 ? corte : texto.length);
      if (/from\s+(?:"?public"?\.)?"?tenants"?\b/i.test(sentencia) && !ACOTADA.test(sentencia)) {
        siembras++;
      }
    }
    for (const [renglon, motivo] of
      fallasDeUnaMigracion(texto, tienenColumna, primarias, sigue, nombre, bajas,
                           alcance, vistas)) {
      fallas.push(`supabase/migrations/${nombre}:${renglon}  ${motivo}`);
    }
  }

  if (fallas.length > 0) {
    console.error('Migraciones que incumplen una regla del esquema:\n');
    for (const falla of fallas) console.error('  - ' + falla);
    console.error(
      `\n${fallas.length} ${fallas.length === 1 ? 'incumplimiento' : 'incumplimientos'}. ` +
      'Las quince reglas están en el encabezado de este archivo, con el porqué de cada\n' +
      'una. La RLS y la revocación van en la misma migración que crea la tabla o la\n' +
      'función, nunca en una posterior y nunca a mano desde el panel de Supabase; la\n' +
      'columna de Organización, la clave primaria y la moneda pueden llegar después,\n' +
      'pero tienen que llegar, y la clave tiene que ser `uuid`.\n' +
      'Y una siembra que recorre las Prestadoras de hoy deja un disparador sobre\n' +
      '`tenants`, en ésta o en otra migración, o la que nazca mañana arranca sin eso.\n' +
      'Y toda política del depósito de archivos nombra la Organización, porque ahí\n' +
      'no hay columna que la nombre por ella. Y la Organización sale siempre de la\n' +
      'membresía de quien inició sesión, nunca de un valor que arme quien llama.\n' +
      'Y ningún permiso de tabla concede `all` ni `truncate`, que se salta la RLS\n' +
      'entera: los verbos se escriben uno por uno.\n' +
      "Y toda migración que cambia el esquema termina con `NOTIFY pgrst, 'reload\n" +
      "schema';`, al final y no en el medio: lo que se escriba detrás del aviso queda\n" +
      'afuera de esa recarga, y PostgREST contesta 404 en algo que sí existe.\n' +
      'Y toda política que deja escribir nombra la Organización en la condición que\n' +
      'gobierna la fila que queda escrita, que es el `with check` cuando está y el\n' +
      '`using` cuando no: pedirla sólo para leer deja entrar y deja mudar la fila a\n' +
      'otra Prestadora.\n' +
      'Y la Organización se resuelve en un solo lugar: toda política se la pide a\n' +
      '`public.prestadora_actual()` en vez de rehacer la cuenta, y ninguna otra\n' +
      'función la deduce. Una condición copiada contesta lo mismo hoy y no aprende\n' +
      'lo que la función aprenda mañana.\n' +
      'Y lo que ya está guardado no se renombra: el nombre viejo queda en los\n' +
      'datos de antes y en toda migración anterior, que no se puede editar. Si\n' +
      'el nombre de hoy quedó mal, se agrega lo nuevo y se deja de escribir lo\n' +
      'viejo.\n' +
      'Y toda migración entra entera o no entra: nada corta la transacción que la\n' +
      'envuelve, y nada que no pueda correr adentro de una se escribe adentro de\n' +
      'ella, porque eso no falla hoy sino el día que se aplica.\n' +
      'Y quien llega sin sesión entra por la puerta de una Prestadora o no entra:\n' +
      'a `anon` no le queda ningún permiso sobre una tabla ni una vista de `public`,\n' +
      'salvo la vista que se abrió a propósito, que además tiene que seguir\n' +
      'acotando adentro de su cuerpo lo que publica —y sólo para leer—,\n' +
      '—y lo que cuenta es el neto de todas las migraciones, no lo que diga ésta—,\n' +
      'y la función que sí se abre sin sesión recibe el nombre corto, lo compara\n' +
      'contra `slug` y no escribe `is null or`, que con el nulo abre todas.\n' +
      'Si un caso no puede cumplirla, va a SIN_ORGANIZACION, a SIN_MONEDA, a\n' +
      'AL_ALCANCE_ANONIMO, a VISTAS_AL_ALCANCE_ANONIMO, a\n' +
      'TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO, a\n' +
      'SIN_ORGANIZACION_EN_EL_DEPOSITO o a\n' +
      'SIN_ORGANIZACION_AL_ESCRIBIR de este mismo\n' +
      'archivo, con el motivo escrito y el pendiente que lo sigue.');
    process.exit(1);
  }

  const conOrg = politicas - SIN_ORGANIZACION_EN_EL_DEPOSITO.size;
  console.log(
    `Esquema verificado: ${tablas} tablas con su RLS encendida donde se crean, su ` +
    `columna de Organización y clave primaria \`uuid\`, y ${funciones} funciones ` +
    `SECURITY DEFINER, ${AL_ALCANCE_ANONIMO.size} de ellas al alcance anónimo a ` +
    'propósito y las demás fuera de él ' +
    `(${SIN_ORGANIZACION.size} tabla y ${SIN_MONEDA.size} importe exentos, con su motivo). ` +
    `Las ${siembras} siembras que recorren las Prestadoras dejan además un disparador ` +
    'sobre `tenants`, así que la que nazca mañana nace igual que las de hoy. ' +
    `Y de las ${politicas} políticas del depósito de archivos, ${conOrg} ` +
    `${conOrg === 1 ? 'nombra' : 'nombran'} la Organización y ` +
    `${SIN_ORGANIZACION_EN_EL_DEPOSITO.size} están exentas con el motivo y con qué ` +
    'sostiene el aislamiento en su lugar. Ninguna condición saca la Organización ' +
    'de un valor que venga en el pedido: sale de la membresía. Y de los ' +
    `${permisos} permisos de tabla escritos desde la ${LA_PUERTA_SE_CERRO}, ninguno ` +
    'concede `all` ni `truncate` a quien inicia sesión. ' +
    `Y las ${avisos} migraciones desde la ${EL_AVISO_EMPIEZA} que cambian el esquema ` +
    "terminan con `NOTIFY pgrst, 'reload schema';`. " +
    `Y de las ${escrituras} políticas que siguen en pie y dejan escribir, todas ` +
    'nombran la Organización en la condición que gobierna la fila que queda escrita ' +
    `(${SIN_ORGANIZACION_AL_ESCRIBIR.size} exenta, con su motivo y con el permiso por ` +
    'columna que la sostiene, comprobado acá mismo). ' +
    `Y las ${resoluciones} veces que una política viva compara contra la columna ` +
    `de la Organización, las ${resoluciones} se la piden a \`public.${LA_RESUELVE}()\`: ` +
    'ninguna rehace la cuenta por su lado, y ninguna otra función la deduce. ' +
    `Y las ${quietas} migraciones desde la ${NO_SE_RENOMBRA_DESDE} no le cambian ` +
    `el nombre a nada de lo ya guardado: los ${renombres} renombres que hay son ` +
    'todos del acomodamiento del glosario, que cerró en la 0022. ' +
    `Y las ${enteras} entran enteras o no entran: ninguna corta la transacción ` +
    'que la envuelve, ni trae nada que no pueda correr adentro de una. ' +
    'Y quien llega sin sesión entra por la puerta de una Prestadora o no entra: ' +
    `de los ${alcance.cerrados} objetos de \`public\` que alguna vez estuvieron a su ` +
    `alcance no le queda ninguno, contando el neto de las ${migraciones.length} ` +
    `migraciones y siguiendo los renombres (${VISTAS_AL_ALCANCE_ANONIMO.size} vista ` +
    'abierta a propósito, que sigue acotando adentro de su cuerpo lo que publica y ' +
    `sólo deja leer, y ${TABLAS_DEL_PRODUCTO_AL_ALCANCE_ANONIMO.size} tabla de reglas ` +
    'del producto, que sigue sin columna de Organización y sólo deja leer, comprobado ' +
    'acá mismo); y las ' +
    `${puertas} veces que una migración escribe una de las ` +
    `${AL_ALCANCE_ANONIMO.size} funciones que sí se abren sin sesión, las ${puertas} ` +
    'exigen el nombre corto de una Prestadora, lo comparan contra `slug` y no ' +
    'dejan que el nulo abra todas.');
}
