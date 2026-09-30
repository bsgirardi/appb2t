import { z } from "zod";
import { installmentSchema } from "./validation";
export const confirmationSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    installments: z.array(installmentSchema).min(1).max(120),
    operationKey: z.string().min(8).max(160),
  })
  .strict();
export const saleTransitionSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(["EM_PRODUCAO", "PRONTA", "ENTREGUE", "CANCELADA"]),
    reason: z.string().max(2000).optional(),
  })
  .strict();
