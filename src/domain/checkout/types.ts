import type { z } from "zod";
import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";
import type { KitGroupSnapshot } from "@/domain/kits/types";
import type { InstallmentInput } from "@/domain/commerce/types";
import type {
  checkoutDraftSchema,
  checkoutPolicySchema,
  checkoutDecisionSchema,
  checkoutQuotePublicationSchema,
} from "./validation";
export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;
export type CheckoutOfferPolicy = z.infer<typeof checkoutPolicySchema>;
export type CheckoutDecisionInput = z.infer<typeof checkoutDecisionSchema>;
export type CheckoutQuotePublicationInput = z.infer<
  typeof checkoutQuotePublicationSchema
>;
export type DeliveryMode = CheckoutOfferPolicy["deliveryModes"][number];
export type CheckoutPrincipal = {
  sessionId: string;
  checkoutId: string | null;
};
export interface CheckoutReviewContent {
  route: "DIRECT" | "REVIEW";
  lines: CatalogLineSnapshot[];
  groups: KitGroupSnapshot[];
  delivery: CheckoutDraft["delivery"];
  pickupAddress: string;
  shipping: string | null;
  discount: string;
  total: string | null;
  paymentTerms: string;
  installments: InstallmentInput[];
  reasons: string[];
  deliveryModes: DeliveryMode[];
  contact: CheckoutDraft["contact"];
  validUntil?: string;
}
export interface CheckoutReview extends CheckoutReviewContent {
  id: string;
  version: number;
  fingerprint: string;
}
export interface CheckoutReceipt {
  checkoutId: string;
  protocol: string;
  acceptedAt: string;
  state: string;
  saleNumber: string | null;
}
export interface CheckoutPublicDetail {
  review: CheckoutReview;
  receipt: CheckoutReceipt | null;
  cancellation: { state: string; reason: string; response: string } | null;
}
