import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listCustomers, saveCustomer } from "@/server/customers";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listCustomers(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(await saveCustomer(actor, undefined, await jsonBody(request)));
  });
}
