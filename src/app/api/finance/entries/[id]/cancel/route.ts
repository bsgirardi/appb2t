import { z } from "zod";
import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { cancelEntry } from "@/server/finance/entries";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    const body = z
      .object({
        expectedVersion: z.number().int().positive(),
        reason: z.string().trim().min(3).max(2000),
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await cancelEntry(
        actor,
        (await context.params).id,
        body.expectedVersion,
        body.reason,
      ),
    );
  });
}
