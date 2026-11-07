import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { posCatalog } from "@/server/pos/catalog";
export async function GET(request: Request) {
  return endpoint(async () => {
    const params = new URL(request.url).searchParams;
    return ok(
      await posCatalog(
        await requireActor(),
        params.get("query") ?? "",
        params.get("ids")?.split(",").filter(Boolean) ?? [],
      ),
    );
  });
}
