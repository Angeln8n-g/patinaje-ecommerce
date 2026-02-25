# 🛹 AUDITORÍA COMPLETA — Patinaje E-Commerce (hunykho.com)
## Fecha: 24 de febrero de 2026

---

## APARTADO A — Radiografía del Proyecto

### 01. Propósito central
E-commerce de artículos de patinaje (patines, ruedas, protecciones, accesorios). Incluye tienda online, panel de administración, punto de venta (POS), gestión de inventario multi-tienda, sistema de entregas con tracking en tiempo real, y módulo fiscal (facturación electrónica DGII — República Dominicana).

### 02. Stack técnico
| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16.1.4, React 19.2.3, TypeScript, Tailwind CSS, Radix UI |
| Backend | Express.js 4.21.2, TypeScript, Node.js |
| BBDD | PostgreSQL (pg 8.13.1), pgcrypto para UUIDs |
| Hosting | Frontend: Vercel · Backend: no especificado (probablemente Railway) |
| Storage | Cloudflare R2 (S3-compatible) |

### 03. Servicios y APIs de terceros
- Google OAuth 2.0 (autenticación social)
- Resend (envío de emails transaccionales)
- Cloudflare R2 (almacenamiento de archivos)
- Leaflet/OpenStreetMap (mapas de entregas y tiendas)
- DGII (facturación fiscal dominicana)

### 04. Usuarios del sistema
- Público abierto (compradores online)
- Vendedores (POS en tienda física)
- Repartidores (entregas)
- Administradores (gestión completa)
- 4 roles: USER, ADMIN, DELIVERY, SELLER

### 05. Categoría de datos
- **Identificativos**: nombre, email, teléfono, dirección
- **Financieros**: pedidos, totales, métodos de pago, sesiones POS
- **Operativos**: inventario, movimientos de stock, envíos, tracking GPS
- **Fiscales**: NCF, datos de facturación DGII

### 06. Infraestructura
- Frontend: Vercel (confirmado por `.vercel/project.json`)
- Backend: servidor externo (API en `api.hunykho.com`)
- BBDD: PostgreSQL externo
- Storage: Cloudflare R2

### 07. Mecanismo de autenticación
- JWT con expiración de 7 días
- bcryptjs con 12 rondas de salt para contraseñas
- Google OAuth 2.0 como proveedor social
- Token almacenado en localStorage + cookie (SameSite=Lax)
- Middleware RBAC con `requireAuth` y `requireRole`

### 08. Pagos y datos financieros
- Sí: pedidos con totales, métodos de pago (card, cash, QR)
- Sesiones POS con control de caja
- Módulo fiscal completo con NCF y facturación DGII
- No se detecta integración directa con pasarela de pago (Stripe, PayPal, etc.)

---

## APARTADO B — Salud del Ecosistema de Paquetes

### B.1 — Detección de Fallos de Seguridad

⚠️ **Acción requerida**: Ejecuta estos comandos y comparte el resultado:

```bash
# Frontend
npm audit

# Backend
cd backend && npm audit
```

**Observaciones del análisis estático de dependencias:**
- `multer 1.4.5-lts.1` — versión LTS, verificar si hay CVEs pendientes
- `jsonwebtoken 9.0.2` — versión actual, OK
- `bcryptjs 2.4.3` — versión estable, OK
- `express 4.21.2` — versión reciente, OK
- `pg 8.13.1` — versión actual, OK

### B.2 — Librerías Obsoletas

⚠️ **Acción requerida**: Ejecuta:
```bash
npm outdated
cd backend && npm outdated
```

**Observaciones:**
- Next.js 16.1.4 — versión muy reciente, OK
- React 19.2.3 — última versión, OK
- `xlsx 0.18.5` — librería con historial de vulnerabilidades conocidas. Evaluar alternativa como `exceljs`

### B.3 — Fiabilidad de las Dependencias

| Dependencia | Estado | Riesgo |
|------------|--------|--------|
| `node-forge 1.3.3` | Activo, pero historial de CVEs | 🟡 MEDIO — Usado para firma XML fiscal |
| `xml-crypto 6.1.2` | Mantenido | ✅ OK |
| `xlsx 0.18.5` | Mantenimiento irregular, CVEs previos | 🟡 MEDIO — Considerar `exceljs` |
| `html5-qrcode 2.3.8` | Mantenimiento bajo | 🟡 BAJO |
| `pdfkit 0.17.2` | Activo | ✅ OK |
| `resend 6.9.x` | Activo | ✅ OK |

