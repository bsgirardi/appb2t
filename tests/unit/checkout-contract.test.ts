import { expect, it } from "vitest";
import { checkoutDraftSchema, checkoutPolicySchema, checkoutDecisionSchema } from "@/domain/checkout/validation";
const draft = {
  contact: { name: "Ana Silva", preferredChannel: "email", email: "ana@example.test", phone: "" },
  items: [{ productId: "p1", quantity: 1 }],
  delivery: { mode: "PICKUP" },
};
it("rejects client identity and monetary authority supplied by the visitor", () => {
  expect(checkoutDraftSchema.safeParse(draft).success).toBe(true);
  for (const extra of [{ customerId: "other" }, { total: "0.01" }, { installments: [] }])
    expect(checkoutDraftSchema.safeParse({ ...draft, ...extra }).success).toBe(false);
});
it("keeps legacy offers disabled and requires payment instructions to activate direct buying", () => {
  expect(checkoutPolicySchema.parse({}).directEnabled).toBe(false);
  expect(checkoutPolicySchema.safeParse({directEnabled:true,deliveryModes:["PICKUP"]}).success).toBe(false);
  expect(checkoutPolicySchema.safeParse({directEnabled:true,deliveryModes:["PICKUP"],externalPaymentInstructions:"Combine o pagamento com a equipe."}).success).toBe(true);
});
it("requires a full address for shipping and explicit agreement to the displayed version", () => {
  expect(checkoutDraftSchema.safeParse({...draft,delivery:{mode:"TEAM_SHIPPING"}}).success).toBe(false);
  const decision = { operationKey:"a".repeat(64), expectedVersion:1, fingerprint:"b".repeat(64), name:"Ana", agreed:true };
  expect(checkoutDecisionSchema.safeParse(decision).success).toBe(true);
  expect(checkoutDecisionSchema.safeParse({...decision,agreed:false}).success).toBe(false);
});
