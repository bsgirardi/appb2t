import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { transferFunds } from "@/server/finance/transfers";
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await transferFunds(actor, await jsonBody(request)));
  });
}
