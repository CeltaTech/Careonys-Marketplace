# Estimación de Esfuerzo y Costo de Codificación: Arquitectura Multi-Tenant Careonys

Este documento detalla el esfuerzo técnico, horas de desarrollo requeridas y el retorno de inversión (ROI) para convertir el prototipo actual en una plataforma **SaaS Multi-Tenant Dinámica**.

---

## 1. Desglose del Esfuerzo de Desarrollo por Módulo

| Módulo / Tarea | Descripción Técnica | Estimación de Horas | Complejidad |
| :--- | :--- | :--- | :--- |
| **1. Base de Datos & Seguridad (Supabase/PostgreSQL)** | • Creación de la tabla `tenants` (configuración de marca, dominios, temas).<br>• Inclusión de la columna `tenant_id` en tablas (`profiles`, `requests`, `courses`).<br>• Configuración de políticas RLS (Row Level Security). | **8 - 12 hs** | Media |
| **2. Detección de Tenant en Frontend** | • Script/Módulo JS para resolver el `tenant_id` vía subdominio, dominio CNAME o parámetro URL.<br>• Almacenamiento en caché local de la configuración de la empresa. | **4 - 8 hs** | Baja |
| **3. Motor de Branding Dinámico (CSS Variables & Assets)** | • Reemplazo de colores hexadecimales duros por variables CSS (`var(--color-primary)`).<br>• Función para inyectar logos, favicons, banderas e imágenes de cabecera según el tenant activo. | **10 - 16 hs** | Baja - Media |
| **4. Motor de Terminología (Copy Engine)** | • Implementación de diccionario de términos ("Asistente" vs "Cuidador", "Solicitar" vs "Necesito").<br>• Marcado HTML (`data-i18n="..."`) para reemplazo automático de textos en interfaz. | **12 - 20 hs** | Media |
| **5. Panel de Super Administración (Careonys Admin)** | • Formulario web interno para dar de alta una nueva empresa en 5 minutos.<br>• Selector de colores (Color Picker), carga de logos y asignación de dominios. | **16 - 24 hs** | Media |

---

## 2. Esfuerzo Total Estimado

* **Total de Horas de Desarrollo**: **50 a 80 horas de trabajo efectivo**.
* **Tiempo de Ejecución**: Entre **1 y 2 semanas laborales** (desarrollador Full-Stack).
* **Complejidad General**: **Media**. No requiere librerías complejas de terceros, sino una buena arquitectura de variables CSS, Supabase RLS y modularización JavaScript.

---

## 3. Comparativa: Modelo Manual vs. Multi-Tenant Dinámico

```mermaid
graph LR
    subgraph Modelo Manual (Clonar Carpetas)
        A1[Crear Empresa 1] -->|Clonar carpeta| B1[Carpeta /empresa1]
        A2[Crear Empresa 2] -->|Clonar carpeta| B2[Carpeta /empresa2]
        A3[Actualizar un Error] -->|Repetir cambio| B1 & B2
    end

    subgraph Modelo Careonys Multi-Tenant
        C[Motor Careonys] -->|Un solo código| D[Empresa A, B, C, D...]
        E[Actualizar un Error] -->|Un solo commit| C
    end
```

### Análisis Financiero / Costo de Mantenimiento

1. **Modelo Manual (Clonar carpetas por cada cliente)**:
   * Costo inicial: **$0** (parece fácil al inicio).
   * Costo a mediano plazo: **Extremadamente alto**. Si tienes 10 empresas reales, cada cambio, corrección de bug o nueva función debe aplicarse manualmente 10 veces en 10 carpetas distintas.

2. **Modelo Multi-Tenant Dinámico (Careonys Core)**:
   * Costo inicial: **50 a 80 hs de desarrollo** (Inversión única).
   * Costo por dar de alta a una nueva empresa real: **$0 y 5 minutos** (Completar un formulario en el panel admin).
   * Costo de mantenimiento: **Mínimo**. Cualquier actualización beneficia a todas las empresas clientes simultáneamente.

---

## 4. Conclusión y Recomendación

La inversión inicial en desarrollar la arquitectura Multi-Tenant dinámicamente es **altamente rentable**. Se paga sola con el alta de las primeras 2 o 3 empresas licenciatarias reales, evitando la acumulación de deuda técnica y garantizando la escalabilidad de Careonys.
