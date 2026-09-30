import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { listAccounts, saveAccount } from "@/server/finance/accounts";
export async function GET() {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await listAccounts(actor));
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await saveAccount(actor, undefined, await jsonBody(request)));
  });
}
