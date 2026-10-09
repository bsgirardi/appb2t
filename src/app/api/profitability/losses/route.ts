import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { profitabilityEndpoint } from "@/server/profitability/http";
import { listUnassignedLosses } from "@/server/profitability/queries";
export async function GET(request: Request) {
  return profitabilityEndpoint(
    async () =>
      ok(
        await listUnassignedLosses(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
