# Esquema de base de datos

> **Cómo se diseña la base de este proyecto.** Cuando esto se escribió no había ninguna
> migración; al 2 de septiembre de 2026 hay 67 aplicadas y 35 tablas, y lo de abajo sigue siendo
> la regla con la que se escribe cada una. La cuenta la mide `node scripts/verificar_esquema.mjs`.
>
> La §1 desarma cinco errores de seguridad sobre veinte renglones de SQL. Está primero a propósito:
> son sutiles, se escriben sin darse cuenta y ninguno da error al aplicarlo. Las reglas de la §2
> salen de ahí.

---

## 1. Cinco errores que no se repiten

### 1.1 Las políticas permisivas se combinan con O, no con Y

Es la trampa central y la que hace que todo lo demás no importe. Cuando una tabla tiene varias
políticas permisivas —las normales, las que no dicen `AS RESTRICTIVE`—, Postgres deja pasar la
fila si **alguna** de ellas la aprueba. No hace falta que la aprueben todas.

Sobre una tabla `caregivers` con datos personales:

```sql
CREATE POLICY "Tenant Isolation Caregivers" ON caregivers
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Public Approved Caregivers" ON caregivers
  FOR SELECT USING (verification_status = 'validado');
```

La primera parece resolver el aislamiento. **La segunda lo anula por completo**: no filtra por
Prestadora, no exige sesión, y le alcanza con que la fila esté validada. Cualquiera con la clave
pública —la que viaja adentro de cada pantalla— lee **todos los Asistentes validados de todas las
Prestadoras**.

Y esa tabla guarda `dni`, `cuit`, `address`, `bank_info` con el CBU, `birthdate`, `phone` y
`email`. Es una filtración de datos personales, no un problema de diseño.

### 1.2 `USING (true)` no filtra nada, diga lo que diga el comentario

```sql
-- 4. Política: Los registros de bitácora son públicos para lectura dentro del tenant
CREATE POLICY "Tenant Logbook Read" ON logbook_entries
  FOR SELECT USING (true);
```

El comentario dice "dentro del tenant". El código dice **todos**. La tabla —que entonces se
llamaba `logbook_entries` y desde la 0019 se llama `reportes`— guarda presión
arterial, glucemia y medicación administrada: datos clínicos de Pacientes, abiertos a quien
pregunte.

La tabla ni siquiera tiene columna de Prestadora, así que aunque se quisiera filtrar no habría con
qué.

### 1.3 El claim que nadie escribe

```sql
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
```

Si nada escribe `tenant_id` dentro del token, esa expresión compara contra `NULL` y no filtra por
nada. Es el mismo defecto que Careonys tuvo abierto durante semanas como su pendiente más grave.

**La lección de allá, que acá se aplica de entrada:** la Prestadora se resuelve por **membresía
verificada del usuario autenticado**, consultada contra una tabla, nunca desde un claim que
alguien tiene que acordarse de escribir en otro lado.

### 1.4 Dos errores más del mismo bloque

`clock_ins` compara `caregiver_id::text = auth.uid()::text`. Son dos identificadores distintos: uno
es la clave de la tabla de Asistentes, el otro el usuario de Auth. **Nunca coinciden**, así que
ningún fichado se puede registrar.

`tenants` y `avisos` quedaron con RLS activada y **cero políticas**, o sea que niegan todo.
Como el cliente resuelve la Prestadora leyendo `tenants` por slug, eso hoy no puede funcionar.

### 1.5 Lo que hay que entender de todo esto

Cinco fallas distintas en veinte renglones. Ninguna da error al aplicarse: la base acepta el SQL,
las tablas quedan creadas y todo parece funcionar. **Una revisión que mire las columnas y no las
políticas las deja pasar enteras.**

Por eso las reglas de abajo no son sugerencias, y por eso el aislamiento se comprueba con la
prueba de la §3 y no leyendo el SQL.

---

## 2. Reglas del esquema nuevo

1. **Claves primarias UUID** en todas las tablas, sin excepción. Es lo que permite fusionar con
   Careonys sin remapear relaciones.
