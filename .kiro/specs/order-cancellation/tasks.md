# Plan de Implementación: Cancelación de Pedidos

## Resumen

Implementar el sistema completo de cancelación de pedidos que permite a usuarios, repartidores, vendedores y administradores cancelar pedidos bajo condiciones específicas. Incluye migración de base de datos, servicio de cancelación con transacciones atómicas, restauración de inventario, notificaciones, panel administrativo de cancelaciones y configuración de ventana de cancelación.

## Tareas

- [x] 1. Crear migración de base de datos y tabla `order_cancellations`
  - Crear archivo `backend/src/db/migrations/007_order_cancellations.sql`
  - Crear tabla `order_cancellations` con campos: `id`, `order_id`, `cancelled_by`, `cancelled_by_role`, `reason_code`, `reason_description`, `created_at`
  - Crear índices en `order_id`, `cancelled_by_role`, `created_at` y un índice único en `order_id`
  - Modificar el check constraint de `shipments.status` para incluir `'CANCELADO'`
  - _Requisitos: 8.1, 2.4_

- [ ] 2. Implementar el servicio de cancelación (`backend/src/lib/cancellation-service.ts`)
  - [x] 2.1 Crear el módulo `cancellation-service.ts` con las funciones principales
    - Implementar `cancelOrder(params)` que ejecuta toda la cancelación dentro de `withTransaction`
    - Implementar `validateCancellation(orderId, userId, role)` con validaciones por rol: USER (pedido propio + pending + ventana), DELIVERY (envío asignado + estado ASIGNADO/EN_RUTA), SELLER (pedido asociado + estado != delivered/cancelled), ADMIN (estado != delivered/cancelled)
    - Implementar `getCancellationWindow()` que lee `static_content` con slug `site-settings` y retorna el valor de `cancellation_window_minutes` (default 30)
    - Implementar `restoreInventory(client, order)` que restaura stock y crea `inventory_movements` con tipo `'in'` y razón `"Cancelación - Pedido #XXXX"`
    - Implementar `sendCancellationNotifications(order, cancellation)` que envía notificaciones al usuario propietario, al repartidor (si tiene envío asignado y no fue él quien canceló) y al vendedor (si tiene vendedor asociado y no fue él quien canceló)
    - Usar `SELECT ... FOR UPDATE` para evitar race conditions
    - _Requisitos: 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Escribir test de propiedad: cancelación válida transiciona a "cancelled"
    - **Propiedad 1: Cancelación válida transiciona el pedido a "cancelled"**
    - **Valida: Requisitos 1.2, 3.4, 5.4**

  - [ ]* 2.3 Escribir test de propiedad: código de motivo requerido
    - **Propiedad 2: Código de motivo requerido para toda cancelación**
    - **Valida: Requisitos 1.3, 2.2, 3.2, 5.5**

  - [ ]* 2.4 Escribir test de propiedad: motivo "Otro" requiere descripción >= 10 caracteres
    - **Propiedad 3: Motivo "Otro" requiere descripción de al menos 10 caracteres**
    - **Valida: Requisitos 2.3, 3.3**

  - [ ]* 2.5 Escribir test de propiedad: ventana expirada rechaza cancelación de usuario
    - **Propiedad 4: Ventana de cancelación expirada rechaza cancelación de usuario**
    - **Valida: Requisitos 1.4**

  - [ ]* 2.6 Escribir test de propiedad: estados inválidos rechazan cancelación
    - **Propiedad 5: Estados inválidos rechazan cancelación**
    - **Valida: Requisitos 1.5, 2.6**

  - [ ]* 2.7 Escribir test de propiedad: vendedor solo cancela pedidos propios
    - **Propiedad 6: Vendedor solo puede cancelar pedidos propios**
    - **Valida: Requisitos 3.6**

  - [ ]* 2.8 Escribir test de propiedad: cancelación por repartidor cancela envío
    - **Propiedad 7: Cancelación por repartidor también cancela el envío**
    - **Valida: Requisitos 2.4**

  - [ ]* 2.9 Escribir test de propiedad: conservación de inventario
    - **Propiedad 8: Conservación de inventario en cancelación**
    - **Valida: Requisitos 4.1, 4.4**

  - [ ]* 2.10 Escribir test de propiedad: movimientos de inventario creados
    - **Propiedad 9: Movimientos de inventario creados por restauración**
    - **Valida: Requisitos 4.2**

