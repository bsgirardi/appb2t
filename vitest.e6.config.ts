import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE6DatabaseUrl } from "./tests/e6/database";
process.env.DATABASE_URL = assertE6DatabaseUrl(
  process.env.E6_TEST_DATABASE_URL ?? "",
).toString();
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/e6/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
