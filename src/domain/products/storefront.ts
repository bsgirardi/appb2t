import type { PublicProductDTO } from "./types";

export function productPath(product: Pick<PublicProductDTO, "id" | "name">) {
  const slug =
    product.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "produto";
  return `/portfolio/produto/${encodeURIComponent(product.id)}/${slug}`;
}

export function summary(text: string, limit = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

export function whatsappLink(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^[1-9]\d{10,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
