import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import {
  profitabilityEndpoint,
  profitabilityBody,
} from "@/server/profitability/http";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
export async function POST(request: Request) {
  return profitabilityEndpoint(async () => {
    const actor = await requireActor();
    await requireProfitabilityAdmin(actor);
    return ok(
      await saveProfitabilityRevision(actor, await profitabilityBody(request)),
    );
  });
}
