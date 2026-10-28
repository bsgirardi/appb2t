import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getOpportunity } from "@/server/opportunities/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () =>
    ok(await getOpportunity(await requireActor(), (await context.params).id)),
  );
}
