# Análisis Profundo y Detallado Campo por Campo: Cuidarlos.com & app.cuidarlos.com

## 1. Introducción y Propósito
Este documento proporciona la especificación funcional completa, detallada pantalla por pantalla, campo por campo y flujo por flujo de la plataforma **Cuidarlos** (`cuidarlos.com` y `app.cuidarlos.com`). 

El objetivo es contar con el inventario exhaustivo de todos los formularios, inputs, wizards multi-paso, opciones de filtrado, campos de perfil y herramientas de comunicación para implementar o replicar cualquiera de estas capacidades en **Careonys Marketplace**.

---

## 2. Flujo de Autenticación y Registro (`app.cuidarlos.com`)

### 2.1. Pantalla de Bienvenida e Inicio (`/intro` y `/login`)
- **Visualización**: Header con logo Cuidarlos, ilustración descriptiva, botones principales.
- **Acciones**:
  - Botón `Ingresar`: Abre formulario de Login.
  - Botón `Registrarse`: Conduce a la selección de tipo de cuenta.
- **Formulario de Login**:
  - `Correo electrónico`: Input de texto / email (Ej. `alberto.limeses@gmail.com`). Validation: Regex formato email.
  - `Contraseña`: Input de clave con botón toggle de mostrar/ocultar contraseña (Ej. `Cuidarlos123456!`).
  - Botón `¿Olvidaste tu contraseña?`: Dispara flujo de recuperación por correo.
  - Botón `Ingresá`: Envía credenciales vía API de autenticación.

### 2.2. Selección de Rol de Registro (`/signup`)
- **Opciones en Tarjetas Seleccionables**:
  1. `Como familiar`: Registro para buscar cuidadores/asistencia para un ser querido o para sí mismo.
  2. `Como cuidador`: Registro para profesionales, enfermeros o acompañantes terapéuticos que ofrecen servicios.
- Botón `Confirmar`: Habilita y avanza según la tarjeta seleccionada.

### 2.3. Formulario de Registro de Familiar / Cliente (`/signup/customer`)
- **Paso 1: Credenciales de Acceso**:
  - `Correo electrónico` [Texto, Requerido]: Email personal.
  - `Contraseña` [Password, Requerido]: Mínimo 8 caracteres, incluye letras y números.
  - `Repetir contraseña` [Password, Requerido]: Validación de coincidencia en tiempo real.
- **Paso 2: Datos Personales**:
  - `Nombre` [Texto, Requerido]: Nombre del titular.
  - `Apellido` [Texto, Requerido]: Apellido del titular.
  - `Fecha de Nacimiento` [Fecha DD/MM/AAAA, Requerido]: Selector de fecha.
  - `DNI` [Número, Requerido]: Documento Nacional de Identidad (8 dígitos).
  - `Teléfono Celular` [Teléfono, Requerido]: Código de área + número de celular para notificaciones SMS/WhatsApp.
  - `Dirección / Barrio` [Autocomplete Google Places, Requerido]: Buscador con sugerencias de calle, altura, barrio y localidad (ej. *Belgrano, CABA*).
- **Paso 3: Términos y Confirmación**:
  - `Checkbox`: "Acepto los Términos y Condiciones y las Políticas de Privacidad".
  - Botón `Siguiente` / `Registrarse`.

---

## 3. Wizard Multi-Paso para Publicación de Búsqueda de Cuidado (Customer Onboarding)

El sistema guía a las familias en un formulario de **6 Pasos Interactivos** para crear una oferta de trabajo detallada:

### Paso 1: Datos Básicos del Paciente y Urgencia
* `Edad del paciente` [Input Numérico]: Edad exacta del asistido (ej. *80 años* o *8 años*).
* `Género del paciente` [Dropdown Select]:
  - `Femenino`
  - `Masculino`
  - `Otro / Indistinto`
* `Preferencia de género del cuidador` [Radio Buttons]:
  - `Femenino`
  - `Masculino`
  - `Indistinto`
* `¿Es un reemplazo o contratación urgente?` [Radio Buttons]:
  - `Sí` (Activa badge de búsqueda prioritaria / urgente)
  - `No`

### Paso 2: Tareas de Cuidado Requeridas (Multi-select Modal)
Permite seleccionar múltiples etiquetas de responsabilidades requeridas:
* **Higiene y Confort**: Aseo personal, cambio de pañales, baño en cama o ducha, vestimenta.
* **Control de Signos Vitales**: Medición de presión arterial, glucemia, frecuencia cardíaca, saturación.
* **Administración de Medicamentos**: Recordatorio, dosificación según receta médica, administración vía oral o inyectable.
* **Movilidad y Traslados**: Asistencia para levantarse, silla de ruedas, paseos, ejercicios kinesiológicos pasivos.
* **Preparación de Alimentos**: Cocina adaptada, dieta baja en sodio, asistencia para comer.
* **Estimulación Cognitiva**: Acompañamiento terapéutico, juegos de memoria, lectura, conversación.
* **Mantenimiento del Entorno**: Limpieza ligera del espacio del paciente, lavado de ropa del paciente.

