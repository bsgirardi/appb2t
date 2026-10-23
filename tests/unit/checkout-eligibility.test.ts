import { expect, it } from "vitest";
import { resolveCheckoutEligibility } from "@/domain/checkout/eligibility";
const policy = {directEnabled:true,deliveryModes:["PICKUP","TEAM_SHIPPING","AUTOMATIC"] as const,externalPaymentInstructions:"Pagamento externo"};
it("intersects component delivery rules and never enables automatic rates without integration",()=>{
  expect(resolveCheckoutEligibility([{policy,active:true,consult:false},{policy:{...policy,deliveryModes:["PICKUP"]},active:true,consult:false}]).deliveryModes).toEqual(["PICKUP"]);
  expect(resolveCheckoutEligibility([{policy,active:true,consult:false}]).deliveryModes).toEqual(["PICKUP","TEAM_SHIPPING"]);
});
it("blocks a withdrawn component and sends unresolved prices or disabled offers to review",()=>{
  expect(resolveCheckoutEligibility([{policy,active:false,consult:false}]).blocked).toBe(true);
  expect(resolveCheckoutEligibility([{policy,active:true,consult:true}]).route).toBe("REVIEW");
  expect(resolveCheckoutEligibility([{policy:null,active:true,consult:false}]).route).toBe("REVIEW");
});
