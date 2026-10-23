// @vitest-environment jsdom
import { expect, it } from "vitest";
import { clearSubmittedSelection } from "@/lib/catalog-request-attempt";
import { inquiryItemSchema } from "@/domain/products/inquiry";
import {
  saveCheckoutAttempt,
  readCheckoutAttempt,
} from "@/domain/checkout/attempt";
it("preserves changed and new lines when an older checkout is cleared", () => {
  const a = inquiryItemSchema.parse({
    productId: "p",
    lineId: "a",
    quantity: 1,
  });
  const b = inquiryItemSchema.parse({
    productId: "q",
    lineId: "b",
    quantity: 1,
  });
  const current = {
    schemaVersion: 2 as const,
    items: [{ ...a, quantity: 2 }, b],
    groups: [],
  };
  expect(
    clearSubmittedSelection(current, {
      schemaVersion: 2,
      items: [a],
      groups: [],
    }).items,
  ).toEqual(current.items);
});
it("stores a stable confirmation identity without contact data or authorization secrets", () => {
  const attempt = {
    checkoutId: "c",
    operationKey: "a".repeat(64),
    expectedVersion: 1,
    fingerprint: "b".repeat(64),
  };
  saveCheckoutAttempt(attempt);
  expect(readCheckoutAttempt()).toEqual({ ...attempt, kind: "CONFIRM" });
  expect(() =>
    saveCheckoutAttempt({ ...attempt, token: "secret" } as typeof attempt),
  ).toThrow();
});
