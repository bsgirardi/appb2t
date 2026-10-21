import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { saveKit } from "@/server/kits/service";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor(),
      { id } = await context.params;
    return ok(
      await saveKit(
        actor,
        id,
        await jsonBody(request, { maxBytes: 256 * 1024 }),
      ),
    );
  });
}
