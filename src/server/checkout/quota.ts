import type {Prisma} from "@prisma/client";
import {db} from "@/lib/db";
import {AppError} from "@/lib/errors";
import {lockOperation} from "@/server/commerce/locks";
export async function consumeCheckoutQuotaTx(tx:Prisma.TransactionClient,key:string,max:number,windowMs=3600000) {
 await lockOperation(tx,`checkout-quota:${key}`);
 const old=await tx.checkoutQuota.findUnique({where:{key}});const now=new Date();
 if(!old || now.getTime()-old.windowStart.getTime()>=windowMs) {await tx.checkoutQuota.upsert({where:{key},create:{key,count:1,windowStart:now},update:{count:1,windowStart:now}});return;}
 if(old.count>=max)throw new AppError("RATE_LIMIT","Muitas tentativas. Aguarde antes de tentar novamente.");
 await tx.checkoutQuota.update({where:{key},data:{count:{increment:1}}});
}
export function consumeCheckoutQuota(key:string,max:number,windowMs?:number) {return db.$transaction(tx=>consumeCheckoutQuotaTx(tx,key,max,windowMs));}
