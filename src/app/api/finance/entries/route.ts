import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { listEntries, createEntry } from "@/server/finance/entries";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await listEntries(
        actor,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await createEntry(actor, await jsonBody(request)));
  });
}
