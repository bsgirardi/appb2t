import {expect,it} from "vitest";
import {db} from "@/lib/db";
import {executeAdCommand} from "@/server/advertising/commands";
import {listAdDrafts,listAdProducts} from "@/server/advertising/queries";
import {setupDatabase} from "./setup";
import {fixture} from "./fixtures";
setupDatabase();
it("paginates the library and source selector without modifying product or business rows",async()=>{
  const {actor,product}=await fixture();const before=await db.product.findUniqueOrThrow({where:{id:product.id},include:{images:true}});
  const d=await executeAdCommand(actor,undefined,{action:"CREATE",operationKey:"create-operation-0001",productId:product.id,channel:"INSTAGRAM",internalName:"Original"});
  await db.advertisingDraft.createMany({data:Array.from({length:21},(_,i)=>({productId:product.id,channel:"INSTAGRAM" as const,internalName:`Paginação ${i}`,title:d.title,body:d.body,imageIds:d.imageIds,source:JSON.parse(JSON.stringify(d.source)),createdById:actor.id,updatedById:actor.id,creationKey:`pagination-operation-${i}`,creationHash:"synthetic"}))});
  const first=await listAdDrafts(actor,{search:"Paginação",page:1}),last=await listAdDrafts(actor,{search:"Paginação",page:2});
  expect(first.total).toBe(21);expect(first.drafts).toHaveLength(20);expect(last.drafts).toHaveLength(1);expect(first.drafts.some(a=>a.id===last.drafts[0].id)).toBe(false);
  await db.product.createMany({data:Array.from({length:21},(_,i)=>({name:`Produto ${i}`,description:"Synthetic",paymentTerms:"",calculation:{},price:"10"}))});
  expect((await listAdProducts(actor,{search:"Produto",page:1})).products).toHaveLength(20);
  expect((await listAdProducts(actor,{search:"Produto",page:2})).products).toHaveLength(1);
  expect(await db.product.findUniqueOrThrow({where:{id:product.id},include:{images:true}})).toEqual(before);
  expect(await db.financialEntry.count()).toBe(0);expect(await db.sale.count()).toBe(0);expect(await db.finishedMovement.count()).toBe(0);
});
