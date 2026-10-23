import { z } from "zod";
export const artOperationSchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9:_-]+$/);
export const artDraftSchema = z
  .object({
    operationKey: artOperationSchema,
    instructions: z.string().trim().max(4000),
  })
  .strict();
export const artPackageSchema = artDraftSchema.extend({
  sourceLineIds: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(20)
    .refine((v) => new Set(v).size === v.length, "Linha repetida."),
});
export const artDraftUpdateSchema = artDraftSchema.extend({
  expectedVersion: z.number().int().positive(),
});
