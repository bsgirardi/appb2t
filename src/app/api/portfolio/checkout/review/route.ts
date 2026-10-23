import { z } from "zod";
import { jsonBody } from "@/lib/http";
import { checkoutDraftSchema } from "@/domain/checkout/validation";
import { attemptKeySchema } from "@/domain/catalog-requests/validation";
import { prepareCheckout } from "@/server/checkout/confirm";
import { checkoutPrincipal } from "@/server/checkout/access";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import {
  readCheckoutCookie,
  checkoutCookie,
  draftCookie,
  scopedCookie,
} from "@/server/checkout/cookies";
export function POST(request: Request) {
  return checkoutEndpoint(async () => {
    const input = z
      .object({ draft: checkoutDraftSchema, operationKey: attemptKeySchema })
      .strict()
      .parse(await jsonBody(request, { maxBytes: 256 * 1024 }));
    const review = await prepareCheckout(
      await checkoutPrincipal(request),
      input.draft,
      input.operationKey,
    );
    const response = checkoutResponse(review);
    const token = readCheckoutCookie(request, draftCookie);
    if (token)
      response.headers.append(
        "Set-Cookie",
        checkoutCookie(scopedCookie(review.id), token),
      );
    return response;
  });
}
