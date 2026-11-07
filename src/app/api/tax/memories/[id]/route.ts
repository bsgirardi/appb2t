import { endpoint, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getTaxMemory } from "@/server/tax/reports";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await getTaxMemory(actor, (await params).id));
  });
}
