import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { consignmentEndpoint } from "@/server/consignment/http";
import { previewStatement } from "@/server/consignment/statements";
export async function GET(request: Request) {
  return consignmentEndpoint(async () => {
    const q = new URL(request.url).searchParams;
    return ok(
      await previewStatement(
        await requireActor(),
        q.get("partnerId") ?? "",
        q.get("competence") ?? "",
      ),
    );
  }, true);
}
