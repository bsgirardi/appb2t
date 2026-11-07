import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { readPosOrder, savePosOrder } from "@/server/pos/orders";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return endpoint(async () =>
    ok(await readPosOrder(await requireActor(), (await context.params).id)),
  );
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await savePosOrder(
        actor,
        (await context.params).id,
        await jsonBody(request, { maxBytes: 65536 }),
      ),
    );
  });
}
