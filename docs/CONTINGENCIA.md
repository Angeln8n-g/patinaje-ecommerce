# 🚨 Plan de Contingencia y Recuperación — Skating Store

## Objetivos de Recuperación

| Métrica | Objetivo | Justificación |
|---------|----------|---------------|
| **RPO** (Recovery Point Objective) | 24 horas | Backup diario de la base de datos. Pérdida máxima aceptable: 1 día de datos |
| **RTO** (Recovery Time Objective) | 4 horas | Tiempo máximo para restaurar el servicio completo |

---

## Estrategia de Backups

### Base de Datos (PostgreSQL)

**Backup diario automatizado** (configurar con cron):

```bash
# Agregar a crontab: crontab -e
# Backup diario a las 3:00 AM
0 3 * * * pg_dump -U skating_user -h localhost skating_store | gzip > /home/backups/db/skating_$(date +\%Y\%m\%d).sql.gz

# Limpiar backups mayores a 30 días
0 4 * * * find /home/backups/db/ -name "*.sql.gz" -mtime +30 -delete
```

**Backup antes de cada deploy:**
```bash
pg_dump -U skating_user -h localhost skating_store > /home/backups/db/pre_deploy_$(date +%Y%m%d_%H%M%S).sql
```

### Código Fuente
- Repositorio Git en GitHub (backup inherente)
- Cada deploy es un commit identificable

### Archivos (Cloudflare R2)
- R2 tiene redundancia integrada
- Considerar backup periódico de las URLs de imágenes críticas

---

## Escenarios de Fallo y Respuesta

### 1. Backend caído (proceso PM2)

**Síntomas:** Error 502, API no responde
**Impacto:** Alto — tienda no funcional
**Tiempo estimado de resolución:** 5-15 minutos

```bash
# Diagnóstico
pm2 status
pm2 logs skating-api --err --lines 50

# Resolución
pm2 restart skating-api

# Si persiste, verificar dependencias
cd /home/skating-store/backend
npm install
npm run build
pm2 restart skating-api
```

### 2. Base de datos caída

**Síntomas:** Errores 500 en todos los endpoints
**Impacto:** Crítico — sistema completamente inoperativo
**Tiempo estimado de resolución:** 15-60 minutos

```bash
# Diagnóstico
sudo systemctl status postgresql
sudo journalctl -u postgresql --since "1 hour ago"

# Resolución
sudo systemctl restart postgresql

# Verificar conectividad
psql -U skating_user -h localhost skating_store -c "SELECT 1"

# Si la BD está corrupta, restaurar backup
sudo systemctl stop postgresql
# Restaurar desde backup más reciente
psql -U skating_user -h localhost skating_store < /home/backups/db/skating_YYYYMMDD.sql
sudo systemctl start postgresql
pm2 restart skating-api
```

### 3. Disco lleno en el servidor

**Síntomas:** Errores de escritura, logs no se generan, BD no puede escribir
**Impacto:** Crítico
**Tiempo estimado de resolución:** 15-30 minutos

```bash
# Diagnóstico
df -h
du -sh /home/skating-store/backend/dist/
du -sh /var/log/
du -sh ~/.pm2/logs/

# Resolución inmediata
pm2 flush                                    # Limpiar logs de PM2
sudo journalctl --vacuum-size=100M           # Limpiar journal
sudo find /var/log -name "*.gz" -delete      # Limpiar logs comprimidos
```

### 4. Certificado SSL expirado

**Síntomas:** Navegador muestra advertencia de seguridad
**Impacto:** Alto — usuarios no pueden acceder
**Tiempo estimado de resolución:** 5-10 minutos

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### 5. Servidor VPS completamente caído

**Síntomas:** Ni frontend ni backend responden
**Impacto:** Crítico
**Tiempo estimado de resolución:** 1-4 horas

1. Contactar proveedor de hosting (Contabo) para verificar estado del VPS
2. Si el VPS no se puede recuperar, provisionar uno nuevo:
   - Instalar Node.js 20, PostgreSQL 15, Nginx, PM2, Certbot
   - Clonar repositorio desde GitHub
   - Restaurar backup de BD más reciente
   - Configurar `.env` con las credenciales
   - Configurar Nginx y SSL
   - Actualizar DNS si la IP cambió
3. El frontend en Vercel sigue funcionando (muestra errores de API)

### 6. Credenciales comprometidas

**Síntomas:** Actividad sospechosa, accesos no autorizados
**Impacto:** Crítico
**Tiempo estimado de resolución:** 30-60 minutos

1. **Inmediato:** Rotar JWT_SECRET (invalida todas las sesiones)
2. Rotar todas las API keys afectadas (Resend, R2, Google)
3. Cambiar contraseña de la base de datos
4. Revisar logs de seguridad: `pm2 logs skating-api | grep "security"`
5. Verificar que no se crearon usuarios admin no autorizados:
   ```sql
   SELECT id, email, role, created_at FROM profiles WHERE role = 'ADMIN' ORDER BY created_at DESC;
   ```
6. Reiniciar backend: `pm2 restart skating-api`

---

## Contactos de Emergencia

| Servicio | Contacto |
|----------|----------|
| Hosting VPS (Contabo) | Panel de control / soporte |
| Dominio / DNS | Registrador del dominio |
| Cloudflare R2 | Dashboard de Cloudflare |
| Resend | https://resend.com/support |
| Vercel (frontend) | https://vercel.com/support |

---

## Checklist Post-Incidente

- [ ] Servicio restaurado y verificado
- [ ] Causa raíz identificada
- [ ] Medida correctiva implementada
- [ ] Backup verificado post-restauración
- [ ] Usuarios afectados notificados (si aplica)
- [ ] Documentar incidente con fecha, causa, resolución y duración
