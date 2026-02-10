# Documento de Requisitos: Sistema de Vendedor y Punto de Venta

## Introducción

La tienda de skating está creciendo y necesita incorporar vendedores que puedan gestionar pedidos y realizar ventas presenciales. Este sistema introduce el rol de vendedor (SELLER) con capacidad de crear y gestionar pedidos en tienda, una funcionalidad de punto de venta (POS/caja) para ventas locales, y un dashboard administrativo mejorado para monitorear el rendimiento de vendedores y repartidores.

## Glosario

- **Sistema_POS**: Módulo de punto de venta que permite a los vendedores procesar ventas presenciales en la tienda física.
- **Vendedor**: Usuario con rol SELLER que puede crear pedidos, asignar pedidos a su nombre y despachar productos en tienda.
- **Panel_Admin**: Panel de administración existente en `/admin` que será extendido con métricas de vendedores y repartidores.
- **Pedido_Tienda**: Pedido creado por un vendedor directamente en la tienda física, con tipo de entrega "retiro en tienda".
- **Pedido_Online**: Pedido creado por un cliente a través de la tienda en línea, que puede ser asignado a un vendedor para despacho.
- **Dashboard_Vendedor**: Interfaz dedicada para el vendedor donde gestiona sus pedidos y ventas del día.
- **Sesión_Caja**: Período de tiempo durante el cual un vendedor opera el punto de venta, con apertura y cierre de caja.

## Requisitos

### Requisito 1: Gestión del Rol de Vendedor

**Historia de Usuario:** Como administrador, quiero crear y gestionar vendedores en el sistema, para que puedan operar el punto de venta y gestionar pedidos en tienda.

#### Criterios de Aceptación

1. CUANDO un administrador asigna el rol SELLER a un perfil de usuario, EL Sistema_POS DEBERÁ permitir a ese usuario acceder al módulo de vendedor
2. CUANDO un usuario con rol SELLER inicia sesión, EL Sistema_POS DEBERÁ redirigirlo al Dashboard_Vendedor
3. CUANDO un usuario sin rol SELLER intenta acceder al módulo de vendedor, EL Sistema_POS DEBERÁ denegar el acceso y redirigir a la página principal
4. EL Panel_Admin DEBERÁ mostrar una lista de todos los vendedores registrados con su nombre, email y estado activo
5. CUANDO un administrador desactiva un vendedor, EL Sistema_POS DEBERÁ impedir que ese vendedor acceda al módulo de vendedor

### Requisito 2: Creación de Pedidos por Vendedor

**Historia de Usuario:** Como vendedor, quiero crear pedidos a nombre de clientes en la tienda, para que pueda despachar productos de forma presencial.

#### Criterios de Aceptación

1. CUANDO un vendedor crea un Pedido_Tienda, EL Sistema_POS DEBERÁ registrar el ID del vendedor como creador del pedido
2. CUANDO un vendedor busca productos para agregar al pedido, EL Sistema_POS DEBERÁ mostrar productos disponibles con stock actual y precio
3. CUANDO un vendedor agrega un producto al pedido, EL Sistema_POS DEBERÁ validar que el stock disponible sea suficiente para la cantidad solicitada
4. SI el stock de un producto es insuficiente para la cantidad solicitada, ENTONCES EL Sistema_POS DEBERÁ mostrar un mensaje de error indicando el stock disponible
5. CUANDO un vendedor confirma un Pedido_Tienda, EL Sistema_POS DEBERÁ descontar el stock de cada producto del inventario
6. CUANDO un vendedor crea un Pedido_Tienda, EL Sistema_POS DEBERÁ registrar el nombre del cliente y un teléfono de contacto opcional

### Requisito 3: Punto de Venta (Caja)

**Historia de Usuario:** Como vendedor, quiero procesar ventas presenciales con funcionalidad de caja, para que pueda cobrar a los clientes en la tienda física.

#### Criterios de Aceptación

1. CUANDO un vendedor abre una Sesión_Caja, EL Sistema_POS DEBERÁ registrar la fecha, hora y monto inicial de caja
2. CUANDO un vendedor agrega productos al carrito del POS, EL Sistema_POS DEBERÁ calcular el subtotal, impuestos aplicables y total en tiempo real
3. CUANDO un vendedor procesa un pago en efectivo, EL Sistema_POS DEBERÁ calcular el cambio a devolver basado en el monto recibido y el total del pedido
4. CUANDO un vendedor procesa un pago con tarjeta, EL Sistema_POS DEBERÁ registrar el método de pago como "tarjeta" en el pedido
5. CUANDO un vendedor completa una venta, EL Sistema_POS DEBERÁ generar un recibo con los detalles del pedido, método de pago y nombre del vendedor
6. CUANDO un vendedor cierra la Sesión_Caja, EL Sistema_POS DEBERÁ mostrar un resumen con el total de ventas, número de transacciones y desglose por método de pago
7. CUANDO un vendedor cierra la Sesión_Caja, EL Sistema_POS DEBERÁ comparar el monto esperado en caja con el monto real reportado por el vendedor

