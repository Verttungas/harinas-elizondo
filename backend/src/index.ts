import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/v1", healthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Recurso no encontrado" });
});

const server = app.listen(env.PORT, () => {
  console.log(`[backend] listening on port ${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal: string): void => {
  console.log(`[backend] received ${signal}, shutting down gracefully`);
  server.close((err) => {
    if (err) {
      console.error("[backend] error during shutdown:", err);
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
