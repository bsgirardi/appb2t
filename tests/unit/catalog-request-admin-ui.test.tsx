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
it("kit_preparation_separates_discount_and_invalidates_review_after_any_price_edit", () => {
  const group = {
    schemaVersion: 1 as const,
    instanceId: "g",
    kitId: "k",
    name: "Kit Ana",
    commercialRevision: 1,
    tiers: [{ minQuantity: 5, kind: "FIXED" as const, amount: "15.00" }],
    lineIds: ["l0"],
    placements: [{ lineId: "l0", x: 0.5, y: 0.5, z: 0 }],
    images: [{ lineId: "l0", imageId: null, imageUrl: null }],
    price: {
      kind: "REFERENCE" as const,
      quantity: 5,
      knownSubtotal: "100.00",
      subtotal: "100.00",
      discount: "15.00",
      total: "85.00",
      tier: { minQuantity: 5, kind: "FIXED" as const, amount: "15.00" },
    },
  };
  render(
    <RequestQuoteForm
      request={{
        ...request,
        state: "EM_ATENDIMENTO",
        groups: [group],
        lines: [
          {
            ...request.lines[0],
            kitInstanceId: "g",
            quantity: 5,
            priceKind: "REFERENCE",
            unitPrice: "20.00",
            subtotal: "100.00",
          },
        ],
      }}
      initialCustomers={[]}
      onPrepared={() => {}}
      onCancel={() => {}}
    />,
  );
  const checkbox = screen.getByLabelText(
    "Revisei os preços, as quantidades e os descontos dos kits",
  ) as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
  fireEvent.change(screen.getByLabelText("Preço unitário 1"), {
    target: { value: "21.00" },
  });
  expect(checkbox.checked).toBe(false);
  fireEvent.change(screen.getByLabelText("Preço unitário 1"), {
    target: { value: "20.00" },
  });
  expect(checkbox.checked).toBe(false);
  fireEvent.change(screen.getByLabelText("Desconto comercial adicional (R$)"), {
    target: { value: "5.00" },
  });
  expect(screen.getByText(/Desconto global:.*20,00/)).toBeTruthy();
});
