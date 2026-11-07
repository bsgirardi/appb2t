import type { z } from "zod";
import type {
  taxProfileSchema,
  taxPremiseSchema,
  publicTaxProfileSchema,
  taxRequestSchema,
} from "./validation";
export type TaxProfile = z.infer<typeof taxProfileSchema>;
export type PublicTaxProfile = z.infer<typeof publicTaxProfileSchema>;
export type TaxPremise = z.infer<typeof taxPremiseSchema>;
export type TaxRequest = z.infer<typeof taxRequestSchema>;
export interface TaxCatalog {
  version: number;
  profiles: PublicTaxProfile[];
}
export interface TaxProfilesDTO {
  version: number;
  profiles: (TaxProfile & { actorName: string; createdAt: string })[];
}
export interface TaxAmount {
  base: string;
  unrounded: string | null;
  amount: string | null;
  coverage: "ESTIMATED" | "UNAVAILABLE";
  reasons: string[];
}
export interface PricingTaxResult extends TaxAmount {
  contribution: string | null;
  afterDepreciation: string | null;
  margin: string | null;
}
