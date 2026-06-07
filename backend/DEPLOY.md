# Deployment en VPS Contabo (tu-dominio.com)

## 1. Instalar PostgreSQL

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## 2. Crear base de datos y usuario

```bash
sudo -u postgres psql
```

```sql
CREATE USER skating_user WITH PASSWORD 'TU_PASSWORD_SEGURO';
CREATE DATABASE skating_store OWNER skating_user;
GRANT ALL PRIVILEGES ON DATABASE skating_store TO skating_user;
\q
```

## 3. Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

## 4. Instalar PM2 (process manager)

```bash
sudo npm install -g pm2
```

## 5. Clonar el proyecto desde GitHub

```bash
# En el servidor:
cd /home
git clone https://github.com/Angeln8n-g/RDPatina.git skating-store
cd skating-store/backend
npm install
```

> Para futuras actualizaciones solo necesitas:
> ```bash
> cd /home/skating-store/backend
> git pull
> npm install
> npm run build
> pm2 restart skating-api
> ```

## 6. Configurar .env

```bash
cp .env.example .env
nano .env
```

Edita con tus valores reales:
```
DATABASE_URL=postgresql://skating_user:TU_PASSWORD_SEGURO@localhost:5432/skating_store
JWT_SECRET=
PORT=4000
CORS_ORIGIN=
RESEND_API_KEY=re_XXXXXXXX
STORE_URL=https://tu-dominio.com
```

## 7. Inicializar la base de datos

```bash
npx tsx src/db/init.ts
```

## 7.1 Aplicar migraciones

Después de la inicialización (o en cada deploy con cambios de esquema), ejecuta las migraciones pendientes:

```bash
npm run db:migrate
```

Esto aplica en orden todos los archivos `.sql` de `src/db/migrations/` que no se hayan ejecutado previamente. Las migraciones aplicadas se registran en la tabla `schema_migrations` para no repetirse.

Migraciones actuales:
- `001_oauth_and_reset.sql` — OAuth y reset de contraseña
- `002_fiscal_module.sql` — Módulo fiscal (config, secuencias, facturas, auditoría)
- `003_banner_categories.sql` — Relación banners-categorías
- `004_variant_prices.sql` — Precios por variante de producto
- `005_promo_waitlist.sql` — Sistema de lista de espera para promociones (promo_status en banners + tabla promo_waitlist)
- `006_order_fiscal_data.sql` — Columna fiscal_data (JSONB) en skating_orders para persistir datos de comprobante fiscal
- `007_color_variant_type.sql` — Tipo de variante de color en productos
- `008_order_cancellations.sql` — Sistema de cancelación de pedidos
- `009_email_templates.sql` — Tabla email_templates para el editor de plantillas de email

> Para futuras actualizaciones con cambios de base de datos:
> ```bash
> cd /home/skating-store/backend
> git pull
> npm install
> npm run db:migrate
> npm run build
> pm2 restart skating-api
> ```

## 8. Compilar y ejecutar

```bash
npm run build
pm2 start dist/index.js --name skating-api
pm2 save
pm2 startup
```

## 9. Configurar Nginx como reverse proxy

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/api.tu-dominio.com
```

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.tu-dominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 10. SSL con Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.tu-dominio.com
```

## 11. Crear usuario admin

```bash
npx tsx -e "
import 'dotenv/config';
import { pool } from './src/db/pool.js';
import { hashPassword } from './src/lib/auth.js';
async function main() {
  const hash = await hashPassword('#Haxuel01');
  await pool.query(
    \"INSERT INTO profiles (email, password_hash, role, email_confirmed) VALUES (\$1, \$2, 'ADMIN', TRUE)\",
    ['angellafraga@gmail.com', hash]
  );
  console.log('Admin created');
  await pool.end();
}
main();
"
```
