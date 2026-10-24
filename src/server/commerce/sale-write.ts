import type { Actor } from "@/server/auth/session";
import type { InstallmentInput } from "@/domain/commerce/types";
export type CommerceAuthor =
  | { kind: "ADMIN"; actor: Actor }
  | { kind: "CHECKOUT"; checkoutId: string; name: string };
export type ConfirmSaleCommand = {
  id: string;
  expectedVersion: number;
  rows: InstallmentInput[];
};
export type ConvertQuoteCommand = {
  quoteId: string;
  expectedVersion: number;
  rows: InstallmentInput[];
};
export { confirmSaleWithClient, convertQuoteWithClient } from "@/server/sales";
