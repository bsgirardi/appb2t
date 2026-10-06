import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { createPricingEstimate } from "@/server/pricing/estimates";
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const raw = z
      .object({ request: z.unknown(), operationKey: z.uuid() })
      .strict()
      .parse(await jsonBody(request, { maxBytes: 131072 }));
    return ok(
      await createPricingEstimate(actor, raw.request, raw.operationKey),
    );
  });
}
