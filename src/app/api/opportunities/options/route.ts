import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { opportunityOptions } from "@/server/opportunities/queries";
export async function GET() {
  return endpoint(async () =>
    ok(await opportunityOptions(await requireActor())),
  );
}
