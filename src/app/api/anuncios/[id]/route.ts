import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getAdDraft } from "@/server/advertising/queries";
import type { AdRouteContext } from "@/server/advertising/http";
export function GET(_request:Request,context:AdRouteContext) {return endpoint(async()=>{const actor=await requireActor();return ok(await getAdDraft(actor,(await context.params).id));});}
