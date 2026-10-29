import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { listPartners } from "@/server/consignment/queries";
export async function GET(request: Request) {
  return consignmentEndpoint(
    async () =>
      ok(
        await listPartners(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
