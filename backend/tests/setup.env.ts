import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";

const envTestPath = path.resolve(process.cwd(), ".env.test");
if (fs.existsSync(envTestPath)) {
  loadEnv({ path: envTestPath, override: true });
}

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

const pdfDir = process.env.PDF_STORAGE_PATH ?? "/tmp/fhesa-test-pdf";
try {
  fs.mkdirSync(pdfDir, { recursive: true });
} catch {
  // ignore
}
