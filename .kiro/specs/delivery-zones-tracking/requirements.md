# Documento de Requisitos

## Introducción

Este documento define los requisitos para implementar un sistema de zonas de entrega configurables, rastreo en tiempo real de repartidores y estimación de tiempo de entrega para la tienda de patinaje. El sistema permitirá a los administradores definir la ubicación de la tienda y las zonas donde se realizan envíos, rastrear la posición de los repartidores en tiempo real para asignar pedidos al más cercano, y mostrar a los clientes un tiempo estimado de entrega.

## Glosario

- **Sistema_Admin**: Panel de administración de la tienda de patinaje (`/admin`)
- **Sistema_Tienda**: Interfaz de la tienda para clientes (`/skating-store`)
- **Sistema_Repartidor**: Interfaz del repartidor (`/delivery`)
- **Zona_Entrega**: Área geográfica definida por un polígono donde la tienda realiza envíos
- **Ubicación_Tienda**: Coordenadas geográficas (latitud, longitud) del local físico de la tienda
- **Repartidor**: Usuario con rol DELIVERY que realiza entregas de pedidos
- **Haversine**: Fórmula matemática para calcular la distancia entre dos puntos geográficos sobre la superficie terrestre
- **Supabase_Realtime**: Sistema de suscripción en tiempo real de Supabase basado en canales PostgreSQL

## Requisitos

### Requisito 1: Configuración de la ubicación de la tienda

**Historia de Usuario:** Como administrador, quiero definir la ubicación geográfica de la tienda, para que el sistema pueda calcular distancias y zonas de entrega a partir de un punto de referencia.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL proporcionar un formulario para configurar la latitud y longitud de la tienda
2. WHEN un administrador guarda la ubicación de la tienda, THE Sistema_Admin SHALL persistir las coordenadas en la base de datos
3. WHEN la ubicación de la tienda se muestra en el mapa, THE Sistema_Admin SHALL renderizar un marcador en las coordenadas configuradas
4. IF un administrador intenta guardar coordenadas fuera del rango válido (latitud: -90 a 90, longitud: -180 a 180), THEN THE Sistema_Admin SHALL rechazar la entrada y mostrar un mensaje de error descriptivo

### Requisito 2: Definición y gestión de zonas de entrega

**Historia de Usuario:** Como administrador, quiero definir zonas de entrega como áreas geográficas en un mapa, para que el sistema solo permita envíos dentro de esas zonas.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL permitir crear zonas de entrega dibujando polígonos sobre un mapa interactivo
2. WHEN un administrador crea una zona de entrega, THE Sistema_Admin SHALL almacenar el nombre, los vértices del polígono y el estado activo/inactivo de la zona
3. WHEN un administrador edita una zona de entrega existente, THE Sistema_Admin SHALL actualizar los vértices del polígono y el nombre en la base de datos
4. WHEN un administrador elimina una zona de entrega, THE Sistema_Admin SHALL remover la zona de la base de datos
5. THE Sistema_Admin SHALL mostrar todas las zonas de entrega configuradas como polígonos coloreados sobre el mapa
6. WHEN un administrador activa o desactiva una zona, THE Sistema_Admin SHALL actualizar el estado de la zona sin eliminarla

### Requisito 3: Validación de dirección de entrega contra zonas

**Historia de Usuario:** Como cliente, quiero saber si mi dirección está dentro de la zona de entrega antes de completar mi compra, para no realizar un pedido que no pueda ser entregado.

#### Criterios de Aceptación

1. WHEN un cliente ingresa su dirección de envío durante el checkout, THE Sistema_Tienda SHALL verificar si las coordenadas de la dirección están dentro de alguna zona de entrega activa
2. IF la dirección del cliente está fuera de todas las zonas de entrega activas, THEN THE Sistema_Tienda SHALL bloquear el envío y mostrar un mensaje indicando que la dirección no está dentro del área de cobertura
3. WHEN la dirección del cliente está dentro de una zona de entrega activa, THE Sistema_Tienda SHALL permitir continuar con el proceso de checkout

### Requisito 4: Rastreo en tiempo real de la ubicación de repartidores

**Historia de Usuario:** Como administrador, quiero ver la ubicación en tiempo real de todos los repartidores, para poder monitorear las entregas y asignar pedidos de forma eficiente.

