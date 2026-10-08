import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { productionEndpoint } from "@/server/production/http";
import { getOrder } from "@/server/production/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return productionEndpoint(async () =>
    ok(await getOrder(await requireActor(), (await context.params).id)),
  );
}
