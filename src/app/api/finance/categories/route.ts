import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { listCategories, saveCategory } from "@/server/finance/categories";
export async function GET() {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await listCategories(actor));
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await saveCategory(actor, undefined, await jsonBody(request)));
  });
}
