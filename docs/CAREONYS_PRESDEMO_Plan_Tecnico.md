# Careonys Platform — Módulo de Cuidados (PresDemo)
### Plataforma Multi-Tenant SaaS · Marketplace de Cuidadores · Web · iOS · Android · Windows

---

> [!IMPORTANT]
> Versión del plan: 2.0 (Careonys Multi-Tenant Integration) · Fecha: Agosto 2026
> Stack: React/Vite · React Native/Expo · Tauri · Supabase (Careonys Core) · Railway
> Estrategia de desarrollo actual: Mapeo local desacoplado vía adaptadores JSON (cero dependencia directa de DB en fase inicial).

---

## 1. VISIÓN Y ALCANCE

**Careonys** es una plataforma SaaS multi-tenant diseñada para empresas prestadoras de servicios de cuidado. **PresDemo** opera como una empresa/tenant modelo dentro de Careonys que conecta familias con cuidadores calificados de adultos mayores.

### Roles del sistema
| Rol | Descripción |
|-----|-------------|
| **Familia** | Persona que busca cuidador para un familiar mayor en la empresa tenant |
| **Cuidador** | Profesional que ofrece servicios de cuidado |
| **Admin Tenant** | Equipo de la empresa prestadora (ej. PresDemo) que gestiona su operación |
| **Super Admin Careonys** | Equipo central de Careonys con acceso total a la plataforma multi-tenant |

---

## 2. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Web App     │  │  Mobile App  │  │  Desktop App (Windows)   │  │
│  │  React+Vite  │  │  Expo/RN     │  │  Tauri + React           │  │
│  │  Vercel      │  │  iOS/Android │  │  .exe distribuible       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼────────────────-┼──────────────────────-┼───────────────-┘
          │                 │                        │
          └─────────────────┴────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │      SUPABASE              │
              │  · PostgreSQL (DB)         │
              │  · Auth (JWT + OAuth)      │
              │  · Storage (S3-compatible) │
              │  · Realtime (WebSockets)   │
              │  · Edge Functions          │
              │  · Row Level Security      │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │   RAILWAY (API custom)     │
              │  Node.js + Express         │
              │  · Lógica de negocio       │
              │  · Emails (Resend)         │
              │  · Push notifications      │
              │  · Verificación DNI        │
              │  · Webhooks externos       │
              │  · Jobs programados (cron) │
              └─────────────┬──────────────┘
                            │
         ┌──────────────────┴──────────────────────┐
         │         SERVICIOS EXTERNOS              │
         │  Daily.co  · Mercado Pago  · Firebase   │
         │  Resend    · Cloudinary    · Renaper     │
         └─────────────────────────────────────────┘
```

---

## 3. REPOSITORIOS Y ESTRUCTURA DE MONOREPO

```
sendler-salud/                          ← MONOREPO (Turborepo)
│
├── apps/
│   ├── web/                            ← React + Vite (Vercel)
│   ├── mobile/                         ← Expo + React Native (iOS + Android)
│   ├── desktop/                        ← Tauri + React (Windows .exe)
│   └── admin/                          ← React + Vite panel admin (Vercel)
│
├── packages/
│   ├── ui/                             ← Componentes compartidos (Design System)
│   ├── supabase/                       ← Cliente Supabase + tipos generados
│   ├── hooks/                          ← Hooks reutilizables entre apps
│   ├── utils/                          ← Funciones helper compartidas
│   ├── validations/                    ← Schemas Zod compartidos
│   └── constants/                      ← Constantes globales (zonas, especialidades, etc.)
│
├── supabase/
│   ├── migrations/                     ← SQL migrations versionadas
│   ├── functions/                      ← Edge Functions
│   └── seed.sql                        ← Datos iniciales
│
├── railway/                            ← Backend API
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── jobs/
│       └── webhooks/
│
├── turbo.json
├── package.json
└── README.md
```

---

## 4. BASE DE DATOS COMPLETA (PostgreSQL / Supabase)

### 4.1 Extensiones habilitadas
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- búsqueda full-text
CREATE EXTENSION IF NOT EXISTS "postgis";         -- geolocalización futura
CREATE EXTENSION IF NOT EXISTS "pg_cron";         -- jobs programados
```

### 4.2 Enumerados (ENUMs)
```sql
CREATE TYPE user_role AS ENUM ('familia', 'cuidador', 'admin', 'super_admin');
CREATE TYPE nivel_cuidador AS ENUM ('bronce', 'plata', 'oro');
CREATE TYPE estado_postulacion AS ENUM ('pendiente', 'vista', 'aceptada', 'rechazada', 'cancelada');
CREATE TYPE tipo_retiro AS ENUM ('con_retiro', 'sin_retiro', 'ambos');
CREATE TYPE tipo_turno AS ENUM ('manana', 'tarde', 'noche');
CREATE TYPE dia_semana AS ENUM ('L', 'M', 'Mi', 'J', 'V', 'S', 'D');
CREATE TYPE estado_aviso AS ENUM ('borrador', 'activo', 'pausado', 'cerrado', 'expirado');
CREATE TYPE estado_verificacion AS ENUM ('pendiente', 'en_revision', 'aprobado', 'rechazado');
CREATE TYPE tipo_notificacion AS ENUM ('postulacion', 'mensaje', 'aviso', 'sistema', 'verificacion', 'pago');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');
CREATE TYPE tipo_reporte AS ENUM ('perfil', 'aviso', 'mensaje', 'comportamiento');
```

### 4.3 Tabla: profiles (extensión de auth.users)
```sql
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role NOT NULL DEFAULT 'familia',
  nombre              TEXT NOT NULL,
  apellido            TEXT NOT NULL,
  email               TEXT NOT NULL,
  telefono            TEXT,
  telefono_verificado BOOLEAN DEFAULT FALSE,
  avatar_url          TEXT,
  bio_corta           TEXT,
  zona                TEXT,
  ciudad              TEXT DEFAULT 'Buenos Aires',
  provincia           TEXT DEFAULT 'Buenos Aires',
  onboarding_completo BOOLEAN DEFAULT FALSE,
  activo              BOOLEAN DEFAULT TRUE,
  ultimo_login        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índice full-text para búsqueda
CREATE INDEX idx_profiles_search ON profiles USING gin(
  to_tsvector('spanish', nombre || ' ' || apellido || ' ' || COALESCE(zona, ''))
);
```