- [x] 3. Checkpoint - Verificar servicio de cancelación
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 4. Crear rutas de cancelación en el backend
  - [x] 4.1 Crear `backend/src/routes/cancellations.ts` con endpoints de repartidor, vendedor y admin
    - `POST /api/cancellations/delivery/:orderId` — cancelación por repartidor (rol DELIVERY)
    - `POST /api/cancellations/seller/:orderId` — cancelación por vendedor (rol SELLER)
    - `POST /api/cancellations/admin/:orderId` — cancelación por administrador (rol ADMIN)
    - `GET /api/cancellations` — listar cancelaciones con filtros por rol y rango de fechas (rol ADMIN)
    - `GET /api/cancellations/config` — obtener configuración de ventana (rol ADMIN)
    - `PUT /api/cancellations/config` — actualizar ventana de cancelación con validación de rango [5, 1440] (rol ADMIN)
    - Registrar la nueva ruta en `backend/src/index.ts`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 4.2 Reemplazar el endpoint existente `POST /api/orders/:id/cancel` en `backend/src/routes/orders.ts`
    - Reemplazar la lógica actual (que requiere 24h) con la nueva lógica que usa `cancellation-service.ts`
    - Validar ventana de cancelación configurable, estado "pending", motivo de cancelación requerido
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 4.3 Escribir test de propiedad: validación de rango de ventana de cancelación
    - **Propiedad 10: Validación de rango de ventana de cancelación**
    - **Valida: Requisitos 7.4**

  - [ ]* 4.4 Escribir test de propiedad: notificaciones enviadas a destinatarios correctos
    - **Propiedad 11: Notificaciones enviadas a destinatarios correctos con contenido completo**
    - **Valida: Requisitos 6.1, 6.2, 6.3, 6.4**

  - [ ]* 4.5 Escribir test de propiedad: filtros de cancelaciones retornan registros coincidentes
    - **Propiedad 12: Filtros de cancelaciones retornan solo registros coincidentes**
    - **Valida: Requisitos 5.2, 5.3**

  - [ ]* 4.6 Escribir test de propiedad: integridad referencial de registros de cancelación
    - **Propiedad 13: Integridad referencial y completitud de registros de cancelación**
    - **Valida: Requisitos 8.1, 8.2, 8.3**

- [x] 5. Checkpoint - Verificar rutas backend
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 6. Implementar componente modal de cancelación compartido
  - [x] 6.1 Crear `src/components/shared/CancelOrderModal.tsx`
    - Componente reutilizable con diálogo de confirmación y selector de motivo
    - Adaptar motivos según el rol: USER (genéricos), DELIVERY (específicos de entrega), SELLER (específicos de venta), ADMIN (texto libre)
    - Mostrar textarea con mínimo 10 caracteres cuando se selecciona "Otro" o para ADMIN
    - Incluir botones de confirmar y cancelar con estados de carga
    - _Requisitos: 1.3, 2.2, 2.3, 3.2, 3.3, 5.5_

- [ ] 7. Integrar cancelación en la interfaz de la tienda (usuario)
  - [x] 7.1 Agregar botón de cancelación en el detalle del pedido del usuario
    - Modificar el componente de detalle de pedido en la sección `/skating-store/perfil` para mostrar el botón de cancelación cuando el pedido está en estado "pending" y dentro de la ventana de cancelación
    - Integrar `CancelOrderModal` con los motivos de usuario
    - Mostrar mensaje de error cuando la ventana ha expirado o el estado no permite cancelación
    - Crear función en `src/lib/skating-store/` para llamar al endpoint `POST /api/orders/:id/cancel`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 8. Integrar cancelación en la interfaz del repartidor
  - [x] 8.1 Agregar opción de cancelación en el detalle del envío del repartidor
    - Modificar la interfaz del repartidor en `/delivery` para mostrar botón de cancelación cuando el envío está en estado "ASIGNADO" o "EN_RUTA"
    - Integrar `CancelOrderModal` con los motivos de repartidor
    - Crear función para llamar al endpoint `POST /api/cancellations/delivery/:orderId`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

- [ ] 9. Integrar cancelación en la interfaz del vendedor
  - [x] 9.1 Agregar opción de cancelación en la lista de pedidos del vendedor
    - Modificar la interfaz del vendedor en `/seller/orders` para mostrar botón de cancelación cuando el pedido no está en estado "delivered" o "cancelled"
    - Integrar `CancelOrderModal` con los motivos de vendedor
    - Crear función para llamar al endpoint `POST /api/cancellations/seller/:orderId`
    - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Checkpoint - Verificar interfaces de cancelación por rol
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 11. Implementar panel de cancelaciones en admin
  - [x] 11.1 Crear página `src/app/admin/cancellations/page.tsx`
    - Tabla con todas las cancelaciones: identificador del pedido, fecha, rol del solicitante, nombre del solicitante, motivo
    - Filtros por rol del solicitante (usuario, repartidor, vendedor, administrador)
    - Filtros por rango de fechas
    - Paginación de resultados
    - Botón para cancelar cualquier pedido (integrar `CancelOrderModal` con motivo de admin)
    - Crear funciones en `src/lib/` para llamar a los endpoints `GET /api/cancellations` y `POST /api/cancellations/admin/:orderId`
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 11.2 Agregar enlace al panel de cancelaciones en el layout/navegación de admin
    - Agregar entrada en la navegación lateral del admin para acceder a `/admin/cancellations`
    - _Requisitos: 5.1_

- [ ] 12. Implementar configuración de ventana de cancelación en admin
  - [x] 12.1 Extender `src/app/admin/settings/page.tsx` con campo de ventana de cancelación
    - Agregar una nueva Card con campo numérico para la ventana de cancelación en minutos
    - Validar rango [5, 1440] en el frontend antes de enviar
    - Mostrar valor actual cargado desde `GET /api/cancellations/config`
    - Guardar con `PUT /api/cancellations/config`
    - Mostrar valor por defecto de 30 minutos si no hay configuración
    - _Requisitos: 7.1, 7.2, 7.3, 7.4_

- [x] 13. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedad validan propiedades universales de correctitud usando `fast-check`
- Los tests unitarios validan ejemplos específicos y edge cases
