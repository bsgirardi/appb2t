// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ProductPage from "@/app/portfolio/produto/[id]/[slug]/page";
import { productDTO } from "../fixtures/product";
import { productPath } from "@/domain/products/storefront";
import Page, { generateMetadata } from "@/app/page";
import { catalogPage } from "@/server/storefront";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("@/server/appearance", () => ({
  getPublicAppearance: async () => ({ ...defaultAppearance, logoUrl: null }),
}));
vi.mock("@/server/collections", () => ({
  listPublicCollections: async () => [
    {
      id: "old-id",
      name: "Corporativos",
      slug: "corporativos",
      description: "Presentes",
      imageUrl: null,
    },
  ],
}));
vi.mock("@/server/kits/queries", () => ({ listPublicKits: async () => [] }));
vi.mock("@/server/storefront", async (original) => ({
  ...(await original<typeof import("@/server/storefront")>()),
  publicProduct: async () => productDTO,
  relatedProducts: async () => [],
  catalogPage: vi.fn(async () => ({ products: [], total: 30, pages: 3 })),
  featuredCollections: async () => [],
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it.each(["corporativos", "old-id"])(
  "resolves %s and retains friendly collection context in pagination and filters",
  async (colecao) => {
    render(
      await Page({
        searchParams: Promise.resolve({
          colecao,
          pagina: "2",
          busca: "caneca",
          precoMin: "10",
        }),
      }),
    );
    expect(catalogPage).toHaveBeenCalledWith(
      "old-id",
      "caneca",
      "nome",
      2,
      expect.objectContaining({ collection: "corporativos", priceMin: "10" }),
    );
    expect(
      screen.getByRole("link", { name: "Próxima →" }).getAttribute("href"),
    ).toBe("/?colecao=corporativos&busca=caneca&pagina=3&precoMin=10");
    expect(
      document.querySelector('input[name="colecao"]')?.getAttribute("value"),
    ).toBe("corporativos");
  },
);
it("uses the friendly canonical for legacy IDs and keeps filtered pages noindex", async () => {
  const metadata = await generateMetadata({
    searchParams: Promise.resolve({
      colecao: "old-id",
      pagina: "2",
      busca: "caneca",
    }),
  });
  expect(JSON.stringify(metadata.alternates)).toContain(
    "?colecao=corporativos&pagina=2",
  );
  expect(metadata.robots).toEqual({ index: false, follow: true });
});
it("does not expose inactive or unknown collections", async () => {
  await expect(
    Page({ searchParams: Promise.resolve({ colecao: "inactive" }) }),
  ).rejects.toThrow();
  expect(catalogPage).not.toHaveBeenCalled();
});

vi.mock("@/components/products/product-experience", () => ({
  ProductExperience: () => null,
}));
it.each(["corporativos", "old-id"])(
  "retains collection %s when returning from a product",
  async (colecao) => {
    render(
      await ProductPage({
        params: Promise.resolve({
          id: productDTO.id,
          slug: productPath(productDTO).split("/").at(-1)!,
        }),
        searchParams: Promise.resolve({
          colecao,
          pagina: "2",
          busca: "caneca",
          precoMin: "10",
        }),
      }),
    );
    expect(
      screen
        .getByRole("link", { name: "← Voltar aos resultados" })
        .getAttribute("href"),
    ).toBe(
      "/?colecao=corporativos&busca=caneca&pagina=2&precoMin=10#all-products",
    );
  },
);
