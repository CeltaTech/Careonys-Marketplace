# CLAUDE.md — Reglas no negociables de Careonys Marketplace

> Se lee primero, en cada sesión, antes de escribir una sola línea de código.
> Este archivo refleja siempre el estado **vigente** de las reglas — se actualiza solo cuando una
> regla cambia.

## 0. Qué es este proyecto y en qué se diferencia

**Es un proyecto exploratorio.** Se está construyendo para ver si el resultado satisface, no para
ponerlo en producción todavía. Eso permite equivocarse barato, y hay que aprovecharlo: la base no
tiene datos reales y se puede rehacer entera cuantas veces haga falta.

**Se va a fusionar con Careonys.** Hoy son dos repositorios y dos proyectos de Supabase
independientes, y así se quedan hasta que este producto tenga forma. Pero la fusión es la
intención declarada, y de ahí sale la única restricción que este proyecto se impone mientras
explora: **el vocabulario tiene que coincidir.** La forma es libre; los nombres no.

**El glosario vive en `docs/GLOSARIO.md` y es copia del de Careonys.** El original manda. Los
términos que este proyecto necesite y allá no existan van a la sección "Términos nuevos" de ese
archivo, nunca mezclados con los heredados.

**Hay un conflicto de nombre abierto** — la palabra "marketplace" ya significa algo en el glosario
heredado. Está descrito en `docs/GLOSARIO.md` §4 y **se resuelve antes de escribir la primera
tabla.**

**Lo que NO se relaja por ser exploratorio.** Explorar el producto no es explorar el rigor. Todo
lo que se relaje ahora se paga en la fusión, y las reglas de seguridad no se relajan nunca. Las
secciones 2, 4 y 5 valen igual que en el producto principal.

## 1. Dónde encaja

**CeltaTech** es la empresa propietaria del software. **Careonys** es su producto de gestión para
empresas de cuidado de personas, hoy en producción y con su propio repositorio. Este proyecto es
un tercer desarrollo que comparte negocio y vocabulario con Careonys, y que en algún momento se
integrará con él.

Careonys vive en `productos/careonys/`. **No se toca desde este proyecto**: ni se leen sus
archivos para modificarlos, ni se escribe en su base, ni se corren migraciones contra su proyecto
de Supabase. El único intercambio permitido es copiar el glosario en la dirección
Careonys → Marketplace.

## 2. Aislamiento multi-tenant

La entidad técnica que aísla datos es la **Organización** (una Organización = una Prestadora).
Vale desde el diseño inicial, no como adaptación posterior.

Toda funcionalidad nueva garantiza:

- aislamiento total entre Organizaciones, en **aplicación y base de datos**, nunca solo frontend;
- permisos evaluados siempre en el contexto de una Organización;
- cero accesos cruzados, ni siquiera accidentales;
- escalabilidad a cientos de Prestadoras sin rediseño estructural.

**Pregunta obligatoria ante cualquier decisión técnica:** *"¿Esto funciona correctamente cuando
existan cientos de Prestadoras usándolo simultáneamente?"* — no "¿funciona para una empresa?".

**Configuración sobre programación:** una diferencia entre Prestadoras es una característica de
negocio, no una excusa para código duplicado ni versiones especiales.

**Prueba de aislamiento con dos Organizaciones.** El seed carga siempre **al menos dos
Prestadoras con datos**. Una prueba que devuelve una lista vacía no distingue "aislado" de
"todo bloqueado": el aislamiento se comprueba viendo los datos propios y ninguno del otro. Con
datos ficticios se puede además intentar romperlo a propósito, y conviene hacerlo mientras el
error no le cuesta nada a nadie.

## 3. Glosario obligatorio

Vive en `docs/GLOSARIO.md`. Aplica a código, nombres de variables, tablas y componentes, claves de
traducción, texto visible, documentación y commits.

