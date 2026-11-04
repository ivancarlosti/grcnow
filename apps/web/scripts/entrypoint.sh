#!/bin/sh
set -e

export NODE_ENV=production
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

echo "[web] starting Next.js on ${HOSTNAME}:${PORT} (API: ${API_INTERNAL_URL:-http://grc-api:3001})"
exec ./node_modules/.bin/next start -p "${PORT}" -H "${HOSTNAME}"
