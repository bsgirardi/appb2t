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
