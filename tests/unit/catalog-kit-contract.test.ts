import { expect, it } from "vitest";
import { parseCatalogSubmission } from "@/domain/catalog-requests/validation";
import { canonicalSubmission } from "@/domain/catalog-requests/identity";
const legacy = {
  attemptKey: "a".repeat(64),
  contact: {
    name: "Ana",
    preferredChannel: "email",
    phone: "",
    email: "ana@example.test",
  },
  items: [{ productId: "p", lineId: "l", quantity: 1 }],
};
const v2 = {
  ...legacy,
  schemaVersion: 2,
  items: [{ ...legacy.items[0], kitInstanceId: "g" }],
  groups: [
    {
      instanceId: "g",
      kitId: "k",
      commercialRevision: 1,
      placements: [{ lineId: "l", x: 0.5, y: 0.5, z: 0 }],
      seenPrice: null,
    },
  ],
};
it("preserves_legacy_hash_and_rejects_context_without_group", () => {
  expect(canonicalSubmission(parseCatalogSubmission(legacy))).toBe(
    '["Ana","email","","ana@example.test",[["l","p","","",1,[],null,null]]]',
  );
  expect(() =>
    parseCatalogSubmission({ ...legacy, items: v2.items }),
  ).toThrow();
  expect(() => parseCatalogSubmission({ ...v2, groups: [] })).toThrow();
});
it("includes_group_and_position_but_excludes_labels_and_navigation", () => {
  const original = canonicalSubmission(parseCatalogSubmission(v2));
  expect(
    canonicalSubmission(
      parseCatalogSubmission({
        ...v2,
        items: [
          {
            ...v2.items[0],
            answerLabels: [
              { fieldId: "x", label: "Rótulo", valueLabel: "Texto" },
            ],
          },
        ],
      }),
    ),
  ).toBe(original);
  expect(
    canonicalSubmission(
      parseCatalogSubmission({
        ...v2,
        groups: [
          {
            ...v2.groups[0],
            placements: [{ lineId: "l", x: 0.6, y: 0.5, z: 0 }],
          },
        ],
      }),
    ),
  ).not.toBe(original);
});
