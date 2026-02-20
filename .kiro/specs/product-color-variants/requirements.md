# Documento de Requisitos

## Introducción

La tienda de skating actualmente soporta variantes de producto basadas en tallas y medidas (`variant_type: 'size' | 'measurement'`), con precios diferenciados por variante almacenados en `variant_prices` (JSONB). Se requiere extender este sistema para incluir variantes de color. Los clientes podrán seleccionar un color mediante un color picker visual en la página de producto, y los administradores podrán asignar colores con sus respectivos códigos hexadecimales y precios diferenciados al crear o editar un producto.

## Glosario

- **Sistema_Productos**: El módulo completo de gestión de productos que incluye backend (API, base de datos) y frontend (panel admin, tienda).
- **Panel_Admin**: La interfaz de administración ubicada en `/admin/products` donde los administradores gestionan los productos, incluyendo el formulario `ProductForm`.
- **Página_Producto**: La página de detalle de producto en la tienda (`/skating-store/producto/[id]`) donde el cliente visualiza y selecciona opciones del producto.
- **Color_Picker**: El componente visual que muestra círculos de color seleccionables para que el cliente elija el color deseado del producto.
- **Producto**: Registro en la tabla `skating_products` que contiene nombre, descripción, precio, categoría, imágenes, stock, variantes y demás atributos.
- **Variante_Color**: Una opción de color asociada a un producto, definida por un nombre legible y un código hexadecimal (ej: "Rojo" → "#FF0000").
- **Administrador**: Usuario con rol `ADMIN` que tiene permisos para crear, editar y eliminar productos.
- **Cliente**: Usuario que navega la tienda y puede agregar productos al carrito.
- **Carrito**: El sistema de carrito de compras (`SkatingCartContext`) que almacena productos seleccionados con sus variantes.

## Requisitos

### Requisito 1: Extensión del tipo de variante para soportar colores

**Historia de Usuario:** Como administrador, quiero poder seleccionar "Color" como tipo de variante al crear o editar un producto, para ofrecer opciones de color a los clientes.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL incluir la opción "Color" en el selector de tipo de variante (`variant_type`), además de las opciones existentes "Ninguno", "Tallas" y "Medidas".
2. WHEN un administrador selecciona "Color" como tipo de variante, THE Panel_Admin SHALL mostrar una sección de configuración de colores con campos para nombre del color y código hexadecimal.
3. THE Sistema_Productos SHALL almacenar el valor `color` en el campo `variant_type` de la tabla `skating_products`.

### Requisito 2: Gestión de colores en el formulario de administración

**Historia de Usuario:** Como administrador, quiero agregar colores con su nombre y código hexadecimal a un producto, para definir las opciones de color disponibles.

#### Criterios de Aceptación

1. WHEN un administrador agrega un color, THE Panel_Admin SHALL solicitar un nombre legible (ej: "Rojo", "Azul Marino") y un código hexadecimal válido (ej: "#FF0000").
2. WHEN un administrador agrega un color, THE Panel_Admin SHALL mostrar una vista previa visual del color seleccionado junto al nombre.
3. WHEN un administrador agrega un color, THE Panel_Admin SHALL inicializar el precio de esa variante de color con el precio base del producto.
4. THE Panel_Admin SHALL permitir al administrador modificar el precio individual de cada variante de color.
5. THE Panel_Admin SHALL permitir al administrador eliminar un color previamente agregado de la lista de opciones.
6. IF un administrador ingresa un código hexadecimal con formato inválido, THEN THE Panel_Admin SHALL mostrar un mensaje de error indicando el formato esperado (ej: "#RRGGBB").

### Requisito 3: Almacenamiento de datos de color

**Historia de Usuario:** Como administrador, quiero que los colores y sus precios se persistan correctamente, para que estén disponibles en la tienda.

#### Criterios de Aceptación

1. THE Sistema_Productos SHALL almacenar las opciones de color en el campo `variant_options` como un arreglo de cadenas con formato "NombreColor:#HexCode" (ej: ["Rojo:#FF0000", "Azul:#0000FF"]).
2. THE Sistema_Productos SHALL almacenar los precios por color en el campo `variant_prices` usando el nombre del color como clave (ej: {"Rojo": 59.99, "Azul": 64.99}).
3. WHEN se guarda un producto con variantes de color, THE Sistema_Productos SHALL validar que cada opción de color tenga un nombre no vacío y un código hexadecimal válido de 7 caracteres (incluyendo el "#").
4. WHEN se carga un producto existente con `variant_type` igual a "color", THE Panel_Admin SHALL parsear las opciones de `variant_options` y mostrar los colores con sus nombres, códigos hexadecimales y precios correspondientes.

