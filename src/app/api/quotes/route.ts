import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listQuotes, saveQuote } from "@/server/quotes";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listQuotes(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveQuote(
        actor,
        undefined,
        await jsonBody(request, { maxBytes: 262144 }),
      ),
    );
  });
}
