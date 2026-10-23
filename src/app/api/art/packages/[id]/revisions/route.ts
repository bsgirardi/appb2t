import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { createArtRevision } from "@/server/art/revisions";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () =>
    ok(
      await createArtRevision(
        await requireActor(),
        (await context.params).id,
        await jsonBody(request),
      ),
    ),
  );
}
