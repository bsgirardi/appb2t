import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningEndpoint } from "@/server/planning/http";
import { getBatch } from "@/server/planning/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return planningEndpoint(async () =>
    ok(await getBatch(await requireActor(), (await context.params).id)),
  );
}
