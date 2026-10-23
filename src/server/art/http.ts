import { z } from "zod";
import { AppError } from "@/lib/errors";
import { appUrl } from "@/lib/env";
import { artOperationSchema } from "@/domain/art/validation";

export async function readArtUpload(request: Request) {
  if (request.headers.get("origin") !== appUrl().origin)
    throw new AppError("FORBIDDEN", "Origem inválida.");
  if (request.headers.get("content-type") !== "application/octet-stream")
    throw new AppError("VALIDATION", "Envie um arquivo por vez.");
  const input = z
    .object({
      expectedVersion: z.coerce.number().int().positive(),
      operationKey: artOperationSchema,
      purpose: z.enum(["FINAL", "REFERENCE"]),
      name: z.string().min(1).max(500),
    })
    .parse({
      expectedVersion: request.headers.get("x-art-version"),
      operationKey: request.headers.get("x-operation-key"),
      purpose: request.headers.get("x-art-purpose"),
      name: request.headers.get("x-art-filename"),
    });
  const max = 10 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new AppError("VALIDATION", "Arquivo acima de dez MiB.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("VALIDATION", "Arquivo vazio.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new AppError("VALIDATION", "Arquivo acima de dez MiB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let name: string;
  try {
    name = decodeURIComponent(input.name);
  } catch {
    throw new AppError("VALIDATION", "Nome de arquivo inválido.");
  }
  return { ...input, file: { bytes, name } };
}

export function artFileResponse(
  file: {
    bytes: Uint8Array;
    mimeType: string;
    name: string;
    preview: Uint8Array | null;
  },
  preview: boolean,
): Response {
  const inline = preview && !!file.preview;
  const name = file.name.replace(/[\x00-\x1f\x7f"\\/]/g, "_");
  return new Response(new Uint8Array(inline ? file.preview! : file.bytes), {
    headers: {
      "Content-Type": inline ? "image/webp" : file.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="arquivo"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, "%27")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
