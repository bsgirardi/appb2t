import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getQuote, saveQuote } from "@/server/quotes";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(await getQuote(actor, (await context.params).id));
  });
}
export async function PUT(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveQuote(
        actor,
        (await context.params).id,
        await jsonBody(request, { maxBytes: 262144 }),
      ),
    );
  });
}
