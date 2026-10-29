import { api, ApiError } from "@/lib/client-api";
import type { AdLibraryQuery } from "@/domain/advertising/types";
export const adChannels = {
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
} as const;
export const adStatuses = {
  DRAFT: "Rascunho",
  REVIEWED: "Revisado",
  ARCHIVED: "Arquivado",
} as const;
export function adLibraryPath(query: AdLibraryQuery, page = query.page) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.channel) params.set("channel", query.channel);
  if (query.status) params.set("status", query.status);
  if (page > 1) params.set("page", String(page));
  return `/anuncios${params.size ? `?${params}` : ""}`;
}
export async function copyDraftText(id: string, expectedVersion: number) {
  if (!navigator.clipboard?.writeText)
    throw new Error(
      "A cópia não está disponível neste navegador. Baixe o material para obter o texto.",
    );
  const result = await api<{ text: string }>(`/api/anuncios/${id}/copiar`, {
    expectedVersion,
  });
  try {
    await navigator.clipboard.writeText(result.text);
  } catch {
    throw new Error(
      "Não foi possível copiar. Tente novamente neste navegador.",
    );
  }
}
export async function downloadDraft(id: string, expectedVersion: number) {
  const response = await fetch(`/api/anuncios/${id}/exportar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVersion }),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json();
    throw new ApiError(
      result.error?.message || "Não foi possível preparar o material.",
      result.error?.code || "INTERNAL",
    );
  }
  if (!response.headers.get("Content-Type")?.startsWith("application/zip"))
    throw new Error("O arquivo não pôde ser preparado. Tente novamente.");
  const url = URL.createObjectURL(await response.blob()),
    link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers
      .get("Content-Disposition")
      ?.match(/filename="([^"]+)"/)?.[1] || "material-anuncio.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
