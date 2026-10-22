import { it, expect } from "vitest";
import { buildInquiryMessage } from "@/domain/products/inquiry-message";
import type { InquiryLine } from "@/domain/products/inquiry";
const line: InquiryLine = {
  productId: "p",
  color: "",
  size: "",
  quantity: 1,
  answers: [],
  answerLabels: [
    { fieldId: "text", label: "Texto", valueLabel: "😀".repeat(500) },
  ],
  commercialRevision: 1,
  seenPrice: null,
  name: "Peça",
  sku: "",
  path: "/produto",
  imageUrl: null,
  price: null,
  subtotal: null,
  problem: null,
};
it("keeps a long message intact and opens a channel without its body", () => {
  const r = buildInquiryMessage(
    [line],
    { knownTotal: null, consultCount: 1 },
    {
      name: "B2T",
      phone: "11999999999",
      email: "",
      origin: "http://localhost:3000",
    },
  );
  expect(r.copyRequired).toBe(true);
  expect(r.message).toContain("😀".repeat(500));
  expect(r.contact!.length).toBeLessThan(6000);
  expect(new URL(r.contact!).searchParams.get("text")).toBeFalsy();
});
it("identifies_kit_components_and_discount_once_in_message", () => {
  const result = buildInquiryMessage(
    [
      {
        ...line,
        kitInstanceId: "g",
        quantity: 5,
        answerLabels: [],
        price: "20.00",
        subtotal: "100.00",
      },
    ],
    { knownTotal: "85.00", consultCount: 0 },
    {
      name: "B2T",
      phone: "",
      email: "equipe@example.test",
      origin: "http://localhost:3000",
    },
    [
      {
        instanceId: "g",
        kitId: "k",
        name: "Kit Ana",
        commercialRevision: 1,
        currentRevision: 1,
        placements: [],
        seenPrice: null,
        requiresConfirmation: false,
        problem: null,
        price: {
          kind: "REFERENCE",
          quantity: 5,
          knownSubtotal: "100.00",
          subtotal: "100.00",
          discount: "15.00",
          total: "85.00",
          tier: { minQuantity: 5, kind: "FIXED", amount: "15.00" },
        },
      },
    ],
  );
  expect(result.message).toContain("Kit Ana");
  expect(result.message).toContain("15,00");
  expect(result.message).toContain("85,00");
});
