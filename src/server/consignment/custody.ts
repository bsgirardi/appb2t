import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { AppError,conflict } from "@/lib/errors";
import { custodyCommandSchema } from "@/domain/consignment/validation";
import { projectCustody } from "@/domain/consignment/quantities";
import type { CustodyStage } from "@/domain/consignment/types";
import { civilDateToDb } from "@/domain/commerce/dates";
import { checkDate } from "@/server/stock/movements";
import { lockProduction } from "@/server/production/locks";
import { originBalance,restrictedOriginSale } from "@/server/production/finished-stock";
import { runConsignmentCommand } from "./commands";
import { lockConsignment } from "./locks";
import { partnerRow } from "./partners";
import { requireConsignmentActor } from "./authorization";
import { assertAdmin } from "@/server/auth/authorization";
const invalid=(message:string):never=>{throw new AppError("VALIDATION",message);};
export async function allocationBalance(tx:Prisma.TransactionClient,id:string){
 const rows=await tx.consignmentEventAllocation.findMany({where:{shipmentAllocationId:id},include:{event:true},orderBy:{event:{sequence:"asc"}}});
 return projectCustody(rows.filter(r=>r.event.fromStage||r.event.toStage).map(r=>({from:r.event.fromStage as CustodyStage|null,to:r.event.toStage as CustodyStage|null,units:r.units})));
}
export async function readCustodyBalance(tx:Prisma.TransactionClient,partnerId:string,originIds:string[]){
 const allocations=await tx.consignmentShipmentAllocation.findMany({where:{originId:{in:originIds},line:{shipment:{partnerId}}}});
 return Promise.all(allocations.map(async a=>({...await allocationBalance(tx,a.id),shipmentAllocationId:a.id,originId:a.originId})));
}
export async function shipmentRow(tx:Prisma.TransactionClient,id:string){
 const s=await tx.consignmentShipment.findUnique({where:{id},include:{lines:{include:{allocations:{include:{origin:true}},product:{select:{name:true}}}},events:{include:{allocations:true},orderBy:{sequence:"asc"}}}});
 if(!s)throw new AppError("NOT_FOUND","Remessa não encontrada.");
 return s;
}
export async function shipmentDTO(tx:Prisma.TransactionClient,id:string){
 const s=await shipmentRow(tx,id);
 return {...s,createdAt:s.createdAt.toISOString(),lines:s.lines.map(l=>({...l,allocations:l.allocations.map(({origin,...a})=>({...a,stockId:origin.stockId}))})),events:s.events.map(e=>({...e,effectiveDate:e.effectiveDate.toISOString().slice(0,10),createdAt:e.createdAt.toISOString()})),balances:await Promise.all(s.lines.flatMap(l=>l.allocations.map(async a=>({shipmentAllocationId:a.id,originId:a.originId,productId:l.productId,...await allocationBalance(tx,a.id)}))))};
}
export type ShipmentDTO=Awaited<ReturnType<typeof shipmentDTO>>;
export async function executeCustodyCommand(actor:Actor,raw:unknown):Promise<ShipmentDTO>{
 const v=custodyCommandSchema.parse(raw);
 if(v.type==="LOSS"||v.type==="COMPENSATE")assertAdmin(actor);
 return runConsignmentCommand(actor,v.type,v,async tx=>{
  if(v.type==="LOSS"||v.type==="COMPENSATE")await requireConsignmentActor(tx,actor,true);
  if(v.type==="SAVE_DRAFT"){
    await lockConsignment(tx,{partnerId:v.partnerId,shipmentIds:v.id?[v.id]:[]});
    const p=await partnerRow(tx,v.partnerId);
    if(!p.active||!p.customer.active)invalid("Parceiro inativo para novas remessas.");
    const old=v.id?await shipmentRow(tx,v.id):null;
    if(old?(old.version!==v.expectedVersion||old.partnerId!==p.id||old.status!=="DRAFT"):v.expectedVersion!==0)throw conflict();
    if(new Set(v.lines.map(l=>l.productId)).size!==v.lines.length)invalid("Produto repetido.");
    const origins=v.lines.flatMap(l=>l.allocations.map(a=>a.originId));
    if(new Set(origins).size!==origins.length)invalid("Origem repetida.");
    for(const l of v.lines){
      const product=await tx.product.findUnique({where:{id:l.productId}});
      if(!product?.active)invalid("Produto indisponível.");
      for(const a of l.allocations){
        const o=await tx.finishedOrigin.findUnique({where:{id:a.originId},include:{stock:true}});
        if(!o||o.stock.productId!==l.productId||!o.stock.active||!o.stock.inventoriedAt||await restrictedOriginSale(tx,a.originId))invalid("Origem inelegível para consignação.");
      }
    }
    const id=old?.id??(await tx.consignmentShipment.create({data:{partnerId:p.id,actorId:actor.id,notes:v.notes}})).id;
    if(old){await tx.consignmentShipmentAllocation.deleteMany({where:{line:{shipmentId:id}}});await tx.consignmentShipmentLine.deleteMany({where:{shipmentId:id}});await tx.consignmentShipment.update({where:{id},data:{notes:v.notes,version:{increment:1}}});}
    for(const l of v.lines)await tx.consignmentShipmentLine.create({data:{shipmentId:id,productId:l.productId,units:l.allocations.reduce((n,a)=>n+a.units,0),allocations:{create:l.allocations}}});
    await tx.consignmentEvent.create({data:{partnerId:p.id,shipmentId:id,kind:"SAVE_DRAFT",effectiveDate:new Date(),actorId:actor.id,actorName:actor.name}});
    return shipmentDTO(tx,id);
  }
  const pre=await shipmentRow(tx,v.id);
  await lockConsignment(tx,{partnerId:pre.partnerId,shipmentIds:[v.id]});
  const s=await shipmentRow(tx,v.id);
  if(s.version!==v.expectedVersion)throw conflict();
  const p=await partnerRow(tx,s.partnerId);
  if(v.type==="CANCEL_DRAFT"){
    if(s.status!=="DRAFT")invalid("Resolva a remessa expedida por retorno ou perda.");
    await tx.consignmentShipment.update({where:{id:s.id},data:{status:"CANCELED",version:{increment:1}}});
    await tx.consignmentEvent.create({data:{partnerId:p.id,shipmentId:s.id,kind:v.type,reason:v.reason,effectiveDate:new Date(),actorId:actor.id,actorName:actor.name}});
    return shipmentDTO(tx,s.id);
  }
  checkDate(v.effectiveDate,v.reason);
  const all=s.lines.flatMap(l=>l.allocations);
  await lockProduction(tx,{finishedIds:all.map(a=>a.origin.stockId)});
  let from:CustodyStage|null=null,to:CustodyStage|null=null;
  let inputs:{shipmentAllocationId:string;units:number}[]=[];
  let source:Awaited<ReturnType<typeof tx.consignmentEvent.findUnique>>=null;
  if(v.type==="DISPATCH"){
    if(s.status!=="DRAFT"||!p.active||!p.customer.active)invalid("Remessa não pode ser expedida.");
    for(const l of s.lines){
      const product=await tx.product.findUnique({where:{id:l.productId}});
      if(!product?.active)invalid("Produto inativo.");
      for(const a of l.allocations){
        const stock=await tx.finishedStock.findUniqueOrThrow({where:{id:a.origin.stockId}});
        if(!stock.active||!stock.inventoriedAt||await restrictedOriginSale(tx,a.originId)||a.units>Number((await originBalance(tx,a.originId)).available))invalid("Peças disponíveis insuficientes ou origem restrita.");
      }
    }
    to="outbound";inputs=all.map(a=>({shipmentAllocationId:a.id,units:a.units}));
  }else{
    if(s.status!=="DISPATCHED")invalid("Remessa não expedida.");
    inputs=v.allocations;
    if(v.type==="RECEIVE"){from="outbound";to="partner";}
    if(v.type==="RETURN"){from=v.stage;to="inbound";}
    if(v.type==="CONFIRM_RETURN"){from="inbound";to=null;}
    if(v.type==="LOSS"){from=v.stage;to="lost";}
    if(v.type==="COMPENSATE"){
      source=await tx.consignmentEvent.findUnique({where:{id:v.sourceId}});
      if(!source||source.shipmentId!==s.id||!["RECEIVE","CONFIRM_RETURN","LOSS"].includes(source.kind))invalid("Compense recebimento, conferência de retorno ou perda; demais fatos exigem retorno.");
      from=source!.toStage as CustodyStage|null;to=source!.fromStage as CustodyStage|null;
      for(const a of inputs){
        const original=await tx.consignmentEventAllocation.findUnique({where:{eventId_shipmentAllocationId:{eventId:source!.id,shipmentAllocationId:a.shipmentAllocationId}}});
        const compensated=await tx.consignmentEventAllocation.aggregate({where:{shipmentAllocationId:a.shipmentAllocationId,event:{sourceId:source!.id}},_sum:{units:true}});
        if(!original||a.units>original.units-(compensated._sum.units??0))invalid("Compensação excede movimento líquido.");
        if(source!.kind!=="LOSS"&&await tx.consignmentEventAllocation.findFirst({where:{shipmentAllocationId:a.shipmentAllocationId,event:{sequence:{gt:source!.sequence},sourceId:null}}}))invalid("Resolva os movimentos dependentes antes de compensar.");
      }
    }
  }
  if(new Set(inputs.map(a=>a.shipmentAllocationId)).size!==inputs.length)invalid("Alocação repetida.");
  for(const a of inputs){
    const allocation=all.find(o=>o.id===a.shipmentAllocationId);
    if(!allocation)invalid("Alocação de outra remessa.");
    const state=await allocationBalance(tx,a.shipmentAllocationId);
    if(from&&state[from]<a.units)invalid("Saldo insuficiente no estágio informado.");
    if(!from&&v.type==="COMPENSATE"&&a.units>Number((await originBalance(tx,allocation!.originId)).available))invalid("Peças retornadas já utilizadas.");
  }
  const e=await tx.consignmentEvent.create({data:{partnerId:p.id,shipmentId:s.id,kind:v.type,fromStage:from,toStage:to,sourceId:source?.id,effectiveDate:civilDateToDb(v.effectiveDate),actorId:actor.id,actorName:actor.name,reason:v.reason,receiver:v.type==="RECEIVE"?v.receiver:""}});
  for(const a of inputs){
    const origin=all.find(o=>o.id===a.shipmentAllocationId)!;
    let internalMovementId:string|undefined;
    if(v.type==="DISPATCH"||v.type==="CONFIRM_RETURN"||(v.type==="COMPENSATE"&&source?.kind==="CONFIRM_RETURN")){
      const delta=v.type==="CONFIRM_RETURN"?a.units:-a.units;
      const m=await tx.finishedMovement.create({data:{originId:origin.originId,kind:delta>0?"CONSIGNMENT_RETURN":"CONSIGNMENT_OUT",units:delta,actorId:actor.id,reason:v.reason,effectiveDate:e.effectiveDate}});
      internalMovementId=m.id;
      await tx.finishedStock.update({where:{id:origin.origin.stockId},data:{version:{increment:1}}});
    }
    await tx.consignmentEventAllocation.create({data:{eventId:e.id,shipmentAllocationId:a.shipmentAllocationId,units:a.units,internalMovementId}});
  }
  await tx.consignmentShipment.update({where:{id:s.id},data:{version:{increment:1},...(v.type==="DISPATCH"?{status:"DISPATCHED",snapshot:JSON.parse(JSON.stringify({customer:p.customer,location:p.location}))}:{})}});
  return shipmentDTO(tx,s.id);
 });
}
