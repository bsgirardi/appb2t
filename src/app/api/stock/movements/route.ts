import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { stockEndpoint } from "@/server/stock/http";
import { listMovements } from "@/server/stock/queries";
export async function GET(request: Request) {
  return stockEndpoint(
    async () =>
      ok(
        await listMovements(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
