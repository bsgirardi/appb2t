import { appUrl } from "./env";
import { AppError } from "./errors";
import { normalizeProductImage, type NormalizedImage } from "@/server/product-images";
export async function readProductRequest(request: Request): Promise<{ input: unknown; image?: NormalizedImage }> {
  if (request.headers.get("origin") !== appUrl().origin) throw new AppError("FORBIDDEN", "Origem da requisição inválida.");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;")) throw new AppError("VALIDATION", "Envie os dados e a foto pelo formulário.");
  const limit = 6 * 1024 * 1024;
  const invalid = () => new AppError("VALIDATION", "Formulário inválido ou muito grande. A foto deve ter até 5 MiB.");
  if (Number(request.headers.get("content-length")) > limit) throw invalid();
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw invalid(); }
    chunks.push(value);
  }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } }).formData(); }
  catch { throw invalid(); }
  if ([...form.keys()].some((key) => !["data", "photo"].includes(key)) || form.getAll("data").length !== 1 || form.getAll("photo").length > 1) throw invalid();
  const raw = form.get("data"), photo = form.get("photo");
  if (typeof raw !== "string" || Buffer.byteLength(raw) > 16384) throw invalid();
  let input: unknown;
  try { input = JSON.parse(raw); } catch { throw invalid(); }
  if (photo !== null && !(photo instanceof Blob)) throw invalid();
  if (!photo) return { input };
  return { input, image: await normalizeProductImage(new Uint8Array(await photo.arrayBuffer())) };
}
