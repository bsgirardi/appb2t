import { expect, it } from "vitest";
import { createKitHistory, kitHistoryReducer } from "@/domain/kits/draft";
import { parseKitSelection } from "@/domain/kits/selection";
const selection = () =>
  parseKitSelection({
    schemaVersion: 2,
    items: [
      {
        productId: "p",
        quantity: 1,
        lineId: "l",
        kitInstanceId: "g",
        commercialRevision: 1,
        seenPrice: { kind: "REFERENCE", unit: "10.00", subtotal: "10.00" },
      },
    ],
    groups: [
      {
        instanceId: "g",
        kitId: "k",
        commercialRevision: 1,
        seenPrice: null,
        placements: [{ lineId: "l", x: 0.5, y: 0.5, z: 0 }],
      },
    ],
  });
it("undo_stops_at_50_and_redo_restores_positions", () => {
  let state = createKitHistory(selection());
  for (let i = 0; i < 60; i++) {
    const next = selection();
    next.groups[0].placements[0].x = i / 100;
    state = kitHistoryReducer(state, { type: "commit", selection: next });
  }
  expect(state.past).toHaveLength(50);
  state = kitHistoryReducer(state, { type: "undo" });
  expect(state.present.groups[0].placements[0].x).toBe(0.58);
  expect(state.present.items[0].seenPrice?.unit).toBe("10.00");
  state = kitHistoryReducer(state, { type: "redo" });
  expect(state.present.groups[0].placements[0].x).toBe(0.59);
  expect(createKitHistory(state.present).past).toEqual([]);
});
it("undoing_commercial_change_requires_fresh_review", () => {
  let state = createKitHistory(selection());
  const next = selection();
  next.items[0].quantity = 2;
  state = kitHistoryReducer(state, { type: "commit", selection: next });
  state = kitHistoryReducer(state, { type: "undo" });
  expect(state.present.items[0].quantity).toBe(1);
  expect(state.present.items[0].seenPrice).toBeNull();
  expect(state.present.groups[0].commercialRevision).toBeNull();
});
