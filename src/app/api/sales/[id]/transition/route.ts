import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { transitionSale } from "@/server/sales";
import { saleTransitionSchema } from "@/domain/commerce/commands";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const input = saleTransitionSchema.parse(await jsonBody(request));
    return ok(
      await transitionSale(
        actor,
        (await context.params).id,
        input.expectedVersion,
        input.status,
        input.reason,
      ),
    );
  });
}
