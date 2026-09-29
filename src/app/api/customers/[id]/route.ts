import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import {
  getCustomer,
  saveCustomer,
  setCustomerActive,
} from "@/server/customers";
import { customerStateSchema } from "@/domain/customers/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, ctx: Context) {
  return endpoint(async () =>
    ok(await getCustomer(await requireActor(), (await ctx.params).id)),
  );
}
export async function PUT(request: Request, ctx: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(
      await saveCustomer(actor, (await ctx.params).id, await jsonBody(request)),
    );
  });
}
export async function PATCH(request: Request, ctx: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { active, expectedVersion } = customerStateSchema.parse(
      await jsonBody(request),
    );
    return ok(
      await setCustomerActive(
        actor,
        (await ctx.params).id,
        active,
        expectedVersion,
      ),
    );
  });
}
