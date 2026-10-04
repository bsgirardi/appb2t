import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getPublicAppearance } from "./appearance";
import {
  inquiryItemsSchema,
  type InquiryReview,
} from "@/domain/products/inquiry";
import { productPath, whatsappLink } from "@/domain/products/storefront";
import { formatBRL } from "@/domain/calculation/calculate";
const schema = z.object({ items: inquiryItemsSchema }).strict();
export async function reviewInquiry(raw: unknown): Promise<InquiryReview> {
  const { items } = schema.parse(raw);
  const [products, identity] = await Promise.all([
    db.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        availability: true,
        colors: true,
        sizes: true,
      },
    }),
    getPublicAppearance(),
  ]);
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const problem = !product
      ? "Produto retirado do catálogo. Remova este item para continuar."
      : product.availability === "UNAVAILABLE"
        ? "Produto indisponível. Remova este item ou consulte a loja separadamente."
        : (product.colors.length
              ? !product.colors.includes(item.color)
              : !!item.color) ||
            (product.sizes.length
              ? !product.sizes.includes(item.size)
              : !!item.size)
          ? "As opções deste produto mudaram. Remova o item e escolha novamente na página do produto."
          : null;
    return {
      ...item,
      name: product?.name ?? "Produto não disponível",
      sku: product?.sku ?? "",
      path: product ? productPath(product) : null,
      imageUrl: product ? `/api/products/${product.id}/image` : null,
      price: product?.price.toFixed(2) ?? null,
      subtotal:
        product && !problem
          ? new Decimal(product.price.toString())
              .times(item.quantity)
              .toFixed(2)
          : null,
      problem,
    };
  });
  const ready = lines.length > 0 && lines.every((line) => !line.problem);
  const total = lines
    .reduce((sum, line) => sum.plus(line.subtotal ?? 0), new Decimal(0))
    .toFixed(2);
  const message = ready
    ? [
        `Olá! Gostaria de solicitar um orçamento à ${identity.name}:`,
        ...lines.map((line, index) =>
          [
            `${index + 1}. ${line.name}${line.sku ? ` (${line.sku})` : ""}`,
            line.color && `Cor: ${line.color}`,
            line.size && `Tamanho: ${line.size}`,
            `Quantidade: ${line.quantity} · Unitário: ${formatBRL(line.price!)} · Subtotal: ${formatBRL(line.subtotal!)}`,
            new URL(line.path!, appUrl()).href,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
        `Total de referência: ${formatBRL(total)} (sem frete).`,
        "Por favor, confirme disponibilidade, prazo, entrega e condições de pagamento. Esta lista não confirma um pedido.",
      ].join("\n\n")
    : "";
  const whatsapp = ready ? whatsappLink(identity.phone, message) : null;
  return {
    lines,
    total,
    ready,
    message,
    contact:
      whatsapp ||
      (ready && identity.email
        ? `mailto:${identity.email}?subject=${encodeURIComponent("Solicitação de orçamento")}&body=${encodeURIComponent(message)}`
        : null),
    channel: whatsapp ? "whatsapp" : ready && identity.email ? "email" : null,
  };
}
