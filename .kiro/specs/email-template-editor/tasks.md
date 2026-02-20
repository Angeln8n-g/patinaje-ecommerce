# Plan de Implementación: Editor de Plantillas de Email

## Resumen

Implementar el editor de plantillas de email integrado en el panel de administración. Incluye tipos compartidos, librería de serialización/parsing de HTML, sistema de variables dinámicas, hooks de estado y historial, componentes del editor visual (lista, canvas, propiedades), API REST con autenticación, migración de base de datos, y funcionalidad de exportar HTML y envío de email de prueba vía Resend.

## Tareas

- [x] 1. Crear migración de base de datos y tipos compartidos
  - [x] 1.1 Crear archivo de migración `backend/src/db/migrations/007_email_templates.sql`
    - Crear tabla `email_templates` con campos: `id` (UUID), `name` (VARCHAR UNIQUE), `subject`, `sender_name`, `reply_to`, `html_content` (TEXT), `content_properties` (JSONB), `style_properties` (JSONB), `trigger_type` (CHECK constraint), `status` (CHECK constraint), `created_at`, `updated_at`
    - Crear índices en `status`, `trigger_type` y `updated_at DESC`
    - Registrar la migración en `backend/src/db/migrate.ts`
    - _Requisitos: 10.1, 10.3_

  - [x] 1.2 Crear tipos TypeScript en `src/lib/email-templates/types.ts`
    - Definir tipos `TriggerType`, `TemplateStatus`
    - Definir interfaces `ContentProperties`, `StyleProperties`, `TemplateConfig`, `EmailTemplate`, `EmailTemplateListItem`, `TemplateVariable`
    - _Requisitos: 5.2, 5.3, 10.1_

- [x] 2. Implementar librería de serialización, parsing y variables
  - [x] 2.1 Crear plantilla base en `src/lib/email-templates/default-template.ts`
    - Exportar `defaultContentProperties` y `defaultStyleProperties` con valores predeterminados
    - Exportar función `getDefaultTemplate()` que retorna un objeto con propiedades base
    - _Requisitos: 1.2_

  - [x] 2.2 Implementar serializador en `src/lib/email-templates/serializer.ts`
    - Implementar `serializeHtml(content, style)` que genera HTML válido para email
    - Usar `<table>` para layout e inline styles (compatibilidad con Gmail, Outlook, Apple Mail)
    - Aplicar `accentColor` a botones CTA y elementos de acento
    - Aplicar `titleFont` a elementos de título
    - Incluir/excluir secciones según toggles (`showNavigation`, `showCards`, `showBackgroundPattern`, `showSocialLinks`)
    - Omitir secciones cuando el campo de contenido correspondiente esté vacío
    - Marcar secciones con atributos `data-section` para selección en el canvas
    - _Requisitos: 3.2, 3.3, 4.2, 4.3, 4.4, 11.1, 11.3_

  - [x] 2.3 Implementar parser en `src/lib/email-templates/parser.ts`
    - Implementar `parseHtml(html)` que extrae `ContentProperties` y `StyleProperties` del HTML
    - Seguir estrategia de "mejor esfuerzo": extraer cada propiedad independientemente, usar valores por defecto si no se puede parsear, nunca lanzar excepciones
    - _Requisitos: 11.2_

  - [x] 2.4 Implementar variables en `src/lib/email-templates/variables.ts`
    - Exportar `TEMPLATE_VARIABLES` con las variables soportadas: `nombre_usuario`, `email_usuario`, `nombre_tienda`, `url_tienda`, `fecha_actual`
    - Implementar `replaceVariables(html, values)` que reemplaza todos los `{{key}}` con sus valores
    - Implementar `replaceWithExampleValues(html)` que usa valores de ejemplo predefinidos
    - _Requisitos: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.5 Escribir test de propiedad: el serializador refleja todas las propiedades en el HTML
    - **Propiedad 3: El serializador refleja todas las propiedades en el HTML**
    - Generar `ContentProperties` y `StyleProperties` aleatorios con fast-check
    - Verificar que el HTML contiene todos los valores de contenido no vacíos, aplica `accentColor`, incluye/excluye secciones según toggles, y aplica `titleFont`
    - **Valida: Requisitos 3.2, 4.2, 4.3, 4.4, 11.1**

  - [ ]* 2.6 Escribir test de propiedad: campos de contenido vacíos se omiten del HTML
    - **Propiedad 4: Campos de contenido vacíos se omiten del HTML**
    - Generar `ContentProperties` con campos aleatorios vacíos
    - Verificar que el HTML no contiene secciones vacías ni placeholders para esos campos
    - **Valida: Requisito 3.3**

  - [ ]* 2.7 Escribir test de propiedad: HTML compatible con clientes de email
    - **Propiedad 14: HTML compatible con clientes de email**
    - Generar propiedades aleatorias y verificar que el HTML usa `<table>` para layout e inline styles
    - **Valida: Requisito 11.3**

  - [ ]* 2.8 Escribir test de propiedad: parser extrae propiedades del HTML
    - **Propiedad 13: Parser extrae propiedades del HTML**
    - Generar `ContentProperties` y `StyleProperties`, serializar con `serializeHtml`, parsear con `parseHtml`, verificar equivalencia
    - **Valida: Requisitos 11.2, 2.3**

  - [ ]* 2.9 Escribir test de propiedad: round-trip de serialización/parsing
    - **Propiedad 15: Round-trip de serialización/parsing**
    - Generar propiedades aleatorias, verificar que `serializeHtml(parseHtml(serializeHtml(c, s)))` produce HTML equivalente a `serializeHtml(c, s)`
    - **Valida: Requisito 11.4**

  - [ ]* 2.10 Escribir test de propiedad: reemplazo completo de variables
    - **Propiedad 9: Reemplazo completo de variables**
    - Generar HTML con variables aleatorias `{{key}}` y un mapa completo de valores
    - Verificar que `replaceVariables()` no deja ningún `{{...}}` en el resultado
    - **Valida: Requisitos 8.3, 8.4**

