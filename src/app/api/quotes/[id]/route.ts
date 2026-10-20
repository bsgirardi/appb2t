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
        // Authenticated drafts may contain 100 lines with immutable received
        // snapshots, including explicit duplicates. Keep the public intake at 256 KiB.
        await jsonBody(request, { maxBytes: 16 * 1024 * 1024 }),
      ),
    );
  });
}
