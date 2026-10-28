import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { executeOpportunityCommand } from "@/server/opportunities/commands";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await executeOpportunityCommand(
        actor,
        (await context.params).id,
        await jsonBody(request, { maxBytes: 32768 }),
      ),
    );
  });
}
