import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import {
  getCommercialSettings,
  saveCommercialSettings,
} from "@/server/commercial-settings";
export async function GET() {
  return endpoint(async () => {
    await requireAdmin();
    return ok(await getCommercialSettings());
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await saveCommercialSettings(actor, await jsonBody(request)));
  });
}
