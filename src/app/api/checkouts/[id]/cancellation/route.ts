import { requireActor } from "@/server/auth/guards";
import { jsonBody } from "@/lib/http";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import { z } from "zod";
import { resolveCheckoutCancellation } from "@/server/checkout/cancellations";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return checkoutEndpoint(async () => {
    const actor = await requireActor();
    const id = (await context.params).id;
    const input = z
      .object({
        expectedVersion: z.number().int().positive(),
        decision: z.enum(["COMPLETE", "DECLINE"]),
        reason: z.string().trim().min(3).max(2000),
      })
      .strict()
      .parse(await jsonBody(request));
    return checkoutResponse(
      await resolveCheckoutCancellation(
        actor,
        id,
        input.expectedVersion,
        input.decision,
        input.reason,
      ),
    );
  });
}
