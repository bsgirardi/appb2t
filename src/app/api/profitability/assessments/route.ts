import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import {
  profitabilityEndpoint,
  profitabilityBody,
} from "@/server/profitability/http";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import { recordAssessment } from "@/server/profitability/assessments";
export async function POST(request: Request) {
  return profitabilityEndpoint(async () => {
    const actor = await requireActor();
    await requireProfitabilityAdmin(actor);
    return ok(await recordAssessment(actor, await profitabilityBody(request)));
  });
}