**Dependencias potencialmente eliminables:**
- `resend` está en AMBOS package.json (frontend y backend). Solo debería estar en el backend.

### B.4 — Revisión de Licencias

⚠️ **Acción requerida**:
```bash
npx license-checker --summary
cd backend && npx license-checker --summary
```

**Observación**: `xlsx` usa licencia Apache-2.0 (compatible con uso comercial). Las dependencias principales (React, Next.js, Express) usan MIT. No se detectan licencias GPL/AGPL en las dependencias directas.

---

## APARTADO C — Blindaje de Seguridad

### C.1 — Identidad y Permisos

| Check | Estado | Detalle |
|-------|--------|---------|
| Contraseñas con algoritmo robusto | ✅ OK | bcryptjs con 12 rondas de salt |
| Rate limiting en login | 🔴 CRÍTICO | **NO IMPLEMENTADO** — Vulnerable a fuerza bruta |
| Tokens con caducidad | 🟡 MEDIO | JWT 7 días — Demasiado largo para operaciones sensibles |
| Cierre de sesión invalida token | 🔴 ALTO | **NO** — Solo borra localStorage/cookie. El JWT sigue siendo válido hasta expirar |
| Credenciales en variables de entorno | 🔴 CRÍTICO | `.env.example` contiene credenciales REALES (API keys, DB password, R2 secrets) |
| RBAC implementado | ✅ OK | 4 roles con middleware `requireRole` |
| Endpoints verifican permisos | ✅ OK | Middleware aplicado en rutas protegidas |
| MFA para administración | 🔴 ALTO | **NO IMPLEMENTADO** |

**Hallazgos críticos:**

1. **JWT_SECRET con valor por defecto**: `const JWT_SECRET = process.env.JWT_SECRET || "change-me"` — Si la variable de entorno no está configurada, CUALQUIERA puede forjar tokens válidos.

2. **Tokens de reset de contraseña en texto plano**: Se almacenan sin hashear en la BBDD. Si la base de datos se compromete, un atacante puede resetear cualquier contraseña.

3. **No hay bloqueo de cuenta**: Sin límite de intentos fallidos de login.

4. **Cambio de contraseña sin verificar la actual**: El endpoint `PUT /api/auth/password` no pide la contraseña actual, solo la nueva.

### C.2 — Saneamiento de Datos de Entrada

| Check | Estado | Detalle |
|-------|--------|---------|
| Validación server-side | 🔴 ALTO | **MÍNIMA** — Solo checks básicos de campos vacíos. Sin schemas de validación |
| Queries parametrizadas | ✅ OK | Uso consistente de `$1, $2` en todas las queries |
| Archivos validados | 🟡 MEDIO | Validación por MIME type pero sin verificación de magic bytes |
| Anti-XSS | 🔴 ALTO | **NO IMPLEMENTADO** — Sin sanitización de HTML en inputs de usuario |
| Protección CSRF | 🔴 ALTO | **NO IMPLEMENTADO** |
| Schemas de validación API | 🔴 ALTO | **NO IMPLEMENTADO** — `zod` está instalado en frontend pero no se usa en backend |

**Detalle:**
- Los endpoints aceptan cualquier dato en el body sin validación de formato (email, teléfono, etc.)
- Reviews, mensajes de contacto y descripciones de productos no se sanitizan contra XSS
- SVG permitido en uploads — vector de XSS si se sirve con Content-Type incorrecto

### C.3 — Custodia de la Información

| Check | Estado | Detalle |
|-------|--------|---------|
| HTTPS/TLS | ✅ OK | Vercel y dominio con HTTPS |
| Datos sensibles cifrados en reposo | 🔴 ALTO | **NO** — Emails, teléfonos, direcciones en texto plano en BBDD |
| Normativa de datos personales | 🔴 ALTO | **Sin implementar** — No hay mecanismo de consentimiento, portabilidad ni eliminación |
| Backups cifrados | ❓ DESCONOCIDO | Depende de la configuración del hosting de BBDD |
| Política de retención | 🔴 ALTO | **NO DEFINIDA** |
| Logs sin datos sensibles | 🟡 MEDIO | `console.error` puede exponer datos en logs |
| Errores genéricos | 🟡 MEDIO | Mayormente genéricos, pero `"El email ya está registrado"` confirma existencia de emails |

