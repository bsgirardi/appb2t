import Decimal from "decimal.js";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { parseCivilDate } from "./dates";
export const MONEY_MAX = "9999999999999999.99";
export function parseMoney(
  raw: string,
  options: { positive?: boolean; signed?: boolean } = {},
): string {
  if (
    typeof raw !== "string" ||
    !(
      options.signed ? /^-?\d{1,16}([.,]\d{1,2})?$/ : /^\d{1,16}([.,]\d{1,2})?$/
    ).test(raw.trim())
  )
    throw new AppError(
      "VALIDATION",
      "Informe um valor monetário com até duas casas decimais.",
    );
  const value = new Decimal(raw.trim().replace(",", "."));
  if (value.abs().gt(MONEY_MAX) || (options.positive && !value.gt(0)))
    throw new AppError(
      "VALIDATION",
      "Valor monetário fora do limite permitido.",
    );
  return value.toFixed(2);
}
export const moneySchema = z.string().transform((value, ctx) => {
  try {
    return parseMoney(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Valor monetário inválido." });
    return z.NEVER;
  }
});
export const positiveMoneySchema = moneySchema.refine(
  (v) => new Decimal(v).gt(0),
  "Informe um valor positivo.",
);
export const civilDateSchema = z.string().transform((value, ctx) => {
  try {
    return parseCivilDate(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Data inválida." });
    return z.NEVER;
  }
});
export const itemSchema = z
  .object({
    lineId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .optional(),
    productId: z.string().min(1).max(100).optional(),
    description: z.string().trim().min(1).max(1000),
    quantity: z.number().int().min(1).max(100000),
    unitPrice: positiveMoneySchema,
  })
  .strict();
export const documentSchema = z
  .object({
    customerId: z.string().min(1).max(100),
    items: z.array(itemSchema).min(1).max(100),
    discount: moneySchema,
    shipping: moneySchema,
    paymentTerms: z.string().trim().min(1).max(2000),
    internalNotes: z.string().trim().max(2000),
  })
  .strict();
export const quoteSchema = documentSchema.extend({
  validUntil: civilDateSchema,
});
export const quoteDraftSchema = quoteSchema.partial();
export const installmentSchema = z
  .object({
    number: z.number().int().min(1).max(120),
    amount: positiveMoneySchema,
    dueDate: civilDateSchema,
  })
  .strict();

export const costBindingsSchema = z
  .array(
    z
      .object({
        lineId: z.string().min(1).max(100),
        snapshotId: z.string().min(1).max(100),
      })
      .strict(),
  )
  .max(100);
