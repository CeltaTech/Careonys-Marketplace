# Análisis de la Estructura de Páginas HTML (Plataforma Multi-Tenant Careonys)

Este documento detalla la arquitectura global del software **Careonys**, la función de las plantillas HTML heredadas del modelo de referencia y la estructura de la licenciataria de demostración **PresDemo**.

---

## 1. Visión y Arquitectura del Proyecto

* **Careonys**: Es la plataforma SaaS Multi-Tenant madre. Proporciona la infraestructura, APIs, catálogo de personal y motor de gestión para marcas licenciatarias de asistencia y cuidado.
* **Cuidarlos.com (Maqueta Base / Referencia Externa)**: Fue el modelo de referencia inicial que inspiró los flujos del marketplace. **No forma parte del producto comercial final de Careonys**. Las vistas ubicadas en la raíz del proyecto corresponden a la maqueta base heredada de esta referencia.
* **PresDemo (`/presdemo`)**: Es una **licenciataria ficticia** creada dentro del software para fines de demostración comercial, pruebas de interfaz, validación de flujos y detección de errores.

---

## 2. Plantillas HTML en la Raíz (Maqueta Base / Referencia Cuidarlos)

*Estas vistas son la maqueta base heredada de la referencia inicial. Sirven como código fuente original antes de ser tematizadas e integradas por cada licenciataria:*

| Archivo HTML | Función y Propósito Principal |
| :--- | :--- |
| **`index.html`** | **Landing Page de Referencia**: Presenta el flujo inicial de búsqueda de cuidadores y accesos principales. |
| **`directorio.html`** | **Directorio Base**: Catálogo de perfiles con filtros por zona, horario y especialidad. |
| **`perfil.html`** | **Detalle de Perfil Base**: Ficha individual con información del profesional. |
| **`cursos.html`** | **Módulo de Capacitación**: Estructura para el catálogo de cursos y talleres. |
| **`necesito-cuidador.html`** | **Flujo de Demanda**: Formulario base para familias o clientes que buscan contratar servicios. |
| **`soy-cuidador.html`** | **Flujo de Oferta**: Formulario base de postulación para profesionales. |
| **`acompanamiento.html`** | **Servicio de Asesoría**: Estructura descriptiva para servicios de acompañamiento online. |

---

## 3. Entorno de Demostración — Licenciataria Ficticia PresDemo (`/presdemo`)

*Esta carpeta contiene la primera implementación funcional de un tenant licenciatario de Careonys ("PresDemo / Sendler Group"), adaptada con terminología propia ("Asistentes") e identidad visual personalizada:*

| Archivo HTML | Función y Propósito Principal en la Demo |
| :--- | :--- |
| **`presdemo/index.html`** | **Landing Page Institucional PresDemo**: Portada de demostración comercial orientada a "Asistentes de salud y cuidado". |
| **`presdemo/directorio.html`** | **Red de Asistentes**: Catálogo interactivo de asistentes con branding de PresDemo y badge *Powered by Careonys*. |
| **`presdemo/perfil.html`** | **Perfil de Asistente**: Ficha técnica y perfil del profesional bajo la marca PresDemo. |
| **`presdemo/cursos.html`** | **Formación y Capacitación**: Portal educativo para la red de asistentes y clientes de PresDemo. |
| **`presdemo/solicitar-asistente.html`** | **Solicitud de Asistente**: Formulario de demanda donde las familias/clientes solicitan asistencia. |
| **`presdemo/postulacion-asistente.html`** | **Postulación de Asistentes**: Formulario de reclutamiento para profesionales que se postulan a PresDemo. |
| **`presdemo/soporte-remoto.html`** | **Soporte y Asesoramiento Remoto**: Presentación del servicio de acompañamiento y atención remota de PresDemo. |

---

## 4. Documentación e Identidad (`/docs`)

| Archivo HTML | Función y Propósito Principal |
| :--- | :--- |
| **`docs/PRESDEMO_Manual_Identidad_v1.html`** | **Manual de Marca PresDemo (v1.0)**: Guía interactiva de branding, paleta de colores, tipografías y reglas visuales para la licenciataria de prueba. |

---

## 5. Resumen de la Estrategia Multi-Tenant

1. **Careonys como Motor**: El core del software administra los datos, APIs y lógica de negocio.
2. **PresDemo como Entorno de Pruebas y Ventas**: Permite mostrar a futuros licenciatarios o inversores el funcionamiento real del software en un entorno controlado sin depender de marcas externas.
3. **Desacoplamiento de Cuidarlos**: La maqueta heredada en la raíz servirá de insumo técnico o plantilla para generar nuevos tenants en Careonys, pero la marca Cuidarlos no formará parte de la oferta comercial de Careonys.
