import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { findRequestCustomers } from "@/server/catalog-requests/queries";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await findRequestCustomers(
        actor,
        (await context.params).id,
        new URL(request.url).searchParams.get("search") ?? "",
      ),
    );
  });
}
