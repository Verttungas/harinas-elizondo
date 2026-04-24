import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    codigo: "RATE_LIMIT_EXCEEDED",
    mensaje: "Demasiadas peticiones. Intente de nuevo en unos momentos.",
  },
});
