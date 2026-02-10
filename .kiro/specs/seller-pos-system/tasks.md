# Plan de Implementación: Sistema de Vendedor y Punto de Venta

## Visión General

Implementación incremental del sistema de vendedores y POS para la tienda de skating. Se comienza con la base de datos y tipos, luego el módulo de vendedor con POS, y finalmente las mejoras al dashboard admin.

## Tareas

- [x] 1. Configurar base de datos y tipos para el sistema de vendedor
  - [x] 1.1 Crear migración SQL para extender el sistema
    - Actualizar constraint de `profiles.role` para incluir `'SELLER'`
    - Agregar columnas `seller_id`, `order_type` y `dispatched_at` a `skating_orders`
    - Crear tabla `pos_sessions` con todas las columnas y constraints
    - Crear políticas RLS para `pos_sessions` y las nuevas políticas de `skating_orders` para vendedores
    - _Requisitos: 1.1, 2.1, 3.1_
  - [x] 1.2 Actualizar tipos TypeScript
    - Agregar `'SELLER'` al tipo `UserRole`
    - Crear interfaces `PosSession`, `CashSessionSummary`, `POSCartItem`, `PaymentInfo`, `SellerDashboardStats`, `OrderFilters`
    - Agregar campos `seller_id`, `order_type`, `dispatched_at` a la interfaz `Order`
    - _Requisitos: 2.1, 3.1, 5.1_
  - [x] 1.3 Extender AuthContext para soportar rol SELLER
    - Agregar `isSeller: boolean` al `AuthContextType`
    - Actualizar `checkRole` para setear `isSeller` cuando `role === 'SELLER'`
    - _Requisitos: 1.1, 1.2, 1.3_

- [x] 2. Implementar server actions del vendedor y POS
  - [x] 2.1 Crear `src/lib/skating-store/seller-actions.ts`
    - Implementar `getSellerDashboardStats()` — estadísticas del día del vendedor
    - Implementar `getSellerOrders(filters?)` — historial de pedidos con filtros de fecha
    - Implementar `markOrderAsDispatched(orderId)` — marcar pedido como despachado
    - _Requisitos: 4.3, 5.1, 5.2, 5.3, 5.4_
  - [ ]* 2.2 Escribir test de propiedad para estadísticas del vendedor
    - **Propiedad 15: Precisión de estadísticas del vendedor**
    - **Valida: Requisito 5.1**
  - [ ]* 2.3 Escribir test de propiedad para filtro de fechas del vendedor
    - **Propiedad 17: Filtro por rango de fechas del vendedor**
    - **Valida: Requisito 5.4**
  - [x] 2.4 Crear `src/lib/skating-store/pos-actions.ts`
    - Implementar `openCashSession(initialAmount)` — abrir sesión de caja
    - Implementar `closeCashSession(sessionId, reportedAmount)` — cerrar sesión con resumen
    - Implementar `createPOSOrder(items, payment, customerName, customerPhone?)` — crear pedido POS con descuento de stock y movimiento de inventario
    - Implementar `searchProductsForPOS(query)` — buscar productos activos con stock
    - _Requisitos: 2.1, 2.2, 2.3, 2.5, 2.6, 3.1, 3.6, 3.7, 7.1, 7.2_
  - [ ]* 2.5 Escribir test de propiedad para cálculo de total del carrito
    - **Propiedad 8: Cálculo de total del carrito POS**
    - **Valida: Requisito 3.2**
  - [ ]* 2.6 Escribir test de propiedad para cálculo de cambio
    - **Propiedad 9: Cálculo de cambio en pago efectivo**
    - **Valida: Requisito 3.3**
  - [ ]* 2.7 Escribir test de propiedad para invariantes de cierre de caja
    - **Propiedad 11: Invariantes de cierre de sesión de caja**
    - **Valida: Requisitos 3.6, 3.7**
  - [ ]* 2.8 Escribir test de propiedad para validación de stock
    - **Propiedad 5: Validación de stock en carrito**
    - **Valida: Requisitos 2.3, 2.4**
  - [ ]* 2.9 Escribir test de propiedad para decremento de stock
    - **Propiedad 6: Decremento de stock tras confirmación**
    - **Valida: Requisitos 2.5, 7.2**
  - [ ]* 2.10 Escribir test de propiedad para movimiento de inventario
    - **Propiedad 22: Movimiento de inventario por producto vendido**
    - **Valida: Requisito 7.1**

