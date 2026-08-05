# Estructura Modular de Carpetas de las Aplicaciones (Careonys SaaS - CeltaTech)

**Documento de Organización de la Arquitectura del Código**  
**Fecha de Documentación**: 4 de Agosto de 2026  
**Desarrollador del Software**: **CeltaTech**  
**Producto**: **Careonys SaaS** (Módulo Marketplace)  
**Ubicación**: `docs/estructura_de_carpetas_apps.md`  

---

## 📁 Árbol de Carpetas Organizado por Aplicación (`apps/`)

```
Careonys-Marketplace/
├── apps/
│   ├── app-familia/             # 📱 MÓDULO APP DE LA FAMILIA
│   │   └── index.html           # Portal Móvil Familiar (Búsquedas, GPS Clock-in, Bitácora, Facturación)
│   ├── app-cuidador/            # 📱 MÓDULO APP DEL CUIDADOR
│   │   └── index.html           # Portal Móvil del Cuidador (Postulación de Legajo y Legales)
│   └── panel-prestadora/        # 🖥️ MÓDULO PANEL DE LA PRESTADORA (Tenant Admin)
│       └── index.html           # Dashboard de Selección de PresDemo/Agencias (Auditoría, Avales, Presentismo GPS)
├── js/
│   └── apiClient.js             # Capa Abstracción de API (Mock LocalStorage / Configurable a Supabase Client)
├── docs/                        # Documentación Técnica y Legales (Regla AGENTS.md)
│   ├── estructura_de_carpetas_apps.md
│   ├── plan_migracion_supabase.md
│   ├── terminos_y_condiciones_cuidadores.md
│   ├── terminos_y_condiciones_familias.md
│   └── especificacion_apps_familia_y_prestadora_careonys.md
```

---

## 🔄 Comunicación e Interoperabilidad entre Módulos

Todos los módulos dentro de `apps/` consumen la capa unificada de datos **`js/apiClient.js`**:

1. **Aspirante** se postula desde `apps/app-cuidador/` y sus datos entran a `CareonysAPI.registrarAspirante()`.
2. **Prestadora** abre `apps/panel-prestadora/`, lee la cola de legajos con `CareonysAPI.getAspirantes()`, audita los documentos y aprueba el aval otorgando el estado 🟢 *"Validado por Prestadora"*.
3. **Familia** abre `apps/app-familia/`, busca cuidadores validados, monitorea en vivo el fichado GPS (`CareonysAPI.registrarFichadoGPS()`) y consulta la bitácora diaria (`CareonysAPI.registrarBitacoraDiaria()`).
