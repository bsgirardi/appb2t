import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { recordAdjustment } from "@/server/finance/accounts";
import { adjustmentSchema } from "@/domain/finance/validation";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await recordAdjustment(actor, {
        ...adjustmentSchema
          .omit({ accountId: true })
          .parse(await jsonBody(request)),
        accountId: (await context.params).id,
      }),
    );
  });
}
