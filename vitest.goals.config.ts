import { defineConfig } from "vitest/config";
import { sharedConfig } from "./vitest.config";
import { assertGoalsDatabase } from "./tests/goals/database";
process.env.DATABASE_URL = assertGoalsDatabase(
  process.env.GOALS_TEST_DATABASE_URL ?? "",
);
process.env.GOALS_REGRESSION = "1";
export default defineConfig({
  ...sharedConfig,
  test: { ...sharedConfig.test, include: ["tests/goals/**/*.test.ts"] },
});
