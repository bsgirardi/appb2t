import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listOpportunityQuoteCandidates } from "@/server/opportunities/queries";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listOpportunityQuoteCandidates(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
