import { jsonBody } from "@/lib/http";
import { checkoutDecisionSchema } from "@/domain/checkout/validation";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import { checkoutPrincipal } from "@/server/checkout/access";
import { acceptCheckoutQuote } from "@/server/checkout/quotes";
export function POST(request: Request) {
  return checkoutEndpoint(async () =>
    checkoutResponse(
      await acceptCheckoutQuote(
        await checkoutPrincipal(request),
        checkoutDecisionSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
