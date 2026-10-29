import { expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { lockCatalog } from "@/server/catalog-memberships";
import { executeAdCommand } from "@/server/advertising/commands";
import { setupDatabase } from "./setup";
import { fixture } from "./fixtures";
setupDatabase();
it("observes real lock contention and prevents two operators overwriting the same version",async()=>{
  const {actor,product}=await fixture();
  const d=await executeAdCommand(actor,undefined,{action:"CREATE",operationKey:"create-operation-0001",productId:product.id,channel:"INSTAGRAM",internalName:"Concorrência"});
  let release!:()=>void, ready!:()=>void;
  const gate=new Promise<void>(r=>release=r), locked=new Promise<void>(r=>ready=r);
  const holding=db.$transaction(async tx=>{await lockCatalog(tx);ready();await gate;},{timeout:10000}); await locked;
  const observer=new PrismaClient();
  const pending=Promise.allSettled(["A","B"].map(body=>executeAdCommand(actor,d.id,{action:"UPDATE",expectedVersion:d.version,fields:{internalName:d.internalName,title:d.title,body,imageIds:d.imageIds}})));
  let observed=false;
  try {
    const start=Date.now();
    while(Date.now()-start<4000) {
      const [row]=await observer.$queryRaw<{count:bigint}[]>`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'`;
      if(Number(row.count)>=2){observed=true;break;}
      await new Promise(r=>setTimeout(r,10));
    }
  } finally {release();await holding;await observer.$disconnect();}
  const results=await pending;
  expect(observed).toBe(true);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect(results.find(r=>r.status==="rejected")).toMatchObject({reason:{code:"CONFLICT"}});
});
it("deduplicates simultaneous retries but permits intentional independent drafts",async()=>{
  const {actor,product}=await fixture(); const command={action:"CREATE",operationKey:"create-operation-0001",productId:product.id,channel:"WHATSAPP",internalName:"Teste"};
  const [a,b]=await Promise.all([executeAdCommand(actor,undefined,command),executeAdCommand(actor,undefined,command)]);
  expect(a.id).toBe(b.id);expect(await db.advertisingDraft.count()).toBe(1);
});
