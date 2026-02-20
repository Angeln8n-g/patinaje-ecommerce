# Documento de Requisitos

## Introducción

Este documento define los requisitos para implementar un sistema completo de cancelación de pedidos en la plataforma de la tienda de patinaje. Actualmente, el sistema solo permite una cancelación limitada por parte del usuario después de 24 horas. Se requiere un sistema robusto que permita a usuarios, repartidores, vendedores y administradores cancelar pedidos bajo condiciones específicas, con registro de motivos, restauración de inventario y notificaciones correspondientes.

## Glosario

- **Sistema_Pedidos**: Módulo backend que gestiona el ciclo de vida de los pedidos (`skating_orders`)
- **Sistema_Tienda**: Interfaz de la tienda para clientes (`/skating-store`)
- **Sistema_Admin**: Panel de administración (`/admin`)
- **Sistema_Repartidor**: Interfaz del repartidor (`/delivery`)
- **Sistema_Vendedor**: Interfaz del vendedor (`/seller`)
- **Sistema_Notificaciones**: Módulo de notificaciones que envía alertas a los usuarios (`skating_notifications`)
- **Pedido**: Registro en la tabla `skating_orders` que representa una orden de compra
- **Ventana_Cancelación**: Período de tiempo configurable durante el cual un usuario puede cancelar su pedido
- **Motivo_Cancelación**: Razón documentada por la cual se cancela un pedido
- **Cancelación**: Tabla de registro que almacena el historial de cancelaciones con motivo, rol del solicitante y marca de tiempo

## Requisitos

### Requisito 1: Cancelación de pedido por parte del usuario

**Historia de Usuario:** Como usuario, quiero poder cancelar un pedido realizado por error dentro de un tiempo determinado, para corregir compras no deseadas sin depender del soporte.

#### Criterios de Aceptación

1. WHILE un Pedido se encuentra en estado "pending" y dentro de la Ventana_Cancelación, THE Sistema_Tienda SHALL mostrar un botón de cancelación en el detalle del pedido
2. WHEN un usuario solicita cancelar su Pedido dentro de la Ventana_Cancelación, THE Sistema_Pedidos SHALL cambiar el estado del Pedido a "cancelled"
3. WHEN un usuario cancela un Pedido, THE Sistema_Pedidos SHALL requerir que el usuario seleccione un Motivo_Cancelación de una lista predefinida
4. IF un usuario intenta cancelar un Pedido fuera de la Ventana_Cancelación, THEN THE Sistema_Tienda SHALL rechazar la solicitud y mostrar un mensaje indicando que el período de cancelación ha expirado
5. IF un usuario intenta cancelar un Pedido que ya se encuentra en estado "dispatched", "delivered" o "cancelled", THEN THE Sistema_Pedidos SHALL rechazar la solicitud y mostrar un mensaje indicando el estado actual del pedido
6. WHEN un Pedido es cancelado por el usuario, THE Sistema_Pedidos SHALL registrar la Cancelación con el identificador del usuario, el Motivo_Cancelación y la marca de tiempo

### Requisito 2: Cancelación de pedido por parte del repartidor

**Historia de Usuario:** Como repartidor, quiero poder cancelar un pedido asignado cuando no es posible completar la entrega, para liberar el pedido y notificar a las partes involucradas.

#### Criterios de Aceptación

1. WHILE un Pedido tiene un envío asignado al repartidor con estado "ASIGNADO" o "EN_RUTA", THE Sistema_Repartidor SHALL mostrar una opción de cancelación en el detalle del envío
2. WHEN un repartidor solicita cancelar un Pedido, THE Sistema_Pedidos SHALL requerir que el repartidor seleccione un Motivo_Cancelación de una lista predefinida que incluya: "Cliente no presente", "Cliente no paga", "No es posible llegar al destino" y "Otro"
3. WHEN un repartidor selecciona "Otro" como Motivo_Cancelación, THE Sistema_Repartidor SHALL requerir que el repartidor ingrese una descripción de al menos 10 caracteres
4. WHEN un repartidor cancela un Pedido, THE Sistema_Pedidos SHALL cambiar el estado del Pedido a "cancelled" y el estado del envío asociado a "CANCELADO"
5. WHEN un repartidor cancela un Pedido, THE Sistema_Pedidos SHALL registrar la Cancelación con el identificador del repartidor, el Motivo_Cancelación y la marca de tiempo
6. IF un repartidor intenta cancelar un Pedido cuyo envío ya se encuentra en estado "ENTREGADO" o "CANCELADO", THEN THE Sistema_Pedidos SHALL rechazar la solicitud

### Requisito 3: Cancelación de pedido por parte del vendedor

**Historia de Usuario:** Como vendedor, quiero poder cancelar un pedido cuando el cliente no paga o desestima la compra, para liberar el inventario y mantener el registro actualizado.

#### Criterios de Aceptación

1. WHILE un Pedido está asociado al vendedor y no se encuentra en estado "delivered" o "cancelled", THE Sistema_Vendedor SHALL mostrar una opción de cancelación en la lista de pedidos del vendedor
2. WHEN un vendedor solicita cancelar un Pedido, THE Sistema_Pedidos SHALL requerir que el vendedor seleccione un Motivo_Cancelación de una lista predefinida que incluya: "Cliente no paga", "Cliente desestima la compra", "Producto no disponible" y "Otro"
3. WHEN un vendedor selecciona "Otro" como Motivo_Cancelación, THE Sistema_Vendedor SHALL requerir que el vendedor ingrese una descripción de al menos 10 caracteres
4. WHEN un vendedor cancela un Pedido, THE Sistema_Pedidos SHALL cambiar el estado del Pedido a "cancelled"
5. WHEN un vendedor cancela un Pedido, THE Sistema_Pedidos SHALL registrar la Cancelación con el identificador del vendedor, el Motivo_Cancelación y la marca de tiempo
6. IF un vendedor intenta cancelar un Pedido que no está asociado a su cuenta, THEN THE Sistema_Pedidos SHALL rechazar la solicitud con un mensaje de error de permisos

