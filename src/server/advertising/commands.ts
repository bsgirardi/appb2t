import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockCatalog } from "@/server/catalog-memberships";
import { lockOperation } from "@/server/commerce/locks";
import { adCommandSchema, adVersionSchema } from "@/domain/advertising/validation";
import { assertAdTransition } from "@/domain/advertising/states";
import { suggestAd } from "@/domain/advertising/suggestions";
import { assertAdActor } from "./locks";
import { getAdSource } from "./source";
import { readAdDraft } from "./read";
const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
export async function executeAdCommand(actor:Actor,id:string|undefined,raw:unknown) {
  const input=adCommandSchema.parse(raw);
  if((input.action==="CREATE")!==!id) throw new AppError("VALIDATION","Ação incompatível com o rascunho.");
  return db.$transaction(async tx=>{
    if(input.action==="CREATE") await lockOperation(tx,`ad:${actor.id}:${input.operationKey}`);
    await lockCatalog(tx); await assertAdActor(tx,actor);
    if(input.action==="CREATE") {
      const creationHash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const prior=await tx.advertisingDraft.findUnique({where:{createdById_creationKey:{createdById:actor.id,creationKey:input.operationKey}}});
      if(prior) {if(prior.creationHash!==creationHash) throw conflict();return readAdDraft(tx,prior.id);}
      const source=await getAdSource(tx,input.productId), suggestion=suggestAd(source,input.channel);
      if(!source.images.length) throw new AppError("VALIDATION","Cadastre ao menos uma foto na ficha do produto.");
      const row=await tx.advertisingDraft.create({data:{productId:input.productId,channel:input.channel,internalName:input.internalName,title:suggestion.title,body:suggestion.body,imageIds:source.images.slice(0,10).map(i=>i.id),source:json(source),createdById:actor.id,updatedById:actor.id,creationKey:input.operationKey,creationHash}});
      return readAdDraft(tx,row.id);
    }
    await tx.$queryRaw`SELECT id FROM "AdvertisingDraft" WHERE id=${id!} FOR UPDATE`;
    const d=await readAdDraft(tx,id!);
    if(d.version!==input.expectedVersion) throw conflict();
    assertAdTransition(d.status,input.action);
    const data:Prisma.AdvertisingDraftUpdateInput={version:{increment:1},updatedBy:{connect:{id:actor.id}},status:"DRAFT",reviewedVersion:null,reviewedAt:null,reviewedBy:{disconnect:true}};
    switch(input.action) {
      case "UPDATE": {
        if(input.fields.imageIds.some(photo=>!d.currentSource.images.some(i=>i.id===photo)&&!d.imageIds.includes(photo))) throw new AppError("VALIDATION","Selecione apenas fotos deste produto.");
        Object.assign(data,input.fields);break;
      }
      case "REVIEW":
        if(d.productChanged||d.missingPhotoIds.length||!d.imageIds.length) throw new AppError("CONFLICT","Confira a ficha e as fotos antes de revisar.");
        data.status="REVIEWED";data.reviewedVersion=d.version+1;data.reviewedAt=new Date();data.reviewedBy={connect:{id:actor.id}};break;
      case "ARCHIVE": data.status="ARCHIVED";break;
      case "REFRESH_KEEP": data.source=json(d.currentSource);break;
      case "REFRESH_REGENERATE": {
        const suggestion=suggestAd(d.currentSource,d.channel);data.source=json(d.currentSource);data.title=suggestion.title;data.body=suggestion.body;break;
      }
    }
    await tx.advertisingDraft.update({where:{id:d.id},data});
    return readAdDraft(tx,d.id);
  });
}
export async function copyAdText(actor:Actor,id:string,expectedVersion:number) {
  adVersionSchema.parse({expectedVersion});
  return db.$transaction(async tx=>{await assertAdActor(tx,actor);const d=await readAdDraft(tx,id);
    if(d.version!==expectedVersion||!d.reviewIsCurrent) throw new AppError("CONFLICT","Revise a versão atual antes de copiar ou exportar.");
    return {text:`${d.title}\n\n${d.body}`,version:d.version};
  },{isolationLevel:"RepeatableRead"});
}