- [x] 3. Checkpoint - Verificar librería de serialización, parsing y variables
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 4. Implementar hooks de estado del editor
  - [x] 4.1 Crear hook `src/hooks/useHistoryStack.ts`
    - Implementar stack de historial con `push`, `undo`, `redo`, `canUndo`, `canRedo`
    - Almacenar snapshots de `ContentProperties`, `StyleProperties` y `htmlContent`
    - Al hacer undo, retornar el snapshot anterior; al hacer redo, retornar el siguiente
    - Al hacer push después de un undo, truncar los estados posteriores del historial
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 Escribir test de propiedad: round-trip de undo/redo restaura estado
    - **Propiedad 7: Round-trip de undo/redo restaura estado**
    - Generar secuencias aleatorias de N cambios, ejecutar N undos y verificar estado inicial, luego N redos y verificar estado final
    - **Valida: Requisitos 6.1, 6.2, 6.3**

  - [ ]* 4.3 Escribir test de propiedad: nuevo cambio después de undo trunca historial
    - **Propiedad 8: Nuevo cambio después de undo trunca historial de redo**
    - Generar secuencia de cambios, ejecutar K undos, hacer nuevo cambio, verificar que `canRedo` es `false`
    - **Valida: Requisito 6.4**

  - [x] 4.4 Crear hook `src/hooks/useEmailTemplateEditor.ts`
    - Implementar estado completo del editor: `templates`, `activeTemplate`, `contentProperties`, `styleProperties`, `config`, `htmlContent`, `viewMode`, `previewMode`, `selectedSection`, `isDirty`, `isLoading`
    - Implementar acciones: `loadTemplates`, `selectTemplate`, `createTemplate`, `saveTemplate`, `deleteTemplate`
    - Implementar `updateContent`, `updateStyle`, `updateConfig` que actualizan propiedades y regeneran HTML vía `serializeHtml`
    - Implementar `updateHtml` que parsea HTML vía `parseHtml` y actualiza propiedades
    - Integrar `useHistoryStack` para undo/redo en cada cambio
    - Implementar `exportHtml` que descarga archivo `.html`
    - Implementar `sendTestEmail` que llama al endpoint de envío de prueba
    - Implementar validación de campos obligatorios al cambiar estado a "activa"
    - _Requisitos: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.2, 4.2, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.3, 11.1, 11.2_

