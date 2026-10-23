import { z } from "zod";
import {
  catalogContactSchema,
  attemptKeySchema,
} from "@/domain/catalog-requests/validation";
import { inquiryItemsSchema } from "@/domain/products/inquiry";
import {
  kitGroupInputSchema,
  parseKitSelection,
} from "@/domain/kits/selection";
import { installmentSchema } from "@/domain/commerce/validation";
export {
  checkoutPolicySchema,
  readCheckoutPolicy,
  deliveryModeSchema,
} from "./policy";
const text = (max: number) => z.string().trim().min(1).max(max);
export const checkoutAddressSchema = z
  .object({
    recipient: text(120),
    postalCode: z.string().regex(/^\d{8}$/),
    street: text(160),
    number: text(30),
    complement: z.string().trim().max(120).default(""),
    district: text(100),
    city: text(100),
    state: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const checkoutDeliverySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("PICKUP") }).strict(),
  z
    .object({
      mode: z.literal("TEAM_SHIPPING"),
      address: checkoutAddressSchema,
    })
    .strict(),
  z
    .object({ mode: z.literal("AUTOMATIC"), address: checkoutAddressSchema })
    .strict(),
]);
export const checkoutDraftSchema = z
  .object({
    contact: catalogContactSchema,
    items: inquiryItemsSchema.refine((v) => v.length > 0),
    schemaVersion: z.literal(2).optional(),
    groups: z.array(kitGroupInputSchema).max(20).optional(),
    delivery: checkoutDeliverySchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    try {
      parseKitSelection({
        schemaVersion: 2,
        items: v.items,
        groups: v.groups ?? [],
      });
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Revise os grupos e componentes do kit.",
      });
    }
  });
export const checkoutDecisionSchema = z
  .object({
    operationKey: attemptKeySchema,
    expectedVersion: z.number().int().positive(),
    fingerprint: attemptKeySchema,
    name: text(120).min(2),
    agreed: z.literal(true),
  })
  .strict();
export const checkoutQuotePublicationSchema = z
  .object({
    operationKey: attemptKeySchema,
    expectedQuoteVersion: z.number().int().positive(),
    installments: z.array(installmentSchema).min(1).max(120),
  })
  .strict();
export const checkoutCancellationSchema = z
  .object({ operationKey: attemptKeySchema, reason: text(2000).min(3) })
  .strict();
