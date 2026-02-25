# 📡 Referencia de API — Skating Store

Base URL: `https://api.hunykho.com`

Autenticación: Cookie httpOnly `skating_token` (JWT) o header `Authorization: Bearer <token>`.

Todos los endpoints que modifican datos requieren `Content-Type: application/json`.

Rate limits:
- Global: 100 peticiones/minuto por IP
- Auth (`/api/auth/*`): 10 peticiones/15 minutos por IP

---

## Autenticación (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register` | No | Registro con email/password |
| POST | `/login` | No | Login con email/password |
| POST | `/google` | No | Login/registro con Google OAuth |
| POST | `/logout` | No | Cierra sesión (limpia cookie) |
| POST | `/forgot-password` | No | Solicita email de recuperación |
| POST | `/reset-password` | No | Restablece contraseña con token |
| GET | `/me` | ✅ | Obtiene perfil del usuario actual |
| PUT | `/profile` | ✅ | Actualiza perfil (nombre, teléfono, dirección) |
| PUT | `/password` | ✅ | Cambia contraseña (requiere contraseña actual) |
| DELETE | `/account` | ✅ | Elimina cuenta (derecho al olvido) |

### POST `/register`
```json
// Body
{ "email": "user@example.com", "password": "min6chars" }
// Response 201
{ "user": { "id": "uuid", "email": "...", "role": "USER" }, "token": "jwt" }
```

### POST `/login`
```json
// Body
{ "email": "user@example.com", "password": "..." }
// Response 200
{ "user": { "id": "uuid", "email": "...", "role": "USER" }, "token": "jwt" }
```

### DELETE `/account`
```json
// Body (requerido para cuentas email)
{ "password": "current_password" }
// Response 200
{ "success": true, "message": "Cuenta eliminada exitosamente..." }
```

---

## Productos (`/api/products`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/` | No | — | Lista productos (filtros: `category`, `search`, `featured`) |
| GET | `/:id` | No | — | Detalle de producto |
| GET | `/barcode/:barcode` | No | — | Buscar por código de barras |
| GET | `/search-pos` | ✅ | SELLER | Buscar productos para POS (`q`, `store_id`) |
| POST | `/` | ✅ | ADMIN | Crear producto |
| POST | `/bulk` | ✅ | ADMIN | Carga masiva (max 500) |
| PUT | `/:id` | ✅ | ADMIN, SELLER | Actualizar producto |
| DELETE | `/:id` | ✅ | ADMIN | Eliminar producto |

---

## Pedidos (`/api/orders`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/` | ✅ | — | Crear pedido online (idempotente: 30s) |
| POST | `/pos` | ✅ | SELLER | Crear pedido POS (con lock de stock) |
| POST | `/:id/exchange` | ✅ | SELLER | Cambio de producto en pedido |
| POST | `/:id/cancel` | ✅ | — | Cancelar pedido propio |
| GET | `/my` | ✅ | — | Mis pedidos |
| GET | `/seller` | ✅ | SELLER | Pedidos del vendedor |
| GET | `/with-shipments` | ✅ | ADMIN | Todos los pedidos con envíos |
| GET | `/` | ✅ | ADMIN | Todos los pedidos |
| GET | `/:id` | ✅ | — | Detalle de pedido |
| PUT | `/:id` | ✅ | ADMIN, SELLER, DELIVERY | Actualizar pedido |
| DELETE | `/:id` | ✅ | ADMIN | Eliminar pedido |

---

## Carrito (`/api/cart`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ✅ | Obtener carrito con detalles de productos |
| POST | `/` | ✅ | Agregar item (upsert por product_id + variant) |
| PUT | `/:productId` | ✅ | Actualizar cantidad |
| DELETE | `/:productId` | ✅ | Eliminar item |
| DELETE | `/` | ✅ | Vaciar carrito |

---

## Favoritos (`/api/favorites`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ✅ | Listar favoritos |
| POST | `/` | ✅ | Agregar favorito (`product_id`) |
| DELETE | `/:productId` | ✅ | Eliminar favorito |

---

## Reseñas (`/api/reviews`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/:productId` | No | Listar reseñas de un producto |
| POST | `/` | ✅ | Crear reseña (validada + sanitizada) |

---

## Contacto (`/api/contact`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/` | No | — | Enviar mensaje de contacto (validado) |
| GET | `/` | ✅ | ADMIN | Listar mensajes |

---

