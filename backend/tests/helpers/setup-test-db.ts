// Prepara el esquema `testing` en PostgreSQL para la suite de integración.
//
// Estrategia:
//   1. Eliminamos y recreamos el esquema `testing` (idempotente).
//   2. Ejecutamos `prisma migrate deploy` con DATABASE_URL apuntando al
//      esquema `testing`. Esto aplica todas las migraciones (incluyendo
//      los triggers y checks de negocio) en ese esquema.
//
// Uso:
//   docker compose exec backend npm run test:setup-db

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(process.cwd(), ".env.test"), override: true });

function parseSchema(url: string): string {
  const parsed = new URL(url);
  return parsed.searchParams.get("schema") ?? "public";
}

function urlWithSchema(url: string, schema: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("schema", schema);
  return parsed.toString();
}

function validateSchemaName(schema: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
    throw new Error(
      `Nombre de esquema inválido: "${schema}". Solo se permiten letras, números y guiones bajos.`,
    );
  }
}

async function resetSchema(schema: string): Promise<void> {
  validateSchemaName(schema);
  const adminUrl = urlWithSchema(process.env.DATABASE_URL!, "public");
  const client = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await client.$disconnect();
  }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida (revisa backend/.env.test)");
  }
  const schema = parseSchema(url);
  if (schema === "public") {
    throw new Error(
      "La DATABASE_URL de pruebas debe usar schema=testing, no 'public'",
    );
  }

  console.log(`[test-db] reset del esquema "${schema}"`);
  await resetSchema(schema);

  console.log(`[test-db] prisma migrate deploy al esquema "${schema}"`);
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log(`[test-db] esquema "${schema}" listo`);
}

main().catch((err) => {
  console.error("[test-db] ERROR:", err);
  process.exit(1);
});
