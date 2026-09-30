import { z } from "zod";
import {
  parseMoney,
  civilDateSchema,
  positiveMoneySchema,
} from "@/domain/commerce/validation";
import { paginationSchema } from "@/domain/shared/pagination";
export const entrySchema = z
  .object({
    kind: z.enum(["RECEIVABLE", "PAYABLE"]),
    description: z.string().trim().min(2).max(1000),
    counterparty: z.string().trim().min(2).max(160),
    customerId: z.string().min(1).max(100).nullable().optional(),
    categoryId: z.string().min(1).max(100),
    amount: positiveMoneySchema,
    dueDate: civilDateSchema,
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
export const financeFilterSchema = paginationSchema.extend({
  dateFrom: civilDateSchema.optional(),
  dateTo: civilDateSchema.optional(),
  accountId: z.string().max(100).optional(),
  categoryId: z.string().max(100).optional(),
  kind: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
  state: z.enum(["ABERTO", "PARCIAL", "LIQUIDADO", "CANCELADO"]).optional(),
  counterparty: z.string().trim().max(160).optional(),
  overdue: z.enum(["true", "false"]).optional(),
  saleId: z.string().max(100).optional(),
  groupId: z.string().max(100).optional(),
});
export type FinanceFilter = z.infer<typeof financeFilterSchema>;
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
