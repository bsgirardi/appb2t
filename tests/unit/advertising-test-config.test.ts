import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
import manifest from "../../package.json";
it("runs E6 on its own database and migration gate in CI",()=>{
  const yaml=readFileSync(".github/workflows/ci.yml","utf8");
  expect(yaml).toContain("suite: e6");expect(yaml).toContain("b2t_e6_test");expect(yaml).toContain("55436");expect(yaml).toContain("E6_TEST_DATABASE_URL");expect(yaml).toContain("npm run test:e6:migration");
  expect(manifest.scripts["test:e6"]).toContain("vitest.e6.config.ts");
  const config=readFileSync("vitest.config.ts","utf8");expect(config).not.toContain('include: ["tests/e6');
});
