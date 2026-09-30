import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getEntry, updateEntry } from "@/server/finance/entries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await getEntry(actor, (await context.params).id));
  });
}
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await updateEntry(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
