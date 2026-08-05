# Especificación de API y Catálogo de Endpoints — Careonys / PresDemo

Este documento especifica la arquitectura de la API, catálogo de endpoints, contratos de solicitud/respuesta (DTOs) y reglas de validación extraídas mediante reingeniería del cliente móvil de **Cuidarlos** (`com.Cuidarlos_2.74439.apks`). 

Servirá como especificación técnica para implementar las funciones de backend en la plataforma **Multi-Tenant Careonys** sobre Supabase.

---

## 1. Arquitectura de Endpoints de Careonys (Multi-Tenant)

Todas las rutas operan sobre el ámbito de tenant pasando el encabezado `X-Tenant-ID` o resolviendo el subdominio del prestador (ej. `presdemo`).

| Categoría | Método | Endpoint de Careonys | Descripción |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Autenticación de usuario (Familiar / Cuidador / Admin) |
| **Auth** | `POST` | `/api/v1/auth/register` | Registro paso a paso (Familiar o Cuidador) |
| **Auth** | `POST` | `/api/v1/auth/check-email` | Verificación de disponibilidad de correo electrónico |
| **Cuidadores** | `GET` | `/api/v1/caregivers` | Búsqueda filtrada de cuidadores del tenant |
| **Cuidadores** | `GET` | `/api/v1/caregivers/:id` | Obtener perfil público detallado de un cuidador |
| **Cuidadores** | `PUT` | `/api/v1/caregivers/:id/professional-info` | Actualizar profesión, títulos y certificaciones |
| **Cuidadores** | `PUT` | `/api/v1/caregivers/:id/availability` | Actualizar matriz de horarios y modalidades |
| **Familias** | `POST` | `/api/v1/care-requests` | Publicar nuevo aviso de solicitud de cuidado |
| **Familias** | `GET` | `/api/v1/care-requests` | Listar solicitudes activas de familias |
| **Verificación** | `POST` | `/api/v1/verification/dni` | Validación de DNI y antecedentes con registro |
| **Verificación** | `POST` | `/api/v1/verification/phone-sms` | Enviar código de validación telefónica vía SMS |
| **Reseñas** | `POST` | `/api/v1/reviews` | Calificar servicio y asignar puntos reputacionales |

---

## 2. Esquemas de Datos y DTOs Extraídos

### 2.1 DTO de Registro de Usuario (`UserDataForm`)
```json
{
  "tenant_id": "tenant-presdemo",
  "account": {
    "email": "usuario@ejemplo.com",
    "password": "hashed_password_string"
  },
  "personal": {
    "first_name": "Nombre",
    "last_name": "Apellido",
    "birthday": "1985-05-20",
    "gender": "male | female | other",
    "nationality": "Argentina",
    "dni": "12345678",
    "cuil": "20123456789",
    "afip_status": "no_inscripto | monotributo_social | monotributista | responsable_inscripto"
  },
  "contact": {
    "cellphone": {
      "country_code": "+54",
      "number": "1198765432"
    },
    "alt_phone": null,
    "address": {
      "street": "Av. Santa Fe",
      "number": "1234",
      "floor": "4",
      "appartment": "B",
      "city": "CABA",
      "state": "Buenos Aires",
      "country": "Argentina"
    }
  },
  "role": "family | caregiver"
}
```

---

### 2.2 DTO de Perfil Profesional de Cuidador (`CaregiverProfessionalInfo`)
```json
{
  "cuidador_id": "cuid-001",
  "tenant_id": "tenant-presdemo",
  "profesiones": [
    "Cuidador Domiciliario",
    "Auxiliar de Enfermería"
  ],
  "estudios": [
    {
      "institucion": "AMIA",
      "titulo": "Cuidador Domiciliario Gerontológico",
      "anio_finalizacion": 2019,
      "comprobante_url": "https://storage.careonys.com/docs/cert-001.jpg",
      "estado_validacion": "verificado | pendiente | rechazado"
    }
  ],
  "experiencia_laboral": [
    {
      "puesto": "Cuidadora Domiciliaria Senior",
      "inicio": "2019-01",
      "fin": "2023-12",
      "tareas_realizadas": "Higiene personal, administración de medicamentos, paseos."
    }
  ],
  "referencias": [
    {
      "nombre_completo": "Dra. Elena Gómez",
      "telefono": "+541144445555",
      "comentarios": "Excelente desempeño en el cuidado de paciente postrado."
    }
  ],
  "disponibilidad": {
    "urgencias": true,
    "con_retiro": true,
    "sin_retiro": true,
    "matriz_horarios": ["L", "M", "M", "J", "V", "S", "D"]
  }
}
```

---

### 2.3 Reglas de Validación de Negocio

1. **Formatos de Identificación:**
   - DNI en Argentina: Mínimo 6 y máximo 8 dígitos numéricos.
   - CUIL/CUIT: Debe contener el número de DNI ingresado.
2. **Edad Mínima:** El usuario debe tener al menos 18 años cumplidos al momento del registro.
3. **Múltiples Roles:** Un usuario registrado como `caregiver` puede cargar múltiples títulos, pero solo los avalados con certificado adjunto recibirán el badge de **Perfil Verificado**.
4. **Sistema de Puntos y Reputación:**
   - `CUIDADOR BRONCE`: 0 a 500 puntos.
   - `CUIDADOR PLATA`: 501 a 1000 puntos.
   - `CUIDADOR ORO`: 1001+ puntos y 4.8+ de calificación promedio.

---

## 3. Estrategia de Migración a Supabase (Fase Futura)

Cuando se active la conexión con Supabase en Careonys, cada uno de estos DTOs corresponderá a una tabla PostgreSQL con políticas RLS (`tenant_id = auth.jwt() -> tenant_id`):

- `careonys.users` (Extiende de `auth.users`)
- `careonys.caregivers`
- `careonys.education_records`
- `careonys.work_experiences`
- `careonys.care_requests`
- `careonys.reviews`