### Requisito 4: Asignación de Pedidos a Vendedores

**Historia de Usuario:** Como administrador, quiero asignar pedidos online a vendedores para despacho en tienda, para que los clientes puedan recoger sus pedidos con un vendedor asignado.

#### Criterios de Aceptación

1. CUANDO un administrador asigna un Pedido_Online a un vendedor, EL Sistema_POS DEBERÁ registrar el vendedor asignado y cambiar el estado del pedido a "asignado_vendedor"
2. CUANDO un pedido es asignado a un vendedor, EL Dashboard_Vendedor DEBERÁ mostrar el pedido en la lista de pedidos pendientes del vendedor
3. CUANDO un vendedor marca un pedido como despachado, EL Sistema_POS DEBERÁ actualizar el estado del pedido a "entregado" y registrar la fecha y hora de despacho
4. SI un administrador intenta asignar un pedido ya asignado a otro vendedor, ENTONCES EL Sistema_POS DEBERÁ solicitar confirmación antes de reasignar

### Requisito 5: Dashboard del Vendedor

**Historia de Usuario:** Como vendedor, quiero ver un resumen de mis ventas y pedidos asignados, para que pueda gestionar mi trabajo diario de forma eficiente.

#### Criterios de Aceptación

1. CUANDO un vendedor accede al Dashboard_Vendedor, EL Sistema_POS DEBERÁ mostrar el total de ventas del día, número de pedidos completados y pedidos pendientes
2. CUANDO un vendedor consulta su historial, EL Sistema_POS DEBERÁ mostrar una lista de todos los pedidos creados y despachados por ese vendedor con fecha, monto y estado
3. EL Dashboard_Vendedor DEBERÁ mostrar los pedidos pendientes ordenados por fecha de creación ascendente
4. CUANDO un vendedor filtra pedidos por rango de fechas, EL Dashboard_Vendedor DEBERÁ mostrar únicamente los pedidos dentro del rango especificado

### Requisito 6: Dashboard Administrativo Mejorado

**Historia de Usuario:** Como administrador, quiero monitorear las ventas por vendedor y las entregas por repartidor, para que pueda evaluar el rendimiento del equipo y tomar decisiones informadas.

#### Criterios de Aceptación

1. CUANDO un administrador accede al Panel_Admin, EL Panel_Admin DEBERÁ mostrar un resumen de ventas totales desglosado por vendedor con nombre, número de ventas y monto total
2. CUANDO un administrador accede al Panel_Admin, EL Panel_Admin DEBERÁ mostrar un resumen de entregas por repartidor con nombre, número de entregas completadas y calificación promedio
3. CUANDO un administrador filtra por rango de fechas, EL Panel_Admin DEBERÁ actualizar todas las métricas de vendedores y repartidores para reflejar únicamente el período seleccionado
4. CUANDO un administrador selecciona un vendedor específico, EL Panel_Admin DEBERÁ mostrar el detalle de todas las ventas realizadas por ese vendedor
5. EL Panel_Admin DEBERÁ mostrar un gráfico comparativo de ventas por vendedor en el período seleccionado
6. EL Panel_Admin DEBERÁ mostrar métricas de ventas en tienda versus ventas online

### Requisito 7: Gestión de Inventario en Ventas Presenciales

**Historia de Usuario:** Como vendedor, quiero que el inventario se actualice automáticamente al realizar ventas, para que el stock refleje siempre la disponibilidad real.

#### Criterios de Aceptación

1. CUANDO un vendedor completa una venta en el Sistema_POS, EL Sistema_POS DEBERÁ crear un movimiento de inventario de tipo "out" por cada producto vendido
2. CUANDO un vendedor completa una venta, EL Sistema_POS DEBERÁ actualizar el stock del producto restando la cantidad vendida
3. SI el stock de un producto llega a cero después de una venta, ENTONCES EL Sistema_POS DEBERÁ marcar el producto como sin stock en el catálogo
