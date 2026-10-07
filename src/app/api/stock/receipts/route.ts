import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { stockEndpoint } from "@/server/stock/http";
import { listReceipts } from "@/server/stock/queries";
export async function GET(request: Request) {
  return stockEndpoint(
    async () =>
      ok(
        await listReceipts(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
