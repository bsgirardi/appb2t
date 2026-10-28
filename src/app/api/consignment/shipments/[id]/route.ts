import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { getConsignmentDocument } from "@/server/consignment/queries";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return consignmentEndpoint(
    async () =>
      ok(
        await getConsignmentDocument(
          await requireActor(),
          "shipments",
          (await context.params).id,
        ),
      ),
    true,
  );
}
