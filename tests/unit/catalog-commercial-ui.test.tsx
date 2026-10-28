// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CatalogFilterForm } from "@/components/products/catalog-filter-form";
import {
  ActiveCatalogFilters,
  CollectionNavigation,
} from "@/components/products/store-collections";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { defaultAppearance } from "@/domain/appearance/validation";
afterEach(cleanup);
const context = {
  collection: "c",
  search: "vaso",
  order: "nome",
  page: 2,
  priceMin: "0",
  priceMax: "20,50",
  availability: "MADE_TO_ORDER",
};
it("renders a combined GET form without carrying pagination", () => {
  render(
    <CatalogFilterForm
      context={context}
      collections={[{ id: "c", name: "Presentes" }]}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Filtrar produtos" });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const form = screen.getByRole("form", {
    name: "Filtrar produtos",
  }) as HTMLFormElement;
  const data = new FormData(form);
  expect(form.method).toBe("get");
  expect(form.getAttribute("action")).toBe("/");
  expect(data.get("precoMin")).toBe("0");
  expect(data.get("precoMax")).toBe("20,50");
  expect(data.get("colecao")).toBe("c");
  expect(data.get("disponibilidade")).toBe("MADE_TO_ORDER");
  expect(data.has("pagina")).toBe(false);
  expect(
    screen.getByText(/Produtos sob consulta não entram na faixa/),
  ).toBeTruthy();
});
it("preserves invalid input and explains the reversed interval", () => {
  render(
    <CatalogFilterForm
      context={{ ...context, priceMin: "21", priceMax: "20" }}
      collections={[]}
    />,
  );
  expect(
    (screen.getByLabelText("Preço mínimo (R$)") as HTMLInputElement).value,
  ).toBe("21");
  expect(
    screen
      .getByRole("button", { name: "Filtrar produtos" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
  expect(screen.getByRole("alert").textContent).toContain("maior ou igual");
});
it("removes one marker without losing the other criteria", () => {
  render(<ActiveCatalogFilters context={context} collectionName="Presentes" />);
  const url = new URL(
    screen
      .getByRole("link", { name: "Remover preço mínimo" })
      .getAttribute("href")!,
    "https://example.test",
  );
  expect(url.searchParams.has("precoMin")).toBe(false);
  expect(url.searchParams.get("precoMax")).toBe("20,50");
  expect(url.searchParams.get("disponibilidade")).toBe("MADE_TO_ORDER");
  expect(url.searchParams.has("pagina")).toBe(false);
});
it("keeps commercial filters in collection navigation and header search", () => {
  const { unmount } = render(
    <CollectionNavigation context={context} collections={[]} />,
  );
  expect(
    screen
      .getByRole("link", { name: "Todos os produtos" })
      .getAttribute("href"),
  ).toContain("precoMin=0");
  unmount();
  render(
    <StorefrontShell
      identity={{ ...defaultAppearance, logoUrl: null }}
      search="vaso"
      commercial={context}
    >
      <p>Catálogo</p>
    </StorefrontShell>,
  );
  const theme = screen.getByRole("button", { name: /Tema atual:/ });
  expect(theme.textContent).toBe("");
  expect(theme.getAttribute("title")).toContain("Alterar para");
  const form = screen.getByRole("search") as HTMLFormElement;
  expect(new FormData(form).get("precoMax")).toBe("20,50");
});
