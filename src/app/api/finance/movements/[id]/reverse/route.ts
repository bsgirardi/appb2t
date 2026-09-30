import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { reverseAdjustment } from "@/server/finance/transfers";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await reverseAdjustment(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
