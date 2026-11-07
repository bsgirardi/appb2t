import Decimal from "decimal.js";
import { z } from "zod";
import { taxPremiseSchema, taxRequestSchema } from "@/domain/tax/validation";
import {
  decimalSchema,
  printerValuesSchema,
} from "@/domain/calculation/validation";
export const refSchema = z
  .object({
    id: z.string().min(1).max(100),
    version: z.number().int().positive(),
  })
  .strict();
const name = z.string().trim().min(1).max(120);
const percent = decimalSchema.refine(
  (v) => new Decimal(v).lte(100),
  "Use um percentual de 0 a 100.",
);
const margin = decimalSchema.refine(
  (v) => new Decimal(v).lt(100),
  "A margem deve ser menor que 100%.",
);
const minutes = decimalSchema.refine(
  (v) => new Decimal(v).lte(6000000),
  "Tempo acima do limite.",
);
export const quantitySchema = z.number().int().min(1).max(100000);
export const feesSchema = z
  .array(z.object({ label: name, percent }).strict())
  .max(20)
  .refine(
    (rows) =>
      rows.reduce((sum, row) => sum.plus(row.percent), new Decimal(0)).lt(100),
    "A soma das taxas deve ser menor que 100%.",
  );
export const pricingSettingsSchema = z
  .object({
    energyRate: decimalSchema,
    maintenancePerHour: decimalSchema,
    failurePercent: percent,
    laborPerHour: decimalSchema,
    markupPercent: decimalSchema,
    targetMarginPercent: margin,
  })
  .strict();
export const pricingV2Schema = z
  .object({
    version: z.literal(2),
    tax: taxPremiseSchema.optional(),
    technology: z.enum(["FDM", "RESIN"]),
    quantity: quantitySchema,
    materials: z
      .array(
        z
          .object({
            ref: refSchema,
            name,
            unit: z.enum(["G", "ML"]),
            pricePerBase: decimalSchema,
            consumptionPerUnit: decimalSchema,
            fixedWaste: decimalSchema,
          })
          .strict(),
      )
      .min(1)
      .max(20),
    printer: printerValuesSchema.extend({ ref: refSchema, name }).strict(),
    machineFixedMinutes: minutes,
    machineMinutesPerUnit: minutes,
    ...pricingSettingsSchema.shape,
    setupMinutes: minutes,
    finishingMinutesPerUnit: minutes,
    extras: z
      .array(
        z
          .object({
            ref: refSchema,
            name,
            basis: z.enum(["LOT", "UNIT"]),
            quantity: decimalSchema,
            unitCost: decimalSchema,
          })
          .strict(),
      )
      .max(30),
    channel: z
      .object({
        ref: refSchema,
        name,
        fees: feesSchema,
        fixedCost: decimalSchema,
      })
      .strict(),
    mode: z.enum(["MARKUP", "CONTRIBUTION", "INFORMED"]),
    informedUnitPrice: decimalSchema.refine(
      (v) => new Decimal(v).decimalPlaces() <= 2,
      "Informe o preço com até duas casas decimais.",
    ),
  })
  .strict()
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    let useful = new Decimal(0);
    for (const [i, m] of v.materials.entries()) {
      if (m.unit !== (v.technology === "FDM" ? "G" : "ML"))
        issue(
          ["materials", i, "unit"],
          "Unidade incompatível com a tecnologia.",
        );
      useful = useful.plus(m.consumptionPerUnit);
      if (
        new Decimal(m.consumptionPerUnit)
          .times(v.quantity)
          .plus(m.fixedWaste)
          .gt(1000000)
      )
        issue(
          ["materials", i, "consumptionPerUnit"],
          "Consumo total acima de 1.000.000 por material.",
        );
    }
    if (!useful.gt(0)) issue(["materials"], "Informe consumo útil positivo.");
    const time = new Decimal(v.machineFixedMinutes).plus(
      new Decimal(v.machineMinutesPerUnit).times(v.quantity),
    );
    if (!time.gt(0) || time.gt(6000000))
      issue(
        ["machineFixedMinutes"],
        "Informe tempo total positivo de até 100.000 horas.",
      );
    const fee = v.channel.fees.reduce(
      (a, x) => a.plus(x.percent),
      new Decimal(0),
    );
    if (v.mode === "CONTRIBUTION" && fee.plus(v.targetMarginPercent).gte(100))
      issue(
        ["targetMarginPercent"],
        "Margem e taxas devem somar menos de 100%.",
      );
  });
export const pricingRequestSchema = z
  .object({
    tax: taxRequestSchema.optional(),
    technology: z.enum(["FDM", "RESIN"]),
    quantity: quantitySchema,
    materials: z
      .array(
        z
          .object({
            ref: refSchema,
            consumptionPerUnit: decimalSchema,
            fixedWaste: decimalSchema,
          })
          .strict(),
      )
      .min(1)
      .max(20),
    printerRef: refSchema,
    machineFixedMinutes: minutes,
    machineMinutesPerUnit: minutes,
    setupMinutes: minutes,
    finishingMinutesPerUnit: minutes,
    extras: z
      .array(
        z
          .object({
            ref: refSchema,
            basis: z.enum(["LOT", "UNIT"]),
            quantity: decimalSchema,
          })
          .strict(),
      )
      .max(30),
    channelRef: refSchema,
    mode: z.enum(["MARKUP", "CONTRIBUTION", "INFORMED"]),
    informedUnitPrice: decimalSchema,
    expectedSettingsVersion: z.number().int().positive(),
  })
  .strict();
