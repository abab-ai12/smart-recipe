#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/var/www/smart-recipe}
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

cd "$BACKEND_DIR"
npm ci --omit=dev
npm run db:init
npm run admin:create
sudo systemctl restart smart-recipe-backend

cd "$FRONTEND_DIR"
npm ci
npm run build

sudo nginx -t
sudo systemctl reload nginx

echo "Smart Recipe deployment finished."
