import { z } from "zod";
import { parseKitSelection } from "./selection";
import type { KitSelection } from "./types";
import {
  byteLength,
  INQUIRY_MAX_BYTES,
  ensureInquiryLineIds,
  migrateInquiryV1,
} from "@/domain/products/inquiry-draft";
import { inquiryItemsSchema, inquiryKey } from "@/domain/products/inquiry";
const selectionSchema = z.unknown().transform((raw, ctx) => {
  try {
    return parseKitSelection(raw);
  } catch {
    ctx.addIssue({ code: "custom", message: "Montagem inválida." });
    return z.NEVER;
  }
});
export const kitDraftSchema = z
  .object({
    formatVersion: z.literal(3),
    revision: z.string().min(1).max(100),
    selection: selectionSchema,
  })
  .strict();
export type KitDraft = z.infer<typeof kitDraftSchema>;
export function parseKitDraft(
  raw: string,
): { status: "valid"; value: KitDraft } | { status: "invalid"; raw: string } {
  try {
    if (byteLength(raw) > INQUIRY_MAX_BYTES) throw new Error();
    return { status: "valid", value: kitDraftSchema.parse(JSON.parse(raw)) };
  } catch {
    return { status: "invalid", raw };
  }
}
export function migrateKitDraft(raw: string, createId: () => string): KitDraft {
  if (byteLength(raw) > INQUIRY_MAX_BYTES)
    throw new Error("Lista antiga inválida.");
  const input = JSON.parse(raw);
  const items = Array.isArray(input)
    ? migrateInquiryV1(raw, createId).items
    : z
        .object({ formatVersion: z.literal(2), items: inquiryItemsSchema })
        .strict()
        .parse(input).items;
  if (items.some((i) => i.kitInstanceId))
    throw new Error("A lista antiga não contém grupos de kit.");
  return kitDraftSchema.parse({
    formatVersion: 3,
    revision: createId(),
    selection: {
      schemaVersion: 2,
      items: ensureInquiryLineIds(items, createId),
      groups: [],
    },
  });
}
export type KitHistoryState = {
  past: KitSelection[];
  present: KitSelection;
  future: KitSelection[];
};
export type KitHistoryAction =
  | { type: "commit" | "reset"; selection: KitSelection }
  | { type: "undo" | "redo" };
export function createKitHistory(selection: KitSelection): KitHistoryState {
  return { past: [], present: parseKitSelection(selection), future: [] };
}
const commercial = (selection: KitSelection) =>
  JSON.stringify([
    selection.items
      .map((i) => [i.lineId, inquiryKey(i), i.quantity])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    selection.groups
      .map((g) => [g.instanceId, g.kitId, g.commercialRevision])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ]);
function restored(from: KitSelection, to: KitSelection) {
  if (commercial(from) === commercial(to)) return parseKitSelection(to);
  return parseKitSelection({
    ...to,
    items: to.items.map((i) => ({ ...i, seenPrice: null })),
    groups: to.groups.map((g) => ({
      ...g,
      seenPrice: null,
      commercialRevision: null,
    })),
  });
}
export function kitHistoryReducer(
  state: KitHistoryState,
  action: KitHistoryAction,
): KitHistoryState {
  if (action.type === "reset") return createKitHistory(action.selection);
  if (action.type === "commit") {
    const next = parseKitSelection(action.selection);
    if (JSON.stringify(next) === JSON.stringify(state.present)) return state;
    return {
      past: [...state.past, state.present].slice(-50),
      present: next,
      future: [],
    };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous
      ? {
          past: state.past.slice(0, -1),
          present: restored(state.present, previous),
          future: [state.present, ...state.future].slice(0, 50),
        }
      : state;
  }
  const next = state.future[0];
  return next
    ? {
        past: [...state.past, state.present].slice(-50),
        present: restored(state.present, next),
        future: state.future.slice(1),
      }
    : state;
}
