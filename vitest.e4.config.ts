import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertE4DatabaseUrl } from "./tests/e4/database";
const url=assertE4DatabaseUrl(process.env.E4_TEST_DATABASE_URL??"");
process.env.DATABASE_URL=url.toString();
export default defineConfig({resolve:{alias:{"@":path.resolve(__dirname,"src")}},test:{include:["tests/e4/*.test.ts"],fileParallelism:false,testTimeout:20000,hookTimeout:30000}});