### 4.4 Tabla: cuidadores
```sql
CREATE TABLE cuidadores (
  id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nivel                 nivel_cuidador DEFAULT 'bronce',
  puntos_total          INT DEFAULT 0,
  tarifa_hora           DECIMAL(10,2),
  disponible_urgente    BOOLEAN DEFAULT FALSE,
  tipo_retiro           tipo_retiro DEFAULT 'ambos',
  anos_experiencia      INT DEFAULT 0,
  primera_vez_gratis    BOOLEAN DEFAULT FALSE,
  resumen_profesional   TEXT,
  estado_verificacion   estado_verificacion DEFAULT 'pendiente',
  dni_numero            TEXT,
  dni_verificado        BOOLEAN DEFAULT FALSE,
  antecedentes_ok       BOOLEAN DEFAULT FALSE,
  referencias_verificadas BOOLEAN DEFAULT FALSE,
  destacado             BOOLEAN DEFAULT FALSE,
  orden_destacado       INT,
  total_trabajos        INT DEFAULT 0,
  total_resenas         INT DEFAULT 0,
  promedio_calificacion DECIMAL(3,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Tabla: especialidades
```sql
CREATE TABLE especialidades (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL UNIQUE,
  icono       TEXT,
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0
);

-- Datos iniciales
INSERT INTO especialidades (nombre, icono) VALUES
  ('Deterioro Cognitivo', '🧠'),
  ('Alzheimer', '🧠'),
  ('Postrados', '🛏'),
  ('Paciente Oncológico', '🩺'),
  ('Médicos / Enfermería', '💊'),
  ('Ceguera / Visión reducida', '👁'),
  ('Paseos y actividad física', '🚶'),
  ('Higiene personal', '🧼'),
  ('Preparación de comidas', '🍳'),
  ('Tareas del hogar', '🏠'),
  ('Acompañamiento médico', '🏥'),
  ('Cuidado nocturno', '🌙'),
  ('Paciente psiquiátrico', '🧘'),
  ('Rehabilitación física', '💪'),
  ('Discapacidad motriz', '♿');

CREATE TABLE cuidador_especialidades (
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  especialidad_id UUID REFERENCES especialidades(id) ON DELETE CASCADE,
  PRIMARY KEY (cuidador_id, especialidad_id)
);
```

### 4.6 Tabla: disponibilidad
```sql
CREATE TABLE disponibilidad (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  dia         dia_semana NOT NULL,
  turno       tipo_turno NOT NULL,
  UNIQUE (cuidador_id, dia, turno)
);
```

### 4.7 Tabla: certificaciones
```sql
CREATE TABLE certificaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  institucion     TEXT,
  ano_obtencion   INT,
  archivo_url     TEXT,
  verificado      BOOLEAN DEFAULT FALSE,
  fecha_verificacion TIMESTAMPTZ,
  verificado_por  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.8 Tabla: referencias_laborales
```sql
CREATE TABLE referencias_laborales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  nombre_contacto TEXT NOT NULL,
  telefono        TEXT,
  email           TEXT,
  relacion        TEXT,   -- "ex-empleador", "familia del paciente", etc.
  descripcion     TEXT,
  verificada      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.9 Tabla: avatares y documentos (Storage)
```sql
-- Se maneja vía Supabase Storage, pero guardamos referencias:
CREATE TABLE documentos_cuidador (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,   -- 'dni_frente', 'dni_dorso', 'foto_perfil', 'antecedentes'
  storage_path TEXT NOT NULL,
  publico     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.10 Tabla: avisos (publicados por familias)
```sql
CREATE TABLE avisos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familia_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  zona            TEXT NOT NULL,
  barrio          TEXT,
  urgente         BOOLEAN DEFAULT FALSE,
  tipo_retiro     tipo_retiro DEFAULT 'ambos',
  horario_inicio  TIME,
  horario_fin     TIME,
  dias            dia_semana[],
  tarifa_ofrecida DECIMAL(10,2),
  paciente_edad   INT,
  paciente_genero TEXT,
  estado          estado_aviso DEFAULT 'activo',
  expira_at       TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  total_postulaciones INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE aviso_especialidades (
  aviso_id        UUID REFERENCES avisos(id) ON DELETE CASCADE,
  especialidad_id UUID REFERENCES especialidades(id) ON DELETE CASCADE,
  PRIMARY KEY (aviso_id, especialidad_id)
);
```

### 4.11 Tabla: postulaciones
```sql
CREATE TABLE postulaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aviso_id        UUID REFERENCES avisos(id) ON DELETE CASCADE,
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  estado          estado_postulacion DEFAULT 'pendiente',
  mensaje         TEXT,
  tarifa_propuesta DECIMAL(10,2),
  fecha_vista     TIMESTAMPTZ,
  fecha_respuesta TIMESTAMPTZ,
  motivo_rechazo  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aviso_id, cuidador_id)
);
```

### 4.12 Tablas: Chat
```sql
CREATE TABLE conversaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familia_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  aviso_id        UUID REFERENCES avisos(id),
  ultimo_mensaje  TEXT,
  ultimo_mensaje_at TIMESTAMPTZ,
  no_leidos_familia INT DEFAULT 0,
  no_leidos_cuidador INT DEFAULT 0,
  activa          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (familia_id, cuidador_id)
);

CREATE TABLE mensajes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversacion_id UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
  autor_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contenido       TEXT,
  tipo            TEXT DEFAULT 'texto',   -- 'texto', 'imagen', 'archivo', 'sistema'
  archivo_url     TEXT,
  leido           BOOLEAN DEFAULT FALSE,
  leido_at        TIMESTAMPTZ,
  editado         BOOLEAN DEFAULT FALSE,
  eliminado       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance del chat
CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id, created_at DESC);
```

### 4.13 Tablas: Video llamadas
```sql
CREATE TABLE video_llamadas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversacion_id UUID REFERENCES conversaciones(id),
  iniciador_id    UUID REFERENCES profiles(id),
  receptor_id     UUID REFERENCES profiles(id),
  room_url        TEXT,          -- URL de Daily.co
  room_name       TEXT,          -- nombre único de la sala
  duracion_seg    INT,
  estado          TEXT DEFAULT 'creada',  -- 'creada', 'activa', 'finalizada', 'cancelada'
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.14 Tablas: Reseñas y puntos
```sql
CREATE TABLE resenas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id     UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  familia_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  aviso_id        UUID REFERENCES avisos(id),
  calificacion    INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  puntos_otorgados INT DEFAULT 0,
  comentario      TEXT,
  respuesta_cuidador TEXT,
  visible         BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cuidador_id, familia_id, aviso_id)
);

