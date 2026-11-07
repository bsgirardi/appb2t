import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getTaxProfiles, saveTaxProfile } from "@/server/tax/profiles";
export async function GET() {
  return endpoint(async () => ok(await getTaxProfiles(await requireAdmin())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await saveTaxProfile(actor, await jsonBody(request)));
  });
}
