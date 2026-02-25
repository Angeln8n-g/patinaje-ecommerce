# 🏗️ Arquitectura del Sistema — Skating Store

## Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Comprador│  │ Vendedor │  │Repartidor│  │ Administrador│   │
│  │  (USER)  │  │ (SELLER) │  │(DELIVERY)│  │   (ADMIN)    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
└───────┼──────────────┼──────────────┼───────────────┼───────────┘
        │              │              │               │
        └──────────────┴──────┬───────┴───────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                              │
│                                                                   │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS               │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐      │
│  │ Tienda      │  │ Panel Admin  │  │ POS / Entregas     │      │
│  │ Pública     │  │ Dashboard    │  │ Vendedor/Repartidor│      │
│  └─────────────┘  └──────────────┘  └────────────────────┘      │
│                                                                   │
│  Auth Context ←→ API Client (fetch + credentials: include)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (api.hunykho.com)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 NGINX (Reverse Proxy + SSL)                      │
│                 Certbot / Let's Encrypt                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ :4000
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js + PM2)                    │
│                                                                   │
│  ┌─────────────────── Middleware Pipeline ──────────────────┐    │
│  │ Helmet → CORS → Rate Limit → JSON Parser → Cookie Parser│    │
│  │ → Request Logger → JWT Authenticate                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────── Rutas (19 módulos) ──────────────────┐   │
│  │ auth · products · orders · cart · favorites · reviews     │   │
│  │ contact · content · users · pos · inventory · delivery    │   │
│  │ notifications · upload · fiscal · promotions              │   │
│  │ cancellations · email-templates · stores                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────── Servicios Internos ──────────────────────────┐   │
│  │ Validators (Zod) · Sanitize (XSS) · Logger (Pino)       │   │
│  │ Email Queue · Cancellation Service · Color Validation    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────── Módulo Fiscal ───────────────────────────────┐   │
│  │ NCF Manager · XML Generator · XML Signer · PDF Generator │   │
│  │ DGII Client · Audit Logger · Tax Calculator · Encryption │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Global Error Handler → Graceful Shutdown (SIGTERM/SIGINT)       │
└───────┬──────────────┬──────────────┬───────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │Cloudflare│ │  Servicios   │
│              │ │    R2    │ │  Externos    │
│ 25+ tablas   │ │          │ │              │
│ 15+ índices  │ │ Imágenes │ │ • Google     │
│ pgcrypto     │ │ Archivos │ │   OAuth 2.0  │
│ UUIDs        │ │          │ │ • Resend     │
│              │ │          │ │   (emails)   │
│ Migraciones  │ │ S3-API   │ │ • DGII      │
│ secuenciales │ │          │ │   (fiscal)   │
└──────────────┘ └──────────┘ └──────────────┘
```

## Flujo de Autenticación

```
Cliente → POST /api/auth/login (email + password)
  → Backend valida credenciales (bcryptjs)
  → Genera JWT (7 días)
  → Set-Cookie: skating_token (httpOnly, Secure, SameSite=Lax)
  → Response: { user, token }

Peticiones subsiguientes:
  → Cookie skating_token enviada automáticamente
  → Middleware authenticate() decodifica JWT
  → req.user = { userId, email, role }
  → requireAuth / requireRole verifican acceso
```

## Flujo de un Pedido Online

```
1. Cliente agrega productos al carrito (POST /api/cart)
2. Cliente hace checkout (POST /api/orders)
   → Validación Zod del body
   → Check de idempotencia (30s)
   → Sanitización de datos personales
   → INSERT en skating_orders
3. Admin asigna repartidor (POST /api/delivery/shipments)
   → Estado del pedido: pending → confirmed
4. Repartidor actualiza ubicación (PUT /api/delivery/location)
5. Repartidor marca entregado (PUT /api/delivery/shipments/:id)
   → Estado: shipped → delivered
6. Cliente califica entrega (POST /api/delivery/ratings)
```

## Flujo de Venta POS

```
1. Vendedor abre sesión de caja (POST /api/pos/sessions)
2. Busca productos por código de barras (GET /api/products/search-pos)
3. Crea pedido POS (POST /api/orders/pos)
   → SELECT ... FOR UPDATE (lock de stock)
   → Verifica stock disponible
   → Descuenta stock + registra movimiento
   → Actualiza totales de sesión
4. Al final del día, cierra sesión (PUT /api/pos/sessions/:id/close)
   → Reporta monto en caja
   → Sistema calcula diferencia esperada vs reportada
```

## Base de Datos

25+ tablas organizadas en dominios:

| Dominio | Tablas |
|---------|--------|
| Usuarios | `profiles`, `password_reset_tokens` |
| Catálogo | `skating_products`, `categories` |
| Comercio | `skating_orders`, `carts`, `cart_items`, `favorites` |
| Contenido | `banners`, `banner_categories`, `promo_text_banners`, `static_content` |
| Entregas | `shipments`, `delivery_zones`, `delivery_locations`, `delivery_ratings` |
| POS | `pos_sessions` |
| Inventario | `inventory_movements`, `store_inventory` |
| Tiendas | `stores`, `store_sellers`, `store_delivery_zones` |
| Fiscal | `fiscal_config`, `fiscal_sequences`, `fiscal_invoices`, `fiscal_audit_log`, `fiscal_config_history` |
| Comunicación | `skating_notifications`, `skating_contact_messages`, `skating_invoices`, `email_templates` |
| Promociones | `promo_waitlist` |
| Reseñas | `skating_product_reviews` |
| Cancelaciones | `order_cancellations` |

## Seguridad por Capas

```
Capa 1: Red
  └─ Nginx + SSL/TLS (Let's Encrypt)
  └─ Rate limiting (express-rate-limit)

Capa 2: HTTP
  └─ Helmet.js (CSP, HSTS, X-Frame-Options, etc.)
  └─ CORS estricto (sin wildcard)
  └─ Cookie httpOnly + Secure + SameSite

Capa 3: Aplicación
  └─ Validación de inputs (Zod schemas)
  └─ Sanitización XSS
  └─ RBAC (4 roles con middleware)
  └─ Queries parametrizadas (sin SQL injection)

Capa 4: Datos
  └─ Contraseñas: bcryptjs (12 rondas)
  └─ Reset tokens: SHA-256 hash
  └─ Certificados fiscales: AES-256 cifrado
  └─ UUIDs como primary keys

Capa 5: Observabilidad
  └─ Logging estructurado (Pino)
  └─ Redacción automática de datos sensibles
  └─ Audit log para eventos de seguridad
```
