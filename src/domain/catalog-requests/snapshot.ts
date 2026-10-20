import { z } from "zod";
import { configurationAnswersSchema } from "@/domain/products/configuration";
const id = z.string().min(1).max(100);
const money = z
  .string()
  .regex(/^\d{1,16}\.\d{2}$/)
  .nullable();
export const catalogLineSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    lineId: id,
    productId: id,
    commercialRevision: z.number().int().positive(),
    name: z.string().max(160),
    sku: z.string().max(100),
    color: z.string().max(60),
    size: z.string().max(60),
    answers: configurationAnswersSchema,
    answerLabels: z
      .array(
        z
          .object({
            fieldId: id,
            label: z.string().max(120),
            valueLabel: z.string().max(1000),
          })
          .strict(),
      )
      .max(8),
    quantity: z.number().int().min(1).max(99),
    priceKind: z.enum(["REFERENCE", "CONSULT"]),
    unitPrice: money,
    subtotal: money,
    included: z.string().max(1000),
    leadTimeCondition: z.string().max(240),
    productionLeadDays: z.number().int().nonnegative().nullable(),
    paymentTerms: z.string().max(2000),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.priceKind === "CONSULT" &&
        (v.unitPrice !== null || v.subtotal !== null)) ||
      (v.priceKind === "REFERENCE" &&
        (v.unitPrice === null || v.subtotal === null))
    )
      ctx.addIssue({
        code: "custom",
        message: "Natureza do preço recebido inválida.",
      });
  });
export const catalogLineOriginSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: id,
    sourceLineId: id,
    snapshot: catalogLineSnapshotSchema,
  })
  .strict();
