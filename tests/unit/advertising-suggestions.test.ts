import { expect, it } from "vitest";
import { suggestAd } from "@/domain/advertising/suggestions";
import { makeAdSource } from "@/domain/advertising/source";
const s = makeAdSource({
  id: "p",
  version: 1,
  name: "Peça azul",
  sku: "P1",
  active: true,
  shortDescription: "Presente",
  description: "Real",
  specifications: "12,5 cm",
  colors: ["Azul"],
  sizes: [],
  availability: "MADE_TO_ORDER",
  leadTimeDays: 5,
  minimumQuantity: 2,
  personalizable: true,
  images: [],
});
it("creates distinct factual models without prices or delivery promises", () => {
  const a = suggestAd(s, "INSTAGRAM"),
    b = suggestAd(s, "WHATSAPP");
  expect(a.body).not.toBe(b.body);
  for (const item of [a, b]) {
    expect(item.body).toContain("12,5 cm");
    expect(item.body).toContain("produção");
    expect(item.body).toContain("2");
    expect(item.body).not.toMatch(/R\$|localhost|pronta entrega/i);
  }
  expect(
    suggestAd(
      {
        ...s,
        availability: "UNAVAILABLE",
        leadTimeDays: null,
        minimumQuantity: 1,
        colors: [],
        sizes: [],
        specifications: "",
        personalizable: false,
      },
      "WHATSAPP",
    ).body,
  ).toContain("Indisponível");
});
it("omits complete blocks with a warning instead of splitting Unicode or measurements", () => {
  const value = suggestAd(
    {
      ...s,
      shortDescription: "",
      description: "🧡".repeat(2500),
      specifications: "12,5 cm",
    },
    "INSTAGRAM",
  );
  expect(value.body.length).toBeLessThanOrEqual(5000);
  expect(value.warnings.length).toBeGreaterThan(0);
  expect(value.body).toContain("12,5 cm");
  expect(value.body).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});
it.each(["INSTAGRAM", "WHATSAPP"] as const)(
  "preserves unavailable status and ordering conditions with long copy for %s",
  (channel) => {
    const result = suggestAd(
      {
        ...s,
        shortDescription: "",
        description: "a".repeat(4900),
        availability: "UNAVAILABLE",
      },
      channel,
    );
    expect(result.body).toContain("Indisponível para pedidos");
    expect(result.body).toContain("Quantidade mínima: 2");
    expect(result.body).toContain("Prazo de produção: 5 dias");
    expect(result.warnings.join(" ")).toMatch(/indisponível/i);
  },
);
