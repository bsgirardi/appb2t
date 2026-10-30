import { expect, it } from "vitest";
import { assertE12DatabaseUrl } from "../e12/database";
it("accepts only the dedicated E12 database and refuses every other suite and operation", () => {
  expect(
    assertE12DatabaseUrl("postgresql://test:test@127.0.0.1:55437/b2t_e12_test")
      .pathname,
  ).toBe("/b2t_e12_test");
  for (const raw of [
    "",
    "postgresql://test:test@127.0.0.1:5432/b2t",
    "postgresql://test:test@127.0.0.1:55432/b2t_test",
    ...[3, 4, 5, 6].map(
      (n) => `postgresql://test:test@127.0.0.1:5543${n}/b2t_e${n}_test`,
    ),
    "postgresql://test:test@remote:55437/b2t_e12_test",
    "postgresql://test:test@127.0.0.1:55437/b2t_e12_test?schema=public",
  ])
    expect(() => assertE12DatabaseUrl(raw)).toThrow();
});
