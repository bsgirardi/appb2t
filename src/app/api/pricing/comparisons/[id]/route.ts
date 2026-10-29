import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getPricingComparison } from "@/server/pricing/comparisons/read";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => ok(await getPricingComparison(await requireActor(), (await context.params).id)));
}
