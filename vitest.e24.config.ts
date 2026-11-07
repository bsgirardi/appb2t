import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE24DatabaseUrl } from "./tests/e24/database";
process.env.DATABASE_URL = assertE24DatabaseUrl(
  process.env.E24_TEST_DATABASE_URL ?? "",
).toString();
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/e24/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
