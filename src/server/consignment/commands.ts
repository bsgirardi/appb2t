import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { canonical } from "@/server/production/commands";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import { reconcilePlanningTx } from "@/server/planning/invariants";
import { operationKeySchema } from "@/domain/consignment/validation";
import { requireConsignmentActor } from "./authorization";
export async function runConsignmentCommand<T>(actor:Actor,type:string,raw:{operationKey:string},action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 const key=`consignment:${actor.id}:${operationKeySchema.parse(raw.operationKey)}`;
 const payloadHash=createHash("sha256").update(JSON.stringify(canonical(raw))).digest("hex");
 return db.$transaction(async tx=>{
   await requireConsignmentActor(tx,actor);
   await lockOperation(tx,key);
   await lockPlanning(tx);
   const old=await tx.consignmentCommand.findUnique({where:{key}});
   if(old){if(old.type!==type||old.payloadHash!==payloadHash)throw conflict();return old.result as T;}
   const result=JSON.parse(JSON.stringify(await action(tx)));
   await reconcilePlanningTx(tx);
   await tx.planningState.update({where:{id:1},data:{revision:{increment:1}}});
   await tx.consignmentCommand.create({data:{key,type,payloadHash,result,actorId:actor.id}});
   return result as T;
 },{timeout:30000});
}
