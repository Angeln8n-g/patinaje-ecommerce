# Stage 1: Build the TypeScript backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files, database initialization schema, and SQL migration files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/schema.sql ./dist/db/schema.sql
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Expose API port
EXPOSE 4000
ENV PORT=4000

# Automatically initialize database (if empty), run migrations, then start Express server
CMD ["sh", "-c", "node dist/db/init.js && node dist/db/migrate.js && node dist/index.js"]
