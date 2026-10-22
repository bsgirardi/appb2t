import { z } from "zod";
import type { KitPlacement } from "./types";
export const kitPlacementSchema = z
  .object({
    lineId: z.string().min(1).max(100),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    z: z.number().int().min(0).max(19),
  })
  .strict();
export function validatePlacements(
  lineIds: string[],
  placements: KitPlacement[],
): KitPlacement[] {
  const parsed = z.array(kitPlacementSchema).max(20).parse(placements);
  if (
    new Set(lineIds).size !== lineIds.length ||
    parsed.length !== lineIds.length ||
    new Set(parsed.map((p) => p.lineId)).size !== parsed.length ||
    parsed.some((p) => !lineIds.includes(p.lineId))
  )
    throw new Error(
      "A composição deve conter uma posição para cada linha do kit.",
    );
  return parsed
    .sort(
      (a, b) =>
        a.z - b.z || (a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0),
    )
    .map((p, z) => ({ ...p, z }));
}
