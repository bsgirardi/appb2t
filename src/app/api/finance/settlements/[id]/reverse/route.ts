import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { reverseSettlement } from "@/server/finance/settlements";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await reverseSettlement(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
