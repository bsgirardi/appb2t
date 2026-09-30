import { endpoint, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getCashFlow } from "@/server/finance/reports";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await getCashFlow(
        actor,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  });
}
