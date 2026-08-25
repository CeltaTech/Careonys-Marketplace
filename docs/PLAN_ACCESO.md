# Plan: la sesión pasa a ser el límite

> Inventario y plan previos a tocar código, como pide `CLAUDE.md` §6. Cierra los pendientes 1 y
> 4, y destraba el 19 y el 2.
>
> Fecha: 24 de agosto de 2026.

## 1. Qué hay hoy

**La base ya está lista; la aplicación no.** La migración 0002 dejó bien resuelto el lado del
servidor: `public.prestadora_actual()` (`0002_aislamiento_por_prestadora.sql:34`) devuelve la
Prestadora de quien inició sesión leyéndola de `profiles`, y las políticas de las cinco tablas
preguntan ahí y en ningún otro lado. La sonda lo confirma: seis de las ocho tablas que nombra el
código rechazan a quien no inició sesión.

Lo que falta está todo del lado del navegador, y son cinco cosas:

| # | Qué | Dónde se ve |
|---|---|---|
| 1 | **No existe pantalla de acceso.** `requireAuth()` redirige a `app.html`, que no está en el proyecto. Los únicos formularios de acceso viven adentro de las dos aplicaciones móviles | `js/auth.js:65`; `pwa-asistente/index.html:672`, `pwa-familia/index.html:905` |
| 2 | **Nadie llama a `requireAuth()`.** `panel-prestadora.html` muestra legajos sin preguntar quién entra. Hoy lo tapa la RLS, no la pantalla | `panel-prestadora.html` |
| 3 | **Nada crea la fila de `profiles`.** No hay disparador sobre `auth.users`. Sin esa fila `prestadora_actual()` devuelve nulo, y una política que compara contra nulo **nunca** da verdadero: con sesión y todo, la aplicación no lee ni escribe nada suyo | `0001_esquema_inicial.sql:149`; no hay ningún `create trigger` en las cuatro migraciones |
| 4 | **La Prestadora sale de la barra de direcciones** y viaja como un filtro más en cada consulta | `js/apiClient.js:20-40` y `:347` |
| 5 | **La contraseña inicial es el DNI.** Un dato que la persona escribe tres renglones más arriba en el mismo formulario, y que además figura en cualquier fotocopia de su documento | `registrar-asistente.html:962` |

**El punto 3 es el que explica todo lo demás.** Mientras no exista, iniciar sesión no cambia
nada: el usuario autenticado ve exactamente lo mismo que el anónimo, porque su Prestadora es
nula. Por eso el alta pública falla con `42501 permission denied for table caregivers` y por eso
`initTenant()` necesitó el remiendo del UUID escrito a mano.

**Falta además una columna.** `caregivers` no tiene forma de saber a qué cuenta pertenece cada
legajo: no hay `user_id`. Sin eso no se puede escribir "cada quien ve el suyo".

## 2. La trampa que hay que esquivar

La salida obvia al punto 3 es un disparador que copie el `tenant_id` de los metadatos del
registro. **Eso no sirve**, y por el mismo motivo que no servía `?tenant=`: los metadatos los
elige quien se registra. Alguien pone el identificador de otra Prestadora, `prestadora_actual()`
se lo devuelve, y las políticas de la 0002 le entregan los legajos ajenos. Sería cambiar una
barra de direcciones falsificable por un formulario de registro falsificable.

Lo que hace falta es separar dos cosas que hoy están pegadas: **a qué Prestadora pertenece
alguien** y **qué puede ver de ella**.

## 3. Qué se construye

### Migración 0005

1. **`caregivers.user_id`**, referencia a `auth.users`, para atar cada legajo a su cuenta.
2. **Disparador sobre `auth.users`** que crea la fila de `profiles`. Toma el nombre y la
   Prestadora de los metadatos del registro, pero **el rol no**: quien se registra solo queda
   siempre con un rol sin acceso a los datos de la Prestadora. La Prestadora se valida contra
   `tenants`; si no existe, la fila queda sin Prestadora en vez de inventarla.
3. **`public.es_personal_de_prestadora()`**, punto único de verdad (regla 7), con las mismas
   precauciones que `prestadora_actual()`: `security definer`, sin permiso para el anónimo, con
   permiso para la sesión autenticada.
4. **Políticas en dos niveles** sobre `caregivers` y sobre las siete tablas del legajo:
   - el personal de la Prestadora ve y edita todo lo de **su** Prestadora;
   - un Asistente ve y edita **su propia** fila y su propio legajo, y nada más;
   - nadie ve nada de otra Prestadora, en ningún caso.
5. **El alta pública puede crear su legajo** y sólo el suyo: la política de inserción exige que
   el `user_id` sea el de quien escribe y que el `tenant_id` sea el de su perfil.

### Aplicación

6. **`acceso.html`**: la pantalla de inicio de sesión que no existe. Con los cuatro estados de la
   regla 3 y sin mostrar el texto crudo del error (regla 5.1).