## Contenido (`/api/content`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/categories` | No | — | Listar categorías |
| POST | `/categories` | ✅ | ADMIN | Crear categoría |
| DELETE | `/categories/:id` | ✅ | ADMIN | Eliminar categoría |
| GET | `/banners` | No | — | Listar banners (`active`, `category`) |
| POST | `/banners` | ✅ | ADMIN | Crear banner (con categorías) |
| PUT | `/banners/:id` | ✅ | ADMIN | Actualizar banner |
| DELETE | `/banners/:id` | ✅ | ADMIN | Eliminar banner |
| GET | `/promo-banners` | No | — | Listar promo text banners |
| PUT | `/promo-banners/:id` | ✅ | ADMIN | Actualizar promo banner |
| GET | `/static/:slug` | No | — | Obtener contenido estático |
| PUT | `/static/:slug` | ✅ | ADMIN | Actualizar contenido estático |

---

## Usuarios (`/api/users`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/` | ✅ | ADMIN | Listar todos los usuarios |
| GET | `/sellers` | ✅ | ADMIN | Listar vendedores |
| GET | `/non-sellers` | ✅ | ADMIN | Listar usuarios no vendedores |
| PUT | `/:id/role` | ✅ | ADMIN | Cambiar rol de usuario |
| GET | `/admin/dashboard` | ✅ | ADMIN | Estadísticas del dashboard |
| GET | `/admin/seller-stats` | ✅ | ADMIN | Estadísticas por vendedor |
| GET | `/admin/delivery-stats` | ✅ | ADMIN | Estadísticas por repartidor |
| GET | `/admin/sales-comparison` | ✅ | ADMIN | Comparación ventas online vs tienda |
| GET | `/admin/store-stats` | ✅ | ADMIN | Estadísticas por tienda |
| GET | `/seller/dashboard` | ✅ | SELLER | Dashboard del vendedor |

---

## POS (`/api/pos`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/sessions/active` | ✅ | SELLER | Sesión activa del vendedor |
| POST | `/sessions` | ✅ | SELLER | Abrir sesión de caja |
| PUT | `/sessions/:id/close` | ✅ | SELLER | Cerrar sesión |
| PUT | `/sessions/:id/sale` | ✅ | SELLER | Registrar venta en sesión |
| GET | `/sessions` | ✅ | ADMIN | Todas las sesiones |

---

## Inventario (`/api/inventory`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/` | ✅ | ADMIN | Movimientos de inventario (`store_id`) |
| GET | `/store/:storeId` | ✅ | ADMIN, SELLER | Inventario de una tienda |
| POST | `/` | ✅ | ADMIN, SELLER | Registrar movimiento |
| POST | `/transfer` | ✅ | ADMIN | Transferir stock entre tiendas |

---

## Entregas (`/api/delivery`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/shipments` | ✅ | * | Envíos (filtrado por rol) |
| GET | `/shipments/active` | ✅ | DELIVERY | Envíos activos |
| GET | `/shipments/history` | ✅ | DELIVERY | Historial de envíos |
| GET | `/shipments/by-order/:orderId` | ✅ | — | Envío de un pedido |
| POST | `/shipments` | ✅ | ADMIN, SELLER | Crear/asignar envío |
| PUT | `/shipments/:id` | ✅ | ADMIN, DELIVERY | Actualizar estado de envío |
| GET | `/men` | ✅ | ADMIN, SELLER | Listar repartidores |
| GET | `/men/stats` | ✅ | ADMIN, SELLER | Estadísticas de repartidores |
| GET | `/zones` | No | — | Zonas de entrega |
| POST | `/zones` | ✅ | ADMIN | Crear zona |
| PUT | `/zones/:id` | ✅ | ADMIN | Actualizar zona |
| DELETE | `/zones/:id` | ✅ | ADMIN | Eliminar zona |
| PUT | `/location` | ✅ | DELIVERY | Actualizar ubicación GPS |
| GET | `/locations` | ✅ | ADMIN | Ubicaciones de repartidores |
| POST | `/ratings` | ✅ | — | Calificar entrega |
| GET | `/ratings/:orderId` | ✅ | — | Calificación de un pedido |
| GET | `/ratings/stats/:deliveryManId` | No | — | Estadísticas de calificaciones |
| POST | `/invoices` | ✅ | — | Crear factura simple |

---

## Notificaciones (`/api/notifications`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ✅ | Mis notificaciones (`limit`) |
| PUT | `/read-all` | ✅ | Marcar todas como leídas |
| PUT | `/:id/read` | ✅ | Marcar una como leída |
| POST | `/` | ✅ | Crear notificación |
| POST | `/notify-admins` | ✅ | Notificar a todos los admins |

---

## Upload (`/api/upload`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/status` | ✅ | ADMIN | Estado de configuración R2 |
| POST | `/` | ✅ | ADMIN, SELLER | Subir archivo (max 10MB) |
| POST | `/multiple` | ✅ | ADMIN, SELLER | Subir múltiples archivos (max 10) |
| DELETE | `/` | ✅ | ADMIN | Eliminar archivo por key |

---

