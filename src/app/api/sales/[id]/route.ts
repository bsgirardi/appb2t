import { z } from "zod";
import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getSale, saveSaleDraft, updateSaleOperations } from "@/server/sales";
import { civilDateSchema } from "@/domain/commerce/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(await getSale(actor, (await context.params).id));
  });
}
export async function PUT(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveSaleDraft(
        actor,
        (await context.params).id,
        await jsonBody(request, { maxBytes: 262144 }),
      ),
    );
  });
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { expectedVersion, ...input } = z
      .object({
        expectedVersion: z.number().int().positive(),
        expectedDeliveryDate: civilDateSchema.nullable(),
        operationalNotes: z.string().trim().max(2000),
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await updateSaleOperations(
        actor,
        (await context.params).id,
        expectedVersion,
        input,
      ),
    );
  });
}
