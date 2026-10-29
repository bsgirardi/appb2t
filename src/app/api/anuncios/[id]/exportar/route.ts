import { endpoint } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { exportAdDraft } from "@/server/advertising/export";
import { adVersionSchema } from "@/domain/advertising/validation";
import { adBody, type AdRouteContext } from "@/server/advertising/http";
export const runtime="nodejs";
export function POST(request:Request,context:AdRouteContext) {return endpoint(async()=>{
  const actor=await requireActor(); const input=adVersionSchema.parse(await adBody(request));
  const result=await exportAdDraft(actor,(await context.params).id,input.expectedVersion);
  return new Response(new Uint8Array(result.bytes),{headers:{"Content-Type":"application/zip","Content-Disposition":`attachment; filename="${result.filename}"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
});}
