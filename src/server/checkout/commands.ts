import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError,conflict } from "@/lib/errors";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import type { CheckoutPrincipal } from "@/domain/checkout/types";
import { attemptKeySchema } from "@/domain/catalog-requests/validation";
import { checkoutFingerprint } from "./review";
export const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function authorizedSession(tx:Prisma.TransactionClient,p:CheckoutPrincipal) {
 await tx.$queryRaw`SELECT id FROM "CheckoutSession" WHERE id=${p.sessionId} FOR UPDATE`;
 const s=await tx.checkoutSession.findUnique({where:{id:p.sessionId},include:{access:true}});
 if(!s || s.revokedAt || s.expiresAt<=new Date() || (p.checkoutId && p.checkoutId!==s.checkoutId) || (s.access && (s.access.revokedAt || s.access.expiresAt<=new Date() || s.access.checkoutId!==s.checkoutId))) throw new AppError("FORBIDDEN","Acesso expirado ou revogado. Solicite um novo link à equipe.");
 return s;
}
export async function lockCheckout(tx:Prisma.TransactionClient,id:string) {
 await tx.$queryRaw`SELECT id FROM "Checkout" WHERE id=${id} FOR UPDATE`;
 return tx.checkout.findUniqueOrThrow({where:{id}});
}
export async function runCheckoutCommand<T>(p:CheckoutPrincipal,type:string,key:string,payload:unknown,action:(tx:Prisma.TransactionClient,id:string)=>Promise<T>):Promise<T> {
 attemptKeySchema.parse(key);
 return db.$transaction(async tx=>{
  const s=await authorizedSession(tx,p); if(!s.checkoutId) throw new AppError("NOT_FOUND","Revise a seleção primeiro.");
  const operationKey=`checkout:${s.checkoutId}:${key}`;
  await lockOperation(tx,operationKey);await lockPlanning(tx);
  await lockCheckout(tx,s.checkoutId);
  const hash=checkoutFingerprint(payload);
  const old=await tx.checkoutOperation.findUnique({where:{key:operationKey}});
  if(old) {if(old.type!==type || old.payloadHash!==hash) throw conflict();return old.result as T;}
  const result=await action(tx,s.checkoutId);
  await tx.checkoutOperation.create({data:{key:operationKey,checkoutId:s.checkoutId,type,payloadHash:hash,result:json(result)}});
  return result;
 },{timeout:20000,maxWait:10000});
}
export async function checkoutEvent(tx:Prisma.TransactionClient,id:string,action:string,name:string,reason="",actorId?:string) {
 await tx.checkoutEvent.create({data:{checkoutId:id,action,actorName:name,reason,actorId}});
}