7. **`requireAuth()` apunta a `acceso.html`** y lo llama `panel-prestadora.html`.
8. **`initTenant()` da vuelta el orden**: con sesión, la Prestadora sale de la sesión. La barra de
   direcciones sigue eligiendo **qué directorio se muestra** a quien no inició sesión, que es lo
   único que puede hacer sin datos detrás, y deja de decidir el acceso.
9. **El alta pide contraseña** y deja de usar el DNI. Con confirmación y mínimo de ocho
   caracteres.
10. **El alta inicia sesión antes de escribir**, así los adjuntos del legajo llegan a Storage
    (pendiente 19).

## 4. Lo que queda afuera a propósito

- **Qué muestra el directorio** lo decidió el Desarrollador el 24 de agosto de 2026
  (pendiente 2): se ve sin iniciar sesión, con nombre y foto, y los datos de contacto no
  salen nunca. Este plan no lo resolvía; sólo hizo que el directorio dejara de ser la puerta
  de los datos.
- **Los roles conservan sus nombres actuales.** `profiles.role` guarda hoy `familiar` y
  `caregiver`, en inglés y mezclados. Renombrarlos es migrar datos guardados, y eso se consulta
  antes (`CLAUDE.md` §7). Se agrega `coordinador`, que el glosario ya aprobó (§1), y nada más.
- **El alta de personal de la Prestadora no se construye acá.** Hoy esas cuentas se cargan a
  mano; que una Prestadora pueda invitar a su gente es una pantalla propia y va después.

## 5. Cómo quedó

**Ejecutado el 24 de agosto de 2026.** Los diez puntos de la sección 3 están hechos y probados.
Lo que sigue es lo que salió distinto de lo planeado, que es la única parte de un plan que vale
la pena guardar después de ejecutarlo.

### Apareció una migración que el plan no tenía: la 0006

El punto 10 daba por sentado que los adjuntos fallaban por falta de sesión. **Era necesario pero
no alcanzaba.** Al mirar el servidor de verdad, `storage.objects` **no tenía ni una sola
política**: un volcado del esquema `storage` no devuelve ningún `create policy`. Con o sin
sesión, subir estaba prohibido para todo el mundo.

Los dos depósitos existían igual, y eso es lo segundo que apareció: los creó alguien a mano desde
el tablero, sin migración que los declarara — contra la regla 9. Ahora los declara
`supabase/migrations/0006_archivos_del_legajo.sql`, junto con las tres políticas:

- **El permiso sale de la primera carpeta del camino.** Cada archivo vive en
  `<cuenta>/<archivo>`, y la política compara esa carpeta con la cuenta de la sesión. No hay
  forma de escribir en la carpeta de otro.
- **`documentos-cuidadores` es privado y `avatares` es público.** El primero guarda documento de
  identidad, antecedentes penales y título: una dirección adivinable ahí es repartir documentos.
  El segundo guarda la foto, y un directorio sin caras no es un directorio.
- **El personal de la Prestadora lee los documentos de su Prestadora**, y solo los de ella: la
  política cruza la carpeta contra `caregivers` y contra `prestadora_actual()`.

### Se guarda el camino, no la dirección

Una dirección firmada vence. Guardarla es guardar algo que dentro de un rato deja de funcionar,
así que en la base queda `<cuenta>/<archivo>` y la dirección se firma al mostrarla
(`Sesion.urlFirmada`, `js/auth.js:176`; quince minutos en la pantalla de auditoría).

### Un arreglo que no estaba en el plan

La pantalla de auditoría metía el texto que escribió quien se postula adentro de `innerHTML` sin
escapar. Es texto que lo elige un desconocido y se dibuja en la pantalla del personal de la
Prestadora, que es justo la que tiene permisos. Quedó arreglado ahí (`esc()`), y **el resto de
las pantallas sigue igual**: es el pendiente 22.

### Lo que quedó a mitad de camino, y no por el código

Contra el servidor remoto el alta **todavía no termina de una sentada**: el proyecto exige
confirmar el correo, así que el registro devuelve la cuenta creada pero sin sesión, y sin sesión
no se escribe nada. La pantalla lo dice en vez de fallar en silencio. Es una decisión del
Desarrollador, no un arreglo de código, y está anotada como pendiente 21.

### Cómo se probó

`scripts/probar_aislamiento.mjs` pasó de nueve comprobaciones a dieciséis; con dos Prestadoras
ficticias, las veinticinco de la corrida completa dan verde. Y se falsificaron a propósito
—abriendo una política permisiva sobre `storage.objects`— para verificar que cuatro de ellas se
ponen rojas: una prueba que no puede fallar no prueba nada (`CLAUDE.md` §7).

El recorrido completo se hizo además en el navegador contra un servidor local: alta con los cinco
archivos, sesión de coordinadora que ve exactamente los tres legajos de su Prestadora, sesión de
Asistente rebotada de esa pantalla, sin sesión mandada a `acceso.html`, y los tres enlaces
firmados abriendo el archivo — y el mismo camino sin firma devolviendo error.
