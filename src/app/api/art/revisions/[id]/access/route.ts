import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { issueArtAccess, revokeArtAccess } from "@/server/art/access";
import { artOperationSchema } from "@/domain/art/validation";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const id = (await context.params).id;
    const v = z
      .object({
        action: z.enum(["ISSUE", "REVOKE"]),
        expectedVersion: z.number().int().positive(),
        operationKey: artOperationSchema,
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      v.action === "ISSUE"
        ? await issueArtAccess(actor, id, v.expectedVersion, v.operationKey)
        : await revokeArtAccess(actor, id, v.operationKey),
    );
  });
}
