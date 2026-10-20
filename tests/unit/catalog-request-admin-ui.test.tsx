// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RequestDetail } from "@/components/catalog-requests/request-detail";
import { RequestQuoteForm } from "@/components/catalog-requests/request-quote-form";
import { api, ApiError } from "@/lib/client-api";
import type { CatalogRequestDTO } from "@/domain/catalog-requests/types";
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const request: CatalogRequestDTO = {
  id: "r",
  protocol: "SOL-000001",
  state: "RECEBIDA",
  version: 1,
  name: "Ana",
  preferredChannel: "email",
  createdAt: "2026-10-20T12:00:00Z",
  lineCount: 1,
  consultCount: 1,
  assigneeId: null,
  assigneeName: null,
  quoteId: null,
  contact: {
    name: "Ana",
    preferredChannel: "email",
    email: "ana@example.test",
    phone: "",
  },
  knownTotal: null,
  events: [],
  currentProducts: [
    {
      id: "p",
      name: "Peça",
      active: true,
      availability: "AVAILABLE",
      commercialRevision: 1,
    },
  ],
  lines: [
    {
      schemaVersion: 1,
      lineId: "l0",
      productId: "p",
      commercialRevision: 1,
      name: "Peça",
      sku: "",
      color: "",
      size: "",
      answers: [],
      answerLabels: [],
      quantity: 1,
      priceKind: "CONSULT",
      unitPrice: null,
      subtotal: null,
      included: "",
      leadTimeCondition: "",
      productionLeadDays: null,
      paymentTerms: "Pix",
    },
  ],
};
it("keeps unsaved notes when another attendant changes the version", async () => {
  vi.mocked(api).mockRejectedValueOnce(
    new ApiError("Outra pessoa alterou. Atualize os dados.", "CONFLICT"),
  );
  render(
    <RequestDetail
      initial={request}
      users={[{ id: "u", name: "Equipe" }]}
      actorId="u"
      customers={[]}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nota ou motivo"), {
    target: { value: "Não perder esta nota" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar atendimento" }));
  await screen.findByText(/Outra pessoa alterou/);
  expect(
    (screen.getByLabelText("Nota ou motivo") as HTMLTextAreaElement).value,
  ).toBe("Não perder esta nota");
});
it("shows the existing quote instead of another preparation action", () => {
  render(
    <RequestDetail
      initial={{ ...request, state: "ORCAMENTO_PREPARADO", quoteId: "q" }}
      users={[]}
      actorId="u"
      customers={[]}
    />,
  );
  expect(
    screen
      .getByRole("link", { name: "Abrir orçamento vinculado" })
      .getAttribute("href"),
  ).toBe("/orcamentos/q");
  expect(
    screen.queryByRole("button", { name: "Preparar orçamento" }),
  ).toBeNull();
});
it("does not prepare consultation without a chosen customer and positive price", () => {
  render(
    <RequestQuoteForm
      request={{ ...request, state: "EM_ATENDIMENTO" }}
      initialCustomers={[]}
      onPrepared={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preparar orçamento" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});
