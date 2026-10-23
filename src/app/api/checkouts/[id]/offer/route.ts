import { requireActor } from "@/server/auth/guards";
import { jsonBody } from "@/lib/http";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import { checkoutQuotePublicationSchema } from "@/domain/checkout/validation";
import { publishCheckoutQuote } from "@/server/checkout/quotes";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return checkoutEndpoint(async () => {
    const actor = await requireActor();
    const id = (await context.params).id;
    const input = checkoutQuotePublicationSchema.parse(await jsonBody(request));
    return checkoutResponse(await publishCheckoutQuote(actor, id, input));
  });
}
