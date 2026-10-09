import { z } from "zod";
import { civilDateSchema, moneySchema } from "@/domain/commerce/validation";
const id = z.string().min(1).max(100);
const declared = z.discriminatedUnion("state", [
  z.object({ state: z.literal("UNKNOWN") }).strict(),
  z.object({ state: z.literal("DECLARED"), value: moneySchema }).strict(),
]);
export const administrativeSchema = z
  .object({
    channel: z
      .object({
        id,
        version: z.number().int().positive(),
        name: z.string().min(1).max(200),
      })
      .strict()
      .nullable(),
    expectedShipping: declared,
    fees: declared,
    shipping: declared,
    extras: z
      .array(
        z
          .object({
            id,
            lineKey: id,
            reference: z.string().trim().min(1).max(200),
            description: z.string().trim().min(3).max(500),
            value: moneySchema,
            effectiveDate: civilDateSchema,
            notInProduction: z.literal(true),
          })
          .strict(),
      )
      .max(300),
    confirmations: z
      .array(
        z.discriminatedUnion("kind", [
          z
            .object({
              lineKey: id,
              extraKey: id,
              kind: z.literal("U3_SOURCE"),
              sourceId: id,
              value: moneySchema,
            })
            .strict(),
          z
            .object({
              lineKey: id,
              extraKey: id,
              kind: z.literal("COMPLEMENT"),
              complementId: id,
            })
            .strict(),
          z
            .object({
              lineKey: id,
              extraKey: id,
              kind: z.literal("NOT_OCCURRED"),
              reason: z.string().trim().min(3).max(2000),
            })
            .strict(),
        ]),
      )
      .max(300),
    lineReviews: z
      .array(
        z
          .object({ lineKey: id, sourceHash: id, complete: z.boolean() })
          .strict(),
      )
      .max(100),
    commercialPending: z.boolean(),
    commercialReason: z.string().trim().max(2000),
  })
  .strict()
  .superRefine((v, ctx) => {
    const duplicate = (values: string[]) =>
      new Set(values).size !== values.length;
    if (
      duplicate(v.extras.map((x) => x.id)) ||
      duplicate(v.extras.map((x) => x.reference.toLowerCase())) ||
      duplicate(v.confirmations.map((x) => `${x.lineKey}:${x.extraKey}`)) ||
      duplicate(v.lineReviews.map((x) => x.lineKey))
    )
      ctx.addIssue({ code: "custom", message: "Há referências duplicadas." });
    if (v.commercialPending && v.commercialReason.length < 3)
      ctx.addIssue({
        code: "custom",
        message: "Informe o motivo da pendência comercial.",
      });
  });
export const revisionSchema = z
  .object({
    saleId: id,
    operationKey: z.string().uuid(),
    expectedVersion: z.number().int().min(0),
    effectiveDate: civilDateSchema,
    reason: z.string().trim().min(3).max(2000),
    payload: administrativeSchema,
  })
  .strict();
export const assessmentSchema = z
  .object({ saleId: id, operationKey: z.string().uuid() })
  .strict();
