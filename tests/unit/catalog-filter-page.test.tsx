// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Page, { generateMetadata } from "@/app/page";
import { catalogPage } from "@/server/storefront";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("@/server/appearance", () => ({
  getPublicAppearance: async () => ({ ...defaultAppearance, logoUrl: null }),
}));
vi.mock("@/server/collections", () => ({
  listPublicCollections: async () => [],
}));
vi.mock("@/server/kits/queries", () => ({ listPublicKits: async () => [] }));
vi.mock("@/server/storefront", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/storefront")>()),
  catalogPage: vi.fn(async () => ({ products: [], total: 0, pages: 0 })),
  featuredCollections: async () => [],
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("keeps invalid prices visible and never fetches unfiltered results", async () => {
  render(
    await Page({
      searchParams: Promise.resolve({
        precoMin: "30",
        precoMax: "20",
        pagina: "4",
      }),
    }),
  );
  expect(catalogPage).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText("Preço mínimo (R$)") as HTMLInputElement).value,
  ).toBe("30");
  expect(
    screen.getByText("Corrija os filtros acima para consultar os produtos."),
  ).toBeTruthy();
  expect(screen.queryByText("Nenhum produto publicado ainda.")).toBeNull();
});
it("passes criteria to the server and keeps filtered canonical URLs clean", async () => {
  render(
    await Page({
      searchParams: Promise.resolve({
        precoMin: "0",
        disponibilidade: "AVAILABLE",
      }),
    }),
  );
  expect(catalogPage).toHaveBeenCalledWith(
    undefined,
    "",
    "nome",
    1,
    expect.objectContaining({ priceMin: "0", availability: "AVAILABLE" }),
  );
  const metadata = await generateMetadata({
    searchParams: Promise.resolve({
      precoMin: "0",
      disponibilidade: "AVAILABLE",
    }),
  });
  expect(metadata.robots).toEqual({ index: false, follow: true });
  expect(JSON.stringify(metadata.alternates)).not.toContain("precoMin");
});
