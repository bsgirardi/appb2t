import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { saveAccount } from "@/server/finance/accounts";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await saveAccount(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
