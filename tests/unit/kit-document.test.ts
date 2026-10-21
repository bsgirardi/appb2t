import { expect, it } from "vitest";
import {
  calculatePreparedKitDiscount,
  kitPreparationReview,
} from "@/domain/kits/document";
import type { KitGroupSnapshot } from "@/domain/kits/types";
const group: KitGroupSnapshot = {
  schemaVersion: 1,
  instanceId: "g",
  kitId: "k",
  name: "Kit",
  commercialRevision: 1,
  tiers: [
    { minQuantity: 5, kind: "FIXED", amount: "15.00" },
    { minQuantity: 10, kind: "PERCENT", percent: "20.00" },
  ],
  lineIds: ["a", "b"],
  placements: [
    { lineId: "a", x: 0, y: 0, z: 0 },
    { lineId: "b", x: 1, y: 1, z: 1 },
  ],
  images: [
    { lineId: "a", imageId: null, imageUrl: null },
    { lineId: "b", imageId: null, imageUrl: null },
  ],
  price: {
    kind: "REFERENCE",
    quantity: 5,
    knownSubtotal: "120.00",
    subtotal: "120.00",
    discount: "15.00",
    total: "105.00",
    tier: { minQuantity: 5, kind: "FIXED", amount: "15.00" },
  },
};
const items = [
  { lineId: "q1", description: "Peça A", quantity: 2, unitPrice: "30.00" },
  { lineId: "q2", description: "Peça B", quantity: 3, unitPrice: "20.00" },
];
const sources = [
  { lineId: "q1", sourceLineId: "a", standalone: false },
  { lineId: "q2", sourceLineId: "b", standalone: false },
];
it("prepared_discount_uses_received_table_and_reviewed_quantities", () => {
  expect(calculatePreparedKitDiscount([group], items, sources)).toMatchObject({
    discount: "15.00",
    groups: [
      { quantity: 5, subtotal: "120.00", discount: "15.00", total: "105.00" },
    ],
  });
  expect(
    calculatePreparedKitDiscount(
      [group],
      [{ ...items[0], quantity: 7 }, items[1]],
      sources,
    ),
  ).toMatchObject({
    discount: "54.00",
    groups: [
      { quantity: 10, subtotal: "270.00", discount: "54.00", total: "216.00" },
    ],
  });
  expect(() =>
    calculatePreparedKitDiscount(
      [group],
      [{ ...items[0], unitPrice: "0" }, items[1]],
      sources,
    ),
  ).toThrow();
});
it("review_fingerprint_binds_prices_quantities_and_source_membership", () => {
  const original = kitPreparationReview(items, sources, "15.00");
  expect(
    kitPreparationReview([...items].reverse(), [...sources].reverse(), "15.00"),
  ).toBe(original);
  expect(
    kitPreparationReview(
      [{ ...items[0], unitPrice: "31.00" }, items[1]],
      sources,
      "15.00",
    ),
  ).not.toBe(original);
  expect(
    kitPreparationReview(
      items,
      sources.map((s) => ({
        ...s,
        sourceLineId: s.sourceLineId === "a" ? "b" : "a",
      })),
      "15.00",
    ),
  ).not.toBe(original);
});
it("review_fingerprint_matches_the_values_normalized_before_saving", () => {
  expect(
    kitPreparationReview(
      [{ ...items[0], description: " Peça A ", unitPrice: "30,00" }, items[1]],
      sources,
      "15.00",
    ),
  ).toBe(kitPreparationReview(items, sources, "15.00"));
});
