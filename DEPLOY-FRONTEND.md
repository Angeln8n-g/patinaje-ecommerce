# Despliegue del Frontend Next.js en VPS (tu-dominio.com)

> Prerequisito: Ya tienes Node.js, PM2 y Nginx instalados en tu VPS.

## 1. Ir al proyecto clonado

```bash
cd /home/skating-store
```

(O donde hayas clonado el repo con `git clone`)

## 2. Instalar dependencias del frontend

```bash
npm install
```

## 3. Crear .env.local

```bash
nano .env.local
```

Pega esto:
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_RESEND_API_KEY=
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

## 4. Compilar el frontend

```bash
npm run build
```

Esto puede tardar unos minutos.

## 5. Iniciar con PM2

```bash
pm2 start npm --name skating-frontend -- start -- -p 3000
pm2 save
```

Verifica que esté corriendo:
```bash
pm2 status
```

## 6. Configurar Nginx para el frontend

```bash
sudo nano /etc/nginx/sites-available/tu-dominio.com
```

Pega esto:
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

Activar el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/tu-dominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL con Certbot

Primero asegúrate de tener registros DNS tipo A apuntando a tu VPS para:
- `tu-dominio`
- `tu-dominio` (opcional)

Luego:
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

## 8. Actualizar CORS del backend

Edita el .env del backend para aceptar peticiones desde tu dominio:
```bash
nano /home/skating-store/backend/.env
```

Cambia CORS_ORIGIN a:
```
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com
```

Reinicia el backend:
```bash
pm2 restart skating-api
```

## 9. Verificar

Abre `https://tu-dominio.com` en tu navegador. Deberías ver la tienda.

## Módulos del panel admin

El frontend incluye los siguientes módulos en `/admin`:

- Dashboard, Pedidos, Inventario, Productos, Categorías, Banners, Promociones
- **Plantillas de Email** (`/admin/email-templates`) — Editor visual de plantillas HTML con vista previa, editor de código, variables dinámicas y envío de prueba vía Resend
- **Cancelaciones** (`/admin/cancellations`) — Gestión de cancelaciones de pedidos
- Variantes de color en productos (integrado en el formulario de producto)
- Usuarios, Repartidores, Vendedores, Zonas de Entrega, Facturación Fiscal, Configuración

## Actualizaciones futuras

```bash
cd /home/skating-store
git pull
npm install
npm run build
pm2 restart skating-frontend
```

> Si el backend tiene nuevas migraciones, también ejecuta en el backend:
> ```bash
> cd /home/skating-store/backend
> git pull
> npm install
> npm run db:migrate
> npm run build
> pm2 restart skating-api
> ```
