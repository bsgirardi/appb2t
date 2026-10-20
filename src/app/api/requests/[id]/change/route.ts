import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await changeCatalogRequest(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
