import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getTaxReport, saveTaxMemory } from "@/server/tax/reports";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(
      await getTaxReport(
        actor,
        new URL(request.url).searchParams.get("competence") ?? "",
      ),
    );
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return ok(await saveTaxMemory(actor, await jsonBody(request)));
  });
}
