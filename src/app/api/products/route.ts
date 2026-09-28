import { endpoint, ok } from "@/lib/http";
import { readProductRequest } from "@/lib/product-request";
import { requireActor } from "@/server/auth/guards";
import { createProduct, listProducts } from "@/server/products";
import { AppError } from "@/lib/errors";
export async function GET() {
  return endpoint(async () => ok(await listProducts(await requireActor())));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireActor();
    const { input, image } = await readProductRequest(request);
    if (!image) throw new AppError("VALIDATION", "Envie uma foto do produto.");
    return ok(await createProduct(actor, input, image));
  });
}
