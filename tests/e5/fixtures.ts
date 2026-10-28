import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { seedUser } from "./setup";
export const key = () => randomBytes(20).toString("hex");
export async function fixture() {
  const actor = await seedUser();
  const customer = await db.customer.create({data:{name:"Parceiro sintético E5",type:"COMPANY"}});
  const product = await db.product.create({data:{name:"Peça E5",description:"Sintética",active:true,paymentTerms:"Pix",calculation:{},price:"100"}});
  const stock = await db.finishedStock.create({data:{productId:product.id,inventoriedAt:new Date()}});
  const origin = await db.finishedOrigin.create({data:{stockId:stock.id,kind:"OPENING",initialValue:"200",movements:{create:{kind:"OPENING",units:20,actorId:actor.id,effectiveDate:new Date("2026-10-28T00:00:00Z")}}}});
  return {actor,customer,product,stock,origin};
}
