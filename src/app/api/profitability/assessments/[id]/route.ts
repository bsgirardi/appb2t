import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { profitabilityEndpoint } from "@/server/profitability/http";
import { getAssessment } from "@/server/profitability/assessments";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return profitabilityEndpoint(
    async () =>
      ok(await getAssessment(await requireActor(), (await params).id)),
    true,
  );
}
