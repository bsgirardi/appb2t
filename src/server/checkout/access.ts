import type { Actor } from "@/server/auth/session";
import type { CheckoutPrincipal } from "@/domain/checkout/types";
import { randomBytes,createHash,createHmac } from "node:crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {AppError,conflict} from "@/lib/errors";
import {appUrl} from "@/lib/env";
import {jsonBody} from "@/lib/http";
import {lockPlanning} from "@/server/planning/coordination";
import {lockOperation} from "@/server/commerce/locks";
import {attemptKeySchema} from "@/domain/catalog-requests/validation";
import {authorizedSession,checkoutEvent,lockCheckout,json} from "./commands";
import {checkoutResponse} from "./http";
import {readCheckoutCookie,checkoutCookie,draftCookie,scopedCookie} from "./cookies";
import {consumeCheckoutQuota} from "./quota";
export const checkoutHash=(value:string)=>createHash("sha256").update(value).digest("hex");
const expiry=()=>new Date(Date.now()+7*86400000);
function accessToken(id:string) {const key=process.env.CHECKOUT_ACCESS_KEY;if(!key || !/^[a-f0-9]{64,}$/i.test(key))throw new Error("CHECKOUT_ACCESS_KEY não configurada");return createHmac("sha256",key).update(`checkout:${id}`).digest("hex");}
export async function assertCheckoutActor(tx:import("@prisma/client").Prisma.TransactionClient,actor:Actor) {
 const users=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "User" WHERE id=${actor.id} AND active=true AND role::text=${actor.role} FOR SHARE`;
 if(!users.length)throw new AppError("FORBIDDEN","Acesso não autorizado.");
}
export async function issueCheckoutAccess(actor:Actor,id:string,key:string):Promise<{url:string;expiresAt:string}>{
 attemptKeySchema.parse(key);
 return db.$transaction(async tx=>{
  await assertCheckoutActor(tx,actor);const op=`checkout-access:${id}:${key}`;await lockOperation(tx,op);await lockPlanning(tx);await lockCheckout(tx,id);
  const old=await tx.checkoutOperation.findUnique({where:{key:op}});
  let access;
  if(old){access=await tx.checkoutAccess.findUniqueOrThrow({where:{id:(old.result as {accessId:string}).accessId}});if(access.revokedAt || access.expiresAt<=new Date())throw conflict();}
  else {
   await tx.checkoutAccess.updateMany({where:{checkoutId:id,revokedAt:null},data:{revokedAt:new Date()}});
   const accessId=randomBytes(16).toString("hex");access=await tx.checkoutAccess.create({data:{id:accessId,tokenHash:checkoutHash(accessToken(accessId)),checkoutId:id,expiresAt:expiry()}});
   await tx.checkoutOperation.create({data:{key:op,checkoutId:id,type:"ISSUE_ACCESS",payloadHash:checkoutHash(key),result:json({accessId})}});
   await checkoutEvent(tx,id,"ISSUE_ACCESS",actor.name,"",actor.id);
  }
  return {url:`${appUrl().origin}/portfolio/compra#${accessToken(access.id)}`,expiresAt:access.expiresAt.toISOString()};
 });
}
export async function exchangeCheckoutAccess(request:Request):Promise<Response>{
 const {token}=z.object({token:attemptKeySchema}).strict().parse(await jsonBody(request,{maxBytes:1024}));
 await consumeCheckoutQuota(`exchange:${checkoutHash("shared-edge")}`,30,900000);
 const result=await db.$transaction(async tx=>{
  const hash=checkoutHash(token);
  await tx.$queryRaw`SELECT id FROM "CheckoutAccess" WHERE "tokenHash"=${hash} FOR SHARE`;
  const a=await tx.checkoutAccess.findUnique({where:{tokenHash:hash}});
  if(!a || a.revokedAt || a.expiresAt<=new Date())throw new AppError("FORBIDDEN","Link expirado ou revogado. Solicite um novo link à equipe.");
  const secret=randomBytes(32).toString("hex");await tx.checkoutSession.create({data:{id:checkoutHash(secret),checkoutId:a.checkoutId,accessId:a.id,expiresAt:a.expiresAt}});
  return {checkoutId:a.checkoutId,secret};
 });
 const response=checkoutResponse({checkoutId:result.checkoutId});response.headers.append("Set-Cookie",checkoutCookie(scopedCookie(result.checkoutId),result.secret));return response;
}
export async function checkoutPrincipal(request:Request):Promise<CheckoutPrincipal>{
 const id=new URL(request.url).searchParams.get("checkoutId");
 if(id && !/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new AppError("FORBIDDEN","Acesso inválido.");
 const token=readCheckoutCookie(request,id?scopedCookie(id):draftCookie);
 if(!token)throw new AppError("FORBIDDEN","Abra o link privado ou inicie uma nova compra.");
 const p={sessionId:checkoutHash(token),checkoutId:id};await db.$transaction(tx=>authorizedSession(tx,p));return p;
}
export async function initializeCheckoutSession(request:Request):Promise<Response>{
 const {newPurchase}=z.object({newPurchase:z.boolean().default(false)}).strict().parse(await jsonBody(request,{maxBytes:1024}));
 if(!newPurchase){const token=readCheckoutCookie(request,draftCookie);if(token){try{await db.$transaction(tx=>authorizedSession(tx,{sessionId:checkoutHash(token),checkoutId:null}));return checkoutResponse({ready:true});}catch{/* Expired sessions need a new secret. */}}}
 await consumeCheckoutQuota(`session:${checkoutHash("shared-edge")}`,30);
 const token=randomBytes(32).toString("hex");await db.checkoutSession.create({data:{id:checkoutHash(token),expiresAt:expiry()}});
 const response=checkoutResponse({ready:true});response.headers.append("Set-Cookie",checkoutCookie(draftCookie,token));return response;
}
export async function revokeCheckoutAccess(actor:Actor,id:string,version:number):Promise<void>{
 await db.$transaction(async tx=>{await assertCheckoutActor(tx,actor);await lockPlanning(tx);const c=await lockCheckout(tx,id);if(c.version!==version)throw conflict();await tx.checkoutAccess.updateMany({where:{checkoutId:id,revokedAt:null},data:{revokedAt:new Date()}});await checkoutEvent(tx,id,"REVOKE_ACCESS",actor.name,"",actor.id);});
}
