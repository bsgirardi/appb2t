import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { copyAdText } from "@/server/advertising/commands";
import { adVersionSchema } from "@/domain/advertising/validation";
import { adBody, type AdRouteContext } from "@/server/advertising/http";
export function POST(request: Request, context: AdRouteContext) {
  return endpoint(async () => {
    const actor = await requireActor();
    const input = adVersionSchema.parse(await adBody(request));
    return ok(
      await copyAdText(actor, (await context.params).id, input.expectedVersion),
    );
  });
}