- [x] 3. Checkpoint - Verificar que todos los tests pasan
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 4. Implementar módulo de vendedor (frontend)
  - [x] 4.1 Crear layout y sidebar del vendedor
    - Crear `src/app/seller/layout.tsx` con verificación de rol SELLER y AuthProvider
    - Crear `src/components/seller/SellerSidebar.tsx` con navegación: Dashboard, Punto de Venta, Pedidos
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 4.2 Crear dashboard del vendedor
    - Crear `src/app/seller/page.tsx` con tarjetas de estadísticas del día (ventas, pedidos completados, pendientes)
    - Mostrar lista de pedidos pendientes ordenados por fecha ascendente
    - _Requisitos: 5.1, 5.3_
  - [x] 4.3 Crear página de historial de pedidos del vendedor
    - Crear `src/app/seller/orders/page.tsx` con tabla de pedidos y filtros de fecha
    - Incluir botón para marcar pedidos como despachados
    - _Requisitos: 4.3, 5.2, 5.4_
  - [x] 4.4 Crear interfaz del Punto de Venta (POS)
    - Crear `src/app/seller/pos/page.tsx` como página principal del POS
    - Crear `src/components/seller/POSProductSearch.tsx` — búsqueda de productos con autocompletado
    - Crear `src/components/seller/POSCart.tsx` — carrito con cálculo de subtotal y total en tiempo real
    - Crear `src/components/seller/POSPayment.tsx` — selección de método de pago, cálculo de cambio para efectivo
    - Crear `src/components/seller/POSReceipt.tsx` — recibo imprimible con detalles de la venta
    - _Requisitos: 2.2, 2.3, 2.6, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.5 Crear gestión de sesión de caja
    - Crear `src/components/seller/CashSessionManager.tsx` — apertura con monto inicial, cierre con resumen y comparación de montos
    - Integrar con la página POS: requerir sesión abierta para vender
    - _Requisitos: 3.1, 3.6, 3.7_
  - [ ]* 4.6 Escribir tests unitarios para componentes del POS
    - Test de rechazo de stock insuficiente (caso borde)
    - Test de generación de recibo con todos los campos
    - Test de acceso denegado para usuario no-SELLER
    - _Requisitos: 1.3, 2.4, 3.5_

- [x] 5. Checkpoint - Verificar módulo de vendedor funcional
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 6. Mejorar dashboard administrativo
  - [x] 6.1 Crear página de gestión de vendedores en admin
    - Crear `src/app/admin/sellers/page.tsx` con lista de vendedores, opción de asignar/desactivar rol SELLER
    - Agregar enlace "Vendedores" al Sidebar del admin
    - _Requisitos: 1.4, 1.5_
  - [x] 6.2 Extender `admin-actions.ts` con funciones de estadísticas
    - Implementar `getSellerStats(dateRange?)` — ventas por vendedor con filtro de fechas
    - Implementar `getDeliveryStats(dateRange?)` — entregas por repartidor con filtro de fechas
    - Implementar `getSalesComparison(dateRange?)` — comparación tienda vs online
    - Implementar `assignOrderToSeller(orderId, sellerId)` — asignar pedido a vendedor
    - _Requisitos: 4.1, 6.1, 6.2, 6.3, 6.6_
  - [ ]* 6.3 Escribir test de propiedad para desglose de ventas por vendedor
    - **Propiedad 18: Desglose de ventas por vendedor suma al total**
    - **Valida: Requisito 6.1**
  - [ ]* 6.4 Escribir test de propiedad para desglose tienda vs online
    - **Propiedad 21: Desglose tienda vs online suma al total**
    - **Valida: Requisito 6.6**
  - [x] 6.5 Actualizar dashboard admin con métricas de vendedores y repartidores
    - Extender `src/app/admin/page.tsx` con sección de ventas por vendedor
    - Agregar sección de entregas por repartidor con calificación promedio
    - Agregar filtro de rango de fechas global
    - Agregar gráfico comparativo de ventas por vendedor (usando Recharts)
    - Agregar métricas de ventas en tienda vs online
    - _Requisitos: 6.1, 6.2, 6.3, 6.5, 6.6_
  - [x] 6.6 Agregar funcionalidad de detalle de vendedor en admin
    - CUANDO un administrador selecciona un vendedor específico, mostrar el detalle de todas las ventas realizadas por ese vendedor
    - Puede ser un modal o una vista expandida en la página de vendedores
    - _Requisitos: 6.4_
  - [x] 6.7 Agregar asignación de pedidos a vendedores en la página de pedidos admin
    - Extender `src/app/admin/orders/page.tsx` con opción de asignar pedido a vendedor
    - Incluir confirmación al reasignar pedido ya asignado
    - _Requisitos: 4.1, 4.4_

- [x] 7. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan propiedades universales de correctitud
- Los tests unitarios validan ejemplos específicos y casos borde
- Se usa `fast-check` como librería de property-based testing
