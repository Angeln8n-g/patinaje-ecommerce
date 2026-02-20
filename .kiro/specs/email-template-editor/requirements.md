# Documento de Requisitos

## Introducción

Actualmente los correos electrónicos enviados a los usuarios de la tienda (promociones, notificaciones, etc.) utilizan HTML hardcodeado directamente en el código del backend (por ejemplo, la función `buildPromoEmailHtml` en las rutas de promociones). Esto impide que los administradores personalicen el diseño y contenido de los correos sin intervención de un desarrollador.

Se requiere un Editor de Plantillas de Email integrado en el panel de administración que permita crear, editar y gestionar plantillas HTML de correo electrónico con un editor visual tipo "MailStudio". El editor incluirá un panel de lista de plantillas, un canvas central con vista previa y editor de código HTML, y un panel de propiedades para configurar contenido, estilos y metadatos de cada plantilla.

## Glosario

- **Editor_Plantillas**: El módulo completo del editor de plantillas de email, incluyendo la interfaz del panel admin en `/admin/email-templates` y la API backend asociada.
- **Panel_Admin**: La interfaz de administración donde los administradores gestionan las plantillas de email.
- **Panel_Lista**: El panel lateral izquierdo del Editor_Plantillas que muestra la lista de plantillas existentes y permite crear nuevas.
- **Canvas_Central**: El área central del Editor_Plantillas que muestra la vista previa visual del email y permite alternar a la vista de código HTML.
- **Panel_Propiedades**: El panel lateral derecho del Editor_Plantillas con tres pestañas: Contenido, Estilo y Configuración.
- **Plantilla**: Registro en la base de datos que contiene el nombre, HTML, configuración de estilos, metadatos y estado de una plantilla de email.
- **Variable_Plantilla**: Marcador dentro del HTML de la plantilla (formato `{{nombre_variable}}`) que se reemplaza con datos dinámicos al momento del envío.
- **Administrador**: Usuario con rol `ADMIN` que tiene permisos para crear, editar y gestionar plantillas de email.
- **Sección_Email**: Bloque lógico dentro de una plantilla (Header, Hero, Body, Footer) que se puede seleccionar y editar individualmente en el Canvas_Central.
- **Trigger**: Evento o condición que determina cuándo se envía automáticamente un correo usando una plantilla específica (registro, campaña manual, evento del sistema).
- **Serializador_HTML**: Componente que convierte la configuración de propiedades de una Plantilla en código HTML válido para email.
- **Parser_HTML**: Componente que analiza código HTML de email y extrae la configuración de propiedades editable en el Panel_Propiedades.

## Requisitos

### Requisito 1: Gestión de plantillas (CRUD)

**Historia de Usuario:** Como administrador, quiero crear, listar, editar y eliminar plantillas de email, para tener control total sobre los correos que se envían a los usuarios.

#### Criterios de Aceptación

1. WHEN un administrador accede a la ruta `/admin/email-templates`, THE Panel_Lista SHALL mostrar todas las plantillas existentes ordenadas por fecha de última modificación descendente.
2. WHEN un administrador hace clic en "Crear plantilla", THE Editor_Plantillas SHALL crear una nueva Plantilla con HTML base predeterminado y abrir el editor con esa plantilla seleccionada.
3. WHEN un administrador selecciona una plantilla del Panel_Lista, THE Editor_Plantillas SHALL cargar el contenido, estilos y configuración de esa Plantilla en el Canvas_Central y el Panel_Propiedades.
4. WHEN un administrador modifica una plantilla y guarda los cambios, THE Editor_Plantillas SHALL persistir el HTML actualizado, las propiedades de contenido, estilos y configuración en la base de datos.
5. WHEN un administrador elimina una plantilla, THE Editor_Plantillas SHALL solicitar confirmación antes de eliminar la Plantilla de la base de datos.
6. IF un administrador intenta eliminar una plantilla con estado "activa", THEN THE Editor_Plantillas SHALL mostrar una advertencia indicando que la plantilla está en uso antes de permitir la eliminación.

