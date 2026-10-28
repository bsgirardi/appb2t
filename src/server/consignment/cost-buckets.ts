import type { Prisma } from "@prisma/client";
import { allocationBalance } from "./custody";
export async function readConsignmentCostBuckets(tx:Prisma.TransactionClient,originId:string){
 const allocations=await tx.consignmentShipmentAllocation.findMany({where:{originId},include:{sales:{include:{line:{include:{consignmentSale:true}}}},events:{include:{event:true}}},orderBy:{id:"asc"}});
 const buckets:{kind:string;id:string;units:number}[]=[];
 for(const a of allocations){
  const balance=await allocationBalance(tx,a.id);
  for(const stage of ["outbound","partner","inbound"] as const)if(balance[stage])buckets.push({kind:"CUSTODY",id:`${a.id}:${stage}`,units:balance[stage]});
  for(const sold of a.sales)if(sold.line.consignmentSale.status==="CONFIRMED")buckets.push({kind:"CONSIGNMENT_SOLD",id:sold.id,units:sold.units});
  for(const loss of a.events.filter(e=>e.event.kind==="LOSS")){
   const reversed=a.events.filter(e=>e.event.sourceId===loss.eventId).reduce((n,e)=>n+e.units,0);
   if(loss.units>reversed)buckets.push({kind:"CONSIGNMENT_LOSS",id:loss.id,units:loss.units-reversed});
  }
 }
 return buckets.sort((a,b)=>a.id.localeCompare(b.id));
}
