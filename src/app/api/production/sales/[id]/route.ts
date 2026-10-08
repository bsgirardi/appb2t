import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { productionEndpoint } from "@/server/production/http";
import { saleProduction } from "@/server/production/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return productionEndpoint(async () =>
    ok(await saleProduction(await requireActor(), (await context.params).id)),
  );
}
