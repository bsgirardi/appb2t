import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningEndpoint, planningBody } from "@/server/planning/http";
import { getCommercialContext } from "@/server/planning/commercial-read";
import { previewCommercial } from "@/server/planning/commercial-preview";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return planningEndpoint(async () =>
    ok(
      await getCommercialContext(
        await requireActor(),
        (await context.params).id,
      ),
    ),
  );
}
export async function POST(request: Request, context: Context) {
  return planningEndpoint(async () =>
    ok(
      await previewCommercial(
        await requireActor(),
        (await context.params).id,
        await planningBody(request),
      ),
    ),
  );
}
