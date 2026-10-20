import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getCatalogRequest } from "@/server/catalog-requests/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(await getCatalogRequest(actor, (await context.params).id));
  });
}
