import { endpoint, ok } from "@/lib/http";
import { readProductRequest } from "@/lib/product-request";
import { requireActor } from "@/server/auth/guards";
import { createProduct, listProducts } from "@/server/products";
export async function GET() {
  return endpoint(async () => ok(await listProducts(await requireActor())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { input, uploads } = await readProductRequest(request);
    return ok(await createProduct(actor, input, uploads));
  });
}
