import { z } from "zod";
import { checkoutDecisionSchema } from "./validation";
const schema = checkoutDecisionSchema
  .omit({ name: true, agreed: true })
  .extend({ checkoutId: z.string().min(1).max(100) })
  .strict();
export type CheckoutAttempt = z.infer<typeof schema>;
const storageKey = "b2t:checkout:attempt:v1";
export function newCheckoutKey() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export function saveCheckoutAttempt(value: CheckoutAttempt) {
  sessionStorage.setItem(storageKey, JSON.stringify(schema.parse(value)));
}
export function readCheckoutAttempt(): CheckoutAttempt | null {
  const value = sessionStorage.getItem(storageKey);
  if (!value) return null;
  return schema.parse(JSON.parse(value));
}
export function clearCheckoutAttempt() {
  sessionStorage.removeItem(storageKey);
}
