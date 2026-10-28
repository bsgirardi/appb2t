import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listOpportunityEvents } from "@/server/opportunities/queries";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () =>
    ok(
      await listOpportunityEvents(
        await requireActor(),
        (await context.params).id,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
