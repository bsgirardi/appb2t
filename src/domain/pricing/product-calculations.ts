import { z } from "zod";
import { calculationSchema } from "@/domain/calculation/validation";
import type { StoredProductCalculation } from "./types";
export const storedCalculationSchema = z.union([
  z
    .object({ version: z.literal(2), snapshotId: z.string().min(1).max(100) })
    .strict(),
  calculationSchema,
]);
export function isBatchCalculation(
  value: StoredProductCalculation,
): value is { version: 2; snapshotId: string } {
  return "version" in value && value.version === 2;
}