CREATE TABLE historial_puntos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuidador_id UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  puntos      INT NOT NULL,   -- puede ser negativo (descuento)
  concepto    TEXT NOT NULL,
  referencia_id UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.15 Tabla: Notificaciones
```sql
CREATE TABLE notificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tipo        tipo_notificacion NOT NULL,
  titulo      TEXT NOT NULL,
  mensaje     TEXT,
  leida       BOOLEAN DEFAULT FALSE,
  leida_at    TIMESTAMPTZ,
  accion_url  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, created_at DESC);
```

### 4.16 Tabla: Favoritos
```sql
CREATE TABLE favoritos (
  familia_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cuidador_id UUID REFERENCES cuidadores(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (familia_id, cuidador_id)
);
```

### 4.17 Tabla: Pagos (para cuando se implemente)
```sql
CREATE TABLE pagos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familia_id          UUID REFERENCES profiles(id),
  cuidador_id         UUID REFERENCES cuidadores(id),
  aviso_id            UUID REFERENCES avisos(id),
  monto               DECIMAL(10,2) NOT NULL,
  moneda              TEXT DEFAULT 'ARS',
  estado              estado_pago DEFAULT 'pendiente',
  metodo              TEXT,      -- 'mercado_pago', 'transferencia', 'efectivo'
  mp_preference_id    TEXT,      -- ID de preferencia de Mercado Pago
  mp_payment_id       TEXT,      -- ID de pago de Mercado Pago
  comision_plataforma DECIMAL(10,2),
  monto_cuidador      DECIMAL(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.18 Tabla: Reportes y moderación
```sql
CREATE TABLE reportes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reportador_id   UUID REFERENCES profiles(id),
  tipo            tipo_reporte NOT NULL,
  entidad_id      UUID NOT NULL,
  motivo          TEXT NOT NULL,
  descripcion     TEXT,
  estado          TEXT DEFAULT 'pendiente',   -- 'pendiente', 'revisado', 'resuelto'
  resuelto_por    UUID REFERENCES profiles(id),
  resolucion      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.19 Tabla: Configuración del sistema
```sql
CREATE TABLE configuracion (
  clave   TEXT PRIMARY KEY,
  valor   TEXT NOT NULL,
  tipo    TEXT DEFAULT 'string',   -- 'string', 'number', 'boolean', 'json'
  descripcion TEXT
);

INSERT INTO configuracion VALUES
  ('puntos_resena_5_estrellas', '100', 'number', 'Puntos por reseña de 5 estrellas'),
  ('puntos_resena_4_estrellas', '60', 'number', 'Puntos por reseña de 4 estrellas'),
  ('puntos_perfil_completo', '200', 'number', 'Puntos por completar perfil'),
  ('puntos_dni_verificado', '300', 'number', 'Puntos por verificar DNI'),
  ('puntos_antecedentes_ok', '400', 'number', 'Puntos por antecedentes limpios'),
  ('dias_expiracion_aviso', '30', 'number', 'Días hasta que expira un aviso'),
  ('comision_plataforma_pct', '10', 'number', 'Porcentaje de comisión de Sendler'),
  ('nivel_plata_puntos', '500', 'number', 'Puntos necesarios para nivel Plata'),
  ('nivel_oro_puntos', '1200', 'number', 'Puntos necesarios para nivel Oro');
```

### 4.20 Row Level Security (RLS) — ejemplos clave
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuidadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario ve su propio perfil y los públicos
CREATE POLICY "Perfil propio o públicos" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR activo = TRUE
  );

CREATE POLICY "Solo el dueño actualiza su perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Política: mensajes solo entre participantes de la conversación
CREATE POLICY "Ver mensajes de mis conversaciones" ON mensajes
  FOR SELECT USING (
    conversacion_id IN (
      SELECT id FROM conversaciones
      WHERE familia_id = auth.uid() OR cuidador_id = auth.uid()
    )
  );

-- Política: notificaciones propias
CREATE POLICY "Ver mis notificaciones" ON notificaciones
  FOR ALL USING (usuario_id = auth.uid());
```

---

## 5. BACKEND API (Railway — Node.js/Express)

### 5.1 Estructura de carpetas
```
railway/src/
├── app.ts                    ← Express app setup
├── server.ts                 ← Entry point
├── config/
│   ├── supabase.ts           ← Cliente admin de Supabase
│   └── env.ts                ← Validación de variables de entorno
├── routes/
│   ├── auth.routes.ts
│   ├── cuidadores.routes.ts
│   ├── avisos.routes.ts
│   ├── postulaciones.routes.ts
│   ├── chat.routes.ts
│   ├── video.routes.ts
│   ├── pagos.routes.ts
│   ├── admin.routes.ts
│   └── webhooks.routes.ts
├── services/
│   ├── email.service.ts      ← Resend
│   ├── push.service.ts       ← Firebase Admin SDK
│   ├── video.service.ts      ← Daily.co API
│   ├── pagos.service.ts      ← Mercado Pago SDK
│   ├── verificacion.service.ts ← Renaper/OCR
│   └── puntos.service.ts     ← Lógica de gamificación
├── jobs/
│   ├── scheduler.ts          ← node-cron
│   ├── expirar-avisos.job.ts
│   ├── recordatorios.job.ts
│   └── calcular-niveles.job.ts
├── middlewares/
│   ├── auth.middleware.ts    ← Verificar JWT de Supabase
│   ├── role.middleware.ts    ← Verificar rol
│   └── rate-limit.middleware.ts
└── utils/
    ├── logger.ts
    └── errors.ts
