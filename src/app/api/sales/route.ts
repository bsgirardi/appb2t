import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listSales, saveSaleDraft } from "@/server/sales";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listSales(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveSaleDraft(
        actor,
        undefined,
        await jsonBody(request, { maxBytes: 262144 }),
      ),
    );
  });
}
