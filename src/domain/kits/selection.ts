import { z } from "zod";
import { CATALOG_MAX_KIT_QUANTITY } from "@/domain/products/quantity";
import { inquiryItemsSchema } from "@/domain/products/inquiry";
import { kitDiscountTierSchema } from "./validation";
import { kitPlacementSchema, validatePlacements } from "./composition";
import type { KitSelection } from "./types";
const money = z.string().regex(/^\d{1,16}\.\d{2}$/);
export const kitPriceSchema = z
  .object({
    kind: z.enum(["REFERENCE", "CONSULT"]),
    quantity: z.number().int().min(1).max(CATALOG_MAX_KIT_QUANTITY),
    knownSubtotal: money,
    subtotal: money.nullable(),
    discount: money.nullable(),
    total: money.nullable(),
    tier: kitDiscountTierSchema.nullable(),
  })
  .strict()
  .refine(
    (p) =>
      p.kind === "CONSULT"
        ? p.subtotal === null && p.discount === null && p.total === null
        : p.subtotal !== null && p.discount !== null && p.total !== null,
    "Referência do kit inválida.",
  );
export const kitGroupInputSchema = z
  .object({
    instanceId: z.string().min(1).max(100),
    kitId: z.string().min(1).max(100),
    commercialRevision: z.number().int().positive().nullable(),
    placements: z.array(kitPlacementSchema).max(20),
    seenPrice: kitPriceSchema.nullable(),
  })
  .strict();
const selectionSchema = z
  .object({
    schemaVersion: z.literal(2),
    items: inquiryItemsSchema,
    groups: z.array(kitGroupInputSchema).max(20),
  })
  .strict();
export function parseKitSelection(raw: unknown): KitSelection {
  const legacy = z
    .object({ items: inquiryItemsSchema })
    .strict()
    .safeParse(raw);
  const selection = legacy.success
    ? { schemaVersion: 2 as const, items: legacy.data.items, groups: [] }
    : selectionSchema.parse(raw);
  const ids = selection.groups.map((g) => g.instanceId);
  if (
    new Set(ids).size !== ids.length ||
    selection.items.some(
      (i) => i.kitInstanceId && !ids.includes(i.kitInstanceId),
    )
  )
    throw new Error("Grupo de kit inválido.");
  for (const group of selection.groups) {
    const rows = selection.items.filter(
      (i) => i.kitInstanceId === group.instanceId,
    );
    if (!rows.length || rows.some((i) => !i.lineId))
      throw new Error("Kit vazio ou linha sem identificação.");
    group.placements = validatePlacements(
      rows.map((i) => i.lineId!),
      group.placements,
    );
  }
  return selection;
}
