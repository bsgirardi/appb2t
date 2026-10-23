import { defaultAppearance } from "@/domain/appearance/validation";
import { expect,it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { productInput } from "../fixtures/product";
import { createProduct } from "@/server/products";
import { checkoutDraftSchema } from "@/domain/checkout/validation";
import { reviewCheckout, checkoutFingerprint } from "@/server/checkout/review";
setupDatabase();
export async function checkoutFixture(directEnabled=true) {
 const actor=await seedUser();
 const product=await createProduct(actor,{...productInput,checkoutPolicy:{directEnabled,deliveryModes:["PICKUP","TEAM_SHIPPING"],externalPaymentInstructions:"Combine o pagamento com a equipe."}},{a:{bytes:new Uint8Array([1]),mimeType:"image/webp"}});
 await db.companyAppearance.upsert({where:{id:1},create:{...defaultAppearance,address:"Rua da Loja, 10",updatedById:actor.id},update:{address:"Rua da Loja, 10"}});
 const draft=checkoutDraftSchema.parse({contact:{name:"Ana",preferredChannel:"email",email:"ana@example.test",phone:""},items:[{productId:product.id,lineId:"ana",quantity:1,commercialRevision:product.commercialRevision,seenPrice:{kind:"REFERENCE",unit:"75.00",subtotal:"75.00"}}],delivery:{mode:"PICKUP"}});
 return {actor,product,draft};
}
it("resolves direct price from catalog and includes address in the accepted identity",async()=>{
 const {draft}=await checkoutFixture();
 const review=await db.$transaction(tx=>reviewCheckout(tx,draft));
 expect(review).toMatchObject({route:"DIRECT",shipping:"0.00",total:"75.00"});
 expect(review.installments).toHaveLength(1);
 const shipping={...review,delivery:{mode:"TEAM_SHIPPING" as const,address:{recipient:"Ana",postalCode:"01001000",street:"Rua A",number:"1",district:"Centro",city:"São Paulo",state:"SP",complement:""}}};
 expect(checkoutFingerprint(shipping)).not.toBe(checkoutFingerprint({...shipping,delivery:{...shipping.delivery,address:{...shipping.delivery.address,number:"2"}}}));
});

