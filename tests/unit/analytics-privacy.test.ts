import { expect, it } from "vitest";
import { analyticsLocation, analyticsPage } from "@/domain/marketing/tracking";
it("drops free text, hash, private paths and unapproved UTMs", () => {
  expect(
    analyticsLocation(
      "https://b2t.test/catalogo?busca=joao@email.com&telefone=123&utm_source=instagram&utm_campaign=cliente-joao#secret",
    ),
  ).toBe("https://b2t.test/catalogo?utm_source=instagram");
  for (const path of [
    "/login",
    "/dashboard",
    "/portfolio/checkout",
    "/portfolio/compra",
    "/portfolio/orcamento",
    "/portfolio/arte",
    "/api/users",
  ])
    expect(analyticsPage(path)).toBeNull();
});
it("reports product route templates without personal or arbitrary identifiers", () => {
  expect(analyticsPage("/portfolio/produto/p1/nome-do-cliente")).toBe(
    "/portfolio/produto/item",
  );
  expect(
    analyticsLocation(
      "https://b2t.test/portfolio/produto/p1/nome-do-cliente?email=x",
    ),
  ).toBe("https://b2t.test/portfolio/produto/item");
});
