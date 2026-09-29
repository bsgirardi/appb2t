import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listCollections, saveCollection } from "@/server/collections";
import { readCollectionRequest } from "@/lib/collection-request";
export async function GET() {
  return endpoint(async () => ok(await listCollections(await requireActor())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { input, image } = await readCollectionRequest(request);
    return ok(await saveCollection(actor, undefined, input, image));
  });
}
