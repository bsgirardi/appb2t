import { z } from "zod";
import { requireActor } from "@/server/auth/guards";
import { jsonBody } from "@/lib/http";
import { checkoutDeliverySchema } from "@/domain/checkout/validation";
import { checkoutEndpoint, checkoutResponse } from "@/server/checkout/http";
import {
  getCheckoutForTeam,
  updateCheckoutDelivery,
} from "@/server/checkout/team";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return checkoutEndpoint(async () =>
    checkoutResponse(
      await getCheckoutForTeam(await requireActor(), (await context.params).id),
    ),
  );
}
export function PATCH(request: Request, context: Context) {
  return checkoutEndpoint(async () => {
    const actor = await requireActor();
    const id = (await context.params).id;
    const input = z
      .object({
        expectedVersion: z.number().int().positive(),
        delivery: checkoutDeliverySchema,
      })
      .strict()
      .parse(await jsonBody(request));
    await updateCheckoutDelivery(
      actor,
      id,
      input.expectedVersion,
      input.delivery,
    );
    return checkoutResponse(await getCheckoutForTeam(actor, id));
  });
}