### C.4 — Superficie de Exposición de la API

| Check | Estado | Detalle |
|-------|--------|---------|
| Endpoints protegidos | ✅ OK | Middleware `requireAuth`/`requireRole` aplicado |
| Rate limiting | 🔴 CRÍTICO | **NO IMPLEMENTADO** en ningún endpoint |
| CORS configurado | 🔴 ALTO | Fallback a `"*"` si `CORS_ORIGIN` no está definido. Con `credentials: true` esto es peligroso |
| Versionado de API | 🔴 MEDIO | **NO IMPLEMENTADO** — Todas las rutas en `/api/` sin versión |
| Webhooks verificados | N/A | No se detectan webhooks entrantes |
| Tamaño máximo de payload | ✅ OK | `express.json({ limit: "10mb" })` |

### C.5 — Entorno Operativo

| Check | Estado | Detalle |
|-------|--------|---------|
| Secretos en env vars | 🔴 CRÍTICO | `.env.example` tiene credenciales REALES expuestas en el repo |
| .env fuera de git | ✅ OK | `.gitignore` incluye `.env*` |
| Aislamiento prod/dev | 🟡 MEDIO | No se evidencia entorno de staging |
| Superficie de red minimizada | ✅ OK | Backend escucha en puerto configurable |
| Credenciales de fábrica reemplazadas | 🔴 CRÍTICO | JWT_SECRET tiene fallback a `"change-me"` |
| Registro de eventos de seguridad | 🔴 ALTO | **NO IMPLEMENTADO** — Sin logging de intentos de login, accesos denegados, etc. |
| Headers de seguridad | 🔴 ALTO | **NO IMPLEMENTADO** — Sin helmet.js, sin X-Frame-Options, sin CSP, sin HSTS |

---

## APARTADO D — Comportamiento Bajo Presión

### D.1 — Flujos Principales

| Check | Estado | Detalle |
|-------|--------|---------|
| Camino feliz funcional | ✅ OK | Flujos de compra, POS, inventario implementados |
| Campos vacíos | 🟡 MEDIO | Validación básica pero incompleta |
| Inputs límite | 🔴 ALTO | Sin validación de longitud máxima en la mayoría de campos |
| Caracteres especiales | 🔴 ALTO | Sin sanitización — riesgo de XSS con unicode/HTML |
| Concurrencia | 🟡 MEDIO | Transacciones en operaciones críticas, pero sin locks optimistas |
| Degradación ante desconexión | 🟡 MEDIO | Frontend no tiene manejo offline explícito |

### D.2 — Situaciones Extremas

| Check | Estado | Detalle |
|-------|--------|---------|
| API externa con rate limit | 🟡 MEDIO | Sin manejo de rate limits de Resend o Google |
| Servicio de terceros caído | 🟡 MEDIO | Sin circuit breaker ni fallbacks |
| Archivos grandes | ✅ OK | Límite de 10MB implementado |
| BBDD desconectada mid-transaction | ✅ OK | `withTransaction` hace ROLLBACK en error |
| Condiciones de carrera | 🔴 ALTO | Sin locks en operaciones de stock — posible overselling |
| Doble click duplicados | 🔴 ALTO | Sin protección de idempotencia en creación de pedidos |
| Zonas horarias | ✅ OK | Uso de TIMESTAMPTZ en PostgreSQL |
| localStorage saturado | 🟡 BAJO | Sin manejo de errores de localStorage |

### D.3 — Tratamiento de Fallos

| Check | Estado | Detalle |
|-------|--------|---------|
| Códigos HTTP semánticos | ✅ OK | 400, 401, 403, 404, 409, 500 usados correctamente |
| Mensajes sin datos técnicos | 🟡 MEDIO | Mayormente OK, pero `console.error` puede filtrar en logs |
| Manejador global de excepciones | 🔴 ALTO | **NO IMPLEMENTADO** — Sin error handler global en Express |
| Operaciones se revierten | ✅ OK | Transacciones con ROLLBACK |
| Errores con contexto para debug | 🟡 MEDIO | Solo `console.error` — sin logging estructurado |
| Alertas automáticas en producción | 🔴 ALTO | **NO IMPLEMENTADO** — Sin Sentry ni similar |

