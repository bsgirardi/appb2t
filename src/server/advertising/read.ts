import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import type { AdDraftDTO, AdSourceSnapshot } from "@/domain/advertising/types";
import { reviewIssues } from "@/domain/advertising/states";
import { getAdSource } from "./source";
export async function readAdDraft(tx:Prisma.TransactionClient,id:string):Promise<AdDraftDTO> {
  const row=await tx.advertisingDraft.findUnique({where:{id},include:{exports:{take:1,orderBy:[{createdAt:"desc"},{id:"desc"}],select:{draftVersion:true,createdAt:true}}}});
  if(!row) throw new AppError("NOT_FOUND","Rascunho não encontrado.");
  const source=row.source as unknown as AdSourceSnapshot, imageIds=row.imageIds as string[];
  const currentSource=await getAdSource(tx,row.productId);
  return {id:row.id,productId:row.productId,channel:row.channel,internalName:row.internalName,title:row.title,body:row.body,imageIds,status:row.status,version:row.version,source,currentSource,...reviewIssues({...row,source,imageIds},currentSource),reviewedAt:row.reviewedAt?.toISOString()??null,updatedAt:row.updatedAt.toISOString(),lastExport:row.exports[0]?{draftVersion:row.exports[0].draftVersion,createdAt:row.exports[0].createdAt.toISOString()}:null};
}
