import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { executeAdCommand } from "@/server/advertising/commands";
import { adBody, type AdRouteContext } from "@/server/advertising/http";
export function POST(request:Request,context:AdRouteContext) {return endpoint(async()=>{const actor=await requireActor();return ok(await executeAdCommand(actor,(await context.params).id,await adBody(request)));});}