---

## APARTADO E — Velocidad y Capacidad

### E.1 — Tiempos de Respuesta

| Check | Estado | Detalle |
|-------|--------|---------|
| Carga < 3 segundos | ✅ OK | Next.js con React Compiler y Turbopack |
| Queries optimizadas | ✅ OK | Índices en columnas frecuentes (15+ índices definidos) |
| Assets comprimidos | ✅ OK | Vercel maneja compresión automática |
| Caché configurado | 🟡 MEDIO | Sin Redis ni caché explícito en backend |
| Paginación | ⚠️ VERIFICAR | Necesita revisión por endpoint |
| Payloads dimensionados | 🟡 MEDIO | Items de pedido como JSONB — puede crecer sin control |

### E.2 — Preparación para el Crecimiento

| Check | Estado | Detalle |
|-------|--------|---------|
| Usuarios concurrentes estimados | ❓ NO DEFINIDO |
| Pruebas de carga | 🔴 ALTO | **NO REALIZADAS** |
| Punto único de fallo | 🔴 ALTO | Backend es un solo proceso sin clustering |
| Pool de conexiones BBDD | 🟡 MEDIO | `pg.Pool` con configuración por defecto (sin tuning) |
| Tareas pesadas asíncronas | 🔴 ALTO | **NO** — Envío de emails es síncrono en el request |

---

## APARTADO F — Normativa y Legalidad

### F.1 — Protección de Datos Personales

| Check | Estado | Detalle |
|-------|--------|---------|
| Política de privacidad | 🔴 ALTO | **NO DETECTADA** |
| Consentimiento explícito | 🔴 ALTO | **NO IMPLEMENTADO** |
| Portabilidad de datos | 🔴 ALTO | **NO IMPLEMENTADO** |
| Derecho al olvido | 🔴 ALTO | **NO IMPLEMENTADO** — Sin endpoint de eliminación de cuenta |
| Registro de tratamiento | 🔴 ALTO | **NO EXISTE** |
| Proveedores documentados | 🔴 ALTO | **NO DOCUMENTADO** (Resend, Google, Cloudflare) |

**Nota**: Aunque el proyecto opera desde República Dominicana, si atiende clientes en la UE o tiene datos de ciudadanos europeos, aplica RGPD.

### F.2 — Inclusividad Digital

⚠️ **Requiere auditoría manual con herramientas**: axe DevTools, Lighthouse, WAVE

| Check | Estado |
|-------|--------|
| WCAG 2.1 AA | ❓ NO VERIFICADO — Requiere testing manual |
| Alt text en imágenes | ❓ VERIFICAR en componentes |
| Navegación por teclado | ✅ PARCIAL — Radix UI provee accesibilidad base |
| Contraste cromático | ❓ NO VERIFICADO |
| Compatibilidad con lectores de pantalla | ❓ NO VERIFICADO |

### F.3 — Cobertura Legal

| Check | Estado |
|-------|--------|
| Términos y condiciones | 🔴 NO DETECTADOS |
| DPA con cliente | ❓ DESCONOCIDO |
| Licencias open source | ✅ OK — Dependencias principales MIT/Apache-2.0 |
| Propiedad intelectual | ❓ DESCONOCIDO |

---

## APARTADO G — Operaciones y Continuidad

### G.1 — Pipeline de Publicación

| Check | Estado | Detalle |
|-------|--------|---------|
| CI/CD configurado | 🟡 PARCIAL | Vercel auto-deploy para frontend. Backend manual (`deploy.sh`) |
| Tests antes de deploy | 🔴 ALTO | **NO** — Sin pipeline de tests automáticos |
| Entorno staging | 🔴 ALTO | **NO DETECTADO** |
| Rollback rápido | 🟡 MEDIO | Vercel permite rollback. Backend manual |
| Migraciones con rollback | 🔴 ALTO | **NO** — Migraciones solo hacia adelante, sin rollback |

### G.2 — Vigilancia del Sistema

