import sharp from "sharp";
import { AppError } from "@/lib/errors";
export interface NormalizedImage {
  bytes: Uint8Array;
  mimeType: "image/webp";
}
export async function normalizeProductImage(
  bytes: Uint8Array,
): Promise<NormalizedImage> {
  return normalizeImage(bytes, {
    maxBytes: 5 * 1024 * 1024,
    maxPixels: 40_000_000,
    maxDimension: 1600,
  });
}
export async function normalizeImage(
  bytes: Uint8Array,
  limits: { maxBytes: number; maxPixels: number; maxDimension: number },
): Promise<NormalizedImage> {
  if (!bytes.byteLength || bytes.byteLength > limits.maxBytes)
    throw new AppError(
      "VALIDATION",
      "Imagem vazia ou acima do limite permitido.",
    );
  try {
    const image = sharp(bytes, {
      limitInputPixels: limits.maxPixels,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !meta.format ||
      !["jpeg", "png", "webp"].includes(meta.format) ||
      (meta.pages ?? 1) > 1
    )
      throw new Error("format");
    return {
      bytes: await image
        .rotate()
        .resize({
          width: limits.maxDimension,
          height: limits.maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer(),
      mimeType: "image/webp",
    };
  } catch {
    throw new AppError(
      "VALIDATION",
      "Foto inválida. Use JPEG, PNG ou WebP estático, com até 40 milhões de pixels.",
    );
  }
}
