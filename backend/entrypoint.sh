#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está definida. Abortando." >&2
  exit 1
fi

echo "Running database migrations..."
npx --no-install prisma migrate deploy

echo "Starting application..."
exec "$@"
