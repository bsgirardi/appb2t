import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { getConsignmentReport } from "@/server/consignment/reports";
export async function GET(request: Request) {
  return consignmentEndpoint(
    async () =>
      ok(
        await getConsignmentReport(
          await requireActor(),
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    true,
  );
}
