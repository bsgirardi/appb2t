import { z } from "zod";
export const deliveryModeSchema = z.enum(["PICKUP", "TEAM_SHIPPING", "AUTOMATIC"]);
export const checkoutPolicySchema = z.object({
  directEnabled: z.boolean().default(false),
  deliveryModes: z.array(deliveryModeSchema).max(3).refine(v => new Set(v).size === v.length).default([]),
  externalPaymentInstructions: z.string().trim().max(2000).default(""),
}).strict().superRefine((v,ctx) => {
  if (v.directEnabled && (!v.externalPaymentInstructions || !v.deliveryModes.length))
    ctx.addIssue({code:"custom",message:"Defina entrega e instruções de pagamento para ativar a compra direta."});
});
export function readCheckoutPolicy(value: unknown) {
  return checkoutPolicySchema.parse(value ?? {});
}

