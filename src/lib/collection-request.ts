import { readMediaRequest } from "./product-request";
import { normalizeProductImage } from "@/server/product-images";
import { AppError } from "./errors";
export async function readCollectionRequest(request: Request) {
  const { input, uploads } = await readMediaRequest(request, {
    maxBytes: 6 * 1024 * 1024,
    maxJsonBytes: 128 * 1024,
    maxFiles: 1,
    normalize: normalizeProductImage,
  });
  if (Object.keys(uploads).some((k) => k !== "cover"))
    throw new AppError("VALIDATION", "Capa inválida.");
  return { input, image: uploads.cover };
}
