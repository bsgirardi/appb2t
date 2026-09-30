import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { convertQuote } from "@/server/sales";
import { confirmationSchema } from "@/domain/commerce/commands";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const input = confirmationSchema.parse(
      await jsonBody(request, { maxBytes: 262144 }),
    );
    return ok(
      await convertQuote(
        actor,
        (await context.params).id,
        input.expectedVersion,
        input.installments,
        input.operationKey,
      ),
    );
  });
}
