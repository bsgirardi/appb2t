import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { saveCollection } from "@/server/collections";
import { readCollectionRequest } from "@/lib/collection-request";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { input, image } = await readCollectionRequest(request);
    return ok(
      await saveCollection(actor, (await context.params).id, input, image),
    );
  });
}