### Paso 3: Perfil Profesional y Especialidad Requerida
Selección multi-checkbox del tipo de profesional buscado:
* `Cuidador/a Domiciliario/a`
* `Acompañante Terapéutico (AT)`
* `Enfermero/a Profesional / Licenciado`
* `Niñera / Cuidado Infantil`
* `Especialista en Gerontología / Adultos Mayores`

### Paso 4: Modalidad de Trabajo y Horarios
* `Modalidad` [Radio Selector]:
  - `Con retiro` (Por horas o turnos parciales).
  - `Sin retiro` (Camas adentro / Guardia de 24 horas consecutivas).
* `Frecuencia` [Radio Selector]:
  - `Recurrente` (Horarios fijos semanales).
  - `Eventual` (Por única vez o días específicos puntual).
* `Días de la semana` [Multi-checkbox Grid]: `Lunes`, `Martes`, `Miércoles`, `Jueves`, `Viernes`, `Sábado`, `Domingo`.
* `Rango Horario`:
  - `Hora Inicio` [Time picker, ej. 08:00].
  - `Hora Fin` [Time picker, ej. 18:00].

### Paso 5: Título y Descripción de la Búsqueda
* `Título de la Publicación` [Input Texto, max 100 carac.]: (ej. *Cuidadora para asistencia general en Belgrano*).
* `Descripción Detallada` [Textarea, min 50 carac.]: Explicación libre del diagnóstico (Alzheimer, Parkinson, post-operatorio de cadera, etc.), dinámica familiar, presencia de mascotas y expectativas.

### Paso 6: Resumen y Publicación
* Vista previa de la tarjeta de oferta con botón `Publicar Oferta`.
* Modal de confirmación: "¡Tu búsqueda ha sido publicada con éxito! Comenzarás a recibir postulaciones de cuidadores verificados."

---

## 4. Directorio Público y Sistema de Búsqueda/Filtros (`cuidarlos.com/cuidadores`)

### 4.1. Panel Expansible de Filtros
- `Búsqueda por Nombre / Palabra clave`: Input con lupa.
- `Filtro por Ubicación`: Dropdown por Provincia, Ciudad o Barrio (ej. *Palermo*, *Belgrano*, *Recoleta*, *San Isidro*).
- `Filtro por Especialidades Técnicas`:
  - *Alzheimer / Demencia*
  - *Parkinson*
  - *ACV / Rehabilitación neurológica*
  - *Post-operatorio / Traumatología*
  - *Cuidados Paliativos*
  - *Diabetes / Manejo de Insulina*
  - *Inyectables / Curaciones complejas*
- `Filtro por Rango de Tarifa ($/hora)`: Slider con valores mínimo y máximo en ARS.
- `Filtro por Calificación Mínima`: Botones de 1 a 5 Estrellas (★ 4+, ★ 4.5+).
- `Filtro "Solo Verificados"`: Checkbox que filtra perfiles con documentación y DNI auditados.

### 4.2. Estructura de la Tarjeta y Perfil Completo del Cuidador
Cada tarjeta de cuidador en la lista y su vista de perfil ampliada contienen:
1. **Encabezado y Fotografía**: Foto de perfil profesional en alta resolución.
2. **Badges de Verificación**:
   - 🛡️ `DNI Verificado`: Validación biométrica / identidad oficial.
   - 📜 `Certificados Auditados`: Títulos y matrículas comprobados.
   - 📋 `Antecedentes Penales Limpios`: Certificado de antecedentes cargado.
3. **Información Profesional**:
   - Nombre y Apellido.
   - Título principal (ej. *Enfermera Profesional & Acompañante Terapéutica*).
   - Años de experiencia acreditados.
   - Ubicación y radio de desplazamiento.
4. **Desglose de Tarifas**:
   - `Precio por Hora estándar`: $XXXX / hora.
   - `Precio por Guardia de 12h`: $XXXX / guardia.
   - `Precio por Guardia de 24h / Cama Adentro`: $XXXX / día.
5. **Puntuación y Reseñas**:
   - Promedio en estrellas (ej. *4.9 ★* sobre 5) y cantidad total de opiniones (*28 evaluaciones*).
   - Lista de comentarios de familias contratantes anteriores con fecha e iniciales del contratante.
