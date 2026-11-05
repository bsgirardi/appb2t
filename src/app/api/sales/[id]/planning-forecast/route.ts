import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningEndpoint, planningBody } from "@/server/planning/http";
import { getSaleForecast } from "@/server/planning/commercial-read";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return planningEndpoint(async () =>
    ok(
      await getSaleForecast(
        await requireActor(),
        (await context.params).id,
        await planningBody(request),
      ),
    ),
  );
}
