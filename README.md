# Careonys Marketplace

> Leer `CLAUDE.md` antes de tocar cualquier código. Protocolo de sesión completo ahí.

Mercado público donde una Familia busca, compara y contrata un Asistente para el cuidado de un
Paciente. Producto de **CeltaTech**, hermano de Careonys (`productos/careonys/`), que es la
plataforma de gestión que usan las Prestadoras.

**Proyecto exploratorio.** Se construye para ver si el resultado satisface y su base no tiene
datos reales. **Pero está publicado en internet** (`careonys-marketplace-nu.vercel.app`).

**Si ese despliegue expone datos o no, no se puede saber leyendo el código.** Hay que consultarlo
contra la base real, no contra un documento. Hasta que esa consulta se haga, conviene bajar el
despliegue o protegerlo. Por qué esto no es una precaución exagerada: `docs/ESQUEMA.md` §1.

Comparte negocio y vocabulario con Careonys y en algún momento se integrará con él, pero hoy son
dos repositorios y dos proyectos de Supabase independientes.

**Careonys no se toca desde acá.** Ni sus archivos, ni su base, ni sus migraciones.

## Estado real

Sitio estático en HTML, CSS y JavaScript plano, en proceso de migración a React + Vite para
alinearse con el stack de Careonys.

| | |
|---|---|
| 12 pantallas HTML, 7.082 renglones | sin ruteo: cada pantalla es un archivo |
| 2.600 renglones de JavaScript propio | 1.606 de ellos embebidos en el HTML |
| 3.349 renglones de CSS en hojas de estilo | 32 variables con nombre, sin framework |
| 2.566 declaraciones más, pegadas al HTML | en 772 atributos `style=` |
| Supabase Auth funcionando | ninguna pantalla protegida |
| 4 dependencias, todas por CDN | sin `package.json` ni compilación |
| 6 tablas en Supabase | **sin migraciones en el repositorio** |

**Qué está construido y qué no lo dice `docs/ALCANCE.md`**, que es la referencia — no este archivo
ni ningún otro. Lo que queda abierto está en `docs/PENDIENTES.md`.

**El esquema no está versionado.** Las tablas existen dentro de Supabase y no hay ninguna
migración que las describa, así que no hay forma de reconstruirlas ni de saber qué se aplicó. Y
están nombradas en inglés (`caregivers`, `tenants`, `care_searches`), contra el glosario. Como la
base no tiene datos reales, se rehace — pero es más trabajo que escribir el esquema: hay que
migrar además el código que ya usa esos nombres.

## Qué documento manda sobre qué

Cuando dos digan cosas distintas, gana el de más arriba.

| | Documento | Autoridad sobre |
|---|---|---|
| 1 | **El código y la base** | Todo. Ningún documento sobrescribe lo que el código hace |
| 2 | `CLAUDE.md` | Las reglas. Qué se puede y qué no |
| 3 | `docs/GLOSARIO.md` | Cómo se llaman las cosas. Copia de Careonys; el original manda |
| 4 | `docs/ALCANCE.md` | Qué está construido y qué no |
| 5 | `docs/PENDIENTES.md` | Lo abierto, con condición de cierre |
| 6 | `docs/ESQUEMA.md` | Cómo se diseña la base |
| 7 | `docs/DISENO.md` | Cómo se traduce el estilo actual al sistema de Careonys |
| 8 | `docs/INVENTARIO.md` | Anatomía del código actual |

**Ningún otro documento afirma estado.** Los que quedan son material de diseño o legal, y cada uno
lo dice en su encabezado.

## Estructura

```
Careonys-Marketplace/
├── CLAUDE.md                   ← reglas no negociables, leer primero
├── docs/
│   ├── GLOSARIO.md             ← copia del glosario de Careonys; el original manda
│   ├── ALCANCE.md              ← qué existe y qué no. Referencia única
│   ├── ESQUEMA.md              ← reglas de la base y el error que no se repite
│   ├── INVENTARIO.md           ← anatomía del código actual
│   ├── PENDIENTES.md           ← lo abierto, con condición de cierre
│   ├── DISENO.md               ← equivalencias de estilo con Careonys
│   ├── CAREONYS_PRESDEMO_Plan_Tecnico.md   ← material de diseño; arquitectura descartada
│   ├── modelo_de_negocios_*.md             ← material de diseño; decisión comercial abierta
│   └── terminos_y_condiciones_*.md         ← borradores legales sin revisión de abogado
├── *.html                      ← las 12 pantallas del sitio, una por archivo
├── css/                        ← styles.css, mockup-app.css
├── js/                         ← apiClient.js, auth.js, main.js
├── assets/images/
├── data/                       ← JSON locales de la demo, hoy sin uso
├── pwa-asistente/              ← aplicación instalable para Asistentes
├── pwa-familia/                ← aplicación instalable para Familias
└── vercel.json
```

**`supabase/migrations/` todavía no existe.** Se crea con la primera migración; no se anticipan
carpetas vacías.

`apiClient.js` y `auth.js` existen **tres veces** —raíz, `pwa-asistente/`, `pwa-familia/`—
idénticos byte a byte. La duplicación desaparece en la migración, cuando haya imports reales.

Las carpetas de la aplicación nueva se agregan cuando llegue su turno — no se anticipan carpetas
vacías.

## Entorno de desarrollo

El sitio actual es estático. Alcanza con servir la raíz:

```bash
npx serve .          # queda en http://localhost:3000
```

Para la base, con Docker Desktop abierto:

```bash
npx supabase start     # levanta la base local
npx supabase db reset  # aplica migraciones y carga datos de prueba
```

El seed carga **al menos dos Prestadoras con datos**, a propósito: es lo que permite comprobar el
aislamiento. Una prueba que devuelve una lista vacía no distingue "aislado" de "todo bloqueado".

Copiar `.env.example` a `.env.local` y completar los valores antes de levantar nada. Los `.env`
nunca se suben (ver `.gitignore`).

## Decisiones abiertas que bloquean el esquema

1. **Cómo se llama esto en el código.** La palabra "marketplace" ya significa otra cosa en el
   glosario heredado. Ver `docs/GLOSARIO.md` §4.
2. **Qué se construye acá y qué es de Careonys.** Bitácora de salud, signos vitales, check-in y
   reportes diarios ya existen allá. Ver `docs/ALCANCE.md` §3.

Ninguna de las dos se resuelve escribiendo código.