- [x] 5. Checkpoint - Verificar hooks del editor
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 6. Implementar API REST de plantillas en el backend
  - [x] 6.1 Crear `backend/src/routes/email-templates.ts` con endpoints CRUD y envío de prueba
    - `GET /api/email-templates` — listar plantillas ordenadas por `updated_at` DESC (retornar metadatos: id, name, status, triggerType, updatedAt)
    - `GET /api/email-templates/:id` — obtener plantilla completa con todas las propiedades
    - `POST /api/email-templates` — crear plantilla con datos proporcionados, retornar plantilla creada
    - `PUT /api/email-templates/:id` — actualizar plantilla, validar campos obligatorios si estado cambia a "activa", validar unicidad de nombre, actualizar `updated_at`
    - `DELETE /api/email-templates/:id` — eliminar plantilla, retornar confirmación
    - `POST /api/email-templates/:id/send-test` — enviar email de prueba vía Resend con HTML de la plantilla, reemplazando variables con valores de ejemplo
    - Todas las rutas protegidas con `requireAuth` y `requireRole("ADMIN")`
    - Mapeo snake_case (BD) → camelCase (API) en las respuestas
    - Registrar la ruta en `backend/src/index.ts`
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.2, 10.3, 10.4_

  - [ ]* 6.2 Escribir test de propiedad: ordenamiento de lista de plantillas
    - **Propiedad 1: Ordenamiento de lista de plantillas**
    - Generar N plantillas con timestamps aleatorios, verificar que GET retorna lista ordenada por `updated_at` DESC
    - **Valida: Requisito 1.1**

  - [ ]* 6.3 Escribir test de propiedad: round-trip de persistencia
    - **Propiedad 2: Round-trip de persistencia de plantilla**
    - Generar plantilla con propiedades aleatorias, guardar vía PUT, cargar vía GET, verificar equivalencia
    - **Valida: Requisitos 1.4, 9.3, 9.4**

  - [ ]* 6.4 Escribir test de propiedad: valores válidos de enumeración
    - **Propiedad 5: Valores válidos de enumeración**
    - Generar strings aleatorios para `trigger_type` y `status`, verificar que valores fuera de los permitidos son rechazados
    - **Valida: Requisitos 5.2, 5.3**

  - [ ]* 6.5 Escribir test de propiedad: activación requiere campos obligatorios
    - **Propiedad 6: Activación requiere campos obligatorios completos**
    - Generar plantilla con campos obligatorios aleatorios vacíos, intentar cambiar estado a "activa", verificar rechazo
    - **Valida: Requisitos 5.4, 5.5**

  - [ ]* 6.6 Escribir test de propiedad: updated_at se actualiza al guardar
    - **Propiedad 11: updated_at se actualiza al guardar**
    - Guardar plantilla, verificar que `updated_at` es mayor o igual al timestamp previo
    - **Valida: Requisito 10.2**

  - [ ]* 6.7 Escribir test de propiedad: unicidad del nombre de plantilla
    - **Propiedad 12: Unicidad del nombre de plantilla**
    - Intentar crear dos plantillas con el mismo nombre, verificar que la segunda falla con error
    - **Valida: Requisito 10.3**

  - [ ]* 6.8 Escribir test de propiedad: autenticación requerida en todos los endpoints
    - **Propiedad 10: Autenticación requerida en todos los endpoints**
    - Para cada endpoint, enviar petición sin token válido con rol ADMIN, verificar respuesta 401 o 403
    - **Valida: Requisito 9.7**