#### Criterios de Aceptación

1. WHILE un repartidor tiene la aplicación activa, THE Sistema_Repartidor SHALL enviar su ubicación GPS al servidor cada 15 segundos
2. THE Sistema_Admin SHALL mostrar la posición de todos los repartidores activos en el mapa en tiempo real
3. WHEN la ubicación de un repartidor se actualiza, THE Sistema_Admin SHALL reflejar el cambio en el mapa sin necesidad de recargar la página
4. IF el repartidor deniega el permiso de geolocalización, THEN THE Sistema_Repartidor SHALL mostrar un aviso indicando que el rastreo no está disponible y que debe habilitar los permisos de ubicación

### Requisito 5: Asignación automática del repartidor más cercano

**Historia de Usuario:** Como administrador, quiero que el sistema sugiera al repartidor más cercano a la tienda cuando se realiza una venta, para optimizar los tiempos de entrega.

#### Criterios de Aceptación

1. WHEN se crea un nuevo pedido, THE Sistema_Admin SHALL calcular la distancia entre la ubicación de la tienda y cada repartidor activo usando la fórmula Haversine
2. WHEN se muestra la lista de repartidores disponibles para asignar, THE Sistema_Admin SHALL ordenarlos por distancia ascendente respecto a la ubicación de la tienda
3. THE Sistema_Admin SHALL mostrar la distancia en kilómetros de cada repartidor respecto a la tienda junto a su nombre
4. IF no hay repartidores con ubicación conocida, THEN THE Sistema_Admin SHALL mostrar un aviso indicando que no se puede determinar la cercanía de los repartidores

### Requisito 6: Almacenamiento de ubicación de repartidores

**Historia de Usuario:** Como sistema, quiero almacenar la última ubicación conocida de cada repartidor, para poder calcular distancias incluso cuando el repartidor no tiene un envío activo.

#### Criterios de Aceptación

1. WHEN un repartidor envía su ubicación, THE Sistema_Repartidor SHALL almacenar las coordenadas y la marca de tiempo en una tabla dedicada de ubicaciones de repartidores
2. THE Sistema_Admin SHALL poder consultar la última ubicación conocida de cualquier repartidor independientemente de si tiene envíos activos
3. WHEN se consulta la ubicación de un repartidor, THE Sistema_Admin SHALL incluir la marca de tiempo de la última actualización para evaluar la frescura del dato

### Requisito 7: Estimación de tiempo de entrega para el cliente

**Historia de Usuario:** Como cliente, quiero ver un tiempo estimado de entrega de mi pedido, para saber cuándo esperar mi paquete.

#### Criterios de Aceptación

1. WHEN un pedido es asignado a un repartidor, THE Sistema_Tienda SHALL calcular un tiempo estimado de entrega basado en la distancia entre la tienda y la dirección del cliente
2. WHEN el repartidor cambia su estado a EN_RUTA, THE Sistema_Tienda SHALL recalcular el tiempo estimado usando la posición actual del repartidor y la dirección del cliente
3. THE Sistema_Tienda SHALL mostrar el tiempo estimado de entrega en la página de seguimiento del pedido en formato legible (por ejemplo: "Llegada estimada: 25-35 minutos")
4. WHEN la ubicación del repartidor se actualiza durante el trayecto, THE Sistema_Tienda SHALL actualizar el tiempo estimado en tiempo real
5. IF el pedido aún no tiene repartidor asignado, THEN THE Sistema_Tienda SHALL mostrar un mensaje indicando que el tiempo estimado estará disponible una vez se asigne un repartidor

### Requisito 8: Visualización de zonas de entrega en el mapa del admin

**Historia de Usuario:** Como administrador, quiero ver las zonas de entrega junto con la ubicación de los repartidores en el mapa, para tener una vista completa de la operación de entregas.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL renderizar las zonas de entrega activas como polígonos semitransparentes sobre el mapa de envíos existente
2. THE Sistema_Admin SHALL renderizar la ubicación de la tienda como un marcador diferenciado en el mapa
3. WHEN un administrador pasa el cursor sobre una zona de entrega, THE Sistema_Admin SHALL mostrar el nombre de la zona
