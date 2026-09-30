import { z } from "zod";
import { parseMoney, civilDateSchema } from "@/domain/commerce/validation";
export const SALE_REVENUE_ID = "system-sale-revenue";
export const signedMoneySchema = z.string().transform((raw, ctx) => {
  try {
    return parseMoney(raw, { signed: true });
  } catch {
    ctx.addIssue({ code: "custom", message: "Valor monetário inválido." });
    return z.NEVER;
  }
});
export const accountSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    type: z.enum(["CASH", "BANK", "OTHER"]),
    openingBalance: signedMoneySchema,
    openingDate: civilDateSchema,
    active: z.boolean(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
export const categorySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    kind: z.enum(["REVENUE", "EXPENSE"]),
    active: z.boolean(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
export const adjustmentSchema = z
  .object({
    accountId: z.string().min(1).max(100),
    amount: signedMoneySchema.refine(
      (v) => v !== "0.00",
      "O ajuste não pode ser zero.",
    ),
    effectiveDate: civilDateSchema,
    reason: z.string().trim().min(3).max(2000),
    operationKey: z.string().min(8).max(160),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
