import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { settleEntry } from "@/server/finance/settlements";
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await settleEntry(actor, await jsonBody(request)));
  });
}
