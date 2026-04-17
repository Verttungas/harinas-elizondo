import pino, { type LoggerOptions } from "pino";
import { env } from "../config/env.js";

const isDevelopment = env.NODE_ENV === "development";

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: "backend" },
};

export const logger = isDevelopment
  ? pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    })
  : pino(options);
