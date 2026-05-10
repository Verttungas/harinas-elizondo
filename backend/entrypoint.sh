#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está definida. Abortando." >&2
  exit 1
fi

echo "Running database migrations..."
npx --no-install prisma migrate deploy

USER_COUNT=$(node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.usuario.count().then(n=>{console.log(n);return p.$disconnect();}).catch(()=>{console.log(0);process.exit(0);})')
if [ "$USER_COUNT" = "0" ]; then
  echo "Database empty — running seed..."
  npx --no-install prisma db seed
else
  echo "Database already seeded ($USER_COUNT users) — skipping seed."
fi

echo "Starting application..."
exec "$@"
