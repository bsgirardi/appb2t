import { expect, it } from "vitest";
import {
  seoSchema,
  resolveSeo,
  redirectDestination,
} from "@/domain/marketing/seo";
it("has functional defaults and never enables indexing private paths", () => {
  const seo = seoSchema.parse({});
  expect(resolveSeo(seo, "/", "B2T", "Descrição").index).toBe(true);
  for (const path of [
    "/login",
    "/dashboard",
    "/portfolio/checkout",
    "/portfolio/arte",
    "/portfolio/orcamento",
    "/api/health",
  ])
    expect(resolveSeo(seo, path, "B2T", "Descrição").index).toBe(false);
  expect(
    resolveSeo({ ...seo, indexPublic: false }, "/", "B2T", "Descrição").index,
  ).toBe(false);
});
it("allows only known public page overrides and safe local image paths", () => {
  expect(
    seoSchema.safeParse({ pages: { "/login": { title: "Aberto" } } }).success,
  ).toBe(false);
  expect(
    seoSchema.safeParse({
      pages: { "/catalogo": { title: "Fonte duplicada" } },
    }).success,
  ).toBe(false);
  for (const image of [
    "javascript:alert(1)",
    "//evil.test/a.png",
    "/api/users/a",
    "/brand/a.png?token=x",
  ])
    expect(seoSchema.safeParse({ image }).success).toBe(false);
});
it("keeps product and collection sharing images ahead of the site default", () => {
  const seo = seoSchema.parse({ image: "/brand/b2t-logo.png" });
  expect(
    resolveSeo(
      seo,
      "/portfolio/produto/p1/vaso",
      "Vaso",
      "Descrição",
      "/api/products/p1/image",
    ).image,
  ).toBe("/api/products/p1/image");
  expect(
    resolveSeo(
      seo,
      "/catalogo?colecao=presentes",
      "Presentes",
      "Descrição",
      "/api/collections/c1/image",
    ).image,
  ).toBe("/api/collections/c1/image");
  expect(
    resolveSeo(seo, "/", "B2T", "Descrição", "/brand/outra.png").image,
  ).toBe("/brand/b2t-logo.png");
});
it("rejects occupied/private sources, external targets, duplicates and cycles", () => {
  for (const redirects of [
    [{ from: "/catalogo", to: "/" }],
    [{ from: "/login", to: "/" }],
    [{ from: "/antigo", to: "https://evil.test" }],
    [{ from: "/antigo", to: "/dashboard" }],
    [
      { from: "/um", to: "/dois" },
      { from: "/dois", to: "/um" },
    ],
    [
      { from: "/antigo", to: "/" },
      { from: "/antigo", to: "/catalogo" },
    ],
  ])
    expect(seoSchema.safeParse({ redirects }).success).toBe(false);
  const seo = seoSchema.parse({
    redirects: [{ from: "/antigo", to: "/catalogo" }],
  });
  expect(
    redirectDestination(seo, "/antigo", {
      busca: ["a", "b"],
      utm_source: "instagram",
    }),
  ).toBe("/catalogo?busca=a&busca=b&utm_source=instagram");
});