2. **`prestadora_id` en toda tabla con datos propios de una Organización.** De las 35 de hoy sólo
   dos no la llevan: `tenants`, que **es** la Organización, y `patrones_de_contacto`, catálogo común.
3. **RLS activada en la misma migración que crea la tabla.** Nunca aplicada después a mano desde
   el dashboard.
4. **Una sola política permisiva de lectura por tabla y por rol.** Si hacen falta dos condiciones,
   van dentro de la misma expresión con `AND`, o la segunda se escribe `AS RESTRICTIVE`. Nunca dos
   permisivas donde una sea más ancha que la otra.
5. **Ninguna política usa `USING (true)`.** Si una tabla parece necesitarlo, la que falta es la
   columna de Prestadora.
6. **La Prestadora se resuelve por membresía verificada**, consultada contra una tabla, nunca
   desde un claim del token ni desde un header, un subdominio o un parámetro: eso lo falsifica
   quien llama.
7. **Un solo punto de verdad para esa resolución**: una función SQL que todas las políticas
   consumen, nunca la misma condición repetida política por política.
8. **Toda función `SECURITY DEFINER` revoca `PUBLIC` y `anon`** en la misma migración que la crea.
   Las que consumen las políticas conservan `authenticated` y solo pierden el anónimo — y cuál de
   los dos casos es se verifica **probando contra una tabla cuya política llame a esa función**,
   no contra cualquier tabla. Ver la regla de la empresa «la base de datos: sólo por migraciones».
9. **Toda migración versionada en `supabase/migrations/`.** Hoy el esquema vive solo dentro de
   Supabase y no hay forma de reconstruirlo.
10. **Los nombres salen del glosario.** `caregivers` es Asistente, `tenants` es Prestadora,
    `especialidades` es Tipo de Asistente. Y una vez creado, un nombre no se renombra.
11. **Todo importe con su moneda al lado.** `hourly_rate` guarda un número sin decir de qué país.

---

## 3. Cómo se comprueba que el aislamiento funciona

**El seed carga al menos dos Prestadoras con datos.** No es opcional: es la única forma de
distinguir "aislado" de "todo bloqueado".

La prueba tiene tres partes, y las tres tienen que pasar:

1. Con la sesión de la Prestadora A, pedir cada tabla: devuelve **sus** filas, una lista con datos.
2. Esa misma respuesta no contiene **ninguna** fila de B.
3. Lo mismo en espejo con la sesión de B.

**Si el punto 1 devuelve una lista vacía teniendo datos cargados, el aislamiento no está
funcionando: está todo bloqueado.** Una prueba que da el mismo resultado con el sistema sano y con
el sistema roto no prueba nada.

Y una cuarta, que solo se puede hacer ahora: **intentar romperlo a propósito.** Pedir con la clave
pública sin sesión, llamar cada función de la base sin token, adivinar rutas de archivos de otra
Prestadora. Con datos ficticios sale gratis; con datos reales no se puede hacer nunca más.

---

## 4. Insumos para el diseño

- **`docs/TABLAS_QUE_FALTAN.md`** tiene el diseño de diez tablas, de las que hoy siguen sin
  existir siete: videollamadas, reseñas, puntos, notificaciones, favoritos, pagos y moderación
  —más `configuracion`, que no es de negocio—. Salió del plan heredado, borrado el 25 de agosto de
  2026 porque su arquitectura estaba descartada y sus otras doce tablas ya estaban construidas con
  otro nombre. Se usa como entrada, no como plan: **nada de eso está aprobado**, y cada ficha dice
  qué hay que decidir antes. Ya viene con el vocabulario del glosario y con las cinco reglas que
  ninguna de esas tablas puede saltearse —empezando por `prestadora_id`, que ninguna tenía.
- **`docs/INVENTARIO.md` §3** lista lo que el código realmente consulta hoy.
- **El esquema de Careonys** es la referencia de vocabulario para todo concepto que exista allá.

**No se escribe una sola tabla hasta resolver las decisiones abiertas** de `docs/PENDIENTES.md`:
cómo se llama esto en el código, y qué módulos son de acá y cuáles son de Careonys. Las dos
cambian qué tablas hacen falta.
