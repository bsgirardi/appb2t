import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";
export default mergeConfig(base, defineConfig({ test: {
  include: ["tests/integration/planning-*.test.ts", "tests/integration/production-planning.test.ts"],
  env: { E3_TEST_DATABASE: "1" },
} }));
