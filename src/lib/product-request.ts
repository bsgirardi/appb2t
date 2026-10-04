import { appUrl } from "./env";
import { AppError } from "./errors";
import {
  normalizeProductImage,
  type NormalizedImage,
} from "@/server/product-images";
export async function readProductRequest(
  request: Request,
): Promise<{ input: unknown; uploads: Record<string, NormalizedImage> }> {
  return readMediaRequest(request, {
    maxBytes: 52 * 1024 * 1024,
    // Commercial fields, collection IDs and UTF-8 text can exceed 16 KiB.
    maxJsonBytes: 256 * 1024,
    maxFiles: 10,
    normalize: normalizeProductImage,
  });
}
export async function readMediaRequest(
  request: Request,
  options: {
    maxBytes: number;
    maxJsonBytes: number;
    maxFiles: number;
    normalize: (bytes: Uint8Array) => Promise<NormalizedImage>;
  },
): Promise<{ input: unknown; uploads: Record<string, NormalizedImage> }> {
  if (request.headers.get("origin") !== appUrl().origin)
    throw new AppError("FORBIDDEN", "Origem da requisição inválida.");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new AppError(
      "VALIDATION",
      "Envie os dados e a foto pelo formulário.",
    );
  const limit = options.maxBytes;
  const invalid = () =>
    new AppError(
      "VALIDATION",
      "Formulário inválido ou muito grande. A foto deve ter até 5 MiB.",
    );
  if (Number(request.headers.get("content-length")) > limit) throw invalid();
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw invalid();
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw invalid();
  }
  if (
    [...form.keys()].some(
      (key) => key !== "data" && !/^photo:[a-zA-Z0-9_-]{1,100}$/.test(key),
    ) ||
    form.getAll("data").length !== 1 ||
    [...form.keys()].length > options.maxFiles + 1 ||
    [...form.keys()].some((key) => form.getAll(key).length !== 1)
  )
    throw invalid();
  const raw = form.get("data");
  if (typeof raw !== "string" || Buffer.byteLength(raw) > options.maxJsonBytes)
    throw invalid();
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw invalid();
  }
  const uploads: Record<string, NormalizedImage> = Object.create(null);
  for (const [key, photo] of form.entries()) {
    if (key === "data") continue;
    if (!(photo instanceof Blob)) throw invalid();
    uploads[key.slice(6)] = await options.normalize(
      new Uint8Array(await photo.arrayBuffer()),
    );
  }
  return { input, uploads };
}