```

### 5.2 Endpoints principales
```
POST   /auth/verify-phone              ← SMS con Twilio
POST   /auth/send-welcome-email

GET    /cuidadores/search              ← Búsqueda avanzada con filtros
POST   /cuidadores/:id/verificar-dni   ← Inicia proceso de verificación
POST   /cuidadores/:id/destacar        ← Admin destacar cuidador

POST   /avisos/:id/postular            ← Cuidador se postula
PUT    /postulaciones/:id/estado       ← Familia acepta/rechaza

POST   /video/create-room              ← Crea sala Daily.co
DELETE /video/room/:name               ← Cierra sala

POST   /pagos/crear-preferencia        ← Mercado Pago
POST   /webhooks/mercado-pago          ← Webhook de MP

POST   /admin/verificar-cuidador/:id
POST   /admin/moderar-reporte/:id
GET    /admin/estadisticas

POST   /push/register-token            ← Registrar device token
POST   /push/send                      ← Enviar push (admin)
```

### 5.3 Jobs programados (Cron)
```typescript
// Todos los días a las 00:00
cron.schedule('0 0 * * *', async () => {
  await expirarAvisos();           // Pausa avisos vencidos
  await calcularNivelesCuidadores(); // Recalcula bronce/plata/oro
  await enviarRecordatoriosEmail(); // Recordatorios a familias
});

// Cada hora
cron.schedule('0 * * * *', async () => {
  await limpiarSalaesVideoVencidas();
});

