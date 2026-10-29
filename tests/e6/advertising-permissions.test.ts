import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { fixture } from "./fixtures";
import { setupDatabase } from "./setup";
import { executeAdCommand } from "@/server/advertising/commands";
import { getAdDraft } from "@/server/advertising/queries";
import { GET, POST } from "@/app/api/anuncios/route";
import { GET as detail } from "@/app/api/anuncios/[id]/route";
import { POST as update } from "@/app/api/anuncios/[id]/comandos/route";
import { POST as copy } from "@/app/api/anuncios/[id]/copiar/route";
import { GET as products } from "@/app/api/anuncios/produtos/route";
const { auth }=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock("@/server/auth/guards",()=>({requireActor:auth}));
setupDatabase(); afterEach(()=>vi.unstubAllEnvs());
it("requires authentication on every private route and does not expose drafts",async()=>{
  auth.mockRejectedValue(new AppError("UNAUTHENTICATED","Entre na sua conta."));
  const context={params:Promise.resolve({id:"private-id"})}, request=new Request("http://localhost/anuncios");
  const responses=await Promise.all([GET(request),POST(request),detail(request,context),update(request,context),copy(request,context),products(request)]);
  for(const response of responses) {expect(response.status).toBe(401); expect(response.headers.get("Cache-Control")).toBe("no-store");}
});
it("validates origin, request limits, source ownership and active actors",async()=>{
  vi.stubEnv("APP_URL","http://localhost:3118");
  const {actor,product}=await fixture(); auth.mockResolvedValue(actor);
  const command={action:"CREATE",operationKey:"create-operation-0001",productId:product.id,channel:"WHATSAPP",internalName:"Teste"};
  const req=(body:unknown,origin="http://localhost:3118")=>new Request("http://localhost:3118/api/anuncios",{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body)});
  expect((await POST(req(command,"https://foreign.example"))).status).toBe(403);
  expect((await POST(req({stuff:"x".repeat(33000)}))).status).toBe(422);
  expect((await POST(req({...command,channel:"FACEBOOK"}))).status).toBe(422);
  const response=await POST(req(command));expect(response.status).toBe(200);
  const d=(await response.json()).data;
  const other=await db.product.create({data:{name:"Outro",description:"Outra",calculation:{},paymentTerms:"Pix",price:"30",images:{create:{bytes:product.images[0].bytes,mimeType:"image/webp",position:0}}},include:{images:true}});
  await expect(executeAdCommand(actor,d.id,{action:"UPDATE",expectedVersion:d.version,fields:{internalName:d.internalName,title:d.title,body:d.body,imageIds:[other.images[0].id]}})).rejects.toMatchObject({code:"VALIDATION"});
  await db.user.update({where:{id:actor.id},data:{active:false}});
  await expect(getAdDraft(actor,d.id)).rejects.toMatchObject({code:"FORBIDDEN"});
  await expect(executeAdCommand(actor,undefined,{...command,operationKey:"create-operation-0002"})).rejects.toMatchObject({code:"FORBIDDEN"});
});