### Requisito 2: Editor visual con canvas de vista previa

**Historia de Usuario:** Como administrador, quiero ver una vista previa visual del email mientras edito la plantilla, para verificar cómo se verá el correo antes de enviarlo.

#### Criterios de Aceptación

1. THE Canvas_Central SHALL renderizar el HTML de la Plantilla activa en un iframe aislado que muestre la vista previa del email.
2. WHEN un administrador alterna a la vista de código, THE Canvas_Central SHALL mostrar el HTML completo de la Plantilla en un editor de código con resaltado de sintaxis.
3. WHEN un administrador edita el HTML en la vista de código y guarda, THE Editor_Plantillas SHALL actualizar la vista previa visual con los cambios realizados.
4. WHEN un administrador alterna al modo de vista previa móvil, THE Canvas_Central SHALL redimensionar el iframe a un ancho de 375px para simular la visualización en dispositivo móvil.
5. WHEN un administrador alterna al modo de vista previa escritorio, THE Canvas_Central SHALL redimensionar el iframe al ancho completo disponible del Canvas_Central.
6. WHEN un administrador hace clic en una Sección_Email en la vista previa, THE Editor_Plantillas SHALL resaltar visualmente la sección seleccionada y mostrar las propiedades correspondientes en el Panel_Propiedades.

### Requisito 3: Panel de propiedades - Pestaña Contenido

**Historia de Usuario:** Como administrador, quiero editar el contenido textual del email desde un formulario estructurado, para modificar textos sin necesidad de editar HTML directamente.

#### Criterios de Aceptación

1. WHEN un administrador selecciona la pestaña "Contenido" del Panel_Propiedades, THE Panel_Propiedades SHALL mostrar campos editables para: nombre de marca, etiqueta hero, título, subtítulo, texto del botón CTA, URL del botón CTA, texto del cuerpo y texto del pie de página.
2. WHEN un administrador modifica un campo de contenido, THE Canvas_Central SHALL actualizar la vista previa en tiempo real reflejando el cambio.
3. WHEN un administrador deja un campo de contenido vacío, THE Editor_Plantillas SHALL omitir esa sección del HTML generado en lugar de mostrar un espacio vacío.

### Requisito 4: Panel de propiedades - Pestaña Estilo

**Historia de Usuario:** Como administrador, quiero personalizar los colores, tipografías y elementos visuales del email, para mantener consistencia con la identidad de marca.

#### Criterios de Aceptación

1. WHEN un administrador selecciona la pestaña "Estilo" del Panel_Propiedades, THE Panel_Propiedades SHALL mostrar controles para: color de acento (con presets de colores), color de fondo del hero, selección de tipografía del título, y toggles para navegación, tarjetas, patrón de fondo y enlaces sociales.
2. WHEN un administrador selecciona un color de acento, THE Canvas_Central SHALL actualizar la vista previa aplicando el color seleccionado a los botones CTA, enlaces y elementos de acento de la Plantilla.
3. WHEN un administrador activa o desactiva un toggle de sección (navegación, tarjetas, patrón de fondo, enlaces sociales), THE Canvas_Central SHALL mostrar u ocultar la sección correspondiente en la vista previa.
4. WHEN un administrador cambia la tipografía del título, THE Canvas_Central SHALL actualizar la vista previa aplicando la fuente seleccionada a los títulos de la Plantilla.

### Requisito 5: Panel de propiedades - Pestaña Configuración

**Historia de Usuario:** Como administrador, quiero configurar los metadatos de envío de cada plantilla, para controlar cuándo y cómo se envían los correos.

#### Criterios de Aceptación

