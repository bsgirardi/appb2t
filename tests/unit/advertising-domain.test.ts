import { expect, it } from "vitest";
import {
  adFieldsSchema,
  adCommandSchema,
} from "@/domain/advertising/validation";
import { makeAdSource } from "@/domain/advertising/source";
import { reviewIssues, assertAdTransition } from "@/domain/advertising/states";
export const source = {
  id: "p1",
  version: 1,
  name: "Peça azul",
  sku: "P-1",
  active: true,
  shortDescription: "Presente personalizado",
  description: "Descrição real",
  specifications: "12,5 cm",
  colors: ["Azul"],
  sizes: [],
  availability: "MADE_TO_ORDER" as const,
  leadTimeDays: 5,
  minimumQuantity: 2,
  personalizable: true,
  images: [{ id: "i1", position: 0, url: "/api/products/p1/images/i1" }],
};
it("selects public source fields without leaking internal properties", () => {
  const value = makeAdSource({
    ...source,
    price: "secret-price",
    calculation: { cost: "secret-cost" },
    customer: "secret-client",
  } as typeof source);
  expect(value.productId).toBe("p1");
  expect(value.productVersion).toBe(1);
  expect(JSON.stringify(value)).not.toContain("secret");
});
it("enforces text, NUL, photo and command boundaries", () => {
  const valid = {
    internalName: "a".repeat(120),
    title: "b".repeat(120),
    body: "c".repeat(5000),
    imageIds: Array.from({ length: 10 }, (_, i) => `i${i}`),
  };
  expect(adFieldsSchema.safeParse(valid).success).toBe(true);
  for (const patch of [
    { title: "a".repeat(121) },
    { internalName: "a".repeat(121) },
    { body: "x".repeat(5001) },
    { body: "\0" },
    { imageIds: [] },
    { imageIds: ["i", "i"] },
    { imageIds: Array.from({ length: 11 }, (_, i) => `i${i}`) },
  ])
    expect(adFieldsSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    );
  expect(
    adCommandSchema.safeParse({
      action: "REVIEW",
      expectedVersion: 1,
      confirmed: false,
    }).success,
  ).toBe(false);
  expect(
    adCommandSchema.safeParse({
      action: "CREATE",
      operationKey: "a".repeat(16),
      productId: "p",
      channel: "FACEBOOK",
      internalName: "a",
    }).success,
  ).toBe(false);
});
it("invalidates review after source changes, missing photos or local edits", () => {
  const s = makeAdSource(source),
    draft = {
      status: "REVIEWED" as const,
      version: 2,
      reviewedVersion: 2,
      source: s,
      imageIds: ["i1"],
    };
  expect(reviewIssues(draft, s).reviewIsCurrent).toBe(true);
  expect(reviewIssues(draft, { ...s, productVersion: 2 }).reviewIsCurrent).toBe(
    false,
  );
  expect(reviewIssues(draft, { ...s, images: [] }).missingPhotoIds).toEqual([
    "i1",
  ]);
  expect(reviewIssues({ ...draft, version: 3 }, s).reviewIsCurrent).toBe(false);
  expect(() => assertAdTransition("ARCHIVED", "UPDATE")).toThrow();
  expect(() => assertAdTransition("ARCHIVED", "RESTORE")).not.toThrow();
});
