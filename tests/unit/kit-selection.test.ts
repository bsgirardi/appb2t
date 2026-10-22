import { expect, it } from "vitest";
import { mergeInquiryItem, inquiryKey } from "@/domain/products/inquiry";
import { parseKitSelection } from "@/domain/kits/selection";
import { validatePlacements } from "@/domain/kits/composition";
const item = (name = "Ana", context?: string) => ({
  productId: "p",
  lineId: `line-${name}-${context ?? "loose"}`,
  quantity: 5,
  answers: [{ fieldId: "name", value: name }],
  kitInstanceId: context,
});
const group = (id = "k1") => ({
  instanceId: id,
  kitId: "kit",
  commercialRevision: 1,
  seenPrice: null,
  placements: [{ lineId: `line-Ana-${id}`, x: 0.5, y: 0.5, z: 0 }],
});
it("separates_ana_bia_and_contexts", () => {
  let rows = mergeInquiryItem([], item());
  rows = mergeInquiryItem(rows, item("Bia"));
  rows = mergeInquiryItem(rows, item("Ana", "k1"));
  rows = mergeInquiryItem(rows, item("Ana", "k2"));
  rows = mergeInquiryItem(rows, item());
  expect(rows.map((i) => i.quantity)).toEqual([10, 5, 5, 5]);
  expect(
    parseKitSelection({
      schemaVersion: 2,
      items: rows,
      groups: [group(), group("k2")],
    }).groups,
  ).toHaveLength(2);
  expect(inquiryKey(item("José"))).toBe(inquiryKey(item("Jose\u0301")));
});
it("validates_boundaries_and_geometry", () => {
  const valid = {
    schemaVersion: 2,
    items: [item("Ana", "k1")],
    groups: [group()],
  };
  expect(parseKitSelection(valid).items[0].quantity).toBe(5);
  for (const bad of [
    { ...valid, groups: [] },
    { ...valid, items: [] },
    { ...valid, groups: [group(), group()] },
    { ...valid, groups: [{ ...group(), placements: [] }] },
    { ...valid, items: [{ ...item("Ana", "k1"), quantity: 100 }] },
    { ...valid, items: [...valid.items, ...valid.items] },
  ])
    expect(() => parseKitSelection(bad)).toThrow();
  for (const x of [NaN, Infinity, -0.1, 1.1])
    expect(() =>
      validatePlacements(["a"], [{ lineId: "a", x, y: 0.5, z: 0 }]),
    ).toThrow();
  expect(() =>
    validatePlacements(["a"], [{ lineId: "other", x: 0, y: 0, z: 0 }]),
  ).toThrow();
  expect(
    validatePlacements(
      ["b", "a"],
      [
        { lineId: "b", x: 0, y: 1, z: 0 },
        { lineId: "a", x: 1, y: 0, z: 0 },
      ],
    ).map((p) => [p.lineId, p.z]),
  ).toEqual([
    ["a", 0],
    ["b", 1],
  ]);
});
it("preserves_legacy_selections_and_global_limits", () => {
  expect(parseKitSelection({ items: [item()] }).groups).toEqual([]);
  expect(() =>
    parseKitSelection({ schemaVersion: 99, items: [], groups: [] }),
  ).toThrow();
  expect(() =>
    parseKitSelection({
      schemaVersion: 2,
      items: Array.from({ length: 21 }, (_, i) => ({
        ...item(),
        lineId: `l${i}`,
        productId: `p${i}`,
      })),
      groups: [],
    }),
  ).toThrow();
  const max = Array.from({ length: 20 }, (_, i) => ({
    ...item("Ana", "k1"),
    lineId: `l${i}`,
    productId: `p${i}`,
    quantity: 99,
  }));
  expect(
    parseKitSelection({
      schemaVersion: 2,
      items: max,
      groups: [
        {
          ...group(),
          placements: max.map((i, z) => ({ lineId: i.lineId, x: 0, y: 0, z })),
        },
      ],
    }).items,
  ).toHaveLength(20);
});