1. WHEN un administrador selecciona la pestaña "Configuración" del Panel_Propiedades, THE Panel_Propiedades SHALL mostrar campos para: nombre de la plantilla, asunto del email, nombre del remitente, email de respuesta, tipo de trigger y estado.
2. THE Editor_Plantillas SHALL permitir seleccionar uno de los siguientes tipos de trigger: "automático-registro" (se envía al registrarse un usuario), "manual-campaña" (se envía manualmente a un grupo de usuarios), "evento-disparado" (se envía cuando ocurre un evento específico del sistema).
3. THE Editor_Plantillas SHALL permitir seleccionar uno de los siguientes estados para la Plantilla: "activa" (disponible para envío), "borrador" (en edición, no disponible para envío), "pausada" (temporalmente desactivada).
4. WHEN un administrador cambia el estado de una plantilla de "borrador" a "activa", THE Editor_Plantillas SHALL validar que los campos obligatorios (nombre, asunto, nombre del remitente, email de respuesta, HTML) estén completos antes de permitir la activación.
5. IF un administrador intenta activar una plantilla con campos obligatorios vacíos, THEN THE Editor_Plantillas SHALL mostrar un mensaje indicando los campos faltantes y mantener el estado en "borrador".

### Requisito 6: Historial de cambios (Deshacer/Rehacer)

**Historia de Usuario:** Como administrador, quiero poder deshacer y rehacer cambios mientras edito una plantilla, para corregir errores sin perder trabajo previo.

#### Criterios de Aceptación

1. WHEN un administrador realiza un cambio en la Plantilla (contenido, estilo o código HTML), THE Editor_Plantillas SHALL almacenar el estado anterior en un historial de cambios en memoria.
2. WHEN un administrador hace clic en "Deshacer", THE Editor_Plantillas SHALL revertir la Plantilla al estado anterior del historial y actualizar el Canvas_Central y el Panel_Propiedades.
3. WHEN un administrador hace clic en "Rehacer", THE Editor_Plantillas SHALL restaurar el estado siguiente del historial y actualizar el Canvas_Central y el Panel_Propiedades.
4. WHEN un administrador realiza un nuevo cambio después de haber deshecho cambios, THE Editor_Plantillas SHALL descartar los estados posteriores del historial.

### Requisito 7: Exportar HTML y enviar email de prueba

**Historia de Usuario:** Como administrador, quiero exportar el HTML de una plantilla y enviar un correo de prueba, para verificar el resultado final antes de activar la plantilla.

#### Criterios de Aceptación

1. WHEN un administrador hace clic en "Exportar HTML", THE Editor_Plantillas SHALL descargar un archivo `.html` con el contenido HTML completo de la Plantilla activa.
2. WHEN un administrador hace clic en "Enviar email de prueba", THE Editor_Plantillas SHALL mostrar un campo para ingresar una dirección de email de destino.
3. WHEN un administrador confirma el envío de prueba con una dirección de email válida, THE Editor_Plantillas SHALL enviar el correo utilizando el servicio Resend con el HTML de la Plantilla activa, el asunto configurado y el remitente configurado.
4. WHEN el envío de prueba se completa exitosamente, THE Editor_Plantillas SHALL mostrar una notificación de éxito indicando que el correo fue enviado.
5. IF el envío de prueba falla, THEN THE Editor_Plantillas SHALL mostrar una notificación de error con el detalle del fallo.

### Requisito 8: Variables dinámicas en plantillas

**Historia de Usuario:** Como administrador, quiero insertar variables dinámicas en las plantillas, para que los correos se personalicen automáticamente con datos del usuario o del contexto.

#### Criterios de Aceptación

1. THE Editor_Plantillas SHALL soportar las siguientes variables de plantilla como mínimo: `{{nombre_usuario}}`, `{{email_usuario}}`, `{{nombre_tienda}}`, `{{url_tienda}}`, `{{fecha_actual}}`.
2. WHEN un administrador inserta una Variable_Plantilla en el contenido, THE Canvas_Central SHALL mostrar la variable con un estilo visual diferenciado (badge o resaltado) en la vista previa.
3. WHEN se envía un email de prueba, THE Editor_Plantillas SHALL reemplazar las variables de plantilla con valores de ejemplo predefinidos.
4. WHEN se envía un email real utilizando una Plantilla, THE Editor_Plantillas SHALL reemplazar las variables de plantilla con los datos reales del destinatario y del contexto.

