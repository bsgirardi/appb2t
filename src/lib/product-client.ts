import { ApiError } from "./client-api";
import type { ProductDTO } from "@/domain/products/types";
export async function saveProductRequest(
  id: string | undefined,
  input: unknown,
  photo?: File,
): Promise<ProductDTO> {
  const body = new FormData();
  body.set("data", JSON.stringify(input));
  if (photo) body.set("photo", photo);
  let response: Response;
  try {
    response = await fetch(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      body,
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar. Seu rascunho foi preservado.",
      "NETWORK",
    );
  }
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.message ?? "Não foi possível salvar o produto.",
      result.error?.code ?? "INTERNAL",
      result.error?.fields,
    );
  return result.data;
}
