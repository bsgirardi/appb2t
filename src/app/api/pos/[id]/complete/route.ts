import { z } from "zod";
import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { completePosOrder } from "@/server/pos/orders";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const input = z
      .object({ expectedVersion: z.number().int().positive() })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await completePosOrder(
        actor,
        (await context.params).id,
        input.expectedVersion,
      ),
    );
  });
}
