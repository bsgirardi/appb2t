// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdLibrary } from "@/components/advertising/ad-library";
import { api } from "@/lib/client-api";
import { adDraft } from "../fixtures/advertising";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("explains an empty library and creates an intentional per-channel draft", async () => {
  const d = adDraft();
  render(
    <AdLibrary
      initial={{ drafts: [], total: 0, page: 1, pages: 0 }}
      query={{ search: "", page: 1 }}
      initialProducts={{ products: [d.source], total: 1, pages: 1 }}
    />,
  );
  expect(screen.getByText("Nenhum rascunho encontrado")).toBeTruthy();
  const filterTrigger = screen.getByRole("button", { name: "Filtros" });
  expect(filterTrigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(filterTrigger);
  expect(
    screen.getByRole("textbox", { name: "Buscar rascunhos" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Selecionar Peça azul" }));
  fireEvent.click(screen.getByRole("radio", { name: "WhatsApp" }));
  vi.mocked(api).mockResolvedValueOnce({ ...d, channel: "WHATSAPP" });
  fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/anuncios/d1"));
  expect(api).toHaveBeenCalledWith(
    "/api/anuncios",
    expect.objectContaining({
      action: "CREATE",
      channel: "WHATSAPP",
      productId: "p1",
    }),
  );
});
