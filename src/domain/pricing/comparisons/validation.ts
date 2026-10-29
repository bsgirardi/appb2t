import { z } from "zod";
import Decimal from "decimal.js";
import { decimalSchema } from "@/domain/calculation/validation";
import { pricingRequestSchema, refSchema } from "../validation";
const cents = decimalSchema.refine(
  (v) => new Decimal(v).decimalPlaces() <= 2,
  "Use até duas casas decimais.",
);
export const comparisonReferenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CHANNEL") }).strict(),
  z.object({ kind: z.literal("COMMON"), unitPrice: cents }).strict(),
]);
export const comparisonAlternativesSchema = z
  .array(
    z
      .object({
        channelRef: refSchema,
        discountPercent: cents.refine(
          (v) => new Decimal(v).lte(100),
          "Use desconto de 0 a 100%.",
        ),
      })
      .strict(),
  )
  .min(1)
  .max(10)
  .transform((rows) =>
    rows.filter(
      (row, i) =>
        rows.findIndex(
          (r) =>
            r.channelRef.id === row.channelRef.id &&
            r.channelRef.version === row.channelRef.version &&
            r.discountPercent === row.discountPercent,
        ) === i,
    ),
  );
export const comparisonDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    request: pricingRequestSchema,
    reference: comparisonReferenceSchema,
    alternatives: comparisonAlternativesSchema,
  })
  .strict();
export const comparisonQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
