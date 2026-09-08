# Plan — las columnas que ninguna política mira

> **Estado: aprobado, ejecutado y aplicado el 31 de agosto de 2026.** El Desarrollador lo aprobó
> entero y eligió además la **opción A** del punto 5: cambiar un papel devuelve el sello a «sin
> revisar». Todo lo que se hizo está en
> `supabase/migrations/0047_las_columnas_que_ninguna_politica_miraba.sql`, aplicada a la base de
> esta máquina y a la publicada, y contado en `docs/ALCANCE.md`, sección «Las cuatro columnas que
> ninguna política miraba». Los pendientes **66**, **74**, **75** y **82** están cerrados.
>
> **Este plan queda como lo que se proponía, y no se edita.** La migración lo cita en su renglón
> 4, y una migración aplicada no se toca nunca. Para saber cómo quedó de verdad, se lee
> `docs/ALCANCE.md`; acá está por qué se eligió lo que se eligió. Lo que el plan pedía y todavía
> no existe quedó anotado como pendientes **107** y **108** de `docs/PENDIENTES.md`.
>
> Escrito el 26 de agosto de 2026.

## 1. Qué tienen en común los cuatro

Los cuatro son el mismo defecto contado cuatro veces:

> **La política decide por fila, y lo que importa es qué columna se toca.**

Una política de RLS contesta «¿esta fila es tuya?». Cuando la respuesta es sí, quien pide escribe
la fila **entera**, incluidas las columnas que guardan el veredicto de otro. Es la diferencia
entre «este legajo es tuyo» y «este legajo es tuyo *y además podés decidir si está aprobado*».
Hoy el producto dice lo primero y hace lo segundo.

| # | La fila que sí es suya | La columna que no tendría que serlo |
|---|---|---|
| 66 | El legajo propio, `caregivers` | `verification_status` — el sello de la Prestadora |
| 74 | Un legajo de la propia Prestadora, `caregivers` | `user_id` — de quién es el legajo |
| 82 | El perfil propio, `profiles` | `role` y `tenant_id` — el rol y la Organización |
| 75 | El legajo propio, `caregivers` | `documents`, **después** de que el sello se puso |

Y los cuatro se rompen desde afuera del producto: alcanza un pedido a la dirección de datos con la
sesión propia. Ninguna pantalla es la barrera, y ninguna pantalla puede serlo.

## 2. Por qué el permiso por columna no alcanza

Es la primera respuesta que se le ocurre a cualquiera, y **para el 66 y el 74 está mal**. El
personal de la Prestadora y el Asistente **son el mismo rol de base de datos**, `authenticated`.
Un permiso se le da a un rol, no a una persona: quitarle la escritura de `verification_status` a
la persona validada se la quita también a quien tiene que validarla. Lo que distingue a los dos no
es el permiso; es la política.

Para el 82 sí alcanzaría —nadie, en ningún rol, tiene que poder escribirse el propio `role`—, y de
hecho es lo único que hoy lo sostiene: `grant update (full_name) on public.profiles to
authenticated`, en `supabase/migrations/0001_base_del_esquema.sql:5862-5864`. El problema del 82 no es
que el mecanismo falle: es que **la protección no vive donde se la lee**. Quien lea la política ve
«cada quien escribe su propia fila» y ningún límite de columnas; el límite está seis renglones
abajo. Ya se cayó una vez sin que nadie lo notara —la migración 0032 se lo llevó puesto y la 0033
lo repuso— y `scripts/probar_permisos_en_vivo.mjs` no lo habría visto, porque busca `GRANT ALL` y
esto sería un `GRANT UPDATE`.

## 3. La herramienta que se propone: un disparador por tabla

Un disparador `before insert or update` sobre cada una de las dos tablas. Es lo único que puede
mirar **el valor viejo y el nuevo de una columna** y decidir con eso. Una política no puede:
recibe la fila, no el cambio.

Por qué esto y no partir las políticas en ramas por operación:

- **Está donde se lo busca.** Un disparador sobre `caregivers` aparece al mirar `caregivers`. Un
  permiso escrito seis renglones más abajo, no.
- **Vale para los cuatro casos con una sola forma**, incluido el 75, que necesita comparar viejo
  contra nuevo y ninguna política puede hacerlo.
- **Falla cerrado.** Ante un rol desconocido o una membresía que no se pudo resolver,
  `public.es_personal_de_prestadora()` da falso y el cambio se rechaza.

Desventaja, dicha para que no sorprenda: un disparador corre en cada escritura. Sobre estas dos
tablas —altas y validaciones de legajo, no tráfico— no se nota.

**El permiso por columna del 82 se conserva igual.** Dos cierres para la misma puerta no es
redundancia inútil: es que el día que uno se caiga solo, el otro siga puesto. Lo que se agrega es
que el límite quede además escrito donde se lo lee.

## 4. Qué haría cada disparador

### 4.1 Sobre `caregivers` — cierra 66, 74 y 75

Una sola función, tres reglas:

- **`verification_status` sólo lo escribe el personal de la Prestadora.** Al insertar, el valor no
  se toma del pedido: lo pone el disparador en «sin revisar». Al actualizar, si el valor cambia y
  quien pide no es personal, se rechaza. Esto es lo que hoy deja que un legajo nazca sellado —
  comprobado, un alta con el sello adentro contestó `201`.