## Promociones (`/api/promotions`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/waitlist` | No | — | Inscribirse en lista de espera |
| GET | `/waitlist/check` | No | — | Verificar inscripción |
| GET | `/` | ✅ | ADMIN | Listar promociones |
| GET | `/waitlist/:bannerId` | ✅ | ADMIN | Lista de espera de un banner |
| PUT | `/:id/activate` | ✅ | ADMIN | Activar promo (envía emails) |
| PUT | `/:id/status` | ✅ | ADMIN | Actualizar estado de promo |

---

## Cancelaciones (`/api/cancellations`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/delivery/:orderId` | ✅ | DELIVERY | Cancelar pedido (repartidor) |
| POST | `/seller/:orderId` | ✅ | SELLER | Cancelar pedido (vendedor) |
| POST | `/admin/:orderId` | ✅ | ADMIN | Cancelar pedido (admin) |
| GET | `/` | ✅ | ADMIN | Listar cancelaciones (paginado) |
| GET | `/config` | ✅ | ADMIN | Obtener ventana de cancelación |
| PUT | `/config` | ✅ | ADMIN | Actualizar ventana de cancelación |

---

## Plantillas de Email (`/api/email-templates`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/` | ✅ | ADMIN | Listar plantillas |
| GET | `/:id` | ✅ | ADMIN | Detalle de plantilla |
| POST | `/` | ✅ | ADMIN | Crear plantilla |
| PUT | `/:id` | ✅ | ADMIN | Actualizar plantilla |
| DELETE | `/:id` | ✅ | ADMIN | Eliminar plantilla |
| POST | `/:id/send-test` | ✅ | ADMIN | Enviar email de prueba |

---

## Tiendas (`/api/stores`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | `/` | No | — | Listar tiendas |
| GET | `/my/store` | ✅ | SELLER | Mi tienda asignada |
| GET | `/:id` | No | — | Detalle de tienda (con vendedores y zonas) |
| POST | `/` | ✅ | ADMIN | Crear tienda |
| PUT | `/:id` | ✅ | ADMIN | Actualizar tienda |
| DELETE | `/:id` | ✅ | ADMIN | Eliminar tienda |
| POST | `/:id/sellers` | ✅ | ADMIN | Asignar vendedor |
| DELETE | `/:id/sellers/:sellerId` | ✅ | ADMIN | Remover vendedor |
| POST | `/:id/zones` | ✅ | ADMIN | Asignar zona de entrega |
| DELETE | `/:id/zones/:zoneId` | ✅ | ADMIN | Remover zona |
| PUT | `/:id/shipping-config` | ✅ | ADMIN | Configurar envío |
| GET | `/:id/inventory` | ✅ | ADMIN, SELLER | Inventario de tienda |
| PUT | `/:id/location` | ✅ | ADMIN | Guardar ubicación |

---

## Fiscal (`/api/fiscal`)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/invoices` | ✅ | ADMIN, SELLER | Emitir e-CF |
| GET | `/invoices` | ✅ | ADMIN | Listar e-CF (paginado, filtros) |
| GET | `/invoices/:id` | ✅ | ADMIN | Detalle de e-CF |
| POST | `/invoices/:id/annul` | ✅ | ADMIN | Anular e-CF |
| POST | `/invoices/:id/ack` | ✅ | ADMIN | Registrar acuse de recibo |
| POST | `/invoices/:id/approval` | ✅ | ADMIN | Registrar aprobación comercial |
| POST | `/invoices/:id/resend` | ✅ | ADMIN, SELLER | Reenviar e-CF a DGII |
| GET | `/invoices/:id/pdf` | ✅ | ADMIN, SELLER | Descargar PDF |
| GET | `/dashboard` | ✅ | ADMIN | Resumen fiscal |
| GET | `/config` | ✅ | ADMIN | Configuración fiscal |
| PUT | `/config` | ✅ | ADMIN | Actualizar configuración |
| POST | `/config/certificate` | ✅ | ADMIN | Subir certificado .p12 |
| GET | `/sequences` | ✅ | ADMIN | Listar secuencias NCF |
| POST | `/sequences` | ✅ | ADMIN | Registrar secuencia |
| GET | `/audit` | ✅ | ADMIN | Log de auditoría fiscal |

---

## Health Check

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | No | Estado del servidor |

```json
// Response 200
{ "status": "ok", "timestamp": "2026-02-24T..." }
```

---

## Códigos de Error Comunes

| Código | Significado |
|--------|------------|
| 400 | Datos inválidos o faltantes |
| 401 | No autenticado o credenciales incorrectas |
| 403 | Sin permisos para esta acción |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, ya existe) |
| 429 | Rate limit excedido |
| 500 | Error interno del servidor |

Formato de error:
```json
{ "error": "Mensaje descriptivo en español" }
```
