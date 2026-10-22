import type { InquiryItem, InquiryLine } from "@/domain/products/inquiry";
export type { QuantityTier } from "@/domain/products/quantity-pricing";
export type KitDiscountTier = { minQuantity: number } & (
  { kind: "PERCENT"; percent: string } | { kind: "FIXED"; amount: string }
);
export type KitPlacement = { lineId: string; x: number; y: number; z: number };
export type KitPrice = {
  kind: "REFERENCE" | "CONSULT";
  quantity: number;
  knownSubtotal: string;
  subtotal: string | null;
  discount: string | null;
  total: string | null;
  tier: KitDiscountTier | null;
};
export type KitGroupInput = {
  instanceId: string;
  kitId: string;
  commercialRevision: number | null;
  placements: KitPlacement[];
  seenPrice: KitPrice | null;
};
export type KitSelection = {
  schemaVersion: 2;
  items: InquiryItem[];
  groups: KitGroupInput[];
};
export type KitDefinitionInput = {
  name: string;
  description: string;
  active: boolean;
  position: number;
  productIds: string[];
  tiers: KitDiscountTier[];
};
export type KitDTO = KitDefinitionInput & {
  id: string;
  version: number;
  commercialRevision: number;
};
export type KitGroupSnapshot = {
  schemaVersion: 1;
  instanceId: string;
  kitId: string;
  name: string;
  commercialRevision: number;
  tiers: KitDiscountTier[];
  lineIds: string[];
  placements: KitPlacement[];
  images: { lineId: string; imageId: string | null; imageUrl: string | null }[];
  price: KitPrice;
};
export type KitGroupReview = KitGroupInput & {
  name: string;
  currentRevision: number | null;
  price: KitPrice | null;
  problem: string | null;
  requiresConfirmation: boolean;
};
export type KitSelectionReview = {
  lines: InquiryLine[];
  groups: KitGroupReview[];
  ready: boolean;
  knownTotal: string;
  total: string | null;
  consultCount: number;
};
