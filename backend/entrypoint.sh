#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está definida. Abortando." >&2
  exit 1
fi

echo "Running database migrations..."
npx --no-install prisma migrate deploy

USER_COUNT=$(node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();(async()=>{try{console.log(await p.usuario.count());}catch(e){console.error(e);process.exitCode=1;}finally{try{await p.$disconnect();}catch(e){console.error(e);process.exitCode=1;}}})();') || exit 1
if [ "$USER_COUNT" = "0" ]; then
  echo "Database empty — running seed..."
  npx --no-install prisma db seed
else
  echo "Database already seeded ($USER_COUNT users) — skipping seed."
fi

echo "Starting application..."
exec "$@"
