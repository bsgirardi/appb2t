import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.config";

export default mergeConfig(sharedConfig, defineConfig({ test: {
  include: ["tests/integration/planning-*.test.ts", "tests/integration/production-planning.test.ts"],
  env: { E3_TEST_DATABASE: "1" },
} }));
