// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import config from "../../next.config";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { defaultAppearance } from "@/domain/appearance/validation";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { ProductCatalog } from "@/components/products/product-catalog";
import { productDTO } from "../fixtures/product";

afterEach(cleanup);
it("redirects both previous catalog entry points without redirecting product or API paths", async () => {
  const redirects = await config.redirects!();
  expect(redirects).toEqual([
    { source: "/portfolio", destination: "/", permanent: true },
    { source: "/catalogo", destination: "/", permanent: true },
  ]);
});
it("searches from the public root and retains the collection and current term", () => {
  render(
    <StorefrontShell
      identity={{
        ...defaultAppearance,
        logoUrl: null,
        storefront: defaultStorefront,
      }}
      search="vaso"
      collection="c1"
    >
      <p>Catálogo</p>
    </StorefrontShell>,
  );
  const form = screen.getByRole("search") as HTMLFormElement;
  expect(form.getAttribute("action")).toBe("/");
  expect(new FormData(form).get("colecao")).toBe("c1");
  expect(new FormData(form).get("busca")).toBe("vaso");
  expect(
    screen.getByRole("link", { name: /início/ }).getAttribute("href"),
  ).toBe("/");
  expect(screen.queryByRole("link", { name: /calculadora/i })).toBeNull();
  expect(
    screen.getByRole("link", { name: "Área da equipe" }).getAttribute("href"),
  ).toBe("/login");
});
it("makes the catalog photograph a product link without nested gallery buttons", () => {
  render(<ProductCatalog products={[productDTO]} />);
  const photoLink = screen.getByRole("link", {
    name: `Ver fotos e detalhes de ${productDTO.name}`,
  });
  expect(photoLink.getAttribute("href")).toContain(
    `/portfolio/produto/${productDTO.id}/`,
  );
  expect(photoLink.querySelector("button")).toBeNull();
});

it("scopes saved site colors to the storefront without copying admin colors", () => {
  const identity = {
    ...defaultAppearance,
    siteLightPrimary: "#224455",
    lightPrimary: "#663399",
    logoUrl: null,
  };
  const { container } = render(
    <StorefrontShell identity={identity}>
      <p>Catálogo</p>
    </StorefrontShell>,
  );
  const shell = container.querySelector(".storefront") as HTMLElement;
  expect(shell.style.getPropertyValue("--site-light-primary")).toBe("#224455");
  expect(shell.style.getPropertyValue("--light-primary")).toBe("");
});