Antes de usar un término de negocio nuevo: verificarlo contra el glosario. Si no está, proponerlo
en "Términos nuevos" y esperar aprobación **antes** de usarlo en código.

**Verificación al cerrar cualquier tarea que tocó texto visible:** ¿se incorporó algún término
nuevo no aprobado? Si sí, la tarea no está terminada.

## 4. Seguridad y privacidad

- **RLS estricta en toda tabla nueva**, activada en la misma migración que crea la tabla, nunca
  aplicada después a mano desde el dashboard de Supabase.
- **Las políticas resuelven la Organización por membresía verificada del usuario autenticado**,
  nunca por un valor que venga en el pedido (header, subdominio, parámetro): esas fuentes las
  falsifica quien llama.
- **Ninguna función que se saltee la RLS queda al alcance de quien no inició sesión.** Una función
  `SECURITY DEFINER` del esquema `public` es además una dirección web, porque PostgREST publica
  ese esquema: si tiene permiso para `anon`, cualquiera con la clave pública la llama sin sesión.
  Toda función nueva de ese tipo **revoca explícitamente el permiso de `PUBLIC` y de `anon` en la
  misma migración que la crea** — revocarle a `PUBLIC` no alcanza, porque el de `anon` es una
  concesión aparte.
  - **Las que consumen las políticas conservan el permiso de la sesión autenticada**
    (`authenticated`) y solo pierden el anónimo: una política evalúa su expresión con los permisos
    de quien consulta, así que quitarle ese permiso a una función que las políticas usan no
    devuelve cero filas — **falla**, y deja la aplicación sin poder leer sus propias tablas.
    **Antes de revocar hay que verificar cuál de los dos casos es, probando contra una tabla cuya
    política llame a esa función**, no contra cualquier tabla: una tabla cuya política no la nombra
    pasa la prueba igual y da un falso positivo.
- **Toda credencial en variables de entorno**, nunca en código ni en el repositorio.
- **Datos sensibles** nunca en URLs, parámetros GET, logs ni mensajes públicos. Incluye los
  mensajes de error: el texto crudo de la base describe tablas, columnas y restricciones — el
  cliente recibe un mensaje genérico y el detalle queda en el log del servidor.
- **Nunca datos reales de personas en pruebas.** Solo datos ficticios.

**Regla final:** un error de configuración nunca debe permitir que una Organización acceda a
información de otra.

## 5. Reglas no negociables de desarrollo

