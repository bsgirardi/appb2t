import type { Prisma } from "@prisma/client";
import { makeAdSource } from "@/domain/advertising/source";
import { readProductConfiguration } from "@/domain/products/configuration";
import type { Availability } from "@/domain/products/commercial";
import { AppError } from "@/lib/errors";
export const adProductSelect = {id:true,version:true,name:true,sku:true,active:true,shortDescription:true,description:true,specifications:true,colors:true,sizes:true,availability:true,leadTimeDays:true,minimumQuantity:true,configuration:true,images:{select:{id:true,position:true},orderBy:{position:"asc" as const}}} as const;
export function adSourceOf(p:Prisma.ProductGetPayload<{select:typeof adProductSelect}>) {
  return makeAdSource({...p,sku:p.sku??"",availability:p.availability as Availability,personalizable:readProductConfiguration(p.configuration).fields.length>0,images:p.images.map(i=>({...i,url:`/api/products/${p.id}/images/${i.id}`}))});
}
export async function getAdSource(tx:Prisma.TransactionClient,id:string) {
  const p=await tx.product.findUnique({where:{id},select:adProductSelect});
  if(!p) throw new AppError("NOT_FOUND","Produto não encontrado.");
  return adSourceOf(p);
}
