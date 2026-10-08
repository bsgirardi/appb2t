import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { productionEndpoint } from "@/server/production/http";
import { listOrders } from "@/server/production/queries";
export async function GET(request: Request) {
  return productionEndpoint(
    async () =>
      ok(
        await listOrders(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
