#!/bin/sh
set -e

echo "[api] waiting for database…"
ATTEMPTS=0
until node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT 1\`.then(() => process.exit(0)).catch(() => process.exit(1));
" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 40 ]; then
    echo "[api] database unreachable after 40 attempts" >&2
    exit 1
  fi
  sleep 2
done

echo "[api] applying migrations…"
node ./node_modules/prisma/build/index.js migrate deploy || npx prisma migrate deploy

if [ "${SEED_DEMO:-true}" = "true" ]; then
  echo "[api] seeding (idempotent)…"
  node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.tenant.count().then((count) => process.exit(count > 0 ? 0 : 1)).catch(() => process.exit(1));
" && echo "[api] data already present, skipping seed" || npx tsx prisma/seed.ts || true
fi

echo "[api] starting…"
exec node dist/main.js
