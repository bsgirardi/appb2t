import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listOpportunities } from "@/server/opportunities/queries";
import { executeOpportunityCommand } from "@/server/opportunities/commands";
import { AppError } from "@/lib/errors";
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(
      await listOpportunities(
        await requireActor(),
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const raw = await jsonBody(request, { maxBytes: 32768 });
    if (
      !raw ||
      typeof raw !== "object" ||
      !("action" in raw) ||
      raw.action !== "CREATE"
    )
      throw new AppError("VALIDATION", "Use o comando de criação.");
    return ok(await executeOpportunityCommand(actor, undefined, raw));
  });
}
