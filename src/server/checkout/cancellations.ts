import type {Actor} from "@/server/auth/session";
import type {CheckoutPrincipal,CheckoutPublicDetail} from "@/domain/checkout/types";
import {db} from "@/lib/db";
import {AppError,conflict} from "@/lib/errors";
import {checkoutCancellationSchema} from "@/domain/checkout/validation";
import {runCheckoutCommand,lockCheckout,checkoutEvent} from "./commands";
import {assertCheckoutActor} from "./access";
import {detailWithClient} from "./queries";
import {lockPlanning} from "@/server/planning/coordination";
import {cancelSaleWithClient} from "@/server/sales";
export async function requestCheckoutCancellation(p:CheckoutPrincipal,reason:string,key:string):Promise<CheckoutPublicDetail>{
 const input=checkoutCancellationSchema.parse({reason,operationKey:key});
 return runCheckoutCommand(p,"REQUEST_CANCELLATION",key,input,async(tx,id)=>{
  const c=await tx.checkout.findUniqueOrThrow({where:{id}});if(!c.acceptedAt || c.state==="CLOSED")throw conflict();
  const pending=await tx.checkoutCancellation.findFirst({where:{checkoutId:id,state:"PENDING"}});
  if(!pending){await tx.checkoutCancellation.create({data:{checkoutId:id,reason:input.reason}});await tx.checkout.update({where:{id},data:{version:{increment:1}}});await checkoutEvent(tx,id,"REQUEST_CANCELLATION","Cliente",input.reason);}
  return detailWithClient(tx,id);
 });
}
export async function resolveCheckoutCancellation(actor:Actor,id:string,version:number,decision:"COMPLETE"|"DECLINE",reason:string):Promise<CheckoutPublicDetail>{
 if(reason.trim().length<3 || reason.length>2000)throw new AppError("VALIDATION","Informe a resposta ao cliente.");
 return db.$transaction(async tx=>{
  await assertCheckoutActor(tx,actor);await lockPlanning(tx);const c=await lockCheckout(tx,id);if(c.version!==version)throw conflict();
  const pending=await tx.checkoutCancellation.findFirst({where:{checkoutId:id,state:"PENDING"}});if(!pending)throw conflict();
  if(decision==="COMPLETE") {
   if(c.saleId){const sale=await tx.sale.findUniqueOrThrow({where:{id:c.saleId}});if(sale.status!=="CANCELADA")await cancelSaleWithClient(tx,actor,sale.id,sale.version,reason);}
   else if(c.requestId){await tx.catalogRequest.update({where:{id:c.requestId},data:{state:"ENCERRADA",version:{increment:1}}});}
   await tx.checkoutOffer.updateMany({where:{checkoutId:id,active:true},data:{active:false}});
  }
  await tx.checkoutCancellation.update({where:{id:pending.id},data:{state:decision==="COMPLETE"?"COMPLETED":"DECLINED",response:reason}});
  await tx.checkout.update({where:{id},data:{...(decision==="COMPLETE"?{state:"CLOSED"}:{}),version:{increment:1}}});
  await checkoutEvent(tx,id,decision==="COMPLETE"?"CANCELLED":"DECLINE_CANCELLATION",actor.name,reason,actor.id);
  return detailWithClient(tx,id);
 },{timeout:20000});
}
