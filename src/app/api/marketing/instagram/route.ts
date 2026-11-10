import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { instagramSettingsSchema } from "@/domain/marketing/instagram";
import {
  instagramConnection,
  saveInstagramSettings,
  syncInstagram,
} from "@/server/instagram";
export async function GET() {
  return endpoint(async () => {
    const actor = await requireAdmin();
    const identity = await getAppearance(actor);
    return ok({
      version: identity.version,
      settings: instagramSettingsSchema.parse(
        identity.storefront?.instagram ?? {},
      ),
      ...instagramConnection(),
    });
  });
}
export async function PUT(request: Request) {
  return endpoint(async () =>
    ok(
      await saveInstagramSettings(
        await requireAdmin(),
        await jsonBody(request),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    await jsonBody(request);
    await syncInstagram(true);
    const identity = await getAppearance(actor);
    return ok({
      version: identity.version,
      settings: instagramSettingsSchema.parse(
        identity.storefront?.instagram ?? {},
      ),
      ...instagramConnection(),
    });
  });
}
