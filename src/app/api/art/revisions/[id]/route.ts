import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { publishRevision, updateArtDraft } from "@/server/art/revisions";
import { artOperationSchema } from "@/domain/art/validation";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export function PUT(request: Request, context: Context) {
  return endpoint(async () =>
    ok(
      await updateArtDraft(
        await requireActor(),
        (await context.params).id,
        await jsonBody(request),
      ),
    ),
  );
}
export function POST(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const v = z
      .object({
        expectedVersion: z.number().int().positive(),
        operationKey: artOperationSchema,
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await publishRevision(
        actor,
        (await context.params).id,
        v.expectedVersion,
        v.operationKey,
      ),
    );
  });
}
