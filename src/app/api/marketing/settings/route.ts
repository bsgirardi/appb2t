import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { saveMarketingSettings } from "@/server/marketing-settings";
import { getAppearance } from "@/server/appearance";
import { seoSchema } from "@/domain/marketing/seo";
import { analyticsSchema } from "@/domain/marketing/analytics";
export async function GET() {
  return endpoint(async () => {
    const identity = await getAppearance(await requireAdmin());
    return ok({
      version: identity.version,
      seo: seoSchema.parse(identity.storefront?.seo ?? {}),
      analytics: analyticsSchema.parse(identity.storefront?.analytics ?? {}),
      seoTitle: identity.storefront?.seoTitle ?? "",
      seoDescription: identity.storefront?.seoDescription ?? "",
    });
  });
}
export async function PUT(request: Request) {
  return endpoint(async () =>
    ok(
      await saveMarketingSettings(
        await requireAdmin(),
        await jsonBody(request, { maxBytes: 32768 }),
      ),
    ),
  );
}
