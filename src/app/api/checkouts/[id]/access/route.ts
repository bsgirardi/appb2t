import { requireActor } from "@/server/auth/guards";
import { jsonBody } from "@/lib/http";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import { z } from "zod";
import { attemptKeySchema } from "@/domain/catalog-requests/validation";
import {
  issueCheckoutAccess,
  revokeCheckoutAccess,
} from "@/server/checkout/access";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return checkoutEndpoint(async () => {
    const actor = await requireActor();
    const id = (await context.params).id;
    const input = z
      .object({
        action: z.enum(["ISSUE", "REVOKE"]),
        operationKey: attemptKeySchema,
        expectedVersion: z.number().int().positive(),
      })
      .strict()
      .parse(await jsonBody(request));
    if (input.action === "ISSUE")
      return checkoutResponse(
        await issueCheckoutAccess(actor, id, input.operationKey),
      );
    await revokeCheckoutAccess(actor, id, input.expectedVersion);
    return checkoutResponse({ revoked: true });
  });
}
