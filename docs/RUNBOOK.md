# 🔧 Runbook de Mantenimiento — Skating Store

## Acceso al Servidor

```bash
ssh user@your-vps-ip
```

Procesos gestionados con PM2:
- `skating-api` — Backend Express (puerto 4000)
- `skating-frontend` — Frontend Next.js (puerto 3000)

## Comandos Frecuentes

### Ver estado de los procesos
```bash
pm2 status
pm2 logs skating-api --lines 50
pm2 logs skating-frontend --lines 50
```

### Reiniciar servicios
```bash
pm2 restart skating-api
pm2 restart skating-frontend
pm2 restart all
```

### Desplegar actualización
```bash
cd /home/skating-store

# Backend
cd backend
git pull
npm install
npm run db:migrate
npm run build
pm2 restart skating-api

# Frontend
cd /home/skating-store
git pull
npm install
npm run build
pm2 restart skating-frontend
```

### Ver logs en tiempo real
```bash
pm2 logs skating-api
# Solo errores:
pm2 logs skating-api --err
```

---

## Base de Datos

### Conectar a PostgreSQL
```bash
sudo -u postgres psql -d skating_store
```

### Verificar migraciones aplicadas
```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

### Aplicar migraciones pendientes
```bash
cd /home/skating-store/backend
npm run db:migrate
```

### Backup manual
```bash
pg_dump -U skating_user -h localhost skating_store > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar backup
```bash
psql -U skating_user -h localhost skating_store < backup_file.sql
```

### Queries de diagnóstico útiles
```sql
-- Pedidos de las últimas 24 horas
SELECT COUNT(*), status FROM skating_orders
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Usuarios registrados hoy
SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE;

-- Productos con stock bajo (< 5)
SELECT name, stock FROM skating_products WHERE stock < 5 AND status = 'active';

-- Sesiones POS abiertas
SELECT ps.*, p.email FROM pos_sessions ps
JOIN profiles p ON p.id = ps.seller_id
WHERE ps.status = 'open';

-- Conexiones activas al pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'skating_store';
```

---

## Nginx

### Verificar configuración
```bash
sudo nginx -t
```

### Recargar configuración
```bash
sudo systemctl reload nginx
```

### Renovar certificados SSL
```bash
sudo certbot renew --dry-run  # Verificar primero
sudo certbot renew
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### El backend no responde
1. Verificar que el proceso está corriendo: `pm2 status`
2. Ver logs de error: `pm2 logs skating-api --err --lines 100`
3. Verificar que PostgreSQL está activo: `sudo systemctl status postgresql`
4. Verificar conectividad a la BD: `psql -U skating_user -h localhost skating_store -c "SELECT 1"`
5. Reiniciar: `pm2 restart skating-api`

### Error 502 Bad Gateway
1. El backend probablemente está caído: `pm2 status`
2. Verificar que el puerto 4000 está escuchando: `ss -tlnp | grep 4000`
3. Verificar Nginx: `sudo nginx -t`

### La base de datos está lenta
1. Verificar conexiones activas: `SELECT count(*) FROM pg_stat_activity;`
2. Buscar queries lentas: `SELECT * FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds';`
3. Verificar tamaño de tablas: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;`

### Disco lleno
1. Verificar espacio: `df -h`
2. Limpiar logs de PM2: `pm2 flush`
3. Verificar logs de Nginx: `sudo du -sh /var/log/nginx/`
4. Rotar logs: `sudo logrotate -f /etc/logrotate.d/nginx`

### Certificado SSL expirado
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Rotación de Credenciales

### Cambiar JWT_SECRET
1. Editar `/home/skating-store/backend/.env`
2. Cambiar `JWT_SECRET` por un nuevo valor: `openssl rand -hex 32`
3. `pm2 restart skating-api`
4. Nota: Todos los usuarios activos deberán iniciar sesión de nuevo

### Rotar API keys de Resend
1. Generar nueva key en https://resend.com
2. Actualizar `RESEND_API_KEY` en `.env`
3. `pm2 restart skating-api`

### Rotar credenciales de Cloudflare R2
1. Generar nuevas keys en el dashboard de Cloudflare
2. Actualizar `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` en `.env`
3. `pm2 restart skating-api`
