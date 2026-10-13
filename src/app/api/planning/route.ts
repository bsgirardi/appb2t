import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningEndpoint } from "@/server/planning/http";
import { getPlanning } from "@/server/planning/queries";
export async function GET(request: Request) {
  return planningEndpoint(
    async () =>
      ok(
        await getPlanning(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
