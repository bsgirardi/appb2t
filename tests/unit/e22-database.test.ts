import { expect, it } from "vitest";
import { assertE22DatabaseUrl } from "../e22/database";
const target = "postgresql://test:synthetic@127.0.0.1:55438/b2t_e22_test";
it("allows only the exclusive E22 database without redirecting parameters", () => {
  expect(assertE22DatabaseUrl(target).port).toBe("55438");
  expect(
    assertE22DatabaseUrl(target.replace("127.0.0.1", "localhost")).pathname,
  ).toBe("/b2t_e22_test");
  for (const invalid of [
    "",
    target.replace("55438", "55432"),
    target.replace("b2t_e22_test", "appb2t"),
    target.replace("127.0.0.1", "example.com"),
    target + "?host=example.com",
    target + "#x",
    target.replace("postgresql:", "https:"),
  ])
    expect(() => assertE22DatabaseUrl(invalid)).toThrow();
});