- **`user_id` no cambia de dueño.** Para nadie salvo el personal, y aun para ellos conviene que
  sea explícito y no un efecto de que la política no mire la columna.
- **`documents`**, según lo que se decida en el punto 5.

### 4.2 Sobre `profiles` — cierra 82

Rechaza todo cambio de `role` y de `tenant_id` hecho por quien no sea personal de la Prestadora.
Al insertar no aplica: esa fila la crea el disparador de alta, que corre con otros permisos.

## 5. Lo único que hace falta decidir, y es del Desarrollador

**Pendiente 75: qué pasa cuando alguien cambia un papel de un legajo ya validado.** Las tres son
defendibles. No la elijo yo porque no es una decisión técnica: es qué le promete la Prestadora a
la Familia que lee el directorio.

| | Qué hace | A favor | En contra |
|---|---|---|---|
| **A. Se cae el sello** | Cambiar `documents` pone el sello de vuelta en «sin revisar» | El sello nunca miente: siempre dice algo sobre los papeles que están hoy | Un cambio menor —una foto mejor del mismo papel— saca a la persona del directorio hasta que alguien vuelva a mirar |
| **B. Queda prohibido** | Con el sello puesto, `documents` no se toca; para cambiarlo, la Prestadora baja el sello primero | Simple, y no hay ninguna ventana en la que el directorio muestre algo falso | Obliga a pedirle a la Prestadora hasta para reemplazar un papel vencido |
| **C. Queda asentado** | El cambio se permite, se anota quién y cuándo, y la Prestadora lo ve como pendiente de revisar | No frena a nadie y deja rastro | **Mientras nadie revise, el directorio sigue diciendo «validado» sobre un papel que nadie miró.** Es la única de las tres que deja el sello mintiendo |

**Recomendación: A.** Es la que hace que el sello signifique siempre lo mismo, que es todo lo que
un sello tiene que hacer. El costo —volver a revisar tras un cambio de papel— cae sobre la
Prestadora, que es quien lo firma, y no sobre la Familia, que es quien no tiene cómo saber. Y ese
costo se puede bajar después sin tocar la seguridad, avisándole a la Prestadora que tiene un
legajo esperando.

**Lo que A necesita y hoy no existe:** que la persona vea, **antes** de cambiar un papel, que
hacerlo le baja el sello. Sin ese aviso, A se siente un castigo sorpresa. Es texto de catálogo en
tres idiomas y va en la misma tanda.

## 6. Cómo se prueba, y por qué la prueba puede fallar

Las pruebas van en el repositorio y no a mano, contra la base local, con cuentas inventadas y las
dos Prestadoras ficticias.

`scripts/probar_sello_de_la_prestadora.mjs` **ya existe y hoy da rojo a propósito** — mide el 66 y
es la que tiene que pasar a verde sin que se la toque. Las otras dos hay que escribirlas: una para
el cambio de dueño (74) y otra para el ascenso y la mudanza de Organización (82). La del 75 se
escribe cuando esté elegida la opción.

**Y cada una lleva su comprobación de sostén**, que es lo que la hace poder fallar. Sin eso,
cerrar la tabla entera dejaría todos los rechazos en verde sin haber arreglado nada:

| Prueba | Lo que tiene que ser rechazado | Lo que tiene que seguir saliendo bien |
|---|---|---|
| 66 | Nacer sellado; sellarse después | Corregirse el propio teléfono |
| 74 | Quedarse con el legajo de otro de la misma Prestadora | Que el personal edite un legajo de su Prestadora |
| 82 | Ascenderse a coordinador; mudarse a la Prestadora ajena | Corregirse el propio nombre |
| 75 | Lo que se elija en el punto 5 | Cambiar un papel de un legajo **sin** sellar |

## 7. El orden

1. El Desarrollador aprueba el plan y elige la opción del punto 5.
2. Se escriben las dos pruebas que faltan (74 y 82) y se comprueba que **den rojo** contra la base
   de hoy. Una prueba que arranca en verde no probó nada.
3. Una sola migración, con los dos disparadores, y `NOTIFY pgrst, 'reload schema';` al final.
4. Se corre todo contra la base local: las cuatro pruebas en verde y las tres que ya existían
   —aislamiento, alta y baja, permisos en vivo— sin moverse.
5. Se aplica a la base publicada, desde la línea de comandos con el CLI enlazado.
6. Recién ahí, el aviso de pantalla que pide la opción A, si es la elegida.

## 8. Lo que este plan no arregla, y hay que decirlo

**Lo que era el pendiente 70 se cruzaba con éste, y ya está cerrado.** La prueba del 66 dejó a la
vista que la tarjeta del intruso salía con la lista de comprobaciones vacía — que era exactamente
lo que salía en la tarjeta de cualquiera, porque ninguna pantalla cargaba esas comprobaciones. Esa
mitad la cerró el panel de la Prestadora el 1 de septiembre de 2026. La otra mitad sigue siendo de
este plan: cerrar los cuatro pendientes de acá impide que alguien se selle solo, que es cosa
distinta de que se vea quién lo revisó y con qué.
