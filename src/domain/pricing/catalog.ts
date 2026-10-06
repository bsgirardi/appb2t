import { z } from "zod";
import { decimalSchema } from "@/domain/calculation/validation";
import { feesSchema, pricingSettingsSchema } from "./validation";
const version = { expectedVersion: z.number().int().min(0) };
const base = {
  id: z.string().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(120),
  active: z.boolean(),
  ...version,
};
export const pricingSettingsWriteSchema = pricingSettingsSchema
  .extend(version)
  .strict();
export const pricingChannelWriteSchema = z
  .object({ ...base, fees: feesSchema, fixedCost: decimalSchema })
  .strict();
export const pricingExtraWriteSchema = z
  .object({ ...base, unitCost: decimalSchema })
  .strict();
