import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { profitabilityEndpoint } from "@/server/profitability/http";
import { getProfitabilityReport } from "@/server/profitability/queries";
export async function GET(request: Request) {
  return profitabilityEndpoint(
    async () =>
      ok(
        await getProfitabilityReport(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
