import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { listConsignmentDocuments } from "@/server/consignment/queries";
export async function GET(request: Request) {
  return consignmentEndpoint(
    async () =>
      ok(
        await listConsignmentDocuments(
          await requireActor(),
          "shipments",
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
