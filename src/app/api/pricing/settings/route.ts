import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { savePricingSettings } from "@/server/pricing/catalog";
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await savePricingSettings(
        actor,
        await jsonBody(request, { maxBytes: 131072 }),
      ),
    );
  });
}
