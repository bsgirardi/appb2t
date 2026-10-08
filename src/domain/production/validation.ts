import { z } from "zod";
import { commandMeta, stockQuantity } from "@/domain/stock/validation";
import { civilDateSchema } from "@/domain/commerce/validation";
export const unitCount = z.number().int().min(0).max(2147483647);
export const positiveUnits = unitCount.min(1);
export const id = z.string().min(1).max(100);
export const reason = z.string().trim().min(3).max(2000);
export const finishedSaveSchema = z
  .object({
    ...commandMeta,
    id: id.optional(),
    productId: id,
    active: z.boolean().default(true),
  })
  .strict();
export const finishedOpenSchema = z
  .object({
    ...commandMeta,
    stockId: id,
    units: unitCount,
    value: stockQuantity.nullable(),
    effectiveDate: civilDateSchema,
  })
  .strict();
export const finishedAdjustSchema = z
  .object({
    ...commandMeta,
    stockId: id,
    deltaUnits: z
      .number()
      .int()
      .min(-2147483647)
      .max(2147483647)
      .refine((v) => v !== 0),
    value: stockQuantity.nullable().optional(),
    effectiveDate: civilDateSchema,
    reason,
  })
  .strict();
