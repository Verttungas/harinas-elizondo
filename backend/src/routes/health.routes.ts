import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    database = "error";
    logger.error({ err }, "database health check failed");
  }

  const status = database === "ok" ? "ok" : "degraded";
  const httpCode = database === "ok" ? 200 : 503;

  res.status(httpCode).json({
    status,
    timestamp: new Date().toISOString(),
    service: "backend",
    database,
  });
});
