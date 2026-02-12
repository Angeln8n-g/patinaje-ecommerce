#!/bin/bash
# ============================================================
# Skating Store API - Script de despliegue para VPS
# Ejecutar en el servidor: bash deploy.sh
# ============================================================

set -e

echo "🛹 Skating Store API - Despliegue"
echo "=================================="

# 1. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

# 2. Verificar .env
if [ ! -f .env ]; then
  echo ""
  echo "⚠️  No se encontró .env — copiando desde .env.example"
  cp .env.example .env
  echo "📝 IMPORTANTE: Edita .env con tus valores reales:"
  echo "   nano .env"
  echo ""
  echo "   Necesitas configurar:"
  echo "   - DATABASE_URL (usuario y contraseña de PostgreSQL)"
  echo "   - JWT_SECRET (genera con: openssl rand -hex 64)"
  echo "   - CORS_ORIGIN (URL de tu frontend)"
  echo ""
  read -p "¿Ya editaste .env? (s/n): " edited
  if [ "$edited" != "s" ]; then
    echo "Edita .env y vuelve a ejecutar este script."
    exit 1
  fi
fi

# 3. Inicializar base de datos
echo ""
echo "🗄️  Inicializando base de datos..."
npx tsx src/db/init.ts

# 4. Compilar TypeScript
echo ""
echo "🔨 Compilando TypeScript..."
npm run build

# 5. Iniciar con PM2
echo ""
echo "🚀 Iniciando con PM2..."
pm2 delete skating-api 2>/dev/null || true
pm2 start dist/index.js --name skating-api
pm2 save

echo ""
echo "✅ API desplegada correctamente"
echo "   Verifica con: curl http://localhost:4000/api/health"
echo ""
echo "📋 Pasos restantes:"
echo "   1. Configurar Nginx (ver DEPLOY.md paso 9)"
echo "   2. Configurar SSL con Certbot (ver DEPLOY.md paso 10)"
echo "   3. Crear usuario admin (ver DEPLOY.md paso 11)"
