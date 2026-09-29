import { z } from "zod";
export const collectionSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000),
    active: z.boolean(),
    position: z.number().int().min(0).max(100000),
    productIds: z
      .array(z.string().min(1).max(100))
      .max(1000)
      .refine((ids) => new Set(ids).size === ids.length),
    removeImage: z.boolean().optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
