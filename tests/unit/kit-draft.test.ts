import { expect, it } from "vitest";
import { parseKitDraft, migrateKitDraft } from "@/domain/kits/draft";
const selection = {
  schemaVersion: 2,
  items: [{ productId: "p", quantity: 2, lineId: "l", kitInstanceId: "g" }],
  groups: [
    {
      instanceId: "g",
      kitId: "k",
      commercialRevision: 1,
      seenPrice: null,
      placements: [{ lineId: "l", x: 0.2, y: 0.8, z: 0 }],
    },
  ],
};
it("legacy_ids_do_not_collide", () => {
  const migrated = migrateKitDraft(
    JSON.stringify({
      formatVersion: 2,
      items: [
        { productId: "p", quantity: 1, lineId: "same" },
        { productId: "other", quantity: 1 },
      ],
    }),
    () => "same",
  );
  expect(migrated.selection.items.map((i) => i.lineId)).toEqual([
    "same",
    "same-1",
  ]);
  expect(migrated.selection.groups).toEqual([]);
  expect(
    migrateKitDraft(
      JSON.stringify([{ productId: "p", quantity: 2 }]),
      () => "old",
    ).selection.items[0].quantity,
  ).toBe(2);
});
it("roundtrips_positions_but_rejects_unknown_fields_versions_and_contact", () => {
  const raw = JSON.stringify({ formatVersion: 3, revision: "r", selection });
  const parsed = parseKitDraft(raw);
  expect(parsed.status).toBe("valid");
  if (parsed.status === "valid")
    expect(parsed.value.selection.groups[0].placements[0]).toEqual({
      lineId: "l",
      x: 0.2,
      y: 0.8,
      z: 0,
    });
  for (const bad of [
    raw.replace('"formatVersion":3', '"formatVersion":9'),
    JSON.stringify({
      formatVersion: 3,
      revision: "r",
      selection,
      contact: { name: "Ana" },
    }),
    "broken",
  ]) {
    expect(parseKitDraft(bad)).toEqual({ status: "invalid", raw: bad });
  }
});
