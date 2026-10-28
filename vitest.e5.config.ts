import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE5DatabaseUrl } from "./tests/e5/database";
process.env.DATABASE_URL = assertE5DatabaseUrl(process.env.E5_TEST_DATABASE_URL ?? "").toString();
export default defineConfig({
  resolve:{alias:{"@":path.resolve(__dirname,"src")}},
  test:{include:["tests/e5/*.test.ts"],fileParallelism:false,testTimeout:20000,hookTimeout:30000},
});
