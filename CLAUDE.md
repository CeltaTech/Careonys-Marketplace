# CLAUDE.md — Reglas propias de Careonys Marketplace

> **Acá está sólo lo que es exclusivo de este producto.** Lo demás no se repite, se consulta:
>
> | Qué | Dónde | Cómo llega |
> |---|---|---|
> | Lo común a todos los productos de CeltaTech | `..\..\CLAUDE.md` | **Se lee solo**, porque la línea de comandos junta los `CLAUDE.md` hacia arriba |
> | Lo de Careonys y el Marketplace | `..\..\docs\REGLAS_PRODUCTOS_CAREONYS.md` | **A mano, al empezar** |
> | El glosario de los dos | `..\..\docs\GLOSARIO_PRODUCTOS_CAREONYS.md` | **A mano, al empezar** |
> | Lo de este producto | este archivo | Se lee solo |
>
> Si una regla está escrita arriba, acá no se escribe. Si aparece repetida, se borra de acá.

## 1. Este producto es exploratorio, y qué permite

**La base no tiene datos reales y se rehace entera cuantas veces haga falta.** Eso permite
equivocarse barato y hay que aprovecharlo: con datos inventados se puede **intentar romper el
aislamiento a propósito**, mientras el error no le cuesta nada a nadie.

**Lo que no se relaja.** Explorar el producto no es explorar el rigor. Lo que se relaje ahora se
paga en la fusión, y la seguridad no se relaja nunca.

## 2. El vocabulario de este producto

El glosario es el de los dos productos y **no se copia acá**. Lo único propio está en
`docs/GLOSARIO.md`: los términos que este producto necesita y que allá no existen. Cuando los
productos se fusionen, esa lista es la que se revisa para decidir cuáles suben.

**La palabra `marketplace` no se usa en ningún identificador de este proyecto** — ni sola ni como
parte de una palabra compuesta. El valor ya está guardado en tres tablas de Careonys nombrando
otra cosa. **El término técnico es `modalidad`** y el nombre visible «modalidad de este producto»;
«Careonys Marketplace» sigue siendo el nombre comercial. Decidido el 2026-08-24.

## 3. Lo propio de este producto en el desarrollo

**`prestadora_id` en toda tabla con datos de una Organización, aunque hoy siempre valga lo
mismo.** Es lo que hace que la fusión futura sea una actualización y no una migración.

**El seed carga siempre al menos dos Prestadoras con datos**, porque sin eso la prueba de
aislamiento no se puede correr.

**Los catálogos que todavía faltan.** Tipos de Asistente, zonas, modalidades de contratación,
condiciones fiscales, niveles educativos, patologías, tareas de cuidado, servicios ofrecidos,
cursos y sus evaluaciones. Cada lista de opciones que hoy esté escrita adentro de un componente
es una tabla que alguien no creó.

**Ninguna pantalla se porta sin haber extraído antes su contenido.** Si el componente nuevo lee de
una tabla que todavía no tiene filas, el contenido no migró: se perdió, y la pantalla vacía no
avisa.

**La tabla de equivalencias con el sistema de diseño de Careonys se hace una vez, antes de portar
la primera pantalla**, no al final.

**La lógica comercial sigue frenada** por `docs/ALCANCE.md` §4. Construirla se consulta antes.

### Módulos, desde el esquema

Todo lo que sea verdad sobre un Asistente, una Familia o un Paciente **independientemente de cómo
llegó el trabajo** se construye como módulo compartido. Lo que sólo existe porque el cliente busca
y elige se queda de este lado de la línea. **El reparto está en `docs/MODULOS.md` y se consulta
antes de escribir una tabla**, no después.

- La pregunta que decide cada caso: *¿esto seguiría teniendo sentido en prestación directa?* Si
  sí, es compartido.
- **Ninguna palabra propia de esta modalidad aparece en un módulo compartido** —directorio, aviso,
  postulación, contacto, puntaje, destacado—. Si aparece una, se filtró, y con ella se filtra el
  trabajo de sacarla más tarde.
- **Todo módulo se usa por API** —fijado por el Desarrollador el 2026-08-26, para Octo y módulos
  por igual—, así que acá no se instala nada: una dirección se llama desde el navegador, que es lo
  que ya se hace con la base, y este producto no espera a tener herramienta de armado. Todavía no
  hay ningún módulo creado, y hasta entonces lo compartido se sigue construyendo acá con el
  reparto de `docs/MODULOS.md`.
- Ya pasó lo que esto evita: `apiClient.js` está **triplicado byte a byte** (pendiente 13).

## 4. Protocolo de sesión

**Al iniciar**, además de los tres archivos de arriba: `docs/GLOSARIO.md`, `docs/PENDIENTES.md` y
`docs/ALCANCE.md`.

**Al cerrar cualquier tarea:** ¿se mantuvo el aislamiento entre Organizaciones? ¿RLS en toda tabla
nueva? ¿algún término nuevo sin aprobar? ¿algún catálogo escrito a mano? ¿los cuatro estados?
¿documentación al día? Si alguna respuesta es no, la tarea no está terminada.
