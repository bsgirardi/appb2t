import { expect, it } from "vitest";
import { assertTestDatabase } from "../integration/database-target";
it("permits only the explicit E3 disposable database and rejects operational or shared test destinations", () => {
  expect(() => assertTestDatabase("postgresql://fixture:fixture@localhost:55433/b2t_e3_test", true)).not.toThrow();
  for (const url of ["postgresql://fixture:fixture@localhost:55432/b2t_test", "postgresql://fixture:fixture@localhost:5432/b2t", "postgresql://fixture:fixture@external:55433/b2t_e3_test", "invalid"])
    expect(() => assertTestDatabase(url, true)).toThrow();
  expect(() => assertTestDatabase("postgresql://fixture:fixture@localhost:55433/b2t_e3_test", false)).toThrow();
});
