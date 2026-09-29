import { expect, it } from "vitest";
import {
  effectiveQuoteStatus,
  assertSaleTransition,
} from "@/domain/commerce/states";
it("expires quotes only after inclusive validity and preserves history", () => {
  expect(effectiveQuoteStatus("ENVIADO", "2026-09-29", "2026-09-29")).toBe(
    "ENVIADO",
  );
  expect(effectiveQuoteStatus("APROVADO", "2026-09-29", "2026-09-30")).toBe(
    "EXPIRADO",
  );
  expect(effectiveQuoteStatus("CONVERTIDO", "2026-09-29", "2026-09-30")).toBe(
    "CONVERTIDO",
  );
});
it("allows operational sequence but rejects jumps and canceling delivered sales", () => {
  expect(() => assertSaleTransition("CONFIRMADA", "EM_PRODUCAO")).not.toThrow();
  expect(() => assertSaleTransition("CONFIRMADA", "ENTREGUE")).toThrow();
  expect(() => assertSaleTransition("PRONTA", "CANCELADA")).not.toThrow();
  expect(() => assertSaleTransition("ENTREGUE", "CANCELADA")).toThrow();
});
