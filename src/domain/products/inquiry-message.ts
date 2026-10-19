import type { InquiryLine } from "./inquiry";
import { whatsappLink } from "./storefront";
import { formatBRL } from "@/domain/calculation/calculate";
export function buildInquiryMessage(
  lines: InquiryLine[],
  summary: { knownTotal: string | null; consultCount: number },
  identity: { name: string; phone: string; email: string; origin: string },
) {
  const message = [
    `Olá! Gostaria de solicitar um orçamento à ${identity.name}:`,
    ...lines.map((line, index) =>
      [
        `${index + 1}. ${line.name}${line.sku ? ` (${line.sku})` : ""}`,
        line.color && `Cor: ${line.color}`,
        line.size && `Tamanho: ${line.size}`,
        ...line.answerLabels.map((a) => `${a.label}: ${a.valueLabel}`),
        `Quantidade: ${line.quantity}`,
        line.price !== null && line.subtotal !== null
          ? `Referência por unidade: ${formatBRL(line.price)} · Subtotal: ${formatBRL(line.subtotal)}`
          : "Valor sob consulta",
        line.path ? new URL(line.path, identity.origin).href : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    summary.knownTotal !== null
      ? `${summary.consultCount ? "Soma dos itens com referência" : "Total de referência"}: ${formatBRL(summary.knownTotal)} (sem frete).`
      : "Valor a confirmar, sem frete.",
    summary.consultCount
      ? `${summary.consultCount} linha(s) sob consulta; não há total fechado.`
      : "",
    "Por favor, confirme disponibilidade, prazo e entrega. Esta lista não confirma um pedido nem reserva estoque.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const whatsapp = whatsappLink(identity.phone, message);
  const channel = whatsapp
    ? ("whatsapp" as const)
    : identity.email
      ? ("email" as const)
      : null;
  const full =
    whatsapp ||
    (identity.email
      ? `mailto:${identity.email}?subject=${encodeURIComponent("Solicitação de orçamento")}&body=${encodeURIComponent(message)}`
      : null);
  const copyRequired = !!full && full.length > 6000;
  const contact = copyRequired
    ? whatsapp
      ? whatsappLink(identity.phone, "")
      : `mailto:${identity.email}`
    : full;
  return { message, contact, channel, copyRequired };
}
