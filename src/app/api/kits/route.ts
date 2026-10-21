import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { listKits, saveKit } from "@/server/kits/service";
export async function GET() {
  return endpoint(async () => ok(await listKits(await requireActor())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveKit(
        actor,
        undefined,
        await jsonBody(request, { maxBytes: 256 * 1024 }),
      ),
    );
  });
}
