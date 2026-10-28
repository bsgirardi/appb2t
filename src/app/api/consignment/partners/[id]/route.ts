import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { getPartner } from "@/server/consignment/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return consignmentEndpoint(
    async () =>
      ok(await getPartner(await requireActor(), (await context.params).id)),
    true,
  );
}
