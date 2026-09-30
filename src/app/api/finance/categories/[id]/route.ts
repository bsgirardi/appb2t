import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { saveCategory } from "@/server/finance/categories";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await saveCategory(
        actor,
        (await context.params).id,
        await jsonBody(request),
      ),
    );
  });
}
