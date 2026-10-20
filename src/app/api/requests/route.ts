import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listCatalogRequests } from "@/server/catalog-requests/queries";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listCatalogRequests(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
