import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getPricingCatalog } from "@/server/pricing/catalog";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await getPricingCatalog(
        await requireActor(),
        new URL(request.url).searchParams.get("includeInactive") === "true",
      ),
    ),
  );
}
