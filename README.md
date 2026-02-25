# 🛹 Skating Store — hunykho.com

E-commerce de artículos de patinaje con tienda online, panel de administración, punto de venta (POS), gestión de inventario multi-tienda, sistema de entregas con tracking en tiempo real y módulo de facturación fiscal (DGII — República Dominicana).

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI |
| Backend | Express.js 4, TypeScript, Node.js |
| Base de datos | PostgreSQL (pgcrypto) |
| Storage | Cloudflare R2 (S3-compatible) |
| Hosting | Frontend: Vercel · Backend: VPS (PM2 + Nginx) |

## Servicios Externos

- **Google OAuth 2.0** — Autenticación social
- **Resend** — Emails transaccionales
- **Cloudflare R2** — Almacenamiento de archivos
- **Leaflet/OpenStreetMap** — Mapas de entregas y tiendas
- **DGII** — Facturación fiscal electrónica (e-CF)

## Requisitos Previos

- Node.js 20+
- PostgreSQL 15+
- Cuenta de Cloudflare R2 (para almacenamiento de imágenes)
- Cuenta de Resend (para emails)

## Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/Angeln8n-g/RDPatina.git
cd RDPatina

# 2. Frontend
npm install
cp .env.local.example .env.local
# Editar .env.local con tus valores

# 3. Backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de Entorno)

# 4. Inicializar base de datos
npx tsx src/db/init.ts
npm run db:migrate

# 5. Compilar y ejecutar backend
npm run build
npm start

# 6. Ejecutar frontend (en otra terminal, desde la raíz)
cd ..
npm run dev
```

## Variables de Entorno

### Frontend (`.env.local`)

| Variable | Descripción |
|----------|------------|
| `NEXT_PUBLIC_API_URL` | URL del backend API (ej: `https://api.hunykho.com`) |

### Backend (`.env`)

| Variable | Requerida | Descripción |
|----------|-----------|------------|
| `DATABASE_URL` | ✅ | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | ✅ | Secreto para firmar tokens JWT (min 32 chars). Genera con `openssl rand -hex 32` |
| `PORT` | No | Puerto del servidor (default: 4000) |
| `CORS_ORIGIN` | ✅ | Orígenes permitidos, separados por coma |
| `FRONTEND_URL` | ✅ | URL del frontend (para links en emails) |
| `RESEND_API_KEY` | ✅ | API key de Resend para emails |
| `GOOGLE_CLIENT_ID` | No | Client ID de Google OAuth 2.0 |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 Account ID |
| `R2_ACCESS_KEY_ID` | ✅ | Cloudflare R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | ✅ | Cloudflare R2 Secret Key |
| `R2_BUCKET_NAME` | ✅ | Nombre del bucket R2 |
| `R2_PUBLIC_URL` | ✅ | URL pública del bucket R2 |
| `LOG_LEVEL` | No | Nivel de logging: `debug`, `info`, `warn`, `error` (default: `info`) |
| `DB_POOL_MAX` | No | Máximo de conexiones en el pool (default: 20) |
| `NODE_ENV` | No | `production` o `development` |
| `FISCAL_ENCRYPTION_KEY` | No | Clave para cifrar certificados fiscales |

## Estructura del Proyecto

```
├── src/                    # Frontend Next.js
│   ├── app/
│   │   ├── (auth)/         # Login, registro, reset password
│   │   ├── admin/          # Panel de administración
│   │   └── skating-store/  # Tienda pública
│   ├── components/         # Componentes React
│   ├── contexts/           # Context providers (Auth, Cart)
│   └── lib/                # Utilidades y API client
├── backend/
│   └── src/
│       ├── routes/         # 19 módulos de rutas API
│       ├── lib/            # Auth, validators, sanitize, logger, email queue
│       ├── db/             # Pool, schema, migraciones
│       └── fiscal/         # Módulo fiscal DGII (NCF, XML, PDF)
└── public/                 # Assets estáticos
```

## Módulos del Sistema

- **Tienda Online** — Catálogo, carrito, favoritos, checkout, tracking de pedidos
- **Panel Admin** — Dashboard, productos, pedidos, inventario, categorías, banners, usuarios
- **Punto de Venta (POS)** — Sesiones de caja, búsqueda por código de barras, ventas en tienda
- **Entregas** — Asignación de repartidores, tracking GPS en tiempo real, calificaciones
- **Multi-tienda** — Gestión de tiendas, inventario por tienda, transferencias de stock
- **Facturación Fiscal** — e-CF para DGII, secuencias NCF, firma XML, generación de PDF
- **Promociones** — Banners con lista de espera, notificación por email
- **Plantillas de Email** — Editor visual con vista previa y envío de prueba

## Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `USER` | Tienda, carrito, pedidos, favoritos, perfil |
| `SELLER` | POS, pedidos de tienda, inventario de tienda asignada |
| `DELIVERY` | Envíos asignados, actualización de ubicación, confirmación de entrega |
| `ADMIN` | Acceso completo a todos los módulos |

## Despliegue

- **Frontend**: Ver [DEPLOY-FRONTEND.md](./DEPLOY-FRONTEND.md)
- **Backend**: Ver [backend/DEPLOY.md](./backend/DEPLOY.md)

## Seguridad

- Contraseñas hasheadas con bcryptjs (12 rondas)
- JWT en cookies httpOnly (Secure, SameSite=Lax)
- Rate limiting global (100 req/min) y en auth (10 req/15min)
- Headers de seguridad con Helmet.js
- Validación de inputs con Zod
- Sanitización XSS en todos los inputs de usuario
- Queries SQL parametrizadas (sin concatenación)
- CORS estricto (sin wildcard)
- Logging estructurado con Pino (redacción automática de datos sensibles)
- Shutdown graceful del servidor

## Licencia

Proyecto privado. Todos los derechos reservados.
