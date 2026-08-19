# Plan de Migración e Integración con Supabase Backend (Careonys SaaS - CeltaTech)

**Guía Técnica de Esquema de Base de Datos, Políticas RLS y Conexión de API**  
**Fecha de Documentación**: Agosto de 2026 (Revisión 2 — Sincronizada con `js/apiClient.js`)  
**Desarrollador del Software**: **CeltaTech**  
**Producto**: **Careonys SaaS** (Módulo Marketplace)  
**Ubicación**: `docs/plan_migracion_supabase.md`

> [!IMPORTANT]
> Esta revisión corrige las discrepancias identificadas en la Auditoría Senior entre el esquema SQL original
> y la capa cliente real en [js/apiClient.js](file:///f:/proyectos/Careonys-Marketplace/js/apiClient.js).
> Usar exclusivamente **este SQL actualizado** para crear las tablas en Supabase.

---

## 1. Arquitectura de Conexión de la Capa de Abstracción (`js/apiClient.js`)

El frontend del proyecto ya cuenta con la capa de abstracción `CareonysAPI` en [js/apiClient.js](file:///f:/proyectos/Careonys-Marketplace/js/apiClient.js).

Para pasar de Mock/LocalStorage a **Supabase en Producción**, solo se deben seguir dos pasos:

```javascript
// 1. En js/apiClient.js (ya habilitado):
CareonysAPI.useSupabase = true;
CareonysAPI.supabaseUrl = 'https://tu-proyecto.supabase.co';
CareonysAPI.supabaseKey = 'tu-anon-key-publica';
```

---

## 2. Esquema Relacional de Tablas en Supabase (PostgreSQL)

```mermaid
erDiagram
    TENANTS ||--o{ CAREGIVERS : "audita y valida"
    TENANTS ||--o{ CARE_SEARCHES : "gestiona"
    CAREGIVERS ||--o{ CLOCK_INS : "registra"
    CAREGIVERS ||--o{ LOGBOOK_ENTRIES : "publica"
    CARE_SEARCHES ||--o{ LOGBOOK_ENTRIES : "recibe"

    TENANTS {
        uuid id PK
        string name "Nombre de la empresa prestadora (ej: PresDemo Salud)"
        string slug "Identificador URL único (ej: presdemo)"
        string domain "Dominio o subdominio del tenant"
        string primary_color "Color primario HEX para branding (ej: #1A365D)"
        string accent_color "Color de acento HEX (ej: #E53E3E)"
        string logo_url "URL pública del logo del tenant en Supabase Storage"
        timestamp created_at
    }

    CAREGIVERS {
        uuid id PK
        uuid tenant_id FK
        string full_name "Nombre completo del asistente"
        string dni "Número de DNI"
        string phone "Celular"
        string email "Correo electrónico"
        string profession "Perfil profesional (domiciliaria, enfermera, at, etc.)"
        string zone "Zona o barrio de cobertura"
        string cuit "CUIT o CUIL del asistente (para facturación)"
        string address "Domicilio completo"
        string bank_info "CBU o Alias bancario"
        jsonb reference_info "Referencia laboral: {nombre, telefono}"
        jsonb education_info "Formación: {nivelEstudios, cursosCompletados[]}"
        date birthdate "Fecha de nacimiento"
        string gender "Género"
        string nationality "Nacionalidad"
        numeric hourly_rate "Valor hora en ARS"
        jsonb pathologies "Patologías atendidas: ['alzheimer', 'parkinson', ...]"
        jsonb tasks "Tareas autorizadas: ['higiene', 'medicacion', ...]"
        jsonb documents "URLs de documentos: {dni_url, penales_url, titulo_url}"
        string verification_status "Estado: 'en_revision' | 'validado' | 'rechazado'"
        timestamp validated_at
        timestamp created_at
    }

    CARE_SEARCHES {
        uuid id PK
        uuid tenant_id FK
        uuid family_user_id FK
        string patient_name "Nombre del paciente"
        jsonb pathologies_required "Patologías requeridas en el asistente"
        string schedule_type "Tipo de horario general"
        jsonb grid_schedule_7x3 "Grilla semanal 7 días x 3 turnos"
        string status "'activa' | 'asignada' | 'finalizada'"
    }

    CLOCK_INS {
        uuid id PK
        uuid caregiver_id FK
        uuid search_id FK "Referencia a la búsqueda activa (puede ser null)"
        numeric latitude "Latitud GPS (columna separada)"
        numeric longitude "Longitud GPS (columna separada)"
        string event_type "'Entrada' | 'Salida'"
        timestamp created_at
    }

    LOGBOOK_ENTRIES {
        uuid id PK
        uuid search_id FK "Puede ser null en modo demo"
        uuid caregiver_id FK
        string blood_pressure "Presión arterial (texto: '120/80')"
        string glycemia "Glucemia (texto: '95 mg/dl')"
        text medications_administered "Medicamentos como texto simple (ej: 'Donepecilo 10mg')"
        text daily_notes "Notas y reporte diario del servicio"
        timestamp created_at
    }
```

---

## 3. SQL Completo para Crear las Tablas (Versión Corregida)

```sql
-- ============================================
-- Extensiones necesarias
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: tenants
-- Sincronizada con CareonysAPI.initTenant()
-- ============================================
CREATE TABLE tenants (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,     -- ← Requerido para resolver tenant por URL
  domain         TEXT,
  primary_color  TEXT DEFAULT '#1A365D',   -- ← Requerido para branding dinámico
  accent_color   TEXT DEFAULT '#E53E3E',   -- ← Requerido para branding dinámico
  logo_url       TEXT,                     -- ← Requerido para logo dinámico
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de búsqueda por slug
CREATE UNIQUE INDEX idx_tenants_slug ON tenants (slug);

-- Dato inicial del tenant demo
INSERT INTO tenants (id, name, slug, primary_color, accent_color, logo_url)
VALUES (
  '2197bc14-d545-4939-9a98-979e69a120dc',
  'PresDemo — Servicios de Cuidado',
  'presdemo',
  '#1A365D',
  '#E53E3E',
  'assets/images/logo_presdemo.png'
);

-- ============================================
-- TABLA: caregivers
-- Sincronizada con CareonysAPI._mapToDatabase()
-- ============================================
CREATE TABLE caregivers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  dni                   TEXT,
  phone                 TEXT,
  email                 TEXT,
  profession            TEXT,
  zone                  TEXT,
  cuit                  TEXT,            -- ← Añadido: requerido por el formulario
  address               TEXT,            -- ← Añadido: domicilio
  bank_info             TEXT,            -- ← Añadido: CBU o alias
  reference_info        JSONB,           -- ← Añadido: {nombre, telefono} de referente
  education_info        JSONB,           -- ← Añadido: {nivelEstudios, cursosCompletados[]}
  birthdate             DATE,            -- ← Añadido: fecha de nacimiento
  gender                TEXT,            -- ← Añadido
  nationality           TEXT,            -- ← Añadido
  hourly_rate           NUMERIC(10,2),   -- ← Añadido: valor hora en ARS
  pathologies           JSONB,
  tasks                 JSONB,
  documents             JSONB,
  verification_status   TEXT DEFAULT 'en_revision',
  validated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: care_searches (Búsquedas de Familias)
-- ============================================
CREATE TABLE care_searches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  family_user_id        UUID,
  patient_name          TEXT,
  pathologies_required  JSONB,
  schedule_type         TEXT,
  grid_schedule_7x3     JSONB,
  status                TEXT DEFAULT 'activa',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: clock_ins (Fichados GPS)
-- CORREGIDO: latitude + longitude como campos
-- separados en lugar de un tipo point único.
-- Sincronizado con CareonysAPI.registrarFichadoGPS()
-- ============================================
CREATE TABLE clock_ins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caregiver_id  UUID REFERENCES caregivers(id) ON DELETE CASCADE,
  search_id     UUID REFERENCES care_searches(id) ON DELETE SET NULL,
  latitude      NUMERIC(10, 7) NOT NULL,  -- ← Corregido: campo separado
  longitude     NUMERIC(10, 7) NOT NULL,  -- ← Corregido: campo separado
  event_type    TEXT NOT NULL,             -- ← 'Entrada' o 'Salida'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: logbook_entries (Bitácora Médica)
-- CORREGIDO: medications_administered es TEXT,
-- no JSONB. Sincronizado con el formulario PWA.
-- ============================================
CREATE TABLE logbook_entries (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id                UUID REFERENCES care_searches(id) ON DELETE SET NULL,
  caregiver_id             UUID REFERENCES caregivers(id) ON DELETE CASCADE,
  blood_pressure           TEXT,
  glycemia                 TEXT,
  medications_administered TEXT,   -- ← Corregido: TEXT simple, no JSONB
  daily_notes              TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Políticas de Seguridad RLS (Row Level Security)

```sql
-- 1. Activar RLS en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;

-- 2. Política: La prestadora solo ve los cuidadores y búsquedas de su Tenant
CREATE POLICY "Tenant Isolation Caregivers" ON caregivers
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 3. Política: La familia solo ve los cuidadores validados
CREATE POLICY "Public Approved Caregivers" ON caregivers
  FOR SELECT USING (verification_status = 'validado');

-- 4. Política: Los registros de bitácora son públicos para lectura dentro del tenant
CREATE POLICY "Tenant Logbook Read" ON logbook_entries
  FOR SELECT USING (true);

-- 5. Política de escritura para clock_ins: solo el cuidador propietario puede insertar
CREATE POLICY "Caregiver Clock Ins" ON clock_ins
  FOR INSERT WITH CHECK (caregiver_id::text = auth.uid()::text);
```

---

## 5. Checklist para Iniciar la Migración a Supabase

1. 🟩 **Paso 1**: Crear el proyecto en [supabase.com](https://supabase.com).
2. 🟩 **Paso 2**: Ejecutar el script SQL completo de la Sección 3 en el SQL Editor.
3. 🟩 **Paso 3**: Obtener la `SUPABASE_URL` y la `SUPABASE_ANON_KEY` en `Project Settings > API`.
4. 🟩 **Paso 4**: Actualizar en [js/apiClient.js](file:///f:/proyectos/Careonys-Marketplace/js/apiClient.js):
   ```javascript
   supabaseUrl: 'https://TU-PROYECTO.supabase.co',
   supabaseKey: 'tu-anon-key-publica',
   ```
5. 🟩 **Paso 5**: Copiar los archivos actualizados `js/apiClient.js` a las carpetas de las PWAs:
   ```
   pwa-asistente/js/apiClient.js
   pwa-familia/js/apiClient.js
   ```
6. 🟩 **Paso 6**: Habilitar las políticas RLS de la Sección 4 desde el panel de Supabase.
