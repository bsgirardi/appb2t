import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getPosOrder, startPosOrder } from "@/server/pos/orders";
export async function GET() {
  return endpoint(async () => ok(await getPosOrder(await requireActor())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    await jsonBody(request);
    return ok(await startPosOrder(actor));
  });
}
