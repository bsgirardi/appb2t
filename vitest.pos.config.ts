import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertPosDatabaseUrl } from "./tests/pos/database";
process.env.DATABASE_URL = assertPosDatabaseUrl(
  process.env.POS_TEST_DATABASE_URL ?? "",
).toString();
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/pos/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
