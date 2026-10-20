import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await prepareRequestQuote(
        actor,
        (await context.params).id,
        await jsonBody(request, { maxBytes: 262144 }),
      ),
    );
  });
}
