// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuoteForm } from "@/components/commerce/quote-form";
import { QuoteDetail } from "@/components/commerce/quote-detail";
import { LinePricingEditor } from "@/components/pricing/line-pricing-editor";
import { DocumentCostSummary } from "@/components/pricing/line-cost-summary";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { calculateV2 } from "@/domain/pricing/calculate";
import type { PricingSnapshotDTO } from "@/domain/pricing/types";
import type { QuoteDTO as Quote } from "@/domain/commerce/types";
import { lotFixture } from "../fixtures/pricing";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const snapshot: PricingSnapshotDTO = {
  id: "s",
  version: 2,
  input: lotFixture,
  result: calculateV2(lotFixture),
  actorId: "a",
  actorName: "Ana",
  createdAt: "2026-10-05T12:00:00Z",
};
const item = {
  lineId: "line-a",
  description: "Peça",
  quantity: 10,
  unitPrice: "8.00",
};
const costs = {
  revisionId: "r",
  bindings: [
    {
      lineId: item.lineId,
      snapshotId: "s",
      fingerprint: lineFingerprint(item),
      state: "VALID" as const,
    },
  ],
  snapshots: [snapshot],
};
const quote: Quote = {
  id: "q",
  number: "ORC-1",
  status: "RASCUNHO",
  version: 1,
  input: { items: [item], discount: "0.00", shipping: "0.00" },
  costs,
  totals: null,
  snapshot: null,
  events: [],
  createdAt: snapshot.createdAt,
  saleId: null,
};
it("attachDoesNotChangeNegotiatedPrice and suggestionRequiresExplicitAction", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (url) =>
      new Response(
        JSON.stringify({
          data: String(url).includes("catalog") ? pricingCatalog : snapshot,
        }),
        { status: 200 },
      ),
  );
  const saved = vi.fn();
  render(
    <QuoteForm
      quote={quote}
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
      saveDraft={saved}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Recalcular estimativa" }),
  );
  await screen.findByLabelText(
    "Revisei os parâmetros e a correspondência com este item",
  );
  fireEvent.click(
    screen.getByLabelText(
      "Revisei os parâmetros e a correspondência com este item",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Anexar estimativa ao item" }),
  );
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Anexar estimativa ao item" }),
    ).toBeNull(),
  );
  expect(
    (screen.getByLabelText("Preço unitário 1") as HTMLInputElement).value,
  ).toBe("8.00");
  fireEvent.click(
    screen.getByRole("button", { name: "Usar preço sugerido neste item" }),
  );
  expect(
    (screen.getByLabelText("Preço unitário 1") as HTMLInputElement).value,
  ).toBe("12.49");
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].costBindings).toBeUndefined();
  expect(saved.mock.calls[0][1]).toEqual([
    { lineId: "line-a", snapshotId: "s" },
  ]);
});
it("discountHidesGlobalProfitClaim and missing cost is not zero", () => {
  render(
    <DocumentCostSummary
      items={[item, { ...item, lineId: "other" }]}
      costs={costs}
      discount="5.00"
      shipping="0.00"
    />,
  );
  expect(
    screen.getByText("resultado global não apurado nesta etapa"),
  ).toBeTruthy();
  expect(screen.getByText("Sem estimativa de custo")).toBeTruthy();
  expect(screen.queryByText(/Lucro total/)).toBeNull();
});
it("staleCostBlocksIssueUntilRemovedOrRecalculated", () => {
  render(
    <QuoteDetail
      initial={{
        ...quote,
        costs: {
          ...costs,
          bindings: [{ ...costs.bindings[0], state: "STALE" }],
        },
      }}
      customers={[]}
      products={[]}
    />,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Emitir orçamento",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByText(/Recalcule ou remova/)).toBeTruthy();
});
it("networkFailureKeepsDraft and duplicate has no inherited costs", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Sem rede"));
  render(
    <QuoteForm
      quote={quote}
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Duplicar item 1" }));
  expect(screen.getByText("Sem estimativa de custo")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await screen.findByText(/Não foi possível conectar/);
  expect(
    (screen.getByLabelText("Preço unitário 1") as HTMLInputElement).value,
  ).toBe("8.00");
  expect(screen.getByLabelText("Descrição 2")).toBeTruthy();
});
it("line editor fixes quantity to the commercial item", () => {
  render(
    <LinePricingEditor
      item={item}
      catalog={pricingCatalog}
      snapshot={snapshot}
      onAttach={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).readOnly,
  ).toBe(true);
  expect(screen.queryByText("Comparar quantidades")).toBeNull();
});
