import "dotenv/config";
import { z } from "zod";

const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  BCRYPT_COST: z.coerce.number().int().min(10).default(10),
  LOG_LEVEL: logLevelSchema.default("info"),
  SMTP_HOST: z.string().min(1).default("mailhog"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().email().default("certificados@fhesa.mx"),
  SMTP_FROM_NAME: z.string().min(1).default("Certificados FHESA"),
  PDF_STORAGE_PATH: z.string().min(1).default("/app/certificados-pdf"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  WAREHOUSE_EMAIL: z.string().email().default("almacen@fhesa.mx"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
