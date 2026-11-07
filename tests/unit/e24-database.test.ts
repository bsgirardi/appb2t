import { expect, it } from "vitest";
import { assertE24DatabaseUrl } from "../e24/database";
it("refuses operational/shared databases, remote hosts and connection overrides before test mutations", () => {
  for (const url of [
    "postgresql://u:p@127.0.0.1:55432/b2t_test",
    "postgresql://u:p@127.0.0.1:55439/b2t_e32_test",
    "postgresql://u:p@remote:55441/b2t_e24_test",
    "postgresql://u:p@127.0.0.1:55441/b2t_e24_test?schema=public",
    "postgresql://u:p@127.0.0.1:55441/b2t_e24_test#override",
  ])
    expect(() => assertE24DatabaseUrl(url)).toThrow();
  expect(
    assertE24DatabaseUrl("postgresql://u:p@127.0.0.1:55441/b2t_e24_test")
      .pathname,
  ).toBe("/b2t_e24_test");
});
