import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { stockEndpoint } from "@/server/stock/http";
import { getStock } from "@/server/stock/queries";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return stockEndpoint(async () =>
    ok(await getStock(await requireActor(), (await params).id)),
  );
}
