import { z } from "zod";
import {
  civilDateSchema,
  positiveMoneySchema,
} from "@/domain/commerce/validation";
import { commissionPercent } from "./commercial";
export const idSchema = z.string().min(1).max(100);
export const operationKeySchema = z.string().min(8).max(160);
export const unitSchema = z.number().int().min(1).max(2147483647);
export const percentSchema = z.string().transform((v, ctx) => {
  try {
    return commissionPercent(v);
  } catch {
    ctx.addIssue({ code: "custom", message: "Comissão inválida." });
    return z.NEVER;
  }
});
export const modelSchema = z.enum(["RETIDA", "SEPARADA"]);
const reason = z.string().trim().min(3).max(2000),
  notes = z.string().trim().max(2000).default("");
const meta = {
  operationKey: operationKeySchema,
  expectedVersion: z.number().int().nonnegative(),
};
const terms = {
  responsibleId: idSchema,
  location: z.string().trim().min(1).max(300),
  model: modelSchema,
  percent: percentSchema,
  dueDay: z.number().int().min(1).max(28),
  notes,
};
export const partnerCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...meta,
      ...terms,
      type: z.literal("CREATE"),
      customerId: idSchema,
    })
    .strict(),
  z
    .object({
      ...meta,
      ...terms,
      type: z.literal("UPDATE"),
      id: idSchema,
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...meta,
      type: z.literal("SET_PRODUCT_CONDITION"),
      id: idSchema,
      productId: idSchema,
      percent: percentSchema.nullable(),
      minimum: z.number().int().min(0).max(2147483647).nullable(),
    })
    .strict(),
]);
const allocations = z
  .array(
    z.object({ shipmentAllocationId: idSchema, units: unitSchema }).strict(),
  )
  .min(1)
  .max(100);
const movement = {
  ...meta,
  id: idSchema,
  effectiveDate: civilDateSchema,
  reason: notes,
};
export const custodyCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...meta,
      type: z.literal("SAVE_DRAFT"),
      id: idSchema.optional(),
      partnerId: idSchema,
      notes,
      lines: z
        .array(
          z
            .object({
              productId: idSchema,
              allocations: z
                .array(
                  z.object({ originId: idSchema, units: unitSchema }).strict(),
                )
                .min(1)
                .max(100),
            })
            .strict(),
        )
        .min(1)
        .max(100),
    })
    .strict(),
  z
    .object({ ...meta, type: z.literal("CANCEL_DRAFT"), id: idSchema, reason })
    .strict(),
  z.object({ ...movement, type: z.literal("DISPATCH") }).strict(),
  z
    .object({
      ...movement,
      type: z.literal("RECEIVE"),
      receiver: z.string().trim().min(1).max(200),
      allocations,
    })
    .strict(),
  z
    .object({
      ...movement,
      type: z.literal("RETURN"),
      reason,
      stage: z.enum(["outbound", "partner"]),
      allocations,
    })
    .strict(),
  z
    .object({
      ...movement,
      type: z.literal("CONFIRM_RETURN"),
      reason,
      allocations,
    })
    .strict(),
  z
    .object({
      ...movement,
      type: z.literal("LOSS"),
      reason,
      stage: z.enum(["outbound", "partner", "inbound"]),
      allocations,
    })
    .strict(),
  z
    .object({
      ...movement,
      type: z.literal("COMPENSATE"),
      reason,
      sourceId: idSchema,
      allocations,
    })
    .strict(),
]);
export const saleCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...meta,
      type: z.literal("SAVE_DRAFT"),
      id: idSchema.optional(),
      partnerId: idSchema,
      reference: z.string().trim().min(1).max(100),
      effectiveDate: civilDateSchema,
      notes,
      replacesId: idSchema.optional(),
      model: modelSchema,
      overrideReason: notes,
      lines: z
        .array(
          z
            .object({
              productId: idSchema,
              quantity: unitSchema,
              unitPrice: positiveMoneySchema,
              percent: percentSchema,
              allocations,
            })
            .strict(),
        )
        .min(1)
        .max(100),
    })
    .strict(),
  z
    .object({
      ...meta,
      type: z.literal("CONFIRM"),
      id: idSchema,
      reason: notes,
    })
    .strict(),
  z
    .object({ ...meta, type: z.literal("CANCEL"), id: idSchema, reason })
    .strict(),
]);
