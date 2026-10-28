import { expect, it } from "vitest";
import { assertE4DatabaseUrl } from "../e4/database";
it("allows only the E4 disposable database before database imports", () => {
  expect(assertE4DatabaseUrl("postgresql://test:test@127.0.0.1:55434/b2t_e4_test").port).toBe("55434");
  for (const value of ["", "postgresql://u:p@localhost:55432/b2t_test", "postgresql://u:p@localhost:55433/b2t_e3_test", "postgresql://u:p@remote:55434/b2t_e4_test", "postgresql://u:p@localhost:55434/operacional", "http://localhost:55434/b2t_e4_test", "postgresql://u:p@localhost:55434/b2t_e4_test?host=remote"])
    expect(() => assertE4DatabaseUrl(value)).toThrow();
});
