import { z } from "zod";
import { paginationSchema } from "@/domain/shared/pagination";
export const customerSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    type: z.enum(["PERSON", "COMPANY"]),
    document: z
      .string()
      .max(100)
      .transform((s) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
      .pipe(z.string().max(32))
      .default(""),
    email: z.union([z.literal(""), z.email().max(254)]).default(""),
    phone: z.string().trim().max(50).default(""),
    address: z.string().trim().max(500).default(""),
    notes: z.string().trim().max(2000).default(""),
    active: z.boolean(),
  })
  .strict();
export const customerFilterSchema = paginationSchema.extend({
  active: z.enum(["all", "true", "false"]).default("all"),
});
export const customerStateSchema = z
  .object({ active: z.boolean(), expectedVersion: z.number().int().positive() })
  .strict();
