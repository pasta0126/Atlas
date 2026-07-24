#!/usr/bin/env bash
# Despliega/actualiza Atlas en este host (RPi + Traefik).
# Ver specs/02-design.md §9 y specs/03-tasks.md Fase 10.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "Falta .env.production (AUTH_USER, AUTH_PASSWORD_HASH, SESSION_SECRET, GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL)." >&2
  exit 1
fi

echo "==> git pull --rebase (reaplica commits automáticos de contenido)"
git pull --rebase

echo "==> docker compose build"
docker compose build

echo "==> docker compose up -d"
docker compose up -d

echo "==> Estado del contenedor"
docker compose ps

echo "==> Últimas líneas de log"
docker compose logs --tail=30 atlas
