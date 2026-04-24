import "./lib/json.js";
import { env } from "./config/env.js";
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notfound.middleware.js";
import { apiRateLimiter } from "./middlewares/rateLimit.middleware.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", true);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  if (env.NODE_ENV !== "test") {
    app.use(pinoHttp({ logger }));
  }
  app.use(express.json({ limit: "1mb" }));

  if (env.NODE_ENV !== "test") {
    app.use("/api/v1", apiRateLimiter);
  }
  app.use("/api/v1", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export const app = createApp();
