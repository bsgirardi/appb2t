// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Page, { generateMetadata } from "@/app/page";
import { getPublicAppearance } from "@/server/appearance";
import { catalogPage } from "@/server/storefront";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("@/server/appearance", () => ({
  getPublicAppearance: vi.fn(async () => ({
    ...defaultAppearance,
    logoUrl: null,
  })),
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
it("labels approximate results accessibly and explains search behavior", async () => {
  vi.mocked(catalogPage).mockResolvedValueOnce({
    products: [],
    total: 1,
    pages: 1,
    approximate: true,
  });
  render(
    await Page({ searchParams: Promise.resolve({ busca: "chavero azul" }) }),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "Resultados aproximados para “chavero azul”",
  );
  fireEvent.click(screen.getByRole("button", { name: "Filtrar produtos" }));
  const search = screen.getByLabelText("Buscar no catálogo");
  expect(
    document.getElementById(search.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toContain("qualquer ordem");
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

it.each([false, true])(
  "honors initial banner visibility (configured banner: %s)",
  async (configured) => {
    vi.mocked(getPublicAppearance).mockResolvedValueOnce({
      ...defaultAppearance,
      logoUrl: null,
      storefront: {
        ...defaultAppearance.storefront,
        showHero: false,
        banners: configured
          ? [
              {
                title: "Destaque da loja",
                text: "Texto",
                collectionId: "",
                buttonText: "Explorar",
              },
            ]
          : [],
      },
    });
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText("Destaque da loja")).toBeNull();
    expect(screen.queryByText("Sua ideia.")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Conheça nossa coleção" }),
    ).toBeTruthy();
  },
);
