import { defineConfig } from "vitest/config";
import path from "node:path";

export const sharedConfig = defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { fileParallelism: false, testTimeout: 20000, hookTimeout: 30000 },
});

export default defineConfig({
  ...sharedConfig,
  test: {
    ...sharedConfig.test,
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    // This suite has a strict exclusive-database guard; run it through test:e3.
    exclude: ["tests/integration/planning-preview.test.ts"],
  },
});
