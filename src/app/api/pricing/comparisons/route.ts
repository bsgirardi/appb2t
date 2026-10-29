import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { createPricingComparison } from "@/server/pricing/comparisons/create";
import { listPricingComparisons } from "@/server/pricing/comparisons/read";
import { comparisonQuerySchema } from "@/domain/pricing/comparisons/validation";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const query = comparisonQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listPricingComparisons(actor, query));
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const body = z.object({ draft: z.unknown(), operationKey: z.uuid() }).strict().parse(await jsonBody(request, { maxBytes: 131072 }));
    return ok(await createPricingComparison(actor, body.draft, body.operationKey));
  });
}
