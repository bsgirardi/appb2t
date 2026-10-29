// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdEditor } from "@/components/advertising/ad-editor";
import { api, ApiError } from "@/lib/client-api";
import { adDraft } from "../fixtures/advertising";
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("requires saved text and explicit confirmation before reviewing", async () => {
  const d = adDraft();
  render(<AdEditor initial={d} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Marcar como revisado",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Texto do anúncio"), {
    target: { value: "Texto novo" },
  });
  vi.mocked(api).mockResolvedValueOnce({
    ...d,
    body: "Texto novo",
    version: 2,
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await waitFor(() => expect(api).toHaveBeenCalled());
  fireEvent.click(
    screen.getByLabelText(
      "Conferi o texto, as fotos e a disponibilidade deste material",
    ),
  );
  vi.mocked(api).mockResolvedValueOnce({
    ...d,
    body: "Texto novo",
    version: 3,
    status: "REVIEWED",
    reviewIsCurrent: true,
  });
  fireEvent.click(screen.getByRole("button", { name: "Marcar como revisado" }));
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Copiar texto",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
});
it("preserves local text on a conflict and lets the operator compare before choosing a base", async () => {
  const d = adDraft();
  render(<AdEditor initial={d} />);
  fireEvent.change(screen.getByLabelText("Texto do anúncio"), {
    target: { value: "MINHA EDIÇÃO" },
  });
  vi.mocked(api).mockRejectedValueOnce(
    new ApiError("Registro alterado", "CONFLICT"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await screen.findByText("Registro alterado");
  expect(
    (screen.getByLabelText("Texto do anúncio") as HTMLTextAreaElement).value,
  ).toBe("MINHA EDIÇÃO");
  vi.mocked(api).mockResolvedValueOnce({
    ...d,
    version: 2,
    body: "EDIÇÃO REMOTA",
  });
  fireEvent.click(screen.getByRole("button", { name: "Ver versão atual" }));
  await screen.findByText("EDIÇÃO REMOTA");
  expect(
    (screen.getByLabelText("Texto do anúncio") as HTMLTextAreaElement).value,
  ).toBe("MINHA EDIÇÃO");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Manter minha edição sobre a versão atual",
    }),
  );
  expect(
    (screen.getByLabelText("Texto do anúncio") as HTMLTextAreaElement).value,
  ).toBe("MINHA EDIÇÃO");
});
it("requires confirmation before replacing text and shows missing photos accessibly", () => {
  const d = adDraft();
  render(
    <AdEditor
      initial={{
        ...d,
        productChanged: true,
        missingPhotoIds: ["i1"],
        currentSource: {
          ...d.source,
          productVersion: 2,
          images: d.source.images.slice(1),
        },
      }}
    />,
  );
  expect(screen.getByText(/Foto 1 ausente/)).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Marcar como revisado",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Ver nova sugestão" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});
it("orders photos by keyboard-accessible buttons and escapes text instead of interpreting HTML", () => {
  const d = adDraft();
  render(<AdEditor initial={{ ...d, body: "<script>private()</script>" }} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Mover foto 2 para cima" }),
  );
  expect(document.querySelector("script")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Salvar rascunho",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
it("keeps the edit base when another operator edits during download", async () => {
  const d = {
    ...adDraft(),
    status: "REVIEWED" as const,
    reviewIsCurrent: true,
  };
  const { downloadDraft } = await import("@/components/advertising/ad-client");
  vi.mocked(downloadDraft).mockResolvedValueOnce(undefined);
  vi.mocked(api).mockResolvedValueOnce({
    ...d,
    version: 2,
    body: "EDIÇÃO DE OUTRA PESSOA",
  });
  render(<AdEditor initial={d} />);
  fireEvent.click(screen.getByRole("button", { name: "Baixar material" }));
  await screen.findByText(
    "Material preparado. Confira o download no navegador.",
  );
  fireEvent.change(screen.getByLabelText("Texto do anúncio"), {
    target: { value: "MINHA NOVA EDIÇÃO" },
  });
  vi.mocked(api).mockRejectedValueOnce(
    new ApiError("Registro alterado", "CONFLICT"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await screen.findByText("Registro alterado");
  expect(vi.mocked(api).mock.calls.at(-1)?.[1]).toMatchObject({
    expectedVersion: 1,
  });
});
vi.mock("@/components/advertising/ad-client", async (original) => ({
  ...(await original<typeof import("@/components/advertising/ad-client")>()),
  downloadDraft: vi.fn(),
}));
