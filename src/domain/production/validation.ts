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
export const orderLineSchema = z
  .object({
    id: id.optional(),
    saleLineKey: id.optional(),
    productId: id.optional(),
    description: z.string().trim().min(1).max(500),
    technology: z.enum(["FDM", "RESIN"]),
    targetUnits: positiveUnits,
    plannedPrinterId: id.nullable().optional(),
  })
  .strict();
export const orderSaveSchema = z
  .object({
    ...commandMeta,
    id: id.optional(),
    origin: z.enum(["SALE", "STOCK"]),
    saleId: id.nullable().optional(),
    responsibleId: id.nullable().optional(),
    dueDate: civilDateSchema.nullable().optional(),
    notes: z.string().max(2000).default(""),
    lines: z.array(orderLineSchema).min(1).max(100),
  })
  .strict();
export const orderActionSchema = z
  .object({ ...commandMeta, orderId: id })
  .strict();
export const orderReserveSchema = z
  .object({
    ...commandMeta,
    lineId: id,
    itemId: id,
    quantity: stockQuantity,
    effectiveDate: civilDateSchema,
  })
  .strict();
export const allocateReservationSchema = z
  .object({
    ...commandMeta,
    lineId: id,
    reservationId: id,
    reservationVersion: z.number().int().positive(),
    quantity: stockQuantity,
  })
  .strict();
export const releaseAllocationSchema = z
  .object({ ...commandMeta, allocationId: id, quantity: stockQuantity, reason })
  .strict();
export const reportSchema = z
  .object({
    ...commandMeta,
    lineId: id,
    executorId: id,
    printerId: id.nullable().optional(),
    manualStage: z.boolean().default(false),
    goodUnits: unitCount,
    failedUnits: unitCount,
    machineMinutes: stockQuantity.nullable(),
    setupMinutes: stockQuantity.nullable(),
    finishingMinutes: stockQuantity.nullable(),
    materialComplete: z.boolean(),
    timeComplete: z.boolean(),
    reprintOf: id.nullable().optional(),
    materials: z
      .array(
        z
          .object({
            itemId: id,
            reservationAllocationId: id.optional(),
            quantity: stockQuantity,
            allocations: z
              .array(
                z
                  .object({
                    identityId: id.nullable(),
                    quantity: stockQuantity,
                  })
                  .strict(),
              )
              .max(100)
              .optional(),
            allowExcess: z.boolean().default(false),
          })
          .strict(),
      )
      .max(100),
    effectiveDate: civilDateSchema,
  })
  .strict();
export const reserveFinishedSchema = z
  .object({
    ...commandMeta,
    saleVersion: z.number().int().positive(),
    saleId: id,
    lineKey: id,
    stockId: id,
    units: positiveUnits,
    originAllocations: z
      .array(z.object({ originId: id, units: positiveUnits }).strict())
      .min(1)
      .max(100),
  })
  .strict();
export const releaseFinishedSchema = z
  .object({ ...commandMeta, commitmentId: id, units: positiveUnits, reason })
  .strict();
export const deliverySchema = z
  .object({
    ...commandMeta,
    saleId: id,
    lines: z
      .array(
        z
          .object({
            lineKey: id,
            allocations: z
              .array(
                z.object({ commitmentId: id, units: positiveUnits }).strict(),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    effectiveDate: civilDateSchema,
    notes: z.string().max(2000).default(""),
  })
  .strict();
export const deliveryCorrectionSchema = z
  .object({
    ...commandMeta,
    deliveryId: id,
    lines: z
      .array(z.object({ deliveryLineId: id, units: positiveUnits }).strict())
      .min(1)
      .max(100),
    declaration: z.literal("ENTRY_ERROR"),
    effectiveDate: civilDateSchema,
    reason,
  })
  .strict();
export const cancelRemainderSchema = z
  .object({
    ...commandMeta,
    orderId: id,
    lines: z
      .array(
        z
          .object({
            lineId: id,
            unitsToCancel: unitCount,
            dispositions: z
              .array(
                z
                  .object({
                    originId: id,
                    units: positiveUnits,
                    action: z.enum(["KEEP_SALE", "RELEASE_STOCK", "LOSS"]),
                  })
                  .strict(),
              )
              .max(100),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason,
  })
  .strict();
export const adoptSchema = z
  .object({
    ...commandMeta,
    saleId: id,
    lines: z
      .array(
        z
          .object({
            saleItemId: id,
            lineKey: id.optional(),
            recognizedReadyUnits: unitCount,
            recognizedDeliveredUnits: unitCount,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason,
  })
  .strict();
export const productionCorrectionSchema = z
  .object({
    ...commandMeta,
    sourceEventId: id,
    goodUnitsToReverse: unitCount,
    failedUnitsToReverse: unitCount,
    machineMinutes: stockQuantity.nullable(),
    setupMinutes: stockQuantity.nullable(),
    finishingMinutes: stockQuantity.nullable(),
    returns: z
      .array(z.object({ linkId: id, quantity: stockQuantity }).strict())
      .max(100),
    declaration: z.enum(["ENTRY_ERROR", "PHYSICAL_MATERIAL_RETURN"]),
    effectiveDate: civilDateSchema,
    reason,
  })
  .strict();
