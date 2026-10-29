import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listAdDrafts } from "@/server/advertising/queries";
import { executeAdCommand } from "@/server/advertising/commands";
import { adBody } from "@/server/advertising/http";
import { adQuerySchema } from "@/domain/advertising/validation";
export function GET(request:Request) {return endpoint(async()=>{const actor=await requireActor();return ok(await listAdDrafts(actor,adQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))));});}
export function POST(request:Request) {return endpoint(async()=>{const actor=await requireActor();return ok(await executeAdCommand(actor,undefined,await adBody(request)));});}
