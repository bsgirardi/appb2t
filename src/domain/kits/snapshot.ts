import { z } from "zod";
import { kitPlacementSchema, validatePlacements } from "./composition";
import { kitDiscountTiersSchema } from "./validation";
import { kitPriceSchema } from "./selection";
const id = z.string().min(1).max(100);
export const kitGroupSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    instanceId: id,
    kitId: id,
    name: z.string().max(160),
    commercialRevision: z.number().int().positive(),
    tiers: kitDiscountTiersSchema,
    lineIds: z.array(id).min(1).max(20),
    placements: z.array(kitPlacementSchema).max(20),
    images: z
      .array(
        z
          .object({
            lineId: id,
            imageId: id.nullable(),
            imageUrl: z.string().max(500).nullable(),
          })
          .strict(),
      )
      .max(20),
    price: kitPriceSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    try {
      validatePlacements(v.lineIds, v.placements);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Composição recebida inválida.",
      });
    }
    if (
      v.images.length !== v.lineIds.length ||
      new Set(v.images.map((i) => i.lineId)).size !== v.images.length ||
      v.images.some((i) => !v.lineIds.includes(i.lineId))
    )
      ctx.addIssue({ code: "custom", message: "Fotos recebidas inválidas." });
  });
export const kitRequestSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    groups: z.array(kitGroupSnapshotSchema).max(20),
  })
  .strict();
export const CATALOG_SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024;
