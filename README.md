# Careonys-Marketplace

Plataforma SaaS Multi-Tenant de **CeltaTech** para la gestión, contratación y monitoreo de asistentes gerontológicos y del cuidado de adultos mayores. 

El proyecto consta de una interfaz web responsive avanzada con módulos interactivos completamente maquetados y listos para la integración con el backend.

---

## 🚀 Características Clave (100% Implementadas e Integradas)

1. **Calculadora Interactiva de Presupuesto e Horarios**: Calcula el costo mensual del servicio en base a la complejidad del paciente, cantidad de días y horas semanales requeridos.
2. **Badges de Verificación de 4 Niveles**: Insignias dinámicas de validación de identidad (`DNI Validado`), antecedentes (`Penales OK`), formación (`Título Gerontológico`) y referencias (`Ref. Comprobadas`).
3. **Algoritmo de Match Inteligente**: Indicador porcentual de compatibilidad algorítmica entre los requerimientos del paciente y el perfil del asistente.
4. **Bitácora Digital de Salud y Registro de Signos Vitales**: Módulo interactivo de monitoreo diario de signos (temperatura, glucemia, presión arterial), bitácora de novedades, registro de ingesta de medicamentos con foto y check-in GPS del asistente.
5. **Asesoría de Reintegros para Obras Sociales**: Módulo de asistencia y descarga de documentación de soporte para tramitar reintegros frente a entidades como OSDE, Swiss Medical, Galeno, PAMI, etc.
6. **Gestor del Cuidado y Reserva de Videollamadas**: Coordinación de entrevistas virtuales de evaluación y asignación de gestores gerontológicos dedicados.
7. **Botón de Alerta de Reemplazo Urgente (<2hs)**: Sistema de alerta simulado que notifica a asistentes suplentes a menos de 5 km de distancia ante incidencias imprevistas.
8. **Careonys Academy**: Evaluaciones técnicas de competencias para asistentes que otorgan **Puntos Reputacionales** para subir de rango (Bronce $\rightarrow$ Plata $\rightarrow$ Oro).

---

## 📁 Estructura del Repositorio

* `/` **(Raíz del Proyecto)**: Contiene la interfaz principal del Marketplace de Careonys.
  * [`index.html`](index.html): Landing page principal y portal de acceso.
  * [`directorio.html`](directorio.html): Directorio avanzado de búsqueda de asistentes con filtros y badges.
  * [`perfil.html`](perfil.html): Detalle público del asistente y módulo interactivo de Bitácora Digital de Salud.
  * [`solicitar-asistente.html`](solicitar-asistente.html): Asistente de contratación, calculadora de presupuesto y agenda de videollamadas.
  * [`postulacion-asistente.html`](postulacion-asistente.html): Portal de reclutamiento y registro de nuevos asistentes.
  * [`soporte-remoto.html`](soporte-remoto.html): Sección de acompañamiento, asesoría y soporte.
  * [`cursos.html`](cursos.html): Careonys Academy, listado de cursos y test técnico de nivelación.
  * [`formulario-integral.html`](formulario-integral.html): Formulario paso a paso de registro de datos médicos del paciente.
* [`/presdemo/`](presdemo): Versión de demostración rápida precargada con datos locales simulados para presentaciones inmediatas.
* [`/js/`](js): Capa de abstracción de datos y cliente API unificado.
  * [`apiClient.js`](js/apiClient.js): Conector del backend (soporta modo Mock/LocalStorage y modo Supabase nativo).
* [`/docs/`](docs): Documentación técnica, matrices comerciales y flujos de arquitectura.

---

## 💻 Ejecución Local

Para visualizar y probar los flujos interactivos de la aplicación localmente, inicia un servidor web estático en la raíz del proyecto. Por ejemplo:

```bash
# Usando live-server o npm serve
npx serve .

# O usando Python
python -m http.server 8080
```

Accede a la demo en: `http://localhost:3000` o `http://localhost:8080/index.html`.

---

## 🛠️ Próximos Pasos (Hoja de Ruta)

1. **Backend con Supabase**: Configurar la base de datos relacional y activar `CareonysAPI.useSupabase = true` en [`js/apiClient.js`](js/apiClient.js) siguiendo el [Plan de Migración a Supabase](docs/plan_migracion_supabase.md).
2. **Aplicaciones Móviles**: Desarrollar los portales móviles nativos para Familias y Asistentes de acuerdo con la [Especificación de Apps](docs/especificacion_apps_familia_y_prestadora_careonys.md).
3. **Puesta en Producción**: Vincular el dominio corporativo y desplegar el frontend en Vercel, Netlify o GitHub Pages.