| Check | Estado |
|-------|--------|
| Monitorización de la app | 🔴 **NO IMPLEMENTADO** |
| Checks de uptime | 🔴 **NO IMPLEMENTADO** |
| Alertas ante caídas | 🔴 **NO IMPLEMENTADO** |
| Logging estructurado | 🔴 **NO** — Solo `console.error/log` |
| Métricas de rendimiento | 🔴 **NO IMPLEMENTADO** |

### G.3 — Estrategia de Recuperación

| Check | Estado |
|-------|--------|
| Backups automáticos BBDD | ❓ DEPENDE DEL HOSTING |
| Proceso de restauración probado | 🔴 **NO DOCUMENTADO** |
| RPO definido | 🔴 **NO DEFINIDO** |
| RTO definido | 🔴 **NO DEFINIDO** |
| Plan de contingencia | 🔴 **NO EXISTE** |

---

## APARTADO H — Kit de Entrega al Cliente

### H.1 — Documentación

| Check | Estado |
|-------|--------|
| README con guía de instalación | 🟡 PARCIAL — Existe README pero verificar completitud |
| Esquema de arquitectura | 🔴 **NO EXISTE** |
| Catálogo de variables de entorno | 🟡 PARCIAL — `.env.example` existe pero con credenciales reales |
| Guía de troubleshooting | 🔴 **NO EXISTE** |
| Documentación de API | 🔴 **NO EXISTE** — Sin Swagger/OpenAPI |
| Runbook de mantenimiento | 🔴 **NO EXISTE** |

### H.2 — Limpieza del Código

| Check | Estado |
|-------|--------|
| Código linted | ✅ OK — ESLint configurado |
| Comentarios en lógica compleja | 🟡 MEDIO — Comentarios mínimos |
| Código muerto eliminado | 🟡 MEDIO — Verificar |
| Nomenclatura coherente | ✅ OK — Convenciones consistentes |
| Arquitectura con responsabilidades claras | ✅ OK — Separación routes/lib/db/fiscal |

### H.3 — Paquete Final

| Check | Estado |
|-------|--------|
| Repositorio con historial ordenado | ✅ OK |
| .env.example documentado | 🔴 CRÍTICO — Contiene credenciales reales |
| Guía de despliegue | 🟡 PARCIAL — `DEPLOY.md` y `DEPLOY-FRONTEND.md` existen |
| Diagrama de arquitectura | 🔴 **NO EXISTE** |
| Video walkthrough | ❓ DESCONOCIDO |
| Informe de testing | 🔴 **NO EXISTE** |
| Contrato de soporte | ❓ DESCONOCIDO |
| Documento de credenciales cifrado | 🔴 **NO** — Credenciales en `.env.example` en texto plano |
| Inventario de servicios externos | 🔴 **NO DOCUMENTADO** |
| Traspaso de facturación | ❓ DESCONOCIDO |

---

## RESUMEN EJECUTIVO — Hallazgos por Severidad

### 🔴 CRÍTICOS (Corregir inmediatamente)

1. **Credenciales reales en `.env.example`** — API keys de Resend, Cloudflare R2, contraseña de BBDD y Google Client ID están expuestos en el repositorio. Rotar TODAS las credenciales inmediatamente.

2. **JWT_SECRET con fallback a "change-me"** — Si la variable de entorno no se configura, cualquier persona puede forjar tokens de autenticación válidos. Eliminar el fallback y forzar que sea obligatorio.

3. **Sin rate limiting en ningún endpoint** — Login, registro, forgot-password y todos los endpoints están expuestos a ataques de fuerza bruta y DDoS. Instalar `express-rate-limit`.

4. **Sin headers de seguridad** — No hay helmet.js, X-Frame-Options, CSP, HSTS ni X-Content-Type-Options. El backend está completamente expuesto.

5. **CORS con fallback a wildcard `"*"`** — Con `credentials: true`, esto permite que cualquier origen haga peticiones autenticadas.

### 🔴 ALTOS (Corregir esta semana)

