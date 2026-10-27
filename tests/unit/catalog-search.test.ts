import { expect, it } from "vitest";
import { searchTerms, typoDistance } from "@/domain/products/catalog-search";

it("splits whitespace, deduplicates equivalent accents/case and preserves literal punctuation", () => {
  expect(searchTerms("  AZUL\tazul decoração decoracao  BR-001 %_ ")).toEqual([
    "AZUL",
    "decoração",
    "BR-001",
    "%_",
  ]);
  expect(searchTerms(" \n ")).toEqual([]);
  expect(searchTerms("a".repeat(101)).join("")).toHaveLength(100);
});
it("allows only conservative alphabetic typos and counts Unicode characters", () => {
  expect(typoDistance("azul")).toBe(1);
  expect(typoDistance("decoração")).toBe(2);
  expect(typoDistance("decorac\u0327a\u0303o")).toBe(2);
  for (const term of ["sol", "BR-002", "azul2", "%", "a_b", "🧡azul"])
    expect(typoDistance(term)).toBe(0);
});
