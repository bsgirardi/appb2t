// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuoteForm } from "@/components/commerce/quote-form";
import { DocumentPrint } from "@/components/commerce/document-print";
import type { QuoteDTO, DocumentSnapshot } from "@/domain/commerce/types";
import { defaultAppearance } from "@/domain/appearance/validation";
afterEach(cleanup);
const group = {
  schemaVersion: 1 as const,
  instanceId: "g",
  kitId: "k",
  name: "Kit Ana",
  commercialRevision: 1,
  tiers: [{ minQuantity: 5, kind: "FIXED" as const, amount: "15.00" }],
  lineIds: ["a"],
  placements: [{ lineId: "a", x: 0.5, y: 0.5, z: 0 }],
  images: [{ lineId: "a", imageId: null, imageUrl: null }],
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
const metadata = {
  schemaVersion: 1 as const,
  requestId: "r",
  groups: [group],
  preparation: {
    groups: [
      {
        instanceId: "g",
        lineIds: ["q1"],
        quantity: 5,
        subtotal: "100.00",
        discount: "15.00",
        total: "85.00",
        tier: group.price.tier,
      },
    ],
    sources: [{ lineId: "q1", sourceLineId: "a" }],
    kitDiscount: "15.00",
    additionalDiscount: "0.00",
    totalDiscount: "15.00",
  },
};
const origin = {
  schemaVersion: 1 as const,
  requestId: "r",
  sourceLineId: "a",
  snapshot: {
    schemaVersion: 1 as const,
    kitInstanceId: "g",
    lineId: "a",
    productId: "p",
    commercialRevision: 1,
    name: "Peça",
    sku: "",
    color: "",
    size: "",
    answers: [],
    answerLabels: [],
    quantity: 5,
    priceKind: "REFERENCE" as const,
    unitPrice: "20.00",
    subtotal: "100.00",
    included: "",
    leadTimeCondition: "",
    productionLeadDays: null,
    paymentTerms: "Pix",
  },
};
const quote: QuoteDTO = {
  id: "q",
  number: "ORC-000001",
  status: "RASCUNHO",
  version: 1,
  input: {
    customerId: "c",
    validUntil: "2099-12-31",
    items: [
      {
        lineId: "q1",
        description: "Peça",
        quantity: 5,
        unitPrice: "20.00",
        catalogOrigin: origin,
      },
    ],
    discount: "15.00",
    shipping: "0.00",
    paymentTerms: "Pix",
    internalNotes: "",
    catalogKits: metadata,
  },
  totals: {
    subtotal: "100.00",
    discount: "15.00",
    shipping: "0.00",
    total: "85.00",
  },
  snapshot: null,
  events: [],
  createdAt: "2026-10-21T12:00:00Z",
  saleId: null,
};
it("changing_price_or_quantity_requires_fresh_discount_review", () => {
  render(
    <QuoteForm
      quote={quote}
      customers={[]}
      products={[]}
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Preço unitário 1"), {
    target: { value: "21.00" },
  });
  const checkbox = screen.getByLabelText(
    "Revisei o desconto deste documento",
  ) as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
  fireEvent.change(screen.getByLabelText("Quantidade 1"), {
    target: { value: "6" },
  });
  expect(checkbox.checked).toBe(false);
  expect(screen.getByText(/não recalculam automaticamente/)).toBeTruthy();
});
it("print_identifies_group_and_shows_global_discount_once", () => {
  const snapshot: DocumentSnapshot = {
    company: { ...defaultAppearance, logoUrl: null },
    customer: {
      name: "Ana",
      type: "PERSON",
      document: "",
      email: "",
      phone: "",
      address: "",
    },
    items: quote.input.items!.map((i) => ({ ...i, name: "Peça" })),
    issuedAt: "2026-10-21T12:00:00Z",
    catalogKits: metadata,
  };
  render(
    <DocumentPrint
      number={quote.number}
      snapshot={snapshot}
      totals={quote.totals!}
      paymentTerms="Pix"
    />,
  );
  expect(screen.getByText("Conjunto: Kit Ana")).toBeTruthy();
  expect(screen.getAllByText("R$ 15,00")).toHaveLength(1);
});
