import sharp from "sharp";
import { AppError } from "@/lib/errors";
export interface NormalizedImage { bytes: Uint8Array; mimeType: "image/webp" }
export async function normalizeProductImage(bytes: Uint8Array): Promise<NormalizedImage> {
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024)
    throw new AppError("VALIDATION", "Envie uma foto de até 5 MiB.");
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format) || (meta.pages ?? 1) > 1) throw new Error("format");
    return { bytes: await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(), mimeType: "image/webp" };
  } catch {
    throw new AppError("VALIDATION", "Foto inválida. Use JPEG, PNG ou WebP estático, com até 40 milhões de pixels.");
  }
}