1. **Nunca hardcodear** texto visible, precios, valores legales, reglas operativas ni datos de
   contacto — siempre desde configuración, base de datos o archivos de traducción. Incluye el
   nombre del producto y su marca.
   - **Ningún catálogo se escribe adentro de una pantalla.** Tipos de Asistente, zonas,
     modalidades de contratación, condiciones fiscales, niveles educativos, patologías, tareas de
     cuidado, servicios ofrecidos, cursos y sus evaluaciones: todos salen de la base. Una lista de
     opciones escrita en el componente es una tabla que alguien no creó.
   - **Los formularios se declaran, no se dibujan.** Campos, etiquetas, validaciones y pasos salen
     de una definición, no de etiquetas repetidas pantalla por pantalla.
   - **Ninguna pantalla se porta sin haber extraído antes su contenido.** Si el componente nuevo
     lee de una tabla que todavía no tiene filas, el contenido no migró: se perdió, y la pantalla
     vacía no avisa.
   - **Lo que persiste se nombra por su función, nunca por la marca.** Un identificador
     permanente —el código de un producto, el nombre de una tabla o columna, una clave de
     configuración— se nombra por lo que hace, y **una vez creado no se renombra**, aunque la
     marca cambie. Mezclar las dos cosas convierte un cambio de nombre en una migración de datos.
   - **El texto visible no tutea a quien lo lee.** Forma impersonal primero ("No se puede dar de
     baja la cuenta propia desde acá"), y **usted** cuando haya que dirigirse a una persona.
     Nunca "vos", "podés", "tenés", "revisá". Vale para pantallas, correos, avisos y mensajes de
     error — y también para lo que redacte un modelo de lenguaje, porque lo lee la misma persona.
   - **Un mensaje de error es texto visible.** Ninguna pantalla muestra lo que devuelven el
     navegador o la base tal cual: se clasifica el error y se muestra la frase que corresponde.
     El texto técnico queda en la consola.
2. **Multiidioma desde el día uno**: toda clave nueva se agrega simultáneamente en `es-AR`, `en`
   y `pt-BR`. No se construye una función en un solo idioma "para traducir después". *(Careonys ya
   tomó esta decisión; divergir acá es costo de fusión. Cada pantalla nueva encarece revertirla.)*
3. **Todo componente que carga datos maneja 4 estados**: cargando / error / vacío / listo.
4. **Toda operación destructiva requiere confirmación explícita**: qué se hará, qué consecuencia
   tiene, opción de cancelar.
5. **Todo botón que dispara una operación se deshabilita mientras está en curso** — nunca doble
   envío.
6. **Diseño visual con variables CSS**, sin framework y sin colores inventados fuera de la
   paleta. El sistema de diseño de este proyecto **se mapea contra el de Careonys** — la tabla de
   equivalencias se hace **una vez, antes de portar la primera pantalla**, no al final.
7. **Ningún patrón de lógica repetido sin punto único de verdad**: si la misma decisión
   (verificación de Organización, validación, cálculo, mapeo de estado a color) aparece en más de
   un lugar, existe una única función que todos consumen. Cuando la plataforma no permite
   compartir código —políticas RLS de Postgres—, el punto único es una función SQL reutilizada por
   todas las políticas.
8. **Antes de agregar un patrón que ya podría existir, buscarlo primero** (grep y lectura del
   código real). No asumir que no existe.
9. **Toda migración SQL vive versionada en `supabase/migrations/`.** Ningún cambio de esquema
   aplicado solo a mano contra el proyecto real.
10. **Claves primarias UUID en todas las tablas**, y `prestadora_id` en toda tabla con datos
    propios de una Organización, aunque hoy siempre valga lo mismo. Es lo que hace que la fusión
    futura sea un update y no una migración.
11. **Todo importe se guarda con su moneda.** Ningún campo de precio, honorario o cobro guarda un
    número solo. Un número sin moneda, leído un año después, no se sabe cuánto vale.
12. **Módulos, desde el esquema.** Todo lo que sea verdad sobre un Asistente, una
    Familia o un Paciente **independientemente de cómo llegó el trabajo** se construye
    como módulo compartido: lo usan igual prestación directa, esta modalidad,
    subcontratación y cualquier aplicación futura. Lo que sólo existe porque el
    cliente busca y elige se queda de este lado de la línea. **El reparto está en
    `docs/MODULOS.md` y se consulta antes de escribir una tabla**, no después.
    - La pregunta que decide cada caso: *¿esto seguiría teniendo sentido en
      prestación directa?* Si sí, es compartido.
    - **Ninguna palabra propia de esta modalidad aparece en un módulo compartido**
      —vidriera, aviso, postulación, contacto, puntaje, destacado—. Si aparece
      una, se filtró, y con ella se filtra el trabajo de sacarla más tarde.
    - No es prolijidad: una mejora sobre código partido en dos copias se hace dos veces o se
      hace una sola y la otra queda vieja. Ya pasó con `apiClient.js`, que está
      triplicado byte a byte (pendiente 13).

13. **Git**: commit + push tras cada conjunto de cambios coherente. Mensajes en español, formato
    `tipo: descripción breve`. Nunca subir `.env`, credenciales ni datos reales.

**Checklist antes de cerrar cualquier tarea:** ¿se respetaron las 13 reglas? ¿se mantuvo el
aislamiento entre Organizaciones? ¿RLS cubierta en toda tabla nueva? ¿términos del glosario
aprobados? ¿sin datos escritos a mano? ¿4 estados cubiertos? ¿documentación actualizada? Si alguna
respuesta es no, la tarea no está terminada.

## 6. Antes de un cambio grande

Hay cambios que no son una tarea más: rehacer el esquema, cambiar cómo se aísla una Organización,
decidir la integración con Careonys. Para esos el orden es siempre:

1. **Primero, un inventario.** Qué partes del código de hoy asumen las cosas como están y se van a
   ver afectadas.
2. **Después, un plan.** Proponerlo al Desarrollador y esperar aprobación.
3. **Recién ahí, tocar código.**

No se salta al paso 3 aunque el cambio ya esté decidido de palabra.

## 7. Protocolo de sesión

**Al iniciar:**

1. Leer `CLAUDE.md` (este archivo).
2. Leer `docs/GLOSARIO.md` y `docs/PENDIENTES.md`.
3. Confirmar con una línea: *"Leí los documentos correspondientes. Tarea de esta sesión: [X]."*
4. Presentar plan (objetivo, archivos afectados, cambios previstos, riesgos, validaciones) y
   **avanzar**. **Decidido por el Desarrollador el 24 de agosto de 2026: la aprobación
   está dada de antemano y no se espera turno por turno.** Frenar el trabajo para pedir un
   permiso que ya fue concedido cuesta más que equivocarse: este proyecto es exploratorio,
   la base no tiene datos reales y se puede rehacer entera. El plan se sigue presentando —es
   lo que permite corregir el rumbo— pero se presenta **junto con el trabajo hecho**, no en
   lugar de él.

   **Las cuatro cosas que sí se consultan antes**, porque no son reversibles ni baratas:
   - Renombrar algo que ya esté **guardado** en la base (regla 5.1: eso es migración de
     datos, no cambio de nombre).
   - Incorporar un **término de negocio nuevo** al glosario (§3) o resolver el
     conflicto de la palabra `marketplace` (`docs/GLOSARIO.md` §4).
   - Construir **lógica comercial**, que sigue frenada por `docs/ALCANCE.md` §4.
   - Cualquier cosa que toque **Careonys en producción**, que no se toca desde acá
     (§1).

   Todo lo demás se hace y se informa.

**Control de características.** Ante un pedido con más de una funcionalidad, antes de programar va
una lista explícita por característica: ✅ incluida tal cual / ⚠️ incluida con cambio (y por qué) /
❌ excluida (y por qué). Nada puede desaparecer dentro de un resumen general. Al terminar se repite
la misma lista contra lo prometido, no una narración.

**Documentación verificable.** Toda afirmación sobre una decisión ya tomada cita **archivo y línea
exacta** (`archivo.md:línea`), verificable en segundos. Nunca "según el proyecto..." ni "ya estaba
resuelto" sin decir dónde.

**Principio de certeza.** Nunca afirmar "está revisado / resuelto / no hay problemas" sin haber
hecho la comprobación en el momento. Si no se verificó, se dice así, no se disimula con una
respuesta que suene completa.

**Estado real por encima del documentado.** Un archivo de `supabase/migrations/` describe lo que se
quiso aplicar, no necesariamente lo que corre hoy: puede estar aplicado a medias o superado por
una migración posterior. Ninguna afirmación de "esto ya está migrado" se escribe ni se comunica
sin haber consultado el estado real de la base en ese mismo momento.

**Una prueba que no puede fallar no prueba nada.** Antes de dar por buena una verificación,
preguntarse qué resultado daría con el sistema roto. Si es el mismo, la prueba no sirve.

**Pendientes.** Todo lo que quede abierto va a `docs/PENDIENTES.md` con nombre, fecha y condición
de cierre. Antes de cerrar cualquier tarea se revisa esa lista completa, no de memoria.

**Cierre de sesión:** código y documentación actualizados, pendientes registrados, commit + push si
hubo cambios, compatibilidad con las reglas verificada — no asumida.