6. **Token JWT en localStorage** — Vulnerable a XSS. Migrar a cookies httpOnly.
7. **Sin validación de inputs** — Los endpoints aceptan cualquier dato sin schemas. Implementar zod en backend.
8. **Sin protección CSRF** — Operaciones que modifican estado no tienen protección.
9. **Sin sanitización XSS** — Inputs de usuario (reviews, contacto, productos) no se sanitizan.
10. **Sin error handler global** — Excepciones no controladas pueden crashear el servidor.
11. **Sin monitorización ni alertas** — No hay Sentry, UptimeRobot ni logging estructurado.
12. **Sin MFA para administradores** — Cuentas admin protegidas solo con contraseña.
13. **Cambio de contraseña sin verificar la actual** — `PUT /api/auth/password` no pide la contraseña vigente.
14. **Tokens de reset en texto plano** — Deben hashearse antes de almacenar en BBDD.
15. **Sin invalidación real de sesión** — Logout solo borra el token del cliente, sigue siendo válido.
16. **Sin protección contra doble click** — Pedidos pueden duplicarse.
17. **Condiciones de carrera en stock** — Sin locks optimistas, posible overselling.
18. **Envío de emails síncrono** — Bloquea el request. Mover a cola asíncrona.

### 🟡 MEDIOS (Corregir en próximo sprint)

19. JWT con expiración de 7 días — Reducir a 1h con refresh token.
20. Pool de conexiones sin tuning — Configurar max, idleTimeout, etc.
21. Sin entorno de staging.
22. Migraciones sin rollback.
23. SVG permitido en uploads (vector XSS).
24. Sin caché en backend (Redis).
25. `resend` duplicado en frontend y backend.
26. Imágenes con `hostname: '**'` en next.config.ts.
27. Sin versionado de API.
28. Sin política de privacidad ni términos de uso.
29. Sin documentación de API (Swagger/OpenAPI).
30. Sin diagrama de arquitectura.

---

## PLAN DE ACCIÓN RECOMENDADO

### Semana 1 — Emergencias
```
1. Rotar TODAS las credenciales expuestas en .env.example
2. Limpiar .env.example dejando solo placeholders
3. Eliminar fallback de JWT_SECRET — lanzar error si no existe
4. Instalar y configurar express-rate-limit
5. Instalar y configurar helmet.js
6. Configurar CORS sin fallback a wildcard
7. Añadir error handler global en Express
```

### Semana 2 — Seguridad Core
```
1. Migrar token a cookies httpOnly
2. Implementar validación con zod en todos los endpoints
3. Añadir sanitización XSS (DOMPurify o similar)
4. Hashear tokens de reset de contraseña
5. Exigir contraseña actual para cambiarla
6. Implementar refresh tokens (JWT corto + refresh largo)
7. Añadir protección de idempotencia en pedidos
```

### Semana 3 — Observabilidad y Resiliencia
```
1. Integrar Sentry para error tracking
2. Configurar logging estructurado (Pino/Winston)
3. Añadir UptimeRobot o BetterStack
4. Implementar cola de emails (BullMQ o similar)
5. Configurar locks optimistas para stock
6. Añadir MFA para cuentas admin
```

### Semana 4 — Documentación y Compliance ✅ COMPLETADA
```
1. ✅ Crear documentación de API — docs/API.md (referencia completa de 19 módulos, 100+ endpoints)
2. ✅ Crear diagrama de arquitectura — docs/ARCHITECTURE.md (diagrama del sistema, flujos, capas de seguridad)
3. ✅ Redactar política de privacidad — src/app/skating-store/privacidad/page.tsx (11 secciones, proveedores documentados)
4. ✅ Implementar eliminación de cuenta — DELETE /api/auth/account (anonimización + limpieza de datos personales)
5. ✅ Documentar variables de entorno — README.md reescrito con tabla completa de env vars
6. ✅ Crear runbook de mantenimiento — docs/RUNBOOK.md (comandos, troubleshooting, rotación de credenciales)
7. ✅ Definir RPO/RTO y plan de contingencia — docs/CONTINGENCIA.md (RPO: 24h, RTO: 4h, 6 escenarios de fallo)
```

---

## PUNTOS POSITIVOS ✅

- Queries SQL parametrizadas en todo el proyecto (sin concatenación)
- Hashing de contraseñas con bcryptjs y 12 rondas
- RBAC funcional con 4 roles bien definidos
- Transacciones con ROLLBACK automático
- Schema de BBDD bien estructurado con constraints y 15+ índices
- UUIDs como primary keys (no secuenciales)
- Validación de tipos de archivo en uploads
- Límite de tamaño de payload (10MB)
- Separación clara de responsabilidades (routes/lib/db/fiscal)
- Sistema de migraciones implementado
- Módulo fiscal completo para DGII
