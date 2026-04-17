import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: ("query" | "error" | "warn")[] =
  env.LOG_LEVEL === "debug" ? ["query", "error", "warn"] : ["error", "warn"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
