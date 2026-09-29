import { endpoint, jsonBody, ok } from "@/lib/http";
import { readProductRequest } from "@/lib/product-request";
import { requireActor } from "@/server/auth/guards";
import { getProduct, updateProduct, setProductActive } from "@/server/products";
import { productStateSchema } from "@/domain/products/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    return ok(await getProduct(actor, (await context.params).id));
  });
}
export async function PUT(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { input, uploads } = await readProductRequest(request);
    return ok(
      await updateProduct(actor, (await context.params).id, input, uploads),
    );
  });
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { active, expectedVersion } = productStateSchema.parse(
      await jsonBody(request),
    );
    return ok(
      await setProductActive(
        actor,
        (await context.params).id,
        active,
        expectedVersion,
      ),
    );
  });
}
