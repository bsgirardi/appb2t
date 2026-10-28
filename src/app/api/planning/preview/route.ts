import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningBody, planningEndpoint } from "@/server/planning/http";
import { previewQueue } from "@/server/planning/queue-preview";
export async function POST(request: Request) {
  return planningEndpoint(async () => {
    const actor = await requireActor();
    return ok(await previewQueue(actor, await planningBody(request)));
  });
}
