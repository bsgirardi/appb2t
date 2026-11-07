import { z } from "zod";
import Decimal from "decimal.js";
import { decimalSchema } from "@/domain/calculation/validation";
import { parseCivilDate } from "@/domain/commerce/dates";

export const competenceSchema = z
  .string()
  .regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, "Informe mês e ano válidos.");
const percent = decimalSchema.refine(
  (v) => new Decimal(v).lt(100),
  "A alíquota deve ser menor que 100%.",
);
const money = decimalSchema.refine(
  (v) => new Decimal(v).decimalPlaces() <= 2,
  "Use até duas casas decimais.",
);
export const taxValuesSchema = z
  .object({
    regime: z.enum(["MEI", "SIMPLES"]),
    startsAt: competenceSchema,
    endsAt: competenceSchema,
    percent: percent.nullable(),
    monthlyDas: money.nullable(),
    scope: z.string().trim().min(5).max(240),
    productsConfirmed: z.literal(true),
    channelsReviewed: z.literal(true),
    source: z.string().trim().min(3).max(500),
    checkedOn: z.string().refine((v) => {
      try {
        parseCivilDate(v);
        return true;
      } catch {
        return false;
      }
    }, "Data inválida."),
    verification: z.enum(["INFORMED", "CHECKED"]),
    reason: z.string().trim().min(5).max(500),
    replacesId: z.string().min(1).max(100).nullable(),
  })
  .strict();
function validValues(v: z.infer<typeof taxValuesSchema>) {
  return (
    v.startsAt <= v.endsAt &&
    (v.regime === "MEI"
      ? v.percent === null && v.monthlyDas !== null
      : v.percent !== null && v.monthlyDas === null)
  );
}
export const taxProfileSchema = taxValuesSchema
  .extend({ id: z.string(), revision: z.number().int().positive() })
  .refine(
    validValues,
    "Confira vigência e informe somente DAS no MEI ou alíquota no Simples.",
  );
export const taxWriteSchema = taxValuesSchema
  .extend({ expectedVersion: z.number().int().nonnegative() })
  .refine(
    validValues,
    "Confira vigência e informe somente DAS no MEI ou alíquota no Simples.",
  );
export const publicTaxProfileSchema = z
  .object({
    id: z.string().min(1),
    revision: z.number().int().positive(),
    regime: z.enum(["MEI", "SIMPLES"]),
    startsAt: competenceSchema,
    endsAt: competenceSchema,
    percent: percent.nullable(),
    scope: z.string().max(240),
    replacesId: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.startsAt <= v.endsAt &&
      (v.regime === "MEI" ? v.percent === null : v.percent !== null),
    "Premissa fiscal inválida.",
  );
export const taxPremiseSchema = z
  .object({
    algorithm: z.literal(1),
    competence: competenceSchema,
    operation: z.enum(["PRODUCT", "OTHER"]),
    profile: publicTaxProfileSchema.nullable(),
  })
  .strict();
export const taxRequestSchema = z
  .object({
    competence: competenceSchema,
    operation: z.enum(["PRODUCT", "OTHER"]),
    expectedVersion: z.number().int().nonnegative(),
    profileId: z.string().min(1).nullable().optional(),
  })
  .strict();
