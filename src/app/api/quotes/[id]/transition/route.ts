import { z } from "zod";
import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { transitionQuote } from "@/server/quotes";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const input = z
      .object({
        expectedVersion: z.number().int().positive(),
        action: z.enum(["ISSUE", "APPROVE", "REJECT", "REOPEN"]),
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await transitionQuote(
        actor,
        (await context.params).id,
        input.expectedVersion,
        input.action,
      ),
    );
  });
}
