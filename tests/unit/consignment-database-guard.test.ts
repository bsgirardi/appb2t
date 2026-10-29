import { expect, it } from "vitest";
import { assertE5DatabaseUrl } from "../e5/database";
it.each(["localhost", "127.0.0.1"])(
  "accepts the exclusive E5 database at %s",
  (host) => {
    expect(
      assertE5DatabaseUrl(`postgresql://test:test@${host}:55435/b2t_e5_test`)
        .port,
    ).toBe("55435");
  },
);
it.each([
  "",
  "postgresql://test:test@remote:55435/b2t_e5_test",
  "postgresql://localhost:55432/b2t_e5_test",
  "postgresql://localhost:55433/b2t_e5_test",
  "postgresql://localhost:55434/b2t_e5_test",
  "postgresql://localhost:55435/operational",
  "postgresql://localhost:55435/b2t_e5_test?schema=public",
  "postgresql://localhost:55435/b2t_e5_test#x",
  "https://localhost:55435/b2t_e5_test",
])("rejects unsafe database destination", (raw) => {
  expect(() => assertE5DatabaseUrl(raw)).toThrow();
});
