import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.config";
import { assertE32Database } from "./tests/e32/database";
assertE32Database(process.env.DATABASE_URL, process.env.E32_TEST_DATABASE);
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      include: ["tests/e32/**/*.test.ts"],
      setupFiles: ["./tests/e32/guard.ts"],
    },
  }),
);