// Cada lunes a las 9am
cron.schedule('0 9 * * 1', async () => {
  await enviarResumenSemanalAdmin();
});
```

---

## 6. FRONTEND WEB (React + Vite)

### 6.1 Stack tecnológico
```
react 18                → Core
vite 5                  → Bundler
typescript              → Tipado
react-router-dom v6     → Routing
@supabase/supabase-js   → Cliente Supabase
@tanstack/react-query   → Data fetching + cache
zustand                 → Estado global
react-hook-form         → Formularios
zod                     → Validación de esquemas
axios                   → HTTP al backend de Railway
date-fns                → Manejo de fechas
react-hot-toast         → Toasts/alertas
framer-motion           → Animaciones
lucide-react            → Íconos
@radix-ui/*             → Componentes accesibles
```

### 6.2 Estructura de carpetas
```
apps/web/src/
├── main.tsx
├── App.tsx
├── router.tsx              ← Definición de rutas
│
├── pages/
│   ├── Home.tsx
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── RegisterCuidador.tsx
│   │   └── ForgotPassword.tsx
│   ├── directorio/
│   │   ├── Directorio.tsx
│   │   └── PerfilCuidador.tsx
│   ├── familia/
│   │   ├── Dashboard.tsx
│   │   ├── MisAvisos.tsx
│   │   ├── NuevoAviso.tsx
│   │   ├── Postulaciones.tsx
│   │   └── Favoritos.tsx
│   ├── cuidador/
│   │   ├── Dashboard.tsx
│   │   ├── MiPerfil.tsx
│   │   ├── CompletarPerfil.tsx
│   │   ├── BuscarAvisos.tsx
│   │   └── MisPostulaciones.tsx
│   ├── shared/
│   │   ├── Chat.tsx
│   │   ├── VideoLlamada.tsx
│   │   └── Notificaciones.tsx
│   ├── publicas/
│   │   ├── NecesitoCuidador.tsx
│   │   ├── SoyCuidador.tsx
│   │   ├── Acompanamiento.tsx
│   │   └── Cursos.tsx
│   └── admin/            ← En app/admin separada
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileMenu.tsx
│   ├── cuidadores/
│   │   ├── CuidadorCard.tsx
│   │   ├── CuidadorGrid.tsx
│   │   ├── FiltrosDirectorio.tsx
│   │   ├── StarRating.tsx
│   │   ├── NivelBadge.tsx
│   │   └── DisponibilidadTag.tsx
│   ├── avisos/
│   │   ├── AvisoCard.tsx
│   │   ├── AvisoForm.tsx
│   │   └── PostulacionCard.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ConversationList.tsx
│   │   └── FileUpload.tsx
│   ├── video/
│   │   └── VideoRoom.tsx    ← Wrapper de Daily.co
│   └── ui/                  ← Design System
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Avatar.tsx
│       └── Skeleton.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useCuidadores.ts
│   ├── useAvisos.ts
│   ├── useChat.ts
│   ├── useNotificaciones.ts
│   └── useUpload.ts
│
├── stores/
│   ├── authStore.ts         ← Usuario actual, sesión
│   └── uiStore.ts           ← Sidebar abierto, modales, etc.
│
├── lib/
│   ├── supabase.ts          ← Instancia del cliente
│   └── railway.ts           ← Instancia de axios hacia Railway
│
└── styles/
    ├── globals.css
    └── variables.css
```

### 6.3 Rutas del frontend web
```typescript
/                         → Home pública
/login                    → Login
/registro                 → Registro familiar
/registro/cuidador        → Registro cuidador
/directorio               → Listado de cuidadores (público)
/cuidador/:id             → Perfil público cuidador
/necesito-cuidador        → Landing familias
/soy-cuidador             → Landing cuidadores
/acompanamiento           → Acompañamiento online
/cursos                   → Cursos

// Rutas protegidas familia
/familia/dashboard        → Dashboard familiar
/familia/avisos           → Mis avisos publicados
/familia/avisos/nuevo     → Publicar aviso
/familia/avisos/:id       → Detalle aviso + postulaciones
/familia/favoritos        → Cuidadores guardados

// Rutas protegidas cuidador
/cuidador/dashboard       → Dashboard cuidador
/cuidador/perfil          → Editar perfil
/cuidador/perfil/completar → Onboarding paso a paso
/cuidador/avisos          → Buscar avisos disponibles
/cuidador/postulaciones   → Mis postulaciones

// Compartidas (ambos roles)
/chat                     → Lista de conversaciones
/chat/:id                 → Conversación específica
/video/:roomName          → Sala de video
/notificaciones           → Centro de notificaciones
/ajustes                  → Configuración de cuenta
```

---

## 7. APLICACIÓN MÓVIL (Expo + React Native)

### 7.1 Stack tecnológico
```
expo SDK 51              → Framework principal
expo-router              → File-based routing (como Next.js)
expo-notifications       → Push notifications
expo-image-picker        → Subir fotos
expo-document-picker     → Subir documentos
expo-camera              → Foto de perfil en vivo
expo-location            → Geolocalización
expo-secure-store        → Guardar tokens de forma segura
@supabase/supabase-js    → Cliente Supabase (mismo que web)
react-native-reanimated  → Animaciones performantes
react-native-gesture-handler
@shopify/flash-list      → Listas optimizadas
react-native-maps        → Mapa de cuidadores (futuro)
daily-react-native       → SDK de Daily.co para video
```

### 7.2 Estructura de pantallas (Expo Router)
```
app/
├── _layout.tsx                 ← Root layout + providers
├── index.tsx                   ← Splash / redirect
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/                     ← Bottom tab navigator
│   ├── _layout.tsx             ← Tab bar config
│   ├── index.tsx               ← Home / Dashboard
│   ├── buscar.tsx              ← Directorio / buscar avisos
│   ├── mensajes.tsx            ← Lista de chats
│   ├── avisos.tsx              ← Mis avisos (familia) / postulaciones (cuidador)
│   └── perfil.tsx              ← Perfil y ajustes
├── (modals)/
│   ├── nuevo-aviso.tsx
│   ├── editar-perfil.tsx
│   └── filtros.tsx
├── cuidador/[id].tsx           ← Perfil cuidador
├── chat/[id].tsx               ← Conversación
├── video/[room].tsx            ← Video llamada
└── onboarding/
    ├── _layout.tsx
    ├── paso-1.tsx              ← Foto de perfil
    ├── paso-2.tsx              ← Especialidades
    ├── paso-3.tsx              ← Disponibilidad
    ├── paso-4.tsx              ← Certificaciones
    └── paso-5.tsx              ← DNI / Verificación
```

### 7.3 Publicación en stores
```
iOS App Store:
  · Cuenta Apple Developer: USD 99/año
  · Bundle ID: com.sendler.salud
  · Mínimo iOS 15
  · Build con EAS Build (Expo)

Google Play Store:
  · Cuenta Google Play: USD 25 (único)
  · Package: com.sendler.salud
  · Mínimo Android 8.0 (API 26)
  · Build con EAS Build (Expo)

Comandos:
  eas build --platform ios --profile production
  eas build --platform android --profile production
  eas submit --platform ios
  eas submit --platform android
```

---

## 8. APLICACIÓN DESKTOP WINDOWS (Tauri + React)

### 8.1 ¿Por qué Tauri y no Electron?
```
Tauri vs Electron:
  · Tauri: binario ~8MB   vs  Electron: ~150MB
  · Tauri: usa WebView nativo del OS (Edge en Windows)
  · Tauri: Rust backend (rápido, seguro)
  · Electron: más ecosistema, pero muy pesado
  → Para Sendler Salud: Tauri es la opción correcta
```

### 8.2 Stack
```
tauri 2.x            → Framework desktop
react + vite         → Frontend (reutiliza 90% de apps/web)
@tauri-apps/api      → APIs nativas (notificaciones, archivos, etc.)
tauri-plugin-notification → Notificaciones nativas Windows
tauri-plugin-updater → Auto-actualización del app
tauri-plugin-window  → Control de ventana
```

### 8.3 Estructura
```
apps/desktop/
├── src/                      ← React app (casi idéntica a web)
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   └── main.rs           ← Rust backend
│   ├── icons/                ← Íconos Windows (.ico, .png)
│   ├── Cargo.toml
│   └── tauri.conf.json       ← Configuración de la app
```

### 8.4 Distribución Windows
```
Formatos de instalador:
  · .exe (NSIS installer) — estándar Windows
  · .msi (Windows Installer) — enterprise
  · Microsoft Store (futuro)

Firma de código (Code Signing):
  · Certificado EV Code Signing: ~USD 200-400/año
  · Necesario para evitar "Windows Defender SmartScreen"

Auto-updates:
  · Tauri updater apunta a releases de GitHub
  → Gratuito, automático, seguro
```

---

## 9. SUPABASE — CONFIGURACIÓN COMPLETA

### 9.1 Storage Buckets
```
avatares/               → Público · Fotos de perfil
  └── {user_id}/avatar.webp

documentos-cuidadores/  → Privado · Solo admins + el cuidador
  └── {cuidador_id}/
      ├── dni_frente.jpg
      ├── dni_dorso.jpg
      └── antecedentes.pdf

certificaciones/        → Privado
  └── {cuidador_id}/{cert_id}.pdf

mensajes-archivos/      → Privado · Solo participantes del chat
  └── {conversacion_id}/{filename}
```

### 9.2 Edge Functions (Serverless)
```
supabase/functions/
├── on-new-mensaje/          ← Trigger al insertar mensaje → notificar
├── on-postulacion/          ← Trigger al postular → email a familia
├── on-resena/               ← Trigger al crear reseña → recalcular puntos
├── calcular-nivel/          ← Calcula bronce/plata/oro
├── generar-thumbnail/       ← Genera thumbnail de imagen subida
└── enviar-push/             ← Envía push via Firebase
```

### 9.3 Auth Providers configurados
```
Email/Password    → Habilitado (con confirmación de email)
Google OAuth      → Habilitado
Apple OAuth       → Habilitado (requerido por App Store para iOS)
```

### 9.4 Realtime subscriptions
```typescript
// Chat en tiempo real
supabase
  .channel('mensajes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'mensajes',
    filter: `conversacion_id=eq.${conversacionId}`
  }, handleNuevoMensaje)
  .subscribe()

// Notificaciones en tiempo real
supabase
  .channel('notificaciones')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notificaciones',
    filter: `usuario_id=eq.${userId}`
  }, handleNuevaNotificacion)
  .subscribe()
```

---

## 10. SERVICIOS EXTERNOS E INTEGRACIONES

### 10.1 Emails — Resend
```
Uso: Bienvenida, verificación, notificaciones, recordatorios

Plantillas:
  · welcome-familia.html
  · welcome-cuidador.html
  · nueva-postulacion.html
  · postulacion-aceptada.html
  · postulacion-rechazada.html
  · nueva-resena.html
  · verificacion-aprobada.html
  · recordatorio-aviso-vence.html
  · resumen-semanal-admin.html

Costo: Gratis hasta 3.000 emails/mes
```

### 10.2 Video — Daily.co
```typescript
// Crear sala
const room = await fetch('https://api.daily.co/v1/rooms', {
  method: 'POST',
  headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
  body: JSON.stringify({
    name: `sendler-${conversacionId}`,
    privacy: 'private',
    properties: {
      exp: Math.floor(Date.now() / 1000) + 3600,  // expira en 1 hora
      max_participants: 2,
      enable_recording: false
    }
  })
})

Costo: USD 0 hasta 2.000 participantes-minuto/mes
Luego: USD 0.00099/participante-minuto
```

### 10.3 Push Notifications — Firebase Cloud Messaging
```
Web:    Service Worker con FCM Web Push
iOS:    APNs via FCM (gratuito)
Android: FCM directo (gratuito)

Registro del token al hacer login en la app
Costo: Gratuito
```

### 10.4 Pagos — Mercado Pago
```
Checkout Pro: Redirect a MP para pagar
Comisión MP:  3.99% por transacción (tarjeta)
              ~0% cuenta MP a MP

Webhook recibe eventos:
  payment.created
  payment.approved
  payment.rejected

Costo plataforma (Sendler): 10% del valor del servicio
```

### 10.5 Verificación de identidad
```
Opción A — Manual (MVP):
  · Cuidador sube foto DNI frente/dorso
  · Admin lo revisa y aprueba manualmente
  · Sin costo adicional

Opción B — Automatizada (v2):
  · IDAnalyzer API: USD 0.10/verificación
  · O: Metamap (antes Mati): desde USD 0.20/verificación
  · Valida DNI Argentina + selfie liveness check
```

### 10.6 SMS — Twilio (verificación de teléfono)
```
SMS de verificación al registrarse
Costo: ~USD 0.0079/SMS en Argentina
Para 1.000 usuarios nuevos: ~USD 8
```

---

## 11. PANEL DE ADMINISTRACIÓN

### 11.1 Stack
```
React + Vite (separado en apps/admin)
Ant Design o Material UI (para tablas, formularios de gestión)
React Query + Supabase admin client (service_role key)
Recharts (gráficos y estadísticas)
```

### 11.2 Secciones del panel admin
```
Dashboard
  · Usuarios nuevos hoy / semana / mes
  · Avisos activos
  · Postulaciones en curso
  · Chats activos
  · Gráfico de crecimiento

Cuidadores
  · Listado completo con filtros
  · Ver perfil completo
  · Verificar DNI y certificaciones
  · Cambiar nivel manualmente
  · Destacar perfil
  · Suspender / banear

Familias
  · Listado completo
  · Ver avisos publicados
  · Historial de actividad

Avisos
  · Todos los avisos (activos, pausados, vencidos)
  · Editar / pausar / eliminar

Verificaciones
  · Cola de verificaciones pendientes
  · Revisar documentos subidos
  · Aprobar / rechazar con comentario

Reportes
  · Reportes de usuarios
  · Moderar contenido
  · Historial de acciones

Configuración
  · Parámetros del sistema (puntos, comisiones, etc.)
  · Gestión de especialidades
  · Emails de prueba
  · Feature flags
```

---

## 12. AUTENTICACIÓN Y ONBOARDING

### 12.1 Flujo de registro — Familia
```
1. Pantalla de bienvenida → elegir rol
2. Datos básicos (nombre, email, contraseña, teléfono)
3. Email de verificación (Supabase Auth)
4. Confirmar email → redirect al dashboard
5. Banner "completá tu perfil" (opcional, zona, foto)
```

### 12.2 Flujo de registro — Cuidador (más extenso)
```
Paso 1: Datos básicos (nombre, email, contraseña, teléfono)
Paso 2: Verificación de teléfono (SMS Twilio)
Paso 3: Foto de perfil (cámara o galería)
Paso 4: Zona / barrio / disponibilidad horaria
Paso 5: Especialidades (selección múltiple)
Paso 6: Tipo de retiro + días disponibles
Paso 7: Tarifa por hora + años de experiencia
Paso 8: Resumen profesional (bio)
Paso 9: Certificaciones (upload de archivos)
Paso 10: DNI frente y dorso (upload)
→ Estado: pendiente de verificación
→ Puede usar la app pero con badge "En verificación"
→ Al verificarse → notificación push + email + puntos
```

---

## 13. SISTEMA DE PUNTOS Y NIVELES

```
EVENTO                          PUNTOS
─────────────────────────────────────────
Perfil 100% completo            +200 pts
Teléfono verificado             +100 pts
DNI verificado                  +300 pts
Antecedentes aprobados          +400 pts
Certificación verificada        +150 pts
Primera reseña recibida         +50 pts
Reseña 5 estrellas              +100 pts
Reseña 4 estrellas              +60 pts
Reseña 3 estrellas              +30 pts
Reseña 1-2 estrellas            +0 pts
Trabajo completado (confirmado) +50 pts
Reporte válido recibido         -200 pts
─────────────────────────────────────────
NIVEL    PUNTOS MÍNIMOS  BENEFICIOS
─────────────────────────────────────────
Bronce   0               Perfil básico
Plata    500             Destacado en búsqueda
Oro      1200            Badge premium, 1er lugar en búsqueda
```

---

## 14. DISEÑO — DESIGN SYSTEM

### 14.1 Tokens (compartidos en packages/ui)
```typescript
export const tokens = {
  colors: {
    // Sendler Salud (azul)
    primary:   '#2E75B6',
    dark:      '#1F4E79',
    mid:       '#4A90C4',
    light:     '#E8F3FB',
    accent:    '#FD7E14',  // naranja CTA
    success:   '#28A745',
    error:     '#DC3545',
    warning:   '#FFA000',

    // Neutros
    textDark:  '#1A1A2E',
    textMid:   '#444',
    textLight: '#666',
    bgLight:   '#F0F4F8',
    border:    '#DDE5EE',
    white:     '#FFFFFF',
  },
  fonts: {
    serif:  "'Playfair Display', Georgia, serif",
    sans:   "'DM Sans', system-ui, sans-serif",
  },
  radii: {
    sm: '6px',
    md: '12px',
    lg: '20px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(46,117,182,0.10)',
    md: '0 6px 24px rgba(46,117,182,0.15)',
    lg: '0 16px 48px rgba(46,117,182,0.18)',
  }
}
```

### 14.2 Componentes del Design System
```
Button          (primary, accent, outline, ghost, danger)
Input           (text, email, password, tel, search)
Select
Textarea
Checkbox / Radio
Avatar          (con fallback initials, con badge de nivel)
Badge           (nivel, urgente, disponible)
StarRating      (interactivo y de solo lectura)
Card            (cuidador, aviso, conversación)
Modal           (con backdrop, escape key)
Drawer          (mobile-friendly)
Toast           (success, error, info, warning)
Skeleton        (loading states)
Tabs
Pagination
Chip / Tag      (especialidades, días)
ProgressBar     (onboarding, nivel)
EmptyState      (ilustración + CTA)
ErrorBoundary
```

---

## 15. SEGURIDAD

```
Autenticación:
  ✅ JWT via Supabase Auth (expiración 1h, refresh tokens)
  ✅ Verificación de email obligatoria
  ✅ Rate limiting en endpoints de auth (5 intentos/15min)
  ✅ HTTPS obligatorio en todos los endpoints

Datos:
  ✅ RLS en todas las tablas (nadie ve datos de otros sin permiso)
  ✅ Variables de entorno en Railway Secrets
  ✅ service_role key NUNCA en el cliente
  ✅ Sanitización de inputs (Zod en frontend + backend)
  ✅ Upload de archivos: validación de tipo MIME y tamaño máximo (5MB fotos, 10MB docs)

GDPR / Protección de datos:
  ✅ Política de privacidad
  ✅ Términos y condiciones
  ✅ Derecho al olvido (endpoint DELETE account)
  ✅ Datos sensibles (DNI) solo accesibles por admins
```

---

## 16. INFRAESTRUCTURA Y DEVOPS

### 16.1 Entornos
```
development   → local (Supabase local via Docker)
staging       → Supabase proyecto test + Railway staging
production    → Supabase proyecto prod + Railway prod
```

### 16.2 CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml

on:
  push:
    branches: [main]   → deploy a production
  push:
    branches: [dev]    → deploy a staging

Jobs:
  lint:        → ESLint + TypeScript check
  test:        → Vitest (unit) + Playwright (e2e)
  build:       → Build todas las apps
  deploy-web:  → Vercel deploy
  deploy-admin:→ Vercel deploy
  deploy-api:  → Railway deploy
  notify:      → Slack notification del deploy
```

### 16.3 Monitoreo
```
Uptime:    UptimeRobot (gratis) → alertas si baja el servidor
Errores:   Sentry (gratis tier) → tracking de errores en tiempo real
Analytics: Posthog (self-hosted gratis) → comportamiento de usuarios
Logs:      Railway built-in logs + alertas
DB:        Supabase dashboard (queries lentas, conexiones, etc.)
```

---

## 17. TESTING

### 17.1 Unit Tests (Vitest)
```
· Funciones de utilidad (calcular puntos, formatear fechas)
· Hooks (useAuth, useCuidadores)
· Validaciones Zod
· Servicios del backend (mocked)
```

### 17.2 Integration Tests (Vitest + Supabase local)
```
· Registro de usuario → creación de profile
· Publicar aviso → aparece en búsqueda
· Postulación → notificación a familia
· Chat → mensajes en tiempo real
```

### 17.3 E2E Tests (Playwright — web)
```
Flujo 1: Registro familia → publicar aviso → ver postulación
Flujo 2: Registro cuidador → completar perfil → postularse
Flujo 3: Chat entre familia y cuidador
Flujo 4: Admin verifica cuidador → email enviado
```

### 17.4 Mobile Testing (Expo)
```
EAS Device Testing → instalar en dispositivos físicos antes de publicar
Detox → E2E en simuladores iOS/Android (opcional fase 2)
```

---

## 18. TIMELINE Y FASES

### FASE 0 — Setup (2 semanas)
```
Semana 1:
  □ Crear monorepo con Turborepo
  □ Setup Supabase (proyecto + migraciones)
  □ Setup Railway (proyecto Node.js)
  □ Setup Vercel (web + admin)
  □ Variables de entorno en todos los entornos
  □ CI/CD básico en GitHub Actions
  □ Design System: tokens + componentes base

Semana 2:
  □ Auth completo: registro/login familia y cuidador
  □ Onboarding familia (básico)
  □ Onboarding cuidador (5 pasos)
  □ Storage buckets configurados
  □ RLS habilitado en todas las tablas
```

### FASE 1 — Core Marketplace (4 semanas)
```
Semana 3-4: DIRECTORIO Y PERFILES
  □ Directorio público con filtros (zona, especialidad, nivel, retiro)
  □ Perfil completo del cuidador (web)
  □ Sistema de puntos y niveles (cálculo automático)
  □ Upload de foto de perfil
  □ Favoritos (guardar cuidadores)

Semana 5-6: AVISOS Y POSTULACIONES
  □ Publicar aviso (familia)
  □ Mis avisos con estado
  □ Buscar avisos (cuidador)
  □ Postularse a aviso con mensaje
  □ Ver postulaciones recibidas (familia)
  □ Aceptar / rechazar postulaciones
  □ Emails automáticos en cada cambio de estado
```

### FASE 2 — Comunicación (3 semanas)
```
Semana 7-8: CHAT
  □ Lista de conversaciones
  □ Mensajes en tiempo real (Supabase Realtime)
  □ Indicador "leído"
  □ Contador de no leídos
  □ Envío de imágenes

Semana 9: VIDEO LLAMADAS
  □ Integración Daily.co
  □ Botón "Video Conferencia" en chat
  □ Sala privada con expiración
  □ Notificación push de llamada entrante
```

### FASE 3 — Calidad y Admin (2 semanas)
```
Semana 10: RESEÑAS Y VERIFICACIONES
  □ Sistema de reseñas post-trabajo
  □ Panel admin: verificar DNI y certificaciones
  □ Aprobar/rechazar con email automático
  □ Reportes y moderación

Semana 11: NOTIFICACIONES
  □ Notificaciones in-app (Realtime)
  □ Push notifications (Firebase) — web + mobile
  □ Centro de notificaciones
```

### FASE 4 — Mobile (6 semanas)
```
Semana 12-13: Setup + Auth + Directorio
  □ Expo project setup
  □ Auth (login/registro) en móvil
  □ Directorio con filtros
  □ Perfil cuidador

Semana 14-15: Avisos + Chat
  □ Publicar aviso (familia)
  □ Buscar y postularse (cuidador)
  □ Chat en tiempo real
  □ Push notifications nativas

Semana 16-17: Video + Pulido
  □ Video llamadas (Daily.co RN SDK)
  □ Onboarding completo del cuidador
  □ Testing en dispositivos reales
  □ Submit a App Store + Play Store
```

### FASE 5 — Desktop Windows (3 semanas)
```
Semana 18: Setup Tauri
  □ Tauri project setup
  □ Integrar la web app existente
  □ Notificaciones nativas Windows
  □ Auto-updater

Semana 19: Adaptaciones
  □ Ajustar layout para ventana desktop
  □ Atajos de teclado
  □ System tray icon
  □ Gestión de ventana (minimizar, maximizar)

Semana 20: Distribución
  □ Code signing (certificado)
  □ Generar instalador .exe y .msi
  □ Página de descarga en el sitio web
  □ Auto-update funcionando
```

### FASE 6 — Pagos y Lanzamiento (2 semanas)
```
Semana 21: Mercado Pago
  □ Integración Checkout Pro
  □ Webhook de confirmación
  □ Historial de pagos
  □ Comisión de plataforma

Semana 22: Launch prep
  □ Testing completo cross-platform
  □ Optimización de performance
  □ SEO (web)
  □ App Store Optimization (mobile)
  □ Lanzamiento 🚀
```

**Total estimado: 22 semanas (~5.5 meses)**

---

## 19. COSTOS MENSUALES (en producción)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| **Supabase** | Pro | USD 25 |
| **Railway** | Starter | USD 5-20 |
| **Vercel** | Hobby/Pro | USD 0-20 |
| **Resend** (emails) | Free/Pro | USD 0-20 |
| **Daily.co** (video) | Pay as you go | USD 5-50 |
| **Firebase** (push) | Spark (gratis) | USD 0 |
| **Twilio** (SMS) | Pay as you go | USD 5-20 |
| **Apple Developer** | Anual | USD 8/mes |
| **Google Play** | Único USD 25 | USD 0 |
| **Code Signing** (Windows) | Anual | USD 15-35 |
| **Dominio** | Anual | USD 1-2 |
| **Sentry** (errores) | Free | USD 0 |
| **UptimeRobot** | Free | USD 0 |
| **TOTAL MVP** | | **~USD 65-200/mes** |

---

## 20. EQUIPO IDEAL

| Rol | Dedicación | Fase |
|-----|-----------|------|
| Tech Lead / Full Stack | Full time | Todas |
| Frontend React | Full time | 0-5 |
| Mobile RN | Full time | 4-5 |
| Backend Node.js | Part time | 0-3 |
| UI/UX Designer | Part time | 0-2 |
| QA Tester | Part time | 3-6 |
| Admin / DevOps | Part time | Todas |

> **Con 2-3 desarrolladores senior** el timeline se puede mantener. Con 1 desarrollador, estimar x2.

---

## 21. MVP MÍNIMO PARA VALIDAR EL NEGOCIO

Si querés lanzar rápido para validar, el MVP mínimo es:

```
✅ Registro y login (familia + cuidador)
✅ Perfil de cuidador completo
✅ Directorio con filtros básicos
✅ Publicar aviso (familia)
✅ Postularse (cuidador)
✅ Chat básico en tiempo real
✅ Email de notificación
❌ Video (se agenda por WhatsApp de forma manual)
❌ Pagos (se coordina offline)
❌ App mobile (primero web, luego mobile)
❌ Desktop Windows
```

**Este MVP toma ~8 semanas con 2 devs.**

---

## 22. PRÓXIMOS PASOS INMEDIATOS

```
[ ] Comprar dominio sendler.com / sendler.com.ar / sendlersalud.com
[ ] Crear cuenta Supabase (plan free para empezar)
[ ] Crear cuenta Railway
[ ] Crear cuenta Vercel
[ ] Crear cuenta GitHub (monorepo privado)
[ ] Registrar Apple Developer (necesita esperar 2-3 días)
[ ] Registrar Google Play Developer
[ ] Crear cuenta Resend (emails)
[ ] Crear cuenta Daily.co (video)
[ ] Crear cuenta Firebase (push notifications)
[ ] Definir equipo de desarrollo
[ ] Kickoff técnico del proyecto
```
