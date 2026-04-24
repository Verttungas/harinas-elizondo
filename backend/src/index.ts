import { env } from "./config/env.js";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "server started");
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, "received shutdown signal");
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "error during HTTP server shutdown");
    }
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      logger.error({ err: disconnectErr }, "error disconnecting prisma");
    }
    process.exit(err ? 1 : 0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
