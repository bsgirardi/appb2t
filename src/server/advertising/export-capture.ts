import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { adVersionSchema } from "@/domain/advertising/validation";
import { assertAdActor } from "./locks";
import { readAdDraft } from "./read";
import { assertAdImageBudget, type AdExportCapture } from "./export-package";
export async function captureAdExport(actor:Actor,id:string,expectedVersion:number):Promise<AdExportCapture> {
  adVersionSchema.parse({expectedVersion});
  return db.$transaction(async tx=>{
    await assertAdActor(tx,actor);const d=await readAdDraft(tx,id);
    if(d.version!==expectedVersion||!d.reviewIsCurrent) throw new AppError("CONFLICT","Revise a versão atual antes de copiar ou exportar.");
    const sizes=await tx.$queryRaw<{id:string;size:number}[]>(Prisma.sql`SELECT id, octet_length(bytes) AS size FROM "ProductImage" WHERE "productId"=${d.productId} AND id IN (${Prisma.join(d.imageIds)})`);
    if(sizes.length!==d.imageIds.length) throw new AppError("CONFLICT","Há fotos ausentes. Revise a seleção.");
    assertAdImageBudget(sizes.map(row=>row.size));
    const images=await tx.productImage.findMany({where:{productId:d.productId,id:{in:d.imageIds}},select:{id:true,bytes:true}});
    const byId=new Map(images.map(i=>[i.id,i.bytes]));
    return {draftId:d.id,draftVersion:d.version,channel:d.channel,title:d.title,body:d.body,product:{id:d.productId,name:d.source.name,sku:d.source.sku},generatedAt:new Date().toISOString(),photos:d.imageIds.map((id,position)=>({id,position,bytes:new Uint8Array(byId.get(id)!)}))};
  },{isolationLevel:"RepeatableRead"});
}