### Requisito 9: API REST para plantillas de email

**Historia de Usuario:** Como desarrollador, quiero una API REST para gestionar plantillas de email, para que el frontend del editor pueda comunicarse con el backend.

#### Criterios de Aceptación

1. WHEN se realiza una petición GET a `/api/email-templates`, THE Editor_Plantillas SHALL retornar la lista de todas las plantillas con sus metadatos (id, nombre, estado, trigger, fecha de modificación).
2. WHEN se realiza una petición GET a `/api/email-templates/:id`, THE Editor_Plantillas SHALL retornar la plantilla completa incluyendo HTML, propiedades de contenido, estilos y configuración.
3. WHEN se realiza una petición POST a `/api/email-templates`, THE Editor_Plantillas SHALL crear una nueva plantilla con los datos proporcionados y retornar la plantilla creada.
4. WHEN se realiza una petición PUT a `/api/email-templates/:id`, THE Editor_Plantillas SHALL actualizar la plantilla existente con los datos proporcionados y retornar la plantilla actualizada.
5. WHEN se realiza una petición DELETE a `/api/email-templates/:id`, THE Editor_Plantillas SHALL eliminar la plantilla y retornar confirmación de eliminación.
6. WHEN se realiza una petición POST a `/api/email-templates/:id/send-test`, THE Editor_Plantillas SHALL enviar un email de prueba a la dirección proporcionada usando el HTML y configuración de la plantilla.
7. IF una petición a la API no incluye un token de autenticación válido con rol ADMIN, THEN THE Editor_Plantillas SHALL retornar un error 403 Forbidden.

### Requisito 10: Persistencia de plantillas en base de datos

**Historia de Usuario:** Como administrador, quiero que las plantillas se almacenen de forma confiable en la base de datos, para que persistan entre sesiones y estén disponibles para el sistema de envío de correos.

#### Criterios de Aceptación

1. THE Editor_Plantillas SHALL almacenar cada Plantilla en una tabla `email_templates` con los campos: id (UUID), name, subject, sender_name, reply_to, html_content, content_properties (JSONB), style_properties (JSONB), trigger_type, status, created_at, updated_at.
2. WHEN se guarda una Plantilla, THE Editor_Plantillas SHALL actualizar el campo `updated_at` con la fecha y hora actual.
3. THE Editor_Plantillas SHALL validar que el campo `name` sea único entre todas las plantillas.
4. WHEN se consulta una plantilla por trigger_type y estado "activa", THE Editor_Plantillas SHALL retornar la plantilla correspondiente para ser utilizada por el sistema de envío de correos.

### Requisito 11: Serialización y parsing de HTML de plantillas

**Historia de Usuario:** Como administrador, quiero que los cambios en las propiedades se reflejen en el HTML y viceversa, para poder editar tanto visualmente como en código.

#### Criterios de Aceptación

1. WHEN un administrador modifica propiedades en el Panel_Propiedades, THE Serializador_HTML SHALL generar HTML válido para email que refleje las propiedades configuradas.
2. WHEN un administrador edita HTML en la vista de código, THE Parser_HTML SHALL extraer las propiedades editables y actualizar el Panel_Propiedades.
3. THE Serializador_HTML SHALL generar HTML compatible con los principales clientes de email (Gmail, Outlook, Apple Mail) utilizando tablas para layout e inline styles.
4. FOR ALL Plantillas válidas, parsear el HTML generado por el Serializador_HTML y luego serializar el resultado del parsing SHALL producir HTML funcionalmente equivalente (propiedad round-trip).