- [x] 7. Checkpoint - Verificar API REST backend
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 8. Implementar componentes del editor - Panel Lista y Canvas
  - [x] 8.1 Crear componente `src/components/admin/email-templates/TemplateListPanel.tsx`
    - Mostrar lista de plantillas con nombre, estado (badge de color) y fecha de última modificación
    - Botón "Crear plantilla" que llama a `createTemplate`
    - Selección de plantilla que llama a `selectTemplate`
    - Diálogo de confirmación al eliminar, con advertencia adicional si la plantilla está "activa"
    - _Requisitos: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [x] 8.2 Crear componente `src/components/admin/email-templates/TemplateCanvas.tsx`
    - Renderizar HTML en iframe aislado para vista previa
    - Toggle entre vista previa y vista de código HTML con resaltado de sintaxis
    - Toggle entre modo escritorio (ancho completo) y móvil (375px)
    - Detectar clic en secciones del iframe (usando atributos `data-section`) para selección
    - Resaltar visualmente la sección seleccionada
    - Al editar HTML en vista de código y guardar, actualizar propiedades vía `updateHtml`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 9. Implementar componentes del editor - Panel de Propiedades
  - [x] 9.1 Crear componente `src/components/admin/email-templates/ContentTab.tsx`
    - Campos editables: nombre de marca, etiqueta hero, título, subtítulo, texto CTA, URL CTA, texto del cuerpo, texto del pie de página
    - Cada cambio llama a `updateContent` para actualización en tiempo real del canvas
    - Soporte para insertar variables dinámicas `{{variable}}` en los campos de texto
    - Mostrar variables con estilo visual diferenciado (badge)
    - _Requisitos: 3.1, 3.2, 8.1, 8.2_

  - [x] 9.2 Crear componente `src/components/admin/email-templates/StyleTab.tsx`
    - Controles: selector de color de acento (con presets), color de fondo hero, selector de tipografía del título
    - Toggles: navegación, tarjetas, patrón de fondo, enlaces sociales
    - Cada cambio llama a `updateStyle` para actualización en tiempo real del canvas
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

  - [x] 9.3 Crear componente `src/components/admin/email-templates/ConfigTab.tsx`
    - Campos: nombre de plantilla, asunto, nombre del remitente, email de respuesta
    - Selector de tipo de trigger: automático-registro, manual-campaña, evento-disparado
    - Selector de estado: activa, borrador, pausada
    - Validación al cambiar a "activa": mostrar campos faltantes si hay obligatorios vacíos
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 9.4 Crear componente `src/components/admin/email-templates/PropertiesPanel.tsx`
    - Contenedor con tres pestañas: Contenido, Estilo, Configuración
    - Renderizar `ContentTab`, `StyleTab` o `ConfigTab` según pestaña activa
    - _Requisitos: 3.1, 4.1, 5.1_

- [x] 10. Implementar componente contenedor y página del editor
  - [x] 10.1 Crear componente `src/components/admin/email-templates/EmailTemplateEditor.tsx`
    - Layout de tres paneles: TemplateListPanel (izquierda), TemplateCanvas (centro), PropertiesPanel (derecha)
    - Barra de herramientas superior con botones: Deshacer, Rehacer, Guardar, Exportar HTML, Enviar email de prueba
    - Modal para ingresar dirección de email de prueba al hacer clic en "Enviar email de prueba"
    - Notificaciones toast de éxito/error para guardado y envío de prueba
    - Diálogo de confirmación al navegar fuera con cambios sin guardar (`isDirty`)
    - Integrar `useEmailTemplateEditor` como hook principal
    - _Requisitos: 1.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 Crear página `src/app/admin/email-templates/page.tsx`
    - Renderizar `EmailTemplateEditor` como componente principal
    - Agregar enlace en la navegación lateral del admin para acceder a `/admin/email-templates`
    - _Requisitos: 1.1_

- [x] 11. Checkpoint - Verificar editor completo frontend
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 12. Integración final y proxy
  - [x] 12.1 Configurar proxy para la ruta `/api/email-templates`
    - Agregar la ruta en `src/proxy.ts` para que las peticiones del frontend se redirijan al backend
    - _Requisitos: 9.1_

  - [x] 12.2 Conectar el envío de email de prueba con Resend
    - Verificar que el endpoint `POST /api/email-templates/:id/send-test` usa el servicio Resend correctamente
    - Reemplazar variables con valores de ejemplo antes del envío
    - Retornar notificación de éxito o error con detalle del fallo
    - _Requisitos: 7.3, 7.4, 7.5, 8.3_

- [x] 13. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedad validan propiedades universales de correctitud usando `fast-check` con Vitest
- Los tests unitarios validan ejemplos específicos y edge cases
- El diseño usa TypeScript tanto en frontend (Next.js) como en backend (Express)
