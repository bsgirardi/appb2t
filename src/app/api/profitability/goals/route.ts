import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import {
  profitabilityBody,
  profitabilityEndpoint,
} from "@/server/profitability/http";
import {
  readMonthlyGoal,
  saveMonthlyGoal,
} from "@/server/profitability/monthly-goals";
export async function GET(request: Request) {
  return profitabilityEndpoint(
    async () =>
      ok(
        await readMonthlyGoal(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
export async function POST(request: Request) {
  return profitabilityEndpoint(async () => {
    const actor = await requireActor();
    return ok(await saveMonthlyGoal(actor, await profitabilityBody(request)));
  });
}
