import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listAdProducts } from "@/server/advertising/queries";
import { adQuerySchema } from "@/domain/advertising/validation";
export function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await listAdProducts(
        actor,
        adQuerySchema
          .pick({ search: true, page: true })
          .parse(Object.fromEntries(new URL(request.url).searchParams)),
      ),
    );
  });
}
