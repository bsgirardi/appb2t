import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertPosDatabaseUrl } from "./tests/pos/database";
process.env.DATABASE_URL = assertPosDatabaseUrl(
  process.env.POS_TEST_DATABASE_URL ?? "",
).toString();
process.env.POS_REGRESSION = "1";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: [
      "tests/integration/sales.test.ts",
      "tests/integration/production-deliveries.test.ts",
      "tests/integration/production-flow.test.ts",
      "tests/integration/production-lifecycle.test.ts",
      "tests/integration/finance-settlements.test.ts",
      "tests/integration/profitability-queries.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
