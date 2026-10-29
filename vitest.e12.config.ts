import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE12DatabaseUrl } from "./tests/e12/database";
process.env.DATABASE_URL = assertE12DatabaseUrl(process.env.E12_TEST_DATABASE_URL ?? "").toString();
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname, "src") } }, test: { include: ["tests/e12/*.test.ts"], fileParallelism: false, testTimeout: 20000, hookTimeout: 30000 } });
