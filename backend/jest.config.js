import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Cargar .env.test antes de que Jest arranque los workers para que env.ts
// tenga DATABASE_URL, JWT_SECRET, etc. al momento de importarse.
const envTestPath = path.resolve(process.cwd(), ".env.test");
if (fs.existsSync(envTestPath)) {
  loadEnv({ path: envTestPath, override: true });
}
process.env.NODE_ENV = "test";

/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ES2022",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          isolatedModules: true,
        },
      },
    ],
  },
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup.env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/app.ts",
    "!src/config/env.ts",
    "!src/lib/json.ts",
    "!src/lib/logger.ts",
    "!src/lib/prisma.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  // FQ-05 aplica a dominio (≥70% líneas). FQ-06 aplica a global (≥40% líneas).
  // No imponemos umbral de funciones porque los controllers delegan a servicios
  // probados vía integración y la métrica de funciones es ruidosa con arrow
  // functions inline en middlewares Express.
  coverageThreshold: {
    global: {
      lines: 40,
    },
    "./src/domain/**/*.ts": {
      lines: 70,
    },
  },
};