6. **Grilla de Disponibilidad Semanal**: Matriz visual indicando disponibilidad por turnos (*Mañana*, *Tarde*, *Noche*) de Lunes a Domingo.
7. **Botones de Acción**:
   - Botón `Guardar en Favoritos` (Icono de Corazón).
   - Botón `Contactar / Solicitar Entrevista`.

---

## 5. Módulos de Comunicación e Integración de Videollamada (8x8 VC API)

Cuidarlos cuenta con un módulo de entrevistas virtuales en vivo para evitar que familias y cuidadores deban compartir números telefónicos privados antes de la primera selección:

1. **Chat de Mensajería Privada**:
   - Envío de mensajes de texto en tiempo real.
   - Indicadores de lectura y estado "En línea".
   - Adjuntar archivos (prescripciones, fotos de certificados).
2. **Sistema de Videollamada de Entrevista**:
   - Integración nativa con **8x8 Video Conferencing API** (`vpaas-magic-cookie-335272601c174915b31d72ca735ec700/external_api.js`).
   - Botón `Iniciar Videollamada de Entrevista` en el chat.
   - Generación de sala de video segura y cifrada dentro de la propia aplicación web Ionic/Angular sin necesidad de instalar Zoom ni Meet.

---

## 6. Módulos del Tablero de Cliente / Familia (`Dashboard Cliente`)

1. **Tab `Mis Publicaciones`**:
   - Lista de búsquedas de cuidado activas, pausadas o finalizadas.
   - Contador de postulantes recibidos por oferta.
   - Botón `Editar Publicación`, `Pausar Búsqueda` o `Cerrar Oferta`.
2. **Tab `Solicitudes y Postulantes`**:
   - Kanban / Lista de cuidadores postulados por oferta.
   - Estados del postulante: `Postulado`, `En Entrevista (Video)`, `Seleccionado / Contratado`, `Descartado`.
3. **Tab `Favoritos`**:
   - Comparador de perfiles guardados para evaluar entre los miembros de la familia.
4. **Tab `Mi Cuenta & Configuración`**:
   - Gestión de datos de contacto, dirección principal, familiares autorizados y cambios de clave.

---

## 7. Módulos del Tablero del Cuidador (`Dashboard Cuidador`)

1. **Tab `Feed de Empleos`**:
   - Muestra ofertas de familias filtradas automáticamente por cercanía geográfica y coincidencia de especialidades.
   - Porcentaje de coincidencia / Match Score (ej. *95% Coincidencia con tu perfil*).
   - Botón `Postularme a este Trabajo`.
2. **Tab `Mis Postulaciones`**:
   - Historial de empleos a los que se ha postulado y seguimiento del proceso de selección.
3. **Tab `Mi Perfil Profesional`**:
   - Carga de fotografía, biografía, resumen de experiencia.
   - Carga de tarifas actualizadas ($/hora, $/guardia).
   - Editor interactivo de la Grilla de Disponibilidad Semanal.
4. **Tab `Verificación y Documentación`**:
   - Uploader para DNI (frente y dorso).
   - Uploader de Certificado de Antecedentes Penales (PDF/JPG).
   - Uploader de Títulos, Certificados de Cursos y Matrícula Profesional.
   - Estado de aprobación por parte del administrador (*Pendiente de Revisión*, *Aprobado / Verificado*, *Rechazado con Observaciones*).

---

## 8. Matriz de Requerimientos Funcionales para Careonys Marketplace

A partir de este análisis detallado, se definen los siguientes componentes exactos a construir en **Careonys Marketplace**:

| Módulo / Pantalla | Componentes e Inputs Específicos a Desarrollar en Careonys | Archivo Target |
| :--- | :--- | :--- |
| **Wizard de Publicación** | Implementar el wizard de 6 pasos (Datos paciente, Tareas multi-select, Profesión, Modalidad/Horarios, Título/Desc, Resumen) | `formulario-integral.html` |
| **Buscador & Filtros** | Integrar panel de filtros por especialidad (Alzheimer, Parkinson, ACV), tarifas ($/h), disponibilidad y badge de verificación | `directorio.html` |
| **Ficha de Cuidador** | Tarjeta completa con desglose de tarifario (Hora / Guardia 12h / Guardia 24h), badges de seguridad y disponibilidad | `directorio.html` & `js/main.js` |
| **Badges de Verificación** | Iconografía y etiquetas de estado (*DNI Validado*, *Antecedentes Limpios*, *Título Verificado*) | `css/styles.css` & `js/main.js` |
| **Tablero de Postulaciones** | Vista de seguimiento de solicitudes con estados (*Postulado*, *Entrevista*, *Contratado*) | `dashboard.html` |