### Requisito 4: Restauración de inventario al cancelar un pedido

**Historia de Usuario:** Como administrador, quiero que el inventario se restaure automáticamente cuando se cancela un pedido, para que el stock refleje la disponibilidad real de productos.

#### Criterios de Aceptación

1. WHEN un Pedido es cancelado por cualquier rol, THE Sistema_Pedidos SHALL restaurar el stock de cada producto incluido en el Pedido sumando las cantidades correspondientes
2. WHEN el inventario es restaurado por una cancelación, THE Sistema_Pedidos SHALL crear un registro en `inventory_movements` con tipo "in" y razón que incluya el identificador del pedido y el texto "Cancelación"
3. IF un producto del Pedido cancelado ya no existe en el catálogo, THEN THE Sistema_Pedidos SHALL omitir la restauración de stock para ese producto y registrar una advertencia en el log del servidor
4. FOR ALL cancelaciones que restauran inventario, la suma del stock antes de la cancelación más las cantidades del pedido SHALL ser igual al stock después de la cancelación (propiedad de conservación de inventario)

### Requisito 5: Control administrativo de cancelaciones

**Historia de Usuario:** Como administrador, quiero tener visibilidad y control sobre todas las cancelaciones realizadas en la plataforma, para auditar y gestionar las operaciones de cancelación.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL mostrar un panel de cancelaciones con la lista de todos los pedidos cancelados, incluyendo: identificador del pedido, fecha de cancelación, rol del solicitante, nombre del solicitante y Motivo_Cancelación
2. THE Sistema_Admin SHALL permitir filtrar las cancelaciones por rol del solicitante (usuario, repartidor, vendedor, administrador)
3. THE Sistema_Admin SHALL permitir filtrar las cancelaciones por rango de fechas
4. WHEN un administrador solicita cancelar cualquier Pedido que no se encuentre en estado "delivered" o "cancelled", THE Sistema_Pedidos SHALL cambiar el estado del Pedido a "cancelled"
5. WHEN un administrador cancela un Pedido, THE Sistema_Pedidos SHALL requerir que el administrador ingrese un Motivo_Cancelación
6. WHEN un administrador cancela un Pedido, THE Sistema_Pedidos SHALL registrar la Cancelación con el identificador del administrador, el Motivo_Cancelación y la marca de tiempo

### Requisito 6: Notificaciones de cancelación

**Historia de Usuario:** Como usuario de la plataforma, quiero recibir una notificación cuando un pedido relacionado conmigo es cancelado, para estar informado del estado de mis pedidos.

#### Criterios de Aceptación

1. WHEN un Pedido es cancelado, THE Sistema_Notificaciones SHALL enviar una notificación al usuario propietario del Pedido con el motivo de la cancelación
2. WHEN un Pedido con envío asignado es cancelado por un usuario o administrador, THE Sistema_Notificaciones SHALL enviar una notificación al repartidor asignado informando la cancelación
3. WHEN un Pedido asociado a un vendedor es cancelado por un usuario, repartidor o administrador, THE Sistema_Notificaciones SHALL enviar una notificación al vendedor informando la cancelación
4. THE Sistema_Notificaciones SHALL incluir en cada notificación de cancelación: el identificador corto del pedido, el rol de quien canceló y el Motivo_Cancelación

### Requisito 7: Configuración de la ventana de cancelación

**Historia de Usuario:** Como administrador, quiero poder configurar el tiempo límite para que los usuarios cancelen sus pedidos, para ajustar la política de cancelación según las necesidades del negocio.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL proporcionar un campo de configuración para definir la Ventana_Cancelación en minutos
2. WHEN un administrador actualiza la Ventana_Cancelación, THE Sistema_Pedidos SHALL aplicar el nuevo valor a todos los pedidos futuros
3. THE Sistema_Pedidos SHALL utilizar un valor predeterminado de 30 minutos para la Ventana_Cancelación si no se ha configurado un valor personalizado
4. IF un administrador intenta configurar una Ventana_Cancelación menor a 5 minutos o mayor a 1440 minutos (24 horas), THEN THE Sistema_Admin SHALL rechazar el valor y mostrar un mensaje indicando el rango válido

### Requisito 8: Registro histórico de cancelaciones

**Historia de Usuario:** Como administrador, quiero que todas las cancelaciones queden registradas en una tabla dedicada, para tener un historial auditable de todas las cancelaciones realizadas.

#### Criterios de Aceptación

1. THE Sistema_Pedidos SHALL almacenar cada Cancelación en una tabla dedicada `order_cancellations` con los campos: identificador, identificador del pedido, identificador del usuario que cancela, rol del usuario, Motivo_Cancelación, descripción adicional y marca de tiempo
2. WHEN se consulta el historial de cancelaciones, THE Sistema_Admin SHALL poder obtener las cancelaciones ordenadas por fecha descendente
3. FOR ALL pedidos cancelados en `skating_orders`, SHALL existir exactamente un registro correspondiente en `order_cancellations` (propiedad de integridad referencial)
