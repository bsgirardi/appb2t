import { expect, it } from "vitest";
import {
  catalogPath,
  productBrowsePath,
  legacyCatalogDestination,
} from "@/domain/products/catalog-navigation";

it("separates catalog URLs from institutional home and retains product query", () => {
  expect(catalogPath()).toBe("/catalogo");
  const context = {
    collection: "colecao",
    search: "vaso & azul",
    order: "recentes",
    page: 2,
  };
  const url = new URL(
    productBrowsePath({ id: "p1", name: "Vaso" }, context),
    "https://b2t.test",
  );
  expect(url.pathname).toContain("/portfolio/produto/p1/");
  expect(url.searchParams.get("busca")).toBe(context.search);
  expect(url.searchParams.get("pagina")).toBe("2");
});
it("redirects legacy root filters preserving repeated query values and UTMs", () => {
  expect(legacyCatalogDestination({ utm_source: "instagram" })).toBeNull();
  expect(
    legacyCatalogDestination({
      busca: "",
      precoMin: ["1", "2"],
      utm_source: "instagram",
    }),
  ).toBe("/catalogo?busca=&precoMin=1&precoMin=2&utm_source=instagram");
});
