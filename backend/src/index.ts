import "./lib/json.js";
import { env } from "./config/env.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notfound.middleware.js";

const app = express();

app.set("trust proxy", true);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

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