### Requisito 4: Color picker en la página de producto (tienda)

**Historia de Usuario:** Como cliente, quiero ver y seleccionar colores disponibles de un producto mediante un selector visual, para elegir el color que prefiero antes de agregar al carrito.

#### Criterios de Aceptación

1. WHEN un producto tiene `variant_type` igual a "color" y `variant_options` con al menos un color, THE Página_Producto SHALL mostrar el Color_Picker con círculos de color representando cada opción disponible.
2. WHEN el cliente selecciona un color en el Color_Picker, THE Página_Producto SHALL resaltar visualmente el color seleccionado con un borde o indicador de selección.
3. WHEN el cliente selecciona un color en el Color_Picker, THE Página_Producto SHALL mostrar el nombre del color seleccionado debajo del selector.
4. WHEN el cliente selecciona un color que tiene un precio diferente al precio base, THE Página_Producto SHALL actualizar el precio mostrado al precio correspondiente a ese color.
5. WHEN un producto tiene variantes de color y el cliente no selecciona un color, THE Página_Producto SHALL mostrar un rango de precios (mínimo - máximo) si los precios varían entre colores.

### Requisito 5: Integración del color seleccionado con el carrito

**Historia de Usuario:** Como cliente, quiero que el color que seleccioné se registre al agregar el producto al carrito, para que mi pedido refleje la opción correcta.

#### Criterios de Aceptación

1. WHEN un producto tiene variantes de color y el cliente intenta agregar al carrito sin seleccionar un color, THE Sistema_Productos SHALL mostrar un mensaje solicitando la selección de un color.
2. WHEN el cliente agrega un producto con un color seleccionado al carrito, THE Carrito SHALL almacenar el nombre del color en el campo `selectedVariant` del ítem del carrito.
3. WHEN se muestra un ítem del carrito que tiene un color seleccionado, THE Carrito SHALL mostrar el nombre del color junto al nombre del producto.
4. WHEN se muestra un ítem del carrito que tiene un color seleccionado, THE Carrito SHALL mostrar un indicador visual (círculo pequeño) con el color hexadecimal correspondiente junto al nombre del color.
5. WHEN se calcula el precio de un ítem del carrito con variante de color, THE Carrito SHALL usar el precio específico del color desde `variant_prices`, o el precio base si no existe un precio específico.

### Requisito 6: Visualización de colores en tarjetas de producto

**Historia de Usuario:** Como cliente, quiero ver los colores disponibles de un producto directamente en la tarjeta del catálogo, para identificar rápidamente los productos con opciones de color.

#### Criterios de Aceptación

1. WHEN un producto tiene `variant_type` igual a "color" y `variant_options` con al menos un color, THE Sistema_Productos SHALL mostrar pequeños círculos de color en la tarjeta del producto (`ProductCard`).
2. WHEN un producto tiene más de 5 colores disponibles, THE Sistema_Productos SHALL mostrar los primeros 5 círculos de color y un indicador "+N" con la cantidad de colores adicionales.
3. WHEN un producto con variantes de color tiene precios diferentes entre colores, THE Sistema_Productos SHALL mostrar el rango de precios (mínimo - máximo) en la tarjeta del producto.

### Requisito 7: Compatibilidad con el sistema de pedidos y facturación

**Historia de Usuario:** Como administrador, quiero que los pedidos con variantes de color se procesen correctamente en todo el flujo, para mantener la integridad de la información.

#### Criterios de Aceptación

1. WHEN se crea un pedido con productos que tienen variante de color, THE Sistema_Productos SHALL incluir el nombre del color en el campo `selectedVariant` de cada ítem del pedido.
2. WHEN se muestra el detalle de un pedido con variantes de color, THE Sistema_Productos SHALL mostrar el nombre del color junto al nombre del producto.
3. WHEN se calcula el total de un pedido con variantes de color, THE Sistema_Productos SHALL usar el precio específico del color desde `variant_prices` para cada ítem.
4. WHEN se genera una factura para un pedido con variantes de color, THE Sistema_Productos SHALL incluir el nombre del color en la descripción del ítem facturado.
