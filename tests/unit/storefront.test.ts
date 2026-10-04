import { expect, it } from "vitest";
import {
  productPath,
  safeJsonLd,
  whatsappLink,
} from "@/domain/products/storefront";
it("keeps product identity stable while producing readable paths", () => {
  expect(productPath({ id: "abc", name: "Vaso — edição verão" })).toBe(
    "/portfolio/produto/abc/vaso-edicao-verao",
  );
});
it("encodes the full customer message and rejects missing contact", () => {
  const link = whatsappLink("(11) 99999-9999", "Peça azul & branca?");
  expect(new URL(link!).searchParams.get("text")).toBe("Peça azul & branca?");
  expect(new URL(link!).pathname).toBe("/5511999999999");
  expect(whatsappLink("", "Olá")).toBeNull();
});
it("prevents product content from closing the structured data script", () => {
  const value = { description: '</script><script>alert("x")</script>' };
  expect(safeJsonLd(value)).not.toContain("<");
  expect(JSON.parse(safeJsonLd(value))).toEqual(value);
});
