# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
# git es imprescindible: lib/git.ts invoca el binario real (simple-git) para
# comitear los cambios sobre CONTENT_DIR.
RUN apk add --no-cache git

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# El contenedor corre como uid 1001 (ver docker-compose.yml), pero COPY deja
# los ficheros con dueño root: sin esto, Next no puede escribir en
# .next/cache y la optimización de imágenes (favicon, logo) falla en runtime.
RUN mkdir -p .next/cache && chown -R 1001:1001 .next

EXPOSE 3000
CMD ["node", "server.js"]
