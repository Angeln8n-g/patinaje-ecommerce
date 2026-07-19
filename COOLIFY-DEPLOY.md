# Guía de Despliegue en Coolify — patinaje-ecommerce

Esta guía contiene los pasos necesarios para desplegar el proyecto completo (Base de datos PostgreSQL, Backend API y Frontend Next.js) en tu instancia de **Coolify** utilizando el archivo `docker-compose.yml` que acabamos de configurar.

---

## 1. Configuración de DNS (Prerequisito)

Antes de comenzar en Coolify, debes crear **dos registros A** en tu proveedor de DNS (Cloudflare, GoDaddy, Namecheap, etc.) apuntando a la **dirección IP pública de tu VPS**:

| Subdominio / Dominio | Tipo | Valor (IP del VPS) | Propósito |
| :--- | :--- | :--- | :--- |
| `shopping.kasino21.com` | A | `TU_IP_DEL_VPS` | Frontend de la tienda (Next.js) |
| `api-shopping.kasino21.com` | A | `TU_IP_DEL_VPS` | Backend API (Express) |

---

## 2. Crear el Recurso en Coolify

1. Entra a tu panel de **Coolify**.
2. Dirígete a tu **Project** y **Environment** (por ejemplo, `Production`).
3. Haz clic en **+ New Resource** (Nuevo Recurso) y selecciona **Docker Compose**.
4. Selecciona el origen del repositorio:
   - **GitHub App** o **Private Repository (Deploy Key)** si es privado.
   - Pega la URL del repositorio (ej. `https://github.com/Angeln8n-g/patinaje-ecommerce.git`).
5. Indica la rama (ej. `main` o `master`).
6. Coolify leerá el archivo `docker-compose.yml` ubicado en la raíz de tu proyecto automáticamente.

---

## 3. Configurar Variables de Entorno en Coolify

En la pestaña **Environment Variables** del recurso de Docker Compose en Coolify, debes añadir los siguientes valores. 

> [!IMPORTANT]
> Define estas variables como variables a nivel de **Shared/Compose Stack** para que estén disponibles para todos los servicios:

| Variable | Valor Recomendado / Descripción |
| :--- | :--- |
| `DB_PASSWORD` | Genera una contraseña segura y aleatoria (ej: `U4a7hJ8aK12o...`) |
| `JWT_SECRET` | Genera un string aleatorio largo (ej: `openssl rand -hex 32` en tu terminal) |
| `CORS_ORIGIN` | `https://shopping.kasino21.com` |
| `FRONTEND_URL` | `https://shopping.kasino21.com` |
| `NEXT_PUBLIC_API_URL` | `https://api-shopping.kasino21.com` |
| `RESEND_API_KEY` | Tu API key de Resend (ej: `re_XXXXXXXX`) |
| `NEXT_PUBLIC_RESEND_API_KEY` | Tu API key de Resend (si el frontend la requiere directamente) |
| `GOOGLE_CLIENT_ID` | Tu Client ID de Google OAuth 2.0 (opcional) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Tu Client ID de Google OAuth 2.0 (opcional, para el frontend) |
| `BACKEND_URL` | `https://api-shopping.kasino21.com` |

---

## 4. Desplegar la Aplicación

1. Una vez que hayas guardado las variables de entorno, vuelve a la pestaña **Source** o **General** de tu recurso en Coolify.
2. Haz clic en **Deploy** (Desplegar).
3. Coolify realizará los siguientes pasos de forma automática:
   - Descargará el código.
   - Creará el volumen persistente `postgres_data` y levantará el contenedor de la base de datos `db`.
   - Compilará la imagen de Docker del `backend`, esperará a que la base de datos responda y ejecutará las migraciones SQL (`node dist/db/migrate.js`).
   - Compilará la imagen de Docker del `frontend` Next.js en modo standalone (inyectando `NEXT_PUBLIC_API_URL` en el proceso de compilación).
   - Generará certificados SSL gratuitos de Let's Encrypt automáticamente para `shopping.kasino21.com` y `api-shopping.kasino21.com`.

---

## 5. Creación del Usuario Administrador Inicial

Una vez que todo esté desplegado y en verde, puedes crear el usuario administrador inicial ejecutando un comando dentro del contenedor del backend.

1. En el panel de Coolify, ve al servicio `backend` de tu Compose stack.
2. Ve a la pestaña **Terminal** del contenedor `skating-api`.
3. Ejecuta el comando de Node directamente en el contenedor interactivo para crear tu usuario `ADMIN`:

```bash
node -e "
import('./dist/db/pool.js').then(async ({ pool }) => {
  import('./dist/lib/auth.js').then(async ({ hashPassword }) => {
    const hash = await hashPassword('TU_PASSWORD_SEGURO');
    await pool.query(
      \"INSERT INTO profiles (email, password_hash, role, email_confirmed) VALUES (\$1, \$2, 'ADMIN', TRUE) ON CONFLICT (email) DO NOTHING\",
      ['angellafraga@gmail.com', hash]
    );
    console.log('Usuario administrador creado correctamente');
    await pool.end();
  });
});
"
```

*(Reemplaza `TU_PASSWORD_SEGURO` por la contraseña que quieras usar para iniciar sesión)*.

¡Listo! Ya podrás ingresar a `https://shopping.kasino21.com/admin` utilizando el correo `angellafraga@gmail.com` y la contraseña establecida.
