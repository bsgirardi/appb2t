import { endpoint, ok } from "@/lib/http";
import { readMediaRequest } from "@/lib/product-request";
import { normalizeImage } from "@/server/product-images";
import { getPublicAppearance, saveAppearance } from "@/server/appearance";
import { requireAdmin } from "@/server/auth/guards";
import { AppError } from "@/lib/errors";
export async function GET() {
  return endpoint(async () => ok(await getPublicAppearance()));
}
export async function PUT(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    const { input, uploads } = await readMediaRequest(request, {
      maxBytes: 3 * 1024 * 1024,
      maxJsonBytes: 16384,
      maxFiles: 1,
      normalize: (bytes) =>
        normalizeImage(bytes, {
          maxBytes: 2 * 1024 * 1024,
          maxPixels: 16_000_000,
          maxDimension: 1024,
        }),
    });
    if (Object.keys(uploads).some((k) => k !== "logo"))
      throw new AppError("VALIDATION", "Logo inválido.");
    return ok(await saveAppearance(actor, input, uploads.logo));
  });
}
