import { expect, it } from "vitest";
import { assertE6DatabaseUrl } from "../e6/database";
it("accepts only the exclusive E6 database", () => {
  expect(
    assertE6DatabaseUrl("postgresql://test:test@127.0.0.1:55436/b2t_e6_test")
      .pathname,
  ).toBe("/b2t_e6_test");
  for (const url of [
    "",
    "postgresql://x:x@127.0.0.1:5432/b2t_e6_test",
    "postgresql://x:x@remote:55436/b2t_e6_test",
    "postgresql://x:x@localhost:55435/b2t_e5_test",
    "postgresql://x:x@localhost:55436/live",
    "postgresql://x:x@localhost:55436/b2t_e6_test?schema=public",
    "postgresql://x:x@localhost:55436/b2t_e6_test#x",
  ])
    expect(() => assertE6DatabaseUrl(url)).toThrow();
});
