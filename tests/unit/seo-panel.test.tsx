// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SeoPanel } from "@/components/settings/seo-panel";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/settings/google-analytics-panel", () => ({
  GoogleAnalyticsPanel: () => <p>Relatórios desconectados</p>,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("saves existing catalog SEO fields without overwriting identity, palette or merchandising", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { version: 5 } }), { status: 200 }),
    );
  render(
    <SeoPanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 4 }}
      canonicalOrigin="https://b2t.test"
      googleConfigured={false}
      collectionEnabled={false}
    />,
  );
  fireEvent.change(screen.getByLabelText("Página pública"), {
    target: { value: "/catalogo" },
  });
  fireEvent.change(screen.getByLabelText("Título de Catálogo"), {
    target: { value: "Catálogo personalizado" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar SEO e identificadores" }),
  );
  await screen.findByText(/SEO e identificadores salvos/);
  const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(body.seoTitle).toBe("Catálogo personalizado");
  expect(body.expectedVersion).toBe(4);
  expect(body.name).toBeUndefined();
  expect(body.lightPrimary).toBeUndefined();
  expect(body.banners).toBeUndefined();
});
it("explains private indexing and rejects external redirect before sending", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  render(
    <SeoPanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 0 }}
      canonicalOrigin="https://b2t.test"
      googleConfigured={false}
      collectionEnabled={false}
    />,
  );
  expect(
    screen.getByText(/Login, administração e fluxos privados/),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar redirecionamento" }),
  );
  fireEvent.change(screen.getByLabelText("Caminho antigo"), {
    target: { value: "/antigo" },
  });
  fireEvent.change(screen.getByLabelText("Destino público"), {
    target: { value: "https://evil.test" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar SEO e identificadores" }),
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Escolha uma página pública",
  );
  expect(fetcher).not.toHaveBeenCalled();
});
