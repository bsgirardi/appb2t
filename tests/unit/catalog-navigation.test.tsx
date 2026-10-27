// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  catalogFilters,
  catalogPath,
  productBrowsePath,
} from "@/domain/products/catalog-navigation";
import {
  ActiveCatalogFilters,
  CollectionNavigation,
} from "@/components/products/store-collections";
import { ProductCatalog } from "@/components/products/product-catalog";
import { productDTO } from "../fixtures/product";
afterEach(cleanup);
it.each([
  { priceMin: "0", priceMax: "1" },
  { availability: "UNAVAILABLE" },
  { collection: "c1", priceMin: "999" },
])(
  "explains empty commercial results instead of claiming an unpublished catalog: %j",
  (commercial) => {
    render(
      <ProductCatalog
        products={[]}
        context={{
          collection: "",
          search: "",
          order: "nome",
          page: 1,
          ...commercial,
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Nenhum produto encontrado." }),
    ).toBeTruthy();
    expect(screen.queryByText("Nenhum produto publicado ainda.")).toBeNull();
    expect(screen.queryByText("Esta coleção está sendo preparada.")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Ver todos os produtos" })
        .getAttribute("href"),
    ).toBe("/#all-products");
  },
);
it("keeps the unpublished message for an unfiltered empty catalog", () => {
  render(<ProductCatalog products={[]} />);
  expect(
    screen.getByRole("heading", { name: "Nenhum produto publicado ainda." }),
  ).toBeTruthy();
});
const context = {
  collection: "c1",
  search: "vaso & decoração",
  order: "menor-preco",
  page: 3,
};
it("roundtrips catalog state through product URLs without accepting return destinations", () => {
  const url = new URL(
    productBrowsePath(productDTO, context),
    "https://example.com",
  );
  expect(catalogFilters(Object.fromEntries(url.searchParams))).toEqual(context);
  expect(
    catalogFilters({
      busca: ["a", "b"],
      pagina: "-5",
      ordem: "invalid",
      returnTo: "https://evil.example",
    }),
  ).toEqual({ collection: "", search: "", order: "nome", page: 1 });
  expect(catalogPath()).toBe("/");
});
it("retains browse context in every product card link", () => {
  render(<ProductCatalog products={[productDTO]} context={context} />);
  for (const link of screen.getAllByRole("link"))
    expect(link.getAttribute("href")).toBe(
      productBrowsePath(productDTO, context),
    );
});
it("removes just the chosen filter and resets pagination", () => {
  render(<ActiveCatalogFilters context={context} collectionName="Decoração" />);
  expect(
    screen
      .getByRole("link", { name: "Remover coleção Decoração" })
      .getAttribute("href"),
  ).toBe(catalogPath("", context.search, context.order));
  expect(
    screen
      .getByRole("link", { name: `Remover busca ${context.search}` })
      .getAttribute("href"),
  ).toBe(catalogPath("c1", "", context.order));
});
it("keeps search and ordering when leaving a collection", () => {
  render(<CollectionNavigation context={context} collections={[]} />);
  expect(
    screen
      .getByRole("link", { name: "Todos os produtos" })
      .getAttribute("href"),
  ).toBe(catalogPath("", context.search, context.order));
});
