# Arquitectura Corporativa y Modelo de Negocio: CeltaTech / Careonys SaaS

**Fecha de Actualización**: 4 de Agosto de 2026  
**Proyecto**: Careonys Marketplace  
**Estado**: Documento Oficial de Definición de Dominio  

---

## 1. Definición del Esquema Corporativo

El ecosistema de negocios y desarrollo de software responde a la siguiente estructura formal:

```mermaid
graph TD
    CT["🏢 CeltaTech (Empresa Productora y Comercializadora de Software)"] -->|Desarrolla y comercializa en modalidad SaaS| Careonys["🚀 Careonys (Plataforma Software SaaS)"]
    Careonys -->|Incluye paquete/módulo de conexión| Marketplace["🛒 Módulo Marketplace (Careonys Marketplace)"]
    Careonys -->|Se comercializa B2B a| Tenants["🏥 Empresas Prestadoras de Cuidado (ej: PresDemo, Cuidadores Privados, etc.)"]
    Tenants -->|Consumen el software y gestionan| ActiveCaregivers["👥 Plantel Activo de Cuidadores Auditados"]
    Marketplace -->|Compite en el mercado directamente contra| Cuidarlos["🔴 Cuidarlos.com / App Cuidarlos (Competidor Directo)"]
```

---

## 2. Desglose de Actores y Roles

### 🏢 CeltaTech
* **Rol**: Empresa tecnológica creadora, desarrolladora y comercializadora de la plataforma de software.
* **Modelo de Comercialización**: B2B Software as a Service (SaaS).

### 🚀 Careonys
* **Rol**: El producto de software SaaS insignia creado por CeltaTech.
* **Módulo Marketplace**: Paquete dentro de Careonys que habilita el portal interactivo y el catálogo digital de búsqueda, contratación y reclutamiento de asistentes/cuidadores gerontológicos.

### 🏥 Prestadoras Cliente (Tenants SaaS) - ej: PresDemo
* **Rol**: Clientes B2B que adquieren la licencia SaaS de Careonys para operar su propia red de prestaciones.
* **Función Operativa**:
  - Recepción de postulaciones de cuidadores.
  - Auditoría de documentación civil, fiscal y técnica (DNI, AFIP, Penales, Matrícula).
  - Entrevistas de selección presenciales o virtuales.
  - Asignación de badges de verificación e incorporación de los cuidadores aprobados al **Plantel Activo**.

### 🔴 Cuidarlos (`cuidarlos.com` / `app.cuidarlos.com`)
* **Rol**: Competidor directo en el mercado de atención domiciliaria y cuidado de adultos mayores.

---

## 3. Estado de Denominaciones Obsoletas

* 🚫 **Sendler Group**: Queda **DEPRECADO / EN EL PASADO**. Toda referencia en código o documentación debe reemplazarse por el esquema **CeltaTech** (empresa desarrolladora), **Careonys** (producto SaaS Marketplace) y **PresDemo** (empresa cliente prestadora).
