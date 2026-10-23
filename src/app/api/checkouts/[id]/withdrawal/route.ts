import { requireActor } from "@/server/auth/guards";
import { jsonBody } from "@/lib/http";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import { z } from "zod";
import { withdrawCheckoutOffer } from "@/server/checkout/quotes";
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
        reason: z.string().trim().min(3).max(2000),
      })
      .strict()
      .parse(await jsonBody(request));
    await withdrawCheckoutOffer(actor, id, input.expectedVersion, input.reason);
    return checkoutResponse({ withdrawn: true });
  });
}
