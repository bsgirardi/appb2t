import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE22DatabaseUrl } from "./tests/e22/database";
process.env.DATABASE_URL = assertE22DatabaseUrl(
  process.env.E22_TEST_DATABASE_URL ?? "",
).toString();
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/e22/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
