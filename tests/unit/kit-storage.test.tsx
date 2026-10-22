// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
  vi.restoreAllMocks();
});
it("composition_controller_resets_history_after_external_selection_change", async () => {
  const s = await import("@/lib/inquiry-store");
  const { createKitCompositionStore } =
    await import("@/lib/kit-composition-store");
  s.writeInquiry([{ productId: "p", quantity: 1 }]);
  const controller = createKitCompositionStore();
  const next = s.readKitSelection();
  next.items[0].quantity = 2;
  controller.commit(next);
  expect(s.readInquiry()[0].quantity).toBe(2);
  controller.undo();
  expect(s.readInquiry()[0].quantity).toBe(1);
  s.writeInquiry([{ productId: "p", quantity: 3 }]);
  let notices = 0;
  const unsubscribe = controller.subscribe(() => {
    notices++;
  });
  controller.undo();
  expect(controller.getSnapshot().present.items[0].quantity).toBe(3);
  expect(notices).toBe(1);
  unsubscribe();
});
it("cross_tab_change_requires_choice_and_preserves_both_versions", async () => {
  const s = await import("@/lib/inquiry-store");
  s.writeInquiry([{ productId: "local", quantity: 1 }]);
  const original = JSON.parse(localStorage.getItem("b2t:inquiry:v3")!);
  localStorage.setItem(
    "b2t:inquiry:v3",
    JSON.stringify({
      ...original,
      revision: "remote",
      selection: {
        ...original.selection,
        items: [{ ...original.selection.items[0], productId: "remote" }],
      },
    }),
  );
  expect(() =>
    s.writeInquiry([{ productId: "local-edited", quantity: 2 }]),
  ).toThrow(/outra aba/i);
  expect(s.inquiryConflictText()?.local).toContain('"local"');
  expect(s.inquiryConflictText()?.remote).toContain('"remote"');
  s.resolveInquiryConflict("remote");
  expect(s.readInquiry()[0].productId).toBe("remote");
});
it("pending_attempt_is_immutable_after_write_and_read", async () => {
  const a = await import("@/lib/catalog-request-attempt");
  const pending = a.createRequestAttempt({
    contact: {
      name: "Ana",
      preferredChannel: "email",
      phone: "",
      email: "ana@example.test",
    },
    items: [
      {
        productId: "p",
        lineId: "l",
        quantity: 1,
        color: "",
        size: "",
        answers: [],
        commercialRevision: null,
        seenPrice: null,
        answerLabels: [],
      },
    ],
  });
  a.writeRequestAttempt(pending);
  pending.payload.items[0].quantity = 9;
  const read = a.readRequestAttempt();
  if (read?.kind === "pending") {
    expect(read.payload.items[0].quantity).toBe(1);
    read.payload.items[0].quantity = 8;
  }
  const again = a.readRequestAttempt();
  expect(again?.kind === "pending" && again.payload.items[0].quantity).toBe(1);
});
it("acknowledged_cleanup_preserves_other_tab_positions", async () => {
  const { parseKitSelection } = await import("@/domain/kits/selection");
  const { clearSubmittedSelection } =
    await import("@/lib/catalog-request-attempt");
  const sent = parseKitSelection({
    schemaVersion: 2,
    items: [{ productId: "p", lineId: "l", quantity: 1, kitInstanceId: "g" }],
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
  const moved = structuredClone(sent);
  moved.groups[0].placements[0].x = 0.6;
  expect(clearSubmittedSelection(moved, sent).items).toHaveLength(1);
  expect(clearSubmittedSelection(sent, sent)).toMatchObject({
    items: [],
    groups: [],
  });
});
