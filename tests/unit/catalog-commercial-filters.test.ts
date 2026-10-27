import { expect, it } from "vitest";
import {
  catalogCommercialErrors,
  parseCatalogCommercialFilters,
} from "@/domain/products/catalog-commercial-filters";
import {
  catalogFilters,
  catalogContextPath,
  productBrowsePath,
  productEditPath,
} from "@/domain/products/catalog-navigation";
import { inquiryItemSchema } from "@/domain/products/inquiry";
it("accepts surrounding spaces consistently for both interval bounds", () => {
  expect(
    catalogCommercialErrors({ priceMin: " 10 ", priceMax: " 20,50 " }),
  ).toEqual({});
  expect(
    parseCatalogCommercialFilters({ priceMin: " 10 ", priceMax: " 20,50 " }),
  ).toEqual({ priceMin: "10", priceMax: "20.50" });
});
it.each(["0", "20", "20,50", "20.50", "9999999999999999.99"])(
  "accepts an exact inclusive price %s",
  (priceMin) => {
    expect(catalogCommercialErrors({ priceMin })).toEqual({});
    expect(parseCatalogCommercialFilters({ priceMin }).priceMin).toBe(
      priceMin.replace(",", "."),
    );
  },
);
it.each([
  "-1",
  "1.001",
  "1,000.00",
  "Infinity",
  "abc",
  "10000000000000000",
  "1e2",
])("rejects invalid price %s", (priceMin) => {
  expect(catalogCommercialErrors({ priceMin }).priceMin).toBeTruthy();
  expect(() => parseCatalogCommercialFilters({ priceMin })).toThrow();
});
it("rejects reversed intervals exactly, including beyond Number precision", () => {
  expect(
    catalogCommercialErrors({
      priceMin: "9999999999999999.99",
      priceMax: "9999999999999999.98",
    }).priceMax,
  ).toBeTruthy();
  expect(
    catalogCommercialErrors({ availability: "inventado" }).availability,
  ).toBeTruthy();
  expect(
    parseCatalogCommercialFilters({
      priceMin: "",
      priceMax: "",
      availability: "",
    }),
  ).toEqual({});
});
it("does not silently drop malformed or oversized URL filters", () => {
  expect(
    catalogCommercialErrors(catalogFilters({ precoMin: ["10", "20"] }))
      .priceMin,
  ).toBeTruthy();
  expect(
    catalogCommercialErrors(
      catalogFilters({ precoMin: " ".repeat(101) + "10" }),
    ).priceMin,
  ).toBeTruthy();
});
it("preserves combined criteria in product, edit, pagination and old draft contexts", () => {
  const f = catalogFilters({
    busca: "vaso",
    colecao: "c",
    precoMin: "0",
    precoMax: "20,50",
    disponibilidade: "MADE_TO_ORDER",
    pagina: "2",
  });
  const url = new URL(
    productBrowsePath({ id: "p", name: "Peça" }, f),
    "https://example.test",
  );
  expect(url.searchParams.get("precoMin")).toBe("0");
  expect(url.searchParams.get("disponibilidade")).toBe("MADE_TO_ORDER");
  expect(catalogFilters(Object.fromEntries(url.searchParams))).toEqual(f);
  expect(
    new URL(
      catalogContextPath(f, { page: 3 }),
      "https://example.test",
    ).searchParams.get("pagina"),
  ).toBe("3");
  const onlyPrices = {
    collection: "",
    search: "",
    order: "nome",
    page: 1,
    priceMin: "10",
  };
  const edit = new URL(
    productEditPath({ id: "p", name: "Peça" }, onlyPrices, "line"),
    "https://example.test",
  );
  expect(edit.searchParams.get("editar")).toBe("line");
  expect(edit.searchParams.get("precoMin")).toBe("10");
  expect(
    inquiryItemSchema.parse({ productId: "p", quantity: 1, catalogContext: f })
      .catalogContext,
  ).toEqual(f);
  expect(
    inquiryItemSchema.parse({
      productId: "p",
      quantity: 1,
      catalogContext: { collection: "", search: "", order: "nome", page: 1 },
    }).quantity,
  ).toBe(1);
});
